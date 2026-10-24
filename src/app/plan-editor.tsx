import { Surface, surfaceStyles } from '@/components/ui/surface';
import { Text, TextInput } from '@/components/ui/text';
import { CoachPalette, CoachRadius, CoachType } from '@/constants/coach-theme';
import { ActionButton } from '@/components/ui/action-button';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Host, Picker, Text as SwiftText } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { ActivityIndicator, Alert, KeyboardAvoidingView, LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SlidingTabs } from '@/components/ui/sliding-tabs';
import { TextLink } from '@/components/ui/list';
import { Palette, Spacing, Type } from '@/constants/theme';
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
import { ZONES } from '@/lib/practice';
import { checkPlan } from '@/lib/plan-check';
import { UIL_GUIDANCE } from '@/lib/uil-wbgt';
import { useCoachDataState } from '@/state/team-session';

const EQUIPMENT: Equipment[] = ['on', 'breaks', 'off'];

type TimingKey = 'startMinutes' | 'checkInMinutes' | 'workMinutes' | 'restMinutes' | 'lengthMinutes' | 'waterEveryMinutes';
const range = (min: number, max: number, step: number) => Array.from({ length: Math.floor((max - min) / step) + 1 }, (_, i) => min + i * step);
const minutes = (v: number) => `${v} min`;
const TIMING: { key: TimingKey; label: string; options: number[]; format: (v: number) => string }[] = [
  { key: 'startMinutes', label: 'Starts', options: range(5 * 60, 21 * 60, 15), format: (v) => clockTime(v, true) },
  { key: 'checkInMinutes', label: 'Check-in', options: range(0, 30, 5), format: (v) => (v ? minutes(v) : 'None') },
  { key: 'workMinutes', label: 'Work block', options: range(5, 60, 5), format: minutes },
  { key: 'restMinutes', label: 'Break', options: range(2, 20, 1), format: minutes },
  { key: 'lengthMinutes', label: 'Practice length', options: range(30, 180, 6), format: minutes },
  { key: 'waterEveryMinutes', label: 'Water every', options: range(5, 30, 5), format: minutes },
];
const BLOCK_COLOR = { arrive: 'rgba(235,235,245,0.3)', rest: Palette.info, work: Palette.coral } as const;

/**
 * Build or change a practice plan. Opened from a saved plan, it starts as a copy of that plan's
 * timings, so a coach adjusts what they already use instead of starting over. The schedule below
 * the controls redraws as they change, so the breaks and when they fall are always in view.
 */
export default function PlanEditorScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const { active, plans, status, retry } = usePracticePlans();
  const source = plans.find(plan => plan.id === params.id);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/dashboard?role=coach&tab=plan'));
  if (status !== 'ready' || (params.id && !source)) return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={[styles.bar, { paddingTop: insets.top + Spacing.two }]}>
        <TextLink label="Cancel" onPress={close} />
        <Text accessibilityRole="header" style={styles.barTitle}>Practice plan</Text>
        <View style={styles.barEnd} />
      </View>
      <View accessibilityLiveRegion="polite" style={styles.pending}>
        {status === 'loading' ? <ActivityIndicator accessibilityLabel="Loading saved plans" color={Palette.inkMuted} /> : <>
          <Text style={styles.checkEmpty}>{status === 'error' ? 'Couldn’t load saved plans. Your current plans have not been replaced.' : 'This plan is no longer available.'}</Text>
          <ActionButton label={status === 'error' ? 'Try again' : 'Back to plans'} onPress={status === 'error' ? retry : () => router.replace('/dashboard?role=coach&tab=plan')} variant="secondary" />
        </>}
      </View>
    </View>
  );
  return <PlanEditorForm active={active} key={source?.id ?? 'new'} source={source} />;
}

