import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { ZonePicker } from '@/components/protocols-tab';
import { ListRow, Rows, SectionTitle } from '@/components/whoop-ui';
import { Palette } from '@/constants/theme';
import { enter } from '@/lib/motion';
import { useEmergencyPlan } from '@/state/emergency-plan';
import { useCoachData } from '@/state/team-session';

// Learn, for athletes, as things to do rather than read: check how you feel and get told what to do,
// see where help is (the team's emergency plan), check your hydration against the urine color chart
// trainers use, and explore the UIL zones.

type Level = 'severe' | 'moderate' | 'mild';

const SYMPTOMS: { label: string; level: Level }[] = [
  { label: 'Confused or foggy', level: 'severe' },
  { label: 'Fainted or about to', level: 'severe' },
  { label: 'Throwing up', level: 'severe' },
  { label: 'Dizzy', level: 'moderate' },
  { label: 'Headache', level: 'moderate' },
  { label: 'Nauseous', level: 'moderate' },
  { label: 'Very tired or weak', level: 'moderate' },
  { label: 'Cold, clammy skin', level: 'moderate' },
  { label: 'Muscle cramps', level: 'mild' },
  { label: 'Very thirsty', level: 'mild' },
];

const ADVICE: Record<Level, { title: string; body: string; tone: string }> = {
  severe: { title: 'Get help now', body: 'Tell a coach or your athletic trainer right away, or ask a teammate to. These can be signs of heat stroke, a medical emergency.', tone: Palette.emergency },
  moderate: { title: 'Stop and cool down', body: 'Move to shade, drink water, and take off extra gear. Tell your coach, and don’t go back in until you feel normal.', tone: Palette.warning },
  mild: { title: 'Take a break', body: 'Drink a sports drink, stretch the muscle gently, and rest in the shade. Tell your coach if it doesn’t ease.', tone: '#FFD60A' },
};

// The urine color chart (Armstrong) trainers use to check hydration, lightest first.
const SHADES = ['#F7F4CF', '#F3EDA8', '#EEE07C', '#E7D058', '#DCBC3B', '#CBA22B', '#B38622', '#8C671A'];
const hydration = (i: number) =>
  i <= 2 ? { title: 'Well hydrated', body: 'Keep drinking with every break.', tone: Palette.safe }
    : i <= 4 ? { title: 'Drink more', body: 'Have 16–20 oz of water before practice and drink at every break.', tone: '#FFD60A' }
      : { title: 'Dehydrated', body: 'Drink now, and tell your coach or trainer before practice. Dehydration raises your risk of heat illness.', tone: Palette.emergency };

function SelfCheck() {
  const reduced = useReducedMotion();
  const [picked, setPicked] = useState<string[]>([]);
  const levels = SYMPTOMS.filter((s) => picked.includes(s.label)).map((s) => s.level);
  const level: Level | null = levels.includes('severe') ? 'severe' : levels.includes('moderate') ? 'moderate' : levels.length ? 'mild' : null;
  const toggle = (label: string) => setPicked(picked.includes(label) ? picked.filter((p) => p !== label) : [...picked, label]);
  return (
    <>
      <View style={styles.chips}>
        {SYMPTOMS.map((s) => {
          const on = picked.includes(s.label);
          return (
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} key={s.label} onPress={() => toggle(s.label)} style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && styles.pressed]}>
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{s.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {level ? (
        <Animated.View accessibilityLiveRegion="polite" entering={enter(0, reduced)} key={level} style={[styles.result, { borderColor: ADVICE[level].tone }]}>
          <View style={[styles.resultBar, { backgroundColor: ADVICE[level].tone }]} />
          <View style={styles.resultCopy}>
            <Text style={[styles.resultTitle, { color: ADVICE[level].tone }]}>{ADVICE[level].title}</Text>
            <Text style={styles.resultBody}>{ADVICE[level].body}</Text>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setPicked([])}><Text style={styles.clear}>Clear</Text></Pressable>
          </View>
        </Animated.View>
      ) : (
        <Text style={styles.hint}>Tap anything you’re feeling, during practice or after.</Text>
      )}
    </>
  );
}

function HydrationCheck() {
  const [shade, setShade] = useState<number | null>(null);
  const result = shade === null ? null : hydration(shade);
  return (
    <View style={styles.card}>
      <View style={styles.shades}>
        {SHADES.map((color, i) => (
          <Pressable accessibilityLabel={`Shade ${i + 1} of 8`} accessibilityRole="button" accessibilityState={{ selected: shade === i }} key={color} onPress={() => setShade(i)} style={[styles.shade, { backgroundColor: color }, shade === i && styles.shadeOn]} />
        ))}
      </View>
      <View style={styles.shadeAxis}><Text style={styles.axisText}>Lighter</Text><Text style={styles.axisText}>Darker</Text></View>
      {result ? (
        <View accessibilityLiveRegion="polite" style={styles.hydration}>
          <View style={[styles.hydrationDot, { backgroundColor: result.tone }]} />
          <View style={styles.resultCopy}>
            <Text style={styles.hydrationTitle}>{result.title}</Text>
            <Text style={styles.resultBody}>{result.body}</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.cardHint}>Tap the shade closest to your urine color.</Text>
      )}
    </View>
  );
}

