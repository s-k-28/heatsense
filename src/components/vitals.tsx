import { StyleSheet, Text, View } from 'react-native';

import { VitalCards } from '@/components/vital-cards';
import { ListRow, Rows } from '@/components/whoop-ui';
import { Face, Palette } from '@/constants/theme';
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

/** The full picture for one athlete: live heart rate, then every band signal in its own card. */
export function VitalsDetail({ member }: { member: DemoMember }) {
  const { vitals } = member;
  return (
    <>
      <SimulatedTag />
      <View style={styles.hero}>
        <Text style={styles.hr}>{vitals.heartRate}</Text>
        <Text style={styles.hrUnit}>bpm · {vitals.phase === 'work' ? 'working' : 'on break'}</Text>
        <View style={styles.pill}>
          <View style={[styles.statusDot, { backgroundColor: statusTone(member) }]} />
          <Text style={styles.pillText}>{statusLabel(member)}</Text>
        </View>
      </View>
      {member.status === 'watch' ? (
        <View style={styles.note}>
          <Text style={styles.noteTitle}>Heart rate is staying high through this break</Text>
          <Text style={styles.noteBody}>Check in with {member.athlete.name.split(' ')[0]}: shade, water, and how they feel. A trend to look at, not a diagnosis.</Text>
        </View>
      ) : null}
      <VitalCards history={member.history} />
      <View style={styles.tiles}>
        <Rows>
          <ListRow label="Resting heart rate" value={`${member.athlete.restingHr} bpm`} />
        </Rows>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  tag: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 6, marginBottom: 12 },
  tagDot: { backgroundColor: Palette.info, borderRadius: 3, height: 6, width: 6 },
  tagText: { color: Palette.inkMuted, fontSize: 14, fontWeight: '500' },
  statusDot: { borderRadius: 5, height: 10, width: 10 },
  hero: { alignItems: 'flex-start', gap: 4, marginBottom: 12, marginTop: 4 },
  hr: { color: Palette.ink, fontFamily: Face.figure, fontSize: 112, lineHeight: 116 },
  hrUnit: { color: Palette.inkMuted, fontSize: 17, fontWeight: '500' },
  pill: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 10 },
  pillText: { color: Palette.ink, fontSize: 16, fontWeight: '600' },
  note: { backgroundColor: Palette.surface, borderRadius: 16, gap: 4, marginTop: 16, padding: 16 },
  noteTitle: { color: Palette.warning, fontSize: 17, fontWeight: '600' },
  noteBody: { color: Palette.inkMuted, fontSize: 15, lineHeight: 21 },
  tiles: { marginBottom: 20, marginTop: 20 },
});
