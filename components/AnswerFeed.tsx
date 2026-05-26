import React from 'react';
import { View, FlatList, StyleSheet, Text, TouchableOpacity, Image } from 'react-native';
import { Answer } from '../types';
import { toggleReaction, deleteAnswer } from '../lib/answer';
import { theme } from '../constants/theme';

interface AnswerFeedProps {
  answers: Answer[];
  currentUserId: string;
}

const EMOJIS = ['❤️', '🔥', '😂', '👀'];

export const AnswerFeed: React.FC<AnswerFeedProps> = ({ answers, currentUserId }) => {
  const myAnswer = answers.find(a => a.userId === currentUserId);
  const otherAnswers = answers.filter(a => a.userId !== currentUserId);

  const handleReaction = async (answerId: string, emoji: string, hasReacted: boolean) => {
    try {
      await toggleReaction(answerId, currentUserId, emoji, !hasReacted);
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  };

  const handleDelete = async (answerId: string) => {
    try {
      // TODO: Add confirmation dialog in real app
      await deleteAnswer(answerId);
    } catch (error) {
      console.error('Error deleting answer:', error);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const renderReactionButtons = (answer: Answer) => {
    return (
      <View style={styles.reactionContainer}>
        {EMOJIS.map(emoji => {
          const reactions = answer.reactions?.[emoji] || [];
          const hasReacted = reactions.includes(currentUserId);
          const count = reactions.length;

          return (
            <TouchableOpacity
              key={emoji}
              style={[styles.reactionButton, hasReacted && styles.reactionButtonActive]}
              onPress={() => handleReaction(answer.id, emoji, hasReacted)}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
              {count > 0 && (
                <Text style={[styles.reactionCount, hasReacted && styles.reactionCountActive]}>
                  {count}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderItem = ({ item }: { item: Answer }) => {
    const isMe = item.userId === currentUserId;
    
    return (
      <View style={[styles.card, isMe && styles.myCard]}>
        <View style={styles.header}>
          <View style={styles.userInfo}>
            {item.userProfile?.profileImage ? (
              <Image source={{ uri: item.userProfile.profileImage }} style={styles.avatar} />
            ) : (
              <View style={styles.defaultAvatar} />
            )}
            <View>
              <Text style={styles.nickname}>{item.userProfile?.nickname || '익명'}</Text>
              <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
            </View>
          </View>
          
          {isMe && (
            <View style={styles.actionButtons}>
              <TouchableOpacity onPress={() => {/* TODO: Implement edit */}}>
                <Text style={styles.actionText}>수정</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id)}>
                <Text style={[styles.actionText, styles.deleteText]}>삭제</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        <Text style={styles.content}>{item.content}</Text>
        
        {renderReactionButtons(item)}
      </View>
    );
  };

  return (
    <FlatList
      data={myAnswer ? [myAnswer, ...otherAnswers] : otherAnswers}
      renderItem={renderItem}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
    />
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  defaultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.gray[200],
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
  },
  reactionContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  reactionButtonActive: {
    backgroundColor: theme.colors.accentSoft + '30', // 30 is hex opacity
    borderColor: theme.colors.accentSoft,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 6,
    fontWeight: '600',
  },
  reactionCountActive: {
    color: theme.colors.accent,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  deleteText: {
    color: theme.colors.error,
  },
});
