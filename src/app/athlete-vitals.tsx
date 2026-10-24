import { Text } from '@/components/ui/text';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { AcclimatizationCard } from '@/components/acclimatization-card';
import { ActionButton } from '@/components/ui/action-button';
import { VitalCards } from '@/components/vital-cards';
import { SimulatedTag, VitalsDetail } from '@/components/vitals';
import { ListRow, Rows } from '@/components/whoop-ui';
import { MaxContentWidth, Palette } from '@/constants/theme';
import { useAthletes } from '@/state/athletes';
import { useDemoTeam } from '@/state/demo-team';
import { useTemperature } from '@/state/preferences';
import { useCoachDataState, useNow, useRosterState, useTeamVitalsState, vitalsHistory, type SessionRole } from '@/state/team-session';

// One athlete's band vitals, opened from the coach's Team tab or the trainer's Monitor.

export default function AthleteVitalsScreen() {
  const { id, role } = useLocalSearchParams<{ id?: string; role?: SessionRole }>();
  const insets = useSafeAreaInsets();
  const temp = useTemperature();
  const staffRole = role === 'trainer' ? 'trainer' : 'coach';
  const team = useCoachDataState(staffRole);
  const data = team.data;
  const now = useNow();
  const [showSamplePlan, setShowSamplePlan] = useState(false);
  const zone = data?.readings.at(-1)?.zone ?? 'yellow';
  const { members } = useDemoTeam(zone);
  const member = members.find((m) => m.athlete.id === id) ?? null;
  // A real athlete: their name from the roster and their latest band sample from this practice.
  const rosterState = useRosterState(data?.teamId ?? null);
  const roster = rosterState.data;
  const signal = useTeamVitalsState(data?.session ?? null);
  const live = signal.data?.find((r) => r.athleteUid === id) ?? null;
  // Every sample this phone has seen for them this practice, for the trend cards.
  const trend = data?.session && id ? vitalsHistory(data.session.id, id, data.session.teamId).map((r) => ({ ...r, spo2: r.spo2 ?? null })) : [];
  const { athletes, loading, status, historyStatus, retry } = useAthletes(staffRole);
  const failed = team.status === 'error' || rosterState.status === 'error' || signal.status === 'error' || status === 'error';
  const reload = () => { team.retry(); rosterState.retry(); signal.retry(); retry(); };
  const athlete = athletes.find((a) => a.id === id) ?? null;
  // Use this very sample's timestamp: the roster subscription can arrive later.
  const stale = Boolean(live && (!live.updatedAt || now - live.updatedAt.getTime() > 2 * 60_000));
  const name = member ? member.athlete.name : roster?.find((m) => m.userId === id)?.displayName ?? 'Athlete';

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
        <Pressable accessibilityLabel="Back" accessibilityRole="button" hitSlop={10} onPress={() => (router.canGoBack() ? router.back() : router.replace(staffRole === 'trainer' ? '/dashboard?role=trainer&tab=monitor' : '/dashboard?role=coach&tab=team'))} style={styles.back}>
          <Svg fill="none" height={24} stroke={Palette.ink} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" width={24}><Path d="m15 5-7 7 7 7" /></Svg>
        </Pressable>
        <Text accessibilityRole="header" style={styles.barTitle}>{name}</Text>
        <View style={styles.back} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.column}>
          {member ? (
            <>
              <Text style={styles.position}>{member.athlete.position}</Text>
              <VitalsDetail member={member} />
              <ActionButton label={showSamplePlan ? 'Hide sample practice plan' : 'View sample practice plan'} onPress={() => setShowSamplePlan(!showSamplePlan)} variant="text" />
              {showSamplePlan ? <View style={styles.accl}><AcclimatizationCard day={member.athlete.acclimatizationDay} /></View> : null}
            </>
          ) : live ? (
            <>
              {live.source === 'simulated' ? <SimulatedTag /> : null}
              <View style={styles.liveHero}>
                <Text accessibilityLiveRegion="polite" style={styles.liveUnit}>{stale ? 'Signal stale · waiting for a fresh sample' : live.recovery === 'watch' ? 'Slow recovery' : live.recovery !== 'usual' ? 'Recovery status unavailable' : 'No recovery flag'}</Text>
                <Text style={styles.liveWhen}>{live.updatedAt ? `Last received ${live.updatedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}` : 'Last received time unavailable'}</Text>
              </View>
              {!stale && trend.length > 1 ? <View style={styles.accl}><VitalCards history={trend} simulated={live.source === 'simulated'} /></View> : null}
              {stale || trend.length <= 1 ? <Rows>
                <ListRow label="Heart rate" value={stale ? '—' : `${live.heartRate} bpm`} />
                <ListRow label="Skin temp" value={!stale && live.skinTempF !== null ? `${temp.precise(live.skinTempF).toFixed(1)}${temp.unit}` : '—'} />
                <ListRow label="Sweat (GSR)" value={!stale && live.sweat !== null ? `${live.sweat.toFixed(1)} µS` : '—'} />
                <ListRow label="Movement" value={stale ? '—' : `${Math.round(live.movement)}%`} />
                <ListRow label="Blood oxygen" value={!stale && live.spo2 != null ? `${live.spo2}%` : '—'} />
              </Rows> : null}
              <View style={styles.context}><Rows><ListRow label="Band" value={live.serial ?? 'Not provided'} /></Rows></View>
            </>
          ) : (
            <>
            <Text accessibilityLiveRegion="polite" style={styles.empty}>{!id ? 'No athlete selected. Return to the roster to choose an athlete.' : failed ? 'Couldn’t load athlete details. Try connecting again.' : loading || team.status === 'loading' || rosterState.status === 'loading' || signal.status === 'loading' ? 'Loading athlete details…' : team.status === 'no-team' ? 'No team connected. Return to your dashboard to connect your team.' : !athlete ? 'This athlete is not in the current roster.' : !data?.session ? 'No practice in progress. Band signals appear during practice.' : `No band data from ${name.split(' ')[0]} yet. Their band must be paired and their app open during practice.`}</Text>
            {failed && id ? <ActionButton label="Try again" onPress={reload} variant="secondary" /> : null}
            </>
          )}
          {!member && athlete ? <View style={styles.context}>
            <Rows><ListRow label="Recorded practice days" value={athlete.practiceDaysKnown ? `${athlete.acclimatizationDay}${athlete.acclimatizationDay >= 14 ? '+' : ''}` : '—'} /></Rows>
            <Text style={styles.contextNote}>{historyStatus === 'error' ? 'Practice-day history couldn’t load.' : historyStatus === 'loading' ? 'Loading practice-day history…' : !athlete.joinedAt ? 'Join date unavailable; practice days can’t be counted.' : 'Team practice dates since joining. Attendance and acclimatization completion aren’t verified.'}</Text>
            {historyStatus === 'error' ? <ActionButton label="Retry practice history" onPress={retry} variant="text" /> : null}
          </View> : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  liveHero: { alignItems: 'flex-start', gap: 4, marginBottom: 20 },
  liveUnit: { color: Palette.inkMuted, fontSize: 17, fontWeight: '500' },
  liveWhen: { color: Palette.inkFaint, fontSize: 14 },
  screen: { backgroundColor: Palette.canvas, flex: 1 },
  bar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12 },
  back: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  barTitle: { color: Palette.ink, flex: 1, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  content: { alignItems: 'center', paddingTop: 8 },
  column: { maxWidth: MaxContentWidth, paddingHorizontal: 16, width: '100%' },
  position: { color: Palette.inkMuted, fontSize: 15, marginBottom: 12, textAlign: 'center' },
  accl: { marginBottom: 20 },
  context: { marginTop: 20 },
  contextNote: { color: Palette.inkMuted, fontSize: 14, lineHeight: 20, marginTop: 10 },
  empty: { color: Palette.inkMuted, fontSize: 16, lineHeight: 22, marginTop: 40, textAlign: 'center' },
});
