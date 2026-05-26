import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';

interface AvatarProps {
  profileImage?: string | null;
  nickname?: string | null;
  size?: number;
}

export const Avatar: React.FC<AvatarProps> = ({ profileImage, nickname, size = 40 }) => {
  const defaultText = nickname && nickname.length > 0 ? nickname[0] : '익';

  if (profileImage) {
    return (
      <Image
        source={{ uri: profileImage }}
        style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  return (
    <View
      style={[
        styles.defaultAvatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{defaultText}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    resizeMode: 'cover',
  },
  defaultAvatar: {
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});