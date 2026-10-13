import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

import { requireFirebaseAuth } from '@/services/firebase';

export async function signInWithGoogle(): Promise<'signed-in' | 'cancelled'> {
  try {
    await signInWithPopup(requireFirebaseAuth(), new GoogleAuthProvider());
    return 'signed-in';
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request')) return 'cancelled';
    throw error;
  }
}
