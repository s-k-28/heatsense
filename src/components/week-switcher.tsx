import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  type EasingFunction,
  type EasingFunctionFactory,
  cancelAnimation,
  interpolate,
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, LinearGradient as SvgGradient, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { SAMPLE_UIL_CLASS, ZONES, type Zone } from '@/lib/practice';
import { classifyWbgt } from '@/lib/uil-wbgt';
import { useTemperature } from '@/state/preferences';

// "A look at this week": a card whose sky, icon, figure and labels transition as you switch days.
// Adapted from the transitions.dev Weather Day Switcher. Durations, easings and the reduced-motion
// fallback follow the original. React Native can't blur a view, so the 2px blur on the icon, digit,
// text and day-name transitions is dropped and the opacity, scale and distance parts are kept.
// The figure is the forecast WBGT for that practice day, not air temperature.

const ease = Easing.bezier(0.42, 0, 0.58, 1); // CSS ease-in-out
const smoothOut = Easing.bezier(0.22, 1, 0.36, 1);

const M = {
  tabsDur: 250,
  tabsEase: smoothOut,
  iconDur: 250,
  iconStartScale: 0.25,
  digitDur: 500,
  digitDistance: 8,
  digitStagger: 70,
  digitEase: Easing.bezier(0.34, 1.45, 0.64, 1),
  textDur: 150,
  textDistance: 4,
  morphDur: 180,
  skyFade: 700,
  driftDur: 16000,
  driftDistance: 18,
  rainDur: 800,
  flashDur: 7000,
  spinDur: 30000,
  floatDur: 4000,
  floatDistance: 3,
  dropDur: 1100,
  pressScale: 0.99,
} as const;

type SkyKey = 'clear' | 'cloudy' | 'rain' | 'storm';
type IconKey = 'sun' | 'cloud' | 'rain' | 'bolt';

type Day = { abbr: string; condition: string; highF: number; icon: IconKey; lowF: number; name: string; sky: SkyKey; wbgtF: number; zone: Zone };

// Sample forecast until a weather feed exists. Each day's zone comes from the UIL chart for the
// sample school's class, never typed in by hand.
const DAYS: Day[] = ([
  { abbr: 'Mon', name: 'Monday', icon: 'sun', sky: 'clear', condition: 'Sunny', wbgtF: 84, highF: 94, lowF: 76 },
  { abbr: 'Tue', name: 'Tuesday', icon: 'cloud', sky: 'cloudy', condition: 'Cloudy', wbgtF: 79, highF: 88, lowF: 74 },
  { abbr: 'Wed', name: 'Wednesday', icon: 'rain', sky: 'rain', condition: 'Light rain', wbgtF: 72, highF: 81, lowF: 70 },
  { abbr: 'Thu', name: 'Thursday', icon: 'bolt', sky: 'storm', condition: 'Thunderstorms', wbgtF: 76, highF: 84, lowF: 71 },
  { abbr: 'Fri', name: 'Friday', icon: 'sun', sky: 'clear', condition: 'Sunny', wbgtF: 91, highF: 99, lowF: 79 },
] as Omit<Day, 'zone'>[]).map((day) => ({ ...day, zone: classifyWbgt(day.wbgtF, SAMPLE_UIL_CLASS)! }));

const ICON_PATH: Record<IconKey, string> = {
  sun: 'M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z',
  cloud: 'M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848 5.25 5.25 0 0 0-10.233 2.33A4.502 4.502 0 0 0 2.25 15Z',
  rain: 'M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848 5.25 5.25 0 0 0-10.233 2.33A4.502 4.502 0 0 0 2.25 15Z',
  bolt: 'm3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z',
};

/* ─────────────────────────────── Sky ─────────────────────────────── */

const SKIES: Record<SkyKey, readonly [string, string, ...string[]]> = {
  clear: ['#1f6fd1', '#2f7fdb', '#3b8ae0'],
  cloudy: ['#4e6a85', '#7a91a8'],
  rain: ['#3f5266', '#5f7388'],
  storm: ['#323b47', '#56616e'],
};

