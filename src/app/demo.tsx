import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OutdoorStartPanel } from '@/components/practice/outdoor-start-panel';
import { ActionButton } from '@/components/ui/action-button';
import { Card } from '@/components/ui/list';
import { Text } from '@/components/ui/text';
import { Face, Palette, Spacing, Type } from '@/constants/theme';
import { checkOutdoorStart } from '@/lib/outdoor-start';
import { checkPlan, type PlanTimings } from '@/lib/plan-check';
import { nextReadingDueAt } from '@/lib/recheck';
import { classifyWbgt, UIL_GUIDANCE, UIL_SOURCE_URL, type Zone } from '@/lib/uil-wbgt';

const UIL_CLASS = 3;
const PHOTO = require('@/assets/images/home/field-hero.webp');
const STARTED_AT = new Date('2026-09-01T16:00:00Z');
const OLD_READING_AT = new Date(STARTED_AT.getTime() - 22 * 60_000);
const DRILL = { startedAt: STARTED_AT, recheckMinutes: 30 };
const READINGS = [88.4, 90.4, 92.4];
type DrillStep = { plan: PlanTimings; adjusted: boolean };
const INITIAL_STEP: DrillStep = { plan: { workMinutes: 18, restMinutes: 3, lengthMinutes: 90 }, adjusted: false };
const TONE: Record<Zone, string> = {
  green: Palette.safe,
  yellow: Palette.caution,
  orange: Palette.warning,
  red: '#FF8078',
  black: Palette.ink,
};
const PHASES = ['Field check', 'During practice', 'Outdoor stop'];

