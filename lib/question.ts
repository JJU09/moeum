import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Question } from '../types';
import { logError } from './logger';

const BASE_DATE = new Date('2026-05-28T00:00:00Z');
const CYCLE_DAYS = 730;

function getCycleDate(todayKST: string): string {
  const today = new Date(todayKST + 'T00:00:00Z');
  const daysSince = Math.floor((today.getTime() - BASE_DATE.getTime()) / (24 * 60 * 60 * 1000));
  const cycleIndex = ((daysSince % CYCLE_DAYS) + CYCLE_DAYS) % CYCLE_DAYS;
  const cycleDate = new Date(BASE_DATE.getTime() + cycleIndex * 24 * 60 * 60 * 1000);
  return cycleDate.toISOString().split('T')[0]!;
}

export const getTodayQuestion = async (groupId: string): Promise<Question | null> => {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const todayKST = kst.toISOString().split('T')[0]!;
  // 어제 경매의 낙찰 질문이 오늘의 질문
  const yesterdayKST = new Date(kst.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;

  try {
    if (groupId) {
      const auctionSnap = await getDoc(
        doc(db, 'groups', groupId, 'auctions', yesterdayKST)
      );
      if (auctionSnap.exists()) {
        const auction = auctionSnap.data();
        if (auction.winningQuestion && auction.status === 'closed') {
          return {
            id: todayKST,
            text: auction.winningQuestion,
            date: todayKST,
            isCustom: true,
            winnerNickname: auction.winnerNickname || '',
          };
        }
      }
    }

    // fallback: 글로벌 사이클 질문
    const cycleDate = getCycleDate(todayKST);
    const snap = await getDoc(doc(db, 'questions', cycleDate));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: cycleDate,
      text: data.content || data.text || '',
      date: todayKST,
      isCustom: false,
    };
  } catch (error) {
    logError('Error fetching today question:', error);
    return null;
  }
};
