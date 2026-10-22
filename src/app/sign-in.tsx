import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GoogleLogo } from '@/components/brand-logos';
import { EntryButton } from '@/components/entry-ui';
import { ShieldMark } from '@/components/onboarding-art';
import { StepScreen } from '@/components/step-kit';
import { Entry } from '@/constants/entry-theme';
import { signInWithGoogle } from '@/services/google-auth';
import { useAuthSession } from '@/state/auth-session';

export default function SignInScreen() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedInUid, setSignedInUid] = useState<string | null>(null);
  const { user, ready } = useAuthSession();

  const { next } = useLocalSearchParams<{ next?: string }>();
  useEffect(() => {
    // "I have a team code" already told us they're an athlete, so skip the role question.
    if (signedInUid && ready && user?.uid === signedInUid) router.replace(next === 'athlete' ? '/setup/athlete' : '/role');
  }, [next, ready, router, signedInUid, user?.uid]);

  const signIn = async () => {
    if (pending || signedInUid) return;
    setPending(true);
    setError(null);
    try {
      const result = await signInWithGoogle();
      if (result !== 'cancelled') setSignedInUid(result.uid);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign in failed. Please try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <StepScreen
      icon={<ShieldMark size={96} />}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))}
      progress={0.1}
      title="Sign in to HeatSense"
      footer={
        <View style={styles.actions}>
          <EntryButton icon={<GoogleLogo size={21} />} label="Continue with Google" loading={pending || Boolean(signedInUid)} neutral onPress={signIn} />
          <Text style={styles.privacyText}>Google handles your sign-in. HeatSense never sees your password.</Text>
        </View>
      }>
      {error ? <View accessibilityRole="alert" style={styles.errorPanel}><Text style={styles.errorTitle}>Couldn’t sign in</Text><Text style={styles.error}>{error}</Text></View> : null}
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 14 },
  privacyText: { color: Entry.muted, fontWeight: '400', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  errorPanel: { backgroundColor: '#34241E', borderRadius: 14, gap: 6, padding: 14 },
  errorTitle: { color: '#FFD0B5', fontWeight: '600', fontSize: 14 },
  error: { color: '#FFD0B5', fontWeight: '400', fontSize: 13, lineHeight: 20 },
});
