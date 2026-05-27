import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentUpdated, onDocumentCreated } from "firebase-functions/v2/firestore";
import { OpenAI } from "openai";

admin.initializeApp();

export const generateDailyQuestion = onSchedule(
  {
    schedule: "0 7 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  async (event) => {
    try {
      const apiKey = process.env.LITELLM_API_KEY;
      const baseURL = process.env.LITELLM_BASE_URL;
      const model = process.env.LITELLM_MODEL || "gpt-3.5-turbo";

      if (!apiKey || !baseURL) {
        console.error("Missing LITELLM_API_KEY or LITELLM_BASE_URL environment variables.");
        return;
      }

      const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: baseURL,
      });

      const topics = ['일상', '음식', '관계', '꿈', '취미', '감정', '여행', '음악', '계절', '성장', '추억', 'friendship'];
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];

      const prompt = `1020세대 친구들이 매일 아침 서로의 생각을 나누는 일기 앱을 위한 질문을 1개 만들어줘.
오늘의 주제: ${randomTopic}
조건:
- 가볍고 긍정적인 톤
- 답변하기 부담 없는 주제
- 10~200자로 답변 가능한 범위
- 이전과 겹치지 않는 신선한 질문
- 질문은 30자 이내로 짧고 간결하게
- 한 문장으로만 구성
- 물음표로 끝내기
- 질문만 출력 (다른 말 없이, 번호나 설명 없이)`;

      const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: model,
        temperature: 0.9,
      });

      let questionContent = completion.choices[0]?.message?.content?.trim();
      
      if (!questionContent) {
        console.error("Failed to generate question content.");
        return;
      }
      
      // Remove quotes if present
      questionContent = questionContent.replace(/^["']|["']$/g, '');

      const db = admin.firestore();
      
      // Get today's date in KST
      const now = new Date();
      const kstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
      const todayDate = kstTime.toISOString().split('T')[0]; // YYYY-MM-DD
      if (!todayDate) return;

      await db.collection("questions").doc(todayDate).set({
        content: questionContent,
        date: todayDate,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Successfully generated and saved question for ${todayDate}: ${questionContent}`);

      // 푸시 알림 발송 로직 추가
      const usersSnapshot = await db.collection("users").get();
      const tokens: string[] = [];
      const tokenToUserId: { [token: string]: string } = {};

      usersSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.fcmToken) {
          tokens.push(data.fcmToken);
          tokenToUserId[data.fcmToken] = doc.id;
        }
      });

      if (tokens.length > 0) {
        const shortContent = questionContent.length > 30 
          ? questionContent.substring(0, 30) + '...' 
          : questionContent;

        const message = {
          notification: {
            title: "딩동! 오늘의 모음이 도착했습니다 ☀️",
            body: shortContent,
          },
          tokens: tokens,
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`${response.successCount} messages were sent successfully`);
        
        // 만료된 토큰 정리
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const error = resp.error;
            if (error?.code === 'messaging/registration-token-not-registered' || error?.code === 'messaging/invalid-registration-token') {
              const token = tokens[idx];
              if (token) failedTokens.push(token);
            }
          }
        });

        if (failedTokens.length > 0) {
          const batch = db.batch();
          failedTokens.forEach(token => {
            const userId = tokenToUserId[token];
            if (userId) {
              const userRef = db.collection("users").doc(userId);
              batch.update(userRef, { fcmToken: admin.firestore.FieldValue.delete() });
            }
          });
          await batch.commit();
          console.log(`Removed ${failedTokens.length} invalid tokens`);
        }
      }

    } catch (error) {
      console.error("Error generating daily question:", error);
    }
  }
);

// 리액션 추가 시 푸시 알림
export const onReactionUpdated = onDocumentUpdated("answers/{answerId}", async (event) => {
  const db = admin.firestore();
  
  if (!event.data) {
    return;
  }

  const beforeData = event.data.before.data();
  const afterData = event.data.after.data();

  // reactions 필드 변경 확인
  const beforeReactions = beforeData.reactions || {};
  const afterReactions = afterData.reactions || {};
  
  if (JSON.stringify(beforeReactions) === JSON.stringify(afterReactions)) {
    return;
  }

  const answerUserId = afterData.userId;
  if (!answerUserId) return;

  // 마지막으로 추가된 리액션 찾기
  let newReactorId: string | null = null;
  let newEmoji: string | null = null;

  for (const [emoji, users] of Object.entries(afterReactions) as [string, string[]][]) {
    const beforeUsers = (beforeReactions[emoji] as string[]) || [];
    const addedUsers = users.filter(u => !beforeUsers.includes(u));
    if (addedUsers.length > 0) {
      newReactorId = addedUsers[0] ?? null; // 보통 한 번에 하나씩 추가됨
      newEmoji = emoji;
      break;
    }
  }

  // 삭제이거나 본인이 누른 경우 무시
  if (!newReactorId || !newEmoji || newReactorId === answerUserId) {
    return;
  }

  try {
    const userDoc = await db.collection("users").doc(answerUserId).get();
    if (!userDoc.exists) return;
    
    const userData = userDoc.data();
    if (!userData?.fcmToken) return;

    const message = {
      notification: {
        title: "새로운 리액션!",
        body: `누군가 내 답변에 ${newEmoji}를 남겼어요!`,
      },
      token: userData.fcmToken,
    };

    await admin.messaging().send(message);
  } catch (error: any) {
    console.error("Error sending reaction push:", error);
    if (error.code === 'messaging/registration-token-not-registered') {
      await db.collection("users").doc(answerUserId).update({ fcmToken: admin.firestore.FieldValue.delete() });
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

    const answerData = answerDoc.data();
    const answerUserId = answerData?.userId;

    // 본인 댓글인 경우 무시
    if (!answerUserId || answerUserId === commenterId) return;

    const [commenterDoc, answerUserDoc] = await Promise.all([
      db.collection("users").doc(commenterId).get(),
      db.collection("users").doc(answerUserId).get()
    ]);

    const answerUserData = answerUserDoc.data();
    if (!answerUserData?.fcmToken) return;

    const commenterName = commenterDoc.data()?.nickname || "누군가";
    const shortContent = content.length > 20 ? content.substring(0, 20) + '...' : content;

    const message = {
      notification: {
        title: "새로운 댓글!",
        body: `${commenterName}님이 댓글을 남겼어요: ${shortContent}`,
      },
      token: answerUserData.fcmToken,
    };

    await admin.messaging().send(message);
  } catch (error: any) {
    console.error("Error sending comment push:", error);
    if (error.code === 'messaging/registration-token-not-registered') {
      try {
        const answerDoc = await db.collection("answers").doc(answerId).get();
        if (answerDoc.exists) {
          const answerUserId = answerDoc.data()?.userId;
          if (answerUserId) {
            await db.collection("users").doc(answerUserId).update({ fcmToken: admin.firestore.FieldValue.delete() });
          }
        }
      } catch(e) {
        // ignore
      }
    }
  }
});