import { OAuthProvider, signInWithPopup } from 'firebase/auth';

import { requireFirebaseAuth } from '@/services/firebase';

export async function isNativeAppleSignInAvailable() {
  return false;
}

export async function signInWithApple(): Promise<'signed-in' | 'cancelled'> {
  try {
    await signInWithPopup(requireFirebaseAuth(), new OAuthProvider('apple.com'));
    return 'signed-in';
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/popup-closed-by-user') return 'cancelled';
    throw error;
  }
}
