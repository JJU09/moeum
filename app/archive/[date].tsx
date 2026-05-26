import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { theme } from '../../constants/theme';
import { getAnswersForQuestions } from '../../lib/archive';
import { Answer } from '../../types';
import { AnswerFeed } from '../../components/AnswerFeed';
import { QuestionCard } from '../../components/QuestionCard';
import { useAuth } from '../../contexts/AuthContext';
import { useQuestionByDate } from '../../hooks/useQuestionByDate';

export default function ArchiveFeedScreen() {
  const { date, groupId } = useLocalSearchParams();
  const { user } = useAuth();
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [answersLoading, setAnswersLoading] = useState(false);

  const dateStr = typeof date === 'string' ? date : Array.isArray(date) ? date[0] : '';
  const groupStr = typeof groupId === 'string' ? groupId : Array.isArray(groupId) ? groupId[0] : '';

  const { question, loading: questionLoading } = useQuestionByDate(dateStr);

  useEffect(() => {
    async function loadAnswers() {
      if (!question || !groupStr) return;
      
      setAnswersLoading(true);
      try {
        const ans = await getAnswersForQuestions(groupStr, [question.id]);
          // 시간순 정렬 등 필요시 프론트엔드에서 수행 (createdAt 기준)
          ans.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return timeB - timeA; // 최신순
          });
        setAnswers(ans);
      } catch (error) {
        console.error("Archive answers load error:", error);
      } finally {
        setAnswersLoading(false);
      }
    }
    
    loadAnswers();
  }, [question, groupStr]);

  const formattedDate = dateStr ? format(parseISO(dateStr), 'yyyy년 M월 d일') : '';
  const isLoading = questionLoading || answersLoading;

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: formattedDate,
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.textPrimary,
          headerTitleStyle: { color: theme.colors.textPrimary },
          headerShadowVisible: false,
        }} 
      />
      
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : question ? (
        <View style={styles.content}>
          <View style={styles.questionContainer}>
            <QuestionCard 
              questionText={question.text} 
              title={`${formattedDate}의 질문`} 
            />
          </View>
          <View style={styles.feedContainer}>
            <AnswerFeed 
              answers={answers}
              currentUserId={user?.uid || ""}
              isReadOnly={true}
            />
          </View>
        </View>
      ) : (
        <View style={styles.centerContainer}>
          <Text style={styles.noDataText}>해당 날짜의 질문을 찾을 수 없습니다.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  questionContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: theme.colors.background,
  },
  feedContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  noDataText: {
    fontSize: 16,
    color: theme.colors.textLight,
  },
});