import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { LineChart } from '@/components/ui/charts';
import { ListRow, MetricTile, Rows, Tiles } from '@/components/whoop-ui';
import { Face, Palette } from '@/constants/theme';
import { swap } from '@/lib/motion';
import type { VitalsRecord } from '@/services/band-vitals';
import type { RosterMember } from '@/services/team-roster';
import type { DemoMember } from '@/state/demo-team';
import { DEMO_SPEED } from '@/state/demo-team';

// Band vitals, shown the same way everywhere: the coach's team list, the trainer's monitor, an
// athlete's detail screen and an athlete's own Band tab. All of it is simulated until the band
// firmware exists, and every view says so.

export function SimulatedTag() {
  return (
    <View accessibilityLabel="Simulated band data" accessible style={styles.tag}>
      <View style={styles.tagDot} />
      <Text style={styles.tagText}>Simulated band data · {DEMO_SPEED}× speed</Text>
    </View>
  );
}

const statusTone = (member: DemoMember) => (member.status === 'watch' ? Palette.warning : Palette.safe);
const statusLabel = (member: DemoMember) => (member.status === 'watch' ? 'Slow recovery' : 'Usual range');

/** One row per athlete: name, live heart rate, and whether recovery looks usual. */
export function TeamVitalsRows({ members, role = 'coach' }: { members: DemoMember[]; role?: 'coach' | 'trainer' }) {
  return (
    <>
    <StatusKey simulated />
    <Rows>
      {members.map((m) => (
        <ListRow
          key={m.athlete.id}
          label={m.athlete.name}
          onPress={() => router.push({ pathname: '/athlete-vitals', params: { id: m.athlete.id, role } })}
          trailing={<View accessibilityLabel={statusLabel(m)} accessible style={styles.statusRow}><Text style={styles.bpm}>{m.vitals.heartRate}<Text style={styles.bpmUnit}> bpm</Text></Text><View style={[styles.statusDot, { backgroundColor: statusTone(m) }]} /></View>}
        />
      ))}
    </Rows>
    </>
  );
}

/** One line above the list: what the dots mean, and whether the numbers are simulated. */
function StatusKey({ simulated = false }: { simulated?: boolean }) {
  return (
    <View style={styles.key}>
      <View style={styles.keyItem}><View style={[styles.statusDot, { backgroundColor: Palette.safe }]} /><Text style={styles.keyText}>Usual</Text></View>
      <View style={styles.keyItem}><View style={[styles.statusDot, { backgroundColor: Palette.warning }]} /><Text style={styles.keyText}>Slow recovery</Text></View>
      {simulated ? <Text accessibilityLabel={`Simulated band data, ${DEMO_SPEED} times speed`} style={[styles.keyText, styles.keyEnd]}>Simulated · {DEMO_SPEED}×</Text> : null}
    </View>
  );
}

const STALE_MS = 2 * 60_000;

/** Real athletes' latest band samples during practice. A sample older than two minutes reads as no signal. */
export function LiveVitalsRows({ records, roster, now }: { records: VitalsRecord[]; roster: RosterMember[] | null; now: number }) {
  const name = (uid: string) => roster?.find((m) => m.userId === uid)?.displayName ?? 'Athlete';
  return (
    <>
    <StatusKey simulated={records.some((r) => r.source === 'simulated')} />
    <Rows>
      {records.map((r) => {
        const stale = !r.updatedAt || now - r.updatedAt.getTime() > STALE_MS;
        const tone = stale ? Palette.inkFaint : r.recovery === 'watch' ? Palette.warning : Palette.safe;
        const state = stale ? 'No recent signal' : r.recovery === 'watch' ? 'Slow recovery' : 'Usual range';
        return (
          <ListRow
            key={r.athleteUid}
            label={name(r.athleteUid)}
            trailing={<View accessibilityLabel={state} accessible style={styles.statusRow}><Text style={[styles.bpm, stale && { color: Palette.inkMuted }]}>{stale ? '--' : r.heartRate}<Text style={styles.bpmUnit}> bpm</Text></Text><View style={[styles.statusDot, { backgroundColor: tone }]} /></View>}
          />
        );
      })}
    </Rows>
    </>
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
        <Text style={styles.hrUnit}>bpm · {vitals.phase === 'work' ? 'working' : 'on break'}</Text>
        <View style={styles.pill}>
          <View style={[styles.statusDot, { backgroundColor: statusTone(member) }]} />
          <Text style={styles.pillText}>{statusLabel(member)}</Text>
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
    </>
  );
}

const styles = StyleSheet.create({
  tag: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 6, marginBottom: 12 },
  tagDot: { backgroundColor: Palette.info, borderRadius: 3, height: 6, width: 6 },
  tagText: { color: Palette.inkMuted, fontSize: 14, fontWeight: '500' },
  statusRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  bpm: { color: Palette.ink, fontFamily: Face.figure, fontSize: 28, lineHeight: 32 },
  bpmUnit: { color: Palette.inkMuted, fontFamily: Face.label, fontSize: 18 },
  statusDot: { borderRadius: 5, height: 10, width: 10 },
  key: { flexDirection: 'row', gap: 18, marginBottom: 12 },
  keyItem: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  keyText: { color: Palette.inkMuted, fontSize: 15 },
  keyEnd: { marginLeft: 'auto' },
  hero: { alignItems: 'center', gap: 4, marginBottom: 12, marginTop: 4 },
  hr: { color: Palette.ink, fontFamily: Face.figure, fontSize: 112, lineHeight: 116 },
  hrUnit: { color: Palette.inkMuted, fontSize: 17, fontWeight: '500' },
  pill: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 10 },
  pillText: { color: Palette.ink, fontSize: 16, fontWeight: '600' },
  note: { backgroundColor: Palette.surface, borderRadius: 16, gap: 4, marginTop: 16, padding: 16 },
  noteTitle: { color: Palette.warning, fontSize: 17, fontWeight: '600' },
  noteBody: { color: Palette.inkMuted, fontSize: 15, lineHeight: 21 },
  tiles: { marginBottom: 20, marginTop: 20 },
});