function SkyLayer({ active, children, sky }: { active: boolean; children: ReactNode; sky: SkyKey }) {
  const opacity = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    opacity.set(withTiming(active ? 1 : 0, { duration: M.skyFade, easing: ease }));
  }, [active, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <LinearGradient colors={SKIES[sky]} locations={sky === 'clear' ? [0, 0.55, 1] : undefined} style={StyleSheet.absoluteFill} />
      {children}
    </Animated.View>
  );
}

/** A soft drifting light. */
function Blob({ alpha, color, durationScale = 1, ellipse, height, id, reduced, reverse, style, width }: {
  alpha: number; color: string; durationScale?: number; ellipse?: boolean; height: number; id: string; reduced: boolean; reverse?: boolean;
  style: { bottom?: number; left?: number; right?: number; top?: number }; width: number;
}) {
  const p = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    p.set(withRepeat(withTiming(1, { duration: M.driftDur * durationScale, easing: ease }), -1, true));
    return () => cancelAnimation(p);
  }, [durationScale, p, reduced]);
  const drift = useAnimatedStyle(() => {
    const q = reverse ? 1 - p.value : p.value;
    return { transform: [{ translateX: M.driftDistance * q }, { translateY: -M.driftDistance * 0.6 * q }, { scale: 1 + 0.08 * q }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ height, position: 'absolute', width }, style, drift]}>
      <Svg height={height} width={width}>
        <Defs>
          <RadialGradient cx="50%" cy="50%" id={id} rx="50%" ry="50%">
            <Stop offset="0" stopColor={`rgb(${color})`} stopOpacity={alpha} />
            <Stop offset={ellipse ? 0.68 : 0.65} stopColor={`rgb(${color})`} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={width / 2} cy={height / 2} fill={`url(#${id})`} rx={width / 2} ry={height / 2} />
      </Svg>
    </Animated.View>
  );
}

function useLoop(active: boolean, duration: number, easing: EasingFunction | EasingFunctionFactory, reverse = false) {
  const p = useSharedValue(0);
  useEffect(() => {
    if (!active) {
      cancelAnimation(p);
      return;
    }
    p.set(0);
    p.set(withRepeat(withTiming(1, { duration, easing }), -1, reverse));
    return () => cancelAnimation(p);
  }, [active, duration, easing, p, reverse]);
  return p;
}

function RainDrop({ i, p }: { i: number; p: SharedValue<number> }) {
  const x = Math.min((i * 37) % 100 + (i % 3) * 2, 112);
  const phase = (i * 0.618) % 1;
  const length = 12 + ((i * 7) % 10);
  const style = useAnimatedStyle(() => {
    const q = (p.value + phase) % 1;
    return { transform: [{ translateX: -50 * q }, { translateY: 380 * q }, { rotate: '8deg' }] };
  });
  return (
    <Animated.View style={[{ borderRadius: 1, height: length, left: `${x}%`, overflow: 'hidden', position: 'absolute', top: -24, width: 1.5 }, style]}>
      <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.42)']} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

function RainLayer({ active, count, reduced }: { active: boolean; count: number; reduced: boolean }) {
  const p = useLoop(active && !reduced, M.rainDur, Easing.linear);
  if (reduced) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: count }, (_, i) => <RainDrop i={i} key={i} p={p} />)}
    </View>
  );
}

function FlashLayer({ active, reduced }: { active: boolean; reduced: boolean }) {
  const p = useLoop(active && !reduced, M.flashDur, Easing.linear);
  const style = useAnimatedStyle(() => ({ opacity: interpolate(p.value, [0, 0.86, 0.88, 0.89, 0.91, 1], [0, 0, 0.4, 0.08, 0.3, 0]) }));
  if (reduced) return null;
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg height="100%" width="100%">
        <Defs>
          <RadialGradient cx="70%" cy="0%" id="wx-flash" rx="80%" ry="60%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.5} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect fill="url(#wx-flash)" height="100%" width="100%" />
      </Svg>
    </Animated.View>
  );
}

