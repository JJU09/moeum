import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as GoogleAuthSession from 'expo-auth-session/providers/google';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { FontAwesome } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { logError } from '../../lib/logger';

if (Platform.OS === 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

// Native Google Sign-In Configuration
if (Platform.OS !== 'web') {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    offlineAccess: true,
  });
}

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Web-specific Google Auth Session
  const [request, response, promptAsync] = GoogleAuthSession.useIdTokenAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  // Handle Web Response
  useEffect(() => {
    if (Platform.OS === 'web' && response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      
      setLoading(true);
      signInWithCredential(auth, credential).catch((error) => {
        logError("Web Google login error:", error);
        setLoading(false);
      });
    }
  }, [response]);

  const handleGoogleLogin = async () => {
    if (Platform.OS === 'web') {
      setLoading(true);
      try {
        await promptAsync();
      } catch (error) {
        logError("Web login prompt error:", error);
        setLoading(false);
      }
      return;
    }

    // Native Logic
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;

      if (!idToken) {
        throw new Error('ID Token not found');
      }

      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // progress
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('오류', 'Google Play 서비스를 사용할 수 없습니다.');
      } else {
        logError("Native Google login error:", error);
        Alert.alert('오류', 'Google 로그인 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.title}>Moeum</Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleLogin}
          disabled={(Platform.OS === 'web' && !request) || loading}
        >
          <FontAwesome name="google" size={24} color="#000" />
          <Text style={styles.googleButtonText}>
            {loading ? '로그인 중...' : 'Google로 로그인'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.emailButton}
          onPress={() => router.push('/(auth)/email-login')}
          disabled={loading}
        >
          <FontAwesome name="envelope" size={24} color="#fff" />
          <Text style={styles.emailButtonText}>이메일로 로그인</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return Platform.OS !== 'web' ? (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {content}
      </ScrollView>
    </KeyboardAvoidingView>
  ) : (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 42,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  buttonContainer: {
    gap: 16,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceLight,
    padding: 16,
    borderRadius: theme.border.radius,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    padding: 16,
    borderRadius: theme.border.radius,
    gap: 12,
  },
  emailButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
});