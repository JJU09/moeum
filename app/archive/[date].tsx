import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { theme } from '../../constants/theme';
import { getQuestionByDate, getAnswersForQuestions } from '../../lib/archive';
import { Question, Answer } from '../../types';
import AnswerFeed from '../../components/AnswerFeed';
import { useAuth } from '../../contexts/AuthContext';

export default function ArchiveFeedScreen() {
  const { date, groupId } = useLocalSearchParams();
  const { user } = useAuth();
  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);

  const dateStr = typeof date === 'string' ? date : Array.isArray(date) ? date[0] : '';
  const groupStr = typeof groupId === 'string' ? groupId : Array.isArray(groupId) ? groupId[0] : '';

  useEffect(() => {
    async function loadFeed() {
      if (!dateStr || !groupStr) {
        setLoading(false);
        return;
      }
      
      try {
        const q = await getQuestionByDate(dateStr);
        setQuestion(q);
        
        if (q) {
          const ans = await getAnswersForQuestions(groupStr, [q.id]);
          // 시간순 정렬 등 필요시 프론트엔드에서 수행 (createdAt 기준)
          ans.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return timeB - timeA; // 최신순
          });
          setAnswers(ans);
        }
      } catch (error) {
        console.error("Archive feed load error:", error);
      } finally {
        setLoading(false);
      }
    }
    
    loadFeed();
  }, [dateStr, groupStr]);

  const formattedDate = dateStr ? format(parseISO(dateStr), 'yyyy년 M월 d일') : '';

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: formattedDate }} />
      
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : question ? (
        <View style={styles.content}>
          <View style={styles.questionContainer}>
            <Text style={styles.questionText}>{question.text}</Text>
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
    padding: 24,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  questionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: 28,
  },
  feedContainer: {
    flex: 1,
  },
  noDataText: {
    fontSize: 16,
    color: theme.colors.textLight,
  },
});