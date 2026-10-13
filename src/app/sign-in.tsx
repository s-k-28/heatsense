import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { GoogleLogo } from '@/components/brand-logos';
import { HeatSenseLogo } from '@/components/heatsense-logo';
import { WelcomeWristband, WristbandShadow, WRISTBAND_ASPECT } from '@/components/welcome-wristband';
import { signInWithGoogle } from '@/services/google-auth';

// Same canvas as the welcome screen so the two read as one flow.
const SCREEN = '#222222';
const DESKTOP = '#111111';
const DESKTOP_BREAKPOINT = 600;
const fontFamily = Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif', default: '"Helvetica Neue", Helvetica, Arial, sans-serif' });

function BackChevron() {
  return <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="m15 5-7 7 7 7" /></Svg>;
}

export default function SignInScreen() {
  const { width, height } = useWindowDimensions();
  const preview = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
  if (!preview) return <View style={[styles.fill, { backgroundColor: SCREEN }]}><SignInContent /></View>;

  const frameHeight = Math.min(880, height - 48);
  const frameWidth = Math.min(410, Math.round(frameHeight * 0.47));
  return (
    <View style={[styles.fill, styles.desktop]}>
      <View style={[styles.frame, { width: frameWidth, height: frameHeight }]}><SignInContent /></View>
    </View>
  );
}

function SignInContent() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // About 270px tall on a 390x844 phone, shrinking on short screens so the buttons stay visible.
  const bandHeight = Math.max(140, Math.min(290, size.height * 0.36 - 30));
  const bandWidth = bandHeight * WRISTBAND_ASPECT;
  const headlineSize = Math.max(34, Math.min(42, size.width * 0.1));

  // The band arrives from where it sat on the welcome screen: lower, slightly larger.
  const arrive = useSharedValue(reducedMotion ? 1 : 0);
  useEffect(() => {
    if (reducedMotion) return;
    arrive.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    return () => { cancelAnimation(arrive); };
  }, [arrive, reducedMotion]);
  const bandStyle = useAnimatedStyle(() => ({
    opacity: interpolate(arrive.value, [0, 0.4, 1], [0, 1, 1]),
    transform: [{ translateY: interpolate(arrive.value, [0, 1], [150, 0]) }, { scale: interpolate(arrive.value, [0, 1], [1.1, 1]) }],
  }));
  const shadowStyle = useAnimatedStyle(() => ({
    opacity: arrive.value * 0.8,
  }));

  const rise = (delay: number) => (reducedMotion ? undefined : FadeInUp.delay(delay).duration(500));
  const fade = (delay: number) => (reducedMotion ? undefined : FadeIn.delay(delay).duration(450));

  const back = () => (router.canGoBack() ? router.back() : router.replace('/welcome'));
  const signIn = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await signInWithGoogle();
      if (result === 'signed-in') router.replace('/role');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign in failed. Please try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <View onLayout={(event: LayoutChangeEvent) => setSize(event.nativeEvent.layout)} style={[styles.content, { paddingTop: Math.max(insets.top + 8, 56), paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
      <StatusBar style="light" />
      <Animated.View entering={fade(150)} style={styles.topRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} hitSlop={8} style={({ pressed }) => [styles.circle, pressed && styles.pressed]}>
          <BackChevron />
        </Pressable>
        <HeatSenseLogo height={24} />
      </Animated.View>

      <View style={styles.hero} pointerEvents="none">
        {size.height > 0 && <>
          <Animated.View style={bandStyle}><WelcomeWristband width={bandWidth} /></Animated.View>
          <Animated.View style={[styles.shadow, shadowStyle]}><WristbandShadow width={Math.min(210, bandWidth * 0.75)} /></Animated.View>
        </>}
      </View>

      <Animated.Text entering={rise(500)} accessibilityRole="header" style={[styles.headline, { fontFamily, fontSize: headlineSize, lineHeight: Math.round(headlineSize * 1.15) }]}>Built for the heat.</Animated.Text>
      <Animated.Text entering={rise(700)} style={[styles.description, { fontFamily }]}>Smarter practices. Safer athletes. Everything you need to stay one step ahead.</Animated.Text>

      <View style={styles.buttons}>
        <Animated.View entering={rise(900)}>
          <AuthButton label="Continue with Google" loading={pending} disabled={pending} onPress={signIn} icon={<GoogleLogo size={21} />} />
        </Animated.View>
      </View>

      {error && <Text accessibilityRole="alert" style={[styles.error, { fontFamily }]}>{error}</Text>}

      <Animated.Text entering={fade(1200)} style={[styles.legal, { fontFamily }]}>
        By continuing, you agree to our{' '}
        <Text accessibilityRole="link" onPress={() => {}} style={styles.legalLink}>Terms{'\u00A0'}of{'\u00A0'}Service</Text>
        {' '}and{' '}
        <Text accessibilityRole="link" onPress={() => {}} style={styles.legalLink}>Privacy{'\u00A0'}Policy</Text>.
      </Animated.Text>
    </View>
  );
}

function AuthButton({ label, icon, onPress, loading, disabled }: { label: string; icon: ReactNode; onPress: () => void; loading: boolean; disabled: boolean }) {
  const reducedMotion = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const press = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.value * 0.02 }] }));
  const active = hovered || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-busy={loading}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPressIn={() => { press.value = withTiming(1, { duration: reducedMotion ? 0 : 160 }); }}
      onPressOut={() => { press.value = withTiming(0, { duration: reducedMotion ? 0 : 180 }); }}>
      {({ pressed }) => (
        <Animated.View style={[styles.authButton, (active || pressed) && styles.authButtonActive, disabled && !loading && { opacity: 0.55 }, style]}>
          {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : icon}
          <Text style={[styles.authText, { fontFamily }]}>{label}</Text>
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  desktop: { backgroundColor: DESKTOP, alignItems: 'center', justifyContent: 'center' },
  frame: { backgroundColor: SCREEN, borderRadius: 30, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.45)' },
  content: { flex: 1, paddingHorizontal: 22 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  circle: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 0 },
  shadow: { marginTop: -2 },
  headline: { color: '#FFFFFF', fontWeight: '400', letterSpacing: -0.4 },
  description: { color: '#B8B8B8', fontSize: 15, lineHeight: 22, fontWeight: '400', marginTop: 10, maxWidth: 340 },
  buttons: { gap: 14, marginTop: 26 },
  authButton: { height: 58, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  authButtonActive: { borderColor: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.08)' },
  authText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
  legal: { color: '#8E8E8E', fontSize: 11.5, lineHeight: 17, textAlign: 'center', marginTop: 16, paddingHorizontal: 8 },
  legalLink: { color: '#B8B8B8', textDecorationLine: 'underline' },
  error: { color: '#FFB9A7', fontSize: 13, lineHeight: 18, marginTop: 14, textAlign: 'center' },
});
