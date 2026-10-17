import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

import { requireFirebaseAuth } from '@/services/firebase';

export async function signInWithGoogle(): Promise<{ uid: string } | 'cancelled'> {
  try {
    const credential = await signInWithPopup(requireFirebaseAuth(), new GoogleAuthProvider());
    return { uid: credential.user.uid };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request')) return 'cancelled';
    throw error;
  }
}
