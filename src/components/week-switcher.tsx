import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  type EasingFunction,
  type EasingFunctionFactory,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { ZONES, type Zone } from '@/lib/practice';
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

// Sample forecast until a weather feed exists.
const DAYS: Day[] = [
  { abbr: 'Mon', name: 'Monday', icon: 'sun', sky: 'clear', condition: 'Sunny', zone: 'orange', wbgtF: 84, highF: 94, lowF: 76 },
  { abbr: 'Tue', name: 'Tuesday', icon: 'cloud', sky: 'cloudy', condition: 'Cloudy', zone: 'yellow', wbgtF: 79, highF: 88, lowF: 74 },
  { abbr: 'Wed', name: 'Wednesday', icon: 'rain', sky: 'rain', condition: 'Light rain', zone: 'green', wbgtF: 72, highF: 81, lowF: 70 },
  { abbr: 'Thu', name: 'Thursday', icon: 'bolt', sky: 'storm', condition: 'Thunderstorms', zone: 'yellow', wbgtF: 76, highF: 84, lowF: 71 },
  { abbr: 'Fri', name: 'Friday', icon: 'sun', sky: 'clear', condition: 'Sunny', zone: 'red', wbgtF: 91, highF: 99, lowF: 79 },
];

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
    if (reduced) {
      setShown({ accent, text });
      return;
    }
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
  return (
    <Animated.Text style={[style, anim]}>
      {shown.text}
      {shown.accent ? <> · <Text style={{ color: shown.accent.color, fontWeight: '600' }}>{shown.accent.label}</Text></> : null}
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

/* ─────────────────────────────── Day tabs ─────────────────────────────── */

const TAB_GAP = 3;
const TAB_PAD = 3;
const TAB_HEIGHT = 48;

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

export function WeekSwitcher() {
  const reduced = useReducedMotion();
  const temp = useTemperature();
  const [index, setIndex] = useState(0);
  const day = DAYS[index];
  const zone = ZONES[day.zone];

  return (
    <View style={styles.card}>
      <Backdrop reduced={reduced} sky={day.sky} />
      <View accessibilityLabel={`${day.name}, ${day.condition}, ${zone.label}. Forecast WBGT ${temp.value(day.wbgtF)} degrees. High ${temp.value(day.highF)}, low ${temp.value(day.lowF)}.`} accessibilityRole="summary" style={styles.body}>
        <Text accessibilityRole="header" numberOfLines={1} style={styles.place}>A look at this week</Text>
        <View style={styles.dayRow}>
          <MorphText reduced={reduced} style={styles.day} text={day.name} />
          <Text style={styles.day}> · WBGT forecast</Text>
        </View>
        <View style={styles.hero}>
          <View style={styles.temp}>
            <Digits reduced={reduced} size={60} value={String(temp.value(day.wbgtF))} />
            <Text style={styles.deg}>°</Text>
          </View>
          <BigIcon reduced={reduced} state={day.icon} />
        </View>
        <SwapText accent={{ color: zone.text, label: zone.label }} reduced={reduced} style={styles.cond} text={day.condition} />
        <View style={styles.hl}>
          <Text style={styles.hlText}>Air H:</Text>
          <Digits reduced={reduced} size={12} value={String(temp.value(day.highF))} />
          <Text style={styles.hlText}>° L:</Text>
          <Digits reduced={reduced} size={12} value={String(temp.value(day.lowF))} />
          <Text style={styles.hlText}>°</Text>
        </View>
      </View>
      <DayTabs index={index} onSelect={setIndex} reduced={reduced} />
    </View>
  );
}

const MUTED = 'rgba(255,255,255,0.8)';

const styles = StyleSheet.create({
  card: { backgroundColor: '#1f6fd1', borderCurve: 'continuous', borderRadius: 27, overflow: 'hidden' },
  body: { paddingHorizontal: 24, paddingTop: 24 },
  place: { color: '#FFFFFF', fontSize: 16, fontWeight: '500', lineHeight: 22 },
  dayRow: { alignItems: 'flex-start', flexDirection: 'row' },
  day: { color: MUTED, fontSize: 12, lineHeight: 16 },
  morphOld: { left: 0, position: 'absolute', top: 0 },
  hero: { alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'space-between', marginTop: 8 },
  temp: { alignItems: 'flex-start', flex: 1, flexDirection: 'row', minWidth: 0 },
  digits: { flexDirection: 'row' },
  digit: { color: '#FFFFFF', fontVariant: ['tabular-nums'], fontWeight: '500' },
  deg: { color: '#FFFFFF', fontSize: 60, fontWeight: '500', lineHeight: 70 },
  cond: { color: '#FFFFFF', fontSize: 13, lineHeight: 20, marginTop: 4 },
  hl: { alignItems: 'center', flexDirection: 'row' },
  hlText: { color: MUTED, fontSize: 12, lineHeight: 16 },
  big: { alignItems: 'center', height: 64, justifyContent: 'center', width: 64 },
  iconLayer: { alignItems: 'center', height: 64, justifyContent: 'center', position: 'absolute', width: 64 },
  iconIdle: { alignItems: 'center', justifyContent: 'center' },
  drops: { flexDirection: 'row', justifyContent: 'space-between', left: 20, position: 'absolute', top: 46, width: 24 },
  drop: { backgroundColor: '#FFFFFF', borderRadius: 2, height: 7, width: 2.5 },
  tabs: { backgroundColor: 'rgba(0,0,0,0.16)', borderCurve: 'continuous', borderRadius: 15, flexDirection: 'row', gap: TAB_GAP, margin: 12, marginTop: 16, padding: TAB_PAD },
  pill: { backgroundColor: 'rgba(255,255,255,0.2)', borderCurve: 'continuous', borderRadius: 12, height: TAB_HEIGHT, left: TAB_PAD, position: 'absolute', top: TAB_PAD },
  tab: { alignItems: 'center', borderRadius: 12, flex: 1, height: TAB_HEIGHT, justifyContent: 'center', minWidth: 0 },
  tabContent: { alignItems: 'center', gap: 2 },
  tabLabel: { color: '#FFFFFF', fontSize: 12, fontWeight: '500', lineHeight: 16 },
});
