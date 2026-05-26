import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="email-login" options={{ title: '이메일 로그인' }} />
      <Stack.Screen name="sign-up" options={{ title: '회원가입' }} />
      <Stack.Screen name="profile-setup" options={{ title: '프로필 설정', headerShown: false }} />
    </Stack>
  );
}