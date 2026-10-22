import { useRouter } from 'expo-router';

import { RosterMark } from '@/components/onboarding-art';
import { ChoiceRows, StepScreen } from '@/components/step-kit';
import { setOnboardingRole, useOnboardingRole, type OnboardingRole } from '@/state/onboarding';

const ROLES = [
  { value: 'coach', label: 'Coach', detail: 'Run practices and look after the team' },
  { value: 'athlete', label: 'Athlete', detail: 'Join your team and wear the band' },
] as const satisfies readonly { value: OnboardingRole; label: string; detail: string }[];

export default function RoleScreen() {
  const router = useRouter();
  const selected = useOnboardingRole();
  return (
    <StepScreen
      icon={<RosterMark size={96} />}
      next={{ enabled: Boolean(selected), onPress: () => { if (selected) router.push(`/setup/${selected}`); } }}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/sign-in'))}
      progress={0.2}
      title="How will you use HeatSense?">
      <ChoiceRows label="Your role" onChange={setOnboardingRole} options={ROLES} value={selected} />
    </StepScreen>
  );
}