function Backdrop({ reduced, sky }: { reduced: boolean; sky: SkyKey }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <SkyLayer active={sky === 'clear'} sky="clear">
        <Blob alpha={0.32} color="110,190,255" durationScale={1.3} height={280} id="wx-cool" reduced={reduced} reverse style={{ left: -130, top: 70 }} width={280} />
        <Blob alpha={0.34} color="255,200,120" height={240} id="wx-glow" reduced={reduced} style={{ bottom: -110, right: -110 }} width={240} />
      </SkyLayer>
      <SkyLayer active={sky === 'cloudy'} sky="cloudy">
        <Blob alpha={0.2} color="255,255,255" ellipse height={170} id="wx-cloud1" reduced={reduced} style={{ left: -90, top: 110 }} width={300} />
        <Blob alpha={0.16} color="255,255,255" durationScale={1.25} ellipse height={150} id="wx-cloud2" reduced={reduced} reverse style={{ bottom: 30, right: -90 }} width={240} />
      </SkyLayer>
      <SkyLayer active={sky === 'rain'} sky="rain">
        <Blob alpha={0.22} color="170,200,230" ellipse height={200} id="wx-mist" reduced={reduced} style={{ bottom: -40, left: -60 }} width={320} />
        <RainLayer active={sky === 'rain'} count={14} reduced={reduced} />
      </SkyLayer>
      <SkyLayer active={sky === 'storm'} sky="storm">
        <Blob alpha={0.2} color="140,160,190" ellipse height={200} id="wx-storm" reduced={reduced} style={{ right: -100, top: 40 }} width={300} />
        <RainLayer active={sky === 'storm'} count={20} reduced={reduced} />
        <FlashLayer active={sky === 'storm'} reduced={reduced} />
      </SkyLayer>
    </View>
  );
}

/* ─────────────────────────────── Icon ─────────────────────────────── */

function WeatherGlyph({ color, kind, size, strokeWidth }: { color: string; kind: IconKey; size: number; strokeWidth: number }) {
  return (
    <Svg fill="none" height={size} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} viewBox="0 0 24 24" width={size}>
      <Path d={ICON_PATH[kind]} />
    </Svg>
  );
}

function Drop({ delay, reduced }: { delay: number; reduced: boolean }) {
  const p = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    p.set(withDelay(delay, withRepeat(withTiming(1, { duration: M.dropDur, easing: Easing.in(Easing.ease) }), -1, false)));
    return () => cancelAnimation(p);
  }, [delay, p, reduced]);
  const style = useAnimatedStyle(() => (reduced ? { opacity: 1 } : { opacity: interpolate(p.value, [0, 0.3, 1], [0, 1, 0]), transform: [{ translateY: interpolate(p.value, [0, 1], [-2, 10]) }] }));
  return <Animated.View style={[styles.drop, style]} />;
}