/** Where help is: the team's emergency action plan, as the coach and trainers keep it. */
function WhereHelpIs() {
  const data = useCoachData('athlete');
  const [plan] = useEmergencyPlan(data?.sample ? null : data?.teamId ?? null);
  const rows = ([['aed', 'AED'], ['tub', 'Cooling tub'], ['hospital', 'Hospital'], ['caller', 'Calls 911']] as const).filter(([k]) => plan[k]?.trim());
  if (!rows.length) return null;
  return (
    <>
      <SectionTitle title="If something goes wrong" />
      <Rows>
        {rows.map(([k, label]) => <ListRow key={k} label={label} value={plan[k]!.trim()} />)}
      </Rows>
    </>
  );
}

export function LearnTab() {
  return (
    <>
      <SectionTitle title="How do you feel?" />
      <SelfCheck />
      <WhereHelpIs />
      <SectionTitle title="Check your hydration" />
      <HydrationCheck />
      <ZonePicker role="athlete" />
    </>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderColor: Palette.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9 },
  chipOn: { backgroundColor: Palette.ink, borderColor: Palette.ink },
  chipText: { color: Palette.ink, fontSize: 15, fontWeight: '600' },
  chipTextOn: { color: '#101416' },
  hint: { color: Palette.inkMuted, fontSize: 16, lineHeight: 22, marginTop: 12 },
  result: { backgroundColor: Palette.surface, borderRadius: 16, borderWidth: 1, flexDirection: 'row', marginTop: 14, overflow: 'hidden' },
  resultBar: { width: 5 },
  resultCopy: { flex: 1, gap: 4, padding: 16 },
  resultTitle: { fontSize: 20, fontWeight: '700' },
  resultBody: { color: Palette.ink, fontSize: 16, lineHeight: 22 },
  clear: { color: Palette.inkMuted, fontSize: 15, fontWeight: '600', marginTop: 6 },
  card: { backgroundColor: Palette.surface, borderRadius: 16, padding: 16 },
  shades: { flexDirection: 'row', gap: 6 },
  shade: { borderColor: 'transparent', borderRadius: 10, borderWidth: 3, flex: 1, height: 52 },
  shadeOn: { borderColor: Palette.ink },
  shadeAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  axisText: { color: Palette.inkMuted, fontSize: 13, fontWeight: '500' },
  cardHint: { color: Palette.inkMuted, fontSize: 15, marginTop: 12 },
  hydration: { alignItems: 'flex-start', borderTopColor: 'rgba(255,255,255,0.08)', borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', marginTop: 14 },
  hydrationDot: { borderRadius: 6, height: 12, marginTop: 22, width: 12 },
  hydrationTitle: { color: Palette.ink, fontSize: 18, fontWeight: '700' },
});
