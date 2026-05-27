import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, Switch, TouchableOpacity, Linking, AppState, AppStateStatus } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { theme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function NotificationSettingsScreen() {
  const [hasPermission, setHasPermission] = useState(true);
  const appState = useRef(AppState.currentState);

  const [settings, setSettings] = useState({
    notification_question: true,
    notification_comment: true,
    notification_reaction: true,
  });

  useEffect(() => {
    checkPermission();
    loadSettings();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        checkPermission();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const checkPermission = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const loadSettings = async () => {
    try {
      const q = await AsyncStorage.getItem('notification_question');
      const c = await AsyncStorage.getItem('notification_comment');
      const r = await AsyncStorage.getItem('notification_reaction');

      setSettings({
        notification_question: q !== null ? JSON.parse(q) : true,
        notification_comment: c !== null ? JSON.parse(c) : true,
        notification_reaction: r !== null ? JSON.parse(r) : true,
      });
    } catch (error) {
      console.error('Failed to load notification settings', error);
    }
  };

  const toggleSetting = async (key: keyof typeof settings) => {
    const newValue = !settings[key];
    setSettings(prev => ({ ...prev, [key]: newValue }));
    try {
      await AsyncStorage.setItem(key, JSON.stringify(newValue));
    } catch (error) {
      console.error(`Failed to save ${key}`, error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen 
        options={{
          title: '알림 설정',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.textPrimary,
          headerShadowVisible: false,
        }}
      />
      
      {!hasPermission && (
        <View style={styles.permissionBanner}>
          <View style={styles.bannerContent}>
            <Ionicons name="warning-outline" size={20} color={theme.colors.background} />
            <Text style={styles.bannerText}>
              알림 권한이 없어요. 권한을 허용해 주세요.
            </Text>
          </View>
          <TouchableOpacity onPress={() => Linking.openSettings()}>
            <Text style={styles.bannerAction}>설정으로 이동</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.settingItem}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>오늘의 질문 알림</Text>
            <Text style={styles.settingDescription}>매일 오전 7시에 새 질문 도착 알림</Text>
          </View>
          <Switch
            value={settings.notification_question}
            onValueChange={() => toggleSetting('notification_question')}
            trackColor={{ false: theme.colors.surfaceLight, true: 'rgba(255,255,255,0.3)' }}
            thumbColor={'#FFFFFF'}
            ios_backgroundColor={theme.colors.surfaceLight}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>댓글 알림</Text>
            <Text style={styles.settingDescription}>내 답변에 댓글이 달릴 때</Text>
          </View>
          <Switch
            value={settings.notification_comment}
            onValueChange={() => toggleSetting('notification_comment')}
            trackColor={{ false: theme.colors.surfaceLight, true: 'rgba(255,255,255,0.3)' }}
            thumbColor={'#FFFFFF'}
            ios_backgroundColor={theme.colors.surfaceLight}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>리액션 알림</Text>
            <Text style={styles.settingDescription}>내 답변에 이모지 반응이 달릴 때</Text>
          </View>
          <Switch
            value={settings.notification_reaction}
            onValueChange={() => toggleSetting('notification_reaction')}
            trackColor={{ false: theme.colors.surfaceLight, true: 'rgba(255,255,255,0.3)' }}
            thumbColor={'#FFFFFF'}
            ios_backgroundColor={theme.colors.surfaceLight}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

import { Platform } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  permissionBanner: {
    backgroundColor: theme.colors.accent,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  bannerText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flexShrink: 1,
  },
  bannerAction: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  content: {
    padding: 24,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
});