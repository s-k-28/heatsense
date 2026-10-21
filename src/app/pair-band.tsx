import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeatIcon } from '@/components/heat-icon';
import { setPreference } from '@/state/preferences';

// Pairing the HeatSense Band: a full-screen device picker. The band is found nearby, the athlete taps
// it to pair, and the row confirms once it's connected. There's no Bluetooth layer yet, so the search
// and the pairing are simulated with short delays.

const BAND = require('@/assets/images/heatsense-band-refined.png');
const SERIAL = '02A7';

const chevronLeft = { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' } as const;
const chevronRight = { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' } as const;
const check = { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' } as const;

type Phase = 'searching' | 'found' | 'pairing' | 'paired';

export default function PairBandScreen() {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('searching');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timer.current = setTimeout(() => setPhase('found'), 1400);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  const pair = () => {
    if (phase !== 'found') return;
    setPhase('pairing');
    timer.current = setTimeout(() => {
      setPreference('bandConnected', true);
      setPhase('paired');
    }, 1600);
  };

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/dashboard?role=athlete&tab=profile'));

  const fade = (delay: number) => (reducedMotion ? undefined : FadeIn.delay(delay).duration(400));
  const rise = (delay: number) => (reducedMotion ? undefined : FadeInDown.delay(delay).duration(450));

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <LinearGradient colors={['#2B2F35', '#15171A', '#0B0C0E']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />

      <View style={[styles.content, { paddingBottom: insets.bottom + 16, paddingTop: insets.top + 4 }]}>
        <Pressable accessibilityLabel="Back" accessibilityRole="button" hitSlop={12} onPress={leave} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <HeatIcon name={chevronLeft} size={22} tintColor="#FFFFFF" weight="semibold" />
        </Pressable>

        <Animated.Text accessibilityRole="header" entering={fade(80)} style={styles.title}>
          {phase === 'paired' ? 'Band paired' : 'Select your device'}
        </Animated.Text>
        <Animated.Text entering={fade(160)} style={styles.subtitle}>
          {phase === 'paired'
            ? 'Your recovery, skin, sweat and movement trends will start with your next practice.'
            : 'If more than one band appears, check the serial number on the back of your band to find yours.'}
        </Animated.Text>

        <Animated.View entering={rise(200)} style={styles.hero}>
          <Image accessibilityLabel="HeatSense Band" contentFit="contain" source={BAND} style={styles.band} />
        </Animated.View>

        <View style={styles.list}>
          {phase === 'searching' ? (
            <View accessibilityLiveRegion="polite" style={styles.searching}>
              <ActivityIndicator color="rgba(255,255,255,0.7)" />
              <Text style={styles.searchingText}>Looking for bands nearby</Text>
            </View>
          ) : (
            <Animated.View entering={fade(0)}>
              <Pressable
                accessibilityHint={phase === 'found' ? 'Pairs this band with your phone' : undefined}
                accessibilityLabel={`HeatSense Band ${SERIAL}, ${phase === 'paired' ? 'connected' : phase === 'pairing' ? 'pairing' : 'ready to pair'}`}
                accessibilityRole="button"
                disabled={phase !== 'found'}
                onPress={pair}
                style={({ pressed }) => [styles.device, pressed && styles.devicePressed]}>
                <View style={styles.deviceCopy}>
                  <Text style={styles.deviceName}>HEATSENSE BAND {SERIAL}</Text>
                  {phase === 'pairing' ? <Text style={styles.deviceState}>Pairing…</Text> : null}
                  {phase === 'paired' ? <Text style={[styles.deviceState, styles.deviceConnected]}>Connected</Text> : null}
                </View>
                {phase === 'found' ? <HeatIcon name={chevronRight} size={17} tintColor="#FFFFFF" weight="semibold" /> : null}
                {phase === 'pairing' ? <ActivityIndicator color="#FFFFFF" /> : null}
                {phase === 'paired' ? <HeatIcon name={check} size={22} tintColor="#30D158" /> : null}
              </Pressable>
            </Animated.View>
          )}
        </View>

        <View style={styles.footer}>
          {phase === 'paired' ? (
            <OutlineButton label="Done" onPress={() => router.replace('/dashboard?role=athlete&tab=profile')} strong />
          ) : (
            <>
              <OutlineButton
                label="Replacing a band?"
                onPress={() => Alert.alert('Replacing a band', 'Disconnect the old band in Profile first, then pair the new one here. Your history stays with your account, not the band.')}
              />
              <OutlineButton
                label="Need help?"
                onPress={() => Alert.alert('Band not showing up?', 'Keep the band within a few feet of your phone, make sure it’s charged, and check that Bluetooth is on. Then go back and open this screen again.')}
              />
            </>
          )}
        </View>
      </View>
    </View>
  );
}

function OutlineButton({ label, onPress, strong }: { label: string; onPress: () => void; strong?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.outline, strong && styles.outlineStrong, pressed && styles.pressed]}>
      <Text style={[styles.outlineText, strong && styles.outlineTextStrong]}>{label.toUpperCase()}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#0B0C0E', flex: 1 },
  content: { flex: 1, paddingHorizontal: 20 },
  pressed: { opacity: 0.55 },
  back: { alignItems: 'center', height: 44, justifyContent: 'center', marginLeft: -6, width: 44 },
  title: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 1.6, marginTop: 14, textAlign: 'center', textTransform: 'uppercase' },
  subtitle: { alignSelf: 'center', color: 'rgba(235,235,245,0.6)', fontSize: 13, lineHeight: 18, marginTop: 8, maxWidth: 300, textAlign: 'center' },
  hero: { alignItems: 'center', flex: 1, justifyContent: 'center', maxHeight: 380, minHeight: 220 },
  band: { aspectRatio: 1, height: '100%', maxWidth: '100%' },
  list: { minHeight: 64 },
  searching: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'center', minHeight: 64 },
  searchingText: { color: 'rgba(235,235,245,0.6)', fontSize: 14, letterSpacing: 0.3 },
  device: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.08)', borderCurve: 'continuous', borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 64, paddingHorizontal: 18 },
  devicePressed: { backgroundColor: 'rgba(255,255,255,0.13)' },
  deviceCopy: { flex: 1, gap: 2 },
  deviceName: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', letterSpacing: 1.1 },
  deviceState: { color: 'rgba(235,235,245,0.6)', fontSize: 12 },
  deviceConnected: { color: '#30D158' },
  footer: { gap: 12, marginTop: 'auto', paddingTop: 24 },
  outline: { alignItems: 'center', borderColor: 'rgba(255,255,255,0.32)', borderCurve: 'continuous', borderRadius: 14, borderWidth: 1, justifyContent: 'center', minHeight: 52 },
  outlineStrong: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  outlineText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', letterSpacing: 1.3 },
  outlineTextStrong: { color: '#0B0C0E' },
});
