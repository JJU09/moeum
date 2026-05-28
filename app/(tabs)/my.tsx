import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, TextInput, Alert, ScrollView, Switch, Linking, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { db, auth } from '../../lib/firebase';
import { Avatar } from '../../components/Avatar';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { UserProfile } from '../../types';
import { getUserTier } from '../../lib/badge';
import { logError } from '../../lib/logger';

export default function MyScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const isMounted = React.useRef(true);

  React.useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  // Edit states
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [editingStatus, setEditingStatus] = useState(false);
  const [statusInput, setStatusInput] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile(data);
        setNicknameInput(data.nickname || '');
        setStatusInput(data.statusMessage || '');
      }
    } catch (error) {
      logError("Error loading profile:", error);
    }
  };

  const pickImage = async () => {
    if (!user) return;
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0].uri) {
      setUploading(true);
      try {
        const uri = result.assets[0].uri;
        const idToken = await user.getIdToken();
        const bucket = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!;
        const storagePath = `users/${user.uid}/profile.jpg`;
        const encodedPath = encodeURIComponent(storagePath);

        // uploadAsync는 파일 URI를 Android 네이티브 HTTP로 직접 전송 — JS Blob/ArrayBuffer 미사용
        const uploadResult = await FileSystem.uploadAsync(
          `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?uploadType=media&name=${encodedPath}`,
          uri,
          {
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
            headers: {
              Authorization: `Bearer ${idToken}`,
              'Content-Type': 'image/jpeg',
            },
          }
        );

        if (uploadResult.status !== 200) {
          throw new Error(`Upload failed: ${uploadResult.status}`);
        }

        const data = JSON.parse(uploadResult.body);
        const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media&token=${data.downloadTokens}`;

        await updateProfile('profileImage', downloadUrl);
      } catch (error: any) {
        Alert.alert('오류', `프로필 이미지 업로드에 실패했습니다: ${error.message || '알 수 없는 오류'}`);
      } finally {
        if (isMounted.current) setUploading(false);
      }
    }
  };

  const updateProfile = async (field: string, value: string) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, { [field]: value });
      setProfile(prev => prev ? { ...prev, [field]: value } : null);
    } catch (error) {
      logError(`Error updating ${field}:`, error);
      Alert.alert('오류', '프로필 업데이트에 실패했습니다.');
    }
  };

  const handleNicknameSubmit = () => {
    if (nicknameInput.trim() && nicknameInput !== profile?.nickname) {
      updateProfile('nickname', nicknameInput.trim());
    } else {
      setNicknameInput(profile?.nickname || '');
    }
    setEditingNickname(false);
  };

  const handleStatusSubmit = () => {
    if (statusInput.trim() !== profile?.statusMessage) {
      updateProfile('statusMessage', statusInput.trim());
    }
    setEditingStatus(false);
  };

  const handleLogout = () => {
    console.log('Logout button pressed');

    if (Platform.OS === 'web') {
      if (window.confirm('정말 로그아웃 하시겠습니까?')) {
        const performLogout = async () => {
          try {
            await signOut(auth);
            router.replace('/(auth)/login');
          } catch (error) {
            logError("Logout error:", error);
            window.alert("로그아웃 중 문제가 발생했습니다.");
          }
        };
        performLogout();
      }
      return;
    }

    Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { 
        text: '로그아웃', 
        style: 'destructive', 
        onPress: async () => {
          try {
            await signOut(auth);
            router.replace('/(auth)/login');
          } catch (error) {
            logError("Logout error:", error);
            Alert.alert("오류", "로그아웃 중 문제가 발생했습니다.");
          }
        } 
      },
    ]);
  };

  if (!profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  const streakCount = profile.streakCount || 0;
  const tierInfo = getUserTier(streakCount);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        {/* Profile Section */}
        <View style={styles.profileSection}>
        <TouchableOpacity onPress={pickImage} disabled={uploading}>
          <View style={styles.imageContainer}>
            <Avatar 
              profileImage={profile.profileImage} 
              nickname={profile.nickname}
              size={100} 
              streakCount={profile.streakCount || 0}
            />
            {uploading && (
              <View style={[StyleSheet.absoluteFill, styles.uploadingOverlay]}>
                <ActivityIndicator color={theme.colors.accent} />
              </View>
            )}
            <View style={styles.editIconBadge}>
              <Ionicons name="camera" size={12} color="#fff" />
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.infoContainer}>
          {editingNickname ? (
            <TextInput
              style={styles.nicknameInput}
              value={nicknameInput}
              onChangeText={setNicknameInput}
              onBlur={handleNicknameSubmit}
              onSubmitEditing={handleNicknameSubmit}
              autoFocus
            />
          ) : (
            <TouchableOpacity onPress={() => setEditingNickname(true)} style={styles.row}>
              <Text style={styles.nickname}>{profile.nickname}</Text>
              <Ionicons name="pencil" size={16} color={theme.colors.textSecondary} style={styles.editIcon} />
            </TouchableOpacity>
          )}

          {editingStatus ? (
            <TextInput
              style={styles.statusInput}
              value={statusInput}
              onChangeText={setStatusInput}
              onBlur={handleStatusSubmit}
              onSubmitEditing={handleStatusSubmit}
              placeholder="상태 메시지를 입력하세요"
              placeholderTextColor={theme.colors.textMuted}
              autoFocus
            />
          ) : (
            <TouchableOpacity onPress={() => setEditingStatus(true)} style={styles.row}>
              <Text style={styles.statusMessage}>
                {profile.statusMessage || '상태 메시지가 없습니다.'}
              </Text>
              <Ionicons name="pencil" size={14} color={theme.colors.textSecondary} style={styles.editIcon} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Streak & Tier Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>나의 모음 기록장</Text>
        
        <View style={styles.streakCard}>
          <View style={styles.streakRow}>
            <View style={styles.streakInfo}>
              <Text style={styles.streakTitle}>현재 연속 답변</Text>
              <Text style={styles.streakCount}>🔥 {streakCount}일</Text>
            </View>
            
            <View style={styles.tierInfo}>
              <Text style={styles.tierTitle}>현재 등급</Text>
              <Text style={[styles.tierLabel, { color: tierInfo.isGradient && tierInfo.gradientColors ? tierInfo.gradientColors[0] : (tierInfo.color || theme.colors.textSecondary) }]}>
                {tierInfo.label}
              </Text>
            </View>
          </View>
          
          <View style={styles.nextTierContainer}>
            {tierInfo.tier === 'DAWN' ? (
              <Text style={styles.nextTierText}>최고 등급 달성! 🎉</Text>
            ) : (
              <Text style={styles.nextTierText}>
                다음 등급 '{tierInfo.nextTierLabel}'까지 {tierInfo.nextTierDays}일 남았어요!
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>설정</Text>
        
        <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/notification-settings')}>
          <View style={styles.settingRow}>
            <Ionicons name="notifications-outline" size={24} color={theme.colors.textPrimary} />
            <Text style={styles.settingText}>앱 알림 설정</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/notices')}>
          <View style={styles.settingRow}>
            <Ionicons name="megaphone-outline" size={24} color={theme.colors.textPrimary} />
            <Text style={styles.settingText}>공지사항</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/support')}>
          <View style={styles.settingRow}>
            <Ionicons name="help-circle-outline" size={24} color={theme.colors.textPrimary} />
            <Text style={styles.settingText}>고객센터</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

          <TouchableOpacity style={[styles.settingItem, styles.logoutItem]} onPress={handleLogout}>
            <View style={styles.settingRow}>
              <Ionicons name="log-out-outline" size={24} color={theme.colors.error} />
              <Text style={[styles.settingText, { color: theme.colors.error }]}>로그아웃</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  profileSection: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  uploadingOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: 100,
  },
  editIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.accent,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  infoContainer: {
    alignItems: 'center',
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  nickname: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  nicknameInput: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.accent,
    minWidth: 120,
    paddingVertical: 4,
  },
  statusMessage: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  statusInput: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.accent,
    minWidth: 200,
    marginTop: 4,
    paddingVertical: 4,
  },
  editIcon: {
    marginLeft: 8,
  },
  section: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  streakCard: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    borderRadius: theme.border.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  streakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  streakInfo: {
    alignItems: 'flex-start',
  },
  streakTitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  streakCount: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 4,
  },
  tierInfo: {
    alignItems: 'flex-end',
  },
  tierTitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  tierLabel: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  nextTierContainer: {
    backgroundColor: theme.colors.background,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextTierText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    marginLeft: 12,
  },
  logoutItem: {
    borderBottomWidth: 0,
    marginTop: 8,
  },
});
