import { useEffect, useRef } from 'react';
import { AppState, Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, LinearGradient, Path, Stop } from 'react-native-svg';

import { WristbandShadow } from '@/components/welcome-wristband';

// Layered rig cut from the official mascot artwork (same canvas for every layer):
// the raised arm is its own layer behind the body, so it can rotate at the shoulder,
// and eyelids colored from the surrounding skin close over the original eyes.
const BODY = require('@/assets/images/heatsense-mascot-body.png');
const ARM = require('@/assets/images/heatsense-mascot-arm.png');
const CANVAS = { width: 602, height: 535 };
const SHOULDER = { x: 491, y: 276 };
const EYES = {
  left: { cx: 194.5, cy: 239, rx: 54, ry: 55, top: '#F09C5D', bottom: '#EF9557' },
  right: { cx: 384.5, cy: 197, rx: 50, ry: 56, top: '#F0A666', bottom: '#F0A262' },
} as const;
export const MASCOT_ASPECT = CANVAS.width / CANVAS.height;

const pct = (value: number, total: number) => `${(value / total) * 100}%` as const;
const ease = Easing.inOut(Easing.sin);
const random = (min: number, max: number) => min + Math.random() * (max - min);

export type MascotReaction = { kind: 'coach' | 'athlete'; id: number } | null;

function Eyelid({ eye, closed }: { eye: keyof typeof EYES; closed: SharedValue<number> }) {
  const e = EYES[eye];
  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: closed.value }] }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.lid,
        { left: pct(e.cx - e.rx, CANVAS.width), top: pct(e.cy - e.ry, CANVAS.height), width: pct(e.rx * 2, CANVAS.width), height: pct(e.ry * 2, CANVAS.height) },
        style,
      ]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={`lid-${eye}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={e.top} />
            <Stop offset="1" stopColor={e.bottom} />
          </LinearGradient>
        </Defs>
        <Ellipse cx={50} cy={50} rx={50} ry={50} fill={`url(#lid-${eye})`} />
        {/* Closed-eye lash line. */}
        <Path d="M22 58 Q50 80 78 58" stroke="#3A2010" strokeWidth={7} strokeLinecap="round" fill="none" />
      </Svg>
    </Animated.View>
  );
}

