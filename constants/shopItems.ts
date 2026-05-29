// ⚠️ price 값은 functions/src/shopItems.ts SERVER_SHOP_ITEMS와 반드시 동기화하세요.
// 실제 결제/차감은 서버에서 검증하므로, 클라이언트 가격은 표시 목적으로만 사용됩니다.
import { TIER_ACHIEVEMENT_MAP } from './achievements';

export type ShopItemCategory = 'avatar_border' | 'feed_border' | 'feed_bg' | 'nick';

export interface ShopItem {
  id: string;
  category: ShopItemCategory;
  label: string;
  price: number;
  badge?: string;
  // avatar_border: LinearGradient glow colors for the ring
  avatarBorderColors?: [string, string];
  // feed_border: 피드 카드 테두리 색상
  feedBorderColor?: string;
  // feed_bg: 피드 카드 배경 그라데이션
  feedBgColors?: [string, string];
  // nick: 닉네임 텍스트 색상
  nickColor?: string;
}

export const SHOP_ITEMS: ShopItem[] = [
  // --- 프로필 아이콘 테두리 ---
  {
    id: 'avatar_border_gold',
    category: 'avatar_border',
    label: '골드 테두리',
    price: 300,
    avatarBorderColors: ['#FFD700', '#FFA500'],
  },
  {
    id: 'avatar_border_violet',
    category: 'avatar_border',
    label: '바이올렛 테두리',
    price: 300,
    avatarBorderColors: ['#8B5CF6', '#A855F7'],
  },
  {
    id: 'avatar_border_rose',
    category: 'avatar_border',
    label: '로즈 테두리',
    price: 300,
    avatarBorderColors: ['#FB7185', '#F43F5E'],
    badge: '인기',
  },
  {
    id: 'avatar_border_cyan',
    category: 'avatar_border',
    label: '시안 테두리',
    price: 300,
    avatarBorderColors: ['#22D3EE', '#06B6D4'],
  },

  // --- 피드 카드 테두리 ---
  {
    id: 'feed_border_gold',
    category: 'feed_border',
    label: '골드 테두리',
    price: 200,
    feedBorderColor: '#FFD700',
  },
  {
    id: 'feed_border_pink',
    category: 'feed_border',
    label: '핑크 테두리',
    price: 200,
    feedBorderColor: '#FF69B4',
  },
  {
    id: 'feed_border_purple',
    category: 'feed_border',
    label: '퍼플 테두리',
    price: 200,
    feedBorderColor: '#A855F7',
  },
  {
    id: 'feed_border_cyan',
    category: 'feed_border',
    label: '시안 테두리',
    price: 200,
    feedBorderColor: '#22D3EE',
  },
  {
    id: 'feed_border_rose',
    category: 'feed_border',
    label: '로즈 테두리',
    price: 200,
    feedBorderColor: '#FB7185',
  },

  // --- 피드 카드 배경 ---
  {
    id: 'feed_bg_midnight',
    category: 'feed_bg',
    label: '미드나잇',
    price: 300,
    feedBgColors: ['#1a1035', '#2d1b4e'],
  },
  {
    id: 'feed_bg_sunset',
    category: 'feed_bg',
    label: '선셋',
    price: 300,
    feedBgColors: ['#3d1a1a', '#4e2d1b'],
    badge: '인기',
  },
  {
    id: 'feed_bg_ocean',
    category: 'feed_bg',
    label: '오션',
    price: 300,
    feedBgColors: ['#0d2137', '#0d3a37'],
  },
  {
    id: 'feed_bg_aurora',
    category: 'feed_bg',
    label: '오로라',
    price: 300,
    feedBgColors: ['#0f1d3d', '#1a0f3d'],
  },

  // --- 닉네임 이펙트 ---
  {
    id: 'nick_gold',
    category: 'nick',
    label: '골드 닉네임',
    price: 100,
    nickColor: '#F59E0B',
  },
  {
    id: 'nick_purple',
    category: 'nick',
    label: '퍼플 닉네임',
    price: 100,
    nickColor: '#A855F7',
  },
  {
    id: 'nick_gradient',
    category: 'nick',
    label: '그라데이션',
    price: 150,
    nickColor: '#EC4899',
    badge: 'NEW',
  },
];

export const SHOP_ITEMS_MAP: Record<string, ShopItem> = Object.fromEntries(
  SHOP_ITEMS.map((item) => [item.id, item])
);

/** 프로필 아이콘 테두리 글로우 색상 (Avatar.tsx에서 사용)
 *  구매 아이템(SHOP_ITEMS_MAP)과 업적 테두리(TIER_ACHIEVEMENT_MAP) 모두 지원 */
export const getAvatarBorderColors = (itemId?: string | null): [string, string] | null => {
  if (!itemId) return null;
  return (
    SHOP_ITEMS_MAP[itemId]?.avatarBorderColors ??
    TIER_ACHIEVEMENT_MAP[itemId]?.avatarBorderColors ??
    null
  );
};

/** @deprecated getAvatarBorderColors 사용 권장 */
export const getBorderGlowColors = getAvatarBorderColors;

/** 피드 카드 테두리 색상 */
export const getFeedBorderColor = (itemId?: string | null): string | null => {
  if (!itemId) return null;
  return SHOP_ITEMS_MAP[itemId]?.feedBorderColor ?? null;
};

/** 피드 카드 배경 그라데이션 */
export const getFeedBgColors = (itemId?: string | null): [string, string] | null => {
  const colors = SHOP_ITEMS_MAP[itemId ?? '']?.feedBgColors;
  return colors ?? null;
};

/** 닉네임 이펙트 텍스트 색상 */
export const getNickColor = (itemId?: string | null): string | null => {
  if (!itemId) return null;
  return SHOP_ITEMS_MAP[itemId]?.nickColor ?? null;
};
