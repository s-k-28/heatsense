import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { WOBBLE, buildBlobPath } from '@/components/FerrofluidOrb';

// The Home hero: a living orb tinted by the current heat zone (after WHOOP's Healthspan orb).
// Dark at the core so the reading stays legible, tinted toward the rim in the zone's color.

const AnimatedPath = Animated.createAnimatedComponent(Path);

export function HeatOrb({ color, size = 260, children, still = false }: { color: string; size?: number; children?: ReactNode; still?: boolean }) {
  const reduced = useReducedMotion();
  const moving = !still && !reduced;
  const t = useSharedValue(0);
  const breath = useSharedValue(0);
  const spin = useSharedValue(0);
  useEffect(() => {
    if (!moving) return;
    t.set(withRepeat(withTiming(1, { duration: 8000, easing: Easing.linear }), -1, false));
    breath.set(withRepeat(withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }), -1, true));
    spin.set(withRepeat(withTiming(1, { duration: 40000, easing: Easing.linear }), -1, false));
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
            <RadialGradient cx="50%" cy="50%" id="halo" r="50%">
              <Stop offset="0.6" stopColor={color} stopOpacity="0.22" />
              <Stop offset="1" stopColor={color} stopOpacity="0" />
            </RadialGradient>
            <RadialGradient cx="46%" cy="40%" id="body" r="62%">
              <Stop offset="0" stopColor="#0B1012" stopOpacity="1" />
              <Stop offset="0.55" stopColor="#0E1518" stopOpacity="1" />
              <Stop offset="0.85" stopColor={color} stopOpacity="0.55" />
              <Stop offset="1" stopColor={color} stopOpacity="0.7" />
            </RadialGradient>
          </Defs>
          <Circle cx={c} cy={c} fill="url(#halo)" r={c} />
          <AnimatedPath animatedProps={shape} fill="url(#body)" />
          <AnimatedPath animatedProps={shape} fill="none" stroke={color} strokeOpacity={0.9} strokeWidth={1.5} />
        </Svg>
      </Animated.View>
      <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
