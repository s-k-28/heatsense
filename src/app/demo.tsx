import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ui/action-button';
import { Card } from '@/components/ui/list';
import { Text } from '@/components/ui/text';
import { Palette, Spacing, Type } from '@/constants/theme';
import { checkPlan, type PlanTimings } from '@/lib/plan-check';
import { nextReadingDueAt } from '@/lib/recheck';
import { classifyWbgt, UIL_GUIDANCE, UIL_SOURCE_URL, type Zone } from '@/lib/uil-wbgt';

const UIL_CLASS = 3;
const STARTED_AT = new Date('2026-09-01T16:00:00Z');
const DRILL = { startedAt: STARTED_AT, recheckMinutes: 30 };
const READINGS = [88.4, 90.4, 92.4];
type DrillStep = { plan: PlanTimings; adjusted: boolean };
const INITIAL_STEP: DrillStep = { plan: { workMinutes: 18, restMinutes: 3, lengthMinutes: 90 }, adjusted: false };
const TONE: Record<Zone, string> = {
  green: Palette.safe,
  yellow: Palette.caution,
  orange: Palette.warning,
  red: Palette.emergency,
  black: Palette.ink,
};

// The UTC formatter keeps the simulated field clock identical on every device.
const drillClock = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric', minute: '2-digit', timeZone: 'UTC',
});

function readingTime(index: number) {
  return new Date(STARTED_AT.getTime() + index * DRILL.recheckMinutes * 60_000);
}

function zoneLabel(zone: Zone) {
  return zone.charAt(0).toUpperCase() + zone.slice(1);
}

function planLabel(plan: PlanTimings) {
  return `${plan.lengthMinutes} min practice · ${plan.workMinutes} min work / ${plan.restMinutes} min rest`;
}

