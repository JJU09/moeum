import { addDoc, collection, getDocs, onSnapshot, orderBy, query, serverTimestamp, where } from 'firebase/firestore';
import { db } from './firebase';
import { Comment } from '../types';

export const addComment = async (
  answerId: string,
  userId: string,
  content: string,
  nickname: string,
  profileImage?: string
): Promise<void> => {
  try {
    const commentsRef = collection(db, 'comments');
    await addDoc(commentsRef, {
      answerId,
      userId,
      content,
      nickname,
      profileImage: profileImage || null,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

export const getComments = (
  answerId: string,
  onUpdate: (comments: Comment[]) => void
) => {
  const q = query(
    collection(db, 'comments'),
    where('answerId', '==', answerId),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const comments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      onUpdate(comments);
    },
    (error) => {
      console.error('Error fetching comments:', error);
      // 색인 에러 등으로 실패 시 빈 배열로 콜백하여 앱 멈춤 방지
      onUpdate([]);
    }
  );
};
