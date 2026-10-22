import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { EntryScreen, entryStyles, isKeyboardFocus } from '@/components/entry-ui';
import { HeatSenseLogo } from '@/components/heatsense-logo';
import { Wristband } from '@/components/wristband';
import { Entry } from '@/constants/entry-theme';
import { introPlayedThisSession, markIntroPlayed } from '@/state/intro-session';

// Welcome, with a cinematic opening that turns a black screen into the final layout. The final layout
// is always mounted in place; the intro only animates transforms and opacity over it. A single clock
// (0 → T.end ms) drives every phase from the timeline below, so the sequence reads as one piece and
// Get started can finish it instantly. Phases overlap on purpose:
//   mark      the official H assembles in the exact center from its two real halves, split along its
//             wave: the upper half slides down, the lower half slides up, they meet, and the finished
//             mark settles and holds for a beat
//   flight    the same mark travels on a gentle arc to the measured header position, shrinking to
//             header size, and hands off to the header logo where they coincide; the wordmark slides
//             out from behind it
//   band      as the H leaves the center, the band emerges from the dark below its place, a little
//             small and turned away, rises and settles, its shadow forming beneath it
//   field     the peach curves draw themselves in behind the band, primary curve first, then hold
//   copy      each headline line rises through its own mask, then the subtitle
//   close     Get started settles in, then the footer
// Afterward the band floats (components/wristband): the one continuous motion on the screen.
// The intro plays once per app session (state/intro-session), never under reduced motion; in a dev
// build, /welcome?replay=1 plays it again for design review.

/** The timeline, in ms on the intro clock. */
const T = {
  halves: [100, 1000],
  settle: [900, 1200],
  flight: [1250, 2150],
  wordmark: [1900, 2500],
  band: [1600, 3500],
  /** Curves: the first starts here; each next one `stagger` later; each draws over `duration`. */
  curves: { start: 1900, stagger: 110, duration: 850 },
  lineOne: [3000, 3650],
  lineTwo: [3180, 3880],
  subtitle: [3700, 4300],
  button: [4000, 4700],
  footer: [4300, 5000],
  end: 5000,
} as const;

const LOGO = require('@/assets/images/heatsense-logo.png');
const LOGO_TOP = require('@/assets/images/heatsense-logo-top.png');
const LOGO_BOTTOM = require('@/assets/images/heatsense-logo-bottom.png');
const LOGO_ASPECT = 801 / 763;
const INTRO_LOGO = 114; // about 120 px wide
const HEADER_LOGO = 26;

/* ─────────────────────────────── Easing ─────────────────────────────── */

function progress(t: number, [start, end]: readonly [number, number]) {
  'worklet';
  return Math.min(1, Math.max(0, (t - start) / (end - start)));
}
function easeOut(p: number) {
  'worklet';
  return 1 - (1 - p) ** 3;
}
/** A longer, gentler deceleration for pieces gliding to rest. */
function easeOutQuint(p: number) {
  'worklet';
  return 1 - (1 - p) ** 5;
}
function easeInOut(p: number) {
  'worklet';
  return p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2;
}

type Reveal = { x?: number; y?: number; scale?: number; rotate?: number };

/** Opacity plus a short move into place over one window of the clock. */
function useReveal(clock: SharedValue<number>, window: readonly [number, number], { x = 0, y = 0, scale = 1, rotate = 0 }: Reveal = {}) {
  return useAnimatedStyle(() => {
    const raw = progress(clock.value, window);
    const rest = 1 - easeOut(raw);
    return {
      opacity: Math.min(1, easeOut(raw) * 1.4),
      transform: [{ translateX: x * rest }, { translateY: y * rest }, { scale: scale + (1 - scale) * (1 - rest) }, { rotate: `${rotate * rest}deg` }],
    };
  });
}

/* ─────────────────────────────── The H ─────────────────────────────── */

type Flight = { startX: number; startY: number; endX: number; endY: number };

/**
 * The H in the center: assembled from its two real halves, then (once whole) swapped for the
 * single official mark at the identical position, which flies to the header and hands off there.
 */
