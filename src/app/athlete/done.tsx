import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AthleteHeader,
  AthletePillButton,
  AthleteTextLink,
  ATHLETE_MUTED,
  ATHLETE_SCREEN,
  athleteFont as fontFamily,
  useAthleteEntrance,
} from '@/components/athlete-onboarding';
import { MobileViewport } from '@/components/mobile-viewport';
import { watchMyMembership, type Membership } from '@/services/team-invites';
import { getCurrentUserId, setAthleteTeam } from '@/state/onboarding';

// End of athlete onboarding. Shows the athlete's real team status, live: approved,
// still waiting on the coach, or no team yet. A pending request never counts as
// team access. The dashboard it leads to is where the athlete flow lands today.
const DASHBOARD = '/dashboard?role=athlete';

type State = { kind: 'loading' } | { kind: 'member'; teamName: string | null } | { kind: 'pending'; teamName: string | null } | { kind: 'none' };

const COPY = {
  member: (team: string | null) => ({ title: 'You’re all set.', body: team ? `You’re on ${team}. Your profile is ready.` : 'You’re on your team. Your profile is ready.' }),
  pending: () => ({ title: 'Request sent.', body: 'Your coach will need to approve your request before you can access your team.' }),
  none: () => ({ title: 'You’re all set.', body: 'Your profile is ready. You can join a team anytime with a code from your coach.' }),
};

export default function AthleteDoneScreen() {
  return <MobileViewport><View style={[styles.fill, { backgroundColor: ATHLETE_SCREEN }]}><Content /></View></MobileViewport>;
}

function Content() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { rise, fade } = useAthleteEntrance();
  const uid = getCurrentUserId();
  const [state, setState] = useState<State>(uid ? { kind: 'loading' } : { kind: 'none' });
  const [height, setHeight] = useState(0);
  const compact = height > 0 && height < 760;

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

  const copy = state.kind === 'member' ? COPY.member(state.teamName) : state.kind === 'pending' ? COPY.pending() : state.kind === 'none' ? COPY.none() : null;

  return (
    <View style={[styles.content, { paddingTop: Math.max(insets.top + 8, compact ? 36 : 56), paddingBottom: Math.max(insets.bottom, 16) + 16 }]} onLayout={(event: LayoutChangeEvent) => setHeight(event.nativeEvent.layout.height)}>
      <StatusBar style="light" />
      <Animated.View entering={fade(200)}>
        <AthleteHeader />
      </Animated.View>

      {copy ? (
        <View key={state.kind} accessibilityLiveRegion="polite">
          <Animated.Text entering={rise(350)} accessibilityRole="header" style={[styles.headline, { fontFamily, marginTop: compact ? 26 : 32 }]}>{copy.title}</Animated.Text>
          <Animated.Text entering={fade(550)} style={[styles.description, { fontFamily }]}>{copy.body}</Animated.Text>
          {state.kind === 'pending' && (
            <Animated.Text entering={fade(650)} style={[styles.note, { fontFamily }]}>Your profile is complete. This screen updates as soon as your coach responds.</Animated.Text>
          )}
        </View>
      ) : (
        <ActivityIndicator style={styles.loading} color={ATHLETE_MUTED} accessibilityLabel="Checking your team status" />
      )}

      <View style={styles.spacer} />

      {copy && (
        <Animated.View entering={rise(800)} style={styles.actions}>
          <AthletePillButton label={state.kind === 'member' ? 'Go to dashboard →' : 'Continue →'} enabled onPress={() => router.replace(DASHBOARD as never)} />
          {state.kind === 'none' && <AthleteTextLink label="Join a team" onPress={() => router.push('/setup/athlete')} />}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 22 },
  headline: { color: '#FFFFFF', fontWeight: '400', letterSpacing: -0.6, fontSize: 46, lineHeight: 50 },
  description: { color: ATHLETE_MUTED, fontSize: 16, lineHeight: 23, fontWeight: '400', marginTop: 12, maxWidth: 340 },
  note: { color: '#8E8E8E', fontSize: 12.5, lineHeight: 18, marginTop: 14, maxWidth: 320 },
  loading: { marginTop: 48 },
  spacer: { flexGrow: 1, minHeight: 32 },
  actions: { gap: 14 },
});
