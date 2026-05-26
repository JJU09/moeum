import { useState, useEffect, useMemo } from 'react';
import { Answer } from '../types';
import { subscribeToAnswers } from '../lib/answer';

export function useTodayAnswers(
  groupId: string | null | undefined, 
  questionId: string | null | undefined, 
  userId: string | null | undefined
) {
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId || !questionId) {
      setAnswers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToAnswers(groupId, questionId, (newAnswers) => {
      setAnswers(newAnswers);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [groupId, questionId]);

  const hasAnswered = useMemo(() => {
    if (!userId) return false;
    return answers.some(answer => answer.userId === userId);
  }, [answers, userId]);

  return { answers, loading, hasAnswered };
}