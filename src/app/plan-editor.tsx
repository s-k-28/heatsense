import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeatIcon } from '@/components/heat-icon';
import { SlidingTabs } from '@/components/sliding-tabs';
import { TextLink } from '@/components/ui/list';
import { SegmentBar, StatStrip } from '@/components/ui/visuals';
import { Palette, Radius, Spacing, Type } from '@/constants/theme';
import {
  EQUIPMENT_LABEL,
  buildSchedule,
  clockTime,
  deletePlan,
  practiceEnd,
  savePlan,
  setActivePlan,
  usePracticePlans,
  type Equipment,
  type PracticePlan,
} from '@/state/practice-plans';

const minus = { ios: 'minus', android: 'remove', web: 'remove' } as const;
const plus = { ios: 'plus', android: 'add', web: 'add' } as const;
const EQUIPMENT: Equipment[] = ['on', 'breaks', 'off'];

/**
 * Build or change a practice plan. Opened from a saved plan, it starts as a copy of that plan's
 * timings, so a coach adjusts what they already use instead of starting over. The schedule below
 * the controls redraws as they change, so the breaks and when they fall are always in view.
 */
export default function PlanEditorScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const { active, plans } = usePracticePlans();
  const source = plans.find((plan) => plan.id === params.id);
  // A new plan starts from today's timings; an existing one from its own.
  const [plan, setPlan] = useState<PracticePlan>(() => (source ? { ...source } : { ...active, builtIn: undefined, id: '', name: '' }));
  const editing = Boolean(source && !source.builtIn);

  const set = <K extends keyof PracticePlan>(key: K, value: PracticePlan[K]) => setPlan((current) => ({ ...current, [key]: value }));
  const blocks = buildSchedule(plan);
  const breaks = blocks.filter((block) => block.kind === 'rest');
  // An unnamed plan is named after its timings; a copy of the standard plan that kept its name says it was edited.
  const trimmed = plan.name.trim();
  const fallback = `${plan.workMinutes} / ${plan.restMinutes} · ${plan.lengthMinutes} min`;
  const named = { ...plan, name: !trimmed ? fallback : source?.builtIn && trimmed === source.name ? `${trimmed} · edited` : trimmed };

  const close = () => (router.canGoBack() ? router.back() : router.replace('/dashboard?role=coach&tab=plan'));
  const useToday = () => {
    setActivePlan(savePlan(named));
    close();
  };
  const save = () => {
    savePlan(named);
    close();
  };
  const saveCopy = () => {
    savePlan({ ...named, id: '', name: `${named.name} copy` });
    close();
  };
  const remove = () =>
    Alert.alert(`Delete “${named.name}”?`, 'Today’s plan goes back to the standard one if this was it.', [
      { style: 'cancel', text: 'Cancel' },
      { onPress: () => { deletePlan(plan.id); close(); }, style: 'destructive', text: 'Delete' },
    ]);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={[styles.bar, { paddingTop: insets.top + Spacing.two }]}>
        <TextLink label="Cancel" onPress={close} />
        <Text style={styles.barTitle}>{source ? (editing ? 'Edit plan' : 'New from standard') : 'New plan'}</Text>
        <View style={styles.barEnd} />
      </View>
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.eight }]} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Plan name</Text>
          <TextInput
            onChangeText={(text) => set('name', text)}
            placeholder="e.g. Hot afternoon, varsity"
            placeholderTextColor={Palette.inkFaint}
            returnKeyType="done"
            style={styles.input}
            value={plan.name}
          />

          <Text style={styles.label}>Timing</Text>
          <View style={styles.card}>
            <Stepper label="Start" onChange={(v) => set('startMinutes', v)} step={15} min={5 * 60} max={21 * 60} value={plan.startMinutes} format={(v) => clockTime(v, true)} />
            <Stepper label="Check-in" onChange={(v) => set('checkInMinutes', v)} step={5} min={0} max={30} value={plan.checkInMinutes} format={(v) => `${v} min`} />
            <Stepper label="Work block" onChange={(v) => set('workMinutes', v)} step={5} min={5} max={60} value={plan.workMinutes} format={(v) => `${v} min`} />
            <Stepper label="Break" onChange={(v) => set('restMinutes', v)} step={1} min={2} max={20} value={plan.restMinutes} format={(v) => `${v} min`} />
            <Stepper label="Practice length" onChange={(v) => set('lengthMinutes', v)} step={6} min={30} max={180} value={plan.lengthMinutes} format={(v) => `${v} min`} />
            <Stepper label="Water every" last onChange={(v) => set('waterEveryMinutes', v)} step={5} min={5} max={30} value={plan.waterEveryMinutes} format={(v) => `${v} min`} />
          </View>

          <Text style={styles.label}>Equipment</Text>
          <SlidingTabs label="Equipment" onChange={(index) => set('equipment', EQUIPMENT[index])} options={EQUIPMENT.map((item) => EQUIPMENT_LABEL[item])} selected={EQUIPMENT.indexOf(plan.equipment)} />

          <Text style={styles.label}>How it runs</Text>
          <View style={styles.card}>
            <StatStrip
              items={[
                { label: breaks.length === 1 ? 'Break' : 'Breaks', value: String(breaks.length) },
                { label: 'Starts', value: clockTime(plan.startMinutes) },
                { label: 'Ends', value: clockTime(practiceEnd(plan)) },
              ]}
            />
            <View style={styles.preview}>
              <SegmentBar segments={blocks.slice(0, 3).map((block) => ({ color: block.kind === 'work' ? Palette.coral : block.kind === 'rest' ? Palette.info : 'rgba(235,235,245,0.3)', flex: block.minutes, label: block.kind === 'arrive' ? 'Arrive' : block.kind === 'work' ? 'Work' : 'Break', time: clockTime(block.start) }))} />
            </View>
            <Text style={styles.breaks}>
              {breaks.length ? `Breaks at ${breaks.map((block) => clockTime(block.start)).join(', ')}.` : 'No breaks: the practice is shorter than one work block.'}
            </Text>
          </View>

          <Pressable accessibilityRole="button" onPress={useToday} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
            <Text style={styles.primaryText}>Use for today</Text>
          </Pressable>
          <View style={styles.secondaryRow}>
            <Pressable accessibilityRole="button" onPress={save} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
              <Text style={styles.secondaryText}>{editing ? 'Save changes' : 'Save plan'}</Text>
            </Pressable>
            {editing ? (
              <Pressable accessibilityRole="button" onPress={saveCopy} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
                <Text style={styles.secondaryText}>Save as copy</Text>
              </Pressable>
            ) : null}
          </View>
          {editing ? (
            <Pressable accessibilityRole="button" hitSlop={8} onPress={remove} style={({ pressed }) => [styles.delete, pressed && styles.pressed]}>
              <Text style={styles.deleteText}>Delete plan</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Stepper({ format, label, last, max, min, onChange, step, value }: { format: (value: number) => string; label: string; last?: boolean; max: number; min: number; onChange: (value: number) => void; step: number; value: number }) {
  const shown = format(value);
  return (
    <View accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]} accessibilityLabel={`${label}, ${shown}`} accessibilityRole="adjustable" accessible onAccessibilityAction={(event) => onChange(Math.max(min, Math.min(max, value + (event.nativeEvent.actionName === 'increment' ? step : -step))))} style={[styles.stepper, !last && styles.stepperDivider]}>
      <View style={styles.flex}>
        <Text style={styles.stepLabel}>{label}</Text>
      </View>
      <Pressable accessibilityElementsHidden disabled={value <= min} hitSlop={6} onPress={() => onChange(Math.max(min, value - step))} style={({ pressed }) => [styles.round, value <= min && styles.roundOff, pressed && styles.pressed]}>
        <HeatIcon name={minus} size={14} tintColor={Palette.ink} weight="bold" />
      </Pressable>
      <Text style={styles.stepValue}>{shown}</Text>
      <Pressable accessibilityElementsHidden disabled={value >= max} hitSlop={6} onPress={() => onChange(Math.min(max, value + step))} style={({ pressed }) => [styles.round, value >= max && styles.roundOff, pressed && styles.pressed]}>
        <HeatIcon name={plus} size={14} tintColor={Palette.ink} weight="bold" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: Palette.canvas, flex: 1 },
  flex: { flex: 1 },
  pressed: { opacity: 0.6 },
  bar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingBottom: Spacing.three, paddingHorizontal: Spacing.four },
  barTitle: { color: Palette.ink, ...Type.headline },
  barEnd: { width: 56 },
  content: { gap: Spacing.two, paddingHorizontal: Spacing.four },
  label: { color: Palette.inkMuted, ...Type.label, fontSize: 13, marginTop: Spacing.four },
  input: { backgroundColor: Palette.card, borderColor: Palette.cardEdge, borderCurve: 'continuous', borderRadius: Radius.medium, borderWidth: StyleSheet.hairlineWidth, color: Palette.ink, ...Type.body, minHeight: 50, paddingHorizontal: Spacing.four },
  card: { backgroundColor: Palette.card, borderColor: Palette.cardEdge, borderCurve: 'continuous', borderRadius: Radius.medium, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two },
  stepper: { alignItems: 'center', flexDirection: 'row', gap: Spacing.three, minHeight: 60 },
  stepperDivider: { borderBottomColor: 'rgba(255,255,255,0.08)', borderBottomWidth: StyleSheet.hairlineWidth },
  stepLabel: { color: Palette.ink, ...Type.body },
  stepValue: { color: Palette.ink, ...Type.figure, fontSize: 20, lineHeight: 24, minWidth: 74, textAlign: 'center' },
  round: { alignItems: 'center', backgroundColor: Palette.surfaceMuted, borderRadius: 16, height: 32, justifyContent: 'center', width: 32 },
  roundOff: { opacity: 0.35 },
  preview: { marginTop: Spacing.four },
  breaks: { color: Palette.inkMuted, ...Type.footnote, marginBottom: Spacing.two, marginTop: Spacing.three },
  primary: { alignItems: 'center', backgroundColor: Palette.coral, borderCurve: 'continuous', borderRadius: 14, justifyContent: 'center', marginTop: Spacing.six, minHeight: 54 },
  primaryText: { color: '#1A0E07', ...Type.label, fontSize: 17 },
  secondaryRow: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
  secondary: { alignItems: 'center', backgroundColor: Palette.fill, borderCurve: 'continuous', borderRadius: 14, flex: 1, justifyContent: 'center', minHeight: 50 },
  secondaryText: { color: Palette.ink, ...Type.headline },
  delete: { alignItems: 'center', marginTop: Spacing.four, minHeight: 44, justifyContent: 'center' },
  deleteText: { color: Palette.emergency, ...Type.body },
});