function IconLayer({ active, kind, reduced }: { active: boolean; kind: IconKey; reduced: boolean }) {
  const swap = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    swap.set(withTiming(active ? 1 : 0, { duration: M.iconDur, easing: ease }));
  }, [active, swap]);
  const running = active && !reduced;
  const spin = useLoop(running && kind === 'sun', M.spinDur, Easing.linear);
  const float = useLoop(running && (kind === 'cloud' || kind === 'rain'), M.floatDur, ease, true);
  const flicker = useLoop(running && kind === 'bolt', M.floatDur * 1.5, Easing.linear);

  const layer = useAnimatedStyle(() => ({
    opacity: swap.value,
    transform: reduced ? [] : [{ scale: M.iconStartScale + (1 - M.iconStartScale) * swap.value }],
  }));
  const idle = useAnimatedStyle(() => {
    if (kind === 'sun') return { transform: [{ rotate: `${360 * spin.value}deg` }] };
    if (kind === 'bolt') {
      return {
        opacity: interpolate(flicker.value, [0, 0.7, 0.74, 0.78, 1], [1, 1, 0.55, 1, 1]),
        transform: [{ scale: interpolate(flicker.value, [0, 0.7, 0.74, 0.78, 1], [1, 1, 0.97, 1.02, 1]) }],
      };
    }
    return { transform: [{ translateY: -M.floatDistance + 2 * M.floatDistance * float.value }] };
  });
  const color = kind === 'sun' || kind === 'bolt' ? '#FFD75E' : '#FFFFFF';

  return (
    <Animated.View pointerEvents="none" style={[styles.iconLayer, layer]}>
      <Animated.View style={[styles.iconIdle, idle]}>
        <WeatherGlyph color={color} kind={kind} size={48} strokeWidth={2.1} />
      </Animated.View>
      {kind === 'rain' ? (
        <View style={styles.drops}>
          <Drop delay={0} reduced={reduced} />
          <Drop delay={M.dropDur * 0.35} reduced={reduced} />
          <Drop delay={M.dropDur * 0.7} reduced={reduced} />
        </View>
      ) : null}
    </Animated.View>
  );
}

function BigIcon({ reduced, state }: { reduced: boolean; state: IconKey }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.big}>
      {(['sun', 'cloud', 'rain', 'bolt'] as const).map((kind) => <IconLayer active={state === kind} key={kind} kind={kind} reduced={reduced} />)}
    </View>
  );
}

/* ─────────────────────────────── Text ─────────────────────────────── */

function Digit({ animate, ch, size, stagger }: { animate: boolean; ch: string; size: number; stagger: number }) {
  const p = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (animate) p.set(withDelay(M.digitStagger * stagger, withTiming(1, { duration: M.digitDur, easing: M.digitEase })));
  }, [animate, p, stagger]);
  const style = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, p.value)), transform: [{ translateY: M.digitDistance * (1 - p.value) }] }));
  return <Animated.Text style={[styles.digit, { fontSize: size, lineHeight: size * 1.17 }, style]}>{ch}</Animated.Text>;
}

/** A number whose changed digits pop in from below, the last two a beat apart. Unchanged leading digits stay put. */
function Digits({ reduced, size, value }: { reduced: boolean; size: number; value: string }) {
  const [state, setState] = useState({ key: 0, same: value.length, text: value });
  if (state.text !== value) {
    let same = 0;
    while (same < state.text.length && same < value.length && state.text[same] === value[same]) same += 1;
    setState({ key: state.key + 1, same, text: value });
  }
  const chars = state.text.split('');
  return (
    <View accessibilityLabel={value} accessible style={styles.digits}>
      {chars.map((ch, i) => (
        <Digit animate={!reduced && i >= state.same} ch={ch} key={`${state.key}-${i}`} size={size} stagger={i === chars.length - 2 ? 1 : i === chars.length - 1 ? 2 : 0} />
      ))}
    </View>
  );
}

type Accent = { color: string; label: string };

/** Swaps a label: the old text lifts away, the new text settles in from below. The accent (the zone name) keeps its own color. */
function SwapText({ accent, reduced, style, text }: { accent?: Accent; reduced: boolean; style: object; text: string }) {
  const [shown, setShown] = useState({ accent, text });
  const t = useSharedValue(0);
  const first = useRef(true);
  const key = `${text}|${accent?.label ?? ''}`;
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduced) return;
    t.set(withTiming(-1, { duration: M.textDur, easing: ease }));
    const timer = setTimeout(() => {
      setShown({ accent, text });
      t.set(1);
      t.set(withTiming(0, { duration: M.textDur, easing: ease }));
    }, M.textDur);
    return () => clearTimeout(timer);
    // `key` stands in for text and accent so an unchanged label doesn't replay the swap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reduced, t]);
  const anim = useAnimatedStyle(() => ({ opacity: 1 - Math.abs(t.value), transform: [{ translateY: M.textDistance * t.value }] }));
  // With reduced motion there's no swap, so the label simply shows the current day.
  const label = reduced ? { accent, text } : shown;
  return (
    <Animated.Text style={[style, anim]}>
      {label.text}
      {label.accent ? <> · <Text style={{ color: label.accent.color, fontWeight: '600' }}>{label.accent.label}</Text></> : null}
    </Animated.Text>
  );
}

