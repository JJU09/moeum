import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentUpdated, onDocumentCreated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { google } from "googleapis";
import { SERVER_SHOP_ITEMS } from "./shopItems";

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

        if (auctionSnap.exists && auctionSnap.data()?.status === "closed") return;

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

        // 패자 별조각 환불 (베팅 시 이미 차감됐으므로)
        bidsSnap.forEach((bidDoc) => {
          const bid = bidDoc.data();
          if (bid.userId !== winnerUserId) {
            batch.update(db.collection("users").doc(bid.userId), {
              points: admin.firestore.FieldValue.increment(bid.bidPoints),
            });
          }
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

// 입찰 — 별조각 즉시 차감 (재베팅 시 차액만), 트랜잭션으로 초과 차감 방지
export const placeBid = onCall(
  { region: "asia-northeast3" },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const { groupId, questionText, bidPoints } = request.data as {
      groupId: string;
      questionText: string;
      bidPoints: number;
    };

    if (!groupId || !questionText?.trim() || typeof bidPoints !== "number" || bidPoints < 1) {
      throw new HttpsError("invalid-argument", "올바르지 않은 입력값입니다.");
    }

    const userId = request.auth.uid;
    const db = admin.firestore();
    const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const dateStr = kst.toISOString().split("T")[0]!;

    const bidRef = db
      .collection("groups").doc(groupId)
      .collection("auctions").doc(dateStr)
      .collection("bids").doc(userId);
    const userRef = db.collection("users").doc(userId);

    await db.runTransaction(async (tx) => {
      const [bidSnap, userSnap] = await Promise.all([tx.get(bidRef), tx.get(userRef)]);

      const existingBidPoints: number = bidSnap.exists ? (bidSnap.data()?.bidPoints ?? 0) : 0;
      const pointDiff = bidPoints - existingBidPoints;

      if (bidPoints < existingBidPoints) {
        throw new HttpsError("invalid-argument", "현재 베팅보다 낮게 베팅할 수 없습니다.");
      }

      if (pointDiff > 0) {
        const currentPoints: number = userSnap.data()?.points ?? 0;
        if (currentPoints < pointDiff) {
          throw new HttpsError("failed-precondition", "별조각이 부족합니다.");
        }
        tx.update(userRef, {
          points: admin.firestore.FieldValue.increment(-pointDiff),
        });
      }

      tx.set(bidRef, {
        userId,
        questionText: questionText.trim(),
        bidPoints,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(bidSnap.exists ? {} : { createdAt: admin.firestore.FieldValue.serverTimestamp() }),
      }, { merge: true });
    });

    return { success: true };
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
    await auctionRef.set({
      participantCount: admin.firestore.FieldValue.increment(1),
      status: 'open',
    }, { merge: true });
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
        points: admin.firestore.FieldValue.increment(5),
        lastPointDate: todayKST,
      });
    });
  }
);