export default function DemoScreen() {
  const router = useRouter();
  const [steps, setSteps] = useState([INITIAL_STEP]);
  const index = steps.length - 1;
  const { plan } = steps[index];
  const reading = READINGS[index];
  const zone = classifyWbgt(reading, UIL_CLASS);
  if (!zone) throw new Error('The drill reading must be within the WBGT classifier range.');

  const measuredAt = readingTime(index);
  const guidance = UIL_GUIDANCE[zone];
  const result = checkPlan(plan, guidance);
  const nextTime = drillClock.format(nextReadingDueAt(DRILL, { measuredAt }));
  const finalReading = index === READINGS.length - 1;
  const timingStatus = !guidance.outdoorAllowed ? 'Outdoor practice stops' :
    result.ok ? 'Timing checks pass' : 'Timing changes needed';
  const fix = result.fix;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <View style={styles.brandRow}>
            <Text style={styles.brand}>HeatSense</Text>
            <ActionButton label="Exit drill" variant="text" onPress={() => router.replace('/welcome')} />
          </View>
          <View style={styles.intro}>
            <Text accessibilityRole="header" style={styles.title}>Practice heat drill</Text>
            <Text style={styles.body}>See how rising heat changes a practice plan. All readings and times are simulated. No account or athlete data is used.</Text>
          </View>

          <Card style={styles.card}>
            <View style={styles.metaRow}>
              <Text style={styles.label}>UIL Class {UIL_CLASS} · Reading {index + 1} of {READINGS.length}</Text>
              <Text style={styles.label}>{drillClock.format(measuredAt)}</Text>
            </View>
            <View accessibilityLiveRegion="polite" style={styles.readingRow}>
              <Text style={styles.reading}>{reading.toFixed(1)}°F <Text style={styles.unit}>WBGT</Text></Text>
              <Text style={[styles.zone, { color: TONE[zone] }]}>{zoneLabel(zone)} zone</Text>
            </View>
            <Text style={styles.body}>{guidance.summary}</Text>
          </Card>

          <Card style={styles.card}>
            <Text accessibilityRole="header" style={styles.heading}>{timingStatus}</Text>
            {guidance.outdoorAllowed ? <Text style={styles.body}>{planLabel(plan)}</Text> : null}
            {result.rows.map(({ label, plan: proposed, rule, ok }) => (
              <View key={label} style={styles.rule}>
                <View style={styles.ruleCopy}>
                  <Text style={styles.ruleLabel}>{label}</Text>
                  <Text style={styles.body}>{proposed} / {rule}</Text>
                </View>
                <Text style={[styles.label, { color: ok ? Palette.safe : Palette.warning }]}>
                  {ok ? 'Meets limit' : guidance.outdoorAllowed ? 'Needs change' : 'Stop'}
                </Text>
              </View>
            ))}
            {fix ? <ActionButton label="Apply timing changes" onPress={() => setSteps([
              ...steps.slice(0, index), { plan: { ...plan, ...fix }, adjusted: true },
            ])} /> : null}
            <Text style={styles.small}>The timing check covers duration and breaks. Follow your school’s full heat and emergency plans in real practice.</Text>
          </Card>

          <Card style={styles.card}>
            <Text accessibilityRole="header" style={styles.heading}>Reading history</Text>
            {steps.map((step, position) => {
              const value = READINGS[position];
              const loggedZone = classifyWbgt(value, UIL_CLASS);
              if (!loggedZone) return null;
              return (
                <View key={position} style={styles.logRow}>
                  <View style={styles.metaRow}>
                    <Text style={styles.label}>{drillClock.format(readingTime(position))}</Text>
                    <Text style={styles.ruleLabel}>{value.toFixed(1)}°F WBGT</Text>
                    <Text style={[styles.label, { color: TONE[loggedZone] }]}>{zoneLabel(loggedZone)}</Text>
                  </View>
                  {step.adjusted ? <Text style={styles.small}>Timing revised to {planLabel(step.plan)}</Text> : null}
                  {loggedZone === 'black' ? <Text style={styles.small}>Outdoor practice stopped</Text> : null}
                </View>
              );
            })}
            {finalReading ? (
              <ActionButton label="Restart drill" variant="secondary" onPress={() => setSteps([INITIAL_STEP])} />
            ) : (
              <ActionButton label={`Advance to ${nextTime} recheck`} variant="secondary" onPress={() => setSteps([
                ...steps, { plan, adjusted: false },
              ])} />
            )}
          </Card>
          <Link href={UIL_SOURCE_URL} style={styles.source}>View the UIL activity chart</Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: Palette.canvas, flex: 1 },
  scroll: { padding: Spacing.four, paddingBottom: Spacing.eight },
  content: { alignSelf: 'center', width: '100%', maxWidth: 580, gap: Spacing.four },
  brandRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  brand: { ...Type.headline },
  intro: { gap: Spacing.two, paddingBottom: Spacing.two },
  title: { ...Type.largeTitle },
  heading: { ...Type.title3 },
  body: { ...Type.subhead, color: Palette.inkMuted },
  small: { ...Type.caption, color: Palette.inkMuted },
  label: { ...Type.labelSmall, color: Palette.inkMuted },
  card: { padding: Spacing.five, gap: Spacing.three },
  metaRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Spacing.two },
  readingRow: { alignItems: 'baseline', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Spacing.one },
  reading: { ...Type.display },
  unit: { ...Type.headline, color: Palette.inkMuted },
  zone: { ...Type.headline },
  rule: { alignItems: 'center', flexDirection: 'row', gap: Spacing.two, borderTopColor: Palette.border, borderTopWidth: 1, paddingTop: Spacing.two },
  ruleCopy: { flex: 1, gap: Spacing.one },
  ruleLabel: { ...Type.label },
  logRow: { borderTopColor: Palette.border, borderTopWidth: 1, gap: Spacing.one, paddingTop: Spacing.two },
  source: { ...Type.label, color: Palette.coral, alignSelf: 'flex-start', paddingVertical: Spacing.three },
});
