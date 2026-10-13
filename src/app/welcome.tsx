import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { AppState, Platform, StyleSheet, Text, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DepthButton } from '@/components/ui/depth-button';
import { WelcomeWristband } from '@/components/welcome-wristband';

const SCREEN = '#080808';
const TITLE = 'Welcome to HeatSense';
const fontFamily = Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif', default: '"Helvetica Neue", Helvetica, Arial, sans-serif' });
const DESKTOP_BREAKPOINT = 600;

export default function WelcomeScreen() {
  const { width, height } = useWindowDimensions();
  const preview = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;

  if (!preview) return <View style={styles.fill}><WelcomeContent /></View>;

  const frameHeight = Math.min(880, height - 48);
  const frameWidth = Math.min(410, Math.round(frameHeight * 0.47));
  return (
    <View style={styles.desktop}>
      <View style={[styles.frame, { width: frameWidth, height: frameHeight }]}>
        <WelcomeContent />
      </View>
    </View>
  );
}

function WelcomeContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [visibleChars, setVisibleChars] = useState(reducedMotion ? TITLE.length : 0);
  const heroWidth = size.width * 1.32;
  const heroTop = Math.max(insets.top + 22, size.height * 0.075);
  const titleStyle = [styles.title, { fontFamily, fontSize: Math.min(30, Math.max(24, size.width * 0.075)) }];
  const onLayout = (event: LayoutChangeEvent) => setSize(event.nativeEvent.layout);

  useFocusEffect(useCallback(() => {
    if (reducedMotion) {
      setVisibleChars(TITLE.length);
      return;
    }

    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      if (timer) clearInterval(timer);
      let nextChar = 0;
      setVisibleChars(0);
      timer = setInterval(() => {
        nextChar += 1;
        setVisibleChars(nextChar);
        if (nextChar >= TITLE.length && timer) clearInterval(timer);
      }, 48);
    };

    start();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
    });
    return () => {
      if (timer) clearInterval(timer);
      subscription.remove();
    };
  }, [reducedMotion]));

  return (
    <View onLayout={onLayout} style={styles.content}>
      <StatusBar style="light" />

      {size.width > 0 && (
        <View pointerEvents="none" style={[styles.hero, { top: heroTop, left: (size.width - heroWidth) / 2 }]}>
          <WelcomeWristband width={heroWidth} />
        </View>
      )}

      <LinearGradient
        pointerEvents="none"
        colors={['rgba(8,8,8,0)', 'rgba(8,8,8,0.72)', SCREEN, SCREEN]}
        locations={[0, 0.35, 0.7, 1]}
        style={styles.bottomShade}
      />

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 20) + 24 }]}>
        <View accessible accessibilityRole="header" accessibilityLabel={TITLE} style={styles.titleWrap}>
          <Text aria-hidden accessibilityElementsHidden style={[titleStyle, styles.titleMeasure]}>{TITLE}</Text>
          <Text aria-hidden accessibilityElementsHidden style={[titleStyle, styles.typedTitle]}>{TITLE.slice(0, visibleChars)}</Text>
        </View>
        <Text style={[styles.subtitle, { fontFamily }]}>Check the heat before practice.</Text>
        <View style={styles.buttonWrap}>
          <DepthButton label="Get started" onPress={() => router.push('/sign-in')} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: SCREEN },
  desktop: { flex: 1, backgroundColor: '#111111', alignItems: 'center', justifyContent: 'center' },
  frame: { backgroundColor: SCREEN, borderRadius: 30, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.45)' },
  content: { flex: 1, backgroundColor: SCREEN, overflow: 'hidden' },
  hero: { position: 'absolute' },
  bottomShade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%' },
  bottom: { marginTop: 'auto', paddingHorizontal: 28 },
  title: { color: '#FFFFFF', fontSize: 30, lineHeight: 37, fontWeight: '600', letterSpacing: -0.8 },
  titleWrap: { position: 'relative' },
  titleMeasure: { opacity: 0 },
  typedTitle: { position: 'absolute', top: 0, left: 0, right: 0 },
  subtitle: { color: '#F2EEEB', fontSize: 18, fontWeight: '500', lineHeight: 26, marginTop: 15 },
  buttonWrap: { marginTop: 34 },
});
