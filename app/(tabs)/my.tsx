import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, TextInput, Alert, ScrollView, Switch, Linking, ActivityIndicator } from 'react-native';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { db, auth, storage } from '../../lib/firebase';
import { Avatar } from '../../components/Avatar';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { UserProfile } from '../../types';

export default function MyScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
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
      console.error("Error loading profile:", error);
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
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
        
        const MAX_SIZE = 2 * 1024 * 1024; // 2MB
        if (blob.size > MAX_SIZE) {
          Alert.alert('알림', '이미지 크기가 너무 큽니다. 2MB 이하의 이미지를 선택해주세요.');
          setUploading(false);
          return;
        }
        
        const fileRef = ref(storage, `users/${user.uid}/profile.jpg`);
        await uploadBytes(fileRef, blob);
        
        const downloadUrl = await getDownloadURL(fileRef);
        await updateProfile('profileImage', downloadUrl);
      } catch (error) {
        console.error("Error uploading image:", error);
        Alert.alert('오류', '프로필 이미지 업로드에 실패했습니다.');
      } finally {
        setUploading(false);
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
      console.error(`Error updating ${field}:`, error);
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
    Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => signOut(auth) },
    ]);
  };

  if (!profile) {
    return <View style={styles.container}><Text>Loading...</Text></View>;
  }

  const badges = profile.badges || [];
  const streakCount = profile.streakCount || 0;

  return (
    <ScrollView style={styles.container}>
      {/* Profile Section */}
      <View style={styles.profileSection}>
        <TouchableOpacity onPress={pickImage} disabled={uploading}>
          <View style={styles.imageContainer}>
            <Avatar 
              profileImage={profile.profileImage} 
              nickname={profile.nickname}
              size={100} 
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

      {/* Streak & Badges Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>나의 모음 기록장</Text>
        
        <View style={styles.streakContainer}>
          <Text style={styles.streakTitle}>현재 연속 답변</Text>
          <Text style={styles.streakCount}>🔥 {streakCount}일</Text>
        </View>

        <View style={styles.badgesContainer}>
          <View style={styles.badgeItem}>
            <View style={[styles.badgeIcon, !badges.includes('early_bird') && styles.badgeDisabled]}>
              <Text style={styles.badgeEmoji}>🌅</Text>
            </View>
            <Text style={styles.badgeName}>얼리버드</Text>
          </View>
          <View style={styles.badgeItem}>
            <View style={[styles.badgeIcon, !badges.includes('streak_7') && styles.badgeDisabled]}>
              <Text style={styles.badgeEmoji}>📅</Text>
            </View>
            <Text style={styles.badgeName}>7일 연속</Text>
          </View>
          <View style={styles.badgeItem}>
            <View style={[styles.badgeIcon, !badges.includes('streak_30') && styles.badgeDisabled]}>
              <Text style={styles.badgeEmoji}>👑</Text>
            </View>
            <Text style={styles.badgeName}>30일 연속</Text>
          </View>
        </View>
      </View>

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>설정</Text>
        
        <TouchableOpacity style={styles.settingItem} onPress={() => Linking.openSettings()}>
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
  streakContainer: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: theme.border.radius,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  streakTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  streakCount: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  badgesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  badgeItem: {
    alignItems: 'center',
  },
  badgeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  badgeDisabled: {
    opacity: 0.3,
    backgroundColor: theme.colors.surfaceLight,
  },
  badgeEmoji: {
    fontSize: 32,
  },
  badgeName: {
    fontSize: 12,
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
