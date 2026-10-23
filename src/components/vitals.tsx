import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LineChart } from '@/components/ui/charts';
import { ListRow, Rows } from '@/components/whoop-ui';
import { Face, Palette } from '@/constants/theme';
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

type Signal = 'heartRate' | 'skinTempF' | 'sweat' | 'movement';

// Every signal the band streams. Fixed chart ranges keep small changes from looking like big swings.
const SIGNALS: Record<Signal, { label: string; unit: string; min: number; max: number; format: (v: number) => string; spoken: string }> = {
  heartRate: { label: 'Heart rate', unit: 'bpm', min: 60, max: 190, format: (v) => String(Math.round(v)), spoken: 'beats per minute' },
  skinTempF: { label: 'Skin temp', unit: '°F', min: 90, max: 96, format: (v) => v.toFixed(1), spoken: 'degrees' },
  sweat: { label: 'Sweat (GSR)', unit: 'µS', min: 0, max: 20, format: (v) => v.toFixed(1), spoken: 'microsiemens' },
  movement: { label: 'Movement', unit: '%', min: 0, max: 100, format: (v) => String(Math.round(v)), spoken: 'percent' },
};

/** The full picture for one athlete: pick any signal to see it live and over the last six minutes. */
export function VitalsDetail({ member }: { member: DemoMember }) {
  const [signal, setSignal] = useState<Signal>('heartRate');
  const { vitals } = member;
  const spec = SIGNALS[signal];
  const now = spec.format(vitals[signal]);
  return (
    <>
      <SimulatedTag />
      <View style={styles.hero}>
        <Text style={styles.hr}>{now}<Text style={styles.hrUnitBig}>{signal === 'heartRate' ? '' : spec.unit}</Text></Text>
        <Text style={styles.hrUnit}>{signal === 'heartRate' ? 'bpm · ' : `${spec.label} · `}{vitals.phase === 'work' ? 'working' : 'on break'}</Text>
        <View style={styles.pill}>
          <View style={[styles.statusDot, { backgroundColor: statusTone(member) }]} />
          <Text style={styles.pillText}>{statusLabel(member)}</Text>
        </View>
      </View>
      <LineChart
        format={spec.format}
        key={signal}
        labels={['6 min ago', 'Now']}
        max={spec.max}
        min={spec.min}
        summary={`${spec.label} over the last six minutes, now ${now} ${spec.spoken}`}
        tone={member.status === 'watch' && signal === 'heartRate' ? Palette.warning : Palette.coral}
        values={member.history.map((v) => v[signal])}
      />
      {member.status === 'watch' ? (
        <View style={styles.note}>
          <Text style={styles.noteTitle}>Heart rate is staying high through this break</Text>
          <Text style={styles.noteBody}>Check in with {member.athlete.name.split(' ')[0]}: shade, water, and how they feel. A trend to look at, not a diagnosis.</Text>
        </View>
      ) : null}
      <View style={styles.tiles}>
        <Rows>
          {(Object.keys(SIGNALS) as Signal[]).map((key) => (
            <ListRow
              key={key}
              label={SIGNALS[key].label}
              onPress={() => setSignal(key)}
              selected={key === signal}
              trailing={<View style={[styles.mark, key === signal && styles.markOn]} />}
              value={`${SIGNALS[key].format(vitals[key])}${key === 'heartRate' || key === 'sweat' ? ' ' : ''}${SIGNALS[key].unit}`}
              valueTone={key === signal ? Palette.coral : undefined}
            />
          ))}
          <ListRow label="Resting heart rate" value={`${member.athlete.restingHr} bpm`} />
        </Rows>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  hrUnitBig: { color: Palette.inkMuted, fontFamily: Face.label, fontSize: 40 },
  mark: { borderRadius: 4, height: 8, width: 8 },
  markOn: { backgroundColor: Palette.coral },
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
