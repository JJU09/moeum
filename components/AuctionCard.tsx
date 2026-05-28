import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { subscribeAuction, getMyBid, getKSTDateString } from '../lib/auction';
import { AuctionBidModal } from './AuctionBidModal';
import { Auction, Bid } from '../types';
import { theme } from '../constants/theme';
import { logError } from '../lib/logger';

interface AuctionCardProps {
  groupId: string;
  userId: string;
}

const getSecondsToMidnight = (): number => {
  const kstMs = Date.now() + 9 * 60 * 60 * 1000;
  const msInDay = 24 * 60 * 60 * 1000;
  return Math.floor((msInDay - (kstMs % msInDay)) / 1000);
};

const formatCountdown = (secs: number): string => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
};

export const AuctionCard: React.FC<AuctionCardProps> = ({ groupId, userId }) => {
  const [auction, setAuction] = useState<Auction | null>(null);
  const [myBid, setMyBid] = useState<Bid | null>(null);
  const [userPoints, setUserPoints] = useState(0);
  const [countdown, setCountdown] = useState(getSecondsToMidnight());
  const [isModalVisible, setIsModalVisible] = useState(false);

  // 경매 실시간 구독
  useEffect(() => {
    const date = getKSTDateString();
    const unsubscribe = subscribeAuction(groupId, date, setAuction);
    return () => unsubscribe();
  }, [groupId]);

  // 내 입찰 조회
  const refreshMyBid = useCallback(async () => {
    try {
      const date = getKSTDateString();
      const bid = await getMyBid(groupId, userId, date);
      setMyBid(bid);
    } catch (error) {
      logError('Error refreshing my bid:', error);
    }
  }, [groupId, userId]);

  useEffect(() => { refreshMyBid(); }, [refreshMyBid]);

  // 유저 별조각 실시간 구독
  useEffect(() => {
    const userRef = doc(db, 'users', userId);
    return onSnapshot(userRef, (snap) => {
      if (snap.exists()) setUserPoints(snap.data()?.points ?? 0);
    }, (error) => { logError('Error subscribing to user points:', error); });
  }, [userId]);

  // 카운트다운 타이머
  useEffect(() => {
    const timer = setInterval(() => setCountdown(getSecondsToMidnight()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 정산 완료된 경우만 미표시 (문서 없음 = 아직 생성 전, 정상 표시)
  if (auction?.status === 'closed') return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>✨ 별조각 경매</Text>
        <Text style={styles.timer}>{formatCountdown(countdown)} 후 마감</Text>
      </View>

      <Text style={styles.participantCount}>
        현재 {auction?.participantCount ?? 0}명 참여 중
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => setIsModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>
          {myBid
            ? `내 질문 수정하기 (현재 ${myBid.bidPoints}별조각 베팅 중)`
            : '별조각 베팅하고 질문 던지기'}
        </Text>
      </TouchableOpacity>

      <AuctionBidModal
        visible={isModalVisible}
        onClose={() => {
          setIsModalVisible(false);
          refreshMyBid();
        }}
        groupId={groupId}
        userId={userId}
        userPoints={userPoints}
        existingBid={myBid}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  timer: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.accent,
    fontVariant: ['tabular-nums'],
  },
  participantCount: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  button: {
    backgroundColor: theme.colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
