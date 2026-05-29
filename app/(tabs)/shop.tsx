import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
  ErrorCode,
  type Product,
  type Purchase,
  type PurchaseError,
} from 'react-native-iap';
import { db, app } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../constants/theme';
import { logError } from '../../lib/logger';
import { StarPieceIcon } from '../../components/StarPieceIcon';
import { purchaseShopItem, equipItem, unequipItem, type EquipSlot } from '../../lib/shop';
import {
  SHOP_ITEMS,
  type ShopItem,
} from '../../constants/shopItems';

// ─── IAP 상품 설정 ────────────────────────────────────────────────────────────

interface IAPProductConfig {
  sku: string;
  label: string;
  stars: number;
  fallbackPrice: string;
  badge?: string;
}

const IAP_PRODUCTS: IAPProductConfig[] = [
  { sku: 'starpiece_100',  label: '한 줌의 별조각',  stars: 100,   fallbackPrice: '₩1,100' },
  { sku: 'starpiece_550',  label: '한 봉지 별조각',  stars: 550,   fallbackPrice: '₩5,500',  badge: '인기' },
  { sku: 'starpiece_1200', label: '한 상자 별조각',  stars: 1200,  fallbackPrice: '₩11,000', badge: '최대 혜택' },
];

// ─── 아이템 카테고리별 필터 ────────────────────────────────────────────────────

