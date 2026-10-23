import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { AcclimatizationCard } from '@/components/acclimatization-card';
import { SimulatedTag, VitalsDetail } from '@/components/vitals';
import { ListRow, Rows } from '@/components/whoop-ui';
import { Face, MaxContentWidth, Palette } from '@/constants/theme';
import { useAthletes } from '@/state/athletes';
import { useDemoTeam } from '@/state/demo-team';
import { useCoachData, useRoster, useTeamVitals, type SessionRole } from '@/state/team-session';

// One athlete's band vitals, opened from the coach's Team tab or the trainer's Monitor.

export default function AthleteVitalsScreen() {
  const { id, role } = useLocalSearchParams<{ id?: string; role?: SessionRole }>();
  const insets = useSafeAreaInsets();
  const data = useCoachData(role === 'trainer' ? 'trainer' : 'coach');
  const zone = data?.readings.at(-1)?.zone ?? 'yellow';
  const { members } = useDemoTeam(zone);
  const member = members.find((m) => m.athlete.id === id) ?? null;
  // A real athlete: their name from the roster and their latest band sample from this practice.
  const roster = useRoster(data?.teamId ?? null);
  const live = useTeamVitals(data?.session ?? null).find((r) => r.athleteUid === id) ?? null;
  const athlete = useAthletes(role === 'trainer' ? 'trainer' : 'coach').athletes.find((a) => a.id === id) ?? null;
  const name = member ? member.athlete.name : roster?.find((m) => m.userId === id)?.displayName ?? 'Athlete';

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
        <Pressable accessibilityLabel="Back" accessibilityRole="button" hitSlop={10} onPress={() => (router.canGoBack() ? router.back() : router.replace('/dashboard?role=coach&tab=team'))} style={styles.back}>
          <Svg fill="none" height={24} stroke={Palette.ink} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" width={24}><Path d="m15 5-7 7 7 7" /></Svg>
        </Pressable>
        <Text numberOfLines={1} style={styles.barTitle}>{name}</Text>
        <View style={styles.back} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.column}>
          {member ? (
            <>
              <Text style={styles.position}>{member.athlete.position}</Text>
              <View style={styles.accl}><AcclimatizationCard day={member.athlete.acclimatizationDay} /></View>
              <VitalsDetail member={member} />
            </>
          ) : live ? (
            <>
              {athlete ? <View style={styles.accl}><AcclimatizationCard day={athlete.acclimatizationDay} /></View> : null}
              {live.source === 'simulated' ? <SimulatedTag /> : null}
              <View style={styles.liveHero}>
                <Text style={styles.liveHr}>{live.heartRate}</Text>
                <Text style={styles.liveUnit}>bpm · {live.recovery === 'watch' ? 'slow recovery' : 'usual range'}</Text>
                <Text style={styles.liveWhen}>Updated {live.updatedAt ? live.updatedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }) : 'just now'}</Text>
              </View>
              <Rows>
                <ListRow label="Skin temp" value={live.skinTempF ? `${live.skinTempF.toFixed(1)}°F` : '--'} />
                <ListRow label="Sweat (GSR)" value={live.sweat ? `${live.sweat.toFixed(1)} µS` : '--'} />
                <ListRow label="Movement" value={`${Math.round(live.movement)}%`} />
                <ListRow label="Blood oxygen" value={live.spo2 ? `${live.spo2}%` : '--'} />
                <ListRow label="Band" value={live.serial ?? '--'} />
              </Rows>
            </>
          ) : (
            <>
            {athlete ? <View style={styles.accl}><AcclimatizationCard day={athlete.acclimatizationDay} /></View> : null}
            <Text style={styles.empty}>No band data from {name.split(' ')[0]} yet. Vitals appear during practice once their HeatSense Band is paired and their app is open.</Text>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  liveHero: { alignItems: 'flex-start', gap: 4, marginBottom: 20 },
  liveHr: { color: Palette.ink, fontFamily: Face.figure, fontSize: 112, lineHeight: 116 },
  liveUnit: { color: Palette.inkMuted, fontSize: 17, fontWeight: '500' },
  liveWhen: { color: Palette.inkFaint, fontSize: 14 },
  screen: { backgroundColor: '#0A0B0D', flex: 1 },
  bar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12 },
  back: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  barTitle: { color: Palette.ink, flex: 1, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  content: { alignItems: 'center', paddingTop: 8 },
  column: { maxWidth: MaxContentWidth, paddingHorizontal: 16, width: '100%' },
  position: { color: Palette.inkMuted, fontSize: 15, marginBottom: 12, textAlign: 'center' },
  accl: { marginBottom: 20 },
  empty: { color: Palette.inkMuted, fontSize: 16, lineHeight: 22, marginTop: 40, textAlign: 'center' },
});
