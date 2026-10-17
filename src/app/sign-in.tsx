import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { GoogleLogo } from '@/components/brand-logos';
import { EntryButton, EntryHeader, EntryScreen, entryStyles } from '@/components/entry-ui';
import { FieldlineScene } from '@/components/fieldline-character';
import { Entry } from '@/constants/entry-theme';
import { signInWithGoogle } from '@/services/google-auth';
import { useAuthSession } from '@/state/auth-session';

export default function SignInScreen() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedInUid, setSignedInUid] = useState<string | null>(null);
  const { user, ready } = useAuthSession();

  useEffect(() => {
    if (signedInUid && ready && user?.uid === signedInUid) router.replace('/role');
  }, [ready, router, signedInUid, user?.uid]);

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
    <EntryScreen>{(compact) => <>
      <EntryHeader onBack={() => router.canGoBack() ? router.back() : router.replace('/welcome')} />
      <View style={[styles.illustration, compact && { marginVertical: 10 }]}><FieldlineScene compact={compact} /></View>
      <Text accessibilityRole="header" style={[entryStyles.headline, compact && entryStyles.headlineCompact]}>Your team{'\n'}starts here.</Text>
      <Text style={entryStyles.description}>Sign in to set up your team or join with a coach’s invite.</Text>
      <View style={styles.nextSteps}>
        <Text style={styles.nextLabel}>Up next</Text>
        <View style={styles.nextItem}><Text style={styles.nextText}>Choose your role</Text><Text style={styles.connector}>/</Text><Text style={styles.nextText}>Find your team</Text></View>
      </View>
      <View style={styles.actions}>
        <EntryButton label="Continue with Google" loading={pending || Boolean(signedInUid)} onPress={signIn} icon={<GoogleLogo size={21} />} neutral />
        {error ? <View accessibilityRole="alert" style={styles.errorPanel}><Text style={styles.errorTitle}>Couldn’t sign in</Text><Text style={styles.error}>{error}</Text></View> : null}
        <View style={styles.privacy}>
          <Svg width={15} height={18} viewBox="0 0 24 24" fill="none" stroke={Entry.muted} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><Path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z M8 12l3 3 5-6" /></Svg>
          <Text style={styles.privacyText}>Google handles your sign-in. Your Google password stays with Google.</Text>
        </View>
      </View>
    </>}</EntryScreen>
  );
}

const styles = StyleSheet.create({
  illustration: { flexGrow: 1, justifyContent: 'center', marginVertical: 22 },
  nextSteps: { marginTop: 24, borderTopWidth: 1, borderTopColor: Entry.line, paddingTop: 16, gap: 8 },
  nextLabel: { color: Entry.muted, fontFamily: Entry.body, fontSize: 12 },
  nextItem: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  nextText: { color: Entry.ink, fontFamily: Entry.medium, fontSize: 13 },
  connector: { color: Entry.line, fontSize: 16 },
  actions: { marginTop: 28 },
  privacy: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: 8, marginTop: 18, paddingHorizontal: 8 },
  privacyText: { color: Entry.muted, fontFamily: Entry.body, fontSize: 12, lineHeight: 18, flexShrink: 1 },
  errorPanel: { padding: 14, borderRadius: 14, backgroundColor: '#34241E', marginTop: 14, gap: 6 },
  errorTitle: { color: '#FFD0B5', fontFamily: Entry.strong, fontSize: 14 },
  error: { color: '#FFD0B5', fontFamily: Entry.body, fontSize: 13, lineHeight: 20 },
});
