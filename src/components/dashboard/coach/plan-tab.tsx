import { ActionButton } from '@/components/ui/action-button';
import { useAthleteStyles } from '@/components/ui/role-appearance';
import { surfaceStyles } from '@/components/ui/surface';
import { Text } from '@/components/ui/text';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { Facts, ListRow, Rows, SampleTag } from '@/components/ui/data-display';
import { CoachPalette, CoachRadius, CoachType } from '@/constants/coach-theme';
import { Face, Palette } from '@/constants/theme';
import { enter } from '@/lib/motion';
import { checkPlan } from '@/lib/plan-check';
import { ZONES } from '@/lib/practice';
import { UIL_GUIDANCE, UIL_SOURCE_URL, UIL_VERSION } from '@/lib/uil-wbgt';
import type { FieldReading } from '@/services/practice-sessions';
import { clockTime, usePracticePlans } from '@/state/practice-plans';
import { useCoachData } from '@/state/team-session';

const METRIC_PEACH = '#FFAD83';

// Practice planning and the shared, class-specific UIL guidance presentation.

export function PlanTab() {
  const styles = coachStyles;
  const [showRules, setShowRules] = useState(false);
  const data = useCoachData();
  const { active, plans } = usePracticePlans();
  const reduced = useReducedMotion();
  const latest = data?.readings.at(-1) ?? null;
  const session = data?.session ?? null;
  const uilClass = session?.uilClass ?? 3;
  return (
    <>
      {data?.sample ? <SampleTag /> : null}
      <Animated.View entering={enter(0, reduced)} style={styles.rulesHero}>
        <Text style={styles.eyebrow}>TODAY’S RULES</Text>
        {latest ? (
          <>
            <View style={styles.zoneHeading}><View style={[styles.zoneMark, { backgroundColor: latest.zone === 'black' ? '#8E8E93' : ZONES[latest.zone].color }]} /><Text style={styles.rulesTitle}>{ZONES[latest.zone].label}</Text></View>
            <Text style={styles.rulesBody}>{UIL_GUIDANCE[latest.zone].summary}</Text>
            <Text style={styles.rulesMeta}>UIL Class {uilClass} · measured {latest.measuredAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
          </>
        ) : (
          <>
            <Text style={styles.rulesTitle}>Ready when you are.</Text>
            <Text style={styles.rulesBody}>Take a field reading to see today’s heat guidance.</Text>
          </>
        )}
      </Animated.View>

      <ActionButton label={showRules ? "Hide UIL details" : "UIL details"} onPress={() => setShowRules(!showRules)} variant="text" />
      {showRules ? <CoachZoneRules hideSummary latest={latest} uilClass={uilClass} /> : null}

      <View style={styles.planHead}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Practice plans</Text>
        <ActionButton label="New plan" onPress={() => router.push('/plan-editor')} />
      </View>
      <View style={styles.planList}>
        {plans.length === 0 ? <View style={styles.planEmpty}><Text style={styles.planName}>Build your first practice</Text><Text style={styles.rulesBody}>Set work, recovery, water, and check-in timing.</Text></View> : [...plans].sort((a, b) => Number(b.id === active.id) - Number(a.id === active.id)).map((plan, index) => {
          // A plan that breaks today's zone rules says so here, before anyone opens it.
          const fails = latest ? !checkPlan(plan, UIL_GUIDANCE[latest.zone]).ok : false;
          const when = plan.id === active.id ? 'Today' : `${clockTime(plan.startMinutes, true)} · ${plan.lengthMinutes} min`;
          return (
            <Animated.View entering={enter(index + 2, reduced)} key={plan.id}>
              <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/plan-editor', params: { id: plan.id } })} style={({ pressed }) => [styles.planCard, pressed && styles.pressed]}>
                <View style={styles.planCardTop}><Text style={styles.planName}>{plan.name}</Text><Text style={[styles.planWhen, fails ? { color: Palette.emergency } : plan.id === active.id ? { color: CoachPalette.peach } : null]}>{fails ? `${plan.id === active.id ? 'Today · ' : ''}needs changes` : when}</Text></View>
                <View style={styles.timeline}><View style={[styles.timelineWork, { flex: plan.workMinutes }]} /><View style={[styles.timelineRest, { flex: plan.restMinutes }]} /><View style={[styles.timelineWork, { flex: plan.workMinutes }]} /></View>
                <Text style={styles.timelineLabel}>{plan.workMinutes} min work · {plan.restMinutes} min recovery · water every {plan.waterEveryMinutes} min</Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </>
  );
}

/** What UIL requires for the latest reading's zone, one rule per row, with the source. */
function CoachZoneRules({ latest, uilClass, hideSummary = false }: { latest: FieldReading | null; uilClass: 2 | 3; hideSummary?: boolean }) {
  const styles = coachStyles;
  const guidance = latest ? UIL_GUIDANCE[latest.zone] : null;
  return (
    <>
      {guidance ? (
        <>
          {hideSummary ? <View style={styles.gap12} /> : <Text style={styles.summary}>{guidance.summary}</Text>}
          <View style={styles.rulesGrid}>
            {[
              ['Rest breaks', guidance.breaksPerHour ? `${guidance.breaksPerHour}+ / hour` : guidance.restMinutesPerHour ? `${guidance.restMinutesPerHour} min / hour` : '—'],
              ['Break length', guidance.breakMinutes ? `${guidance.breakMinutes}+ min` : '—'],
              ['Max practice', guidance.maxPracticeMinutes ? `${guidance.maxPracticeMinutes / 60} hr` : guidance.outdoorAllowed ? 'No limit' : 'None outdoors'],
              ['Cooling zone', guidance.coolingZoneRequired ? 'Required' : 'Optional'],
            ].map(([label, value]) => <View key={label} style={styles.ruleMetric}><Text style={styles.ruleLabel}>{label}</Text><Text style={styles.ruleValue}>{value}</Text></View>)}
          </View>
          {guidance.football ? <Facts items={[{ title: 'Football equipment', body: guidance.football }]} /> : null}
        </>
      ) : null}
      <Pressable accessibilityRole="link" onPress={() => Linking.openURL(UIL_SOURCE_URL)} style={({ pressed }) => [styles.sourceRow, pressed && styles.pressed]}><Text style={styles.sourceLabel}>UIL activity chart</Text><Text style={styles.sourceValue}>{UIL_VERSION}  ›</Text></Pressable>

    </>
  );
}

const coachStyles = StyleSheet.create({
  gap12: { height: 12 },
  pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  summary: { color: CoachPalette.textSecondary, ...CoachType.body, marginBottom: 14, marginTop: 16 },
  sourceRow: { alignItems: 'center', backgroundColor: CoachPalette.surface, borderRadius: CoachRadius.panel, flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, minHeight: 62, paddingHorizontal: 20 },
  sourceLabel: { color: CoachPalette.text, ...CoachType.body, flexShrink: 1 },
  sourceValue: { color: CoachPalette.muted, ...CoachType.label },
  rulesHero: { ...surfaceStyles.card, padding: 24 },
  eyebrow: { color: CoachPalette.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  zoneHeading: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 12 },
  zoneMark: { borderRadius: 6, height: 12, width: 12 },
  rulesTitle: { color: CoachPalette.text, ...CoachType.section, marginTop: 10, flexShrink: 1 },
  rulesBody: { color: CoachPalette.textSecondary, ...CoachType.body, marginTop: 8 },
  rulesMeta: { color: CoachPalette.muted, ...CoachType.label, marginTop: 14 },
  rulesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  ruleMetric: { backgroundColor: CoachPalette.surface, borderRadius: CoachRadius.panel, minHeight: 94, padding: 17, width: '48%' },
  ruleLabel: { color: CoachPalette.muted, ...CoachType.label },
  ruleValue: { color: CoachPalette.text, fontFamily: Face.figure, fontSize: 24, lineHeight: 28, marginTop: 10 },
  planHead: { flexWrap: 'wrap', gap: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, marginTop: 32 },
  sectionTitle: { color: CoachPalette.text, ...CoachType.section, marginTop: 28 },
  planList: { gap: 10 },
  planCard: { ...surfaceStyles.card, padding: 20 },
  planEmpty: { ...surfaceStyles.card, padding: 22 },
  planCardTop: { flexWrap: 'wrap', alignItems: 'baseline', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  planName: { color: CoachPalette.text, flex: 1, ...CoachType.card },
  planWhen: { color: CoachPalette.muted, fontSize: 14, fontWeight: '700' },
  timeline: { flexDirection: 'row', gap: 3, height: 7, marginTop: 20, overflow: 'hidden' },
  timelineWork: { backgroundColor: METRIC_PEACH, borderRadius: 4 },
  timelineRest: { backgroundColor: CoachPalette.interactive, borderRadius: 4 },
  timelineLabel: { color: CoachPalette.muted, fontSize: 13, fontWeight: '600', marginTop: 10 },
});

/** What UIL requires for the latest reading's zone, one rule per row, with the source. */
export function ZoneRules({ latest, uilClass, hideSummary = false }: { latest: FieldReading | null; uilClass: 2 | 3; hideSummary?: boolean }) {
  const styles = useAthleteStyles(baseStyles);
  const guidance = latest ? UIL_GUIDANCE[latest.zone] : null;
  return (
    <>
      {guidance ? (
        <>
          {hideSummary ? <View style={styles.gap12} /> : <Text style={styles.summary}>{guidance.summary}</Text>}
          <Rows>
            <ListRow label="Rest breaks" value={guidance.breaksPerHour ? `${guidance.breaksPerHour}+ per hour` : guidance.restMinutesPerHour ? `${guidance.restMinutesPerHour} min per hour` : '--'} />
            <ListRow label="Break length" value={guidance.breakMinutes ? `${guidance.breakMinutes}+ min` : '--'} />
            <ListRow label="Max practice" value={guidance.maxPracticeMinutes ? `${guidance.maxPracticeMinutes / 60} hr` : guidance.outdoorAllowed ? 'No limit' : 'None outdoors'} />
            <ListRow label="Cooling zone" value={guidance.coolingZoneRequired ? 'Required' : 'Optional'} />
          </Rows>
          {guidance.football ? <Facts items={[{ title: 'Football equipment', body: guidance.football }]} /> : null}
        </>
      ) : null}
      <View style={styles.sourceRow}>
        <Rows>
          <ListRow label="UIL activity chart" onPress={() => Linking.openURL(UIL_SOURCE_URL)} value={UIL_VERSION} />
        </Rows>
      </View>

    </>
  );
}

const baseStyles = StyleSheet.create({
  gap12: { height: 12 },
  summary: { color: Palette.ink, fontSize: 17, lineHeight: 24, marginBottom: 14, marginTop: 16 },
  sourceRow: { marginTop: 16 },
});
