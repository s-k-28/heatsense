import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import { EntryButton, EntryScreen, entryStyles } from '@/components/entry-ui';
import { FIELD_LINES, FIELDLINE_FILL, FIELDLINE_LINE, FIELDLINE_PARTS, FIELDLINE_VIEWBOX } from '@/components/fieldline-character';
import { HeatSenseLogo } from '@/components/heatsense-logo';
import { Entry } from '@/constants/entry-theme';
import { introSeenNow, loadIntroSeen, markIntroSeen } from '@/state/first-launch';

// Welcome, with a one-time brand intro. A single clock (0 → T.end ms) drives every element, so the
// sequence reads as one piece and Get started can finish it instantly. Phases overlap on purpose:
//   logo     the two real halves of the H meet in the center, hold, then fly on an arc to the header
//   mascot   Fieldline builds from his own shapes, then tilts toward you, blinks, and his band flows
//   copy     each headline line rises out of its own mask, then the subtitle
//   close    Heat / Plan / Protect, Get started, footer
// Afterward he idles on loops of different lengths, so the motion never looks mechanical.
// The intro plays only the first time the app is ever opened on a device (see state/first-launch) and
// never under reduced motion. In a dev build, /welcome?replay=1 plays it again for design review.

/** Timing tokens, in ms on the intro clock. */
const T = {
  logoIn: [100, 950],
  flight: [1000, 1950],
  wordmark: [1800, 2300],
  lines: [1500, 2450],
  backLeg: [1550, 2250],
  body: [1620, 2420],
  fold: [1760, 2480],
  foldEcho: [2480, 2950],
  band: [1860, 2700],
  face: [2380, 2700],
  signature: [2720, 3420],
  lineOne: [2650, 3250],
  lineTwo: [2820, 3420],
  subtitle: [3050, 3600],
  triad: [3300, 3500, 3700],
  button: [3600, 4100],
  footer: [3850, 4250],
  end: 4250,
} as const;
const STAGE = 650; // how long each Heat / Plan / Protect mark takes to arrive

const LOGO_TOP = require('@/assets/images/heatsense-logo-top.png');
const LOGO_BOTTOM = require('@/assets/images/heatsense-logo-bottom.png');
const LOGO_ASPECT = 801 / 763;
const INTRO_LOGO = 120;
const HEADER_LOGO = 26;
const SVG_WIDTH = 1.18; // Fieldline's width per unit of height

/* ─────────────────────────────── Easing ─────────────────────────────── */

function progress(t: number, [start, end]: readonly [number, number]) {
  'worklet';
  return Math.min(1, Math.max(0, (t - start) / (end - start)));
}
function easeOut(p: number) {
  'worklet';
  return 1 - (1 - p) ** 3;
}
function easeInOut(p: number) {
  'worklet';
  return p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2;
}
/** A soft, controlled spring: overshoots by about 4% once, then settles. */
function softSpring(p: number) {
  'worklet';
  const s = 0.9;
  return 1 + (s + 1) * (p - 1) ** 3 + s * (p - 1) ** 2;
}
/** 0 → 1 → 0 over the window, for moments that go out and come back. */
function bump(p: number) {
  'worklet';
  return Math.sin(Math.PI * p);
}

type Reveal = { x?: number; y?: number; scale?: number; rotate?: number; spring?: boolean };

/** Opacity plus a short move into place over one window of the clock. */
function useReveal(clock: SharedValue<number>, window: readonly [number, number], { x = 0, y = 0, scale = 1, rotate = 0, spring = false }: Reveal = {}) {
  return useAnimatedStyle(() => {
    const raw = progress(clock.value, window);
    const p = spring ? softSpring(raw) : easeOut(raw);
    const rest = 1 - p;
    return {
      opacity: Math.min(1, easeOut(raw) * 1.4),
      transform: [{ translateX: x * rest }, { translateY: y * rest }, { scale: scale + (1 - scale) * p }, { rotate: `${rotate * rest}deg` }],
    };
  });
}

/** A value that drifts 0 → 1 → 0 forever on its own period, after `delay`. */
function useLoop(active: boolean, period: number, delay: number) {
  const value = useSharedValue(0);
  useEffect(() => {
    if (!active) return;
    value.set(withDelay(delay, withRepeat(withTiming(1, { duration: period / 2, easing: Easing.inOut(Easing.sin) }), -1, true)));
    return () => cancelAnimation(value);
  }, [active, delay, period, value]);
  return value;
}

