import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useGroups } from '../../contexts/GroupContext';
import { AuctionCard } from '../../components/AuctionCard';
import { theme } from '../../constants/theme';

const getKSTHour = (): number => (new Date().getUTCHours() + 9) % 24;

export default function AuctionScreen() {
  const { user } = useAuth();
  const { selectedGroup } = useGroups();
  const isAuctionTime = getKSTHour() >= 7;

  if (!user || !selectedGroup) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>별조각 경매</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {isAuctionTime ? (
          <>
            <Text style={styles.desc}>
              가장 많은 별조각을 베팅한 질문이{'\n'}내일 우리 그룹의 질문이 됩니다 ✨
            </Text>
            <AuctionCard groupId={selectedGroup.id} userId={user.uid} />
          </>
        ) : (
          <View style={styles.waitingCard}>
            <Text style={styles.waitingEmoji}>💌</Text>
            <Text style={styles.waitingTitle}>
              오늘 우리 그룹의 질문{'\n'}정산이 완료되었습니다
            </Text>
            <Text style={styles.waitingSubtitle}>
              과연 누구의 질문이 채택되었을까요?{'\n'}오전 7시에 배달됩니다!
            </Text>
          </View>
        )}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  scroll: {
    padding: 20,
  },
  desc: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
    ...theme.typography.koreanText,
  },
  waitingCard: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  waitingEmoji: {
    fontSize: 48,
  },
  waitingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    lineHeight: 30,
    ...theme.typography.koreanText,
  },
  waitingSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    ...theme.typography.koreanText,
  },
});
