import React, { useState, useEffect, useCallback } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard, Modal, TouchableWithoutFeedback } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { theme } from '../constants/theme';
import { toggleReaction, updateAnswer } from '../lib/answer';
import { Avatar } from './Avatar';
import { Ionicons } from '@expo/vector-icons';
import { Answer, Comment } from '../types';
import { addComment, getComments } from '../lib/comment';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AnswerFeedProps {
  answers: Answer[];
  currentUserId: string;
  isReadOnly?: boolean;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
}

const EMOJIS = ['❤️', '🥹', '😂', '👏'];

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const AnimatedReactionButton = ({ emoji, count, hasReacted, onPress }: { emoji: string, count: number, hasReacted: boolean, onPress: () => void }) => {
  const scale = useSharedValue(1);

  const handlePress = () => {
    const springConfig = { damping: 15, stiffness: 200, mass: 0.8 };
    if (hasReacted) {
      scale.value = withSequence(
        withSpring(1.1, springConfig),
        withSpring(0.95, springConfig),
        withSpring(1, springConfig)
      );
    } else {
      scale.value = withSequence(
        withSpring(1.15, springConfig),
        withSpring(1, springConfig)
      );
    }
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedTouchableOpacity
      style={[styles.reactionButton, hasReacted && styles.reactionButtonActive, animatedStyle]}
      onPress={handlePress}
    >
      <Text style={styles.reactionEmoji}>{emoji}</Text>
      {count > 0 && (
        <Text style={[styles.reactionCount, hasReacted && styles.reactionCountActive]}>
          {count}
        </Text>
      )}
    </AnimatedTouchableOpacity>
  );
};

const AnimatedCard = React.memo(({ 
  item, 
  index,
  currentUserId,
  isEditing,
  editContent,
  isUpdating,
  setEditContent,
  setIsEditing,
  setIsUpdating,
  renderReactionButtons,
  formatTime,
  isReadOnly
}: any) => {
  const isMe = item.userId === currentUserId;
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);

  useEffect(() => {
    const delay = index * 100;
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 400 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
  
  if (isMe && isEditing) {
    const maxLength = 200;
    const currentLength = editContent.length;
    const isValidLength = currentLength >= 1 && currentLength <= maxLength;
    const progressColor = isValidLength ? theme.colors.success : theme.colors.error;
    const progressWidth = `${Math.min((currentLength / maxLength) * 100, 100)}%`;

    const handleSave = async () => {
      if (!isValidLength || isUpdating) return;
      setIsUpdating(true);
      try {
        await updateAnswer(item.id, editContent);
        setIsEditing(false);
      } catch (error) {
        console.error('Error updating answer:', error);
      } finally {
        setIsUpdating(false);
      }
    };

    return (
      <Animated.View style={[styles.card, styles.myCard, animatedStyle]}>
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
            <Avatar 
              profileImage={item.userProfile?.profileImage || item.profileImage} 
              nickname={item.userProfile?.nickname || item.nickname || '알 수 없음'}
              size={36}
              streakCount={item.userProfile?.streakCount ?? item.streakCount ?? 0}
            />
          </View>
            <View>
              <Text style={styles.nickname}>{item.nickname || item.userProfile?.nickname || '익명'}</Text>
              <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity 
              onPress={() => setIsEditing(false)}
              disabled={isUpdating}
            >
              <Ionicons name="close-circle" size={24} color={theme.colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleSave}
              disabled={!isValidLength || isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color={theme.colors.accent} />
              ) : (
                <Ionicons 
                  name="checkmark-circle" 
                  size={24} 
                  color={isValidLength ? theme.colors.accent : theme.colors.gray[300]} 
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.editInputContainer}>
          <TextInput
            style={styles.editInput}
            multiline
            value={editContent}
            onChangeText={setEditContent}
            maxLength={maxLength}
            textAlignVertical="top"
            autoFocus
            placeholderTextColor={theme.colors.textMuted}
          />
          
          <View style={styles.editFooter}>
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBackground}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { width: progressWidth as any, backgroundColor: progressColor }
                  ]} 
                />
              </View>
              <Text style={[styles.lengthText, { color: progressColor }]}>
                {currentLength} / {maxLength}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.card, isMe && styles.myCard, animatedStyle]}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            <Avatar 
              profileImage={item.profileImage || item.userProfile?.profileImage} 
              nickname={item.nickname || item.userProfile?.nickname}
              streakCount={item.userProfile?.streakCount ?? item.streakCount ?? 0}
              size={40} 
            />
          </View>
          <View>
            <Text style={styles.nickname}>{item.nickname || item.userProfile?.nickname || '익명'}</Text>
            <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
          </View>
        </View>
        
        {isMe && !isReadOnly && (
          <View style={styles.actionButtons}>
            <TouchableOpacity onPress={() => {
              setEditContent(item.content);
              setIsEditing(true);
            }}>
              <Ionicons name="pencil-outline" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      <Text style={styles.content}>{item.content}</Text>
      
      {renderReactionButtons(item)}
    </Animated.View>
  );
});