export function HeatSenseMascot({ height, reaction }: { height: number; reaction?: MascotReaction }) {
  const reducedMotion = useReducedMotion();
  const width = height * MASCOT_ASPECT;

  const entrance = useSharedValue(reducedMotion ? 1 : 0);
  const float = useSharedValue(0);
  const tilt = useSharedValue(0);
  const bounce = useSharedValue(0);
  const squash = useSharedValue(0);
  const wave = useSharedValue(0);
  const lidLeft = useSharedValue(0);
  const lidRight = useSharedValue(0);

  // Timers schedule discrete gestures (blink, wink, wave); the motion itself runs on the UI thread.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const busyUntil = useRef(0);

  useEffect(() => {
    if (reducedMotion) return;
    const later = (ms: number, fn: () => void) => { timers.current.push(setTimeout(fn, ms)); };
    const isBusy = () => Date.now() < busyUntil.current;
    const reserve = (ms: number) => { busyUntil.current = Date.now() + ms; };

    // Each eyelid needs its own animation object, so build the sequence per eye.
    const blinkSequence = (double: boolean) => {
      const once = () => withSequence(withTiming(1, { duration: 70 }), withTiming(0, { duration: 90 }));
      return double ? withSequence(once(), withDelay(140, once())) : once();
    };
    const blink = (double = false) => {
      lidLeft.set(blinkSequence(double));
      lidRight.set(blinkSequence(double));
    };
    const wink = () => {
      reserve(600);
      lidRight.set(withSequence(withTiming(1, { duration: 90 }), withDelay(260, withTiming(0, { duration: 130 }))));
    };
    const doWave = (swings = 3) => {
      const steps = [];
      for (let i = 0; i < swings; i += 1) steps.push(withTiming(-15, { duration: 160, easing: ease }), withTiming(12, { duration: 200, easing: ease }));
      reserve(swings * 360 + 260);
      wave.set(withSequence(...steps, withTiming(0, { duration: 240, easing: ease })));
    };

    const scheduleBlink = () => later(random(4000, 7000), () => { if (!isBusy()) blink(Math.random() < 0.2); scheduleBlink(); });
    const scheduleWink = () => later(random(10000, 15000), () => { if (isBusy()) later(1500, wink); else wink(); scheduleWink(); });
    const scheduleWave = () => later(random(15000, 20000), () => { if (!isBusy()) doWave(2); scheduleWave(); });

    const startIdle = () => {
      float.set(withRepeat(withTiming(1, { duration: 2000, easing: ease }), -1, true));
      // A slower, unsynchronized tilt keeps the hover from looking mechanical.
      tilt.set(withRepeat(withSequence(withTiming(1.5, { duration: 2700, easing: ease }), withTiming(-1.5, { duration: 2700, easing: ease })), -1, true));
      scheduleBlink(); scheduleWink(); scheduleWave();
    };
    const stopAll = () => {
      timers.current.forEach(clearTimeout); timers.current = [];
      [float, tilt, wave, lidLeft, lidRight, bounce, squash].forEach((value) => cancelAnimation(value));
    };

    // Entrance: appear at 0.3s, wave at 1.0s, blink at 1.9s, idle from 2.2s.
    entrance.set(withDelay(300, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })));
    reserve(2200);
    later(1000, () => doWave(3));
    later(1900, () => blink());
    later(2200, startIdle);

    // Pause everything while the app is in the background.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') { stopAll(); startIdle(); } else stopAll();
    });
    return () => { sub.remove(); stopAll(); };
  }, [bounce, entrance, float, lidLeft, lidRight, reducedMotion, squash, tilt, wave]);

  // React to role choices without affecting the selection itself.
  const lastReaction = useRef(reaction?.id ?? 0);
  useEffect(() => {
    if (!reaction || reaction.id === lastReaction.current || reducedMotion) return;
    lastReaction.current = reaction.id;
    busyUntil.current = Date.now() + 1300;
    if (reaction.kind === 'coach') {
      bounce.set(withSequence(withTiming(6, { duration: 160, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 260, easing: Easing.in(Easing.quad) })));
      lidLeft.set(withDelay(380, withSequence(withTiming(1, { duration: 70 }), withTiming(0, { duration: 90 }))));
      lidRight.set(withDelay(380, withSequence(withTiming(1, { duration: 70 }), withTiming(0, { duration: 90 }))));
    } else {
      wave.set(withSequence(withTiming(-15, { duration: 160, easing: ease }), withTiming(12, { duration: 200, easing: ease }), withTiming(-15, { duration: 200, easing: ease }), withTiming(0, { duration: 240, easing: ease })));
      lidRight.set(withDelay(820, withSequence(withTiming(1, { duration: 90 }), withDelay(240, withTiming(0, { duration: 130 })))));
    }
  }, [bounce, lidLeft, lidRight, reaction, reducedMotion, wave]);

  const onTap = () => {
    if (reducedMotion) return;
    busyUntil.current = Date.now() + 900;
    squash.set(withSequence(withTiming(1, { duration: 110 }), withTiming(-0.6, { duration: 140 }), withTiming(0, { duration: 180 })));
    wave.set(withSequence(withTiming(-15, { duration: 150, easing: ease }), withTiming(12, { duration: 190, easing: ease }), withTiming(0, { duration: 220, easing: ease })));
  };

  const bodyStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [
      { translateY: (1 - entrance.value) * 15 - float.value * 7 - bounce.value },
      { rotate: `${tilt.value}deg` },
      { scale: 0.9 + entrance.value * 0.1 },
      { scaleX: 1 + squash.value * 0.03 },
      { scaleY: 1 - squash.value * 0.03 },
    ],
  }));
  const armStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${wave.value}deg` }] }));
  // Shadow stays on the floor: smaller and lighter as the mascot rises.
  const shadowStyle = useAnimatedStyle(() => ({
    opacity: entrance.value * (0.85 - float.value * 0.3 - bounce.value * 0.03),
    transform: [{ scale: 1 - float.value * 0.12 - bounce.value * 0.015 }],
  }));

  return (
    <View style={styles.wrap}>
      <Pressable accessibilityRole="button" accessibilityLabel="HeatSense companion. Tap to say hi." onPress={onTap}>
        <Animated.View style={[{ width, height, transformOrigin: '50% 100%' }, bodyStyle]}>
          <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: `${pct(SHOULDER.x, CANVAS.width)} ${pct(SHOULDER.y, CANVAS.height)}` }, armStyle]}>
            <Image source={ARM} style={styles.layer} resizeMode="contain" />
          </Animated.View>
          <Image source={BODY} style={[StyleSheet.absoluteFill, styles.layer]} resizeMode="contain" />
          <Eyelid eye="left" closed={lidLeft} />
          <Eyelid eye="right" closed={lidRight} />
        </Animated.View>
      </Pressable>
      <Animated.View pointerEvents="none" style={[styles.shadow, shadowStyle]}>
        <WristbandShadow width={Math.max(90, Math.min(120, width * 0.5))} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  layer: { width: '100%', height: '100%' },
  lid: { position: 'absolute', transformOrigin: '50% 0%' },
  shadow: { marginTop: -6 },
});
