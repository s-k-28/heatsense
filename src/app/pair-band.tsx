import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { HeatSenseLogo } from '@/components/heatsense-logo';
import { StepLink, StepScreen, caps } from '@/components/step-kit';
import { Entry } from '@/constants/entry-theme';
import { connectBand, prepareBluetooth, startScan, stopScan, useBand, type FoundBand } from '@/state/band-ble';
import { setPreference } from '@/state/preferences';

// Pairing the HeatSense Band, told as WHOOP tells it: get the band ready, put it on, look for the
// pairing light, pick your band, connect. On a phone, finding and connecting use Bluetooth
// (state/band-ble). Where there's no Bluetooth radio (the iOS Simulator, the web) the same steps run
// as a demo, and those screens say so.

const BAND = require('@/assets/images/heatsense-band-refined.png');
const SERIAL = 'HS-02A7';
const STEPS = ['ready', 'wear', 'light', 'select', 'connecting', 'connected'] as const;
type Step = (typeof STEPS)[number];

function BandShot({ size = 260, light = false }: { size?: number; light?: boolean }) {
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0.3);
  useEffect(() => {
    if (light && !reduced) pulse.set(withRepeat(withSequence(withTiming(1, { duration: 500 }), withTiming(0.3, { duration: 700 })), -1));
  }, [light, pulse, reduced]);
  const glow = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return (
    <View style={[styles.shot, { height: size, width: size }]}>
      <Image accessibilityIgnoresInvertColors contentFit="contain" source={BAND} style={StyleSheet.absoluteFill} />
      {/* The pairing light sits on the sensor pod's edge. */}
      {light ? <Animated.View style={[styles.led, { left: size * 0.6, top: size * 0.34 }, glow]} /> : null}
    </View>
  );
}

function DemoNote() {
  return <Text style={styles.demo}>Demo pairing: this device has no Bluetooth, so finding and connecting are simulated.</Text>;
}

/** What to show while choosing a band over real Bluetooth. */
function RealBandList({ onPick }: { onPick: (band: FoundBand) => void }) {
  const band = useBand();
  if (band.radio === 'off') return <Text style={styles.help}>Turn on Bluetooth to find your band.</Text>;
  if (band.radio === 'unauthorized') {
    return (
      <>
        <Text style={styles.help}>HeatSense needs Bluetooth permission to find your band.</Text>
        <StepLink label="Open Settings" onPress={() => Linking.openSettings()} />
      </>
    );
  }
  return (
    <>
      {band.found.map((found) => (
        <Pressable accessibilityHint="Connects to this band" accessibilityRole="button" key={found.id} onPress={() => onPick(found)} style={({ pressed }) => [styles.device, pressed && { opacity: 0.7 }]}>
          <View>
            <Text style={[caps, { color: Entry.ink, fontSize: 13 }]}>{found.name}</Text>
            {found.rssi !== null ? <Text style={styles.signal}>{found.rssi > -60 ? 'Strong signal' : found.rssi > -80 ? 'Good signal' : 'Weak signal: move closer'}</Text> : null}
          </View>
          <Svg fill="none" height={20} stroke={Entry.ink} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" width={20}><Path d="m9 6 6 6-6 6" /></Svg>
        </Pressable>
      ))}
      {band.status === 'scanning' ? (
        <Text accessibilityLiveRegion="polite" style={[caps, styles.searching]}>Looking for bands nearby…</Text>
      ) : band.found.length === 0 ? (
        <>
          <Text style={styles.help}>No band found. Make sure it’s switched on and close to your phone.</Text>
          <StepLink label="Search again" onPress={startScan} />
        </>
      ) : null}
      {band.error ? <Text style={styles.error}>{band.error}</Text> : null}
    </>
  );
}

