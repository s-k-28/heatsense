import { StyleSheet, Text, View } from 'react-native';

import { Face, Palette } from '@/constants/theme';
import { ACCLIMATIZATION_DAYS, acclimatizationPhase } from '@/lib/acclimatization';

/** Fourteen steps of heat acclimatization, the day reached, and what today's limits are. */
export function AcclimatizationCard({ day, title = 'Heat acclimatization' }: { day: number; title?: string }) {
  const phase = acclimatizationPhase(day);
  const done = day >= ACCLIMATIZATION_DAYS;
  const tone = done ? Palette.safe : day < 6 ? Palette.warning : Palette.coral;
  return (
    <View accessible accessibilityLabel={`${title}: ${done ? 'complete' : `day ${day} of ${ACCLIMATIZATION_DAYS}`}. ${phase.rule}`} style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>{title}</Text>
        <Text style={[styles.count, { color: tone }]}>{done ? 'Done' : `${day}/${ACCLIMATIZATION_DAYS}`}</Text>
      </View>
      <View style={styles.steps}>
        {Array.from({ length: ACCLIMATIZATION_DAYS }, (_, i) => (
          <View key={i} style={[styles.step, { backgroundColor: i < day ? tone : 'rgba(235,235,245,0.1)' }, (i === 1 || i === 4) && styles.phaseEnd]} />
        ))}
      </View>
      <View style={styles.legend}>
        <Text numberOfLines={1} style={[styles.legendText, { flex: 2 }]}>Helmets</Text>
        <Text numberOfLines={1} style={[styles.legendText, { flex: 3 }]}>Pads</Text>
        <Text numberOfLines={1} style={[styles.legendText, { flex: 9 }]}>Full equipment</Text>
      </View>
      <Text style={styles.phase}>{phase.title}</Text>
      <Text style={styles.rule}>{phase.rule}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Palette.surface, borderRadius: 16, padding: 18 },
  head: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between' },
  title: { color: Palette.ink, fontSize: 18, fontWeight: '600' },
  count: { fontFamily: Face.figure, fontSize: 26 },
  steps: { flexDirection: 'row', gap: 3, marginTop: 14 },
  step: { borderRadius: 3, flex: 1, height: 10 },
  phaseEnd: { marginRight: 5 },
  legend: { flexDirection: 'row', marginTop: 6 },
  legendText: { color: Palette.inkMuted, fontSize: 12, fontWeight: '500' },
  phase: { color: Palette.ink, fontSize: 16, fontWeight: '600', marginTop: 14 },
  rule: { color: Palette.inkMuted, fontSize: 15, lineHeight: 21, marginTop: 2 },
});
