import { deleteField, doc, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, db } from './firebase';

/** 별조각으로 상점 아이템 구매 (Cloud Function 호출) */
export const purchaseShopItem = (itemId: string) => {
  const functions = getFunctions(app, 'asia-northeast3');
  return httpsCallable(functions, 'purchaseShopItem')({ itemId });
};

export type EquipSlot = 'equippedBorder' | 'equippedBg' | 'equippedNickEffect';

/** 아이템 장착 */
export const equipItem = (userId: string, slot: EquipSlot, itemId: string) =>
  updateDoc(doc(db, 'users', userId), { [slot]: itemId });

/** 아이템 장착 해제 (deleteField로 필드 자체를 제거) */
export const unequipItem = (userId: string, slot: EquipSlot) =>
  updateDoc(doc(db, 'users', userId), { [slot]: deleteField() });