/* ─────────────────────────────── The H ─────────────────────────────── */

type Flight = { startX: number; startY: number; endX: number; endY: number };

/** The centered H: its two real halves meet, hold, then the whole mark flies to the header and hands off. */
function IntroLogo({ clock, flight }: { clock: SharedValue<number>; flight: Flight }) {
  const height = INTRO_LOGO;
  const width = height * LOGO_ASPECT;
  const finalScale = HEADER_LOGO / INTRO_LOGO;
  const mark = useAnimatedStyle(() => {
    const t = clock.value;
    const assemble = easeOut(progress(t, T.logoIn));
    const f = easeInOut(progress(t, T.flight));
    // Different easing per axis bends the path into a gentle arc: up first, then across.
    const cx = flight.startX + (flight.endX - flight.startX) * f;
    const cy = flight.startY + (flight.endY - flight.startY) * easeOut(progress(t, T.flight));
    const scale = (0.92 + 0.08 * assemble) * (1 + (finalScale - 1) * f);
    return {
      opacity: t >= T.flight[1] ? 0 : Math.min(1, assemble * 1.5),
      transform: [{ translateX: cx - width / 2 }, { translateY: cy - height / 2 }, { scale }],
    };
  });
  const top = useAnimatedStyle(() => {
    const rest = 1 - easeOut(progress(clock.value, T.logoIn));
    return { transform: [{ translateX: -22 * rest }, { translateY: -18 * rest }] };
  });
  const bottom = useAnimatedStyle(() => {
    const rest = 1 - easeOut(progress(clock.value, [T.logoIn[0] + 80, T.logoIn[1]]));
    return { transform: [{ translateX: 22 * rest }, { translateY: 18 * rest }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.introMark, { height, width }, mark]}>
      <Animated.View style={[StyleSheet.absoluteFill, top]}><Image contentFit="contain" source={LOGO_TOP} style={StyleSheet.absoluteFill} /></Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, bottom]}><Image contentFit="contain" source={LOGO_BOTTOM} style={StyleSheet.absoluteFill} /></Animated.View>
    </Animated.View>
  );
}

/* ─────────────────────────────── Fieldline ─────────────────────────────── */

function Layer({ children, height, style }: { children: ReactNode; height: number; style?: object }) {
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg aria-hidden height={height} viewBox={FIELDLINE_VIEWBOX} width={height * SVG_WIDTH}>{children}</Svg>
    </Animated.View>
  );
}

