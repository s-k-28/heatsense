import { Text } from '@/components/ui/text';
import { useAthleteStyles } from '@/components/athlete-appearance';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { Face, Palette } from '@/constants/theme';
import type { DemoMember } from '@/state/demo-team';
import { useTemperature } from '@/state/preferences';

// Four of the band's signals at a glance, each checked against its usual range, after Gentler
// Streak's body metrics. Tapping opens the Band tab for the full picture.

type Item = { label: string; value: string; unit: string; ok: boolean; note: string };

function items(m: DemoMember, temp: ReturnType<typeof useTemperature>): Item[] {
  const v = m.vitals;
  return [
    { label: 'Heart rate', value: String(v.heartRate), unit: 'bpm', ok: m.status === 'usual', note: m.status === 'usual' ? 'Usual' : 'Slow recovery' },
    { label: 'Skin', value: temp.precise(v.skinTempF).toFixed(1), unit: temp.unit, ok: v.skinTempF <= 95, note: v.skinTempF <= 95 ? 'Usual' : 'Warm' },
    { label: 'Sweat', value: v.sweat.toFixed(1), unit: 'µS', ok: true, note: v.sweat > 10 ? 'Heavy' : 'Usual' },
    { label: 'Oxygen', value: String(v.spo2), unit: '%', ok: v.spo2 >= 95, note: v.spo2 >= 95 ? 'Usual' : 'Low' },
  ];
}

export function BodyStrip({ member }: { member: DemoMember }) {
  const styles = useAthleteStyles(baseStyles);
  const { fontScale } = useWindowDimensions();
  const temp = useTemperature();
  const list = items(member, temp);
  return (
    <View accessible accessibilityLabel={`Simulated band readings. ${list.map((i) => `${i.label} ${i.value} ${i.unit}, ${i.note}`).join('. ')}`}>
      <View style={styles.metrics}>
      {list.map((i) => (
        <View key={i.label} style={[styles.tile, fontScale > 1.25 && styles.tileStacked]}>
          <View style={styles.copy}>
            <Text style={styles.label}>{i.label}</Text>
            {!i.ok || i.note === 'Heavy' ? <Text style={styles.note}>{i.note}</Text> : null}
          </View>
          <Text style={styles.value}>{i.value}<Text style={styles.unit}> {i.unit}</Text></Text>
        </View>
      ))}
      </View>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  pressed: { opacity: 0.75 },
  strip: { borderBottomColor: Palette.border, borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 18 },
  simulated: { color: Palette.inkMuted, fontSize: 14, marginBottom: 12 },
  metrics: { gap: 0 },
  tile: { alignItems: 'center', borderTopColor: Palette.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 12, minHeight: 52, paddingVertical: 8 },
  tileStacked: { alignItems: 'flex-start', flexDirection: 'column', gap: 8 },
  copy: { flex: 1, gap: 2 },
  label: { color: Palette.ink, fontSize: 16, fontWeight: '500' },
  value: { color: Palette.ink, fontFamily: Face.figure, fontSize: 24, lineHeight: 28 },
  unit: { color: Palette.inkMuted, fontFamily: Face.label, fontSize: 13 },
  note: { color: Palette.warning, fontSize: 14, fontWeight: '500' },
});
