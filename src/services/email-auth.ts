import { FirebaseError } from 'firebase/app';
import { createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';

import { requireFirebaseAuth } from '@/services/firebase';

// Email + password sign-in on Firebase Auth (free on the Spark plan, no server). The
// provider must be switched on in the Firebase console: Authentication → Sign-in method
// → Email/Password.

export async function signInWithEmail(email: string, password: string): Promise<{ uid: string }> {
  const { user } = await signInWithEmailAndPassword(requireFirebaseAuth(), email.trim(), password);
  return { uid: user.uid };
}

/** Creates the account and saves the name on it. The Firestore rules match join requests against the token's name, so the token is refreshed once the name is set. */
export async function createEmailAccount(name: string, email: string, password: string): Promise<{ uid: string }> {
  const { user } = await createUserWithEmailAndPassword(requireFirebaseAuth(), email.trim(), password);
  await updateProfile(user, { displayName: name.trim() });
  await user.getIdToken(true);
  // ponytail: verification is sent, not required. Require it in the rules if anyone abuses unverified emails.
  sendEmailVerification(user).catch(() => {});
  return { uid: user.uid };
}

export function sendPasswordReset(email: string): Promise<void> {
  return sendPasswordResetEmail(requireFirebaseAuth(), email.trim());
}

const MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'That email address doesn’t look right.',
  'auth/missing-email': 'Enter your email address.',
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/wrong-password': 'Email or password is incorrect.',
  'auth/user-not-found': 'Email or password is incorrect.',
  'auth/missing-password': 'Enter your password.',
  'auth/email-already-in-use': 'An account with this email already exists. Sign in instead.',
  'auth/weak-password': 'Use at least 6 characters for your password.',
  'auth/too-many-requests': 'Too many tries. Wait a minute, then try again.',
  'auth/network-request-failed': 'No connection. Check your internet and try again.',
  'auth/operation-not-allowed': 'Email sign-in isn’t turned on for HeatSense yet.',
  'auth/user-disabled': 'This account has been turned off.',
};

export function emailAuthMessage(error: unknown): string {
  if (error instanceof FirebaseError) return MESSAGES[error.code] ?? 'Something went wrong. Please try again.';
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