/** Changes the day name by cross-fading the old into the new. */
function MorphText({ reduced, style, text }: { reduced: boolean; style: object; text: string }) {
  const [pair, setPair] = useState<{ next: string; prev: string | null }>({ next: text, prev: null });
  const p = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setPair((current) => ({ next: text, prev: current.next }));
    if (reduced) {
      p.set(1);
      return;
    }
    p.set(0);
    p.set(withTiming(1, { duration: M.morphDur, easing: smoothOut }));
  }, [p, reduced, text]);
  const incoming = useAnimatedStyle(() => ({ opacity: p.value }));
  const outgoing = useAnimatedStyle(() => ({ opacity: 1 - p.value }));
  return (
    <View>
      <Animated.Text accessibilityLabel={text} style={[style, incoming]}>{pair.next}</Animated.Text>
      {pair.prev && !reduced ? <Animated.Text aria-hidden pointerEvents="none" style={[style, styles.morphOld, outgoing]}>{pair.prev}</Animated.Text> : null}
    </View>
  );
}

/* ─────────────────────────────── Heat through the day ─────────────────────────────── */

// Monday's hourly WBGT, 7 AM to 7 PM. Other days reuse its shape, peaking at their own forecast,
// with a flatter afternoon when cloud or rain keeps the sun off the field.
const SHAPE = [62, 64, 67, 71, 75, 79, 82, 83, 84, 84, 83, 81, 78];
const START_HOUR = 7;
const NOW_HOUR = 16 + 10 / 60; // 4:10 PM, the latest reading today
const PRACTICE: [number, number] = [16, 17.5];
const CURVE_H = 104;
const CURVE_LO = 55;
const CURVE_HI = 93;
const CURVE_TOP = 10;
const CURVE_BOTTOM = 4;
const PRACTICE_ROW = 20;

function dayCurve(day: Day) {
  const flatten = day.sky === 'clear' ? 1 : 0.7;
  return SHAPE.map((value) => day.wbgtF - (SHAPE[8] - value) * flatten);
}

function smoothPath(points: { x: number; y: number }[]) {
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    d += ` C${p1.x + (p2.x - p0.x) / 6},${p1.y + (p2.y - p0.y) / 6} ${p2.x - (p3.x - p1.x) / 6},${p2.y - (p3.y - p1.y) / 6} ${p2.x},${p2.y}`;
  }
  return d;
}

/** One day's curve, drawn whole. Today's line is solid up to the latest reading and dotted after it. */
function CurveLayer({ dayIndex, width }: { dayIndex: number; width: number }) {
  const values = dayCurve(DAYS[dayIndex]);
  const last = values.length - 1;
  const px = (hour: number) => 4 + ((hour - START_HOUR) / last) * (width - 8);
  const py = (value: number) => CURVE_TOP + (1 - (value - CURVE_LO) / (CURVE_HI - CURVE_LO)) * (CURVE_H - CURVE_TOP - CURVE_BOTTOM);
  const valueAt = (hour: number) => {
    const at = Math.min(last, Math.max(0, hour - START_HOUR));
    const i = Math.min(last - 1, Math.floor(at));
    return values[i] + (values[i + 1] - values[i]) * (at - i);
  };
  const isToday = dayIndex === 0;
  const end = isToday ? NOW_HOUR : START_HOUR + last;
  const upTo = (stop: number) => [
    ...values.map((value, i) => ({ x: px(START_HOUR + i), y: py(value) })).filter((point) => point.x < px(stop)),
    { x: px(stop), y: py(valueAt(stop)) },
  ];
  const seen = upTo(end);
  const line = smoothPath(seen);
  const whole = smoothPath(upTo(START_HOUR + last));
  return (
    <Svg height={CURVE_H} style={StyleSheet.absoluteFill} width={width}>
      <Defs>
        <SvgGradient id={`wx-curve-fill-${dayIndex}`} x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.3} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </SvgGradient>
      </Defs>
      <Path d={`${line} L${px(end)},${CURVE_H} L${px(START_HOUR)},${CURVE_H} Z`} fill={`url(#wx-curve-fill-${dayIndex})`} />
      {isToday ? <Path d={whole} fill="none" stroke="rgba(255,255,255,0.5)" strokeDasharray="2 5" strokeLinecap="round" strokeWidth={2} /> : null}
      <Path d={line} fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
      {isToday ? <Circle cx={px(NOW_HOUR)} cy={py(valueAt(NOW_HOUR))} fill={ZONES[DAYS[0].zone].color} r={5.5} stroke="#FFFFFF" strokeWidth={2.5} /> : null}
    </Svg>
  );
}

