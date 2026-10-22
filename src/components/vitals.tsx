import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { LineChart } from '@/components/ui/charts';
import { ListRow, MetricTile, Rows, Tiles } from '@/components/whoop-ui';
import { Palette } from '@/constants/theme';
import { swap } from '@/lib/motion';
import type { DemoMember } from '@/state/demo-team';
import { DEMO_SPEED } from '@/state/demo-team';

// Band vitals, shown the same way everywhere: the coach's team list, the trainer's monitor, an
// athlete's detail screen and an athlete's own Band tab. All of it is simulated until the band
// firmware exists, and every view says so.

export function SimulatedTag() {
  return (
    <View accessibilityLabel="Simulated band data" accessible style={styles.tag}>
      <View style={styles.tagDot} />
      <Text style={styles.tagText}>SIMULATED BAND DATA · {DEMO_SPEED}× SPEED</Text>
    </View>
  );
}

const statusTone = (member: DemoMember) => (member.status === 'watch' ? Palette.warning : Palette.safe);
const statusLabel = (member: DemoMember) => (member.status === 'watch' ? 'Slow recovery' : 'Usual range');

/** One row per athlete: name, live heart rate, and whether recovery looks usual. */
export function TeamVitalsRows({ members, role = 'coach' }: { members: DemoMember[]; role?: 'coach' | 'trainer' }) {
  return (
    <Rows>
      {members.map((m) => (
        <ListRow
          detail={`${m.athlete.position} · ${m.vitals.phase === 'work' ? 'Working' : 'On break'} · ${statusLabel(m)}`}
          key={m.athlete.id}
          label={m.athlete.name}
          onPress={() => router.push({ pathname: '/athlete-vitals', params: { id: m.athlete.id, role } })}
          value={`${m.vitals.heartRate} bpm`}
          valueTone={statusTone(m)}
        />
      ))}
    </Rows>
  );
}

/** The full picture for one athlete: live heart rate, its last six minutes, and the other signals. */
export function VitalsDetail({ member }: { member: DemoMember }) {
  const reduced = useReducedMotion();
  const { vitals } = member;
  return (
    <>
      <SimulatedTag />
      <View style={styles.hero}>
        <Animated.Text entering={swap(reduced)} key={vitals.heartRate} style={styles.hr}>{vitals.heartRate}</Animated.Text>
        <Text style={styles.hrUnit}>BPM · {vitals.phase === 'work' ? 'WORKING' : 'ON BREAK'}</Text>
        <View style={[styles.pill, { borderColor: statusTone(member) }]}>
          <Text style={[styles.pillText, { color: statusTone(member) }]}>{statusLabel(member)}</Text>
        </View>
      </View>
      <LineChart
        labels={['6 min ago', 'Now']}
        max={190}
        min={60}
        summary={`Heart rate over the last six minutes, now ${vitals.heartRate} beats per minute`}
        tone={member.status === 'watch' ? Palette.warning : Palette.coral}
        values={member.history}
      />
      {member.status === 'watch' ? (
        <View style={styles.note}>
          <Text style={styles.noteTitle}>Heart rate is staying high through this break</Text>
          <Text style={styles.noteBody}>Check in with {member.athlete.name.split(' ')[0]}: shade, water, and how they feel. A trend to look at, not a diagnosis.</Text>
        </View>
      ) : null}
      <View style={styles.tiles}>
        <Tiles>
          <MetricTile label="Skin temp" unit="°F" value={vitals.skinTempF.toFixed(1)} />
          <MetricTile label="Sweat (GSR)" unit="µS" value={vitals.sweat.toFixed(1)} />
          <MetricTile label="Movement" unit="%" value={String(vitals.movement)} />
          <MetricTile label="Resting HR" unit="bpm" value={String(member.athlete.restingHr)} />
        </Tiles>
      </View>
      <Rows>
        <ListRow detail="MAX30102 optical sensor on the band" label="Heart rate source" />
        <ListRow detail="Simulated stream. Real readings arrive with the band firmware." label="Data" />
      </Rows>
    </>
  );
}

const styles = StyleSheet.create({
  tag: { alignItems: 'center', alignSelf: 'center', borderColor: Palette.info, borderRadius: 999, borderWidth: 1, flexDirection: 'row', gap: 6, marginBottom: 12, paddingHorizontal: 10, paddingVertical: 4 },
  tagDot: { backgroundColor: Palette.info, borderRadius: 3, height: 6, width: 6 },
  tagText: { color: Palette.info, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  hero: { alignItems: 'center', gap: 4, marginBottom: 12, marginTop: 4 },
  hr: { color: Palette.ink, fontSize: 72, fontVariant: ['tabular-nums'], fontWeight: '700', letterSpacing: -2 },
  hrUnit: { color: Palette.inkMuted, fontSize: 13, fontWeight: '700', letterSpacing: 1.4 },
  pill: { borderRadius: 999, borderWidth: 1, marginTop: 8, paddingHorizontal: 12, paddingVertical: 4 },
  pillText: { fontSize: 13, fontWeight: '700' },
  note: { backgroundColor: Palette.card, borderColor: Palette.warning, borderRadius: 16, borderWidth: 1, gap: 4, marginTop: 16, padding: 16 },
  noteTitle: { color: Palette.ink, fontSize: 16, fontWeight: '700' },
  noteBody: { color: Palette.inkMuted, fontSize: 15, lineHeight: 21 },
  tiles: { marginBottom: 20, marginTop: 20 },
});
