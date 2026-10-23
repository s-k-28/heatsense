import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Face, Palette } from '@/constants/theme';
import type { DemoMember } from '@/state/demo-team';

// Four of the band's signals at a glance, each checked against its usual range, after Gentler
// Streak's body metrics. Tapping opens the Band tab for the full picture.

type Item = { label: string; value: string; unit: string; ok: boolean; note: string };

function items(m: DemoMember): Item[] {
  const v = m.vitals;
  return [
    { label: 'Heart rate', value: String(v.heartRate), unit: 'bpm', ok: m.status === 'usual', note: m.status === 'usual' ? 'Usual' : 'Slow recovery' },
    { label: 'Skin', value: v.skinTempF.toFixed(1), unit: '°F', ok: v.skinTempF <= 95, note: v.skinTempF <= 95 ? 'Usual' : 'Warm' },
    { label: 'Sweat', value: v.sweat.toFixed(1), unit: 'µS', ok: true, note: v.sweat > 10 ? 'Heavy' : 'Usual' },
    { label: 'Oxygen', value: String(v.spo2), unit: '%', ok: v.spo2 >= 95, note: v.spo2 >= 95 ? 'Usual' : 'Low' },
  ];
}

function Mark({ ok }: { ok: boolean }) {
  return ok
    ? <Svg fill="none" height={12} stroke={Palette.safe} strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} viewBox="0 0 24 24" width={12}><Path d="m5 12 5 5L20 7" /></Svg>
    : <View style={styles.warnDot} />;
}

export function BodyStrip({ member, onPress }: { member: DemoMember; onPress: () => void }) {
  const list = items(member);
  return (
    <Pressable accessibilityHint="Opens your band" accessibilityLabel={list.map((i) => `${i.label} ${i.value} ${i.unit}, ${i.note}`).join('. ')} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.strip, pressed && styles.pressed]}>
      {list.map((i) => (
        <View key={i.label} style={styles.tile}>
          <Text style={styles.label}>{i.label}</Text>
          <Text style={styles.value}>{i.value}<Text style={styles.unit}> {i.unit}</Text></Text>
          <View style={styles.noteRow}><Mark ok={i.ok} /><Text style={[styles.note, !i.ok && { color: Palette.warning }]}>{i.note}</Text></View>
        </View>
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.75 },
  strip: { flexDirection: 'row', gap: 8 },
  tile: { backgroundColor: Palette.surface, borderRadius: 14, flex: 1, gap: 4, paddingHorizontal: 10, paddingVertical: 12 },
  label: { color: Palette.inkMuted, fontSize: 13, fontWeight: '600' },
  value: { color: Palette.ink, fontFamily: Face.figure, fontSize: 24, lineHeight: 28 },
  unit: { color: Palette.inkMuted, fontFamily: Face.label, fontSize: 13 },
  noteRow: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  note: { color: Palette.inkMuted, fontSize: 12, fontWeight: '600' },
  warnDot: { backgroundColor: Palette.warning, borderRadius: 4, height: 8, width: 8 },
});