function PlanEditorForm({ active, source }: { active: PracticePlan; source?: PracticePlan }) {
  const insets = useSafeAreaInsets();
  // A new plan starts from today's timings; an existing one from its own.
  const [plan, setPlan] = useState<PracticePlan>(() => (source ? { ...source } : { ...active, builtIn: undefined, id: '', name: '' }));
  const editing = Boolean(source && !source.builtIn);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = <K extends keyof PracticePlan>(key: K, value: PracticePlan[K]) => setPlan((current) => ({ ...current, [key]: value }));
  const blocks = buildSchedule(plan);
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
  const deleteAndClose = () => { deletePlan(plan.id); close(); };
  const remove = () => {
    if (Platform.OS === 'web') { setConfirmDelete(true); return; }
    Alert.alert(`Delete “${named.name}”?`, 'Today’s plan goes back to the standard one if this was it.', [
      { style: 'cancel', text: 'Cancel' },
      { onPress: deleteAndClose, style: 'destructive', text: 'Delete' },
    ]);
  };

  const [open, setOpen] = useState<TimingKey | null>(null);
  const toggle = (key: TimingKey) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((current) => (current === key ? null : key));
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={[styles.bar, { paddingTop: insets.top + Spacing.two }]}>
        <TextLink label="Cancel" onPress={close} />
        <Text accessibilityRole="header" style={styles.barTitle}>{source ? (editing ? 'Edit plan' : 'New from standard') : 'New plan'}</Text>
        <Pressable accessibilityRole="button" hitSlop={10} onPress={save} style={styles.barEnd}>
          <Text style={styles.barSave}>Save</Text>
        </Pressable>
      </View>
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.eight }]} keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled">
          <Timeline blocks={blocks} plan={plan} />

          <View style={[styles.group, styles.nameGroup]}>
            <TextInput
              accessibilityLabel="Plan name"
              onChangeText={(text) => set('name', text)}
              placeholder="Plan name"
              placeholderTextColor={Palette.inkFaint}
              returnKeyType="done"
              style={styles.nameInput}
              value={plan.name}
            />
          </View>

          <Text style={styles.label}>Timing</Text>
          <View style={styles.group}>
            {TIMING.map((row, index) => (
              <TimingRow
                format={row.format}
                key={row.key}
                label={row.label}
                last={index === TIMING.length - 1}
                onChange={(v) => set(row.key, v)}
                onToggle={() => toggle(row.key)}
                open={open === row.key}
                options={row.options}
                value={plan[row.key]}
              />
            ))}
          </View>

          <Text style={styles.label}>Equipment</Text>
          <SlidingTabs label="Equipment" onChange={(index) => set('equipment', EQUIPMENT[index])} options={EQUIPMENT.map((item) => EQUIPMENT_LABEL[item])} selected={EQUIPMENT.indexOf(plan.equipment)} variant="coach" />

          <ZoneCheck onFix={(fix) => setPlan((current) => ({ ...current, ...fix }))} plan={plan} />

          <ActionButton label="Use for today" onPress={useToday} variant="primary" style={styles.primary} />
          {editing ? (
            confirmDelete ? <Surface accessibilityLiveRegion="polite" style={styles.pending}>
              <Text accessibilityRole="header" style={styles.checkTitle}>Delete “{named.name}”?</Text>
              <Text style={styles.checkEmpty}>Today’s plan goes back to the standard one if this was it.</Text>
              <View style={styles.secondaryRow}>
                <ActionButton label="Cancel" onPress={() => setConfirmDelete(false)} style={styles.secondary} variant="secondary" />
                <ActionButton label="Delete plan" onPress={deleteAndClose} style={styles.secondary} variant="danger" />
              </View>
            </Surface> : (
              <View style={[styles.group, styles.moreGroup]}>
                <Pressable accessibilityRole="button" onPress={saveCopy} style={({ pressed }) => [styles.row, styles.rowDivider, pressed && styles.rowPressed]}>
                  <Text style={styles.rowAction}>Save as copy</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={remove} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
                  <Text style={[styles.rowAction, styles.rowDanger]}>Delete plan</Text>
                </Pressable>
              </View>
            )
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** The whole practice on one line, the way a workout app previews its intervals. */
function Timeline({ blocks, plan }: { blocks: ReturnType<typeof buildSchedule>; plan: PracticePlan }) {
  const end = practiceEnd(plan);
  const breaks = blocks.filter((block) => block.kind === 'rest');
  const sameHalf = plan.startMinutes < 12 * 60 === end < 12 * 60;
  return (
    <View style={styles.timeline}>
      <Text style={styles.timelineRange}>{`${clockTime(plan.startMinutes, !sameHalf)} – ${clockTime(end, true)}`}</Text>
      <Text style={styles.timelineMeta}>{`${end - plan.startMinutes} min · ${breaks.length} ${breaks.length === 1 ? 'break' : 'breaks'} · water every ${plan.waterEveryMinutes} min`}</Text>
      <View accessibilityLabel={breaks.length ? `Breaks at ${breaks.map((block) => clockTime(block.start)).join(', ')}` : 'No breaks'} accessible style={styles.track}>
        {blocks.map((block) => <View key={`${block.kind}-${block.start}`} style={[styles.segment, { backgroundColor: BLOCK_COLOR[block.kind], flex: block.minutes }]} />)}
      </View>
      <View style={styles.legend}>
        {(['work', 'rest', 'arrive'] as const).map((kind) => (
          <View key={kind} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: BLOCK_COLOR[kind] }]} />
            <Text style={styles.legendText}>{kind === 'work' ? 'Work' : kind === 'rest' ? 'Break' : 'Check-in'}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.breaks}>
        {breaks.length ? `Breaks at ${breaks.map((block) => clockTime(block.start)).join(', ')}` : 'No breaks: the practice is shorter than one work block.'}
      </Text>
    </View>
  );
}

/**
 * Today's zone against the plan: the break count, break length, rest per hour and practice length
 * UIL requires, each checked, with a one-tap fix that spaces the breaks the way the chart allows.
 */
function ZoneCheck({ plan, onFix }: { plan: PracticePlan; onFix: (fix: Partial<PracticePlan>) => void }) {
  const team = useCoachDataState('coach');
  const data = team.data;
  const zone = data?.readings.at(-1)?.zone ?? null;
  if (team.status === 'loading') return <><Text style={styles.label}>Today’s zone</Text><View style={styles.card}><Text accessibilityLiveRegion="polite" style={styles.checkEmpty}>Loading current field guidance…</Text></View></>;
  if (team.status === 'error') return <><Text style={styles.label}>Today’s zone</Text><View style={styles.card}><Text accessibilityLiveRegion="polite" style={styles.checkEmpty}>Practice data couldn’t load. This plan has not been checked against a field reading.</Text><ActionButton label="Try again" onPress={team.retry} style={styles.retry} variant="secondary" /></View></>;
  if (!zone) {
    return (
      <>
        <Text style={styles.label}>Today’s zone</Text>
        <View style={styles.card}><Text style={styles.checkEmpty}>Take a field reading and this plan is checked against its UIL zone.</Text></View>
      </>
    );
  }
  const { ok, rows, fix } = checkPlan(plan, UIL_GUIDANCE[zone]);
  const outdoor = UIL_GUIDANCE[zone].outdoorAllowed;
  const tone = zone === 'black' ? '#8E8E93' : ZONES[zone].color;
  return (
    <>
      <Text style={styles.label}>Today’s zone</Text>
      <View style={styles.card}>
        <View accessibilityLabel={`${ZONES[zone].label}. ${ok ? 'Plan meets UIL rules' : 'Plan doesn’t meet UIL rules'}`} accessible style={[styles.row, styles.rowDivider]}>
          <View style={styles.checkHead}>
            <View style={[styles.checkDot, { backgroundColor: tone }]} />
            <Text style={styles.checkTitle}>{ZONES[zone].label}</Text>
          </View>
          <Text style={[styles.checkStatus, { color: ok ? Palette.safe : Palette.emergency }]}>{ok ? 'Meets UIL' : 'Doesn’t meet UIL'}</Text>
        </View>
        {rows.map((r, index) => (
          <View accessibilityLabel={`${r.label}: plan ${r.plan}, UIL ${r.rule}, ${r.ok ? 'meets' : 'does not meet'}`} accessible key={r.label} style={[styles.row, styles.checkRow, (fix || !outdoor || index < rows.length - 1) && styles.rowDivider]}>
            <Text style={[styles.checkMark, { color: r.ok ? Palette.safe : Palette.emergency }]}>{r.ok ? '✓' : '✕'}</Text>
            <Text style={styles.checkLabel}>{r.label}</Text>
            <View style={styles.checkValues}>
              <Text style={[styles.checkPlan, !r.ok && { color: Palette.emergency }]}>{r.plan}</Text>
              <Text style={styles.checkRule}>{`UIL ${r.rule}`}</Text>
            </View>
          </View>
        ))}
        {fix ? (
          <Pressable accessibilityRole="button" onPress={() => onFix(fix)} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
            <Text style={styles.rowAction}>Fix to meet UIL</Text>
          </Pressable>
        ) : !outdoor ? <Text style={styles.checkEmpty}>Move practice indoors or wait for the WBGT to drop.</Text> : null}
      </View>
    </>
  );
}

/** A settings row: the value sits in a chip, and tapping it opens a wheel right under the row. */
function TimingRow({ format, label, last, onChange, onToggle, open, options, value }: { format: (v: number) => string; label: string; last?: boolean; onChange: (v: number) => void; onToggle: () => void; open: boolean; options: number[]; value: number }) {
  const shown = format(value);
  // Keep an off-step saved value selectable rather than snapping it.
  const choices = options.includes(value) ? options : [...options, value].sort((a, b) => a - b);
  return (
    <View style={!last && styles.rowDivider}>
      <Pressable accessibilityHint={open ? 'Closes the picker' : 'Opens a picker'} accessibilityLabel={`${label}, ${shown}`} accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onToggle} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
        <Text style={styles.rowLabel}>{label}</Text>
        <View style={[styles.chip, open && styles.chipOpen]}>
          <Text style={[styles.chipText, open && styles.chipTextOpen]}>{shown}</Text>
        </View>
      </Pressable>
      {open ? <Wheel format={format} label={label} onChange={onChange} options={choices} value={value} /> : null}
    </View>
  );
}