// FN-05: 답변 작성 시 streak 갱신 + 쉴드 소비 (서버 시간 기준 — 클라이언트 시간 변조 방지)
export const onAnswerCreatedUpdateStreak = onDocumentCreated(
  "answers/{answerId}",
  async (event) => {
    const db = admin.firestore();
    const data = event.data?.data();
    if (!data) return;

    const userId: string = data.userId;
    if (!userId) return;

    // 서버 타임스탬프 기준 KST 오늘 날짜 계산
    const serverTime: Date = event.data!.createTime.toDate();
    const kstTime = new Date(serverTime.getTime() + 9 * 60 * 60 * 1000);
    const todayKST = kstTime.toISOString().split('T')[0]!;

    const userRef = db.collection("users").doc(userId);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists) return;

      const userData = snap.data()!;
      const lastDate: string | undefined = userData.lastAnsweredDate;

      // 오늘 이미 처리됨
      if (lastDate === todayKST) return;

      const currentStreak: number = userData.streakCount ?? 0;

      const updateFields: Record<string, unknown> = { lastAnsweredDate: todayKST };
      let newStreak: number;

      if (!lastDate) {
        newStreak = 1;
      } else {
        // 수동 diffDays 계산 (date-fns 없이)
        const msPerDay = 24 * 60 * 60 * 1000;
        const d1 = new Date(lastDate + 'T00:00:00Z').getTime();
        const d2 = new Date(todayKST + 'T00:00:00Z').getTime();
        const diffDays = Math.round((d2 - d1) / msPerDay);

        if (diffDays === 1) {
          newStreak = currentStreak + 1;
        } else {
          newStreak = 1;
        }
      }

      updateFields.streakCount = newStreak;

      // 뱃지 부여
      const currentBadges: string[] = userData.badges ?? [];
      const newBadges: string[] = [];
      // 이른 아침 답변 (서버 KST 기준)
      const kstHour = kstTime.getHours();
      if (kstHour >= 7 && kstHour < 11 && !currentBadges.includes('early_bird')) {
        newBadges.push('early_bird');
      }
      if (newStreak >= 7 && !currentBadges.includes('streak_7')) {
        newBadges.push('streak_7');
      }
      if (newStreak >= 30 && !currentBadges.includes('streak_30')) {
        newBadges.push('streak_30');
      }
      // 등급 업적 테두리 해금 뱃지 (영구)
      if (newStreak >= 3   && !currentBadges.includes('tier_firefly'))   newBadges.push('tier_firefly');
      if (newStreak >= 7   && !currentBadges.includes('tier_dew'))       newBadges.push('tier_dew');
      if (newStreak >= 14  && !currentBadges.includes('tier_starlight')) newBadges.push('tier_starlight');
      if (newStreak >= 30  && !currentBadges.includes('tier_aurora'))    newBadges.push('tier_aurora');
      if (newStreak >= 100 && !currentBadges.includes('tier_dawn'))      newBadges.push('tier_dawn');
      if (newBadges.length > 0) {
        updateFields.badges = admin.firestore.FieldValue.arrayUnion(...newBadges);
      }

      tx.update(userRef, updateFields);
    });
  }
);

// FN-06: 상점 아이템 구매 — 별조각 차감 + 아이템/쉴드 지급
export const purchaseShopItem = onCall(
  { region: "asia-northeast3" },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const { itemId } = request.data as { itemId: string };
    const item = SERVER_SHOP_ITEMS[itemId];
    if (!item) throw new HttpsError("not-found", "존재하지 않는 아이템입니다.");

    const db = admin.firestore();
    const userRef = db.collection("users").doc(uid);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists) throw new HttpsError("not-found", "사용자를 찾을 수 없습니다.");

      const userData = snap.data()!;
      const currentPoints: number = userData.points ?? 0;

      if (currentPoints < item.price) {
        throw new HttpsError("failed-precondition", "별조각이 부족합니다.");
      }

      // 중복 구매 방지 (모든 아이템 영구 소유)
      const owned: string[] = userData.ownedItems ?? [];
      if (owned.includes(itemId)) {
        throw new HttpsError("already-exists", "이미 보유한 아이템입니다.");
      }

      tx.update(userRef, {
        points: admin.firestore.FieldValue.increment(-item.price),
        ownedItems: admin.firestore.FieldValue.arrayUnion(itemId),
      });
    });

    return { success: true };
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

// 상품 ID → 별조각 수량 매핑
const PRODUCT_POINTS: { [key: string]: number } = {
  starpiece_100: 100,
  starpiece_550: 550,
  starpiece_1200: 1200,
};

