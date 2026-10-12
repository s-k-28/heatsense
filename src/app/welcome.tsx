import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { HeatSenseLogo } from '@/components/heatsense-logo';
import { WelcomeWristband, WristbandShadow, WRISTBAND_ASPECT } from '@/components/welcome-wristband';

const SCREEN = '#222222';
const DESKTOP = '#111111';
const HEADLINE = ['Your', 'Daily', 'Heat', 'Companion'];
const fontFamily = Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif', default: '"Helvetica Neue", Helvetica, Arial, sans-serif' });
const ease = Easing.out(Easing.cubic);
const FLOAT_PX = 10;
// Wider than any phone: show the screen as a centered mobile preview instead of stretching it.
const DESKTOP_BREAKPOINT = 600;

function Chevron() {
  return <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="m9 5 7 7-7 7" /></Svg>;
}

export default function WelcomeScreen() {
  const { width, height } = useWindowDimensions();
  const preview = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;

  if (!preview) return <View style={[styles.fill, { backgroundColor: SCREEN }]}><WelcomeContent /></View>;

  const frameHeight = Math.min(880, height - 48);
  const frameWidth = Math.min(410, Math.round(frameHeight * 0.47));
  return (
    <View style={[styles.fill, styles.desktop]}>
      <View style={[styles.frame, { width: frameWidth, height: frameHeight }]}>
        <WelcomeContent />
      </View>
    </View>
  );
}

function WelcomeContent() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [heroBox, setHeroBox] = useState({ width: 0, height: 0 });

  // Sized from this screen's own box (the phone, or the desktop preview frame).
  const fontSize = Math.max(40, Math.min(52, size.width * 0.125, size.height * 0.066));
  const lineHeight = Math.round(fontSize * 1.28);
  const shadowRoom = 44;
  const heroWidth = Math.max(0, Math.min(size.width * 0.84, 340, (heroBox.height - shadowRoom - FLOAT_PX) * WRISTBAND_ASPECT));

  const entrance = useSharedValue(reducedMotion ? 1 : 0);
  const float = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) return;
    entrance.value = withDelay(1000, withTiming(1, { duration: 800, easing: ease }));
    // One full up-and-down cycle every ~4.6s, starting at 1.5s.
    float.value = withDelay(1500, withRepeat(withTiming(1, { duration: 2300, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => { cancelAnimation(entrance); cancelAnimation(float); };
  }, [entrance, float, reducedMotion]);

  const bandStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [{ translateY: -float.value * FLOAT_PX }, { scale: 0.96 + entrance.value * 0.04 }],
  }));
  // The shadow stays on the floor: smaller and lighter as the band rises.
  const shadowStyle = useAnimatedStyle(() => ({
    opacity: entrance.value * interpolate(float.value, [0, 1], [0.9, 0.55]),
    transform: [{ scaleX: interpolate(float.value, [0, 1], [1, 0.86]) }, { scaleY: interpolate(float.value, [0, 1], [1, 0.8]) }],
  }));

  const fade = (delay: number) => (reducedMotion ? undefined : FadeIn.delay(delay).duration(450));
  const rise = (delay: number) => (reducedMotion ? undefined : FadeInUp.delay(delay).duration(500));
  const next = () => router.push('/sign-in');
  const onLayout = (event: LayoutChangeEvent) => setSize(event.nativeEvent.layout);
  const onHeroLayout = (event: LayoutChangeEvent) => setHeroBox(event.nativeEvent.layout);

  return (
    <View onLayout={onLayout} style={[styles.content, { paddingTop: Math.max(insets.top + 8, 56), paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
      <StatusBar style="light" />
      <View style={styles.topRow}>
        <Animated.View entering={fade(200)} style={styles.meetRow}>
          <HeatSenseLogo height={18} />
          <Text style={[styles.meet, { fontFamily }]}>HeatSense</Text>
        </Animated.View>
        <Animated.View entering={fade(1500)}>
          <Pressable accessibilityRole="button" accessibilityLabel="Continue" onPress={next} hitSlop={8} style={({ pressed }) => [styles.circle, pressed && styles.pressed]}>
            <Chevron />
          </Pressable>
        </Animated.View>
      </View>

      <View accessible accessibilityRole="header" accessibilityLabel="Your Daily Heat Companion" style={styles.headline}>
        {HEADLINE.map((word, index) => (
          <Animated.Text key={word} entering={rise(400 + index * 130)} style={[styles.word, { fontFamily, fontSize, lineHeight }]}>{word}</Animated.Text>
        ))}
      </View>

      <View onLayout={onHeroLayout} style={styles.hero} pointerEvents="none">
        {heroWidth > 0 && <>
          <Animated.View style={bandStyle}><WelcomeWristband width={heroWidth} /></Animated.View>
          <Animated.View style={[styles.shadow, shadowStyle]}><WristbandShadow width={Math.min(230, heroWidth * 0.7)} /></Animated.View>
        </>}
      </View>

      <Animated.View entering={fade(1700)} style={styles.nextRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Next" onPress={next} hitSlop={6} style={({ pressed }) => [styles.next, pressed && styles.pressed]}>
          <Text style={[styles.nextText, { fontFamily }]}>Next →</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  desktop: { backgroundColor: DESKTOP, alignItems: 'center', justifyContent: 'center' },
  frame: { backgroundColor: SCREEN, borderRadius: 30, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.45)' },
  content: { flex: 1, paddingHorizontal: 22 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  meetRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  meet: { color: '#9B9B9B', fontSize: 17, fontWeight: '400' },
  circle: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  headline: { marginTop: 12 },
  word: { color: '#FFFFFF', fontWeight: '400', letterSpacing: -0.4 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 6, marginTop: 12, paddingLeft: 12 },
  shadow: { marginTop: -6 },
  nextRow: { alignItems: 'flex-end' },
  next: { height: 38, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  nextText: { color: '#FFFFFF', fontSize: 15, fontWeight: '400' },
});
