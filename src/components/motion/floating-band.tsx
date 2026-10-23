import { useIsFocused } from 'expo-router';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { useLoopClock, wave } from '@/lib/motion-engine';

// The HeatSense Band, alive where it sits on its own (empty states, the device card): it floats
// (a 1.5% bob over 3.9 s), tilts ±1.2° on a slower wave, and its shadow breathes with the height.
// One flat render, so only the whole band moves. Frame 0 (Reduce Motion, off screen) is the rest pose.

const LOOP = 15_600; // 4 × 3900 = 3 × 5200, so both waves close the loop together
const BOB = 3900;
const TILT = 5200;

export function FloatingBand({ source, size }: { source: number; size: number }) {
  const focused = useIsFocused();
  const t = useLoopClock(LOOP, focused);
  const band = useAnimatedStyle(() => {
    const lift = (wave(t.value, BOB, 0.75) + 1) / 2; // 0 at rest, 1 at the top
    return { transform: [{ translateY: -size * 0.015 * lift }, { rotate: `${1.2 * wave(t.value, TILT)}deg` }] };
  });
  const shadow = useAnimatedStyle(() => {
    const lift = (wave(t.value, BOB, 0.75) + 1) / 2;
    return { transform: [{ scaleX: 1 - 0.08 * lift }, { scaleY: 1 - 0.08 * lift }] };
  });
  return (
    <View style={{ height: size, width: size }}>
      <Animated.View style={[styles.shadow, { borderRadius: size, bottom: size * 0.06, height: size * 0.07, left: size * 0.25, width: size * 0.5 }, shadow]} />
      <Animated.View style={[StyleSheet.absoluteFill, band]}>
        <Image accessibilityIgnoresInvertColors contentFit="contain" source={source} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: { backgroundColor: 'rgba(0,0,0,0.45)', position: 'absolute' },
});
