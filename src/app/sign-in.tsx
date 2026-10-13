import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState, type ReactElement } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInUp,
  useReducedMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Button } from 'tamagui';

import { GoogleLogo } from '@/components/brand-logos';
import { HeatSenseLogo } from '@/components/heatsense-logo';
import { signInWithGoogle } from '@/services/google-auth';

const SCREEN = '#090909';
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

  const headlineSize = Math.max(34, Math.min(42, size.width * 0.1));

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
      {size.height > 0 && <View pointerEvents="none" style={[styles.imageLayer, { height: size.height * 0.73 }]}>
        <Image source={require('@/assets/images/sign-in-on-field.jpg')} resizeMode="cover" style={styles.trackImage} />
      </View>}
      <LinearGradient pointerEvents="none" colors={['rgba(9,9,9,0.48)', 'rgba(9,9,9,0)', 'rgba(9,9,9,0)']} locations={[0, 0.38, 1]} style={styles.topShade} />
      <LinearGradient pointerEvents="none" colors={['rgba(9,9,9,0)', 'rgba(9,9,9,0.2)', SCREEN, SCREEN]} locations={[0, 0.32, 0.7, 1]} style={styles.bottomShade} />
      <Animated.View entering={fade(150)} style={styles.topRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} hitSlop={8} style={({ pressed }) => [styles.circle, pressed && styles.pressed]}>
          <BackChevron />
        </Pressable>
        <View style={styles.logoPlate}><HeatSenseLogo height={24} /></View>
      </Animated.View>

      <View style={styles.hero} pointerEvents="none" />

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

function AuthButton({ label, icon, onPress, loading, disabled }: { label: string; icon: ReactElement; onPress: () => void; loading: boolean; disabled: boolean }) {
  return (
    <Button
      aria-label={label}
      aria-busy={loading}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      icon={loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : icon}
      height={58}
      borderRadius={999}
      borderWidth={1}
      borderColor="rgba(255,255,255,0.85)"
      backgroundColor="transparent"
      scale="press:0.98"
      opacity={disabled && !loading ? 0.55 : 1}
      gap={12}>
      <Button.Text color="#FFFFFF" fontFamily={fontFamily} fontSize={16} fontWeight="500">{label}</Button.Text>
    </Button>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  desktop: { backgroundColor: DESKTOP, alignItems: 'center', justifyContent: 'center' },
  frame: { backgroundColor: SCREEN, borderRadius: 30, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.45)' },
  content: { flex: 1, paddingHorizontal: 22, backgroundColor: SCREEN, overflow: 'hidden' },
  imageLayer: { position: 'absolute', top: 0, left: 0, right: 0 },
  trackImage: { width: '100%', height: '100%' },
  topShade: { position: 'absolute', top: 0, left: 0, right: 0, height: '32%' },
  bottomShade: { position: 'absolute', top: '33%', bottom: 0, left: 0, right: 0 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoPlate: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(9,9,9,0.62)', alignItems: 'center', justifyContent: 'center' },
  circle: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  hero: { flex: 1, minHeight: 0 },
  headline: { color: '#FFFFFF', fontWeight: '400', letterSpacing: -0.4 },
  description: { color: '#B8B8B8', fontSize: 15, lineHeight: 22, fontWeight: '400', marginTop: 10, maxWidth: 340 },
  buttons: { gap: 14, marginTop: 26 },
  legal: { color: '#8E8E8E', fontSize: 11.5, lineHeight: 17, textAlign: 'center', marginTop: 16, paddingHorizontal: 8 },
  legalLink: { color: '#B8B8B8', textDecorationLine: 'underline' },
  error: { color: '#FFB9A7', fontSize: 13, lineHeight: 18, marginTop: 14, textAlign: 'center' },
});
