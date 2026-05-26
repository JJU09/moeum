import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { Question } from '../types';
import { useAuth } from '../contexts/AuthContext';

export function useTodayQuestion() {
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchTodayQuestion = async () => {
      try {
        // Get today's date in KST
        const now = new Date();
        const kstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
        const todayDate = kstTime.toISOString().split('T')[0]; // YYYY-MM-DD

        const q = query(
          collection(db, 'questions'),
          where('date', '==', todayDate),
          limit(1)
        );
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          setQuestion({ id: doc.id, ...doc.data() } as Question);
        } else {
          setQuestion(null);
        }
      } catch (error) {
        console.error('Error fetching today question:', error);
        setQuestion(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTodayQuestion();
  }, [user]);

  return { question, loading };
}