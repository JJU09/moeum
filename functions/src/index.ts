import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { OpenAI } from "openai";

admin.initializeApp();

export const generateDailyQuestion = onSchedule(
  {
    schedule: "0 7 * * *",
    timeZone: "Asia/Seoul",
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

      const prompt = `1020세대 친구들이 매일 아침 서로의 생각을 나누는 일기 앱을 위한 질문을 1개 만들어줘.
조건: 가볍고 긍정적인 톤, 답변하기 부담 없는 주제, 150~200자로 답변 가능한 범위,
질문만 출력 (다른 말 없이)`;

      const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: model,
        temperature: 0.7,
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

      await db.collection("questions").doc(todayDate).set({
        content: questionContent,
        date: todayDate,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Successfully generated and saved question for ${todayDate}: ${questionContent}`);
    } catch (error) {
      console.error("Error generating daily question:", error);
    }
  }
);