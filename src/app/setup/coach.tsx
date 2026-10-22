import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, useReducedMotion } from 'react-native-reanimated';

import { EntryButton, EntryHeader, EntryScreen, entryStyles } from '@/components/entry-ui';
import { FieldlineScene } from '@/components/fieldline-character';
import { OnboardingSelectionSurface } from '@/components/onboarding-controls';
import { ONBOARDING_STEPS } from '@/constants/entry-theme';
import { setTeamChoice, useTeamChoice, type TeamChoice } from '@/state/onboarding';

// Coach team setup, step 1 of 3: create a new team or join one. A medium Fieldline
// scene like role selection, then two choices told apart by their words.

const options: { id: TeamChoice; title: string; description: string }[] = [
  { id: 'create', title: 'Create a team', description: 'Set up your school, sport, and level.' },
  { id: 'join', title: 'Join a team', description: 'Connect with a team already on HeatSense.' },
];

export default function CoachTeamSetup() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const choice = useTeamChoice();
  const rise = (delay: number) => (reducedMotion ? undefined : FadeInUp.delay(delay).duration(480));
  const fade = (delay: number) => (reducedMotion ? undefined : FadeIn.delay(delay).duration(420));

  const back = () => (router.canGoBack() ? router.back() : router.replace('/role'));
  const next = () => { if (choice) router.push(`/team/${choice}`); };

  return (
    <EntryScreen background="team">{(compact) => <>
      <Animated.View entering={fade(0)}>
        <EntryHeader onBack={back} progress={{ step: 1, total: ONBOARDING_STEPS.coach }} />
      </Animated.View>
      <Animated.View entering={fade(150)} style={styles.illustration}>
        <FieldlineScene small={compact} compact reaction={choice ? 'coach' : null} />
      </Animated.View>
      <Animated.Text entering={rise(300)} accessibilityRole="header" style={[entryStyles.headline, compact && entryStyles.headlineCompact]}>
        {'Get your team\nready.'}
      </Animated.Text>
      <Animated.Text entering={rise(400)} style={entryStyles.description}>Start a new team or join an existing one.</Animated.Text>

      <View accessibilityRole="radiogroup" accessibilityLabel="Team setup" style={styles.options}>
        {options.map((option, index) => (
          <Animated.View key={option.id} entering={rise(520 + index * 100)}>
            <OnboardingSelectionSurface
              title={option.title}
              description={option.description}
              selected={choice === option.id}
              onPress={() => setTeamChoice(option.id)}
            />
          </Animated.View>
        ))}
      </View>

      <Animated.View entering={rise(760)} style={styles.actions}>
        <EntryButton label={choice ? 'Continue' : 'Choose an option to continue'} disabled={choice === null} onPress={next} />
      </Animated.View>
    </>}</EntryScreen>
  );
}

const styles = StyleSheet.create({
  illustration: { flexGrow: 1, justifyContent: 'center', marginVertical: 12 },
  options: { gap: 12, marginTop: 26 },
  actions: { marginTop: 28 },
});
