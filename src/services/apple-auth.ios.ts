import * as AppleAuthentication from 'expo-apple-authentication';
import { CryptoDigestAlgorithm, digestStringAsync, randomUUID } from 'expo-crypto';

import { OAuthProvider, signInWithCredential } from 'firebase/auth';

import { requireFirebaseAuth } from '@/services/firebase';

export async function isNativeAppleSignInAvailable() {
  return AppleAuthentication.isAvailableAsync();
}

export async function signInWithApple(): Promise<'signed-in' | 'cancelled'> {
  const auth = requireFirebaseAuth();
  const nonce = randomUUID();
  const hashedNonce = await digestStringAsync(CryptoDigestAlgorithm.SHA256, nonce);
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
    if (!credential.identityToken) throw new Error('Apple did not return an identity token.');
    const firebaseCredential = new OAuthProvider('apple.com').credential({ idToken: credential.identityToken, rawNonce: nonce });
    await signInWithCredential(auth, firebaseCredential);
    return 'signed-in';
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ERR_REQUEST_CANCELED') return 'cancelled';
    throw error;
  }
}
