import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, useReducedMotion } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { EntryButton, EntryHeader, EntryScreen, entryStyles } from '@/components/entry-ui';
import { FieldlineScene } from '@/components/fieldline-character';
import { OnboardingSelectionButton } from '@/components/onboarding-controls';
import { Entry } from '@/constants/entry-theme';
import { setTeamChoice, useTeamChoice, type TeamChoice } from '@/state/onboarding';

// Coach team setup: create a new team or join one. Entry design language, with a
// medium Fieldline scene like role selection so the two choices stay prominent.

type IconProps = { size?: number };

// Lucide "circle-plus".
function CreateIcon({ size = 24 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={Entry.blue} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><Circle cx={12} cy={12} r={10} /><Path d="M8 12h8" /><Path d="M12 8v8" /></Svg>;
}

// Lucide "users".
function JoinIcon({ size = 24 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={Entry.blue} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><Circle cx={9} cy={7} r={4} /><Path d="M22 21v-2a4 4 0 0 0-3-3.87" /><Path d="M16 3.13a4 4 0 0 1 0 7.75" /></Svg>;
}

const options: { id: TeamChoice; title: string; description: string; Icon: (props: IconProps) => React.JSX.Element }[] = [
  { id: 'create', title: 'Create a team', description: 'Set up your school, sport, and roster.', Icon: CreateIcon },
  { id: 'join', title: 'Join a team', description: 'Connect with an existing team.', Icon: JoinIcon },
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
    <EntryScreen>{(compact) => <>
      <Animated.View entering={fade(0)}>
        <EntryHeader onBack={back} />
      </Animated.View>
      <Animated.View entering={fade(150)} style={styles.illustration}>
        <FieldlineScene small={compact} compact reaction={choice ? 'coach' : null} />
      </Animated.View>
      <Animated.Text entering={rise(300)} accessibilityRole="header" style={[entryStyles.headline, compact && entryStyles.headlineCompact]}>
        {'Get your team\nready.'}
      </Animated.Text>
      <Animated.Text entering={rise(450)} style={entryStyles.description}>Create a new team or connect with one already using HeatSense.</Animated.Text>

      <View accessibilityRole="radiogroup" accessibilityLabel="Team setup" style={styles.options}>
        {options.map((option, index) => (
          <Animated.View key={option.id} entering={rise(600 + index * 120)}>
            <OnboardingSelectionButton
              icon={<option.Icon />}
              title={option.title}
              description={option.description}
              selected={choice === option.id}
              height={84}
              onPress={() => setTeamChoice(option.id)}
            />
          </Animated.View>
        ))}
      </View>

      <Animated.View entering={rise(850)} style={styles.actions}>
        <EntryButton label={choice ? 'Continue' : 'Choose an option to continue'} disabled={choice === null} onPress={next} />
      </Animated.View>
    </>}</EntryScreen>
  );
}

const styles = StyleSheet.create({
  illustration: { flexGrow: 1, justifyContent: 'center', marginVertical: 12 },
  options: { gap: 12, marginTop: 24 },
  actions: { marginTop: 22 },
});
