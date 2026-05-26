import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Colors from '../../constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { FontAwesome } from '@expo/vector-icons';

export default function ProfileSetupScreen() {
  const { user, completeProfile } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [nickname, setNickname] = useState(user?.displayName || '');
  const [loading, setLoading] = useState(false);

  const handleSaveProfile = async () => {
    if (!nickname.trim()) {
      Alert.alert('오류', '닉네명을 입력해주세요.');
      return;
    }

    if (!user) return;

    setLoading(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        nickname: nickname.trim(),
        profileImage: user.photoURL || '',
        statusMessage: '',
        createdAt: new Date(),
        streakCount: 0,
      });

      // 상태를 수동으로 업데이트하여 _layout.tsx의 무한루프(튕김 현상) 방지
      completeProfile();
      
      // 약간의 지연 후 라우팅하여 레이아웃이 상태 변경을 먼저 인지하게 함
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 100);
    } catch (error) {
      console.error(error);
      Alert.alert('오류', '프로필 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      <Text style={[styles.title, { color: Colors[colorScheme ?? 'light'].text }]}>
        환영합니다!
      </Text>
      <Text style={[styles.subtitle, { color: Colors[colorScheme ?? 'light'].text }]}>
        사용하실 닉네임을 설정해주세요.
      </Text>

      <View style={styles.profileImagePlaceholder}>
        <FontAwesome name="user-circle" size={100} color="#ccc" />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { color: Colors[colorScheme ?? 'light'].text }]}
          placeholder="닉네임"
          placeholderTextColor="#888"
          value={nickname}
          onChangeText={setNickname}
        />
      </View>

      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSaveProfile}
        disabled={loading}
      >
        <Text style={styles.saveButtonText}>
          {loading ? '저장 중...' : '시작하기'}
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
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 40,
    opacity: 0.7,
  },
  profileImagePlaceholder: {
    marginBottom: 40,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    width: '100%',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});