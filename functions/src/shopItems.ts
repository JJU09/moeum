// ⚠️ 이 파일이 가격/수량의 단일 진실의 원천입니다.
// constants/shopItems.ts의 price 값과 반드시 동기화하세요.

export interface ServerShopItem {
  id: string;
  category: 'border' | 'bg' | 'nick';
  price: number;
}

export const SERVER_SHOP_ITEMS: Record<string, ServerShopItem> = {
  // 글로우 테두리 (영구)
  border_gold:   { id: 'border_gold',   category: 'border', price: 200 },
  border_pink:   { id: 'border_pink',   category: 'border', price: 200 },
  border_rose:   { id: 'border_rose',   category: 'border', price: 200 },
  border_cyan:   { id: 'border_cyan',   category: 'border', price: 200 },
  // 프로필 배경 (영구)
  bg_midnight:   { id: 'bg_midnight',   category: 'bg',     price: 300 },
  bg_sunset:     { id: 'bg_sunset',     category: 'bg',     price: 300 },
  bg_forest:     { id: 'bg_forest',     category: 'bg',     price: 300 },
  bg_aurora:     { id: 'bg_aurora',     category: 'bg',     price: 300 },
  // 닉네임 이펙트 (영구)
  nick_gold:     { id: 'nick_gold',     category: 'nick',   price: 100 },
  nick_purple:   { id: 'nick_purple',   category: 'nick',   price: 100 },
  nick_gradient: { id: 'nick_gradient', category: 'nick',   price: 150 },
};
