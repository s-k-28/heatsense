import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Palette } from '@/constants/theme';
import { ZONES } from '@/lib/practice';
import { UIL_GUIDANCE } from '@/lib/uil-wbgt';
import { recheckStatus } from '@/services/practice-sessions';
import { usePracticeDay } from '@/state/practice-day';
import { buildSchedule, clockTime, usePracticePlans } from '@/state/practice-plans';
import { useTemperature } from '@/state/preferences';
import { useCoachData, useNow } from '@/state/team-session';

// Today's practice as four steps: a field reading, water and shade set up, the water breaks as they
// come due, and the WBGT recheck. Steps the app can see (readings, the plan's clock, the session's
// recheck timer) update themselves; setup is the coach's tap, saved for today on this device.

type State = 'done' | 'next' | 'late' | 'todo';
type Step = { detail: string; id: string; onPress?: () => void; state: State; title: string };

const time = (date: Date) => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export function PracticeChecklist() {
  const data = useCoachData();
  const now = useNow();
  const temp = useTemperature();
  const { active: plan } = usePracticePlans();
  const { day, update } = usePracticeDay('coach-checklist');

  const latest = data?.readings.at(-1) ?? null;
  const session = data?.session ?? null;
  const guidance = latest ? UIL_GUIDANCE[latest.zone] : null;
  const clock = new Date(now);
  const nowMinutes = clock.getHours() * 60 + clock.getMinutes();
  const breaks = buildSchedule(plan).filter((block) => block.kind === 'rest');
  const breaksDone = breaks.filter((block) => block.start + block.minutes <= nowMinutes).length;
  const nextBreak = breaks.find((block) => block.start + block.minutes > nowMinutes) ?? null;
  const onBreak = nextBreak !== null && nextBreak.start <= nowMinutes;
  const recheck = session ? recheckStatus(session, latest, now) : null;
  const setUp = day.checklist.includes('setup');
  const toggleSetUp = () => update((d) => ({ ...d, checklist: setUp ? d.checklist.filter((id) => id !== 'setup') : [...d.checklist, 'setup'] }));

  const steps: Step[] = [
    {
      id: 'reading',
      title: 'Take a field reading',
      detail: latest ? `${temp.value(latest.wbgtF)}${temp.unit} · ${ZONES[latest.zone].label} at ${time(latest.measuredAt)}` : 'Before athletes take the field',
      state: latest ? 'done' : 'next',
    },
    {
      id: 'setup',
      title: guidance?.coolingZoneRequired ? 'Set up water and the cooling zone' : 'Set up water and shade',
      detail: setUp ? 'Ready. Tap to undo.' : guidance?.coolingZoneRequired ? 'UIL requires a cooling zone today. Tap when it’s ready.' : 'Water within reach of every drill. Tap when it’s ready.',
      onPress: toggleSetUp,
      state: setUp ? 'done' : latest ? 'next' : 'todo',
    },
    {
      id: 'breaks',
      title: 'Water breaks',
      detail: !breaks.length
        ? 'Today’s plan has no breaks'
        : nextBreak === null
          ? `All ${breaks.length} done`
          : onBreak
            ? `${nextBreak.title} now, until ${clockTime(nextBreak.start + nextBreak.minutes, true)}`
            : `${breaksDone} of ${breaks.length} done · next at ${clockTime(nextBreak.start, true)}`,
      state: breaks.length && nextBreak === null ? 'done' : onBreak ? 'late' : 'next',
    },
    {
      id: 'recheck',
      title: 'Recheck WBGT',
      detail: recheck
        ? recheck.overdue ? 'Overdue. Take a reading now.' : `Next reading due ${time(new Date(recheck.dueAt))}`
        : 'The timer starts with practice',
      state: recheck?.overdue ? 'late' : recheck ? 'next' : 'todo',
    },
  ];
  const done = steps.filter((step) => step.state === 'done').length;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.count}>{done} of {steps.length} done</Text>
        <Text style={styles.plan} numberOfLines={1}>{plan.name}</Text>
      </View>
      <View style={styles.progress}>
        {steps.map((step) => <View key={step.id} style={[styles.segment, step.state === 'done' && styles.segmentDone]} />)}
      </View>
      {steps.map((step, index) => (
        <Row index={index} key={step.id} last={index === steps.length - 1} step={step} />
      ))}
    </View>
  );
}

const TONE: Record<State, string> = { done: Palette.safe, next: Palette.coral, late: Palette.emergency, todo: Palette.inkFaint };

function Row({ index, last, step }: { index: number; last: boolean; step: Step }) {
  const tone = TONE[step.state];
  const body = (
    <View style={styles.row}>
      <View style={styles.rail}>
        <View style={[styles.mark, { borderColor: tone }, step.state === 'done' && { backgroundColor: tone }]}>
          <Text style={[styles.markText, { color: step.state === 'done' ? '#0B1A10' : tone }]}>{step.state === 'done' ? '✓' : index + 1}</Text>
        </View>
        {last ? null : <View style={[styles.line, step.state === 'done' && { backgroundColor: Palette.safe }]} />}
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, step.state === 'done' && styles.titleDone]}>{step.title}</Text>
        <Text style={[styles.detail, (step.state === 'next' || step.state === 'late') && { color: tone }]}>{step.detail}</Text>
      </View>
    </View>
  );
  return step.onPress ? (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: step.state === 'done' }} onPress={step.onPress} style={({ pressed }) => pressed && styles.pressed}>
      {body}
    </Pressable>
  ) : (
    <View accessible accessibilityLabel={`${step.title}. ${step.detail}`}>{body}</View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Palette.card, borderColor: Palette.cardEdge, borderRadius: 20, borderWidth: 1, padding: 18 },
  head: { alignItems: 'baseline', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  count: { color: Palette.ink, fontSize: 20, fontVariant: ['tabular-nums'], fontWeight: '700' },
  plan: { color: Palette.inkMuted, flexShrink: 1, fontSize: 14 },
  progress: { flexDirection: 'row', gap: 4, marginBottom: 18, marginTop: 12 },
  segment: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, flex: 1, height: 5 },
  segmentDone: { backgroundColor: Palette.safe },
  row: { flexDirection: 'row', gap: 14 },
  rail: { alignItems: 'center', width: 28 },
  mark: { alignItems: 'center', borderRadius: 14, borderWidth: 2, height: 28, justifyContent: 'center', width: 28 },
  markText: { fontSize: 13, fontWeight: '800' },
  line: { backgroundColor: 'rgba(255,255,255,0.12)', flex: 1, marginVertical: 4, minHeight: 18, width: 2 },
  copy: { flex: 1, paddingBottom: 18, paddingTop: 3 },
  title: { color: Palette.ink, fontSize: 16, fontWeight: '600' },
  titleDone: { color: Palette.inkMuted },
  detail: { color: Palette.inkMuted, fontSize: 14, lineHeight: 19, marginTop: 2 },
  pressed: { opacity: 0.7 },
});
