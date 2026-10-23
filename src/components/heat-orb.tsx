import { useAthleteStyles } from '@/components/athlete-appearance';
import { useEffect, useId, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, cancelAnimation, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { EASE_OUT } from '@/lib/motion';
import { useMotionActive } from '@/lib/motion-activity';

const FILL_MS = 900;

const POINTS = 10;
// Per-point (frequency multiplier, phase offset, amplitude) -- irregular on
// purpose so the wobble never looks synchronized/mechanical. Integer frequencies
// keep the end of the repeating phase identical to its beginning.
const WOBBLE = Array.from({ length: POINTS }, (_, i) => ({
  freq: 1 + ((i * 37) % 2),
  phase: (i / POINTS) * Math.PI * 2 + ((i * 53) % 7) * 0.31,
  amp: 0.16 + ((i * 29) % 4) * 0.045,
}));
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



// The Home hero: a living orb tinted by the current heat zone (after WHOOP's Healthspan orb).
// Dark at the core so the reading stays legible, tinted toward the rim in the zone's color.

const AnimatedPath = Animated.createAnimatedComponent(Path);

export function HeatOrb({ color, size = 260, children, still = false }: { color: string; size?: number; children?: ReactNode; still?: boolean }) {
  const styles = useAthleteStyles(baseStyles);
  const moving = useMotionActive(!still);
  const id = useId().replace(/:/g, '');
  const haloId = `halo-${id}`;
  const bodyId = `body-${id}`;
  const t = useSharedValue(0);
  const breath = useSharedValue(0);
  const spin = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(t);
    cancelAnimation(breath);
    cancelAnimation(spin);
    t.set(0);
    breath.set(0);
    spin.set(0);
    if (!moving) return;
    t.set(withRepeat(withTiming(1, { duration: 8000, easing: Easing.linear }), -1, false));
    breath.set(withRepeat(withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }), -1, true));
    spin.set(withRepeat(withTiming(1, { duration: 40000, easing: Easing.linear }), -1, false));
    return () => { cancelAnimation(t); cancelAnimation(breath); cancelAnimation(spin); };
  }, [breath, moving, spin, t]);
  // The orb breathes and slowly turns; the reading on top of it stays still.
  const motion = useAnimatedStyle(() => ({ transform: [{ scale: 0.97 + breath.value * 0.06 }, { rotate: `${spin.value * 360}deg` }] }));

  const c = size / 2;
  const baseR = size * 0.42;
  const shape = useAnimatedProps(() => {
    'worklet';
    // Softer than the pairing orb's wobble: it should breathe, not boil.
    const radii = WOBBLE.map((w) => 1 + Math.sin((t.value * Math.PI * 2 + w.phase) * w.freq) * w.amp * 0.55);
    return { d: buildBlobPath(c, c, baseR, radii) };
  }, [c, baseR]);

  return (
    <View style={{ height: size, width: size }}>
      <Animated.View style={[StyleSheet.absoluteFill, motion]}>
        <Svg height={size} width={size}>
          <Defs>
            <RadialGradient cx="50%" cy="50%" id={haloId} r="50%">
              <Stop offset="0.6" stopColor={color} stopOpacity="0.22" />
              <Stop offset="1" stopColor={color} stopOpacity="0" />
            </RadialGradient>
            <RadialGradient cx="46%" cy="40%" id={bodyId} r="62%">
              <Stop offset="0" stopColor="#0B1012" stopOpacity="1" />
              <Stop offset="0.55" stopColor="#0E1518" stopOpacity="1" />
              <Stop offset="0.85" stopColor={color} stopOpacity="0.55" />
              <Stop offset="1" stopColor={color} stopOpacity="0.7" />
            </RadialGradient>
          </Defs>
          <Circle cx={c} cy={c} fill={`url(#${haloId})`} r={c} />
          <AnimatedPath animatedProps={shape} fill={`url(#${bodyId})`} />
          <AnimatedPath animatedProps={shape} fill="none" stroke={color} strokeOpacity={0.9} strokeWidth={1.5} />
        </Svg>
      </Animated.View>
      <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

/** A ring made of segments. The centre holds whatever you pass as children. */
export function HomeRing({
  children,
  max,
  segments,
  size = 132,
  stroke = 14,
  summary,
}: {
  children?: ReactNode;
  /** The value a full ring stands for. Leave it out and the segments fill the whole ring. */
  max?: number;
  segments: { color: string; value: number }[];
  size?: number;
  stroke?: number;
  summary: string;
}) {
  const styles = useAthleteStyles(baseStyles);
  const reduced = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = max ?? (segments.reduce((sum, segment) => sum + segment.value, 0) || 1);
  const gap = segments.filter((segment) => segment.value > 0).length > 1 ? 4 : 0;
  // Where each segment starts along the ring, worked out before rendering.
  const starts = segments.map((_, i) => segments.slice(0, i).reduce((sum, segment) => sum + (segment.value / total) * c, 0));

  // Fill once on arrival; live countdown updates must not restart the animation.
  const fill = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) { fill.set(1); return; }
    fill.set(0);
    fill.set(withTiming(1, { duration: FILL_MS, easing: EASE_OUT }));
  }, [fill, reduced]);

  return (
    <View accessible accessibilityLabel={summary} style={{ height: size, width: size }}>
      <Svg height={size} width={size}>
        <Circle cx={size / 2} cy={size / 2} fill="none" r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        {segments.map((segment, index) => (segment.value <= 0 ? null : (
          <RingSegment
            circumference={c}
            color={segment.color}
            fill={fill}
            key={index}
            length={Math.max(0, (segment.value / total) * c - gap)}
            r={r}
            size={size}
            start={starts[index]}
            stroke={stroke}
          />
        )))}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function RingSegment({ circumference, color, fill, length, r, size, start, stroke }: { circumference: number; color: string; fill: SharedValue<number>; length: number; r: number; size: number; start: number; stroke: number }) {
  const props = useAnimatedProps(() => ({ strokeDasharray: [length * fill.value, circumference] }));
  return (
    <AnimatedCircle
      animatedProps={props}
      cx={size / 2}
      cy={size / 2}
      fill="none"
      r={r}
      transform={`rotate(-90 ${size / 2} ${size / 2})`}
      stroke={color}
      strokeDashoffset={-start}
      strokeLinecap="round"
      strokeWidth={stroke}
    />
  );
}


const baseStyles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
