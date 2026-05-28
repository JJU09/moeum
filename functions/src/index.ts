import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentUpdated, onDocumentCreated } from "firebase-functions/v2/firestore";

admin.initializeApp();

const BASE_DATE = new Date('2026-05-28T00:00:00Z');
const CYCLE_DAYS = 730;

function getCycleDate(todayKST: string): string {
  const today = new Date(todayKST + 'T00:00:00Z');
  const daysSince = Math.floor((today.getTime() - BASE_DATE.getTime()) / (24 * 60 * 60 * 1000));
  const cycleIndex = ((daysSince % CYCLE_DAYS) + CYCLE_DAYS) % CYCLE_DAYS;
  const cycleDate = new Date(BASE_DATE.getTime() + cycleIndex * 24 * 60 * 60 * 1000);
  return cycleDate.toISOString().split('T')[0]!;
}

// FN-03: 오전 7시 질문 알림 — 낙찰 질문이 있는 그룹은 해당 질문으로, 없으면 글로벌 질문 사용
export const sendDailyQuestion = onSchedule(
  {
    schedule: "0 7 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  async (_event) => {
    try {
      const db = admin.firestore();
      const now = new Date();
      const kstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
      const todayDate = kstTime.toISOString().split('T')[0];
      if (!todayDate) return;

      // 글로벌 사이클 질문 (fallback)
      const cycleDate = getCycleDate(todayDate);
      const questionDoc = await db.collection("questions").doc(cycleDate).get();
      const globalQuestion: string = questionDoc.data()?.content ?? "";
      console.log(`Today ${todayDate} → cycle date ${cycleDate}: ${globalQuestion}`);

      // 전체 유저 FCM 토큰 로드
      const usersSnapshot = await db.collection("users").get();
      const userTokenMap: { [uid: string]: string } = {};
      const tokenToUserId: { [token: string]: string } = {};
      usersSnapshot.forEach((doc) => {
        const token = doc.data().fcmToken;
        if (token) {
          userTokenMap[doc.id] = token;
          tokenToUserId[token] = doc.id;
        }
      });

      const notifiedUsers = new Set<string>();
      const invalidTokens: string[] = [];

      const sendMulticast = async (tokens: string[], question: string, label: string) => {
        if (tokens.length === 0 || !question) return;
        const short = question.length > 30 ? question.substring(0, 30) + '...' : question;
        const response = await admin.messaging().sendEachForMulticast({
          notification: { title: "딩동! 오늘의 모음이 도착했습니다 ☀️", body: short },
          tokens,
        });
        console.log(`${label}: ${response.successCount}/${tokens.length} sent`);
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const code = resp.error?.code;
            if (
              code === 'messaging/registration-token-not-registered' ||
              code === 'messaging/invalid-registration-token'
            ) {
              const t = tokens[idx];
              if (t) invalidTokens.push(t);
            }
          }
        });
      };

      // 그룹별 낙찰 질문 확인, 오늘 경매 문서 초기화, 그룹 멤버에게 발송
      const groupsSnapshot = await db.collection("groups").get();
      for (const groupDoc of groupsSnapshot.docs) {
        const groupId = groupDoc.id;
        const auctionRef = db
          .collection("groups").doc(groupId)
          .collection("auctions").doc(todayDate);
        const auctionSnap = await auctionRef.get();

        // 오늘 경매 문서가 없으면 생성 (07:00에 경매 오픈)
        if (!auctionSnap.exists) {
          await auctionRef.set({
            participantCount: 0,
            status: "open",
            winningQuestion: "",
            winnerId: "",
            winnerNickname: "",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        // 어제 경매의 낙찰 질문을 푸시 알림에 사용
        const yesterdayDate = new Date(
          new Date(todayDate + 'T00:00:00Z').getTime() - 24 * 60 * 60 * 1000
        ).toISOString().split('T')[0]!;
        const yesterdayAuctionSnap = await db
          .collection("groups").doc(groupId)
          .collection("auctions").doc(yesterdayDate)
          .get();
        const winningQuestion: string = yesterdayAuctionSnap.data()?.winningQuestion ?? "";
        const questionToSend = winningQuestion || globalQuestion;
        if (!questionToSend) continue;

        const membersSnap = await db
          .collection("groups").doc(groupId)
          .collection("members")
          .get();

        const tokens: string[] = [];
        membersSnap.forEach((memberDoc) => {
          const uid = memberDoc.id;
          if (!notifiedUsers.has(uid) && userTokenMap[uid]) {
            tokens.push(userTokenMap[uid]);
            notifiedUsers.add(uid);
          }
        });

        await sendMulticast(tokens, questionToSend, `Group ${groupId}`);
      }

      // 어떤 그룹에도 포함되지 않은 유저에게 글로벌 질문 발송
      const remainingTokens: string[] = [];
      usersSnapshot.forEach((doc) => {
        if (!notifiedUsers.has(doc.id) && userTokenMap[doc.id]) {
          remainingTokens.push(userTokenMap[doc.id]!);
        }
      });
      await sendMulticast(remainingTokens, globalQuestion, "Global");

      // 만료된 FCM 토큰 정리
      if (invalidTokens.length > 0) {
        const batch = db.batch();
        invalidTokens.forEach((token) => {
          const uid = tokenToUserId[token];
          if (uid) {
            batch.update(db.collection("users").doc(uid), {
              fcmToken: admin.firestore.FieldValue.delete(),
            });
          }
        });
        await batch.commit();
        console.log(`Removed ${invalidTokens.length} invalid tokens`);
      }
    } catch (error) {
      console.error("Error sending daily question notification:", error);
    }
  }
);

