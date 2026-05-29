import { db } from './firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  getDocs,
  getDoc,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  orderBy,
} from 'firebase/firestore';
import { Answer } from '../types';
import { logError } from './logger';

export const submitAnswer = async (
  groupId: string, 
  questionId: string, 
  userId: string, 
  content: string
) => {
  // 중복 체크
  const q = query(
    collection(db, 'answers'),
    where('groupId', '==', groupId),
    where('questionId', '==', questionId),
    where('userId', '==', userId)
  );
  
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    throw new Error('이미 답변을 작성했습니다.');
  }

  // 유저 정보 읽기 (닉네임, 프로필 이미지, 장착 아이템 스냅샷용)
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : null;

  // streak 계산은 Cloud Function(onAnswerCreatedUpdateStreak)이 담당.
  // 답변 문서에는 현재 streak을 스냅샷으로 기록 (피드 즉시 표시용).
  const currentStreak = userData?.streakCount || 0;

  const answerData = {
    groupId,
    questionId,
    userId,
    nickname: userData?.nickname || '',
    profileImage: userData?.profileImage || null,
    streakCount: currentStreak,
    // 장착 이펙트 스냅샷 — 피드에서 바로 표시하기 위해 포함
    equippedNickEffect: userData?.equippedNickEffect || null,
    equippedBorder: userData?.equippedBorder || null,
    content,
    reactions: {
      "❤️": [],
      "🥹": [],
      "😂": [],
      "👏": []
    },
    createdAt: serverTimestamp(),
  };

  return addDoc(collection(db, 'answers'), answerData);
};

export const updateAnswer = async (answerId: string, content: string) => {
  const answerRef = doc(db, 'answers', answerId);
  await updateDoc(answerRef, { content });
};

export const toggleReaction = async (
  answerId: string, 
  userId: string, 
  emoji: string, 
  isAdding: boolean
) => {
  const answerRef = doc(db, 'answers', answerId);
  const fieldPath = `reactions.${emoji}`;
  
  await updateDoc(answerRef, {
    [fieldPath]: isAdding ? arrayUnion(userId) : arrayRemove(userId)
  });
};

export const subscribeToAnswers = (
  groupId: string, 
  questionId: string, 
  callback: (answers: Answer[]) => void
) => {
  const q = query(
    collection(db, 'answers'),
    where('groupId', '==', groupId),
    where('questionId', '==', questionId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const answers: Answer[] = [];
    snapshot.forEach((doc) => {
      answers.push({ id: doc.id, ...doc.data() } as Answer);
    });
    callback(answers);
  }, (error) => {
    logError("Error subscribing to answers:", error);
  });
};