function IntroLogo({ clock, flight }: { clock: SharedValue<number>; flight: Flight }) {
  const height = INTRO_LOGO;
  const width = height * LOGO_ASPECT;
  const finalScale = HEADER_LOGO / INTRO_LOGO;

  const mark = useAnimatedStyle(() => {
    const t = clock.value;
    const f = easeInOut(progress(t, T.flight));
    // Different easing per axis bends the path into a gentle arc: up first, then across.
    const cx = flight.startX + (flight.endX - flight.startX) * f;
    const cy = flight.startY + (flight.endY - flight.startY) * easeOut(progress(t, T.flight));
    // The finished mark eases from a hair large to its true size, then shrinks in flight.
    const settle = 1.03 - 0.03 * easeOut(progress(t, T.settle));
    const scale = settle * (1 + (finalScale - 1) * f);
    return {
      opacity: t >= T.flight[1] ? 0 : 1,
      transform: [{ translateX: cx - width / 2 }, { translateY: cy - height / 2 }, { scale }],
    };
  });
  // The halves start apart by about a third of the mark's height and decelerate into place together.
  const top = useAnimatedStyle(() => {
    const p = progress(clock.value, T.halves);
    return { opacity: Math.min(1, p * 2.5), transform: [{ translateY: -0.18 * height * (1 - easeOutQuint(p)) }] };
  });
  const bottom = useAnimatedStyle(() => {
    const p = progress(clock.value, T.halves);
    return { opacity: Math.min(1, p * 2.5), transform: [{ translateY: 0.18 * height * (1 - easeOutQuint(p)) }] };
  });
  // The halves while assembling; the single mark once whole, so no seam can show as it scales.
  const pieces = useAnimatedStyle(() => ({ opacity: clock.value < T.halves[1] ? 1 : 0 }));
  const whole = useAnimatedStyle(() => ({ opacity: clock.value < T.halves[1] ? 0 : 1 }));

  const layer = (source: number) => <Image contentFit="contain" source={source} style={StyleSheet.absoluteFill} />;
  return (
    <Animated.View pointerEvents="none" style={[styles.introMark, { height, width }, mark]}>
      <Animated.View style={[StyleSheet.absoluteFill, pieces]}>
        <Animated.View style={[StyleSheet.absoluteFill, top]}>{layer(LOGO_TOP)}</Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, bottom]}>{layer(LOGO_BOTTOM)}</Animated.View>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, whole]}>{layer(LOGO)}</Animated.View>
    </Animated.View>
  );
}

/* ─────────────────────────────── Copy ─────────────────────────────── */

/** One headline line rising about 20 px through its own mask. */
function MaskedLine({ children, clock, compact, window, accent = false }: { children: string; clock: SharedValue<number>; compact: boolean; window: readonly [number, number]; accent?: boolean }) {
  const lineHeight = compact ? 42 : 50;
  const rise = useAnimatedStyle(() => {
    const raw = progress(clock.value, window);
    const p = easeOut(raw);
    return { opacity: Math.min(1, raw * 2.2), transform: [{ translateY: 20 * (1 - p) }] };
  });
  return (
    <View style={{ height: lineHeight, overflow: 'hidden' }}>
      <Animated.Text style={[styles.headline, compact && styles.headlineCompact, accent && styles.accent, rise]}>{children}</Animated.Text>
    </View>
  );
}

/** The wordmark slides out from behind the H through a mask, settling beside it. */
function Wordmark({ clock }: { clock: SharedValue<number> }) {
  const slide = useAnimatedStyle(() => {
    const raw = progress(clock.value, T.wordmark);
    return { opacity: Math.min(1, raw * 1.8), transform: [{ translateX: -48 * (1 - easeOutQuint(raw)) }] };
  });
  return (
    <View style={styles.wordmarkMask}>
      <Animated.Text style={[entryStyles.wordmark, slide]}>HeatSense</Animated.Text>
    </View>
  );
}

/** The welcome call to action: a peach pill with a dark hairline and a faint outer ring. */
function GetStarted({ onPress }: { onPress: () => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityLabel="Get started" accessibilityRole="button" onPress={onPress}
      onBlur={() => setFocused(false)} onFocus={(event) => setFocused(isKeyboardFocus(event))}
      style={({ pressed }) => [styles.pill, focused && styles.focus, pressed && styles.pressed]}>
      <View pointerEvents="none" style={styles.ring} />
      <View style={styles.pillFill}><Text style={styles.pillLabel}>Get started</Text></View>
    </Pressable>
  );
}

/* ─────────────────────────────── Screen ─────────────────────────────── */

export default function WelcomeScreen() {
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  // Keyed on the replay flag so opening /welcome?replay=1 restarts the screen even if it is already showing.
  return <Welcome fresh={!introPlayedThisSession() || (__DEV__ && replay === '1')} key={replay ?? 'default'} />;
}