// FN-04: 인앱 결제 영수증 검증 후 별조각 지급
// 환경 변수:
//   APPLE_SHARED_SECRET — App Store Connect 공유 시크릿
//   Google Play: 기본 서비스 계정 자격증명 사용 (Cloud Functions 실행 환경)
//   Google Play Console에서 서비스 계정에 Android Publisher API 권한 부여 필요
export const verifyPurchaseAndGrantPoints = onCall(
  { region: "asia-northeast3" },
  async (request) => {
    const db = admin.firestore();
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const { receipt, productId, platform } = request.data as {
      receipt: string;
      productId: string;
      platform: "android" | "ios";
    };

    if (!receipt || !productId || !platform) {
      throw new HttpsError("invalid-argument", "필수 파라미터가 누락되었습니다.");
    }

    const pointsToGrant = PRODUCT_POINTS[productId];
    if (!pointsToGrant) {
      throw new HttpsError("invalid-argument", `알 수 없는 상품 ID: ${productId}`);
    }

    // 플랫폼별 영수증 검증
    if (platform === "ios") {
      await verifyAppleReceipt(receipt, productId);
    } else {
      await verifyGooglePurchase(receipt, productId);
    }

    // 중복 지급 방지: receiptToken으로 기존 구매 내역 확인
    const purchaseRef = db.collection("purchases").doc(uid).collection("history");
    const existingQuery = await purchaseRef.where("receiptToken", "==", receipt).limit(1).get();
    if (!existingQuery.empty) {
      throw new HttpsError("already-exists", "이미 처리된 영수증입니다.");
    }

    // Transaction으로 포인트 지급 + 구매 내역 기록
    await db.runTransaction(async (tx) => {
      const userRef = db.collection("users").doc(uid);
      tx.update(userRef, {
        points: admin.firestore.FieldValue.increment(pointsToGrant),
      });
      const newPurchaseRef = purchaseRef.doc();
      tx.set(newPurchaseRef, {
        productId,
        points: pointsToGrant,
        platform,
        receiptToken: receipt,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    console.log(`User ${uid} granted ${pointsToGrant} points for ${productId} (${platform})`);
    return { success: true, pointsGranted: pointsToGrant };
  }
);

async function verifyAppleReceipt(receipt: string, productId: string): Promise<void> {
  const sharedSecret = process.env.APPLE_SHARED_SECRET;
  const body = JSON.stringify({ "receipt-data": receipt, ...(sharedSecret && { password: sharedSecret }) });

  // Production 먼저 시도, 21007 응답 시 Sandbox로 재시도
  for (const url of [
    "https://buy.itunes.apple.com/verifyReceipt",
    "https://sandbox.itunes.apple.com/verifyReceipt",
  ]) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const data = await response.json() as { status: number; receipt?: { in_app?: { product_id: string }[] } };

    if (data.status === 21007) continue; // sandbox receipt on production endpoint → retry sandbox

    if (data.status !== 0) {
      throw new HttpsError("invalid-argument", `Apple 영수증 검증 실패: status ${data.status}`);
    }

    const inApp = data.receipt?.in_app ?? [];
    const valid = inApp.some((p) => p.product_id === productId);
    if (!valid) {
      throw new HttpsError("invalid-argument", "영수증에 해당 상품이 없습니다.");
    }
    return;
  }
  throw new HttpsError("invalid-argument", "Apple 영수증 검증에 실패했습니다.");
}

async function verifyGooglePurchase(purchaseToken: string, productId: string): Promise<void> {
  const packageName = "com.moeum.app";
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });
  const androidPublisher = google.androidpublisher({ version: "v3", auth });

  const response = await androidPublisher.purchases.products.get({
    packageName,
    productId,
    token: purchaseToken,
  });

  // purchaseState: 0 = Purchased, 1 = Cancelled, 2 = Pending
  if (response.data.purchaseState !== 0) {
    throw new HttpsError("invalid-argument", `유효하지 않은 구매 상태: ${response.data.purchaseState}`);
  }
  // consumptionState: 0 = Not consumed (기대값)
  if (response.data.consumptionState !== 0) {
    throw new HttpsError("already-exists", "이미 소비된 구매입니다.");
  }
}
