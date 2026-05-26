import { db } from './firebase';
import { collection, query, where, getDocs, orderBy, startAt, endAt } from 'firebase/firestore';
import { Question, Answer } from '../types';

// 특정 월의 질문 목록 가져오기
export const getQuestionsByMonth = async (year: number, month: number): Promise<Question[]> => {
  const startMonthStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const endMonthStr = `${year}-${String(month).padStart(2, '0')}-31`; // 문자열 비교이므로 31로 해도 됨

  const q = query(
    collection(db, 'questions'),
    orderBy('date'),
    startAt(startMonthStr),
    endAt(endMonthStr)
  );

  const snapshot = await getDocs(q);
  const questions: Question[] = [];
  snapshot.forEach((doc) => {
    questions.push({ id: doc.id, ...doc.data() } as Question);
  });
  
  return questions;
};

// 특정 그룹의 여러 질문에 대한 답변 목록 가져오기 (각 질문 ID별로 병렬 조회)
export const getAnswersForQuestions = async (groupId: string, questionIds: string[]): Promise<Answer[]> => {
  if (questionIds.length === 0) return [];

  const answers: Answer[] = [];
  
  // Firestore의 'in' 쿼리는 최대 10개 요소 제한이 있어, chunk 단위로 쪼개거나 
  // questionId별로 Promise.all을 사용하는 방법이 있습니다.
  // 한 달 최대 31일이므로 10개씩 chunk로 나누어 쿼리합니다.
  const chunkSize = 10;
  const chunks = [];
  for (let i = 0; i < questionIds.length; i += chunkSize) {
    chunks.push(questionIds.slice(i, i + chunkSize));
  }

  const promises = chunks.map(async (chunk) => {
    const q = query(
      collection(db, 'answers'),
      where('groupId', '==', groupId),
      where('questionId', 'in', chunk)
    );
    const snapshot = await getDocs(q);
    const chunkAnswers: Answer[] = [];
    snapshot.forEach((doc) => {
      chunkAnswers.push({ id: doc.id, ...doc.data() } as Answer);
    });
    return chunkAnswers;
  });

  const results = await Promise.all(promises);
  results.forEach(res => answers.push(...res));

  return answers;
};

// 특정 날짜의 질문 가져오기
export const getQuestionByDate = async (dateStr: string): Promise<Question | null> => {
  const q = query(
    collection(db, 'questions'),
    where('date', '==', dateStr)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Question;
};