function Welcome({ fresh }: { fresh: boolean }) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  // Decided once on mount, so a rerender never replays it.
  const [playIntro] = useState(() => fresh && !reducedMotion);
  const clock = useSharedValue<number>(playIntro ? 0 : T.end);
  const rootRef = useRef<View>(null);
  const logoRef = useRef<View>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [sized, setSized] = useState({ root: false, logo: false });
  const curves = useMemo(() => ({ clock, ...T.curves }), [clock]);

  // Measure where the header logo really sits, then start the clock. If measuring fails, start anyway.
  useEffect(() => {
    if (!playIntro || !sized.root || !sized.logo) return;
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      markIntroPlayed();
      clock.set(withTiming(T.end, { duration: T.end, easing: Easing.linear }));
    };
    const frame = requestAnimationFrame(() => {
      rootRef.current?.measureInWindow((rx, ry, rw, rh) => {
        logoRef.current?.measureInWindow((lx, ly, lw, lh) => {
          setFlight({ startX: rw / 2, startY: rh / 2, endX: lx - rx + lw / 2, endY: ly - ry + lh / 2 });
          start();
        });
      });
    });
    const fallback = setTimeout(start, 400);
    return () => { cancelAnimationFrame(frame); clearTimeout(fallback); };
  }, [clock, playIntro, sized.logo, sized.root]);

  // The header logo takes over exactly where the flying mark lands (or fades in if measuring failed).
  const headerLogo = useAnimatedStyle(() => ({ opacity: flight ? (clock.value >= T.flight[1] ? 1 : 0) : easeOut(progress(clock.value, [T.flight[1] - 300, T.flight[1]])) }));
  const subtitle = useReveal(clock, T.subtitle, { y: 14 });
  const button = useReveal(clock, T.button, { y: 22, scale: 0.96 });
  const footer = useReveal(clock, T.footer);
  // The band emerges from the dark: 35 px low, at 90% and turned 3° away, then settles. It turns
  // opaque early in its rise, so the curves drawing in behind it never show through.
  const band = useAnimatedStyle(() => {
    const raw = progress(clock.value, T.band);
    const rest = 1 - easeOutQuint(raw);
    return {
      opacity: Math.min(1, easeOut(raw) * 1.8),
      transform: [{ translateY: 35 * rest }, { scale: 1 - 0.1 * rest }, { rotate: `${-3 * rest}deg` }],
    };
  });
  const bandShadow = useReveal(clock, [T.band[0] + 500, T.band[1]], { scale: 0.7 });

  const getStarted = () => {
    // Tapping mid-intro finishes it at once and moves on; nobody waits for the animation.
    cancelAnimation(clock);
    clock.set(T.end);
    markIntroPlayed();
    router.push('/sign-in');
  };

  return (
    <View onLayout={() => setSized((s) => (s.root ? s : { ...s, root: true }))} ref={rootRef} style={styles.root}>
      <EntryScreen background="welcome" backgroundDraw={playIntro ? curves : undefined}>{(compact) => {
        // About 55–60% of the content width on a typical phone; smaller screens shrink the band, not the copy.
        const bandHeight = compact ? 206 : 292;
        return <>
          <View style={entryStyles.header}>
            <View accessible accessibilityLabel="HeatSense" style={entryStyles.brand}>
              <Animated.View onLayout={(_: LayoutChangeEvent) => setSized((s) => (s.logo ? s : { ...s, logo: true }))} ref={logoRef} style={headerLogo}>
                <HeatSenseLogo height={HEADER_LOGO} />
              </Animated.View>
              <Wordmark clock={clock} />
            </View>
          </View>

          <View style={[styles.illustration, compact && styles.illustrationCompact]}>
            <View style={styles.scene}>
              <Wristband height={bandHeight} motion="float" delay={playIntro ? T.band[1] : 0} entrance={band} shadowEntrance={bandShadow} />
            </View>
          </View>

          <View accessibilityLabel="Read the heat. Ready the team." accessibilityRole="header" accessible>
            <MaskedLine clock={clock} compact={compact} window={T.lineOne}>Read the heat.</MaskedLine>
            <MaskedLine accent clock={clock} compact={compact} window={T.lineTwo}>Ready the team.</MaskedLine>
          </View>
          <Animated.Text style={[styles.subtitle, subtitle]}>{'Know the field conditions.\nBuild your practice plan.'}</Animated.Text>

          <Animated.View style={[styles.cta, compact && styles.ctaCompact, button]}>
            <GetStarted onPress={getStarted} />
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
  wordmarkMask: { overflow: 'hidden', paddingRight: 2 },
  illustration: { flexGrow: 1, justifyContent: 'center', marginVertical: 16 },
  illustrationCompact: { marginVertical: 6 },
  scene: { alignItems: 'center', justifyContent: 'center', width: '100%' },
  headline: { color: Entry.ink, fontFamily: Entry.heading, fontSize: 43, letterSpacing: -1.6, lineHeight: 50 },
  headlineCompact: { fontSize: 36, letterSpacing: -1.3, lineHeight: 42 },
  accent: { color: Entry.peach },
  subtitle: { color: Entry.muted, fontFamily: Entry.body, fontSize: 16, letterSpacing: -0.1, lineHeight: 24, marginTop: 16, maxWidth: 330 },
  cta: { marginTop: 40 },
  ctaCompact: { marginTop: 28 },
  pill: { borderRadius: 999 },
  ring: { borderColor: 'rgba(255,177,131,0.32)', borderRadius: 999, borderWidth: 1, bottom: -5, left: -5, position: 'absolute', right: -5, top: -5 },
  pillFill: { alignItems: 'center', backgroundColor: Entry.peach, borderColor: Entry.peachEdge, borderRadius: 999, borderWidth: 1, justifyContent: 'center', minHeight: 58, paddingHorizontal: 28, paddingVertical: 16 },
  pillLabel: { color: Entry.canvas, fontFamily: Entry.strong, fontSize: 16.5, letterSpacing: -0.2 },
  focus: Platform.OS === 'web' ? { outlineColor: Entry.peach, outlineOffset: 4, outlineStyle: 'solid', outlineWidth: 2 } : {},
  pressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
  footer: { color: Entry.subtle, fontFamily: Entry.body, fontSize: 13, lineHeight: 18, marginTop: 22, textAlign: 'center' },
});
