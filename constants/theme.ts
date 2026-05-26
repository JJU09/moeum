export const theme = {
  colors: {
    background: '#12131F',
    surface: '#1E2035',
    surfaceLight: '#2A2D4A',
    textPrimary: '#FFFFFF',
    textSecondary: '#A0A0C0',
    textMuted: '#5A5A7A',
    accent: '#9B8FE4',
    accentSoft: '#C084C8',
    success: '#7DAF8B',
    error: '#C4756A',
    border: '#2A2D4A',
    gray: {
      100: '#2A2D4A',
      200: '#3A3D5A',
      300: '#4A4D6A',
    },
    // 기존 코드 호환성을 위해 유지하되 색상 변경
    text: '#FFFFFF',
    primary: '#9B8FE4',
  },
  gradients: {
    warm: ['#7B6FD4', '#C084C8'],
    soft: ['#6B5FA8', '#9B7FA0'],
    muted: ['#3D3F6B', '#5A5C8A'],
  },
  border: {
    radius: 20,
  },
  typography: {
    koreanText: {
      lineBreakStrategyIOS: 'hangul-word',
      wordBreak: 'keep-all',
    },
  },
} as const;