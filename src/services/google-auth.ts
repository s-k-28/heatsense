import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

import { requireFirebaseAuth } from '@/services/firebase';

export async function signInWithGoogle(): Promise<{ uid: string } | 'cancelled'> {
  const auth = requireFirebaseAuth();
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) throw new Error('Google sign in is not configured yet. Add the Google web client ID to .env.');
  GoogleSignin.configure({ webClientId, iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID });
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (response.type === 'cancelled') return 'cancelled';
    const idToken = response.data.idToken;
    if (!idToken) throw new Error('Google did not return an identity token. Check the OAuth client configuration.');
    const credential = await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
    return { uid: credential.user.uid };
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) return 'cancelled';
    throw error;
  }
}
