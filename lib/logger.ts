import { Platform } from 'react-native';

// Platform 체크를 런타임에 하므로 웹 빌드에서 crashlytics import 오류 방지
const getCrashlytics = () => {
  if (Platform.OS === 'web') return null;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@react-native-firebase/crashlytics').default;
};

export function logError(message: string, error: unknown): void {
  console.error(message, error);

  const cl = getCrashlytics();
  if (!cl) return;

  try {
    cl().log(message);
    if (error instanceof Error) {
      cl().recordError(error);
    } else {
      cl().recordError(new Error(`${message}: ${String(error)}`));
    }
  } catch {
    // Crashlytics 자체 실패는 무시
  }
}
