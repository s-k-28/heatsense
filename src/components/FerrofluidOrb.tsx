import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Palette } from '@/constants/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// One continuous blob outline -- N points around a circle, each point's
// radius wobbling on its own sine (different frequency + phase), connected
// by a smooth Catmull-Rom-derived closed bezier curve. This is what makes
// it read as one fluid membrane instead of a cluster of separate circles:
// there is exactly one filled path, with a smooth (not polygonal) edge.
const POINTS = 10;
// Per-point (frequency multiplier, phase offset, amplitude) -- irregular on
// purpose so the wobble never looks synchronized/mechanical.
const WOBBLE = Array.from({ length: POINTS }, (_, i) => ({
  freq: 0.7 + ((i * 37) % 5) * 0.18,
  phase: (i / POINTS) * Math.PI * 2 + ((i * 53) % 7) * 0.31,
  amp: 0.16 + ((i * 29) % 4) * 0.045,
}));
// Fixed, irregular per-point radius multipliers for the static "rest" pose
// -- deliberately uneven so it reads as a spiky frozen blob, not a circle.
const REST_MULT = [1, 0.82, 1.18, 0.9, 1.24, 0.88, 1.1, 0.95, 1.16, 0.86];

function buildBlobPath(cx: number, cy: number, baseR: number, radii: number[]): string {
  'worklet';
  const n = radii.length;
  const pts = radii.map((r, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + Math.cos(a) * baseR * r, y: cy + Math.sin(a) * baseR * r };
  });
  // Catmull-Rom -> cubic bezier, closed loop.
  let d = `M ${pts[0].x} ${pts[0].y} `;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += `C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y} `;
  }
  return `${d} Z`;
}

export default function FerrofluidOrb({
  size = 150,
  state = 'connecting',
}: {
  size?: number;
  /** "connecting": the blob keeps reshaping. "rest": frozen spiky pose (idle, stable connection, or no device found). */
  state?: 'connecting' | 'rest';
}) {
  const reduceMotion = useReducedMotion();
  const connecting = state === 'connecting' && !reduceMotion;
  const t = useSharedValue(0);

  useEffect(() => {
    if (!connecting) return;
    t.value = withRepeat(withTiming(1, { duration: 9000, easing: Easing.linear }), -1, false);
  }, [connecting, t]);

  const cx = size / 2;
  const cy = size / 2;
  const baseR = size * 0.3;

  const animatedProps = useAnimatedProps(() => {
    'worklet';
    const radii = connecting
      ? WOBBLE.map((w) => 1 + Math.sin((t.value * Math.PI * 2 + w.phase) * w.freq) * w.amp)
      : REST_MULT;
    return { d: buildBlobPath(cx, cy, baseR, radii) };
  }, [connecting, cx, cy, baseR]);

  return (
    <View style={[styles.disc, { width: size, height: size, borderRadius: size / 2 }]}>
      <Svg height={size} width={size}>
        <AnimatedPath animatedProps={animatedProps} fill={Palette.ink} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    backgroundColor: Palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
    overflow: 'hidden',
  },
});
