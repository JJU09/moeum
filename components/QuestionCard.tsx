import React from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { theme } from '../constants/theme';

interface QuestionCardProps {
  questionText?: string | null;
  title?: string;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ questionText, title = "오늘의 질문" }) => {
  return (
    <LinearGradient
      colors={theme.gradients.warm}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {Platform.OS === 'web' ? (
        <Text style={[styles.subtitle, {
          backgroundImage: 'linear-gradient(to right, #7FFFD4, #FFFFFF)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          color: 'transparent', // Fallback for some browsers
        }] as any}>
          {title}
        </Text>
      ) : (
        <MaskedView
          style={styles.maskedView}
          maskElement={
            <View style={styles.maskContainer}>
              <Text style={styles.subtitle}>{title}</Text>
            </View>
          }
        >
          <LinearGradient
            colors={['#7FFFD4', '#FFFFFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientFill}
          />
        </MaskedView>
      )}
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
  maskedView: {
    height: 24, // Enough height for the subtitle
    width: '100%',
    marginBottom: 12,
  },
  maskContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientFill: {
    flex: 1,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: Platform.OS === 'web' ? 12 : 0,
  },
  text: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    lineHeight: 32,
    ...theme.typography.koreanText,
  },
});
