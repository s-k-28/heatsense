import { AnimatedText, Text } from '@/components/ui/text';
import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, useReducedMotion } from 'react-native-reanimated';

import { BandSpot } from '@/components/band-journey';
import { EntryButton, EntryHeader, EntryHeading, EntryLink, EntryScreen, entryStyles } from '@/components/entry-ui';
import { Entry } from '@/constants/entry-theme';
import { askForHeatAlerts } from '@/services/heat-alerts';

// Heat alerts, asked for at the moment they make sense: right after pairing the band.
// Continue asks iOS for permission; Not now skips it (Settings can turn alerts on later).

const EXAMPLES = [
  'The field moved into the Orange zone',
];

export default function NotificationsScreen() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [requesting, setRequesting] = useState(false);
  const requestingRef = useRef(false);
  const rise = (delay: number) => (reducedMotion ? undefined : FadeInUp.delay(Math.min(delay, 60)).duration(240));
  const fade = (delay: number) => (reducedMotion ? undefined : FadeIn.delay(Math.min(delay, 60)).duration(240));
  const done = () => router.replace('/athlete/done');
  const request = async () => {
    if (requestingRef.current) return;
    requestingRef.current = true;
    setRequesting(true);
    try { await askForHeatAlerts(); }
    catch { /* Permission is optional; the next screen never claims it was granted. */ }
    finally { requestingRef.current = false; setRequesting(false); done(); }
  };
  return (
    <EntryScreen background="form">{(compact) => <>
      <Animated.View entering={fade(0)}>
        <EntryHeader bandDock={false} onBack={() => { if (!requestingRef.current) { if (router.canGoBack()) router.back(); else done(); } }} />
      </Animated.View>
      <EntryHeading accent="right on time." compact={compact} delay={150} lead="Heat alerts," style={{ marginTop: compact ? 30 : 44 }} />
      <AnimatedText entering={fade(500)} style={entryStyles.description}>{Platform.OS === 'web' ? 'Get field-zone alerts in the mobile app.' : 'Get notified when your field’s heat zone changes.'}</AnimatedText>
      {/* An example only: this screen never claims permission has been granted. */}
      <View style={[styles.list, { marginTop: compact ? 24 : 34 }]}>
        {EXAMPLES.map((text, i) => (
          <Animated.View entering={rise(600 + i * 110)} key={text}>
            <View style={styles.alert}>
              <Text style={styles.source}>Example heat alert</Text>
              <Text style={styles.text}>{text}</Text>
            </View>
          </Animated.View>
        ))}
      </View>
      <View style={[styles.open, styles.bandRoom]}><BandSpot height={compact ? 110 : 150} id="notifications" /></View>
      <Animated.View entering={rise(950)} style={styles.actions}>
        <EntryButton label={Platform.OS === 'web' ? 'Continue' : 'Turn on heat alerts'} loading={requesting} loadingLabel="Requesting permission…" onPress={Platform.OS === 'web' ? done : request} />
        {Platform.OS !== 'web' ? <EntryLink disabled={requesting} label="Not now" onPress={done} /> : null}
      </Animated.View>
    </>}</EntryScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  alert: { backgroundColor: Entry.surface, borderColor: Entry.line, borderWidth: 1, borderRadius: 28, gap: 4, paddingHorizontal: 18, paddingVertical: 14 },
  source: { color: Entry.subtle, fontFamily: Entry.medium, fontSize: 14 },
  text: { color: Entry.ink, fontFamily: Entry.body, fontSize: 16, lineHeight: 24 },
  open: { flexGrow: 1, minHeight: 28 },
  bandRoom: { alignItems: 'center', justifyContent: 'center' },
  actions: { gap: 18 },
});
