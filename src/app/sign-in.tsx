import { Text } from '@/components/ui/text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type TextInput } from 'react-native';

import { GoogleLogo } from '@/components/brand-logos';
import { EntryButton, EntryHeader, EntryHeading, EntryLink, EntryScreen, entryStyles } from '@/components/entry-ui';
import { OnboardingTextField } from '@/components/onboarding-fields';
import { Entry } from '@/constants/entry-theme';
import { createEmailAccount, emailAuthMessage, sendPasswordReset, signInWithEmail } from '@/services/email-auth';
import { signInWithGoogle } from '@/services/google-auth';
import { homeRoute } from '@/services/team-invites';
import { useAuthSession } from '@/state/auth-session';

export default function SignInScreen() {
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [pending, setPending] = useState(false);
  const authPendingRef = useRef(false);
  const [resetting, setResetting] = useState(false);
  const resettingRef = useRef(false);
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const [navigationAttempt, setNavigationAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState('Couldn’t sign in');
  const [signedInUid, setSignedInUid] = useState<string | null>(null);
  const { user, ready } = useAuthSession();
  // null: the Google button; 'signin' / 'create': the email form in place of it.
  const [emailMode, setEmailMode] = useState<'signin' | 'create' | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  // The keyboard's Next key walks name → email → password, so no field hides under the keyboard.
  const emailField = useRef<TextInput>(null);
  const passwordField = useRef<TextInput>(null);

  useEffect(() => {
    if (!(signedInUid && ready && user?.uid === signedInUid)) return;
    // Returning people go straight to their team; only new accounts choose a role.
    let active = true;
    homeRoute().then((home) => { if (active) router.replace((home === '/role' && next === 'athlete' ? '/setup/athlete' : home) as never); }).catch(() => { if (active) setNavigationError('You’re signed in, but your team couldn’t load. Try opening your account again.'); });
    return () => { active = false; };
  }, [navigationAttempt, next, ready, router, signedInUid, user?.uid]);

  const signIn = async () => {
    setErrorTitle('Couldn’t sign in');
    if (authPendingRef.current || signedInUid) return;
    authPendingRef.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await signInWithGoogle();
      if (result !== 'cancelled') setSignedInUid(result.uid);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign in failed. Please try again.');
    } finally {
      authPendingRef.current = false;
      setPending(false);
    }
  };

  const switchMode = (mode: typeof emailMode) => { setEmailMode(mode); setError(null); setNotice(null); };

  const submitEmail = async () => {
    if (authPendingRef.current || signedInUid) return;
    const creating = emailMode === 'create';
    setErrorTitle(creating ? 'Couldn’t create your account' : 'Couldn’t sign in');
    if (creating && !name.trim()) return setError('Enter your name.');
    if (!email.trim()) return setError('Enter your email address.');
    if (creating ? password.length < 6 : !password) return setError(creating ? 'Use at least 6 characters for your password.' : 'Enter your password.');
    authPendingRef.current = true;
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const result = creating ? await createEmailAccount(name, email, password) : await signInWithEmail(email, password);
      setSignedInUid(result.uid);
    } catch (reason) {
      setError(emailAuthMessage(reason));
    } finally {
      authPendingRef.current = false;
      setPending(false);
    }
  };

  const resetPassword = async () => {
    setErrorTitle('Couldn’t send the reset link');
    if (resettingRef.current || authPendingRef.current) return;
    if (!email.trim()) return setError('Enter your email first, then tap Forgot password.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Enter a valid email address.');
    resettingRef.current = true;
    setResetting(true);
    setError(null);
    try {
      await sendPasswordReset(email);
      setNotice(`If ${email.trim()} has an account, a reset link is on its way.`);
    } catch (reason) {
      setError(emailAuthMessage(reason));
    } finally { resettingRef.current = false; setResetting(false); }
  };

  const creating = emailMode === 'create';
  const busy = pending || Boolean(signedInUid);

  return (
    <EntryScreen background="auth" backgroundDrawIn={350} backdrop={<Photo />}>{(compact) => <>
      <EntryHeader onBack={() => router.canGoBack() ? router.back() : router.replace('/welcome')} />
      <View style={[styles.hero, compact && styles.heroCompact, emailMode && styles.heroForm]} />
      <EntryHeading accent="starts here." compact={compact} delay={200} lead="Your team" size="hero" />
      <Text style={entryStyles.description}>Sign in to create or join a team.</Text>
      {signedInUid ? <View style={styles.formActions}>
        {navigationError ? <>
          <ErrorPanel message={navigationError} title="Couldn’t open your account" />
          <EntryButton label="Open my account" onPress={() => { setNavigationError(null); setNavigationAttempt((value) => value + 1); }} />
        </> : <EntryButton label="Opening your account" loading loadingLabel="Opening your account…" onPress={() => {}} />}
      </View> : emailMode ? (
        <View style={styles.form}>
          {creating ? <OnboardingTextField autoCapitalize="words" autoComplete="name" label="Name" onChangeText={setName} onSubmitEditing={() => emailField.current?.focus()} placeholder="Your full name" returnKeyType="next" submitBehavior="submit" textContentType="name" value={name} /> : null}
          <OnboardingTextField autoCapitalize="none" autoComplete="email" inputMode="email" keyboardType="email-address" inputRef={emailField} label="Email" onChangeText={setEmail} onSubmitEditing={() => passwordField.current?.focus()} placeholder="you@school.org" returnKeyType="next" submitBehavior="submit" textContentType="emailAddress" value={email} />
          <OnboardingTextField autoCapitalize="none" autoComplete={creating ? 'new-password' : 'current-password'} inputRef={passwordField} label="Password" onChangeText={setPassword} onSubmitEditing={submitEmail} placeholder={creating ? 'At least 6 characters' : 'Your password'} returnKeyType="go" secureTextEntry textContentType={creating ? 'newPassword' : 'password'} value={password} />
          <View style={styles.formActions}>
            <EntryButton label={creating ? 'Create account' : 'Sign in'} loading={busy} loadingLabel={creating ? 'Creating account…' : 'Signing in…'} onPress={submitEmail} />
            {error ? <ErrorPanel message={error} title={errorTitle} /> : null}
            {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
            <EntryLink label={creating ? 'Have an account? Sign in' : 'New to HeatSense? Create an account'} onPress={() => switchMode(creating ? 'signin' : 'create')} />
            {creating ? null : <EntryLink disabled={resetting || busy} label={resetting ? 'Sending reset link…' : 'Forgot password?'} onPress={resetPassword} />}
            <EntryLink label="Use Google instead" onPress={() => switchMode(null)} />
          </View>
        </View>
      ) : (
        <View style={styles.actions}>
          <EntryButton label="Continue with Google" loading={busy} onPress={signIn} icon={<GoogleLogo size={21} />} neutral />
          <View style={styles.gap} />
          <EntryButton label="Continue with email" onPress={() => switchMode('signin')} secondary />
          {error ? <ErrorPanel message={error} title={errorTitle} /> : null}
          <Text style={styles.privacy}>Your Google password stays with Google.</Text>
        </View>
      )}
    </>}</EntryScreen>
  );
}

function ErrorPanel({ message, title = 'Couldn’t sign in' }: { message: string; title?: string }) {
  return <View accessibilityRole="alert" style={styles.errorPanel}><Text style={styles.errorTitle}>{title}</Text><Text style={styles.error}>{message}</Text></View>;
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
  // The email form needs the room more than the photograph does.
  heroForm: { minHeight: 140 },
  actions: { marginTop: 32 },
  gap: { height: 12 },
  form: { gap: 16, marginTop: 28 },
  formActions: { gap: 14, marginTop: 8 },
  notice: { color: Entry.muted, fontFamily: Entry.body, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  privacy: { color: Entry.subtle, fontFamily: Entry.body, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 20, paddingHorizontal: 12 },
  errorPanel: { padding: 14, borderRadius: 18, backgroundColor: '#34241E', marginTop: 14, gap: 6 },
  errorTitle: { color: '#FFD0B5', fontFamily: Entry.strong, fontSize: 14 },
  error: { color: '#FFD0B5', fontFamily: Entry.body, fontSize: 13, lineHeight: 20 },
});
