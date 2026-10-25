import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { connectAuthEmulator, getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { Platform } from 'react-native';

import heatSenseClient from '@/constants/firebase-client.json';

const environmentConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

// These are public client identifiers, already published in .env.example, not
// service-account credentials. A fresh device build must support real sign-in
// without a developer's ignored .env file. A custom project must supply its full
// config; never fill an incomplete custom project with HeatSense identifiers.
// A local file with only some matching HeatSense values is still the default
// project, so it must not disable the complete bundled client configuration.
const hasCustomConfig = Object.entries(environmentConfig).some(([field, value]) =>
  value && value !== heatSenseClient[field as keyof typeof heatSenseClient],
);
const config = hasCustomConfig ? environmentConfig : heatSenseClient;

const configured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
export const firebaseApp = configured ? (getApps().length ? getApp() : initializeApp(config)) : null;

function createAuth(): Auth | null {
  if (!firebaseApp) return null;
  if (Platform.OS === 'web') return getAuth(firebaseApp);
  try {
    // Firebase publishes this export in its React Native bundle, but its top-level
    // TypeScript declaration points at the web bundle.
    const getReactNativePersistence = (FirebaseAuth as typeof FirebaseAuth & {
      getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
    }).getReactNativePersistence;
    return initializeAuth(firebaseApp, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/already-initialized') return getAuth(firebaseApp);
    throw error;
  }
}

export const firebaseAuth = createAuth();
export const firestore: Firestore | null = firebaseApp ? getFirestore(firebaseApp) : null;

// Local development against the Firebase Emulator Suite (`npm run emulators`):
// set EXPO_PUBLIC_USE_FIREBASE_EMULATORS=1 in .env.local. Sign-in stays real Google
// unless EXPO_PUBLIC_USE_AUTH_EMULATOR=1.
if (process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS === '1' && firebaseAuth && firestore) {
  const host = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST || '127.0.0.1';
  if (process.env.EXPO_PUBLIC_USE_AUTH_EMULATOR === '1') connectAuthEmulator(firebaseAuth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(firestore, host, 8080);
}

export function requireFirebaseAuth(): Auth {
  if (!firebaseAuth) throw new Error('Firebase configuration is incomplete. Set all Firebase client values in .env, then restart Metro and reload the app.');
  return firebaseAuth;
}
