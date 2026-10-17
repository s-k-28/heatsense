import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { connectAuthEmulator, getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions';
import { Platform } from 'react-native';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

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
export const cloudFunctions: Functions | null = firebaseApp ? getFunctions(firebaseApp) : null;

// Local development against the Firebase Emulator Suite (`npm run emulators`):
// set EXPO_PUBLIC_USE_FIREBASE_EMULATORS=1 in .env.local. Sign-in stays real Google
// (the Functions emulator verifies real ID tokens) unless EXPO_PUBLIC_USE_AUTH_EMULATOR=1.
if (process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS === '1' && firebaseAuth && firestore && cloudFunctions) {
  const host = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST || '127.0.0.1';
  if (process.env.EXPO_PUBLIC_USE_AUTH_EMULATOR === '1') connectAuthEmulator(firebaseAuth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(firestore, host, 8080);
  connectFunctionsEmulator(cloudFunctions, host, 5001);
}

export function requireFirebaseAuth(): Auth {
  if (!firebaseAuth) throw new Error('Google sign in is not configured yet. Add the HeatSense Firebase settings to .env.');
  return firebaseAuth;
}
