// ⚠️ price 값은 functions/src/shopItems.ts SERVER_SHOP_ITEMS와 반드시 동기화하세요.
// 실제 결제/차감은 서버에서 검증하므로, 클라이언트 가격은 표시 목적으로만 사용됩니다.

export type ShopItemCategory = 'border' | 'bg' | 'nick';

export interface ShopItem {
  id: string;
  category: ShopItemCategory;
  label: string;
  price: number;
  badge?: string;
  // border 미리보기용
  glowColors?: [string, string];
  // bg 미리보기용
  bgColors?: [string, string];
  // nick 미리보기용
  nickColor?: string;
}

export const SHOP_ITEMS: ShopItem[] = [
  // --- 글로우 테두리 ---
  {
    id: 'border_gold',
    category: 'border',
    label: '골드 글로우',
    price: 200,
    glowColors: ['#FFD700', '#FFA500'],
  },
  {
    id: 'border_pink',
    category: 'border',
    label: '핑크 글로우',
    price: 200,
    glowColors: ['#FF69B4', '#FF1493'],
  },
  {
    id: 'border_rose',
    category: 'border',
    label: '로즈 글로우',
    price: 200,
    glowColors: ['#FB7185', '#E11D48'],
  },
  {
    id: 'border_cyan',
    category: 'border',
    label: '시안 글로우',
    price: 200,
    glowColors: ['#22D3EE', '#0891B2'],
  },

  // --- 프로필 배경 ---
  {
    id: 'bg_midnight',
    category: 'bg',
    label: '미드나잇',
    price: 300,
    bgColors: ['#0F0C29', '#302B63'],
  },
  {
    id: 'bg_sunset',
    category: 'bg',
    label: '선셋',
    price: 300,
    bgColors: ['#FF512F', '#F09819'],
    badge: '인기',
  },
  {
    id: 'bg_forest',
    category: 'bg',
    label: '포레스트',
    price: 300,
    bgColors: ['#134E5E', '#71B280'],
  },
  {
    id: 'bg_aurora',
    category: 'bg',
    label: '오로라',
    price: 300,
    bgColors: ['#2C3E50', '#3498DB'],
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
    nickColor: '#EC4899', // 미리보기용 대표 색상
    badge: 'NEW',
  },

];

export const SHOP_ITEMS_MAP: Record<string, ShopItem> = Object.fromEntries(
  SHOP_ITEMS.map((item) => [item.id, item])
);

export const getBorderGlowColors = (itemId: string): [string, string] | null => {
  const item = SHOP_ITEMS_MAP[itemId];
  if (item?.category === 'border' && item.glowColors) return item.glowColors;
  return null;
};

export const getBgColors = (itemId: string): [string, string] | null => {
  const item = SHOP_ITEMS_MAP[itemId];
  if (item?.category === 'bg' && item.bgColors) return item.bgColors;
  return null;
};

export const getNickColor = (itemId: string): string | null => {
  const item = SHOP_ITEMS_MAP[itemId];
  if (item?.category === 'nick' && item.nickColor) return item.nickColor;
  return null;
};