function Wheel({ format, label, onChange, options, value }: { format: (v: number) => string; label: string; onChange: (v: number) => void; options: number[]; value: number }) {
  if (Platform.OS === 'ios') {
    return (
      <Host colorScheme="dark" style={styles.wheel}>
        <Picker modifiers={[pickerStyle('wheel')]} onSelectionChange={(next: number) => onChange(next)} selection={value}>
          {options.map((option) => <SwiftText key={option} modifiers={[tag(option)]}>{format(option)}</SwiftText>)}
        </Picker>
      </Host>
    );
  }
  // No native wheel off iOS: step through the same values.
  const index = options.indexOf(value);
  return (
    <View style={styles.nudge}>
      <Pressable accessibilityLabel={`Decrease ${label}`} accessibilityRole="button" disabled={index <= 0} onPress={() => onChange(options[index - 1])} style={[styles.nudgeButton, index <= 0 && styles.nudgeOff]}><Text style={styles.nudgeText}>−</Text></Pressable>
      <Text style={styles.chipText}>{format(value)}</Text>
      <Pressable accessibilityLabel={`Increase ${label}`} accessibilityRole="button" disabled={index >= options.length - 1} onPress={() => onChange(options[index + 1])} style={[styles.nudgeButton, index >= options.length - 1 && styles.nudgeOff]}><Text style={styles.nudgeText}>+</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pending: { gap: 16, padding: Spacing.four },
  screen: { backgroundColor: CoachPalette.canvas,  flex: 1 },
  flex: {  flex: 1 },
  pressed: { opacity: 0.86, transform: [{ scale: 0.98 }] },
  bar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingBottom: Spacing.four, paddingHorizontal: Spacing.four },
  barTitle: { color: CoachPalette.text, ...CoachType.card, flex: 1, textAlign: 'center' },
  barEnd: { alignItems: 'flex-end', width: 56 },
  barSave: { color: Palette.coral, ...CoachType.body, fontWeight: '700' },
  group: { backgroundColor: Palette.surface, borderCurve: 'continuous', borderRadius: 22, paddingHorizontal: Spacing.four },
  nameGroup: { marginTop: Spacing.four },
  moreGroup: { marginTop: Spacing.four },
  nameInput: { backgroundColor: 'transparent', borderRadius: 0, borderWidth: 0, color: CoachPalette.text, ...CoachType.body, minHeight: 52, paddingHorizontal: 0 },
  row: { alignItems: 'center', flexDirection: 'row', gap: Spacing.three, justifyContent: 'space-between', minHeight: 52 },
  rowPressed: { opacity: 0.6 },
  rowDivider: { borderBottomColor: CoachPalette.hairline, borderBottomWidth: StyleSheet.hairlineWidth },
  rowLabel: { color: CoachPalette.text, ...CoachType.body, flexShrink: 1 },
  rowAction: { color: Palette.coral, ...CoachType.body },
  rowDanger: { color: Palette.emergency },
  chip: { backgroundColor: CoachPalette.interactive, borderCurve: 'continuous', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  chipOpen: { backgroundColor: CoachPalette.surfaceAlt },
  chipText: { color: CoachPalette.text, ...CoachType.body, fontVariant: ['tabular-nums'] },
  chipTextOpen: { color: Palette.coral },
  wheel: { height: 190 },
  nudge: { alignItems: 'center', flexDirection: 'row', gap: Spacing.four, justifyContent: 'center', paddingBottom: Spacing.three },
  nudgeButton: { alignItems: 'center', backgroundColor: CoachPalette.interactive, borderRadius: 8, height: 36, justifyContent: 'center', width: 52 },
  nudgeOff: { opacity: 0.35 },
  nudgeText: { color: CoachPalette.text, fontSize: 20, fontWeight: '600' },
  timeline: { ...surfaceStyles.card, borderCurve: 'continuous', borderRadius: 22, padding: Spacing.four },
  timelineRange: { color: CoachPalette.text, ...Type.figure, fontSize: 28, lineHeight: 34 },
  timelineMeta: { color: CoachPalette.muted, ...Type.footnote, marginTop: 2 },
  track: { borderRadius: 4, flexDirection: 'row', gap: 2, height: 8, marginTop: Spacing.four, overflow: 'hidden' },
  segment: { borderRadius: 2, height: '100%' },
  legend: { flexDirection: 'row', gap: Spacing.four, marginTop: Spacing.three },
  legendItem: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  legendDot: { borderRadius: 4, height: 8, width: 8 },
  legendText: { color: CoachPalette.muted, ...Type.footnote },
  content: { gap: Spacing.two, paddingHorizontal: Spacing.four },
  label: { color: CoachPalette.textSecondary, ...CoachType.label, marginTop: Spacing.five },
  input: { backgroundColor: CoachPalette.surfaceAlt, borderCurve: 'continuous', borderRadius: CoachRadius.input, color: CoachPalette.text, ...CoachType.body, minHeight: 58, paddingHorizontal: Spacing.five },
  card: { ...surfaceStyles.card, borderCurve: 'continuous', borderRadius: 22, paddingHorizontal: Spacing.four },
  breaks: { color: CoachPalette.muted, ...Type.footnote, marginTop: Spacing.two },
  primary: { marginTop: Spacing.five },
  primaryText: { color: CoachPalette.peachInk, fontSize: 17, fontWeight: '800' },
  secondaryRow: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one, flexWrap: 'wrap' },
  secondary: { flexGrow: 1, flexBasis: 180 },
  secondaryText: { color: CoachPalette.text, ...Type.headline },
  checkEmpty: { color: CoachPalette.muted, ...CoachType.body, paddingVertical: 14 },
  checkHead: { alignItems: 'center', flexDirection: 'row', flexShrink: 1, gap: Spacing.two },
  checkStatus: { ...CoachType.body },
  retry: { marginBottom: Spacing.four },
  checkDot: { borderRadius: 5, height: 10, width: 10 },
  checkTitle: { color: CoachPalette.text, ...CoachType.body, flexShrink: 1, fontWeight: '700' },
  checkRow: { justifyContent: 'flex-start', minHeight: 60 },
  checkValues: { alignItems: 'flex-end' },
  checkMark: { fontSize: 16, fontWeight: '700', textAlign: 'center', width: 18 },
  checkLabel: { color: CoachPalette.text, ...CoachType.body, flex: 1 },
  checkPlan: { color: CoachPalette.text, ...CoachType.body, fontVariant: ['tabular-nums'] },
  checkRule: { color: CoachPalette.muted, ...Type.footnote, opacity: 0.7 },
  fixText: { color: CoachPalette.peach, ...Type.headline },
  delete: { alignItems: 'center', marginTop: Spacing.four, minHeight: 44, justifyContent: 'center' },
  deleteText: { color: Palette.emergency, ...Type.body },
});