const CommentCount = ({ answerId }: { answerId: string }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const unsubscribe = getComments(answerId, (comments) => {
      setCount(comments.length);
    });
    return () => unsubscribe();
  }, [answerId]);

  return <Text style={[styles.reactionCount, { marginLeft: 6 }]}>{count}</Text>;
};

export const AnswerFeed: React.FC<AnswerFeedProps> = ({ 
  answers, 
  currentUserId, 
  isReadOnly = false,
  ListHeaderComponent
}) => {
  const insets = useSafeAreaInsets();
  const myAnswer = answers.find(a => a.userId === currentUserId);
  const otherAnswers = answers.filter(a => a.userId !== currentUserId);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Modal 상태
  const [activeAnswerId, setActiveAnswerId] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // 현재 열려있는 댓글 리스트 구독
  useEffect(() => {
    if (!activeAnswerId) {
      setComments([]);
      return;
    }
    const unsubscribe = getComments(activeAnswerId, (fetchedComments) => {
      setComments(fetchedComments);
    });
    return () => unsubscribe();
  }, [activeAnswerId]);

  const handleOpenComments = useCallback((answerId: string) => {
    setActiveAnswerId(answerId);
    setIsModalVisible(true);
  }, []);

  const handleCloseComments = useCallback(() => {
    Keyboard.dismiss();
    setIsModalVisible(false);
    setActiveAnswerId(null);
    setCommentText('');
  }, []);

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !activeAnswerId || isSubmittingComment) return;
    setIsSubmittingComment(true);
    try {
      // 내 프로필 정보 가져오기 (answers에서 찾거나 DB에서)
      let nickname = '익명';
      let profileImage = null;
      if (myAnswer?.userProfile) {
        nickname = myAnswer.userProfile.nickname;
        profileImage = myAnswer.userProfile.profileImage;
      } else {
        const userDoc = await getDoc(doc(db, 'users', currentUserId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          nickname = userData.nickname || '익명';
          profileImage = userData.profileImage;
        }
      }
      
      await addComment(activeAnswerId, currentUserId, commentText.trim(), nickname, profileImage || undefined);
      setCommentText('');
      Keyboard.dismiss();
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleReaction = async (answerId: string, emoji: string, hasReacted: boolean) => {
    try {
      await toggleReaction(answerId, currentUserId, emoji, !hasReacted);
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const renderReactionButtons = useCallback((answer: Answer) => {
    return (
      <View style={styles.bottomActionsContainer}>
        <View style={styles.reactionContainer}>
          {EMOJIS.map(emoji => {
            const reactions = answer.reactions?.[emoji] || [];
            const hasReacted = reactions.includes(currentUserId);
            const count = reactions.length;

            return (
              <AnimatedReactionButton
                key={emoji}
                emoji={emoji}
                count={count}
                hasReacted={hasReacted}
                onPress={() => handleReaction(answer.id, emoji, hasReacted)}
              />
            );
          })}
        </View>
        
        <TouchableOpacity
          style={styles.commentButton}
          onPress={() => handleOpenComments(answer.id)}
        >
          <Text style={styles.reactionEmoji}>💬</Text>
          <CommentCount answerId={answer.id} />
        </TouchableOpacity>
      </View>
    );
  }, [currentUserId, handleOpenComments]);

  const renderItem = useCallback(({ item, index }: { item: Answer, index: number }) => (
    <AnimatedCard 
      item={item} 
      index={index}
      currentUserId={currentUserId}
      isEditing={isEditing}
      editContent={editContent}
      isUpdating={isUpdating}
      setEditContent={setEditContent}
      setIsEditing={setIsEditing}
      setIsUpdating={setIsUpdating}
      renderReactionButtons={renderReactionButtons}
      formatTime={formatTime}
      isReadOnly={isReadOnly}
    />
  ), [currentUserId, isEditing, editContent, isUpdating, renderReactionButtons, isReadOnly]);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={myAnswer ? [myAnswer, ...otherAnswers] : otherAnswers}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ListHeaderComponent}
      />
      
      {/* 댓글 모달 */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseComments}
        statusBarTranslucent={true}
      >
        <View style={styles.modalContainer}>
          {/* 반투명 배경 (터치 시 닫힘) */}
          <TouchableWithoutFeedback onPress={handleCloseComments}>
            <View style={styles.modalOverlay} />
          </TouchableWithoutFeedback>
          
          {/* 모달 내용 */}
          <View style={styles.modalContent}>
            {/* 드래그 핸들 (장식용) */}
            <View style={styles.dragHandleContainer}>
              <View style={styles.dragHandle} />
            </View>
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>댓글 {comments.length}개</Text>
              <TouchableOpacity onPress={handleCloseComments} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.commentItem}>
                  <Avatar 
                    profileImage={item.profileImage} 
                    nickname={item.nickname}
                    size={32} 
                  />
                  <View style={styles.commentContentContainer}>
                    <View style={styles.commentHeaderRow}>
                      <Text style={styles.commentNickname}>{item.nickname}</Text>
                      <Text style={styles.commentTime}>{formatTime(item.createdAt)}</Text>
                    </View>
                    <Text style={styles.commentText}>{item.content}</Text>
                  </View>
                </View>
              )}
              contentContainerStyle={styles.commentListContainer}
              ListEmptyComponent={
                <Text style={styles.emptyCommentText}>첫 댓글을 작성해보세요.</Text>
              }
            />

            <View style={[styles.commentInputWrapper, { paddingBottom: insets.bottom + 8 }]}>
              <TextInput
                style={styles.commentInput}
                placeholder="댓글을 입력하세요..."
                placeholderTextColor={theme.colors.textMuted}
                value={commentText}
                onChangeText={setCommentText}
                multiline={false}
                maxLength={300}
              />
              <TouchableOpacity 
                style={[styles.commentSubmitButton, !commentText.trim() && { opacity: 0.5 }]} 
                onPress={handleSubmitComment}
                disabled={!commentText.trim() || isSubmittingComment}
              >
                {isSubmittingComment ? (
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                ) : (
                  <Ionicons name="send" size={20} color={theme.colors.accent} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  myCard: {
    backgroundColor: theme.colors.surfaceLight,
    borderColor: theme.colors.accentSoft,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 12,
  },
  nickname: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  time: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  content: {
    fontSize: 16,
    lineHeight: 26,
    color: theme.colors.textPrimary,
    marginBottom: 20,
    ...theme.typography.koreanText,
  },
  bottomActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
  },
  reactionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: 8,
    overflow: 'hidden',
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 32,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    height: 32,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    marginLeft: 'auto',
  },
  reactionButtonActive: {
    backgroundColor: theme.colors.accent + '30', // 30 is hex opacity
    borderColor: theme.colors.accent,
    borderWidth: 1,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 6,
    fontWeight: '600',
    minWidth: 16,
    textAlign: 'center',
  },
  reactionCountActive: {
    color: theme.colors.accent,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editInputContainer: {
    marginTop: 8,
  },
  editInput: {
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    ...theme.typography.koreanText,
  },
  editFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  progressContainer: {
    flex: 1,
    marginRight: 16,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: theme.colors.gray[200],
    borderRadius: 2,
    marginBottom: 6,
  },
  progressBarFill: {
    height: 4,
    borderRadius: 2,
  },
  lengthText: {
    fontSize: 12,
    textAlign: 'right',
  },
  // 모달 스타일 추가
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '70%',
    display: 'flex',
    flexDirection: 'column',
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  commentListContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  commentContentContainer: {
    marginLeft: 12,
    flex: 1,
  },
  commentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentNickname: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginRight: 8,
  },
  commentTime: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  commentText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    lineHeight: 20,
    ...theme.typography.koreanText,
  },
  emptyCommentText: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    marginTop: 40,
    fontSize: 14,
  },
  commentInputWrapper: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 40,
    maxHeight: 100,
    fontSize: 15,
    color: theme.colors.textPrimary,
    textAlignVertical: 'center',
  },
  commentSubmitButton: {
    marginLeft: 12,
    marginBottom: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});