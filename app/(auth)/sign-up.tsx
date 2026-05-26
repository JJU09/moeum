import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { theme } from '../../constants/theme';

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignUp = async () => {
    setErrorMessage('');
    if (!email || !password || !confirmPassword || !nickname) {
      setErrorMessage('모든 필드를 입력해주세요.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('비밀번호는 6자리 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    try {
      // 1. Firebase Auth에 사용자 생성
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Firestore users 컬렉션에 초기 데이터 저장
      await setDoc(doc(db, 'users', user.uid), {
        nickname: nickname,
        profileImage: '',
        statusMessage: '',
        createdAt: new Date(),
        streakCount: 0,
      });

      // 가입 성공 시 _layout.tsx의 리다이렉트 로직에 의해 /(tabs) 또는 적절한 곳으로 이동됨
      // (Profile이 이미 생성되었으므로 isProfileComplete가 true가 됨)
    } catch (error: any) {
      console.error(error);
      let msg = '회원가입 중 오류가 발생했습니다.';
      if (error.code === 'auth/email-already-in-use') {
        msg = '이미 사용 중인 이메일입니다.';
      } else if (error.code === 'auth/invalid-email') {
        msg = '올바른 이메일 형식이 아닙니다.';
      } else if (error.code === 'auth/weak-password') {
        msg = '비밀번호는 6자 이상이어야 합니다.';
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="이메일"
          placeholderTextColor={theme.colors.textMuted}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setErrorMessage('');
          }}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="비밀번호 (6자리 이상)"
          placeholderTextColor={theme.colors.textMuted}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setErrorMessage('');
          }}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="비밀번호 확인"
          placeholderTextColor={theme.colors.textMuted}
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(text);
            setErrorMessage('');
          }}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="닉네임"
          placeholderTextColor={theme.colors.textMuted}
          value={nickname}
          onChangeText={(text) => {
            setNickname(text);
            setErrorMessage('');
          }}
        />
        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}
      </View>

      <TouchableOpacity
        style={styles.signUpButton}
        onPress={handleSignUp}
        disabled={loading}
      >
        <Text style={styles.signUpButtonText}>
          {loading ? '가입 중...' : '가입하기'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  inputContainer: {
    gap: 16,
    marginBottom: 24,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.border.radius,
    paddingHorizontal: 16,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  signUpButton: {
    backgroundColor: theme.colors.accent,
    height: 50,
    borderRadius: theme.border.radius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 4,
  },
});