/**
 * The selected day's heat as one curve over the practice window. Switching days fades the old curve
 * out as the new one fades in. Other days are forecasts, drawn whole.
 */
function DayCurve({ index, reduced }: { index: number; reduced: boolean }) {
  const temp = useTemperature();
  const [width, setWidth] = useState(0);
  const curve = dayCurve(DAYS[index]);
  const last = SHAPE.length - 1;
  const px = (hour: number) => 4 + ((hour - START_HOUR) / last) * (width - 8);
  const label = (hour: number) => `${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 ? 'AM' : 'PM'}`;
  return (
    <View
      accessibilityLabel={`Heat through the day on ${DAYS[index].name}: from ${temp.value(curve[0])} at 7 AM to a peak of ${temp.value(Math.max(...curve))}. Practice runs from 4 to 5:30 PM.`}
      accessible
      style={styles.curve}>
      <Text style={styles.curveTitle}>Heat through the day</Text>
      <View onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)} style={{ height: CURVE_H + PRACTICE_ROW }}>
        {width > 0 ? (
          <>
            {/* The time axis, with practice marked on it as a brighter stretch and its hours. */}
            <Svg height={CURVE_H + PRACTICE_ROW} style={styles.curveAxisLayer} width={width}>
              <Rect fill="rgba(255,255,255,0.18)" height={2} rx={1} width={width - 8} x={4} y={CURVE_H - 1} />
              <Rect fill="#FFFFFF" height={4} rx={2} width={px(PRACTICE[1]) - px(PRACTICE[0])} x={px(PRACTICE[0])} y={CURVE_H - 2} />
              <SvgText fill="#FFFFFF" fontSize={11} fontWeight="600" textAnchor="middle" x={(px(PRACTICE[0]) + px(PRACTICE[1])) / 2} y={CURVE_H + 15}>Practice 4–5:30</SvgText>
            </Svg>
            <Animated.View
              entering={reduced ? undefined : FadeIn.duration(M.digitDur).easing(smoothOut)}
              exiting={reduced ? undefined : FadeOut.duration(M.skyFade / 2)}
              key={index}
              style={StyleSheet.absoluteFill}>
              <CurveLayer dayIndex={index} width={width} />
            </Animated.View>
          </>
        ) : null}
      </View>
      <View style={styles.curveAxis}>
        <Text style={styles.hlText}>{label(START_HOUR)}</Text>
        <Text style={styles.hlText}>{label(START_HOUR + last / 2)}</Text>
        <Text style={styles.hlText}>{label(START_HOUR + last)}</Text>
      </View>
    </View>
  );
}

/* ─────────────────────────────── Day tabs ─────────────────────────────── */

const TAB_GAP = 3;
const TAB_PAD = 3;
const TAB_HEIGHT = 38;

