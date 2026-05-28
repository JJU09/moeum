import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { theme } from '../constants/theme';

interface AnswerInputProps {
  onSubmit: (content: string) => void;
  answerCount: number;
}

export const AnswerInput: React.FC<AnswerInputProps> = ({ onSubmit, answerCount }) => {
  const [content, setContent] = useState('');
  const maxLength = 200;
  const currentLength = content.length;
  
  const isValidLength = currentLength >= 1 && currentLength <= maxLength;
  const progressColor = isValidLength ? theme.colors.success : theme.colors.error;
  const progressWidth = `${Math.min((currentLength / maxLength) * 100, 100)}%`;

  const handleSubmit = () => {
    if (isValidLength) {
      const normalized = content.replace(/\n{3,}/g, '\n\n').trim();
      onSubmit(normalized);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>🔒 현재 {answerCount}명이 답변을 완료했어요!</Text>
      </View>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          multiline
          scrollEnabled
          placeholder="오늘의 답변을 남겨주세요 (1~200자)"
          placeholderTextColor={theme.colors.textMuted}
          value={content}
          onChangeText={setContent}
          maxLength={maxLength}
          textAlignVertical="top"
        />
        
        <View style={styles.footer}>
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBackground}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: progressWidth as any, backgroundColor: progressColor }
                ]} 
              />
            </View>
            <Text style={[styles.lengthText, { color: progressColor }]}>
              {currentLength} / {maxLength}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.submitButton, !isValidLength && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!isValidLength}
          >
            <Text style={styles.submitButtonText}>답변하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  statusContainer: {
    marginBottom: 12,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  inputContainer: {
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.border.radius,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  input: {
    minHeight: 120,
    maxHeight: 200,
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.textPrimary,
    ...theme.typography.koreanText,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  progressContainer: {
    flex: 1,
    marginRight: 16,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: theme.colors.gray[200],
    borderRadius: 2,
    marginBottom: 6,
  },
  progressBarFill: {
    height: 4,
    borderRadius: 2,
  },
  lengthText: {
    fontSize: 12,
    textAlign: 'right',
  },
  submitButton: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  submitButtonDisabled: {
    backgroundColor: theme.colors.gray[200],
  },
  submitButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
});
