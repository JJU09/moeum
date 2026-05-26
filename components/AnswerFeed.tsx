import React, { useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View, TextInput, ActivityIndicator } from 'react-native';
import { theme } from '../constants/theme';
import { toggleReaction, updateAnswer } from '../lib/answer';
import { Avatar } from './Avatar';
import { Ionicons } from '@expo/vector-icons';
import { Answer } from '../types';

interface AnswerFeedProps {
  answers: Answer[];
  currentUserId: string;
}

const EMOJIS = ['❤️', '🔥', '😂', '👀'];

export const AnswerFeed: React.FC<AnswerFeedProps> = ({ answers, currentUserId }) => {
  const myAnswer = answers.find(a => a.userId === currentUserId);
  const otherAnswers = answers.filter(a => a.userId !== currentUserId);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

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
        <View style={[styles.card, styles.myCard]}>
          <View style={styles.header}>
            <View style={styles.userInfo}>
              <View style={styles.avatarContainer}>
                <Avatar 
                  profileImage={item.profileImage || item.userProfile?.profileImage} 
                  nickname={item.nickname || item.userProfile?.nickname}
                  size={40} 
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
        </View>
      );
    }

    return (
      <View style={[styles.card, isMe && styles.myCard]}>
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              <Avatar 
                profileImage={item.profileImage || item.userProfile?.profileImage} 
                nickname={item.nickname || item.userProfile?.nickname}
                size={40} 
              />
            </View>
            <View>
              <Text style={styles.nickname}>{item.nickname || item.userProfile?.nickname || '익명'}</Text>
              <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
            </View>
          </View>
          
          {isMe && (
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
});
