import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useGroups } from '../../contexts/GroupContext';
import { Group, createGroup, joinGroupWithCode } from '../../lib/group';
import GroupCard from '../../components/GroupCard';

export default function GroupScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { groups, loadingGroups, setSelectedGroupId } = useGroups();
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  
  const [newGroupName, setNewGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      Alert.alert('알림', '그룹명을 입력해주세요.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const newGroupId = await createGroup(newGroupName.trim(), user!.uid);
      
      // 1. 제출 상태 해제
      setIsSubmitting(false);
      // 2. 모달 닫기
      setCreateModalVisible(false);
      // 3. 입력값 초기화
      setNewGroupName('');
      // 4. 새 그룹 선택
      setSelectedGroupId(newGroupId);
      
      // 5. 모달 닫힘 애니메이션 후 라우팅을 위해 setTimeout 사용
      setTimeout(() => {
        Alert.alert('성공', '그룹이 생성되었습니다.', [
          {
            text: '확인',
            onPress: () => {
              router.push('/(tabs)');
            }
          }
        ]);
      }, 300);
    } catch (error) {
      console.error('Group create error:', error);
      setIsSubmitting(false);
      Alert.alert('오류', '그룹 생성에 실패했습니다.');
    }
  };

  const handleJoinGroup = async () => {
    if (inviteCode.trim().length !== 6) {
      Alert.alert('알림', '6자리 초대 코드를 입력해주세요.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const joinedGroupId = await joinGroupWithCode(inviteCode.trim(), user!.uid);
      
      // 1. 제출 상태 해제
      setIsSubmitting(false);
      // 2. 모달 닫기
      setJoinModalVisible(false);
      // 3. 입력값 초기화
      setInviteCode('');
      // 4. 참여한 그룹 선택
      setSelectedGroupId(joinedGroupId);
      
      // 5. 모달 닫힘 애니메이션 후 라우팅을 위해 setTimeout 사용
      setTimeout(() => {
        Alert.alert('성공', '그룹에 참여했습니다.', [
          {
            text: '확인',
            onPress: () => {
              router.push('/(tabs)');
            }
          }
        ]);
      }, 300);
    } catch (error: any) {
      console.error('Group join error:', error);
      setIsSubmitting(false);
      Alert.alert('오류', error.message || '그룹 참여에 실패했습니다.');
    }
  };

  if (loadingGroups) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {groups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color={theme.colors.border} />
          <Text style={styles.emptyText}>아직 속한 그룹이 없습니다.</Text>
          <Text style={styles.emptySubText}>새로운 그룹을 만들거나 초대 코드로 참여해보세요!</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <GroupCard group={item} onPress={() => {/* 그룹 상세 화면 이동 */}} />}
          contentContainerStyle={styles.listContainer}
        />
      )}

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => setActionModalVisible(true)}
      >
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>

      {/* Action Selection Modal */}
      <Modal
        visible={actionModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActionModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setActionModalVisible(false)}
        >
          <View style={styles.actionMenu}>
            <TouchableOpacity 
              style={styles.actionItem} 
              onPress={() => {
                setActionModalVisible(false);
                setCreateModalVisible(true);
              }}
            >
              <Ionicons name="add-circle-outline" size={24} color={theme.colors.text} />
              <Text style={styles.actionText}>새 그룹 만들기</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity 
              style={styles.actionItem} 
              onPress={() => {
                setActionModalVisible(false);
                setJoinModalVisible(true);
              }}
            >
              <Ionicons name="enter-outline" size={24} color={theme.colors.text} />
              <Text style={styles.actionText}>초대 코드로 입장하기</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Create Group Modal */}
      <Modal
        visible={createModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.inputModal}>
            <Text style={styles.modalTitle}>새 그룹 만들기</Text>
            <TextInput
              style={styles.input}
              placeholder="그룹명 입력"
              value={newGroupName}
              onChangeText={setNewGroupName}
              maxLength={20}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]} 
                onPress={() => setCreateModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.submitButton, isSubmitting && styles.disabledButton]} 
                onPress={handleCreateGroup}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>만들기</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Join Group Modal */}
      <Modal
        visible={joinModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setJoinModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.inputModal}>
            <Text style={styles.modalTitle}>초대 코드로 입장하기</Text>
            <TextInput
              style={styles.input}
              placeholder="6자리 초대 코드 입력"
              value={inviteCode}
              onChangeText={setInviteCode}
              maxLength={6}
              autoCapitalize="characters"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]} 
                onPress={() => setJoinModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.submitButton, isSubmitting && styles.disabledButton]} 
                onPress={handleJoinGroup}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>입장하기</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100, // FAB를 위한 여백
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionMenu: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius,
    width: '80%',
    padding: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  actionText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: 16,
  },
  inputModal: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius,
    width: '85%',
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.border.radius,
    padding: 12,
    fontSize: 16,
    color: theme.colors.textPrimary,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: theme.border.radius,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.surfaceLight,
    marginRight: 8,
  },
  submitButton: {
    backgroundColor: theme.colors.accent,
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  cancelButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});
