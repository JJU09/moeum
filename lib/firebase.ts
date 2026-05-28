import { initializeApp, getApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  memoryLocalCache,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// 앱이 이미 초기화된 경우(핫 리로드 등) getApp() 재사용
const isNewApp = getApps().length === 0;
const app = isNewApp ? initializeApp(firebaseConfig) : getApp();

let auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
}

// initializeFirestore는 첫 초기화 시에만 호출 (중복 호출 시 에러).
// 이미 초기화된 경우 getFirestore로 기존 인스턴스 반환.
let db;
if (isNewApp) {
  db = Platform.OS === 'web'
    ? initializeFirestore(app, { localCache: memoryLocalCache() })
    : initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentSingleTabManager(undefined),
        }),
      });
} else {
  db = getFirestore(app);
}

const storage = getStorage(app);

export { app, auth, db, storage };
