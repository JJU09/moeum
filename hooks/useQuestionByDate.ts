import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Question } from '../types';
import { useAuth } from '../contexts/AuthContext';

export function useQuestionByDate(dateStr: string) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !dateStr) {
      setLoading(false);
      return;
    }

    const fetchQuestion = async () => {
      setLoading(true);
      try {
        const questionRef = doc(db, 'questions', dateStr);
        const snapshot = await getDoc(questionRef);
        
        if (snapshot.exists()) {
          const data = snapshot.data();
          setQuestion({ 
            id: snapshot.id, 
            ...data,
            text: data.content || data.text || '' 
          } as Question);
        } else {
          setQuestion(null);
        }
      } catch (error) {
        console.error('Error fetching question by date:', error);
        setQuestion(null);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestion();
  }, [user, dateStr]);

  return { question, loading: loading };
}