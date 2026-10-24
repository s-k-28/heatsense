import { Text } from '@/components/ui/text';
import { useAthleteStyles } from '@/components/ui/role-appearance';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Surface } from '@/components/ui/surface';
import { VitalCards, type BandSignal } from '@/components/band/vital-cards';
import { ListRow, Rows } from '@/components/ui/data-display';
import { Palette } from '@/constants/theme';
import type { DemoMember } from '@/state/demo-team';
import { DEMO_SPEED } from '@/state/demo-team';

// Band vitals, shown the same way everywhere: the coach's team list, the trainer's monitor, an
// athlete's detail screen and an athlete's own Band tab. All of it is simulated until the band
// firmware exists, and every view says so.

export function SimulatedTag({ compact = false }: { compact?: boolean }) {
  const styles = useAthleteStyles(baseStyles);
  const [expanded, setExpanded] = useState(false);
  if (!compact) return <View accessibilityLabel={`Simulated band data, ${DEMO_SPEED} times speed`} accessible style={styles.tag}><View style={styles.tagDot} /><Text style={styles.tagText}>Simulated band data · {DEMO_SPEED}× speed</Text></View>;
  return (
    <View style={styles.source}>
      <Pressable accessibilityLabel={`Simulated band data, ${DEMO_SPEED} times speed. About these readings`} accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={[styles.tag, compact && styles.tagCompact]} aria-expanded={expanded}>
        <View style={styles.tagDot} />
        <Text style={styles.tagText}>{compact ? `Simulated · ${DEMO_SPEED}×` : `Simulated band data · ${DEMO_SPEED}× speed`}</Text>
      </Pressable>
      {expanded ? <Text style={styles.sourceDetail}>Generated examples running at {DEMO_SPEED}× speed, not measurements from a physical band.</Text> : null}
    </View>
  );
}


/** The full picture for one athlete: live heart rate, then every band signal in its own card. */
export function VitalsDetail({ member, bandVisual, selectedSignal, onSignalChange, previewHeartRate }: { member: DemoMember; bandVisual?: ReactNode; selectedSignal?: BandSignal; onSignalChange?: (signal: BandSignal) => void; previewHeartRate?: boolean }) {
  const styles = useAthleteStyles(baseStyles);
  return (
    <>
      <View style={bandVisual ? styles.bandContext : styles.context}>
        {bandVisual}
        <View style={bandVisual ? styles.bandContextCopy : styles.contextCopy}>
        <Text style={styles.phase}>{member.vitals.phase === 'work' ? 'Working' : 'On break'}</Text>
        <SimulatedTag compact />
        </View>
      </View>
      {member.status === 'watch' ? (
        <Surface style={styles.note}>
          <Text style={styles.noteTitle}>Heart rate is staying high through this break</Text>
          <Text style={styles.noteBody}>Check in with {member.athlete.name.split(' ')[0]}: shade, water, and how they feel. A trend to look at, not a diagnosis.</Text>
        </Surface>
      ) : null}
      <VitalCards history={member.history} simulated selectedSignal={selectedSignal} onSignalChange={onSignalChange} previewHeartRate={previewHeartRate} />
      <View style={styles.tiles}>
        <Rows>
          <ListRow label="Resting heart rate" value={`${member.athlete.restingHr} bpm`} />
        </Rows>
      </View>
    </>
  );
}

const baseStyles = StyleSheet.create({
  bandContext: { alignItems: 'center', flexDirection: 'row', gap: 24, paddingVertical: 8 },
  bandContextCopy: { flex: 1, minWidth: 0 },
  contextCopy: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  context: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  phase: { color: Palette.inkMuted, fontSize: 16, lineHeight: 44 },
  source: { flexShrink: 1, maxWidth: '100%' },
  sourceDetail: { color: Palette.inkMuted, fontSize: 15, lineHeight: 21, maxWidth: 280, marginBottom: 12 },
  tagCompact: { minHeight: 44, marginBottom: 0 },
  tag: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 6, marginBottom: 12 },
  tagDot: { backgroundColor: Palette.info, borderRadius: 3, height: 6, width: 6 },
  tagText: { color: Palette.inkMuted, fontSize: 14, fontWeight: '500' },
  statusDot: { borderRadius: 5, height: 10, width: 10 },
  hero: { alignItems: 'flex-start', gap: 4, marginBottom: 12, marginTop: 4 },
  hrUnit: { color: Palette.inkMuted, fontSize: 17, fontWeight: '500' },
  pill: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 10 },
  pillText: { color: Palette.ink, fontSize: 16, fontWeight: '600' },
  note: { gap: 8, marginTop: 16, padding: 20 },
  noteTitle: { color: Palette.warning, fontSize: 17, fontWeight: '600' },
  noteBody: { color: Palette.inkMuted, fontSize: 15, lineHeight: 21 },
  tiles: { marginBottom: 20, marginTop: 20 },
});
