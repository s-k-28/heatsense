import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, useReducedMotion } from 'react-native-reanimated';

import { BrandAssemble } from '@/components/brand-assemble';
import { EntryButton, EntryHeader, EntryHeading, EntryScreen, entryStyles } from '@/components/entry-ui';
import { Entry } from '@/constants/entry-theme';

// End of setup: what happens next, in three steps, instead of a preview full of sample numbers.
// A branded finish: the H assembles, the two-tone headline rises, the steps follow in turn.

type ReadyRole = 'Coach' | 'Athletic trainer' | 'Athlete';

const SETUP: Record<ReadyRole, { dashboardRole: 'coach' | 'trainer' | 'athlete'; steps: { title: string; detail: string }[] }> = {
  Coach: {
    dashboardRole: 'coach',
    steps: [
      { title: 'Take a field reading', detail: 'Enter the WBGT from your meter. HeatSense sets the zone from your UIL class.' },
      { title: 'Approve your athletes', detail: 'Join requests show up on the Team tab as athletes enter your code.' },
      { title: 'Recheck on time', detail: 'HeatSense counts down to the next reading and flags it when it’s late.' },
    ],
  },
  'Athletic trainer': {
    dashboardRole: 'trainer',
    steps: [
      { title: 'Review the heat plan', detail: 'Check the UIL class and recheck interval for each team.' },
      { title: 'Follow live readings', detail: 'Every reading, zone and acknowledgment is recorded as it happens.' },
      { title: 'Export the record', detail: 'Share any practice’s full record from the Practice sheet.' },
    ],
  },
  Athlete: {
    dashboardRole: 'athlete',
    steps: [
      { title: 'Wear your band to practice', detail: 'Optional. It helps your coach and trainer notice when you need a break.' },
      { title: 'Check the zone', detail: 'See the field’s heat zone and what it means for practice today.' },
      { title: 'Speak up early', detail: 'Feeling dizzy, sick or confused? Stop and tell a coach right away.' },
    ],
  },
};

// The headline for each role, in the welcome's white-then-peach pattern.
const HEADING: Record<ReadyRole, { lead: string; accent: string }> = {
  Coach: { lead: 'Your team.', accent: 'Your start.' },
  'Athletic trainer': { lead: 'Your athletes.', accent: 'Your watch.' },
  Athlete: { lead: 'Your team.', accent: 'Your start.' },
};

export default function ReadyScreen() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const key = (role && role in SETUP ? role : 'Coach') as ReadyRole;
  const setup = SETUP[key];
  const rise = (delay: number) => (reducedMotion ? undefined : FadeInUp.delay(delay).duration(560));
  const fade = (delay: number) => (reducedMotion ? undefined : FadeIn.delay(delay).duration(420));
  return (
    <EntryScreen background="ready" backgroundDrawIn={450}>{(compact) => <>
      <Animated.View entering={fade(0)}>
        <EntryHeader brand={false} onBack={() => (router.canGoBack() ? router.back() : router.replace('/role'))} />
      </Animated.View>
      {/* The branded finish: the H assembles above the headline, then the three next steps follow. */}
      <BrandAssemble delay={200} size={compact ? 44 : 52} style={{ marginTop: compact ? 26 : 40 }} />
      <EntryHeading accent={HEADING[key].accent} compact={compact} delay={650} lead={HEADING[key].lead} size="hero" style={styles.heading} />
      <Animated.Text entering={fade(1000)} style={entryStyles.description}>Three things to do first.</Animated.Text>
      <View style={[styles.list, { marginTop: compact ? 22 : 30 }]}>
        {setup.steps.map((step, i) => (
          <Animated.View accessible entering={rise(1100 + i * 110)} key={step.title} style={styles.item}>
            <Text style={styles.index}>{i + 1}</Text>
            <View style={styles.copy}>
              <Text style={styles.itemTitle}>{step.title}</Text>
              <Text style={styles.itemDetail}>{step.detail}</Text>
            </View>
          </Animated.View>
        ))}
      </View>
      <View style={styles.open} />
      <Animated.View entering={rise(1500)}>
        <EntryButton label="Finish setup" onPress={() => router.replace(`/dashboard?role=${setup.dashboardRole}` as never)} />
      </Animated.View>
    </>}</EntryScreen>
  );
}

const styles = StyleSheet.create({
  heading: { marginTop: 22 },
  list: { gap: 20 },
  item: { flexDirection: 'row', gap: 16 },
  index: { color: Entry.peach, fontFamily: Entry.heading, fontSize: 17, lineHeight: 22, width: 16 },
  copy: { flex: 1, gap: 3 },
  itemTitle: { color: Entry.ink, fontFamily: Entry.strong, fontSize: 16.5, lineHeight: 22, letterSpacing: -0.2 },
  itemDetail: { color: Entry.muted, fontFamily: Entry.body, fontSize: 14, lineHeight: 20 },
  open: { flexGrow: 1, minHeight: 28 },
});
