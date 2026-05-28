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
  orderBy
} from 'firebase/firestore';
import { format, differenceInDays, parseISO } from 'date-fns';
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

  // Update streak and badges + get nickname
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : null;

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  
  let newStreakCount = userData?.streakCount || 0;
  if (userData) {
    const lastDateStr = userData.lastAnsweredDate;
    if (lastDateStr !== todayStr) {
      if (lastDateStr) {
        const diffDays = differenceInDays(
          parseISO(todayStr),
          parseISO(lastDateStr)
        );
        if (diffDays === 1) {
          newStreakCount += 1;
        } else {
          newStreakCount = 1;
        }
      } else {
        newStreakCount = 1;
      }
    }
  }

  const answerData = {
    groupId,
    questionId,
    userId,
    nickname: userData?.nickname || '',
    profileImage: userData?.profileImage || null,
    streakCount: newStreakCount,
    content,
    reactions: {
      "❤️": [],
      "🥹": [],
      "😂": [],
      "👏": []
    },
    createdAt: serverTimestamp(),
  };

  const answerRef = await addDoc(collection(db, 'answers'), answerData);

  if (userSnap.exists() && userData) {
    const lastDateStr = userData.lastAnsweredDate;

    const updates: any = {
      lastAnsweredDate: todayStr,
      streakCount: newStreakCount
    };

    const newBadges = [];
    const hour = today.getHours();
    
    if (hour >= 7 && hour < 11) {
      newBadges.push('early_bird');
    }
    if (newStreakCount >= 7) {
      newBadges.push('streak_7');
    }
    if (newStreakCount >= 30) {
      newBadges.push('streak_30');
    }

    if (newBadges.length > 0) {
      updates.badges = arrayUnion(...newBadges);
    }

    await updateDoc(userRef, updates);
  }

  return answerRef;
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