/** Fieldline built from his own shapes, a small signature moment, then an idle life. */
function AnimatedFieldline({ alive, clock, height }: { alive: boolean; clock: SharedValue<number>; height: number }) {
  const width = height * SVG_WIDTH;
  const idleDelay = alive ? Math.max(0, T.end - 400) : 0;

  // Entrance, part by part.
  const shadow = useReveal(clock, [T.backLeg[0], T.body[1]]);
  const backLeg = useReveal(clock, T.backLeg, { y: 24, spring: true });
  const body = useReveal(clock, T.body, { y: 34, rotate: -5, spring: true });
  const face = useReveal(clock, T.face, { y: -4 });

  // Idle loops, each on its own period so they drift in and out of phase.
  const float = useLoop(alive, 5200, idleDelay);
  const sway = useLoop(alive, 7400, idleDelay + 600);
  const breathe = useLoop(alive, 6200, idleDelay + 300);
  const flutter = useLoop(alive, 5800, idleDelay + 900);

  // The peach fold sweeps in, echoes once after the body lands, then flutters very slightly.
  const fold = useAnimatedStyle(() => {
    const raw = progress(clock.value, T.fold);
    const p = easeOut(raw);
    const echo = bump(progress(clock.value, T.foldEcho));
    return {
      opacity: Math.min(1, p * 1.4),
      transform: [{ translateY: -16 * (1 - p) }, { rotate: `${-14 * (1 - p) + 3 * echo + 1.4 * flutter.value}deg` }],
    };
  });

  // The blue band is revealed left to right by a mask, then flows once across his body.
  const bandStart = (108 / 320) * width;
  const bandMask = useAnimatedStyle(() => {
    const p = easeInOut(progress(clock.value, T.band));
    return { width: bandStart + (width - bandStart) * p };
  });
  const bandFlow = useAnimatedStyle(() => {
    const flow = bump(progress(clock.value, [T.signature[0] + 200, T.signature[1]]));
    return { transform: [{ translateX: 5 * flow }, { scaleX: 1 + 0.04 * flow + 0.02 * breathe.value }, { scaleY: 1 + 0.03 * breathe.value }] };
  });

  // Signature: he leans toward you and comes back, with a blink at the top of the lean.
  const whole = useAnimatedStyle(() => {
    const lean = bump(easeInOut(progress(clock.value, T.signature)));
    const enter = easeOut(progress(clock.value, [T.backLeg[0], T.body[1]]));
    return {
      transform: [
        { translateY: -6 * float.value - 3 * lean },
        { rotate: `${-3.5 * lean + (sway.value - 0.5) * 2.4}deg` },
        { scale: (0.96 + 0.04 * enter) * (1 + 0.035 * lean) },
      ],
    };
  });

  // Blinks: one during the lean, then irregular blinks and an occasional wink of the right eye.
  const leftLid = useSharedValue(1);
  const rightLid = useSharedValue(1);
  useEffect(() => {
    if (!alive) return;
    const close = withTiming(0.08, { duration: 80 });
    const open = withTiming(1, { duration: 140 });
    const hold = (ms: number) => withDelay(ms, withTiming(1, { duration: 0 }));
    const wait = (ms: number) => withDelay(ms, withTiming(1, { duration: 220 }));
    // Both eyes share one schedule; the right eye winks where the left eye only waits.
    leftLid.set(withDelay(T.end + 1600, withRepeat(withSequence(close, open, hold(3400), close, open, hold(2100), close, open, hold(5200), wait(0), hold(2900)), -1)));
    rightLid.set(withDelay(T.end + 1600, withRepeat(withSequence(close, open, hold(3400), close, open, hold(2100), close, open, hold(5200), withSequence(withTiming(0.08, { duration: 90 }), withTiming(1, { duration: 130 })), hold(2900)), -1)));
    return () => { cancelAnimation(leftLid); cancelAnimation(rightLid); };
  }, [alive, leftLid, rightLid]);
  const signatureBlink = (t: number) => {
    'worklet';
    return 1 - 0.92 * bump(progress(t, [T.signature[0] + 260, T.signature[0] + 480]));
  };
  const leftEye = useAnimatedStyle(() => ({ transform: [{ scaleY: Math.min(leftLid.value, signatureBlink(clock.value)) }] }));
  const rightEye = useAnimatedStyle(() => ({ transform: [{ scaleY: Math.min(rightLid.value, signatureBlink(clock.value)) }] }));

  return (
    <View accessibilityLabel="Fieldline, the H-shaped HeatSense companion" accessibilityRole="image" accessible style={{ height, width }}>
      <Animated.View style={[StyleSheet.absoluteFill, whole]}>
        <Layer height={height} style={shadow}><Ellipse cx="160" cy="250" fill="#080D10" opacity={0.6} rx="137" ry="10" /></Layer>
        <Layer height={height} style={backLeg}><Path d={FIELDLINE_PARTS.backLeg} fill={FIELDLINE_FILL} stroke={FIELDLINE_LINE} strokeWidth={1.5} /></Layer>
        <Animated.View pointerEvents="none" style={[styles.bandMask, bandMask]}>
          <Animated.View style={[{ height, width }, styles.bandOrigin, bandFlow]}>
            <Svg aria-hidden height={height} viewBox={FIELDLINE_VIEWBOX} width={width}><Path d={FIELDLINE_PARTS.band} fill={Entry.blue} /></Svg>
          </Animated.View>
        </Animated.View>
        <Layer height={height} style={body}><Path d={FIELDLINE_PARTS.body} fill={FIELDLINE_FILL} stroke={FIELDLINE_LINE} strokeWidth={1.5} /></Layer>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.foldOrigin, fold]}>
          <Svg aria-hidden height={height} viewBox={FIELDLINE_VIEWBOX} width={width}><Path d={FIELDLINE_PARTS.fold} fill={Entry.peach} /></Svg>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, face]}>
          <Svg aria-hidden height={height} style={StyleSheet.absoluteFill} viewBox={FIELDLINE_VIEWBOX} width={width}>
            <Path d={FIELDLINE_PARTS.brow} stroke={Entry.ink} strokeLinecap="round" strokeWidth={4.5} />
          </Svg>
          <Animated.View style={[StyleSheet.absoluteFill, styles.leftEyeOrigin, leftEye]}>
            <Svg aria-hidden height={height} viewBox={FIELDLINE_VIEWBOX} width={width}><Ellipse cx="106" cy="84" fill={Entry.ink} rx="5" ry="8" /></Svg>
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, styles.rightEyeOrigin, rightEye]}>
            <Svg aria-hidden height={height} viewBox={FIELDLINE_VIEWBOX} width={width}><Ellipse cx="126" cy="78" fill={Entry.ink} rx="5" ry="8" /></Svg>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/* ─────────────────────────────── Heat · Plan · Protect ─────────────────────────────── */

