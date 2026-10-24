import { Text } from '@/components/ui/text';
import { Image } from 'expo-image';
import { useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { useAthletePalette, useAthleteStyles } from '@/components/athlete-appearance';
import { PressScale } from '@/components/motion/press-scale';
import { Surface } from '@/components/ui/surface';
import { ActionButton } from '@/components/ui/action-button';
import { WRISTBAND_HERO } from '@/components/wristband-asset';
import { Palette } from '@/constants/theme';
import { useMotionActive } from '@/lib/motion-activity';
import { EASE_OUT, track } from '@/lib/motion-engine';

export type BandPreviewPhase = 'idle' | 'zoom' | 'press' | 'reveal';
export type BandView = 'overview' | 'side' | 'module' | 'strap';

const VIEWS: { key: BandView; label: string; source: number }[] = [
  { key: 'overview', label: 'Overview', source: WRISTBAND_HERO },
  { key: 'side', label: 'Side', source: require('@/assets/images/band-views/side.png') },
  { key: 'module', label: 'Module', source: require('@/assets/images/band-views/module.png') },
  { key: 'strap', label: 'Strap', source: require('@/assets/images/band-views/strap.png') },
];

const MOTION = { camera: 240, zoom: 260, duration: 2000, press: 1100, reveal: 1600 };

/** Four separate rendered views, never a flat image pretending to rotate in 3D.
 * All motion stays inside this stage. No journey, shared band, autoplay or hardware-button claim.
 */
export function BandViewer({ onExploreHeartRate, onPreviewPhase }: {
  onExploreHeartRate: () => void;
  onPreviewPhase?: (phase: BandPreviewPhase) => void;
}) {
  const styles = useAthleteStyles(baseStyles);
  const palette = useAthletePalette();
  const focused = useIsFocused();
  const moving = useMotionActive();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const present = focused && foreground;
  const [view, setView] = useState(0);
  const [direction, setDirection] = useState(1);
  const [zoomed, setZoomed] = useState(false);
  const [fallbacks, setFallbacks] = useState<number[]>([]);
  const [unavailableViews, setUnavailableViews] = useState<number[]>([]);
  const [run, setRun] = useState<number | null>(null);
  const runId = useRef(0);
  const elapsed = useRef(0);
  const phases = useRef({ zoom: false, press: false, reveal: false });
  const mounted = useRef(true);
  const callbacks = useRef({ onExploreHeartRate, onPreviewPhase });
  const clock = useSharedValue(0);
  const zoom = useSharedValue(1);

  useEffect(() => { callbacks.current = { onExploreHeartRate, onPreviewPhase }; }, [onExploreHeartRate, onPreviewPhase]);
  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => { mounted.current = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    zoom.set(moving ? withTiming(zoomed ? 1.5 : 1, { duration: MOTION.zoom, easing: EASE_OUT }) : zoomed ? 1.5 : 1);
    return () => cancelAnimation(zoom);
  }, [moving, zoom, zoomed]);

  useEffect(() => {
    if (run === null || !present) return;
    const valid = () => mounted.current && runId.current === run && AppState.currentState === 'active';
    const reveal = () => {
      if (!valid() || phases.current.reveal) return;
      phases.current.reveal = true;
      callbacks.current.onPreviewPhase?.('reveal');
      if (mounted.current) callbacks.current.onExploreHeartRate();
    };
    if (!moving) {
      // Reduce Motion shows the result immediately; no artificial wait or pulse.
      clock.set(MOTION.duration);
      reveal();
      if (mounted.current) { callbacks.current.onPreviewPhase?.('idle'); setRun(null); }
      return;
    }
    if (!phases.current.zoom) {
      phases.current.zoom = true;
      callbacks.current.onPreviewPhase?.('zoom');
    }
    const began = Date.now();
    const remaining = Math.max(0, MOTION.duration - elapsed.current);
    clock.set(withTiming(MOTION.duration, { duration: remaining, easing: Easing.linear }));
    const timers: ReturnType<typeof setTimeout>[] = [];
    const schedule = (at: number, work: () => void) => {
      timers.push(setTimeout(() => { if (valid()) work(); }, Math.max(0, at - elapsed.current)));
    };
    if (!phases.current.press) schedule(MOTION.press, () => {
      phases.current.press = true;
      callbacks.current.onPreviewPhase?.('press');
    });
    if (!phases.current.reveal) schedule(MOTION.reveal, reveal);
    schedule(MOTION.duration, () => {
      callbacks.current.onPreviewPhase?.('idle');
      if (mounted.current) setRun(null);
    });
    return () => {
      timers.forEach(clearTimeout);
      elapsed.current = Math.min(MOTION.duration, elapsed.current + Date.now() - began);
      cancelAnimation(clock);
    };
  }, [clock, moving, present, run]);

  const artworkMotion = useAnimatedStyle(() => ({
    transform: [{ scale: zoom.value * track(clock.value, [[0, 1], [700, 1.22, 'out'], [1600, 1.22], [2000, 1]]) }],
  }));
  // The press is feedback on the app's Explore button; the physical band stays untouched.
  const buttonMotion = useAnimatedStyle(() => ({
    transform: [{ scale: track(clock.value, [[0, 1], [1100, 1], [1220, 0.97], [1400, 1], [2000, 1]]) }],
  }));
  const startPreview = () => {
    if (run !== null || !present) return;
    elapsed.current = 0;
    phases.current = { zoom: false, press: false, reveal: false };
    clock.set(0);
    setZoomed(false);
    setRun(++runId.current);
  };
  const changeView = (step: number) => {
    if (run !== null) return;
    setDirection(step);
    setView(current => (current + step + VIEWS.length) % VIEWS.length);
  };
  const current = VIEWS[view];
  const busy = run !== null;

  return (
    <Surface style={styles.container}>
      <View style={styles.header}>
        <View accessibilityLiveRegion="polite" style={styles.titleRow}>
          <Text style={styles.title}>{current.label}</Text>
          <Text style={styles.counter}>{view + 1} / {VIEWS.length}</Text>
        </View>
        <PressScale accessibilityLabel={zoomed ? 'Zoom out of band view' : 'Zoom in on band view'} accessibilityRole="button" accessibilityState={{ disabled: busy, expanded: zoomed }} disabled={busy} onPress={() => setZoomed(value => !value)} style={[styles.control, busy && styles.disabled]}>
          <Svg aria-hidden={true} height={22} viewBox="0 0 24 24" width={22}>
            <Circle cx={10} cy={10} fill="none" r={6} stroke={palette.ink} strokeWidth={1.7} />
            <Path d={`M14.5 14.5 21 21 M7 10h6${zoomed ? '' : ' M10 7v6'}`} fill="none" stroke={palette.ink} strokeLinecap="round" strokeWidth={1.7} />
          </Svg>
        </PressScale>
      </View>
      <View style={styles.stageRow}>
        <CameraArrow direction={-1} disabled={busy} onPress={() => changeView(-1)} />
        <View accessibilityLabel={unavailableViews.includes(view) ? 'Band artwork unavailable' : `HeatSense Band, ${fallbacks.includes(view) ? 'overview artwork fallback' : `${current.label.toLowerCase()} view`}${zoomed ? ', zoomed in' : ''}`} accessibilityRole="image" accessible style={styles.stage}>
          <Animated.View style={[StyleSheet.absoluteFill, artworkMotion]}>
            {VIEWS.map((item, index) => <CameraLayer direction={direction} key={item.key} moving={moving} onFallback={() => setFallbacks(previous => previous.includes(index) ? previous : [...previous, index])} onUnavailable={() => setUnavailableViews(previous => previous.includes(index) ? previous : [...previous, index])} selected={view === index} source={item.source} />)}
          </Animated.View>
        </View>
        <CameraArrow direction={1} disabled={busy} onPress={() => changeView(1)} />
      </View>
      {unavailableViews.includes(view) ? <Text style={styles.fallback}>Band artwork unavailable.</Text> : fallbacks.includes(view) ? <Text style={styles.fallback}>Overview shown — this view is unavailable.</Text> : null}
      <Animated.View style={buttonMotion}>
        <ActionButton accessibilityHint="Runs a two-second preview, then opens heart rate" disabled={busy} label="Explore heart rate" onPress={startPreview} variant="secondary" />
      </Animated.View>
    </Surface>
  );
}

