import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../constants/theme';
import { Group, leaveGroup, updateGroupName, regenerateInviteCode, getGroupMembers } from '../lib/group';
import { useAuth } from '../contexts/AuthContext';
import { useGroups } from '../contexts/GroupContext';
import CrownBadge from './CrownBadge';
import { Avatar } from './Avatar';
import { UserProfile } from '../types';
import { getNickColor } from '../constants/shopItems';
import { TierBadge } from './TierBadge';

interface GroupCardProps {
  group: Group;
  onPress?: () => void;
}

export default function GroupCard({ group, onPress }: GroupCardProps) {
  const { user } = useAuth();
  const { setSelectedGroupId } = useGroups();
  const [isCopied, setIsCopied] = useState(false);
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [isWebSettingsModalVisible, setIsWebSettingsModalVisible] = useState(false);
  const [isMembersModalVisible, setIsMembersModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState(group.name);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  const copyInviteCode = async () => {
    await Clipboard.setStringAsync(group.inviteCode);
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 1500);
  };

  const handleSettingsPress = (e: any) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    console.log('설정 버튼 탭됨 - 그룹:', group.name);
    
    if (!user) return;

    if (Platform.OS === 'web') {
      setIsWebSettingsModalVisible(true);
      return;
    }
    
    const isCreator = group.createdBy === user.uid;
    const options = [
      {
        text: '그룹명 변경',
        onPress: () => {
          setNewGroupName(group.name);
          setIsRenameModalVisible(true);
        },
      },
    ];

    if (isCreator) {
      options.push({
        text: '초대코드 재생성',
        onPress: () => {
          Alert.alert(
            '초대코드 재생성',
            '기존 초대코드는 더 이상 사용할 수 없게 됩니다. 계속하시겠습니까?',
            [
              { text: '취소', style: 'cancel' },
              {
                text: '재생성',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await regenerateInviteCode(group.id);
                    Alert.alert('완료', '초대코드가 성공적으로 재생성되었습니다.');
                  } catch (error) {
                    Alert.alert('오류', '초대코드 재생성 중 문제가 발생했습니다.');
                  }
                },
              },
            ]
          );
        },
      });
    }

    const leaveOrDeleteTitle = isCreator ? '그룹 삭제' : '그룹 나가기';
    const leaveOrDeleteMessage = isCreator
      ? `그룹장이 나가면 그룹이 삭제됩니다.\n현재 멤버 ${group.memberCount}명도 함께 퇴장됩니다.\n정말 삭제하시겠어요?`
      : '정말 이 그룹에서 나가시겠어요?\n나간 후에는 초대코드로 다시 입장할 수 있어요.';
    const leaveOrDeleteActionText = isCreator ? '삭제' : '나가기';

    options.push({
      text: leaveOrDeleteTitle,
      onPress: () => {
        Alert.alert(
          leaveOrDeleteTitle,
          leaveOrDeleteMessage,
          [
            { text: '취소', style: 'cancel' },
            {
              text: leaveOrDeleteActionText,
              style: 'destructive',
              onPress: async () => {
                try {
                  await leaveGroup(group.id, user.uid);
                  setSelectedGroupId(null);
                } catch (error) {
                  Alert.alert('오류', '작업 중 문제가 발생했습니다.');
                }
              },
            },
          ]
        );
      },
    });

    options.push({ text: '취소', onPress: () => {} });

    Alert.alert('그룹 설정', '원하시는 작업을 선택하세요.', options);
  };

  const handleRenameSubmit = async () => {
    if (!newGroupName.trim()) {
      Alert.alert('알림', '그룹명을 입력해주세요.');
      return;
    }

    try {
      await updateGroupName(group.id, newGroupName.trim());
      setIsRenameModalVisible(false);
    } catch (error) {
      Alert.alert('오류', '그룹명 변경 중 문제가 발생했습니다.');
    }
  };

  const handleCardPress = async () => {
    console.log('그룹 카드 클릭됨:', group.name);
    
    if (onPress) {
      onPress();
      return;
    }
    
    setIsMembersModalVisible(true);
    setIsLoadingMembers(true);
    try {
      const groupMembers = await getGroupMembers(group.id);
      setMembers(groupMembers);
    } catch (error) {
      console.error('Failed to load group members:', error);
      Alert.alert('오류', '멤버 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoadingMembers(false);
    }
  };

  return (
    <Pressable 
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]} 
      onPress={handleCardPress}
    >
      <View style={styles.topContainer}>
        <View style={styles.imageWrapper}>
          <LinearGradient
            colors={theme.gradients.soft}
            style={[
              styles.imageContainer,
              group.createdBy === user?.uid && styles.creatorImageContainer
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {group.thumbnailImage ? (
              <View style={styles.placeholderImage} /> // 향후 Image 컴포넌트로 교체
            ) : (
              <Ionicons name="people" size={28} color={theme.colors.textPrimary} />
            )}
          </LinearGradient>
          {group.createdBy === user?.uid && (
            <View style={styles.crownBadgeWrapper}>
              <CrownBadge size={22} />
            </View>
          )}
        </View>
        <View style={styles.infoContainer}>
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {group.name}
            </Text>
          </View>
          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Ionicons name="person" size={14} color={theme.colors.textSecondary} />
              <Text style={styles.statText}>{group.memberCount}명</Text>
            </View>
          </View>
        </View>
        <Pressable style={styles.settingsButton} onPress={handleSettingsPress} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <Ionicons name="settings-outline" size={20} color={theme.colors.textMuted} />
        </Pressable>
      </View>
      <View style={styles.bottomContainer}>
        <Text style={styles.inviteCodeText}>초대코드: {group.inviteCode}</Text>
        <TouchableOpacity style={styles.copyTextButton} onPress={copyInviteCode}>
          <Ionicons 
            name={isCopied ? "checkmark" : "copy-outline"} 
            size={18} 
            color={isCopied ? theme.colors.accent : theme.colors.textSecondary} 
          />
        </TouchableOpacity>
      </View>

      <Modal
        visible={isMembersModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsMembersModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.membersModalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsMembersModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.membersModalContent}>
            <View style={styles.dragHandle} />
            <Text style={styles.membersModalTitle}>{group.name} 멤버 {group.memberCount}명</Text>
            
            {isLoadingMembers ? (
              <Text style={styles.loadingText}>멤버 정보를 불러오는 중...</Text>
            ) : (
              <View style={styles.membersList}>
                {members.map(member => (
                  <View key={member.id} style={styles.memberItem}>
                    <Avatar 
                      profileImage={member.profileImage} 
                      nickname={member.nickname} 
                      size={40} 
                      streakCount={member.streakCount || 0}
                    />
                    <View style={styles.memberInfo}>
                      <Text style={[
                        styles.memberName,
                        member.equippedNickEffect
                          ? { color: getNickColor(member.equippedNickEffect) ?? undefined }
                          : null,
                      ]}>{member.nickname}</Text>
                      <TierBadge streakCount={member.streakCount} size="sm" />
                      {member.id === group.createdBy && (
                        <View style={styles.memberCrownBadge}>
                          <CrownBadge size={18} />
                        </View>
                      )}
                      {member.id === user?.uid && (
                        <Text style={styles.memberMeText}>(나)</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={isRenameModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsRenameModalVisible(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>그룹명 변경</Text>
            <TextInput
              style={styles.modalInput}
              value={newGroupName}
              onChangeText={setNewGroupName}
              placeholder="새로운 그룹명을 입력하세요"
              placeholderTextColor={theme.colors.textMuted}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel]} 
                onPress={() => setIsRenameModalVisible(false)}
              >
                <Text style={styles.modalButtonTextCancel}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonConfirm]} 
                onPress={handleRenameSubmit}
              >
                <Text style={styles.modalButtonTextConfirm}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 웹 환경을 위한 설정 모달 (액션 시트 대용) */}
      <Modal
        visible={isWebSettingsModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsWebSettingsModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsWebSettingsModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <Text style={styles.modalTitle}>그룹 설정</Text>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                setIsWebSettingsModalVisible(false);
                setNewGroupName(group.name);
                setIsRenameModalVisible(true);
              }}
            >
              <Text style={styles.actionButtonText}>그룹명 변경</Text>
            </TouchableOpacity>

            {group.createdBy === user?.uid && (
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={async () => {
                  setIsWebSettingsModalVisible(false);
                  if (window.confirm('기존 초대코드는 더 이상 사용할 수 없게 됩니다. 계속하시겠습니까?')) {
                    try {
                      await regenerateInviteCode(group.id);
                      window.alert('초대코드가 성공적으로 재생성되었습니다.');
                    } catch (error) {
                      window.alert('초대코드 재생성 중 문제가 발생했습니다.');
                    }
                  }
                }}
              >
                <Text style={[styles.actionButtonText, styles.destructiveText]}>초대코드 재생성</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={async () => {
                setIsWebSettingsModalVisible(false);
                const isCreator = group.createdBy === user?.uid;
                const confirmMessage = isCreator
                  ? `그룹장이 나가면 그룹이 삭제됩니다.\n현재 멤버 ${group.memberCount}명도 함께 퇴장됩니다.\n정말 삭제하시겠어요?`
                  : '정말 이 그룹에서 나가시겠어요?\n나간 후에는 초대코드로 다시 입장할 수 있어요.';
                
                if (window.confirm(confirmMessage)) {
                  try {
                    await leaveGroup(group.id, user?.uid || '');
                    setSelectedGroupId(null);
                  } catch (error) {
                    window.alert('작업 중 문제가 발생했습니다.');
                  }
                }
              }}
            >
              <Text style={[styles.actionButtonText, styles.destructiveText]}>
                {group.createdBy === user?.uid ? '그룹 삭제' : '그룹 나가기'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => setIsWebSettingsModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  topContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  imageWrapper: {
    marginRight: 16,
    position: 'relative',
  },
  imageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatorImageContainer: {
    borderWidth: 2.5,
    borderColor: theme.colors.accent,
    padding: 2,
  },
  crownBadgeWrapper: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    zIndex: 1,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    flexShrink: 1,
    ...theme.typography.koreanText,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  statText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  bottomContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  inviteCodeText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  copyTextButton: {
    marginLeft: 8,
    padding: 4,
  },
  settingsButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: theme.colors.background,
    color: theme.colors.textPrimary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalButtonCancel: {
    backgroundColor: 'transparent',
  },
  modalButtonConfirm: {
    backgroundColor: theme.colors.accent,
  },
  modalButtonTextCancel: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextConfirm: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  destructiveText: {
    color: theme.colors.error || '#FF3B30',
  },
  cancelButton: {
    borderBottomWidth: 0,
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  membersModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  membersModalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    height: '60%',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  membersModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  loadingText: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 20,
  },
  membersList: {
    flex: 1,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  memberName: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  memberCrownBadge: {
    marginLeft: 6,
  },
  memberMeText: {
    marginLeft: 6,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
});
