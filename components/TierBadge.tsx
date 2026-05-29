import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { getUserTier } from '../lib/badge';

interface TierBadgeProps {
  streakCount?: number;
  /** sm: 피드·그룹 카드, md: 마이탭 */
  size?: 'sm' | 'md';
}

/**
 * 현재 streak 등급을 닉네임 옆에 작은 pill로 표시.
 * NONE 등급이면 null 반환 (렌더링 없음).
 * 등급이 떨어지면 자동으로 사라짐 (streakCount 기반, 동적).
 */
export const TierBadge: React.FC<TierBadgeProps> = ({ streakCount, size = 'sm' }) => {
  const tierInfo = getUserTier(streakCount ?? 0);
  if (tierInfo.tier === 'NONE') return null;

  const isSm = size === 'sm';
  const bgColor = tierInfo.color || '#86EFAC';

  return (
    <View style={[styles.pill, isSm ? styles.pillSm : styles.pillMd, { backgroundColor: bgColor + '33' }]}>
      <Text style={[styles.label, isSm ? styles.labelSm : styles.labelMd, { color: bgColor }]}>
        {tierInfo.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    borderRadius: 100,
    alignSelf: 'center',
  },
  pillSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pillMd: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: {
    fontWeight: '700',
  },
  labelSm: {
    fontSize: 10,
  },
  labelMd: {
    fontSize: 13,
  },
});
