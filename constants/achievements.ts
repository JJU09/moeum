// 연속 출석으로 영구 해금되는 업적 테두리 카탈로그
// 가격 없음 — badges 필드에 tier_* badge가 있으면 장착 가능

export interface AchievementItem {
  id: string;               // equippedBorder 슬롯에 저장되는 ID
  tierBadge: string;        // 해금 조건 badge ID (badges 필드에서 확인)
  label: string;            // UI 표시 이름
  requiredStreakDays: number;
  avatarBorderColors: [string, string]; // LinearGradient glow
  animated?: boolean;       // true → 펄스 애니메이션 적용 (상점 미리보기 + Avatar)
}

export const TIER_ACHIEVEMENT_ITEMS: AchievementItem[] = [
  {
    id: 'tier_border_firefly',
    tierBadge: 'tier_firefly',
    label: '🌿 반딧불 테두리',
    requiredStreakDays: 3,
    avatarBorderColors: ['#86EFAC', '#4ADE80'],
    animated: true,
  },
  {
    id: 'tier_border_dew',
    tierBadge: 'tier_dew',
    label: '💧 이슬빛 테두리',
    requiredStreakDays: 7,
    avatarBorderColors: ['#BAE6FD', '#2DD4BF'],
    animated: true,
  },
  {
    id: 'tier_border_starlight',
    tierBadge: 'tier_starlight',
    label: '⭐ 별빛 테두리',
    requiredStreakDays: 14,
    avatarBorderColors: ['#FFFFFF', '#93C5FD'],
    animated: true,
  },
  {
    id: 'tier_border_aurora',
    tierBadge: 'tier_aurora',
    label: '🌌 오로라 테두리',
    requiredStreakDays: 30,
    avatarBorderColors: ['#A855F7', '#3B82F6'],
    animated: true,
  },
  {
    id: 'tier_border_dawn',
    tierBadge: 'tier_dawn',
    label: '🌅 여명 테두리',
    requiredStreakDays: 100,
    avatarBorderColors: ['#EF4444', '#F97316'],
    animated: true,
  },
];

export const TIER_ACHIEVEMENT_MAP: Record<string, AchievementItem> = Object.fromEntries(
  TIER_ACHIEVEMENT_ITEMS.map(i => [i.id, i])
);
