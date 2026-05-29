import React from 'react';
import { Image, StyleSheet, Text, View, Platform, Animated, Easing } from 'react-native';
import { theme } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { getUserTier } from '../lib/badge';
import { getAvatarBorderColors } from '../constants/shopItems';
import { TIER_ACHIEVEMENT_MAP } from '../constants/achievements';

interface AvatarProps {
  profileImage?: string | null;
  nickname?: string | null;
  size?: number;
  streakCount?: number;
  /** 상점에서 구매한 커스텀 글로우 테두리 아이템 ID */
  equippedBorder?: string | null;
}

export const Avatar: React.FC<AvatarProps> = ({
  profileImage,
  nickname,
  size = 40,
  streakCount,
  equippedBorder,
}) => {
  const [imageError, setImageError] = React.useState(false);
  const defaultText = nickname && nickname.trim().length > 0 ? nickname.trim()[0] : '익';

  // 커스텀 테두리가 있으면 등급 글로우 대신 커스텀 색상 사용
  const customBorderColors = equippedBorder ? getAvatarBorderColors(equippedBorder) : null;

  // 업적 테두리 여부 — achievements 카탈로그에서 animated 플래그 확인
  const isAnimatedBorder = equippedBorder ? (TIER_ACHIEVEMENT_MAP[equippedBorder]?.animated ?? false) : false;

  // 펄스 애니메이션 (업적 테두리 전용)
  const pulseAnim = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (!isAnimatedBorder) { pulseAnim.setValue(0); return; }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [isAnimatedBorder, pulseAnim]);
  const pulseScale   = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1.0, 1.06] });
  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1.0] });

  const streak = streakCount ?? 0;
  const tierInfo = getUserTier(streak);

  let glowStyle = {};
  let borderWidth = 0;

  if (customBorderColors) {
    // 커스텀 테두리 오버라이드 (등급 무관)
    borderWidth = 2.5;
    const glowColor = customBorderColors[0];
    glowStyle = Platform.OS === 'web'
      ? { boxShadow: `0 0 12px 4px ${glowColor}` }
      : { shadowColor: glowColor, shadowOffset: { width: 0, height: 0 }, shadowRadius: 10, shadowOpacity: 0.85, elevation: 8 };
  } else if (tierInfo.tier === 'FIREFLY') {
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
    // 커스텀 테두리는 항상 그라데이션 래퍼 사용
    const usesGradientWrapper = customBorderColors != null || tierInfo.isGradient;
    const innerSize = usesGradientWrapper ? size - borderWidth * 2 : size;

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

  // 커스텀 테두리: 그라데이션 래퍼로 렌더링
  if (customBorderColors) {
    const borderEl = (
      <LinearGradient
        colors={customBorderColors as [string, string]}
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

    // 업적 테두리: 펄스 scale+opacity 래퍼 추가
    if (isAnimatedBorder) {
      return (
        <Animated.View style={{ transform: [{ scale: pulseScale }], opacity: pulseOpacity }}>
          {borderEl}
        </Animated.View>
      );
    }
    return borderEl;
  }

  if (tierInfo.isGradient && tierInfo.gradientColors) {
    return (
      <LinearGradient
        colors={tierInfo.gradientColors as unknown as readonly [string, string, ...string[]]}
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