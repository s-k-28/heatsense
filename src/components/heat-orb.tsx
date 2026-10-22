import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, G, Path, RadialGradient, Stop } from 'react-native-svg';

import { WOBBLE, buildBlobPath } from '@/components/FerrofluidOrb';

// The Home hero: a living orb tinted by the current heat zone (after WHOOP's Healthspan orb).
// Dark at the core so the reading stays legible, glowing at the rim, with fine sparkles inside.

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Fixed sparkle field in unit coordinates (deterministic, so the orb doesn't reshuffle on render).
const SPARKS = Array.from({ length: 46 }, (_, i) => {
  const a = (i * 137.5 * Math.PI) / 180;
  const r = 0.35 + ((i * 53) % 61) / 100;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r, s: 0.6 + ((i * 31) % 5) * 0.35, o: 0.25 + ((i * 17) % 6) * 0.1 };
});

export function HeatOrb({ color, size = 260, children, still = false }: { color: string; size?: number; children?: ReactNode; still?: boolean }) {
  const reduced = useReducedMotion();
  const moving = !still && !reduced;
  const t = useSharedValue(0);
  useEffect(() => {
    if (moving) t.set(withRepeat(withTiming(1, { duration: 14000, easing: Easing.linear }), -1, false));
  }, [moving, t]);

  const c = size / 2;
  const baseR = size * 0.42;
  const shape = useAnimatedProps(() => {
    'worklet';
    // A gentler wobble than the pairing orb: it should breathe, not boil.
    const radii = WOBBLE.map((w) => 1 + Math.sin((t.value * Math.PI * 2 + w.phase) * w.freq) * w.amp * 0.22);
    return { d: buildBlobPath(c, c, baseR, radii) };
  }, [c, baseR]);

  return (
    <View style={{ height: size, width: size }}>
      <Svg height={size} width={size}>
        <Defs>
          <RadialGradient cx="50%" cy="50%" id="halo" r="50%">
            <Stop offset="0.6" stopColor={color} stopOpacity="0.22" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient cx="46%" cy="40%" id="body" r="62%">
            <Stop offset="0" stopColor="#0B1012" stopOpacity="1" />
            <Stop offset="0.55" stopColor="#0E1518" stopOpacity="1" />
            <Stop offset="0.85" stopColor={color} stopOpacity="0.55" />
            <Stop offset="1" stopColor={color} stopOpacity="0.95" />
          </RadialGradient>
          <ClipPath id="inside"><AnimatedPath animatedProps={shape} /></ClipPath>
        </Defs>
        <Circle cx={c} cy={c} fill="url(#halo)" r={c} />
        <AnimatedPath animatedProps={shape} fill="url(#body)" />
        <G clipPath="url(#inside)">
          {SPARKS.map((p, i) => (
            <Circle cx={c + p.x * baseR} cy={c + p.y * baseR} fill={i % 4 === 0 ? '#FFFFFF' : color} key={i} opacity={p.o} r={p.s} />
          ))}
        </G>
        <AnimatedPath animatedProps={shape} fill="none" stroke={color} strokeOpacity={0.9} strokeWidth={1.5} />
      </Svg>
      <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
