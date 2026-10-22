import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

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
  member: (team: string | null) => ({ title: 'You’re all set.', body: 'Your profile is ready. Your coach can see you on the roster.', status: team ? `${team} · You’re on the team` : 'You’re on the team' }),
  pending: (team: string | null) => ({ title: 'Request sent.', body: 'Your coach will need to approve your request before you can access your team.', status: team ? `${team} · Waiting for your coach` : 'Waiting for your coach' }),
  none: () => ({ title: 'You’re all set.', body: 'Your profile is ready. You can join a team anytime with a code from your coach.', status: 'No team yet' }),
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
      title={copy.title}>
      <View accessibilityLiveRegion="polite" style={styles.statusLine}>
        <View style={[styles.signal, state.kind === 'pending' && styles.signalPending, state.kind === 'none' && styles.signalNone]} />
        <View style={styles.statusCopy}>
          <Text style={styles.statusText}>{copy.status}</Text>
          {state.kind === 'pending' && <Text style={styles.statusNote}>This screen updates as soon as your coach responds.</Text>}
        </View>
      </View>
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  band: { alignSelf: 'center' },
  // The welcome screen's product line, reused for the real team status.
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopColor: Entry.line, borderTopWidth: 1, marginTop: 24, paddingTop: 18 },
  signal: { width: 4, alignSelf: 'stretch', minHeight: 24, borderRadius: 2, backgroundColor: Entry.blue },
  signalPending: { backgroundColor: Entry.peach },
  signalNone: { backgroundColor: Entry.line },
  statusCopy: { flex: 1, gap: 3 },
  statusText: { color: Entry.ink, fontFamily: Entry.medium, fontSize: 16, lineHeight: 22 },
  statusNote: { color: Entry.muted, fontFamily: Entry.body, fontSize: 14, lineHeight: 20 },
  loading: { marginTop: 32 },
  actions: { gap: 12 },
});