// FN-01: 자정 경매 정산 — 각 그룹의 오늘 경매를 마감하고 낙찰자 처리
export const settleAuction = onSchedule(
  {
    schedule: "0 0 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  async (_event) => {
    const db = admin.firestore();
    const now = new Date();
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    // 자정 기준으로 방금 끝난 날짜(어제 KST) = 1ms 빼서 날짜 추출
    const auctionKST = new Date(kstNow.getTime() - 1);
    const dateStr = auctionKST.toISOString().split('T')[0];
    if (!dateStr) return;

    console.log(`Settling auctions for date: ${dateStr}`);

    const groupsSnapshot = await db.collection("groups").get();

    await Promise.all(
      groupsSnapshot.docs.map(async (groupDoc) => {
        const groupId = groupDoc.id;
        const auctionRef = db
          .collection("groups").doc(groupId)
          .collection("auctions").doc(dateStr);
        const auctionSnap = await auctionRef.get();

        if (!auctionSnap.exists || auctionSnap.data()?.status !== "open") return;

        const bidsSnap = await auctionRef.collection("bids").get();

        if (bidsSnap.empty) {
          await auctionRef.update({ status: "closed" });
          console.log(`Group ${groupId}: no bids, closed without winner`);
          return;
        }

        // 최고 입찰자 선정 (동점 시 createdAt 빠른 순)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let winnerData: any = null;

        bidsSnap.forEach((bidDoc) => {
          const bid = bidDoc.data();
          if (!winnerData) {
            winnerData = bid;
            return;
          }
          if (bid.bidPoints > winnerData.bidPoints) {
            winnerData = bid;
          } else if (bid.bidPoints === winnerData.bidPoints) {
            const bidTime: number = bid.createdAt?.toMillis?.() ?? 0;
            const currentTime: number = winnerData.createdAt?.toMillis?.() ?? 0;
            if (bidTime < currentTime) winnerData = bid;
          }
        });

        if (!winnerData) return;

        const winnerUserId: string = winnerData.userId;
        const winnerUserDoc = await db.collection("users").doc(winnerUserId).get();
        const winnerNickname: string = winnerUserDoc.data()?.nickname ?? "";

        const batch = db.batch();

        // 낙찰자 포인트 차감
        batch.update(db.collection("users").doc(winnerUserId), {
          points: admin.firestore.FieldValue.increment(-winnerData.bidPoints),
        });

        // 경매 문서 업데이트
        batch.update(auctionRef, {
          status: "closed",
          winningQuestion: winnerData.questionText,
          winnerId: winnerUserId,
          winnerNickname,
        });

        await batch.commit();
        console.log(
          `Group ${groupId}: ${winnerNickname} won with ${winnerData.bidPoints} points — "${winnerData.questionText}"`
        );
      })
    );
  }
);

// 입찰 생성 시 participantCount 증가
export const onBidCreated = onDocumentCreated(
  "groups/{groupId}/auctions/{dateStr}/bids/{userId}",
  async (event) => {
    const db = admin.firestore();
    const { groupId, dateStr } = event.params;
    const auctionRef = db
      .collection("groups").doc(groupId)
      .collection("auctions").doc(dateStr);
    await auctionRef.update({
      participantCount: admin.firestore.FieldValue.increment(1),
    });
  }
);