/** Phone ⋯ band, with dots travelling between them, then a check once connected. */
function Link({ connected }: { connected: boolean }) {
  const reduced = useReducedMotion();
  const travel = useSharedValue(0);
  useEffect(() => {
    if (!connected && !reduced) travel.set(withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), -1));
  }, [connected, reduced, travel]);
  const dot = useAnimatedStyle(() => ({ transform: [{ translateX: travel.value * 120 }] }));
  return (
    <View accessibilityLabel={connected ? 'Connected' : 'Connecting'} accessible style={styles.link}>
      <View style={styles.phone}><HeatSenseLogo height={26} /></View>
      <View style={styles.track}>
        <View style={[styles.line, connected && { backgroundColor: Entry.peach, borderStyle: 'solid' }]} />
        {connected ? (
          <Animated.View entering={reduced ? undefined : FadeIn.duration(300)} style={styles.check}>
            <Svg fill="none" height={26} stroke={Entry.canvas} strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} viewBox="0 0 24 24" width={26}><Path d="m5 12 4 4 10-10" /></Svg>
          </Animated.View>
        ) : <Animated.View style={[styles.travel, dot]} />}
      </View>
      <BandShot size={96} />
    </View>
  );
}

export default function PairBandScreen() {
  const router = useRouter();
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const inSetup = onboarding === '1';
  const [step, setStep] = useState<Step>('ready');
  const [help, setHelp] = useState(false);
  const [found, setFound] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // Real Bluetooth when this device has a radio; the demo flow otherwise.
  const band = useBand();
  useEffect(() => { prepareBluetooth(); }, []);
  const real = band.radio === 'on' || band.radio === 'off' || band.radio === 'unauthorized';
  const pick = (choice: FoundBand) => {
    go('connecting');
    connectBand(choice).then((ok) => setStep(ok ? 'connected' : 'select'));
  };

  const index = STEPS.indexOf(step);
  const go = (next: Step) => { setHelp(false); if (next === 'select') setFound(false); setStep(next); };
  const finish = () => (inSetup ? router.replace('/notifications') : router.canGoBack() ? router.back() : router.replace('/dashboard?role=athlete&tab=profile'));
  const back = () => (index > 0 && step !== 'connected' ? go(STEPS[index - 1]) : router.canGoBack() ? router.back() : finish());
  const progress = inSetup ? 0.9 + index * 0.012 : (index + 1) / STEPS.length;
  const skip = inSetup ? <StepLink label="I don’t have a band yet" onPress={finish} /> : null;

  // Searching for nearby bands: a real scan, or the demo's short wait.
  useEffect(() => {
    if (step !== 'select') return;
    if (real) {
      if (band.radio === 'on') startScan();
      return stopScan;
    }
    timer.current = setTimeout(() => setFound(true), 1200);
  }, [band.radio, real, step]);

  // Demo only: connecting, then connected. Real connections finish in `pick`.
  useEffect(() => {
    if (step !== 'connecting' || real) return;
    timer.current = setTimeout(() => { setPreference('bandConnected', true); setStep('connected'); }, 1800);
  }, [real, step]);

  switch (step) {
    case 'ready':
      return (
        <StepScreen icon={<BandShot />} next={{ enabled: true, label: 'Get started', onPress: () => go('wear') }} onBack={back} progress={progress} title="Pair your HeatSense Band">
          <DemoNote />
          {skip}
        </StepScreen>
      );
    case 'wear':
      return (
        <StepScreen icon={<BandShot />} next={{ enabled: true, onPress: () => go('light') }} onBack={back} progress={progress} title="Put on your band">
          <StepLink label={help ? 'Hide tips' : 'Need help?'} onPress={() => setHelp(!help)} />
          {help ? <Text style={styles.help}>The sensors read through the back of the pod, so a loose band gives patchy readings. Tighten it one notch if it slides.</Text> : null}
        </StepScreen>
      );
    case 'light':
      return (
        <StepScreen icon={<BandShot light />} next={{ enabled: true, label: 'Start pairing', onPress: () => go('select') }} onBack={back} progress={progress} title="Check for the pairing light">
          <StepLink label={help ? 'Hide tips' : 'Not seeing the light?'} onPress={() => setHelp(!help)} />
          {help ? (
            <View style={styles.helpList}>
              <Text style={styles.help}>1. Make sure the band has some charge: plug it in for 15 minutes.</Text>
              <Text style={styles.help}>2. Double-tap the top of the pod. The light should start blinking.</Text>
              <Text style={styles.help}>3. Still nothing? Keep it on the charger and try again in a few minutes.</Text>
            </View>
          ) : null}
        </StepScreen>
      );
    case 'select':
      return (
        <StepScreen icon={<BandShot size={200} />} onBack={back} progress={progress} title="Select your band" top="tight">
          {real ? <RealBandList onPick={pick} /> : found ? (
            <Pressable accessibilityHint="Pairs this band" accessibilityRole="button" onPress={() => go('connecting')} style={({ pressed }) => [styles.device, pressed && { opacity: 0.7 }]}>
              <Text style={[caps, { color: Entry.ink, fontSize: 13 }]}>HeatSense Band {SERIAL}</Text>
              <Svg fill="none" height={20} stroke={Entry.ink} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" width={20}><Path d="m9 6 6 6-6 6" /></Svg>
            </Pressable>
          ) : (
            <Text accessibilityLiveRegion="polite" style={[caps, styles.searching]}>Looking for bands nearby…</Text>
          )}
          {real ? null : <DemoNote />}
        </StepScreen>
      );
    case 'connecting':
    case 'connected': {
      const connected = step === 'connected';
      return (
        <StepScreen
          footer={connected ? <StepContinue onPress={finish} /> : undefined}
          onBack={connected ? undefined : back}
          title={connected ? `${real ? band.device?.name ?? 'Band' : SERIAL} connected` : 'Connecting'}>
          <Link connected={connected} />
          {real ? null : <DemoNote />}
        </StepScreen>
      );
    }
  }
}