const MARK = { fill: FIELDLINE_FILL, line: FIELDLINE_LINE };

/** Heat: a peach sun whose rays open outward from the center. */
function HeatMark({ clock, size, start }: { clock: SharedValue<number>; size: number; start: number }) {
  const sun = useReveal(clock, [start, start + STAGE], { scale: 0.4 });
  const rays = useReveal(clock, [start + 120, start + STAGE + 120], { scale: 0.6, rotate: -30 });
  return (
    <View style={{ height: size, width: size }}>
      <Animated.View style={[StyleSheet.absoluteFill, rays]}>
        <Svg height={size} viewBox="0 0 48 48" width={size}>
          <Path d="M24 4v6M24 38v6M4 24h6M38 24h6M9.9 9.9l4.2 4.2M33.9 33.9l4.2 4.2M38.1 9.9l-4.2 4.2M14.1 33.9l-4.2 4.2" stroke={Entry.peach} strokeLinecap="round" strokeOpacity={0.75} strokeWidth={3} />
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, sun]}>
        <Svg height={size} viewBox="0 0 48 48" width={size}>
          <Circle cx="24" cy="24" fill={Entry.peach} r="10" />
          <Path d="M18.5 26.5 Q24 30 29.5 26.5" fill="none" stroke={MARK.fill} strokeLinecap="round" strokeWidth={2.4} />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** Plan: work and rest blocks slide together into one practice interval. */
function PlanMark({ clock, size, start }: { clock: SharedValue<number>; size: number; start: number }) {
  const track = useReveal(clock, [start, start + STAGE]);
  const work = useReveal(clock, [start, start + STAGE], { x: -10 });
  const rest = useReveal(clock, [start + 90, start + STAGE + 90], { x: 10 });
  const next = useReveal(clock, [start + 180, start + STAGE + 180], { x: 14 });
  const block = (style: object, x: number, w: number, color: string) => (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Svg height={size} viewBox="0 0 48 48" width={size}><Rect fill={color} height="12" rx="6" width={w} x={x} y="18" /></Svg>
    </Animated.View>
  );
  return (
    <View style={{ height: size, width: size }}>
      <Animated.View style={[StyleSheet.absoluteFill, track]}>
        <Svg height={size} viewBox="0 0 48 48" width={size}><Rect fill={MARK.fill} height="22" rx="11" stroke={MARK.line} strokeWidth={1.2} width="44" x="2" y="13" /></Svg>
      </Animated.View>
      {block(work, 6, 18, Entry.peach)}
      {block(rest, 26, 8, Entry.blue)}
      {block(next, 36, 6, Entry.peach)}
    </View>
  );
}

/** Protect: two halves of a shield close around a blue band. */
function ProtectMark({ clock, size, start }: { clock: SharedValue<number>; size: number; start: number }) {
  const left = useReveal(clock, [start, start + STAGE], { x: -8 });
  const right = useReveal(clock, [start, start + STAGE], { x: 8 });
  const band = useReveal(clock, [start + 220, start + STAGE + 220], { x: -6 });
  const half = (style: object, d: string) => (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Svg height={size} viewBox="0 0 48 48" width={size}><Path d={d} fill={MARK.fill} stroke={MARK.line} strokeWidth={1.2} /></Svg>
    </Animated.View>
  );
  return (
    <View style={{ height: size, width: size }}>
      {half(left, 'M24 5 L10 10 Q9 10.5 9 12 L9 23 Q9 36 24 43Z')}
      {half(right, 'M24 5 L38 10 Q39 10.5 39 12 L39 23 Q39 36 24 43Z')}
      <Animated.View style={[StyleSheet.absoluteFill, band]}>
        <Svg height={size} viewBox="0 0 48 48" width={size}>
          <Path d="M9.2 20 C16 16 24 26 38.8 18 L38.8 24 C24 31 16 22 9.6 26Z" fill={Entry.blue} />
          <Path d="M24 5 L38 10 Q39 10.5 39 12 L39 14 C33 11 28 12.5 24 9.5 C20 12.5 15 11 9 14 L9 12 Q9 10.5 10 10Z" fill={Entry.peach} />
        </Svg>
      </Animated.View>
    </View>
  );
}

