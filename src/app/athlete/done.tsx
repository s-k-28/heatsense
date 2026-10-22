import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { CapsButton, StepScreen } from '@/components/step-kit';
import { WelcomeWristband } from '@/components/welcome-wristband';
import { Entry } from '@/constants/entry-theme';
import { watchMyMembership, type Membership } from '@/services/team-invites';
import { getCurrentUserId, setAthleteTeam } from '@/state/onboarding';

// End of athlete onboarding: the payoff screen. It shows the athlete's real team
// status, live: approved, still waiting on the coach, or no team yet. A pending
// request never counts as team access. The dashboard it leads to is where the
// athlete flow lands today.
const DASHBOARD = '/dashboard?role=athlete';

type State = { kind: 'loading' } | { kind: 'member'; teamName: string | null } | { kind: 'pending'; teamName: string | null } | { kind: 'none' };

const COPY = {
  member: (team: string | null) => ({ title: 'You’re all set.' }),
  pending: (team: string | null) => ({ title: 'Request sent.' }),
  none: () => ({ title: 'You’re all set.' }),
};

export default function AthleteDoneScreen() {
  const router = useRouter();
  const uid = getCurrentUserId();
  const [state, setState] = useState<State>(uid ? { kind: 'loading' } : { kind: 'none' });

  useEffect(() => {
    if (!uid) return;
    const apply = (membership: Membership | null) => {
      const teamName = membership?.team?.teamName ?? null;
      if (membership?.status === 'active') {
        setState({ kind: 'member', teamName });
        setAthleteTeam({ status: 'member', teamId: membership.teamId });
      } else if (membership?.status === 'pending') {
        setState({ kind: 'pending', teamName });
        setAthleteTeam({ status: 'pending', teamId: membership.teamId });
      } else {
        setState({ kind: 'none' });
        setAthleteTeam({ status: 'unassigned', teamId: null });
      }
    };
    // If the status can't be read, don't guess at team access: show the no-team state.
    return watchMyMembership(uid, apply, () => setState({ kind: 'none' }));
  }, [uid]);

  // A listener that never answers (offline, or no account in this build) must not spin forever.
  useEffect(() => {
    if (state.kind !== 'loading') return;
    const timer = setTimeout(() => setState((current) => (current.kind === 'loading' ? { kind: 'none' } : current)), 6000);
    return () => clearTimeout(timer);
  }, [state.kind]);

  const copy = state.kind === 'member' ? COPY.member(state.teamName) : state.kind === 'pending' ? COPY.pending(state.teamName) : state.kind === 'none' ? COPY.none() : null;

  if (!copy) {
    return (
      <StepScreen title="Setting up your account…">
        <ActivityIndicator accessibilityLabel="Checking your team status" color={Entry.muted} style={styles.loading} />
      </StepScreen>
    );
  }

  return (
    <StepScreen
      footer={
        <View style={styles.actions}>
          <CapsButton label={state.kind === 'member' ? 'Go to dashboard' : 'Continue'} onPress={() => router.replace(DASHBOARD as never)} />
          {state.kind === 'none' ? <CapsButton label="Join a team" onPress={() => router.push('/setup/athlete')} outline /> : null}
        </View>
      }
      icon={<View style={styles.band}><WelcomeWristband width={210} /></View>}
      title={copy.title}
    />
  );
}

const styles = StyleSheet.create({
  band: { alignSelf: 'center' },
  loading: { marginTop: 32 },
  actions: { gap: 12 },
});