function StepContinue({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.continue, pressed && { opacity: 0.7 }]}>
      <Text style={[caps, { color: Entry.canvas, fontSize: 13 }]}>Continue</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shot: { alignSelf: 'center' },
  led: { backgroundColor: Entry.peach, borderRadius: 6, height: 12, position: 'absolute', shadowColor: Entry.peach, shadowOpacity: 1, shadowRadius: 10, width: 12 },
  demo: { color: Entry.subtle, fontWeight: '400', fontSize: 12, lineHeight: 17 },
  help: { color: Entry.muted, fontWeight: '400', fontSize: 14, lineHeight: 20 },
  helpList: { gap: 8 },
  device: { alignItems: 'center', backgroundColor: Entry.raised, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', minHeight: 58, paddingHorizontal: 18 },
  searching: { color: Entry.muted, paddingVertical: 20, textAlign: 'center' },
  signal: { color: Entry.subtle, fontSize: 12, marginTop: 2 },
  error: { color: Entry.error, fontSize: 13, lineHeight: 18 },
  link: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginVertical: 24 },
  phone: { alignItems: 'center', backgroundColor: '#000', borderColor: Entry.line, borderRadius: 18, borderWidth: 1, height: 110, justifyContent: 'center', width: 62 },
  track: { alignItems: 'center', flex: 1, height: 40, justifyContent: 'center', marginHorizontal: 8 },
  line: { borderColor: Entry.lineStrong, borderStyle: 'dashed', borderTopWidth: 2, height: 0, width: '100%' },
  travel: { backgroundColor: Entry.peach, borderRadius: 5, height: 10, left: 0, position: 'absolute', width: 10 },
  check: { alignItems: 'center', backgroundColor: Entry.peach, borderRadius: 26, height: 52, justifyContent: 'center', position: 'absolute', width: 52 },
  continue: { alignItems: 'center', backgroundColor: Entry.peach, borderRadius: 999, justifyContent: 'center', minHeight: 54 },
});
