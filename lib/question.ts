import { db } from './firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { Question } from '../types';

export const getTodayQuestion = async (groupId: string): Promise<Question | null> => {
  // 실제 구현에서는 그룹별 질문이나 전역 오늘의 질문 로직에 맞게 조정
  // 여기서는 간단하게 date가 오늘인 질문을 가져오도록 구현
  const today = new Date();
  const dateString = today.toISOString().split('T')[0];

  try {
    const q = query(
      collection(db, 'questions'),
      where('date', '==', dateString),
      limit(1)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Question;
  } catch (error) {
    console.error('Error fetching today question:', error);
    return null;
  }
};