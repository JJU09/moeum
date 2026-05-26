import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  SafeAreaView,
  Modal,
  ActivityIndicator
} from 'react-native';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useGroups } from '../../contexts/GroupContext';
import { submitAnswer } from '../../lib/answer';
import { useTodayQuestion } from '../../hooks/useTodayQuestion';
import { useTodayAnswers } from '../../hooks/useTodayAnswers';
import { QuestionCard } from '../../components/QuestionCard';
import { AnswerInput } from '../../components/AnswerInput';
import { AnswerFeed } from '../../components/AnswerFeed';

export default function TodayScreen() {
  const { user } = useAuth();
  const { groups, selectedGroup, setSelectedGroupId, loadingGroups } = useGroups();
  const [isGroupModalVisible, setIsGroupModalVisible] = useState(false);

  const { question, loading: loadingQuestion } = useTodayQuestion();
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
      console.error("Error submitting answer:", error);
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
                selectedGroup?.id === g.id && styles.groupOptionSelected
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
      <SafeAreaView style={styles.container}>
        <View style={styles.centerAll}>
          <Text style={[styles.emptyText, { fontSize: 18, fontWeight: '700', marginBottom: 12, color: theme.colors.textPrimary }]}>아직 속한 그룹이 없습니다.</Text>
          <Text style={styles.emptyText}>'그룹' 탭에서 새로운 그룹을 만들거나</Text>
          <Text style={styles.emptyText}>초대 코드로 참여해보세요!</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderGroupSelector()}
      
      <View style={styles.content}>
        {!hasAnswered ? (
          <>
            <QuestionCard questionText={question?.text} />
            <AnswerInput 
              onSubmit={handleAnswerSubmit} 
              answerCount={answers.length} 
            />
          </>
        ) : (
          <>
            <View style={{ marginBottom: 16 }}>
              <QuestionCard questionText={question?.text} />
            </View>
            <AnswerFeed 
              answers={answers} 
              currentUserId={user.uid} 
            />
          </>
        )}
      </View>

      {renderGroupModal()}
    </SafeAreaView>
  );
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
    padding: 20,
    justifyContent: 'space-between',
  },
  questionCard: {
    backgroundColor: '#F5F0E8',
    borderRadius: 16,
    padding: 24,
    minHeight: 150,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  questionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: 28,
  },
  inputContainer: {
    marginTop: 30,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    marginRight: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  blindStatus: {
    marginTop: 40,
    alignItems: 'center',
  },
  blindStatusText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  // Feed Styles
  questionCardSmall: {
    backgroundColor: '#F5F0E8',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E0D0',
  },
  questionTextSmall: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  feedList: {
    padding: 16,
  },
  myAnswerContainer: {
    marginBottom: 20,
  },
  answerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  myAnswerCard: {
    backgroundColor: '#E8E0D0',
    borderColor: '#D4C8B0',
  },
  answerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  nickname: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  timeText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  deleteText: {
    fontSize: 12,
    color: theme.colors.error,
  },
  answerContent: {
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: 16,
  },
  reactionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  reactionButtonActive: {
    backgroundColor: '#FFF0F0',
    borderColor: '#FFCDCD',
  },
  reactionEmoji: {
    fontSize: 16,
  },
  reactionCount: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: 'bold',
    color: theme.colors.text,
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
