import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth';
import { Platform } from 'react-native';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

const configured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
const app = configured ? (getApps().length ? getApp() : initializeApp(config)) : null;

function createAuth(): Auth | null {
  if (!app) return null;
  if (Platform.OS === 'web') return getAuth(app);
  try {
    // Firebase publishes this export in its React Native bundle, but its top-level
    // TypeScript declaration points at the web bundle.
    const getReactNativePersistence = (FirebaseAuth as typeof FirebaseAuth & {
      getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
    }).getReactNativePersistence;
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/already-initialized') return getAuth(app);
    throw error;
  }
}

export const firebaseAuth = createAuth();

export function requireFirebaseAuth(): Auth {
  if (!firebaseAuth) throw new Error('Google sign in is not configured yet. Add the HeatSense Firebase settings to .env.');
  return firebaseAuth;
}
