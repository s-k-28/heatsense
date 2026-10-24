import { AnimatedText } from '@/components/ui/text';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import Animated, { FadeIn, FadeInUp, useReducedMotion } from 'react-native-reanimated';

import { BandSpot } from '@/components/band-journey';
import { BrandAssemble } from '@/components/brand-assemble';
import { EntryButton, EntryHeading, EntryScreen, entryStyles } from '@/components/entry-ui';
import { watchMyMembership, type Membership } from '@/services/team-invites';
import { getCurrentUserId, setAthleteTeam } from '@/state/onboarding';

// End of athlete onboarding: the payoff screen. It shows the athlete's real team
// status, live: approved, still waiting on the coach, or no team yet. A pending
// request never counts as team access. The dashboard it leads to is where the
// athlete flow lands today.
const DASHBOARD = '/dashboard?role=athlete';

type State = { kind: 'loading' } | { kind: 'member'; teamName: string | null } | { kind: 'pending'; teamName: string | null } | { kind: 'none' } | { kind: 'error' };

const COPY = {
  loading: { lead: 'One', accent: 'moment.', detail: () => 'Checking your team status…' },
  member: { lead: 'You’re on', accent: 'the team.', detail: (team: string | null) => (team ? `Welcome to ${team}.` : 'Your coach approved your request.') },
  pending: { lead: 'Request', accent: 'sent.', detail: (team: string | null) => (team ? `Waiting for approval from ${team}.` : 'Waiting for your coach to review your request.') },
  error: { lead: 'Team status', accent: 'unavailable.', detail: () => 'Couldn’t check your team. Try again, or continue to the dashboard.' },
  none: { lead: 'You’re', accent: 'all set.', detail: () => 'Join a team anytime with a code from your coach.' },
};

export default function AthleteDoneScreen() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const rise = (delay: number) => (reducedMotion ? undefined : FadeInUp.delay(Math.min(delay, 60)).duration(240));
  const fade = (delay: number) => (reducedMotion ? undefined : FadeIn.delay(Math.min(delay, 60)).duration(240));
  const uid = getCurrentUserId();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>(uid ? { kind: 'loading' } : { kind: 'none' });

  useEffect(() => {
    if (!uid) return;
    let active = true;
    const apply = (membership: Membership | null) => {
      if (!active) return;
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
    // A failed lookup is not evidence that there is no membership.
    const stop = watchMyMembership(uid, apply, () => { if (active) setState({ kind: 'error' }); });
    return () => { active = false; stop(); };
  }, [attempt, uid]);

  // A listener that never answers (offline, or no account in this build) must not spin forever.
  useEffect(() => {
    if (state.kind !== 'loading') return;
    const timer = setTimeout(() => setState((current) => (current.kind === 'loading' ? { kind: 'error' } : current)), 6000);
    return () => clearTimeout(timer);
  }, [state.kind]);

  const copy = COPY[state.kind];
  const teamName = state.kind === 'member' || state.kind === 'pending' ? state.teamName : null;
  return (
    <EntryScreen background="complete" backgroundDrawIn={500}>{(compact) => <>
      <View style={[styles.open, styles.bandRoom]}><BandSpot height={compact ? 120 : 170} id="athlete-done" /></View>
      {/* The branded finish: the H assembles, then the headline rises beneath it. */}
      <BrandAssemble delay={150} size={compact ? 64 : 80} style={styles.mark} />
      <EntryHeading accent={copy.accent} align="center" key={state.kind} compact={compact} delay={700} lead={copy.lead} size="hero" />
      <AnimatedText accessibilityLiveRegion="polite" entering={fade(1100)} style={[entryStyles.description, styles.centered]}>{copy.detail(teamName)}</AnimatedText>
      <View style={styles.open} />
      <Animated.View entering={rise(1250)} style={styles.actions}>
        {state.kind === 'loading' ? <EntryButton disabled label="Checking…" onPress={() => {}} /> : state.kind === 'error' ? <>
          <EntryButton label="Try again" onPress={() => { setState({ kind: 'loading' }); setAttempt((value) => value + 1); }} />
          <EntryButton label="Go to dashboard" onPress={() => router.replace(DASHBOARD as never)} secondary />
        </> : <EntryButton label="Go to dashboard" onPress={() => router.replace(DASHBOARD as never)} />}
        {state.kind === 'none' ? <EntryButton label="Join a team" onPress={() => router.push('/setup/athlete')} secondary /> : null}
      </Animated.View>
    </>}</EntryScreen>
  );
}

const styles = StyleSheet.create({
  open: { flexGrow: 1, minHeight: 24 },
  bandRoom: { alignItems: 'center', justifyContent: 'center' },
  mark: { alignSelf: 'center', marginBottom: 28 },
  centered: { alignSelf: 'center', textAlign: 'center' },
  actions: { gap: 12 },
});
