import { AnimatedText } from '@/components/ui/text';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, useReducedMotion } from 'react-native-reanimated';

import { BandSpot } from '@/components/band-journey';
import { EntryButton, EntryHeader, EntryHeading, EntryScreen, entryStyles } from '@/components/entry-ui';
import { OnboardingSelectionSurface } from '@/components/onboarding-controls';
import { setOnboardingRole, useOnboardingRole, type OnboardingRole } from '@/state/onboarding';

// Role selection, as an editorial page: the headline up top, open space where the curves
// sweep through, then the three roles as large word-only panels and the peach pill.
const roles = [
  { id: 'coach', title: 'Coach', description: 'Plan practices. Manage your team.' },
  { id: 'athlete', title: 'Athlete', description: 'Join your team. Stay prepared.' },
  { id: 'trainer', title: 'Athletic trainer', description: 'Follow readings. Look after athletes.' },
] as const satisfies readonly { id: OnboardingRole; title: string; description: string }[];

const CONTINUE: Record<OnboardingRole, string> = { coach: 'Continue as coach', athlete: 'Continue as athlete', trainer: 'Continue as trainer' };

export default function RoleScreen() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const selected = useOnboardingRole();
  const rise = (delay: number) => (reducedMotion ? undefined : FadeInUp.delay(delay).duration(520));
  const fade = (delay: number) => (reducedMotion ? undefined : FadeIn.delay(delay).duration(420));
  return (
    <EntryScreen background="role" backgroundDrawIn={250}>{(compact) => <>
      <Animated.View entering={fade(0)}>
        <EntryHeader bandDock={false} onBack={() => router.canGoBack() ? router.back() : router.replace('/sign-in')} />
      </Animated.View>
      <EntryHeading accent="you." compact={compact} delay={150} lead="Made for" size="hero" style={{ marginTop: compact ? 28 : 44 }} />
      <AnimatedText entering={fade(500)} style={entryStyles.description}>Choose how you’ll use HeatSense.</AnimatedText>
      <View style={[styles.open, styles.bandRoom]}><BandSpot height={compact ? 120 : 160} id="role" /></View>
      <View accessibilityRole="radiogroup" accessibilityLabel="Your role" style={[styles.roles, compact && styles.rolesCompact]}>
        {roles.map((role, index) => (
          <Animated.View key={role.id} entering={rise(560 + index * 90)}>
            <OnboardingSelectionSurface large minHeight={compact ? 80 : 92} title={role.title} description={role.description} selected={selected === role.id} onPress={() => setOnboardingRole(role.id)} />
          </Animated.View>
        ))}
      </View>
      <Animated.View entering={rise(860)} style={[styles.actions, compact && styles.actionsCompact]}>
        <EntryButton label={selected ? CONTINUE[selected] : 'Choose a role to continue'} disabled={!selected} onPress={() => { if (selected) router.push(`/setup/${selected}`); }} />
      </Animated.View>
    </>}</EntryScreen>
  );
}

const styles = StyleSheet.create({
  // The open band between the headline and the choices, where the curves run.
  open: { flexGrow: 1, minHeight: 28 },
  bandRoom: { alignItems: 'center', justifyContent: 'center' },
  roles: { gap: 12 },
  rolesCompact: { gap: 10 },
  actions: { marginTop: 26 },
  actionsCompact: { marginTop: 20 },
});
