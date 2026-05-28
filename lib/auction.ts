import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { Auction, Bid } from '../types';
import { logError } from './logger';

export const getKSTDateString = (): string => {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split('T')[0]!;
};

export const upsertBid = async (
  groupId: string,
  userId: string,
  data: { questionText: string; bidPoints: number }
): Promise<void> => {
  const date = getKSTDateString();
  const bidRef = doc(db, 'groups', groupId, 'auctions', date, 'bids', userId);
  const existing = await getDoc(bidRef);

  await setDoc(
    bidRef,
    {
      userId,
      questionText: data.questionText,
      bidPoints: data.bidPoints,
      updatedAt: serverTimestamp(),
      ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true }
  );
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
