import React from 'react';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, RadialGradient } from 'react-native-svg';

interface StarPieceIconProps {
  size?: number;
}

export const StarPieceIcon: React.FC<StarPieceIconProps> = ({ size = 20 }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        {/* 메인 그라디언트: 좌하단 → 우상단 퍼플 */}
        <LinearGradient id="starGrad" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#7B6FD4" />
          <Stop offset="1" stopColor="#C084C8" />
        </LinearGradient>
        {/* 하이라이트: 중앙 밝은 빛 */}
        <RadialGradient id="highlight" cx="10" cy="10" r="6" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.45" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* 4각 별 조각 — 뾰족한 크리스털 형태 */}
      <Path
        d="M12 1 L14.2 9.8 L23 12 L14.2 14.2 L12 23 L9.8 14.2 L1 12 L9.8 9.8 Z"
        fill="url(#starGrad)"
      />

      {/* 중앙 하이라이트 */}
      <Path
        d="M12 1 L14.2 9.8 L23 12 L14.2 14.2 L12 23 L9.8 14.2 L1 12 L9.8 9.8 Z"
        fill="url(#highlight)"
      />

      {/* 우상단 보조 광점 */}
      <Circle cx="18.5" cy="5.5" r="1.1" fill="#E8C8F0" opacity="0.8" />

      {/* 좌하단 보조 광점 */}
      <Circle cx="5.5" cy="18.5" r="0.7" fill="#C084C8" opacity="0.6" />
    </Svg>
  );
};
