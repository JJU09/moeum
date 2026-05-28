import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useGroups } from '../../contexts/GroupContext';
import { submitAnswer } from '../../lib/answer';
import { useTodayQuestion } from '../../hooks/useTodayQuestion';
import { useTodayAnswers } from '../../hooks/useTodayAnswers';
import { QuestionCard } from '../../components/QuestionCard';
import { AnswerInput } from '../../components/AnswerInput';
import { AnswerFeed } from '../../components/AnswerFeed';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { logError } from '../../lib/logger';

const getKSTHour = (): number => (new Date().getUTCHours() + 9) % 24;

export default function TodayScreen() {
  const { user } = useAuth();
  const { groups, selectedGroup, setSelectedGroupId, loadingGroups } = useGroups();
  const [isGroupModalVisible, setIsGroupModalVisible] = useState(false);

  const { question, loading: loadingQuestion } = useTodayQuestion(selectedGroup?.id);
  const { answers, loading: loadingAnswers, hasAnswered } = useTodayAnswers(
    selectedGroup?.id,
    question?.id,
    user?.uid
  );

  if (!user) return null;

  const handleAnswerSubmit = async (content: string) => {
    if (!selectedGroup || !question) return;
    try {
      await submitAnswer(selectedGroup.id, question.id, user.uid, content);
    } catch (error) {
      logError("Error submitting answer:", error);
    }
  };

  const renderGroupSelector = () => (
    <TouchableOpacity
      style={styles.groupSelector}
      onPress={() => setIsGroupModalVisible(true)}
    >
      <Text style={styles.groupSelectorText}>
        {selectedGroup ? selectedGroup.name : '그룹 선택'} ▾
      </Text>
    </TouchableOpacity>
  );

  const renderGroupModal = () => (
    <Modal
      visible={isGroupModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setIsGroupModalVisible(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setIsGroupModalVisible(false)}
      >
        <View style={styles.modalContent}>
          {groups.map(g => (
            <TouchableOpacity
              key={g.id}
              style={[
                styles.groupOption,
                selectedGroup?.id === g.id && styles.groupOptionSelected,
              ]}
              onPress={() => {
                setSelectedGroupId(g.id);
                setIsGroupModalVisible(false);
              }}
            >
              <Text style={styles.groupOptionText}>{g.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  if (loadingGroups || loadingQuestion) {
    return (
      <View style={[styles.container, styles.centerAll]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  if (groups.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerAll}>
          <Text style={[styles.emptyText, { fontSize: 18, fontWeight: '700', marginBottom: 12, color: theme.colors.textPrimary }]}>
            아직 속한 그룹이 없습니다.
          </Text>
          <Text style={styles.emptyText}>'그룹' 탭에서 새로운 그룹을 만들거나</Text>
          <Text style={styles.emptyText}>초대 코드로 참여해보세요!</Text>
        </View>
      </SafeAreaView>
    );
  }

  const kstHour = getKSTHour();
  const isAuctionTime = kstHour >= 7;

  const renderHeader = () => (
    <View>
      {selectedGroup && (
        <TouchableOpacity
          style={styles.auctionBanner}
          onPress={() => router.push('/auction')}
          activeOpacity={0.7}
        >
          <Text style={styles.auctionBannerText}>
            {isAuctionTime ? '✨ 별조각 경매 진행 중' : '💌 오전 7시에 공개됩니다'}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={theme.colors.accent} />
        </TouchableOpacity>
      )}
      <QuestionCard
        questionText={question?.text}
        isCustom={question?.isCustom}
        winnerNickname={question?.winnerNickname}
      />
      {!hasAnswered && (
        <AnswerInput onSubmit={handleAnswerSubmit} answerCount={answers.length} />
      )}
      {hasAnswered && <View style={{ height: 16 }} />}
    </View>
  );

  const screenContent = (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderGroupSelector()}
      <View style={styles.content}>
        <AnswerFeed
          answers={hasAnswered ? answers : []}
          currentUserId={user.uid}
          ListHeaderComponent={renderHeader}
        />
      </View>
      {renderGroupModal()}
    </SafeAreaView>
  );

  return Platform.OS !== 'web' ? (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {screenContent}
    </KeyboardAvoidingView>
  ) : screenContent;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerAll: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  groupSelector: {
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  groupSelectorText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  auctionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  auctionBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-start',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    marginTop: 100,
    marginHorizontal: 40,
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  groupOption: {
    padding: 16,
    borderRadius: 8,
  },
  groupOptionSelected: {
    backgroundColor: theme.colors.surfaceLight,
  },
  groupOptionText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    fontWeight: '600',
  },
});
