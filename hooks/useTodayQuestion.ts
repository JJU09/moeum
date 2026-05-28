import { useState, useEffect } from 'react';
import { getTodayQuestion } from '../lib/question';
import { Question } from '../types';
import { useAuth } from '../contexts/AuthContext';

export function useTodayQuestion(groupId?: string) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getTodayQuestion(groupId ?? '').then((q) => {
      if (!cancelled) {
        setQuestion(q);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [user, groupId]);

  return { question, loading };
}
