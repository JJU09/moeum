import { db, app } from './firebase';
import {
  doc,
  getDoc,
  onSnapshot,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Auction, Bid } from '../types';
import { logError } from './logger';

export const getKSTDateString = (): string => {
  const now = new Date();
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0]!;
};

export const upsertBid = async (
  groupId: string,
  _userId: string,
  data: { questionText: string; bidPoints: number }
): Promise<void> => {
  const functions = getFunctions(app, 'asia-northeast3');
  const placeBid = httpsCallable(functions, 'placeBid');
  await placeBid({ groupId, questionText: data.questionText, bidPoints: data.bidPoints });
};

export const getMyBid = async (
  groupId: string,
  userId: string,
  date: string
): Promise<Bid | null> => {
  try {
    const bidRef = doc(db, 'groups', groupId, 'auctions', date, 'bids', userId);
    const snap = await getDoc(bidRef);
    if (!snap.exists()) return null;
    return snap.data() as Bid;
  } catch (error) {
    logError('Error fetching my bid:', error);
    return null;
  }
};

export const getAuction = async (
  groupId: string,
  date: string
): Promise<Auction | null> => {
  try {
    const auctionRef = doc(db, 'groups', groupId, 'auctions', date);
    const snap = await getDoc(auctionRef);
    if (!snap.exists()) return null;
    return snap.data() as Auction;
  } catch (error) {
    logError('Error fetching auction:', error);
    return null;
  }
};

export const subscribeAuction = (
  groupId: string,
  date: string,
  callback: (auction: Auction | null) => void
): (() => void) => {
  const auctionRef = doc(db, 'groups', groupId, 'auctions', date);
  return onSnapshot(
    auctionRef,
    (snap) => {
      callback(snap.exists() ? (snap.data() as Auction) : null);
    },
    (error) => {
      logError('Error subscribing to auction:', error);
      callback(null);
    }
  );
};
