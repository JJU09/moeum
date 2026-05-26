import { useState, useEffect } from 'react';
import { getQuestionsByMonth, getAnswersForQuestions } from '../lib/archive';
import { Question, Answer } from '../types';

export interface ArchiveDayData {
  question: Question | null;
  answers: Answer[];
  answerCount: number;
}

export interface ArchiveMonthData {
  [dateStr: string]: ArchiveDayData;
}

export function useArchive(year: number, month: number, groupId: string | null) {
  const [data, setData] = useState<ArchiveMonthData>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!groupId) return;
      setLoading(true);
      try {
        const questions = await getQuestionsByMonth(year, month);
        const questionIds = questions.map(q => q.id);
        const answers = await getAnswersForQuestions(groupId, questionIds);

        if (!isMounted) return;

        const monthData: ArchiveMonthData = {};
        
        // 초기화
        questions.forEach(q => {
          monthData[q.date] = {
            question: q,
            answers: [],
            answerCount: 0
          };
        });

        // 답변 매핑
        answers.forEach(ans => {
          const q = questions.find(question => question.id === ans.questionId);
          if (q) {
            monthData[q.date].answers.push(ans);
            monthData[q.date].answerCount++;
          }
        });

        setData(monthData);
      } catch (error) {
        console.error("Archive load error:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [year, month, groupId]);

  return { data, loading };
}