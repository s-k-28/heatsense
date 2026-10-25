import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { Platform } from 'react-native';

import heatSenseClient from '@/constants/firebase-client.json';
import heatSenseGoogle from '@/constants/google-client.json';
import { requireFirebaseAuth } from '@/services/firebase';

export async function signInWithGoogle(): Promise<{ uid: string } | 'cancelled'> {
  const auth = requireFirebaseAuth();
  // Public OAuth identifiers must ship with the app, just like Firebase's client
  // config. Never use HeatSense's OAuth clients for a different Firebase project.
  const isHeatSenseProject = auth.app.options.projectId === heatSenseClient.projectId;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || (isHeatSenseProject ? heatSenseGoogle.webClientId : undefined);
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || (isHeatSenseProject ? heatSenseGoogle.iosClientId : undefined);
  if (!webClientId || (Platform.OS === 'ios' && !iosClientId)) throw new Error('Google sign-in configuration is incomplete. Set the Google web and iOS client IDs for your Firebase project, then restart Metro and reload the app.');
  GoogleSignin.configure({ webClientId, iosClientId });
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
