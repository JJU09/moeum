import { useState, useEffect, useMemo } from 'react';
import { Answer, UserProfile } from '../types';
import { subscribeToAnswers } from '../lib/answer';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

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

    let isMounted = true;
    setLoading(true);

    const unsubscribe = subscribeToAnswers(groupId, questionId, async (newAnswers) => {
      const enrichedAnswers = await Promise.all(
        newAnswers.map(async (answer) => {
          try {
            const userRef = doc(db, 'users', answer.userId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const userData = userSnap.data() as UserProfile;
              return {
                ...answer,
                userProfile: {
                  ...answer.userProfile,
                  ...userData,
                }
              };
            }
          } catch (error) {
            console.error('Error fetching user profile for answer:', error);
          }
          return answer;
        })
      );

      if (isMounted) {
        setAnswers(enrichedAnswers);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [groupId, questionId]);

  const hasAnswered = useMemo(() => {
    if (!userId) return false;
    return answers.some(answer => answer.userId === userId);
  }, [answers, userId]);

  return { answers, loading, hasAnswered };
}