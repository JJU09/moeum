import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../constants/theme';
import { Group } from '../lib/group';

interface GroupCardProps {
  group: Group;
  onPress?: () => void;
}

export default function GroupCard({ group, onPress }: GroupCardProps) {
  const copyInviteCode = async () => {
    await Clipboard.setStringAsync(group.inviteCode);
    Alert.alert('알림', '초대 코드가 클립보드에 복사되었습니다.');
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={theme.gradients.soft}
        style={styles.imageContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {group.thumbnailImage ? (
          <View style={styles.placeholderImage} /> // 향후 Image 컴포넌트로 교체
        ) : (
          <Ionicons name="people" size={28} color={theme.colors.textPrimary} />
        )}
      </LinearGradient>
      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {group.name}
        </Text>
        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Ionicons name="person" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.statText}>{group.memberCount}명</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="checkmark-circle" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.statText}>-명 완료</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity style={styles.copyButton} onPress={copyInviteCode}>
        <Ionicons name="copy-outline" size={20} color={theme.colors.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  imageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
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
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
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
  copyButton: {
    padding: 8,
  },
});