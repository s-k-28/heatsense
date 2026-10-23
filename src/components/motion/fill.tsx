import { useEffect, useRef, useState } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { EASE_OUT } from '@/lib/motion-engine';

// A progress fill (effort, battery, time in a zone, the immersion clock). It grows from the left
// when it first appears, and glides to new values after that, so a bar never jumps. The bar slides
// in from the left (transform only) rather than changing width, so its rounded end keeps its shape.

export function Fill({ progress, color, height = 6, radius, track = 'rgba(235,235,245,0.08)', delay = 0, style }: {
  /** 0 to 1. */
  progress: number;
  color: string;
  height?: number;
  /** Corner radius; half the height by default. */
  radius?: number;
  track?: string;
  /** Stagger for the first draw, in ms. */
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const p = Math.max(0, Math.min(1, progress));
  const shown = useSharedValue(reduced ? p : 0);
  const drawn = useRef(false);

  useEffect(() => {
    if (!width) return;
    if (reduced) { shown.value = p; return; }
    shown.value = drawn.current
      ? withTiming(p, { duration: 600, easing: EASE_OUT })
      : withDelay(delay, withTiming(p, { duration: 700, easing: EASE_OUT }));
    drawn.current = true;
  }, [delay, p, reduced, shown, width]);

  const r = radius ?? height / 2;
  const bar = useAnimatedStyle(() => ({ transform: [{ translateX: -(1 - shown.value) * width }] }));
  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={[{ backgroundColor: track, borderRadius: r, height, overflow: 'hidden' }, style]}>
      <Animated.View style={[{ backgroundColor: color, borderRadius: r, height, width: '100%' }, bar]} />
    </View>
  );
}
