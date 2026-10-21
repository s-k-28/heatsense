import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { HeatIcon } from '@/components/heat-icon';
import { Group, Row, TextLink } from '@/components/ui/list';
import { Palette, Radius, Spacing, Type } from '@/constants/theme';
import { TODAY, ZONES } from '@/lib/practice';
import { endPractice, startPractice, usePreferences, useTemperature } from '@/state/preferences';
import { EQUIPMENT_LABEL, buildSchedule, usePracticePlans } from '@/state/practice-plans';

const check = { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' } as const;

// What the check looks at, in order. Each step ticks off before the next starts.
const STEPS = ['Field sensor at Memorial Stadium', 'Humidity, sun and wind', 'Your school’s heat policy'] as const;
const STEP_MS = 550;

function clock(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/**
 * "Check field conditions": reads the field, shows the plan for that reading, and starts practice.
 * Once practice is running it shows the time left and the next water break, the same clocks the
 * Dynamic Island carries. There's no sensor yet, so the check uses the sample reading and says so.
 */
export function FieldCheckSheet({ onClose, visible }: { onClose: () => void; visible: boolean }) {
  const { practiceStartedAt } = usePreferences();
  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible={visible}>
      <View style={styles.sheet}>
        <View style={styles.bar}>
          <Text style={styles.title}>{practiceStartedAt ? 'Practice' : 'Field conditions'}</Text>
          <TextLink label="Done" onPress={onClose} />
        </View>
        {/* The modal mounts its content each time it opens, so the check runs fresh every time. */}
        <ScrollView contentContainerStyle={styles.content}>{practiceStartedAt ? <PracticeClock startedAt={practiceStartedAt} /> : <FieldCheck />}</ScrollView>
      </View>
    </Modal>
  );
}

/** The check ticking through its steps, then the reading, the plan for it, and Start practice. */
function FieldCheck() {
  const reduced = useReducedMotion();
  const temp = useTemperature();
  const { active: plan } = usePracticePlans();
  const [done, setDone] = useState(0);
  const zone = ZONES[TODAY.zone];

  useEffect(() => {
    const timers = STEPS.map((_, index) => setTimeout(() => setDone(index + 1), STEP_MS * (index + 1)));
    return () => timers.forEach(clearTimeout);
  }, []);

  const rise = (delay: number) => (reduced ? undefined : FadeInDown.delay(delay).duration(380));
  return (
    <>
      <View style={styles.steps}>
        {STEPS.map((step, index) => {
          const state = index < done ? 'done' : index === done ? 'active' : 'waiting';
          return (
            <View accessibilityLabel={`${step}, ${state === 'done' ? 'checked' : state === 'active' ? 'checking' : 'waiting'}`} accessible key={step} style={styles.step}>
              <View style={styles.stepMark}>
                {state === 'done' ? <HeatIcon name={check} size={20} tintColor={Palette.safe} /> : state === 'active' ? <ActivityIndicator color={Palette.inkMuted} size="small" /> : <View style={styles.stepIdle} />}
              </View>
              <Text style={[styles.stepText, state === 'waiting' && styles.stepWaiting]}>{step}</Text>
            </View>
          );
        })}
      </View>

      {done >= STEPS.length ? (
        <>
          <Animated.View entering={rise(0)} style={styles.reading}>
            <Text style={styles.eyebrow}>Sample reading · just now</Text>
            <View style={styles.readingRow}>
              <Text style={styles.readingValue}>{temp.value(TODAY.wbgtF)}</Text>
              <Text style={styles.readingUnit}>{temp.unit} WBGT</Text>
            </View>
            <View style={[styles.zoneChip, { borderColor: zone.color }]}>
              <View style={[styles.liveDot, { backgroundColor: zone.color }]} />
              <Text style={[styles.zoneChipText, { color: zone.text }]}>{zone.label}</Text>
            </View>
          </Animated.View>
          <Animated.View entering={rise(120)}>
            <Text style={styles.planTitle}>Today’s plan · {plan.name}</Text>
            <Group>
              <Row title="Work / rest" value={`${plan.workMinutes} / ${plan.restMinutes} min`} />
              <Row title="Breaks" value={String(buildSchedule(plan).filter((block) => block.kind === 'rest').length)} />
              <Row title="Water" value={`Every ${plan.waterEveryMinutes} min`} />
              <Row title="Equipment" value={EQUIPMENT_LABEL[plan.equipment]} />
              <Row title="Practice length" value={`${plan.lengthMinutes} min`} />
            </Group>
          </Animated.View>
          <Animated.View entering={rise(240)}>
            <Pressable accessibilityHint="Starts the practice clock and shows it on the Dynamic Island" accessibilityRole="button" onPress={startPractice} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
              <Text style={styles.primaryText}>Start practice</Text>
            </Pressable>
            <Text style={styles.note}>HeatSense isn’t connected to a field sensor yet, so this check uses a sample reading.</Text>
          </Animated.View>
        </>
      ) : null}
    </>
  );
}

/** Time left, a bar for how far in, the next water break and the reading. Ticks every second. */
function PracticeClock({ startedAt }: { startedAt: number }) {
  const reduced = useReducedMotion();
  const temp = useTemperature();
  const { active: plan } = usePracticePlans();
  const [now, setNow] = useState(() => Date.now());
  const zone = ZONES[TODAY.zone];

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  const length = plan.lengthMinutes * 60_000;
  const elapsed = Math.min(length, Math.max(0, now - startedAt));
  const breakMs = plan.waterEveryMinutes * 60_000;
  const nextBreak = startedAt + Math.max(1, Math.ceil(elapsed / breakMs)) * breakMs;
  return (
    <Animated.View entering={reduced ? undefined : FadeIn.duration(300)}>
      <View style={styles.eyebrowRow}>
        <View style={[styles.liveDot, { backgroundColor: zone.color }]} />
        <Text style={styles.eyebrow}>Practice in progress · {zone.label}</Text>
      </View>
      <Text accessibilityLabel={`${clock(length - elapsed)} left in practice`} style={styles.countdown}>{clock(length - elapsed)}</Text>
      <Text style={styles.countdownLabel}>Left in practice</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { backgroundColor: zone.color, width: `${(elapsed / length) * 100}%` }]} />
      </View>
      <View style={styles.split}>
        <View>
          <Text style={styles.splitValue}>{clock(nextBreak - now)}</Text>
          <Text style={styles.splitLabel}>Next water break</Text>
        </View>
        <View style={styles.splitEnd}>
          <Text style={styles.splitValue}>{temp.value(TODAY.wbgtF)}{temp.unit}</Text>
          <Text style={styles.splitLabel}>WBGT</Text>
        </View>
      </View>
      <Text style={styles.hint}>Go to the Home Screen or lock the phone to follow the clock on the Dynamic Island.</Text>
      <Pressable accessibilityRole="button" onPress={endPractice} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
        <Text style={styles.secondaryText}>End practice</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.6 },
  sheet: { backgroundColor: '#101214', flex: 1 },
  bar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingBottom: Spacing.three, paddingHorizontal: Spacing.five, paddingTop: Spacing.five },
  title: { color: Palette.ink, ...Type.title2, fontWeight: '700' },
  content: { gap: Spacing.five, paddingBottom: Spacing.eight, paddingHorizontal: Spacing.five, paddingTop: Spacing.two },
  steps: { backgroundColor: Palette.card, borderColor: Palette.cardEdge, borderCurve: 'continuous', borderRadius: Radius.medium, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two },
  step: { alignItems: 'center', flexDirection: 'row', gap: Spacing.three, minHeight: 44 },
  stepMark: { alignItems: 'center', height: 22, justifyContent: 'center', width: 22 },
  stepIdle: { borderColor: Palette.inkFaint, borderRadius: 9, borderWidth: 1.5, height: 18, width: 18 },
  stepText: { color: Palette.ink, ...Type.callout },
  stepWaiting: { color: Palette.inkFaint },
  reading: { gap: Spacing.one },
  eyebrowRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  eyebrow: { color: Palette.inkMuted, ...Type.label, fontSize: 13 },
  readingRow: { alignItems: 'baseline', flexDirection: 'row', gap: 6 },
  readingValue: { color: Palette.ink, ...Type.figure, fontSize: 84, lineHeight: 86 },
  readingUnit: { color: Palette.inkMuted, ...Type.label, fontSize: 18 },
  zoneChip: { alignItems: 'center', alignSelf: 'flex-start', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingVertical: 5 },
  zoneChipText: { ...Type.label, fontSize: 14 },
  liveDot: { borderRadius: 4, height: 8, width: 8 },
  planTitle: { color: Palette.ink, ...Type.headline, marginBottom: Spacing.two },
  primary: { alignItems: 'center', backgroundColor: Palette.coral, borderCurve: 'continuous', borderRadius: 14, justifyContent: 'center', minHeight: 54 },
  primaryText: { color: '#1A0E07', ...Type.label, fontSize: 17 },
  note: { color: Palette.inkMuted, ...Type.footnote, marginTop: Spacing.three, textAlign: 'center' },
  countdown: { color: Palette.ink, ...Type.figure, fontSize: 92, lineHeight: 96, marginTop: Spacing.three },
  countdownLabel: { color: Palette.inkMuted, ...Type.label, fontSize: 14 },
  track: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, height: 6, marginTop: Spacing.five, overflow: 'hidden' },
  fill: { borderRadius: 3, height: 6 },
  split: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.five },
  splitEnd: { alignItems: 'flex-end' },
  splitValue: { color: Palette.ink, ...Type.figure, fontSize: 34, lineHeight: 38 },
  splitLabel: { color: Palette.inkMuted, ...Type.labelSmall },
  hint: { color: Palette.inkMuted, ...Type.footnote, marginTop: Spacing.six },
  secondary: { alignItems: 'center', backgroundColor: Palette.fill, borderCurve: 'continuous', borderRadius: 14, justifyContent: 'center', marginTop: Spacing.four, minHeight: 50 },
  secondaryText: { color: Palette.ink, ...Type.headline },
});
