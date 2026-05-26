import { Tabs } from 'expo-router';
import { theme } from '../../constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '오늘',
        }}
      />
      <Tabs.Screen
        name="group"
        options={{
          title: '그룹',
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: '기록',
        }}
      />
      <Tabs.Screen
        name="my"
        options={{
          title: '마이',
        }}
      />
    </Tabs>
  );
}
