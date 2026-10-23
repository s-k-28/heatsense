import { useIsFocused } from 'expo-router';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { EASE_OUT, useLoopClock } from '@/lib/motion-engine';

// A live status dot that beats at the athlete's heart rate: a quick 18% swell and a slower
// settle, then rest until the next beat. Still when the signal is stale, off screen, or with
// Reduce Motion.

export function HeartbeatDot({ bpm, color, size = 10, live, style }: { bpm: number; color: string; size?: number; live: boolean; style?: StyleProp<ViewStyle> }) {
  const focused = useIsFocused();
  const period = Math.round(60_000 / Math.max(40, Math.min(200, bpm || 60)));
  const t = useLoopClock(period, live && focused);
  const beat = useAnimatedStyle(() => {
    const p = t.value / period;
    const swell = p < 0.12 ? EASE_OUT(p / 0.12) : p < 0.4 ? 1 - EASE_OUT((p - 0.12) / 0.28) : 0;
    return { transform: [{ scale: 1 + 0.18 * swell }] };
  });
  return <Animated.View style={[{ backgroundColor: color, borderRadius: size / 2, height: size, width: size }, style, beat]} />;
}
