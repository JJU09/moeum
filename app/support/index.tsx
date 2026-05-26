import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { router, Stack } from 'expo-router';
import { UserProfile } from '../../types';

type Category = '문의' | '버그신고' | '기능제안' | '기타';
const CATEGORIES: Category[] = ['문의', '버그신고', '기능제안', '기타'];

export default function SupportScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [category, setCategory] = useState<Category>('문의');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        }
      }
    };
    fetchProfile();
  }, [user]);

  const handleSubmit = async () => {
    if (content.length < 10) {
      Alert.alert('알림', '내용을 10자 이상 입력해주세요.');
      return;
    }

    if (!user || !profile) {
      Alert.alert('오류', '로그인 정보가 없습니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'inquiries'), {
        userId: user.uid,
        nickname: profile.nickname || 'Unknown',
        category,
        content,
        createdAt: serverTimestamp(),
        status: '접수됨',
      });
      
      Alert.alert('알림', '문의가 접수되었어요 💜', [
        { text: '확인', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      Alert.alert('오류', '문의 접수에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: '고객센터',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.textPrimary,
          headerTitleStyle: { color: theme.colors.textPrimary },
          headerShadowVisible: false,
        }}
      />
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>무엇을 도와드릴까요?</Text>
          
          <Text style={styles.label}>카테고리</Text>
          <View style={styles.categoryContainer}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryButton,
                  category === cat && styles.categoryButtonSelected
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    category === cat && styles.categoryTextSelected
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>내용</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="문의하실 내용을 자세히 적어주세요. (최소 10자 이상)"
              placeholderTextColor={theme.colors.textMuted}
              multiline
              maxLength={500}
              value={content}
              onChangeText={setContent}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>
              {content.length}/500
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (content.length < 10 || isSubmitting) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={content.length < 10 || isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? '접수 중...' : '제출하기'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryButtonSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  categoryText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  inputContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 32,
  },
  input: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    minHeight: 150,
  },
  charCount: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.border.radius,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});