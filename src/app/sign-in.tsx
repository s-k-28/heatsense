import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { GoogleLogo } from '@/components/brand-logos';
import { EntryButton, EntryHeader, EntryHeading, EntryScreen, entryStyles } from '@/components/entry-ui';
import { Entry } from '@/constants/entry-theme';
import { signInWithGoogle } from '@/services/google-auth';
import { useAuthSession } from '@/state/auth-session';

export default function SignInScreen() {
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedInUid, setSignedInUid] = useState<string | null>(null);
  const { user, ready } = useAuthSession();

  useEffect(() => {
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
    <EntryScreen background="auth" backgroundDrawIn={350} backdrop={<Photo />}>{(compact) => <>
      <EntryHeader onBack={() => router.canGoBack() ? router.back() : router.replace('/welcome')} />
      <View style={[styles.hero, compact && styles.heroCompact]} />
      <EntryHeading accent="starts here." compact={compact} delay={200} lead="Your team" size="hero" />
      <Text style={entryStyles.description}>Sign in to set up your team or join with a coach’s invite.</Text>
      <View style={styles.actions}>
        <EntryButton label="Continue with Google" loading={pending || Boolean(signedInUid)} onPress={signIn} icon={<GoogleLogo size={21} />} neutral />
        {error ? <View accessibilityRole="alert" style={styles.errorPanel}><Text style={styles.errorTitle}>Couldn’t sign in</Text><Text style={styles.error}>{error}</Text></View> : null}
        <Text style={styles.privacy}>Google handles your sign-in. Your password stays with Google.</Text>
      </View>
    </>}</EntryScreen>
  );
}

/** The field photograph, fading into the page so the copy below sits on solid dark. */
function Photo() {
  return (
    <View pointerEvents="none" accessible={false} aria-hidden style={styles.photo}>
      <Image source={require('@/assets/images/sign-in-on-field.jpg')} contentFit="cover" contentPosition="center" style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(16,20,22,0.55)', 'rgba(16,20,22,0)']} locations={[0, 1]} style={styles.topShade} />
      <LinearGradient colors={['rgba(16,20,22,0)', 'rgba(16,20,22,0.55)', Entry.canvas]} locations={[0, 0.5, 1]} style={styles.bottomShade} />
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { position: 'absolute', top: 0, left: 0, right: 0, height: '68%' },
  topShade: { position: 'absolute', top: 0, left: 0, right: 0, height: '28%' },
  bottomShade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%' },
  // Leaves the photograph open above the copy.
  hero: { flexGrow: 1, minHeight: 300 },
  heroCompact: { minHeight: 200 },
  actions: { marginTop: 32 },
  privacy: { color: Entry.subtle, fontFamily: Entry.body, fontSize: 12.5, lineHeight: 18, textAlign: 'center', marginTop: 20, paddingHorizontal: 12 },
  errorPanel: { padding: 14, borderRadius: 18, backgroundColor: '#34241E', marginTop: 14, gap: 6 },
  errorTitle: { color: '#FFD0B5', fontFamily: Entry.strong, fontSize: 14 },
  error: { color: '#FFD0B5', fontFamily: Entry.body, fontSize: 13, lineHeight: 20 },
});
