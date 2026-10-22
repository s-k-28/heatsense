import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, useReducedMotion } from 'react-native-reanimated';

import { EntryButton, EntryHeader, EntryHeading, EntryLink, EntryScreen, entryStyles } from '@/components/entry-ui';
import { Entry } from '@/constants/entry-theme';

// Heat alerts, asked for at the moment they make sense: right after pairing the band.
// ponytail: explains alerts only. Requesting OS permission needs expo-notifications, which isn't
// installed yet; add it with the first real push (zone changes, overdue rechecks).

const EXAMPLES = [
  'The field moved into the Orange zone',
  'A WBGT recheck is due in 5 minutes',
  'Practice ends in 10 minutes',
];

export default function NotificationsScreen() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const rise = (delay: number) => (reducedMotion ? undefined : FadeInUp.delay(delay).duration(520));
  const fade = (delay: number) => (reducedMotion ? undefined : FadeIn.delay(delay).duration(420));
  const done = () => router.replace('/athlete/done');
  return (
    <EntryScreen background="form">{(compact) => <>
      <Animated.View entering={fade(0)}>
        <EntryHeader onBack={() => (router.canGoBack() ? router.back() : done())} />
      </Animated.View>
      <EntryHeading accent="right on time." compact={compact} delay={150} lead="Heat alerts," style={{ marginTop: compact ? 30 : 44 }} />
      <Animated.Text entering={fade(500)} style={entryStyles.description}>HeatSense tells you when the field changes.</Animated.Text>
      {/* What an alert looks like, quieter the further down the list. */}
      <View style={[styles.list, { marginTop: compact ? 24 : 34 }]}>
        {EXAMPLES.map((text, i) => (
          <Animated.View entering={rise(600 + i * 110)} key={text} style={[styles.alert, { opacity: 1 - i * 0.25 }]}>
            <Text style={styles.source}>HeatSense · now</Text>
            <Text style={styles.text}>{text}</Text>
          </Animated.View>
        ))}
      </View>
      <View style={styles.open} />
      <Animated.View entering={rise(950)} style={styles.actions}>
        <EntryButton label="Continue" onPress={done} />
        <EntryLink label="Not now" onPress={done} />
      </Animated.View>
    </>}</EntryScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  alert: { backgroundColor: Entry.surface, borderColor: Entry.line, borderWidth: 1, borderRadius: 20, gap: 4, paddingHorizontal: 18, paddingVertical: 14 },
  source: { color: Entry.subtle, fontFamily: Entry.medium, fontSize: 12.5 },
  text: { color: Entry.ink, fontFamily: Entry.body, fontSize: 15.5, lineHeight: 21 },
  open: { flexGrow: 1, minHeight: 28 },
  actions: { gap: 18 },
});
