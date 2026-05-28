import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { theme } from '../constants/theme';
import { upsertBid } from '../lib/auction';
import { Bid } from '../types';
import { logError } from '../lib/logger';

interface AuctionBidModalProps {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  userId: string;
  userPoints: number;
  existingBid: Bid | null;
}

export const AuctionBidModal: React.FC<AuctionBidModalProps> = ({
  visible,
  onClose,
  groupId,
  userId,
  userPoints,
  existingBid,
}) => {
  const [questionText, setQuestionText] = useState('');
  const [bidPoints, setBidPoints] = useState(10);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setQuestionText(existingBid?.questionText ?? '');
      setBidPoints(existingBid?.bidPoints ?? 10);
    }
  }, [visible, existingBid]);

  const clampPoints = (val: number) => Math.min(userPoints, Math.max(1, val));

  const handleSubmit = async () => {
    if (!questionText.trim()) {
      Alert.alert('알림', '질문을 입력해주세요.');
      return;
    }
    if (bidPoints < 1 || bidPoints > userPoints) {
      Alert.alert('알림', `1~${userPoints} 사이의 별조각을 베팅해주세요.`);
      return;
    }
    setSubmitting(true);
    try {
      await upsertBid(groupId, userId, {
        questionText: questionText.trim(),
        bidPoints,
      });
      onClose();
    } catch (error) {
      logError('upsertBid error:', error);
      Alert.alert('오류', '입찰에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const sheetContent = (
    <>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>별조각 베팅하기</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Balance */}
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>내 별조각</Text>
              <Text style={styles.balanceValue}>✨ {userPoints}</Text>
            </View>

            {/* Question Input */}
            <Text style={styles.fieldLabel}>내일의 질문</Text>
            <TextInput
              style={styles.questionInput}
              value={questionText}
              onChangeText={setQuestionText}
              placeholder="내일 우리 멤버들에게 던지고 싶은 질문을 적어주세요"
              placeholderTextColor={theme.colors.textMuted}
              multiline
              maxLength={100}
            />
            <Text style={styles.charCount}>{questionText.length}/100</Text>

            {/* Bet Control */}
            <Text style={styles.fieldLabel}>베팅할 별조각</Text>
            <View style={styles.betRow}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => setBidPoints(clampPoints(bidPoints - 1))}
              >
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.betInput}
                value={String(bidPoints)}
                onChangeText={(v) => {
                  const n = parseInt(v, 10);
                  if (!isNaN(n)) setBidPoints(clampPoints(n));
                }}
                keyboardType="number-pad"
                selectTextOnFocus
              />
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => setBidPoints(clampPoints(bidPoints + 1))}
              >
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Buttons */}
            <View style={styles.quickRow}>
              {[10, 50].map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={styles.quickBtn}
                  onPress={() => setBidPoints(clampPoints(bidPoints + amount))}
                >
                  <Text style={styles.quickBtnText}>+{amount}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.quickBtn, styles.allInBtn]}
                onPress={() => setBidPoints(userPoints)}
              >
                <Text style={[styles.quickBtnText, styles.allInText]}>All-in</Text>
              </TouchableOpacity>
            </View>

            {/* Disclaimer */}
            <Text style={styles.disclaimer}>
              💡 낙찰되지 않은 별조각은 자정에 100% 환불됩니다
            </Text>

            {/* Submit */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!questionText.trim() || bidPoints < 1 || bidPoints > userPoints || submitting) &&
                  styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!questionText.trim() || bidPoints < 1 || bidPoints > userPoints || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {existingBid ? `✨ ${bidPoints}별조각으로 다시 베팅하기` : `✨ ${bidPoints}별조각 베팅하기`}
                </Text>
              )}
            </TouchableOpacity>
        </ScrollView>
      </View>
    </>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView style={styles.overlay} behavior="padding">
          {sheetContent}
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.overlay}>{sheetContent}</View>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 0,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 18,
    color: theme.colors.textSecondary,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  questionInput: {
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 15,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.typography.koreanText,
  },
  charCount: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'right',
    marginBottom: 20,
    marginTop: 4,
  },
  betRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stepBtnText: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  betInput: {
    width: 80,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceLight,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.accent,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  quickBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  allInBtn: {
    borderColor: theme.colors.accent,
  },
  quickBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  allInText: {
    color: theme.colors.accent,
  },
  disclaimer: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  submitBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: theme.colors.gray[100],
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
