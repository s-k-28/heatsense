import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, useReducedMotion } from 'react-native-reanimated';

import { EntryButton, EntryHeader, EntryHeading, EntryScreen, entryStyles } from '@/components/entry-ui';
import { OnboardingSelectionSurface } from '@/components/onboarding-controls';
import { ONBOARDING_STEPS } from '@/constants/entry-theme';
import { setTeamChoice, useTeamChoice, type TeamChoice } from '@/state/onboarding';

// Coach team setup, step 1 of 3: create a new team or join one. Typography-led: the
// headline sits right under the progress track, the two choices follow, and the pill
// waits at the foot of the screen.

const options: { id: TeamChoice; title: string; description: string }[] = [
  { id: 'create', title: 'Create a team', description: 'Set up your school, sport, and level.' },
  { id: 'join', title: 'Join a team', description: 'Connect with a team already on HeatSense.' },
];

export default function CoachTeamSetup() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const choice = useTeamChoice();
  const rise = (delay: number) => (reducedMotion ? undefined : FadeInUp.delay(delay).duration(520));
  const fade = (delay: number) => (reducedMotion ? undefined : FadeIn.delay(delay).duration(420));

  const back = () => (router.canGoBack() ? router.back() : router.replace('/role'));
  const next = () => { if (choice) router.push(`/team/${choice}`); };

  return (
    <EntryScreen background="team">{(compact) => <>
      <Animated.View entering={fade(0)}>
        <EntryHeader onBack={back} progress={{ step: 1, total: ONBOARDING_STEPS.coach }} />
      </Animated.View>
      <EntryHeading accent="ready." compact={compact} delay={150} lead="Get your team" style={{ marginTop: compact ? 30 : 44 }} />
      <Animated.Text entering={fade(500)} style={entryStyles.description}>Start a new team or join an existing one.</Animated.Text>

      <View accessibilityRole="radiogroup" accessibilityLabel="Team setup" style={[styles.options, { marginTop: compact ? 26 : 36 }]}>
        {options.map((option, index) => (
          <Animated.View key={option.id} entering={rise(560 + index * 90)}>
            <OnboardingSelectionSurface
              title={option.title}
              description={option.description}
              selected={choice === option.id}
              onPress={() => setTeamChoice(option.id)}
            />
          </Animated.View>
        ))}
      </View>

      <View style={styles.open} />
      <Animated.View entering={rise(780)} style={styles.actions}>
        <EntryButton label={choice ? 'Continue' : 'Choose an option to continue'} disabled={choice === null} onPress={next} />
      </Animated.View>
    </>}</EntryScreen>
  );
}

const styles = StyleSheet.create({
  options: { gap: 12 },
  open: { flexGrow: 1, minHeight: 28 },
  actions: { marginTop: 8 },
});
