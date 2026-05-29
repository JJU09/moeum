/** 등급 해금 연속 출석 임계값 */
export const TIER_THRESHOLDS = {
  FIREFLY:   3,
  DEW:       7,
  STARLIGHT: 14,
  AURORA:    30,
  DAWN:      100,
} as const;

export interface TierInfo {
  tier: string;
  color: string;
  label: string;
  nextTierDays?: number;
  nextTierLabel?: string;
  isGradient?: boolean;
  gradientColors?: string[];
}

export function getUserTier(streakCount: number = 0): TierInfo {
  if (streakCount < 3) {
    return {
      tier: 'NONE',
      color: '',
      label: '등급 없음',
      nextTierDays: 3 - streakCount,
      nextTierLabel: '🌿 반딧불',
    };
  } else if (streakCount < 7) {
    return {
      tier: 'FIREFLY',
      color: '#86EFAC',
      label: '🌿 반딧불',
      nextTierDays: 7 - streakCount,
      nextTierLabel: '💧 이슬빛',
    };
  } else if (streakCount < 14) {
    return {
      tier: 'DEW',
      color: '#2DD4BF',
      label: '💧 이슬빛',
      nextTierDays: 14 - streakCount,
      nextTierLabel: '⭐ 별빛',
      isGradient: true,
      gradientColors: ['#BAE6FD', '#2DD4BF'],
    };
  } else if (streakCount < 30) {
    return {
      tier: 'STARLIGHT',
      color: '#93C5FD',
      label: '⭐ 별빛',
      nextTierDays: 30 - streakCount,
      nextTierLabel: '🌌 오로라',
      isGradient: true,
      gradientColors: ['#FFFFFF', '#93C5FD'],
    };
  } else if (streakCount < 100) {
    return {
      tier: 'AURORA',
      color: '#A855F7',
      label: '🌌 오로라',
      nextTierDays: 100 - streakCount,
      nextTierLabel: '🌅 여명',
      isGradient: true,
      gradientColors: ['#A855F7', '#3B82F6', '#22C55E'],
    };
  } else {
    return {
      tier: 'DAWN',
      color: '#F97316',
      label: '🌅 여명',
      isGradient: true,
      gradientColors: ['#EF4444', '#F97316', '#FBBF24', '#FFFFFF'],
    };
  }
}