// FN-02: 답변 작성 시 별조각 지급 — 하루 1회, +10 포인트
export const onAnswerCreatedGivePoints = onDocumentCreated(
  "answers/{answerId}",
  async (event) => {
    const db = admin.firestore();
    const data = event.data?.data();
    if (!data) return;

    const userId: string = data.userId;
    if (!userId) return;

    const now = new Date();
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const todayKST = kstNow.toISOString().split('T')[0]!;

    const userRef = db.collection("users").doc(userId);
    await db.runTransaction(async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) return;

      const userData = userSnap.data()!;
      if (userData.lastPointDate === todayKST) return;

      transaction.update(userRef, {
        points: admin.firestore.FieldValue.increment(10),
        lastPointDate: todayKST,
      });
    });
  }
);

// 리액션 추가 시 푸시 알림
export const onReactionUpdated = onDocumentUpdated("answers/{answerId}", async (event) => {
  const db = admin.firestore();

  if (!event.data) return;

  const beforeData = event.data.before.data();
  const afterData = event.data.after.data();

  const beforeReactions = beforeData.reactions || {};
  const afterReactions = afterData.reactions || {};

  if (JSON.stringify(beforeReactions) === JSON.stringify(afterReactions)) return;

  const answerUserId = afterData.userId;
  if (!answerUserId) return;

  let newReactorId: string | null = null;
  let newEmoji: string | null = null;

  for (const [emoji, users] of Object.entries(afterReactions) as [string, string[]][]) {
    const beforeUsers = (beforeReactions[emoji] as string[]) || [];
    const addedUsers = users.filter((u) => !beforeUsers.includes(u));
    if (addedUsers.length > 0) {
      newReactorId = addedUsers[0] ?? null;
      newEmoji = emoji;
      break;
    }
  }

  if (!newReactorId || !newEmoji || newReactorId === answerUserId) return;

  try {
    const userDoc = await db.collection("users").doc(answerUserId).get();
    if (!userDoc.exists) return;

    const userData = userDoc.data();
    if (!userData?.fcmToken) return;

    await admin.messaging().send({
      notification: {
        title: "새로운 리액션!",
        body: `누군가 내 답변에 ${newEmoji}를 남겼어요!`,
      },
      token: userData.fcmToken,
    });
  } catch (error: any) {
    console.error("Error sending reaction push:", error);
    if (error.code === 'messaging/registration-token-not-registered') {
      await db.collection("users").doc(answerUserId).update({
        fcmToken: admin.firestore.FieldValue.delete(),
      });
    }
  }
});

// 댓글 추가 시 푸시 알림
export const onCommentCreated = onDocumentCreated("comments/{commentId}", async (event) => {
  const db = admin.firestore();
  const data = event.data?.data();
  if (!data) return;

  const answerId = data.answerId;
  const commenterId = data.userId;
  const content = data.content;
  if (!answerId || !commenterId || !content) return;

  try {
    const answerDoc = await db.collection("answers").doc(answerId).get();
    if (!answerDoc.exists) return;

    const answerUserId = answerDoc.data()?.userId;
    if (!answerUserId || answerUserId === commenterId) return;

    const [commenterDoc, answerUserDoc] = await Promise.all([
      db.collection("users").doc(commenterId).get(),
      db.collection("users").doc(answerUserId).get(),
    ]);

    const answerUserData = answerUserDoc.data();
    if (!answerUserData?.fcmToken) return;

    const commenterName = commenterDoc.data()?.nickname || "누군가";
    const shortContent = content.length > 20 ? content.substring(0, 20) + '...' : content;

    await admin.messaging().send({
      notification: {
        title: "새로운 댓글!",
        body: `${commenterName}님이 댓글을 남겼어요: ${shortContent}`,
      },
      token: answerUserData.fcmToken,
    });
  } catch (error: any) {
    console.error("Error sending comment push:", error);
    if (error.code === 'messaging/registration-token-not-registered') {
      try {
        const answerDoc = await db.collection("answers").doc(answerId).get();
        if (answerDoc.exists) {
          const answerUserId = answerDoc.data()?.userId;
          if (answerUserId) {
            await db.collection("users").doc(answerUserId).update({
              fcmToken: admin.firestore.FieldValue.delete(),
            });
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }
});