function TabButton({ day, onPress, selected }: { day: Day; onPress: () => void; selected: boolean }) {
  const p = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    p.set(withTiming(selected ? 1 : 0, { duration: M.tabsDur, easing: smoothOut }));
  }, [p, selected]);
  const content = useAnimatedStyle(() => ({ opacity: 0.78 + 0.22 * p.value }));
  return (
    <Pressable
      accessibilityLabel={day.name}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.tab, pressed && { transform: [{ scale: M.pressScale }] }]}>
      <Animated.View style={[styles.tabContent, content]}>
        <WeatherGlyph color="#FFFFFF" kind={day.icon} size={16} strokeWidth={2.25} />
        <Text style={styles.tabLabel}>{day.abbr}</Text>
      </Animated.View>
    </Pressable>
  );
}

function DayTabs({ index, onSelect, reduced }: { index: number; onSelect: (i: number) => void; reduced: boolean }) {
  const [width, setWidth] = useState(0);
  const tabWidth = width > 0 ? (width - TAB_PAD * 2 - TAB_GAP * (DAYS.length - 1)) / DAYS.length : 0;
  const x = useSharedValue(0);
  const placed = useRef(false);
  useEffect(() => {
    if (tabWidth === 0) return;
    const target = index * (tabWidth + TAB_GAP);
    if (!placed.current || reduced) {
      x.set(target);
      placed.current = true;
      return;
    }
    x.set(withTiming(target, { duration: M.tabsDur, easing: M.tabsEase }));
  }, [index, reduced, tabWidth, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }], width: tabWidth }));
  return (
    <View accessibilityLabel="Forecast days" accessibilityRole="tablist" onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)} style={styles.tabs}>
      {tabWidth > 0 ? <Animated.View pointerEvents="none" style={[styles.pill, pill]} /> : null}
      {DAYS.map((day, i) => <TabButton day={day} key={day.abbr} onPress={() => onSelect(i)} selected={i === index} />)}
    </View>
  );
}

/* ─────────────────────────────── Card ─────────────────────────────── */

/**
 * The week's WBGT at a glance: the selected day's figure, sky and zone, with the day tabs underneath. Holding the card drops down the heat through the day. Today uses the
 * team's latest field reading when there is one; other days are the sample forecast.
 */
export function WeekSwitcher({ today }: { today?: { wbgtF: number; zone: Zone } | null }) {
  const reduced = useReducedMotion();
  const temp = useTemperature();
  const [index, setIndex] = useState(0);
  const [hourly, setHourly] = useState(false);
  const base = DAYS[index];
  const day = index === 0 && today ? { ...base, wbgtF: today.wbgtF, zone: today.zone } : base;
  const zone = ZONES[day.zone];
  const toggle = () => setHourly((open) => !open);

  return (
    <Animated.View layout={reduced ? undefined : LinearTransition.duration(260).easing(smoothOut)} style={styles.card}>
      <Backdrop reduced={reduced} sky={day.sky} />
      <Pressable
        accessibilityHint={hourly ? 'Hides the heat through the day' : 'Shows the heat through the day'}
        accessibilityLabel={`${day.name}, ${day.condition}, ${zone.label}. WBGT ${temp.value(day.wbgtF)} degrees. Air high ${temp.value(day.highF)}, low ${temp.value(day.lowF)}.`}
        delayLongPress={280}
        onLongPress={toggle}
        style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.dayRow}>
            <MorphText reduced={reduced} style={styles.day} text={day.name} />
            <Text style={styles.day}> · {index === 0 && today ? 'Field WBGT' : 'WBGT forecast · Sample'}</Text>
          </View>
          <Pressable accessibilityRole="button" hitSlop={10} onPress={toggle}>
            <Text style={styles.hint}>Hourly heat {hourly ? '▴' : '▾'}</Text>
          </Pressable>
        </View>
        <View style={styles.hero}>
          <View style={styles.temp}>
            <Digits reduced={reduced} size={46} value={String(temp.value(day.wbgtF))} />
            <Text style={styles.deg}>°</Text>
          </View>
          <View style={styles.condBlock}>
            <SwapText accent={{ color: zone.text, label: zone.label }} reduced={reduced} style={styles.cond} text={day.condition} />
            <View style={styles.hl}>
              <Text style={styles.hlText}>Air H:</Text>
              <Digits reduced={reduced} size={12} value={String(temp.value(day.highF))} />
              <Text style={styles.hlText}>° L:</Text>
              <Digits reduced={reduced} size={12} value={String(temp.value(day.lowF))} />
              <Text style={styles.hlText}>°</Text>
            </View>
          </View>
          <View style={styles.iconSmall}><BigIcon reduced={reduced} state={day.icon} /></View>
        </View>
        {hourly ? (
          <Animated.View entering={reduced ? undefined : FadeIn.duration(M.digitDur).easing(smoothOut)} exiting={reduced ? undefined : FadeOut.duration(160)}>
            <DayCurve index={index} reduced={reduced} />
          </Animated.View>
        ) : null}
      </Pressable>
      <DayTabs index={index} onSelect={setIndex} reduced={reduced} />
    </Animated.View>
  );
}