const BORDER_ITEMS = SHOP_ITEMS.filter((i) => i.category === 'border');
const BG_ITEMS     = SHOP_ITEMS.filter((i) => i.category === 'bg');
const NICK_ITEMS   = SHOP_ITEMS.filter((i) => i.category === 'nick');

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function ShopScreen() {
  const { user } = useAuth();

  // 마운트 상태 추적 — IAP 콜백이 언마운트 후(또는 마운트 전)에 setState를 호출하는 것을 방지
  const isMountedRef = React.useRef(false);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // 별조각 잔액 + 소유/장착 상태
  const [points, setPoints] = useState(0);
  const [ownedItems, setOwnedItems] = useState<string[]>([]);
  const [equippedBorder, setEquippedBorder] = useState<string | undefined>();
  const [equippedBg, setEquippedBg] = useState<string | undefined>();
  const [equippedNickEffect, setEquippedNickEffect] = useState<string | undefined>();

  // IAP 상태
  const [storeProducts, setStoreProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  // 별조각 상점 구매 상태
  const [buyingItem, setBuyingItem] = useState<string | null>(null);

  // ─── Firestore 실시간 구독 ────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setPoints(data?.points ?? 0);
        setOwnedItems(data?.ownedItems ?? []);
        setEquippedBorder(data?.equippedBorder ?? undefined);
        setEquippedBg(data?.equippedBg ?? undefined);
        setEquippedNickEffect(data?.equippedNickEffect ?? undefined);
      }
    });
  }, [user]);

  // ─── IAP 초기화 ──────────────────────────────────────────────────────────────

  const handlePurchaseUpdate = useCallback(
    async (purchase: Purchase) => {
      if (!user || !isMountedRef.current) return;
      const { productId, purchaseToken } = purchase;
      if (!purchaseToken) { logError('No purchaseToken', purchase); return; }

      try {
        const functions = getFunctions(app, 'asia-northeast3');
        const verify = httpsCallable(functions, 'verifyPurchaseAndGrantPoints');
        await verify({
          receipt: purchaseToken,
          productId,
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
        });
        await finishTransaction({ purchase, isConsumable: true });
        const config = IAP_PRODUCTS.find((p) => p.sku === productId);
        if (isMountedRef.current) {
          Alert.alert('구매 완료! ⭐', `${config?.stars ?? 0}개의 별조각이 지급되었습니다.`);
        }
      } catch (error: any) {
        logError('Purchase verification error:', error);
        if (isMountedRef.current) {
          Alert.alert('오류', error?.message ?? '결제 처리 중 문제가 발생했습니다.');
        }
      } finally {
        if (isMountedRef.current) setPurchasing(null);
      }
    },
    [user]
  );

  const handlePurchaseError = useCallback((error: PurchaseError) => {
    if (!isMountedRef.current) return;
    if (error.code !== ErrorCode.UserCancelled) {
      logError('Purchase error:', error);
      Alert.alert('결제 오류', error.message ?? '결제 중 오류가 발생했습니다.');
    }
    setPurchasing(null);
  }, []);

  useEffect(() => {
    let purchaseUpdateSub: ReturnType<typeof purchaseUpdatedListener>;
    let purchaseErrorSub: ReturnType<typeof purchaseErrorListener>;

    const setup = async () => {
      try {
        await initConnection();
        if (!isMountedRef.current) return;
        setConnected(true);
        const skus = IAP_PRODUCTS.map((p) => p.sku);
        const products = await fetchProducts({ skus, type: 'in-app' });
        if (!isMountedRef.current) return;
        setStoreProducts(products as Product[]);
      } catch (error) {
        logError('IAP setup error:', error);
      } finally {
        if (isMountedRef.current) setLoadingProducts(false);
      }
      // 리스너는 반드시 마운트 상태일 때만 등록
      if (!isMountedRef.current) return;
      purchaseUpdateSub = purchaseUpdatedListener(handlePurchaseUpdate);
      purchaseErrorSub = purchaseErrorListener(handlePurchaseError);
    };

    setup();
    return () => {
      purchaseUpdateSub?.remove();
      purchaseErrorSub?.remove();
      endConnection();
    };
  }, [handlePurchaseUpdate, handlePurchaseError]);

  const handleIAPBuy = async (sku: string) => {
    if (purchasing || !connected) {
      if (!connected) Alert.alert('오류', '스토어에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    setPurchasing(sku);
    try {
      await requestPurchase({
        request: Platform.OS === 'ios'
          ? { apple: { sku } }
          : { google: { skus: [sku] } },
        type: 'in-app',
      });
    } catch (error: any) {
      if (error.code !== ErrorCode.UserCancelled) {
        logError('requestPurchase error:', error);
        Alert.alert('오류', error?.message ?? '구매 요청에 실패했습니다.');
      }
      setPurchasing(null);
    }
  };

  const getIAPDisplayPrice = (sku: string) => {
    const storeProduct = storeProducts.find((p) => p.id === sku);
    return storeProduct?.displayPrice ?? IAP_PRODUCTS.find((p) => p.sku === sku)?.fallbackPrice ?? '';
  };

  // ─── 별조각 상점 아이템 구매/장착 ─────────────────────────────────────────────

  const handleBuyItem = async (item: ShopItem) => {
    if (!user) return;
    if (buyingItem) return;
    if (points < item.price) {
      Alert.alert('별조각 부족', `별조각이 ${item.price - points}개 부족합니다.\n상점에서 충전하거나 매일 답변을 작성해 모아보세요!`);
      return;
    }
    setBuyingItem(item.id);
    try {
      await purchaseShopItem(item.id);
      Alert.alert('구매 완료!', `'${item.label}'을(를) 획득했습니다.`);
    } catch (error: any) {
      const msg: string = error?.details?.message ?? error?.message ?? '구매 중 오류가 발생했습니다.';
      if (msg.includes('이미 보유')) {
        Alert.alert('알림', '이미 보유한 아이템입니다.');
      } else {
        Alert.alert('오류', msg);
      }
    } finally {
      setBuyingItem(null);
    }
  };

  const slotForCategory = (category: ShopItem['category']): EquipSlot | null => {
    if (category === 'border') return 'equippedBorder';
    if (category === 'bg') return 'equippedBg';
    if (category === 'nick') return 'equippedNickEffect';
    return null;
  };

  const equippedValueForSlot = (slot: EquipSlot) => {
    if (slot === 'equippedBorder') return equippedBorder;
    if (slot === 'equippedBg') return equippedBg;
    if (slot === 'equippedNickEffect') return equippedNickEffect;
    return undefined;
  };

  const handleEquip = async (item: ShopItem) => {
    if (!user) return;
    const slot = slotForCategory(item.category);
    if (!slot) return;
    try {
      const current = equippedValueForSlot(slot);
      if (current === item.id) {
        await unequipItem(user.uid, slot);
      } else {
        await equipItem(user.uid, slot, item.id);
      }
    } catch (error: any) {
      Alert.alert('오류', '장착 변경 중 문제가 발생했습니다.');
    }
  };

  // ─── 서브 컴포넌트 ────────────────────────────────────────────────────────────

  const renderCosmeticCard = (item: ShopItem) => {
    const slot = slotForCategory(item.category);
    const isOwned = ownedItems.includes(item.id);
    const isEquipped = slot ? equippedValueForSlot(slot) === item.id : false;
    const canAfford = points >= item.price;
    const isBuying = buyingItem === item.id;

    // 미리보기 렌더링
    let preview: React.ReactNode;
    if (item.category === 'border' && item.glowColors) {
      preview = (
        <LinearGradient
          colors={item.glowColors}
          style={styles.borderPreview}
        >
          <View style={styles.borderPreviewInner} />
        </LinearGradient>
      );
    } else if (item.category === 'bg' && item.bgColors) {
      preview = (
        <LinearGradient colors={item.bgColors} style={styles.bgPreview} />
      );
    } else if (item.category === 'nick' && item.nickColor) {
      preview = (
        <View style={styles.nickPreviewContainer}>
          <Text style={[styles.nickPreviewText, { color: item.nickColor }]}>닉네임</Text>
        </View>
      );
    }

    return (
      <View key={item.id} style={[styles.cosmeticCard, isEquipped && styles.cosmeticCardEquipped]}>
        {item.badge && (
          <View style={styles.itemBadge}>
            <Text style={styles.itemBadgeText}>{item.badge}</Text>
          </View>
        )}

        <View style={styles.previewArea}>{preview}</View>

        <Text style={styles.cosmeticLabel}>{item.label}</Text>

        {isOwned ? (
          <TouchableOpacity
            style={[styles.equipBtn, isEquipped && styles.equipBtnActive]}
            onPress={() => handleEquip(item)}
          >
            <Text style={[styles.equipBtnText, isEquipped && styles.equipBtnTextActive]}>
              {isEquipped ? '장착 중 ✓' : '장착'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.buyItemBtn, !canAfford && styles.buyItemBtnDisabled]}
            onPress={() => handleBuyItem(item)}
            disabled={!canAfford || isBuying}
          >
            {isBuying ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <View style={styles.priceRow}>
                <StarPieceIcon size={12} />
                <Text style={[styles.buyItemBtnText, !canAfford && styles.buyItemBtnTextDisabled]}>
                  {item.price}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };


  // ─── 렌더링 ────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>별조각 상점</Text>
        <View style={styles.balancePill}>
          <View style={styles.balanceInner}>
            <StarPieceIcon size={14} />
            <Text style={styles.balanceText}>{points}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── 섹션 1: 별조각 충전 (IAP) ── */}
        <Text style={styles.sectionTitle}>별조각 충전</Text>
        <Text style={styles.sectionDesc}>
          경매에서 더 많은 별조각을 베팅하면{'\n'}낙찰 확률이 높아져요!
        </Text>

        {loadingProducts ? (
          <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginTop: 20 }} />
        ) : (
          IAP_PRODUCTS.map((product) => (
            <View key={product.sku} style={styles.iapCard}>
              {product.badge && (
                <View style={styles.iapBadge}>
                  <Text style={styles.iapBadgeText}>{product.badge}</Text>
                </View>
              )}
              <View style={styles.iapCardLeft}>
                <Text style={styles.iapLabel}>{product.label}</Text>
                <View style={styles.starCountRow}>
                  <StarPieceIcon size={18} />
                  <Text style={styles.starCount}>{product.stars.toLocaleString()}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.iapBuyBtn, purchasing === product.sku && styles.iapBuyBtnDisabled]}
                onPress={() => handleIAPBuy(product.sku)}
                disabled={!!purchasing}
                activeOpacity={0.8}
              >
                {purchasing === product.sku ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.iapBuyBtnText}>{getIAPDisplayPrice(product.sku)}</Text>
                )}
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={styles.divider} />

        {/* ── 섹션 2: 프로필 꾸미기 ── */}
        <Text style={styles.sectionTitle}>프로필 꾸미기</Text>
        <Text style={styles.sectionDesc}>구매한 아이템은 영구적으로 보유합니다.</Text>

        <Text style={styles.subSectionTitle}>글로우 테두리</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll} contentContainerStyle={styles.hScrollContent}>
          {BORDER_ITEMS.map(renderCosmeticCard)}
        </ScrollView>

        <Text style={styles.subSectionTitle}>프로필 배경</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll} contentContainerStyle={styles.hScrollContent}>
          {BG_ITEMS.map(renderCosmeticCard)}
        </ScrollView>

        <Text style={styles.subSectionTitle}>닉네임 이펙트</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll} contentContainerStyle={styles.hScrollContent}>
          {NICK_ITEMS.map(renderCosmeticCard)}
        </ScrollView>

        {/* 안내사항 */}
        <Text style={styles.notice}>
          • 구매한 별조각은 환불되지 않습니다{'\n'}
          • 낙찰되지 않은 베팅은 자정에 100% 환불됩니다{'\n'}
          • 꾸미기 아이템은 구매 후 영구 보유 가능합니다{'\n'}
          • iOS: App Store, Android: Google Play를 통해 결제됩니다
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── 스타일 ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  balancePill: {
    backgroundColor: theme.colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  balanceInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  balanceText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  scroll: {
    padding: 20,
    paddingBottom: 48,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 24,
  },

  // 섹션 타이틀
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  sectionDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  subSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 10,
    marginTop: 4,
  },

  // IAP 카드
  iapCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius,
    padding: 18,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  iapBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 12,
  },
  iapBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  iapCardLeft: {
    flex: 1,
  },
  iapLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  starCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starCount: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  iapBuyBtn: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 88,
    alignItems: 'center',
  },
  iapBuyBtnDisabled: {
    backgroundColor: theme.colors.gray[200],
  },
  iapBuyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  // 가로 스크롤
  hScroll: {
    marginBottom: 16,
  },
  hScrollContent: {
    gap: 10,
    paddingRight: 4,
  },

  // 꾸미기 카드
  cosmeticCard: {
    width: 116,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    alignItems: 'center',
    overflow: 'hidden',
  },
  cosmeticCardEquipped: {
    borderColor: theme.colors.accent,
    borderWidth: 2,
  },
  itemBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderBottomLeftRadius: 10,
  },
  itemBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  previewArea: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },

  // 테두리 미리보기 — 원형 그라데이션 링
  borderPreview: {
    width: 54,
    height: 54,
    borderRadius: 27,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  borderPreviewInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
  },

  // 배경 미리보기
  bgPreview: {
    width: 54,
    height: 54,
    borderRadius: 10,
  },

  // 닉네임 미리보기
  nickPreviewContainer: {
    width: 54,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nickPreviewText: {
    fontSize: 14,
    fontWeight: '700',
  },

  cosmeticLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },

  equipBtn: {
    width: '100%',
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    alignItems: 'center',
  },
  equipBtnActive: {
    backgroundColor: theme.colors.accent,
  },
  equipBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  equipBtnTextActive: {
    color: '#fff',
  },

  buyItemBtn: {
    width: '100%',
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
  },
  buyItemBtnDisabled: {
    backgroundColor: theme.colors.gray[200],
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  buyItemBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  buyItemBtnTextDisabled: {
    color: theme.colors.textMuted,
  },

  // 안내
  notice: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 20,
    marginTop: 16,
  },
});
