import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, useReducedMotion } from 'react-native-reanimated';

import { EntryButton, EntryHeader, EntryScreen, entryStyles } from '@/components/entry-ui';
import { FieldlineScene } from '@/components/fieldline-character';
import { OnboardingSelectionSurface } from '@/components/onboarding-controls';
import { setOnboardingRole, useOnboardingRole } from '@/state/onboarding';

const roles = [
  { id: 'coach', title: 'Coach', description: 'Plan practices. Manage your team.' },
  { id: 'athlete', title: 'Athlete', description: 'Join your team. Stay prepared.' },
  { id: 'trainer', title: 'Athletic trainer', description: 'Follow readings. Look after athletes.' },
] as const;

export default function RoleScreen() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const selected = useOnboardingRole();
  const rise = (delay: number) => (reducedMotion ? undefined : FadeInUp.delay(delay).duration(480));
  const fade = (delay: number) => (reducedMotion ? undefined : FadeIn.delay(delay).duration(420));
  return (
    <EntryScreen background="role">{(compact) => <>
      <EntryHeader onBack={() => router.canGoBack() ? router.back() : router.replace('/sign-in')} />
      <Animated.View entering={fade(100)} style={styles.illustration}><FieldlineScene compact small={compact} reaction={selected === 'trainer' ? null : selected} /></Animated.View>
      <Animated.Text entering={rise(200)} accessibilityRole="header" style={[entryStyles.headline, compact && entryStyles.headlineCompact]}>Made for you.</Animated.Text>
      <Animated.Text entering={rise(300)} style={entryStyles.description}>Choose how you’ll use HeatSense.</Animated.Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="Your role" style={styles.roles}>
        {roles.map((role, index) => (
          <Animated.View key={role.id} entering={rise(420 + index * 100)}>
            <OnboardingSelectionSurface title={role.title} description={role.description} selected={selected === role.id} onPress={() => setOnboardingRole(role.id)} />
          </Animated.View>
        ))}
      </View>
      <Animated.View entering={rise(640)} style={styles.actions}>
        <EntryButton label={selected ? `Continue as ${selected}` : 'Choose a role to continue'} disabled={!selected} onPress={() => { if (selected) router.push(`/setup/${selected}`); }} />
      </Animated.View>
    </>}</EntryScreen>
  );
}

const styles = StyleSheet.create({
  illustration: { flexGrow: 1, justifyContent: 'center', marginVertical: 14 },
  roles: { gap: 12, marginTop: 26 },
  actions: { marginTop: 28 },
});