function CameraArrow({ direction, disabled, onPress }: { direction: number; disabled: boolean; onPress: () => void }) {
  const styles = useAthleteStyles(baseStyles);
  const palette = useAthletePalette();
  return (
    <PressScale accessibilityLabel={direction < 0 ? 'Previous band view' : 'Next band view'} accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.control, disabled && styles.disabled]}>
      <Svg aria-hidden={true} fill="none" height={24} stroke={palette.ink} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} viewBox="0 0 24 24" width={24}><Path d={direction < 0 ? 'm14 6-6 6 6 6' : 'm10 6 6 6-6 6'} /></Svg>
    </PressScale>
  );
}

function CameraLayer({ selected, moving, direction, source, onFallback, onUnavailable }: { selected: boolean; moving: boolean; direction: number; source: number; onFallback: () => void; onUnavailable: () => void }) {
  const styles = useAthleteStyles(baseStyles);
  const [failed, setFailed] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const opacity = useSharedValue(selected ? 1 : 0);
  const x = useSharedValue(selected ? 0 : direction * 6);
  useEffect(() => {
    // A fully hidden camera needs no animation. Place it for its next entrance.
    if (!selected && opacity.get() === 0) { x.set(direction * 6); return; }
    // Interrupted selections continue from their current opacity and position.
    opacity.set(moving ? withTiming(selected ? 1 : 0, { duration: MOTION.camera, easing: EASE_OUT }) : selected ? 1 : 0);
    x.set(moving ? withTiming(selected ? 0 : -direction * 6, { duration: MOTION.camera, easing: EASE_OUT }) : 0);
    return () => { cancelAnimation(opacity); cancelAnimation(x); };
  }, [direction, moving, opacity, selected, x]);
  const motion = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateX: x.value }] }));
  return (
    <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={[StyleSheet.absoluteFill, motion]}>
      {unavailable ? <View style={styles.unavailable}><Text style={styles.fallback}>Band artwork unavailable</Text></View> : <Image accessibilityIgnoresInvertColors contentFit="contain" onError={() => { if (failed || source === WRISTBAND_HERO) { setUnavailable(true); onUnavailable(); } else { setFailed(true); onFallback(); } }} source={failed ? WRISTBAND_HERO : source} style={StyleSheet.absoluteFill} transition={0} />}
    </Animated.View>
  );
}

const baseStyles = StyleSheet.create({
  container: { gap: 12, padding: 16 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  titleRow: { alignItems: 'baseline', flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  title: { color: Palette.ink, flexShrink: 1, fontSize: 17, fontWeight: '600' },
  counter: { color: Palette.inkMuted, fontSize: 14, fontVariant: ['tabular-nums'] },
  stageRow: { alignItems: 'center', flexDirection: 'row', gap: 8, height: 220 },
  stage: { flex: 1, height: 220, overflow: 'hidden' },
  control: { alignItems: 'center', borderColor: Palette.border, borderRadius: 24, borderWidth: 1, height: 48, justifyContent: 'center', width: 48 },
  disabled: { opacity: 0.45 },
  fallback: { color: Palette.inkMuted, fontSize: 14, lineHeight: 20 },
  unavailable: { alignItems: 'center', flex: 1, justifyContent: 'center' },
});