function Triad({ clock, compact }: { clock: SharedValue<number>; compact: boolean }) {
  const size = compact ? 34 : 42;
  const labels = [useReveal(clock, [T.triad[0] + 200, T.triad[0] + 600]), useReveal(clock, [T.triad[1] + 200, T.triad[1] + 600]), useReveal(clock, [T.triad[2] + 200, T.triad[2] + 600])];
  const items = [
    { label: 'Heat', mark: <HeatMark clock={clock} size={size} start={T.triad[0]} /> },
    { label: 'Plan', mark: <PlanMark clock={clock} size={size} start={T.triad[1]} /> },
    { label: 'Protect', mark: <ProtectMark clock={clock} size={size} start={T.triad[2]} /> },
  ];
  return (
    <View accessibilityLabel="Read the heat, plan practice, protect your team." accessible style={[styles.triad, compact && styles.triadCompact]}>
      {items.map((item, index) => (
        <View key={item.label} style={styles.triadItem}>
          {item.mark}
          <Animated.Text style={[styles.triadLabel, labels[index]]}>{item.label}</Animated.Text>
        </View>
      ))}
    </View>
  );
}

/* ─────────────────────────────── Copy ─────────────────────────────── */

/** One headline line rising out of its own mask. */
function MaskedLine({ children, clock, compact, window }: { children: string; clock: SharedValue<number>; compact: boolean; window: readonly [number, number] }) {
  const lineHeight = compact ? 50 : 60;
  const rise = useAnimatedStyle(() => {
    const p = easeOut(progress(clock.value, window));
    return { opacity: Math.min(1, p * 2), transform: [{ translateY: lineHeight * 0.8 * (1 - p) }] };
  });
  return (
    <View style={{ height: lineHeight, overflow: 'hidden' }}>
      <Animated.Text style={[styles.headline, compact && styles.headlineCompact, rise]}>{children}</Animated.Text>
    </View>
  );
}

/* ─────────────────────────────── Screen ─────────────────────────────── */

export default function WelcomeScreen() {
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const [introSeen, setIntroSeen] = useState<boolean | null>(introSeenNow());

  useEffect(() => {
    if (introSeen === null) loadIntroSeen().then(setIntroSeen);
  }, [introSeen]);

  // The saved flag reads in a few milliseconds; until then, show only the background.
  if (introSeen === null) return <View style={styles.root} />;
  // Keyed on the replay flag so opening /welcome?replay=1 restarts the screen even if it is already showing.
  return <Welcome firstLaunch={!introSeen || (__DEV__ && replay === '1')} key={replay ?? 'default'} />;
}