// UTC keeps the simulated field clock identical on every device.
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
  const wide = useWindowDimensions().width >= 820;
  const [measurement, setMeasurement] = useState(OLD_READING_AT);
  const [started, setStarted] = useState(false);
  const [steps, setSteps] = useState([INITIAL_STEP]);
  const index = steps.length - 1;
  const { plan } = steps[index];
  const reading = READINGS[index];
  const zone = classifyWbgt(reading, UIL_CLASS);
  if (!zone) throw new Error('The drill reading must be within the WBGT classifier range.');

  const measuredAt = started ? readingTime(index) : measurement;
  const startCheck = checkOutdoorStart({ measuredAt, zone }, STARTED_AT.getTime());
  const guidance = UIL_GUIDANCE[zone];
  const result = checkPlan(plan, guidance);
  const nextTime = drillClock.format(nextReadingDueAt(DRILL, { measuredAt }));
  const finalReading = index === READINGS.length - 1;
  const phase = !started ? 0 : finalReading ? 2 : 1;
  const timingStatus = !guidance.outdoorAllowed ? 'Outdoor practice stops' :
    result.ok ? 'Timing checks pass' : 'Timing changes needed';
  const fix = result.fix;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={[styles.scroll, wide && styles.wideScroll]}>
        <View style={styles.content}>
          <View style={styles.brandRow}>
            <Text style={styles.brand}>HeatSense</Text>
            <ActionButton label="Exit drill" variant="text" onPress={() => router.replace('/welcome')} />
          </View>

          <View style={[styles.hero, wide && styles.wideHero]}>
            <Image accessible={false} contentFit="cover" contentPosition={{ top: '40%', left: '50%' }} source={PHOTO} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={['rgba(8,11,12,0.98)', 'rgba(8,11,12,0.86)', 'rgba(8,11,12,0.30)']}
              end={{ x: wide ? 1 : 0.8, y: wide ? 0.4 : 0 }} pointerEvents="none" start={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={styles.intro}>
              <Text style={styles.eyebrow}>Field drill · Simulated</Text>
              <Text accessibilityRole="header" style={[styles.title, wide && styles.wideTitle]}>Practice heat drill</Text>
              <Text style={styles.heroBody}>Make the sideline call as field heat rises. Try a fresh reading, adjust the plan, then stop when the field reaches Black.</Text>
            </View>
          </View>

          <View accessibilityLabel="Drill progress" style={styles.phases}>
            {PHASES.map((label, position) => (
              <View key={label} style={[styles.phase, position === phase && styles.activePhase]}>
                <Text style={[styles.phaseLabel, position === phase && styles.activePhaseLabel]}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.workspace, wide && styles.columns]}>
            <View style={[styles.column, wide && styles.sideColumn]}>
              <Card style={styles.card}>
                <View style={styles.metaRow}>
                  <Text style={styles.label}>Field WBGT · UIL Class {UIL_CLASS}</Text>
                  <Text style={styles.label}>{drillClock.format(measuredAt)}</Text>
                </View>
                <View accessibilityLiveRegion="polite" style={styles.readingRow}>
                  <Text style={styles.reading}>{reading.toFixed(1)}<Text style={styles.unit}>°F</Text></Text>
                  <View style={styles.zonePill}>
                    <View style={[styles.dot, { backgroundColor: TONE[zone] }]} />
                    <Text style={[styles.zone, { color: TONE[zone] }]}>{zoneLabel(zone)} zone</Text>
                  </View>
                </View>
                <Text style={styles.body}>{guidance.summary}</Text>
                {started && !finalReading ? <Text style={styles.ruleLabel}>Next recheck {nextTime}</Text> : null}
              </Card>

              {!started ? (
                <OutdoorStartPanel measurement={`Scheduled start ${drillClock.format(STARTED_AT)} · Measured ${drillClock.format(measuredAt)}`} status={startCheck}>
                  {startCheck === 'stale' ? (
                    <ActionButton label="Take a fresh sample" onPress={() => setMeasurement(STARTED_AT)} />
                  ) : (
                    <ActionButton disabled={startCheck !== 'ready'} label="Record simulated start" onPress={() => setStarted(true)} />
                  )}
                </OutdoorStartPanel>
              ) : (
                <Card style={styles.card}>
                  <Text accessibilityRole="header" style={styles.heading}>Field log</Text>
                  <Text style={styles.small}>Outdoor start recorded at {drillClock.format(STARTED_AT)} using the fresh field reading.</Text>
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
                        {loggedZone === 'black' ? <Text style={styles.small}>Outdoor practice stopped in the drill.</Text> : null}
                      </View>
                    );
                  })}
                </Card>
              )}
            </View>

            <View style={[styles.column, wide && styles.mainColumn]}>
              {!started ? (
                <Card style={styles.card}>
                  <Text accessibilityRole="header" style={styles.heading}>Today’s scenario</Text>
                  <Text style={styles.body}>A Class 3 team plans to start at {drillClock.format(STARTED_AT)}. When the coach checks the log, the last reading is 22 minutes old.</Text>
                  <Text style={styles.body}>Check the reading, then follow the team through two 30-minute rechecks.</Text>
                </Card>
              ) : (
                <Card style={[styles.card, finalReading && styles.stopCard]}>
                  <Text accessibilityLiveRegion="polite" accessibilityRole="header" style={styles.heading}>{timingStatus}</Text>
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
                  {finalReading ? (
                    <ActionButton label="Restart drill" variant="secondary" onPress={() => {
                      setSteps([INITIAL_STEP]);
                      setMeasurement(OLD_READING_AT);
                      setStarted(false);
                    }} />
                  ) : (
                    <ActionButton disabled={Boolean(fix)} label={`Advance to ${nextTime} recheck`} variant="secondary" onPress={() => setSteps([
                      ...steps, { plan, adjusted: false },
                    ])} />
                  )}
                </Card>
              )}
            </View>
          </View>
          <View style={styles.footer}>
            <Link href={UIL_SOURCE_URL} style={styles.source}>View the UIL activity chart</Link>
            <Text style={styles.small}>Simulated readings. No account or athlete data required.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: Palette.canvas, flex: 1 },
  scroll: { padding: Spacing.four, paddingBottom: Spacing.eight },
  wideScroll: { paddingHorizontal: Spacing.eight },
  content: { alignSelf: 'center', width: '100%', maxWidth: 1080, gap: Spacing.three },
  brandRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  brand: { ...Type.headline },
  hero: { backgroundColor: Palette.surface, borderColor: Palette.border, borderWidth: 1, borderRadius: 20, justifyContent: 'flex-end', minHeight: 182, overflow: 'hidden', padding: Spacing.four },
  wideHero: { minHeight: 218, paddingHorizontal: Spacing.eight, paddingVertical: Spacing.five },
  intro: { gap: Spacing.one, maxWidth: 600 },
  eyebrow: { ...Type.labelSmall, color: Palette.coral },
  title: { ...Type.largeTitle, fontSize: 33, lineHeight: 38 },
  wideTitle: { fontSize: 49, lineHeight: 55 },
  heroBody: { ...Type.subhead, color: Palette.ink, maxWidth: 470 },
  phases: { flexDirection: 'row', gap: Spacing.two },
  phase: { flex: 1, borderTopColor: Palette.border, borderTopWidth: 2, paddingTop: Spacing.two },
  activePhase: { borderTopColor: Palette.coral },
  phaseLabel: { ...Type.labelSmall, color: Palette.inkFaint },
  activePhaseLabel: { color: Palette.coral },
  workspace: { gap: Spacing.three },
  columns: { alignItems: 'flex-start', flexDirection: 'row', gap: Spacing.four },
  column: { alignSelf: 'stretch', gap: Spacing.three, minWidth: 0 },
  sideColumn: { flex: 0.91 },
  mainColumn: { flex: 1 },
  heading: { ...Type.title3 },
  body: { ...Type.subhead, color: Palette.inkMuted },
  small: { ...Type.caption, color: Palette.inkMuted },
  label: { ...Type.labelSmall, color: Palette.inkMuted },
  card: { padding: Spacing.four, gap: Spacing.three },
  stopCard: { borderColor: '#AD4B44' },
  metaRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Spacing.two },
  readingRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  reading: { fontFamily: Face.figure, fontWeight: '800', fontSize: 55, lineHeight: 60, letterSpacing: -2, fontVariant: ['tabular-nums'] },
  unit: { ...Type.title2, color: Palette.inkMuted, letterSpacing: 0 },
  zonePill: { alignItems: 'center', backgroundColor: Palette.surfaceMuted, borderRadius: 9, flexDirection: 'row', gap: 6, paddingHorizontal: 9, paddingVertical: 5 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  zone: { ...Type.labelSmall },
  rule: { alignItems: 'center', flexDirection: 'row', gap: Spacing.two, borderTopColor: Palette.border, borderTopWidth: 1, paddingTop: Spacing.two },
  ruleCopy: { flex: 1, gap: Spacing.one },
  ruleLabel: { ...Type.label },
  logRow: { borderTopColor: Palette.border, borderTopWidth: 1, gap: Spacing.one, paddingTop: Spacing.two },
  footer: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Spacing.two },
  source: { ...Type.label, color: Palette.coral, paddingVertical: Spacing.three },
});
