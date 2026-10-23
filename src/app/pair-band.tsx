import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInUp, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { BandSpot } from '@/components/band-journey';
import { EntryButton, EntryHeader, EntryHeading, EntryLink, EntryScreen, entryStyles } from '@/components/entry-ui';
import { HeatSenseLogo } from '@/components/heatsense-logo';
import { Entry } from '@/constants/entry-theme';
import { firebaseAuth, firestore } from '@/services/firebase';
import { savePairing } from '@/services/band-vitals';
import { PAIRED_SERIAL } from '@/state/band-uplink';
import { setPreference } from '@/state/preferences';

// Pairing the HeatSense Band, in the onboarding's welcome-screen design: get the band ready, put it
// on, look for the pairing light, pick your band, connect. There is no Bluetooth layer yet (see
// README, "HeatSense Band"), so finding and connecting are simulated, and every step says so.

const SERIAL = PAIRED_SERIAL;
const STEPS = ['ready', 'wear', 'light', 'select', 'connecting', 'connected'] as const;
type Step = (typeof STEPS)[number];

const HEADING: Record<Step, { lead: string; accent: string }> = {
  ready: { lead: 'Pair your', accent: 'HeatSense Band.' },
  wear: { lead: 'Put on', accent: 'your band.' },
  light: { lead: 'Look for the', accent: 'pairing light.' },
  select: { lead: 'Select', accent: 'your band.' },
  connecting: { lead: 'Connecting', accent: 'to your band.' },
  connected: { lead: 'Band', accent: 'connected.' },
};

const COPY: Record<Step, string> = {
  ready: 'Charge it for 15 minutes first, so it lasts through practice.',
  wear: 'Snug, a finger’s width above your wrist bone, sensor window against your skin.',
  light: 'A blinking peach light on the side of the pod means it’s ready to pair.',
  select: 'If more than one band shows up, match the serial number on the back of your pod.',
  connecting: `Pairing with HeatSense Band ${SERIAL}.`,
  connected: 'Your band is ready for practice.',
};

function BandShot({ id, size, light = false }: { id: string; size: number; light?: boolean }) {
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0.3);
  useEffect(() => {
    if (light && !reduced) pulse.set(withRepeat(withSequence(withTiming(1, { duration: 500 }), withTiming(0.3, { duration: 700 })), -1));
  }, [light, pulse, reduced]);
  const glow = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return (
    <BandSpot height={size} id={id} style={styles.shot}>
      {/* The pairing light sits on the sensor pod's right edge. */}
      {light ? <Animated.View style={[styles.led, { left: size * 0.695 * 0.88 - 6, top: size * 0.31 - 6 }, glow]} /> : null}
    </BandSpot>
  );
}

/** Phone ⋯ band, with a dot travelling between them, then a check once connected. */
function Link({ connected }: { connected: boolean }) {
  const reduced = useReducedMotion();
  const travel = useSharedValue(0);
  useEffect(() => {
    if (!connected && !reduced) travel.set(withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), -1));
  }, [connected, reduced, travel]);
  const dot = useAnimatedStyle(() => ({ transform: [{ translateX: travel.value * 110 }] }));
  return (
    <View accessibilityLabel={connected ? 'Connected' : 'Connecting'} accessible style={styles.link}>
      <View style={styles.phone}><HeatSenseLogo height={26} /></View>
      <View style={styles.track}>
        <View style={[styles.line, connected && styles.lineOn]} />
        {connected ? (
          <Animated.View entering={reduced ? undefined : FadeIn.duration(300)} style={styles.check}>
            <Svg fill="none" height={26} stroke={Entry.canvas} strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} viewBox="0 0 24 24" width={26}><Path d="m5 12 4 4 10-10" /></Svg>
          </Animated.View>
        ) : <Animated.View style={[styles.travel, dot]} />}
      </View>
      <BandShot id={`pair-link-${connected ? 'on' : 'off'}`} size={96} />
    </View>
  );
}

