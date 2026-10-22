import { useRouter } from 'expo-router';

import { JerseyMark } from '@/components/onboarding-art';
import { ChoiceRows, StepScreen } from '@/components/step-kit';
import { setTeamChoice, useTeamChoice, type TeamChoice } from '@/state/onboarding';

// Coach team setup: create a new team or join one that already uses HeatSense.

const OPTIONS = [
  { value: 'create', label: 'Create a team', detail: 'Set up your school, sport and roster' },
  { value: 'join', label: 'Join a team', detail: 'Another coach already set it up' },
] as const satisfies readonly { value: TeamChoice; label: string; detail: string }[];

export default function CoachTeamSetup() {
  const router = useRouter();
  const choice = useTeamChoice();
  return (
    <StepScreen
      icon={<JerseyMark size={96} />}
      next={{ enabled: choice !== null, onPress: () => { if (choice) router.push(`/team/${choice}`); } }}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/role'))}
      progress={0.28}
      title="Set up your team">
      <ChoiceRows label="Team setup" onChange={setTeamChoice} options={OPTIONS} value={choice} />
    </StepScreen>
  );
}
