export const theme = {
  colors: {
    background: '#1A1612',
    surface: '#2A2420',
    surfaceLight: '#3A3430',
    textPrimary: '#F5F0E8',
    textSecondary: '#B0A898',
    textMuted: '#6B6560',
    accent: '#C4956A',
    accentSoft: '#8B6F5E',
    success: '#7DAF8B',
    error: '#C4756A',
    border: '#3A3430',
    gray: {
      100: '#3A3430',
      200: '#4A4440',
      300: '#5A5450',
    },
    // 기존 코드 호환성을 위해 유지하되 색상 변경 (필요시)
    text: '#F5F0E8',
    primary: '#C4956A',
  },
  gradients: {
    warm: ['#8B6F5E', '#C4956A'],
    soft: ['#6B5B7B', '#9B7FA0'],
    muted: ['#4A5568', '#718096'],
  },
  border: {
    radius: 20,
  },
} as const;