const MUTED = 'rgba(255,255,255,0.8)';

const styles = StyleSheet.create({
  card: { backgroundColor: '#1f6fd1', borderCurve: 'continuous', borderRadius: 27, overflow: 'hidden' },
  body: { paddingHorizontal: 18, paddingTop: 16 },
  topRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  hint: { color: '#FFFFFF', fontSize: 12, fontWeight: '600', opacity: 0.85 },
  condBlock: { flex: 1, minWidth: 0 },
  iconSmall: { alignItems: 'center', height: 44, justifyContent: 'center', transform: [{ scale: 0.68 }], width: 44 },
  dayRow: { alignItems: 'flex-start', flexDirection: 'row' },
  day: { color: MUTED, fontSize: 12, lineHeight: 16 },
  morphOld: { left: 0, position: 'absolute', top: 0 },
  hero: { alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'space-between', marginTop: 4 },
  temp: { alignItems: 'flex-start', flexDirection: 'row' },
  digits: { flexDirection: 'row' },
  digit: { color: '#FFFFFF', fontVariant: ['tabular-nums'], fontWeight: '500' },
  deg: { color: '#FFFFFF', fontSize: 46, fontWeight: '500', lineHeight: 54 },
  cond: { color: '#FFFFFF', fontSize: 14, fontWeight: '500', lineHeight: 19 },
  hl: { alignItems: 'center', flexDirection: 'row' },
  hlText: { color: MUTED, fontSize: 12, lineHeight: 16 },
  curve: { marginTop: 18 },
  curveTitle: { color: MUTED, fontSize: 12, fontWeight: '500', lineHeight: 16, marginBottom: 2 },
  curveAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  curveAxisLayer: { left: 0, position: 'absolute', top: 0 },
  big: { alignItems: 'center', height: 64, justifyContent: 'center', width: 64 },
  iconLayer: { alignItems: 'center', height: 64, justifyContent: 'center', position: 'absolute', width: 64 },
  iconIdle: { alignItems: 'center', justifyContent: 'center' },
  drops: { flexDirection: 'row', justifyContent: 'space-between', left: 20, position: 'absolute', top: 46, width: 24 },
  drop: { backgroundColor: '#FFFFFF', borderRadius: 2, height: 7, width: 2.5 },
  tabs: { backgroundColor: 'rgba(0,0,0,0.16)', borderCurve: 'continuous', borderRadius: 15, flexDirection: 'row', gap: TAB_GAP, margin: 10, marginTop: 12, padding: TAB_PAD },
  pill: { backgroundColor: 'rgba(255,255,255,0.2)', borderCurve: 'continuous', borderRadius: 12, height: TAB_HEIGHT, left: TAB_PAD, position: 'absolute', top: TAB_PAD },
  tab: { alignItems: 'center', borderRadius: 12, flex: 1, height: TAB_HEIGHT, justifyContent: 'center', minWidth: 0 },
  tabContent: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  tabLabel: { color: '#FFFFFF', fontSize: 12, fontWeight: '500', lineHeight: 16 },
});
