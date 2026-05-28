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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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

interface ProductConfig {
  sku: string;
  label: string;
  stars: number;
  fallbackPrice: string;
  badge?: string;
}

const PRODUCTS: ProductConfig[] = [
  { sku: 'starpiece_100',  label: '한 줌의 별조각',  stars: 100,   fallbackPrice: '₩1,100' },
  { sku: 'starpiece_550',  label: '한 봉지 별조각',  stars: 550,   fallbackPrice: '₩5,500',  badge: '인기' },
  { sku: 'starpiece_1200', label: '한 상자 별조각',  stars: 1200,  fallbackPrice: '₩11,000', badge: '최대 혜택' },
];

export default function ShopScreen() {
  const { user } = useAuth();
  const [points, setPoints] = useState(0);
  const [storeProducts, setStoreProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  // 별조각 잔액 실시간 구독
  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) setPoints(snap.data()?.points ?? 0);
    });
  }, [user]);

  const handlePurchaseUpdate = useCallback(async (purchase: Purchase) => {
    if (!user) return;
    const { productId, purchaseToken } = purchase;

    if (!purchaseToken) {
      logError('No purchaseToken in purchase', purchase);
      return;
    }

    try {
      const functions = getFunctions(app, 'asia-northeast3');
      const verify = httpsCallable(functions, 'verifyPurchaseAndGrantPoints');
      await verify({
        receipt: purchaseToken,
        productId,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      });

      await finishTransaction({ purchase, isConsumable: true });

      const config = PRODUCTS.find((p) => p.sku === productId);
      Alert.alert('구매 완료! ⭐', `${config?.stars ?? 0}개의 별조각이 지급되었습니다.`);
    } catch (error: any) {
      logError('Purchase verification error:', error);
      Alert.alert('오류', error?.message ?? '결제 처리 중 문제가 발생했습니다.');
    } finally {
      setPurchasing(null);
    }
  }, [user]);

  const handlePurchaseError = useCallback((error: PurchaseError) => {
    if (error.code !== ErrorCode.UserCancelled) {
      logError('Purchase error:', error);
      Alert.alert('결제 오류', error.message ?? '결제 중 오류가 발생했습니다.');
    }
    setPurchasing(null);
  }, []);

  // IAP 연결 초기화
  useEffect(() => {
    let purchaseUpdateSub: ReturnType<typeof purchaseUpdatedListener>;
    let purchaseErrorSub: ReturnType<typeof purchaseErrorListener>;

    const setup = async () => {
      try {
        await initConnection();
        setConnected(true);

        const skus = PRODUCTS.map((p) => p.sku);
        const products = await fetchProducts({ skus, type: 'in-app' });
        setStoreProducts(products as Product[]);
      } catch (error) {
        logError('IAP setup error:', error);
      } finally {
        setLoadingProducts(false);
      }

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

  const handleBuy = async (sku: string) => {
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

  const getDisplayPrice = (sku: string): string => {
    const storeProduct = storeProducts.find((p) => p.id === sku);
    return storeProduct?.displayPrice ?? PRODUCTS.find((p) => p.sku === sku)?.fallbackPrice ?? '';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>별조각 상점</Text>
        <View style={styles.balancePill}>
          <Text style={styles.balanceText}>⭐ {points}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>별조각 충전</Text>
        <Text style={styles.sectionDesc}>
          경매에서 더 많은 별조각을 베팅하면{'\n'}낙찰 확률이 높아져요!
        </Text>

        {loadingProducts ? (
          <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginTop: 40 }} />
        ) : (
          PRODUCTS.map((product) => (
            <View key={product.sku} style={styles.card}>
              {product.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{product.badge}</Text>
                </View>
              )}
              <View style={styles.cardLeft}>
                <Text style={styles.productLabel}>{product.label}</Text>
                <Text style={styles.starCount}>⭐ {product.stars.toLocaleString()}</Text>
              </View>
              <TouchableOpacity
                style={[styles.buyBtn, purchasing === product.sku && styles.buyBtnDisabled]}
                onPress={() => handleBuy(product.sku)}
                disabled={!!purchasing}
                activeOpacity={0.8}
              >
                {purchasing === product.sku ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buyBtnText}>{getDisplayPrice(product.sku)}</Text>
                )}
              </TouchableOpacity>
            </View>
          ))
        )}

        <Text style={styles.notice}>
          • 구매한 별조각은 환불되지 않습니다{'\n'}
          • 낙찰되지 않은 베팅은 자정에 100% 환불됩니다{'\n'}
          • iOS: App Store, Android: Google Play를 통해 결제됩니다
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  balancePill: {
    backgroundColor: theme.colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  balanceText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  sectionDesc: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
    ...theme.typography.koreanText,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  cardLeft: {
    flex: 1,
  },
  productLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  starCount: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  buyBtn: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 90,
    alignItems: 'center',
  },
  buyBtnDisabled: {
    backgroundColor: theme.colors.gray[200],
  },
  buyBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  notice: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 20,
    marginTop: 12,
    ...theme.typography.koreanText,
  },
});