function Welcome({ firstLaunch }: { firstLaunch: boolean }) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  // Decided once on mount: the intro plays only on the very first launch.
  const [playIntro] = useState(() => firstLaunch && !reducedMotion);
  const clock = useSharedValue<number>(playIntro ? 0 : T.end);
  const rootRef = useRef<View>(null);
  const logoRef = useRef<View>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [sized, setSized] = useState({ root: false, logo: false });

  // Measure where the header logo really sits, then start the clock. If measuring fails, start anyway.
  useEffect(() => {
    if (!playIntro || !sized.root || !sized.logo) return;
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      markIntroSeen();
      clock.set(withTiming(T.end, { duration: T.end, easing: Easing.linear }));
    };
    const frame = requestAnimationFrame(() => {
      rootRef.current?.measureInWindow((rx, ry, rw, rh) => {
        logoRef.current?.measureInWindow((lx, ly, lw, lh) => {
          setFlight({ startX: rw / 2, startY: rh / 2 - 24, endX: lx - rx + lw / 2, endY: ly - ry + lh / 2 });
          start();
        });
      });
    });
    const fallback = setTimeout(start, 400);
    return () => { cancelAnimationFrame(frame); clearTimeout(fallback); };
  }, [clock, playIntro, sized.logo, sized.root]);

  const headerLogo = useAnimatedStyle(() => ({ opacity: flight ? (clock.value >= T.flight[1] ? 1 : 0) : easeOut(progress(clock.value, [T.flight[1] - 300, T.flight[1]])) }));
  const wordmark = useReveal(clock, T.wordmark, { x: -12 });
  const lines = useReveal(clock, T.lines, { y: 10 });
  const subtitle = useReveal(clock, T.subtitle, { y: 12 });
  const button = useReveal(clock, T.button, { y: 12, scale: 0.97 });
  const footer = useReveal(clock, T.footer);

  const getStarted = () => {
    // Tapping mid-intro finishes it cleanly, then continues as usual.
    cancelAnimation(clock);
    clock.set(T.end);
    markIntroSeen();
    router.push('/sign-in');
  };

  return (
    <View onLayout={() => setSized((s) => (s.root ? s : { ...s, root: true }))} ref={rootRef} style={styles.root}>
      <EntryScreen>{(compact) => {
        const mascotHeight = compact ? 168 : 236;
        return <>
          <View style={entryStyles.header}>
            <View accessible accessibilityLabel="HeatSense" style={entryStyles.brand}>
              <Animated.View onLayout={(_: LayoutChangeEvent) => setSized((s) => (s.logo ? s : { ...s, logo: true }))} ref={logoRef} style={headerLogo}>
                <HeatSenseLogo height={HEADER_LOGO} />
              </Animated.View>
              <Animated.Text style={[entryStyles.wordmark, wordmark]}>HeatSense</Animated.Text>
            </View>
          </View>

          <View style={[styles.illustration, compact && styles.illustrationCompact]}>
            <View style={[styles.scene, { height: mascotHeight + 26 }]}>
              <Animated.View aria-hidden pointerEvents="none" style={[styles.lines, lines]}>
                <Svg height="100%" preserveAspectRatio="none" viewBox="0 0 400 220" width="100%">
                  <Path d={FIELD_LINES.grid} fill="none" stroke={Entry.line} strokeWidth={1} />
                  <Path d={FIELD_LINES.accent} fill="none" stroke={Entry.blue} strokeOpacity={0.5} strokeWidth={1.6} />
                </Svg>
              </Animated.View>
              <AnimatedFieldline alive={!reducedMotion} clock={clock} height={mascotHeight} />
            </View>
          </View>

          <View accessibilityLabel="Read the heat. Ready the team." accessibilityRole="header" accessible>
            <MaskedLine clock={clock} compact={compact} window={T.lineOne}>Read the heat.</MaskedLine>
            <MaskedLine clock={clock} compact={compact} window={T.lineTwo}>Ready the team.</MaskedLine>
          </View>
          <Animated.Text style={[styles.subtitle, subtitle]}>Know the field conditions. Build your practice plan. Keep your team in view.</Animated.Text>

          <Triad clock={clock} compact={compact} />

          <Animated.View style={button}>
            <EntryButton label="Get started" onPress={getStarted} />
          </Animated.View>
          <Animated.View style={footer}>
            <Text style={styles.footer}>Made for coaches and athletes.</Text>
          </Animated.View>
        </>;
      }}</EntryScreen>

      {playIntro && flight ? <IntroLogo clock={clock} flight={flight} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: Entry.canvas, flex: 1 },
  introMark: { left: 0, position: 'absolute', top: 0 },
  illustration: { flexGrow: 1, justifyContent: 'center', marginVertical: 16 },
  illustrationCompact: { marginVertical: 6 },
  scene: { alignItems: 'center', justifyContent: 'center', width: '100%' },
  lines: { bottom: 0, height: '80%', left: -24, position: 'absolute', right: -24 },
  bandMask: { bottom: 0, left: 0, overflow: 'hidden', position: 'absolute', top: 0 },
  bandOrigin: { transformOrigin: '34% 50%' },
  foldOrigin: { transformOrigin: '30% 40%' },
  leftEyeOrigin: { transformOrigin: '33.1% 31.1%' },
  rightEyeOrigin: { transformOrigin: '39.4% 28.9%' },
  headline: { color: Entry.ink, fontFamily: Entry.display, fontSize: 56, letterSpacing: -0.2, lineHeight: 60 },
  headlineCompact: { fontSize: 46, lineHeight: 50 },
  subtitle: { color: Entry.muted, fontFamily: Entry.body, fontSize: 16, letterSpacing: -0.1, lineHeight: 24, marginTop: 12, maxWidth: 330 },
  triad: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 26, marginTop: 28, paddingHorizontal: 18 },
  triadCompact: { marginBottom: 18, marginTop: 18 },
  triadItem: { alignItems: 'center', gap: 6, minWidth: 64 },
  triadLabel: { color: Entry.muted, fontFamily: Entry.body, fontSize: 13, lineHeight: 16 },
  footer: { color: Entry.muted, fontFamily: Entry.body, fontSize: 13, lineHeight: 18, marginTop: 14, textAlign: 'center' },
});
