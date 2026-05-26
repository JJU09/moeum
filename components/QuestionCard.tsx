import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../constants/theme';

interface QuestionCardProps {
  questionText?: string | null;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ questionText }) => {
  return (
    <LinearGradient
      colors={theme.gradients.warm}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Text style={styles.subtitle}>오늘의 질문</Text>
      <Text style={styles.text}>
        {questionText ? questionText : "오늘의 질문을 준비 중이에요 🌙"}
      </Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.border.radius,
    padding: 32,
    marginVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 12,
    fontWeight: '500',
  },
  text: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    lineHeight: 32,
  },
});
