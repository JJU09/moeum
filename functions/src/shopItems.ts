// ⚠️ 이 파일이 가격의 단일 진실의 원천입니다.
// constants/shopItems.ts의 price 값과 반드시 동기화하세요.

export interface ServerShopItem {
  id: string;
  category: 'avatar_border' | 'feed_border' | 'feed_bg' | 'nick';
  price: number;
}

export const SERVER_SHOP_ITEMS: Record<string, ServerShopItem> = {
  // 프로필 아이콘 테두리 (영구)
  avatar_border_gold:   { id: 'avatar_border_gold',   category: 'avatar_border', price: 300 },
  avatar_border_violet: { id: 'avatar_border_violet',  category: 'avatar_border', price: 300 },
  avatar_border_rose:   { id: 'avatar_border_rose',    category: 'avatar_border', price: 300 },
  avatar_border_cyan:   { id: 'avatar_border_cyan',    category: 'avatar_border', price: 300 },
  // 피드 카드 테두리 (영구)
  feed_border_gold:     { id: 'feed_border_gold',   category: 'feed_border', price: 200 },
  feed_border_pink:     { id: 'feed_border_pink',   category: 'feed_border', price: 200 },
  feed_border_purple:   { id: 'feed_border_purple', category: 'feed_border', price: 200 },
  feed_border_cyan:     { id: 'feed_border_cyan',   category: 'feed_border', price: 200 },
  feed_border_rose:     { id: 'feed_border_rose',   category: 'feed_border', price: 200 },
  // 피드 카드 배경 (영구)
  feed_bg_midnight:     { id: 'feed_bg_midnight', category: 'feed_bg', price: 300 },
  feed_bg_sunset:       { id: 'feed_bg_sunset',   category: 'feed_bg', price: 300 },
  feed_bg_ocean:        { id: 'feed_bg_ocean',    category: 'feed_bg', price: 300 },
  feed_bg_aurora:       { id: 'feed_bg_aurora',   category: 'feed_bg', price: 300 },
  // 닉네임 이펙트 (영구)
  nick_gold:            { id: 'nick_gold',     category: 'nick', price: 100 },
  nick_purple:          { id: 'nick_purple',   category: 'nick', price: 100 },
  nick_gradient:        { id: 'nick_gradient', category: 'nick', price: 150 },
};
