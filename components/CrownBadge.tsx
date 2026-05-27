import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { theme } from '../constants/theme';

interface CrownBadgeProps {
  size?: number;
}

export default function CrownBadge({ size = 22 }: CrownBadgeProps) {
  const iconWidth = (12 / 22) * size;
  const iconHeight = (10 / 22) * size;

  return (
    <View style={[
      styles.crownBadge, 
      { 
        width: size, 
        height: size, 
        borderRadius: size / 2 
      }
    ]}>
      <Svg width={iconWidth} height={iconHeight} viewBox="0 0 12 10">
        <Path 
          d="M1 9 L2 4 L6 7 L10 4 L11 9 Z" 
          fill="white"
        />
        <Circle cx="2" cy="4" r="1.2" fill="white"/>
        <Circle cx="6" cy="3" r="1.2" fill="white"/>
        <Circle cx="10" cy="4" r="1.2" fill="white"/>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  crownBadge: {
    backgroundColor: theme.colors.accent,
    borderWidth: 2,
    borderColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  }
});