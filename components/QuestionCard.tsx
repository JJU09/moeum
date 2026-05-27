import React, { useEffect } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { theme } from '../constants/theme';

interface QuestionCardProps {
  questionText?: string | null;
  title?: string;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ questionText, title = "오늘의 질문" }) => {
  const translateY = useSharedValue(40);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withTiming(0, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
    opacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
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
    </Animated.View>
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
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    lineHeight: 32,
    ...theme.typography.koreanText,
  },
});
