import { Image } from 'expo-image';
import { useFocusEffect, usePathname } from 'expo-router';
import { useCallback, useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, makeMutable, useAnimatedStyle, useReducedMotion, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { WRISTBAND_ASPECT, WRISTBAND_HERO } from '@/components/wristband';

// The band's journey through onboarding: one band that travels from screen to screen
// instead of each screen drawing its own. Every onboarding screen marks where the band
// rests with a spot (useBandSpot / <BandSpot>). At rest the spot draws the band itself,
// so it scrolls and layers with its screen. When another screen takes focus, a single
// flying copy (BandJourneyLayer, above the navigator) carries it from the old spot to
// the new one, then hands it back. It never teleports: an interrupted flight continues
// from where it is, and with Reduce Motion the band simply appears in its new place.

type Frame = { x: number; y: number; height: number };
type Measure = (done: (frame: Frame | null) => void) => void;

// Travel curve and timing from the motion skill: ease-in-out for things that move.
const TRAVEL = Easing.bezier(0.77, 0, 0.175, 1);
const FLIGHT_MS = 700;
/** The flying copy is drawn at this height and scaled, so the flight is transform-only. */
const BASE_HEIGHT = 320;
const BASE_WIDTH = BASE_HEIGHT * WRISTBAND_ASPECT;

let journey = { landed: null as string | null, flying: false };
let lastFrame: Frame | null = null;
const measures = new Map<string, Measure>();
const listeners = new Set<() => void>();
const origin = { x: 0, y: 0 };

const flyX = makeMutable(0);
const flyY = makeMutable(0);
const flyHeight = makeMutable(BASE_HEIGHT);
const flyOpacity = makeMutable(0);

function setJourney(next: Partial<typeof journey>) {
  journey = { ...journey, ...next };
  listeners.forEach((listener) => listener());
}
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const snapshot = () => journey;

function land(id: string, to: Frame) {
  lastFrame = to;
  setJourney({ landed: id, flying: false });
  // The spot draws its own copy on the next frame; keep the flying one up until it has.
  requestAnimationFrame(() => requestAnimationFrame(() => { if (!journey.flying) flyOpacity.set(0); }));
}

function claim(id: string, to: Frame, reduced: boolean) {
  if (journey.landed === id && !journey.flying) { lastFrame = to; return; }
  const fly = (from: Frame | null) => {
    if (reduced || (!from && !journey.flying)) { flyOpacity.set(0); land(id, to); return; }
    if (from && !journey.flying) {
      flyX.set(from.x - origin.x);
      flyY.set(from.y - origin.y);
      flyHeight.set(from.height);
    }
    flyOpacity.set(1);
    setJourney({ landed: null, flying: true });
    const timing = { duration: FLIGHT_MS, easing: TRAVEL };
    flyX.set(withTiming(to.x - origin.x, timing));
    flyY.set(withTiming(to.y - origin.y, timing));
    flyHeight.set(withTiming(to.height, timing, (finished) => { if (finished) scheduleOnRN(land, id, to); }));
  };
  // Start from wherever the band rests now (its screen may have scrolled), else where it last landed.
  const measureFrom = !journey.flying && journey.landed ? measures.get(journey.landed) : undefined;
  if (measureFrom) measureFrom((frame) => fly(frame ?? lastFrame));
  else fly(lastFrame);
}

/** Marks where the band rests on a screen. Returns the view props for the spot and whether the band is away. */
export function useBandSpot(id: string | undefined) {
  const ref = useRef<View>(null);
  const focused = useRef(false);
  const reduced = useReducedMotion();
  const { landed, flying } = useSyncExternalStore(subscribe, snapshot);

  const measure = useCallback<Measure>((done) => {
    const node = ref.current;
    if (!node) return done(null);
    node.measureInWindow((x, y, _width, height) => done(height > 0 ? { x, y, height } : null));
  }, []);
  const tryClaim = useCallback(() => {
    if (!id || !focused.current) return;
    measure((frame) => { if (frame && focused.current) claim(id, frame, reduced); });
  }, [id, measure, reduced]);

  useFocusEffect(useCallback(() => {
    if (!id) return;
    focused.current = true;
    measures.set(id, measure);
    tryClaim();
    return () => { focused.current = false; };
  }, [id, measure, tryClaim]));
  useEffect(() => () => { if (id && measures.get(id) === measure) measures.delete(id); }, [id, measure]);

  const away = Boolean(id) && (flying || (landed !== null && landed !== id));
  return { ref, onLayout: tryClaim, away };
}

/** A resting place for the band: `height` tall, the band's own width. `children` draw extras over it (a pairing light). */
export function BandSpot({ id, height, style, children }: { id: string; height: number; style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  const { ref, onLayout, away } = useBandSpot(id);
  return (
    <View accessibilityLabel="The HeatSense band" accessibilityRole="image" accessible onLayout={onLayout} ref={ref} style={[{ height, width: height * WRISTBAND_ASPECT, opacity: away ? 0 : 1 }, style]}>
      <Image contentFit="contain" source={WRISTBAND_HERO} style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
}

/** The flying copy. Mount once, above the navigator. */
export function BandJourneyLayer() {
  const ref = useRef<View>(null);
  const pathname = usePathname();
  // Leaving onboarding ends the journey: the next screen with a spot starts fresh.
  useEffect(() => {
    if (!pathname.startsWith('/dashboard')) return;
    lastFrame = null;
    flyOpacity.set(0);
    setJourney({ landed: null, flying: false });
  }, [pathname]);

  const band = useAnimatedStyle(() => {
    const scale = flyHeight.value / BASE_HEIGHT;
    return {
      opacity: flyOpacity.value,
      transform: [
        { translateX: flyX.value - (BASE_WIDTH * (1 - scale)) / 2 },
        { translateY: flyY.value - (BASE_HEIGHT * (1 - scale)) / 2 },
        { scale },
      ],
    };
  });

  return (
    <View
      onLayout={() => ref.current?.measureInWindow((x, y) => { origin.x = x; origin.y = y; })}
      pointerEvents="none"
      ref={ref}
      style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.flying, band]}>
        <Image contentFit="contain" source={WRISTBAND_HERO} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flying: { height: BASE_HEIGHT, left: 0, position: 'absolute', top: 0, width: BASE_WIDTH },
});
