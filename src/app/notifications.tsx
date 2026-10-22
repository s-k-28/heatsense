import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { HeatMark } from '@/components/onboarding-art';
import { StepLink, StepScreen } from '@/components/step-kit';
import { Entry } from '@/constants/entry-theme';

// Heat alerts, asked for at the moment they make sense (after WHOOP's push-notification step).
// ponytail: explains alerts only. Requesting OS permission needs expo-notifications, which isn't
// installed yet; add it with the first real push (zone changes, overdue rechecks).

const EXAMPLES = [
  'The field moved into the Orange zone',
  'A WBGT recheck is due in 5 minutes',
  'Practice ends in 10 minutes',
];

export default function NotificationsScreen() {
  const router = useRouter();
  const done = () => router.replace('/athlete/done');
  return (
    <StepScreen
      icon={<HeatMark size={96} />}
      next={{ enabled: true, label: 'Next', onPress: done }}
      onBack={() => (router.canGoBack() ? router.back() : done())}
      progress={0.97}
      title="Heat alerts">
      <View style={styles.stack}>
        {EXAMPLES.map((text, i) => (
          <View key={text} style={[styles.card, { opacity: 1 - i * 0.22, transform: [{ scale: 1 - i * 0.04 }] }]}>
            <Text style={styles.app}>HEATSENSE · now</Text>
            <Text style={styles.text}>{text}</Text>
          </View>
        ))}
      </View>
      <StepLink label="Not now" onPress={done} />
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 8 },
  card: { backgroundColor: Entry.raised, borderRadius: 16, gap: 4, padding: 14 },
  app: { color: Entry.muted, fontFamily: Entry.strong, fontSize: 11, letterSpacing: 1 },
  text: { color: Entry.ink, fontFamily: Entry.medium, fontSize: 15 },
});
