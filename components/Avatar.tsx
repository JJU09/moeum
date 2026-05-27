import React from 'react';
import { Image, StyleSheet, Text, View, Platform } from 'react-native';
import { theme } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { getUserTier } from '../lib/badge';

interface AvatarProps {
  profileImage?: string | null;
  nickname?: string | null;
  size?: number;
  streakCount?: number;
}

export const Avatar: React.FC<AvatarProps> = ({ profileImage, nickname, size = 40, streakCount }) => {
  const [imageError, setImageError] = React.useState(false);
  const defaultText = nickname && nickname.trim().length > 0 ? nickname.trim()[0] : '익';

  const streak = streakCount ?? 0;
  const tierInfo = getUserTier(streak);
  
  let glowStyle = {};
  let borderWidth = 0;

  if (tierInfo.tier === 'FIREFLY') {
    borderWidth = 2;
    glowStyle = Platform.OS === 'web' 
      ? { boxShadow: `0 0 12px 4px ${tierInfo.color}` }
      : { shadowColor: tierInfo.color, shadowOffset: { width: 0, height: 0 }, shadowRadius: 6, shadowOpacity: 0.6, elevation: 4 };
  } else if (tierInfo.tier === 'DEW') {
    borderWidth = 2.5;
    glowStyle = Platform.OS === 'web' 
      ? { boxShadow: `0 0 12px 4px ${tierInfo.color}` }
      : { shadowColor: tierInfo.color, shadowOffset: { width: 0, height: 0 }, shadowRadius: 8, shadowOpacity: 0.7, elevation: 6 };
  } else if (tierInfo.tier === 'STARLIGHT') {
    borderWidth = 2.5;
    glowStyle = Platform.OS === 'web' 
      ? { boxShadow: `0 0 12px 4px ${tierInfo.color}` }
      : { shadowColor: tierInfo.color, shadowOffset: { width: 0, height: 0 }, shadowRadius: 10, shadowOpacity: 0.8, elevation: 8 };
  } else if (tierInfo.tier === 'AURORA') {
    borderWidth = 3;
    glowStyle = Platform.OS === 'web' 
      ? { boxShadow: `0 0 12px 4px ${tierInfo.color}` }
      : { shadowColor: tierInfo.color, shadowOffset: { width: 0, height: 0 }, shadowRadius: 12, shadowOpacity: 0.9, elevation: 10 };
  } else if (tierInfo.tier === 'DAWN') {
    borderWidth = 3;
    glowStyle = Platform.OS === 'web' 
      ? { boxShadow: `0 0 12px 4px ${tierInfo.color}` }
      : { shadowColor: tierInfo.color, shadowOffset: { width: 0, height: 0 }, shadowRadius: 16, shadowOpacity: 1, elevation: 12 };
  }

  const renderContent = () => {
    const innerSize = tierInfo.isGradient ? size - borderWidth * 2 : size;

    if (profileImage && profileImage.trim() !== '' && !imageError) {
      return (
        <Image
          source={{ uri: profileImage }}
          style={[styles.avatar, { width: innerSize, height: innerSize, borderRadius: innerSize / 2 }]}
          onError={() => setImageError(true)}
        />
      );
    }

    return (
      <View
        style={[
          styles.defaultAvatar,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
          },
        ]}
      >
        <Text style={[styles.avatarText, { fontSize: innerSize * 0.4 }]}>{defaultText}</Text>
      </View>
    );
  };

  if (tierInfo.isGradient && tierInfo.gradientColors) {
    return (
      <LinearGradient
        colors={tierInfo.gradientColors}
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            padding: borderWidth,
            justifyContent: 'center',
            alignItems: 'center',
          },
          glowStyle,
        ]}
      >
        {renderContent()}
      </LinearGradient>
    );
  }

  const hasBorder = tierInfo.color !== 'transparent' && tierInfo.tier !== 'NONE';
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: hasBorder ? borderWidth : 0,
          borderColor: hasBorder ? tierInfo.color : 'transparent',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
        },
        hasBorder ? glowStyle : {},
      ]}
    >
      {renderContent()}
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