export default function PairBandScreen() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const inSetup = onboarding === '1';
  const [step, setStep] = useState<Step>('ready');
  const [help, setHelp] = useState(false);
  const [found, setFound] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const index = STEPS.indexOf(step);
  const go = (next: Step) => { setHelp(false); if (next === 'select') setFound(false); setStep(next); };
  const finish = () => (inSetup ? router.replace('/notifications') : router.canGoBack() ? router.back() : router.replace('/dashboard?role=athlete&tab=band'));
  const back = () => (index > 0 && step !== 'connected' ? go(STEPS[index - 1]) : router.canGoBack() ? router.back() : finish());

  // Searching for nearby bands.
  useEffect(() => {
    if (step !== 'select') return;
    timer.current = setTimeout(() => setFound(true), 1200);
  }, [step]);

  // Connecting, then connected.
  useEffect(() => {
    if (step !== 'connecting') return;
    timer.current = setTimeout(() => {
      setPreference('bandConnected', true);
      // Signed-in athletes keep the pairing on their account; offline sample builds just remember it.
      if (firestore && firebaseAuth?.currentUser) savePairing(SERIAL).catch(() => {});
      setStep('connected');
    }, 1800);
  }, [step]);

  const rise = (delay: number) => (reduced ? undefined : FadeInUp.delay(delay).duration(520));
  const fade = (delay: number) => (reduced ? undefined : FadeIn.delay(delay).duration(420));
  const linking = step === 'connecting' || step === 'connected';

  const action: { label: string; onPress: () => void } | null = {
    ready: { label: 'Get started', onPress: () => go('wear') },
    wear: { label: 'Continue', onPress: () => go('light') },
    light: { label: 'Start pairing', onPress: () => go('select') },
    select: null,
    connecting: null,
    connected: { label: 'Continue', onPress: finish },
  }[step];

  return (
    <EntryScreen background="complete" backgroundDrawIn={250} key={step}>{(compact) => <>
      <Animated.View entering={fade(0)}>
        <EntryHeader brand={false} onBack={step === 'connected' ? undefined : back} progress={{ step: index + 1, total: STEPS.length }} />
      </Animated.View>
      <EntryHeading accent={HEADING[step].accent} compact={compact} delay={120} lead={HEADING[step].lead} size="hero" style={{ marginTop: compact ? 22 : 34 }} />
      <Animated.Text entering={fade(450)} style={entryStyles.description}>{COPY[step]}</Animated.Text>

      <Animated.View entering={rise(500)} style={styles.stage}>
        {linking ? <Link connected={step === 'connected'} /> : <BandShot id={`pair-${step}`} light={step === 'light'} size={compact ? 200 : 240} />}
      </Animated.View>

      {step === 'select' ? (
        <Animated.View entering={rise(650)}>
          {found ? (
            <Pressable accessibilityHint="Pairs this band" accessibilityRole="button" onPress={() => go('connecting')} style={({ pressed }) => [styles.device, pressed && styles.pressed]}>
              <Text style={styles.deviceText}>HeatSense Band {SERIAL}</Text>
              <Svg fill="none" height={20} stroke={Entry.ink} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" width={20}><Path d="m9 6 6 6-6 6" /></Svg>
            </Pressable>
          ) : (
            <Text accessibilityLiveRegion="polite" style={styles.searching}>Looking for bands nearby…</Text>
          )}
        </Animated.View>
      ) : null}

      {help ? (
        <Text style={styles.help}>
          {step === 'wear'
            ? 'The sensors read through the back of the pod, so a loose band gives patchy readings. Tighten it one notch if it slides.'
            : 'Charge the band for 15 minutes, then double-tap the top of the pod. The light should start blinking.'}
        </Text>
      ) : null}

      <View style={styles.open} />
      <Text style={styles.demo}>Demo pairing. Bluetooth arrives with the band firmware.</Text>
      <Animated.View entering={rise(700)} style={styles.actions}>
        {action ? <EntryButton label={action.label} onPress={action.onPress} /> : null}
        {step === 'wear' || step === 'light' ? <EntryLink label={help ? 'Hide tips' : step === 'wear' ? 'Need help?' : 'Not seeing the light?'} onPress={() => setHelp(!help)} /> : null}
        {inSetup && step === 'ready' ? <EntryLink label="I don’t have a band yet" onPress={finish} /> : null}
      </Animated.View>
    </>}</EntryScreen>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.8 },
  stage: { alignItems: 'center', marginTop: 24 },
  shot: { alignSelf: 'center' },
  led: { backgroundColor: Entry.peach, borderRadius: 6, height: 12, position: 'absolute', shadowColor: Entry.peach, shadowOpacity: 1, shadowRadius: 10, width: 12 },
  device: { alignItems: 'center', backgroundColor: Entry.surface, borderColor: Entry.line, borderRadius: 18, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, minHeight: 60, paddingHorizontal: 18 },
  deviceText: { color: Entry.ink, fontFamily: Entry.strong, fontSize: 16 },
  searching: { color: Entry.muted, fontFamily: Entry.medium, fontSize: 15, marginTop: 24, textAlign: 'center' },
  help: { color: Entry.muted, fontFamily: Entry.body, fontSize: 15, lineHeight: 22, marginTop: 16 },
  link: { alignItems: 'center', alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between', marginVertical: 16 },
  phone: { alignItems: 'center', backgroundColor: '#000', borderColor: Entry.line, borderRadius: 18, borderWidth: 1, height: 110, justifyContent: 'center', width: 62 },
  track: { alignItems: 'center', flex: 1, height: 40, justifyContent: 'center', marginHorizontal: 8 },
  line: { borderColor: Entry.lineStrong, borderStyle: 'dashed', borderTopWidth: 2, height: 0, width: '100%' },
  lineOn: { borderColor: Entry.peach, borderStyle: 'solid' },
  travel: { backgroundColor: Entry.peach, borderRadius: 5, height: 10, left: 0, position: 'absolute', width: 10 },
  check: { alignItems: 'center', backgroundColor: Entry.peach, borderRadius: 26, height: 52, justifyContent: 'center', position: 'absolute', width: 52 },
  open: { flexGrow: 1, minHeight: 24 },
  demo: { color: Entry.subtle, fontFamily: Entry.body, fontSize: 12, lineHeight: 17, marginBottom: 12, textAlign: 'center' },
  actions: { gap: 14 },
});
