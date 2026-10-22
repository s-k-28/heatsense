import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import { SAMPLE_ALERTS } from '@/components/coach-alerts';
import { ConditionsSheet } from '@/components/conditions-sheet';
import { AvatarStack, PrimaryButton, Tap } from '@/components/ds';
import { useViewportSize } from '@/components/mobile-viewport';
import { Color, Motion, Radius, Space, Type } from '@/constants/design-system';
import { Palette } from '@/constants/theme';
import { useCoachTeam, type TeamState } from '@/hooks/use-coach-team';
import { useRoster } from '@/hooks/use-roster';
import { SAMPLE_PLAN, SAMPLE_READING, ZONES, readinessFor, type FieldReading, type PracticePlan, type Readiness } from '@/lib/practice';
import { useAuthSession } from '@/state/auth-session';
import { useTemperature } from '@/state/preferences';

// Coach Home is built around one question: is the team ready for practice? The photo hero owns the
// first screen and carries the single primary action. Everything below is quieter on purpose: the
// day's plan, anything that needs the coach, then team housekeeping. Rules: docs/design/design-system.md.
//
// Real data only. Team, code, and join requests come from Firebase. There is no WBGT feed yet, so the
// hero asks the coach to check conditions. `?sample=1` shows the built-in sample reading and plan,
// each marked as a sample in plain text.

const HERO_PHOTO = require('@/assets/images/home/field-hero.webp');

/* ─────────────────────────────── Helpers ─────────────────────────────── */

const partOfDay = (date: Date) => (date.getHours() < 12 ? 'Morning' : date.getHours() < 17 ? 'Afternoon' : 'Evening');


const ACTION_LABEL: Record<Readiness, string> = {
  'check-conditions': 'Check field conditions',
  'review-plan': 'Review practice plan',
  'plan-needs-review': 'Review today’s plan',
};

/* ─────────────────────────────── Hero ─────────────────────────────── */

function ReadinessHero({ height, onAction, readiness, reading }: { height: number; onAction: () => void; readiness: Readiness; reading: FieldReading | null }) {
  const reducedMotion = useReducedMotion();
  const temp = useTemperature();
  const { width } = useViewportSize();
  const fade = (delay: number) => (reducedMotion ? undefined : FadeIn.delay(delay).duration(Motion.state + 40));
  const zone = reading ? ZONES[reading.zone] : null;

  return (
    <View style={[styles.hero, { minHeight: height }]}>
      <Image accessibilityIgnoresInvertColors contentFit="cover" contentPosition={{ top: '12%', left: '50%' }} source={HERO_PHOTO} style={StyleSheet.absoluteFill} transition={reducedMotion ? 0 : Motion.reveal} />
      {/* Functional overlay only: it keeps the copy readable where it sits, at the bottom. */}
      <LinearGradient colors={['rgba(16,20,22,0)', 'rgba(16,20,22,0.55)', 'rgba(16,20,22,0.94)']} locations={[0.15, 0.5, 0.86]} pointerEvents="none" style={StyleSheet.absoluteFill} />

      <View style={styles.heroCopy}>
        <Animated.Text accessibilityRole="header" entering={fade(60)} style={[width < 380 ? Type.heroCompact : Type.hero, width >= COACH_HOME_WIDE && styles.heroTitleWide, styles.heroTitle]}>
          {'READY FOR\nPRACTICE?'}
        </Animated.Text>

        <Animated.View entering={fade(140)} style={styles.heroStatus}>
          {reading && zone ? (
            <>
              <Text
                accessibilityLabel={`WBGT ${temp.value(reading.wbgtF)} ${temp.unit === '°F' ? 'degrees Fahrenheit' : 'degrees Celsius'}, ${zone.label}.`}
                style={styles.heroReading}>
                {temp.value(reading.wbgtF)}{temp.unit} WBGT <Text style={{ color: zone.text }}>· {zone.label}</Text>
              </Text>
              <Text style={styles.heroDetail}>{reading.guidance}</Text>
              <Text style={styles.heroMeta}>
                {reading.source === 'sample' ? 'Sample reading, not live' : `Updated ${reading.observedLabel}`} · {reading.location}
              </Text>
            </>
          ) : (
            <Text style={styles.heroDetailLarge}>Check field conditions before practice.</Text>
          )}
        </Animated.View>

        <Animated.View entering={fade(220)} style={styles.heroAction}>
          <PrimaryButton label={ACTION_LABEL[readiness]} onPress={onAction} />
        </Animated.View>
      </View>
    </View>
  );
}


/* ─────────────────────────────── At a glance ─────────────────────────────── */

/** Three compact readouts that each open their tab. Visuals first; the detail lives on the tab. */
function Glance({ alertCount, onNavigate, plan, team }: { alertCount: number; onNavigate: (tab: string) => void; plan: PracticePlan | null; team: TeamState }) {
  const roster = useRoster(team.status === 'ready' ? team.invite.teamId : null);
  const members = Array.isArray(roster) ? roster : [];
  const active = members.filter((m) => m.status === 'active');
  const waiting = members.length - active.length;
  const teamValue = team.status !== 'ready' ? (team.status === 'loading' ? '–' : 'No team') : roster === 'loading' ? '–' : `${active.length} ${active.length === 1 ? 'athlete' : 'athletes'}`;

  return (
    <View style={styles.glance}>
      <Tap accessibilityHint="Opens the Plan tab" accessibilityLabel={plan ? `Plan: ${plan.workMinutes} minutes work, ${plan.restMinutes} rest. Sample.` : 'Plan: not set'} onPress={() => onNavigate('plan')} radius={Radius.control} style={styles.glanceItem}>
        <View style={styles.glanceVisual}>
          {plan ? (
            <View style={styles.miniBar}>
              <View style={[styles.miniWork, { flex: plan.workMinutes }]} />
              <View style={[styles.miniRest, { flex: plan.restMinutes }]} />
            </View>
          ) : <Text style={styles.glanceNumber}>–</Text>}
        </View>
        <Text numberOfLines={1} style={styles.glanceValue}>{plan ? `${plan.workMinutes} / ${plan.restMinutes} min` : 'Not set'}</Text>
        <Text style={styles.glanceLabel}>Plan{plan ? ' · sample' : ''}</Text>
      </Tap>

      <Tap accessibilityHint="Opens the Alerts tab" accessibilityLabel={`Alerts: ${alertCount === 0 ? 'none active' : `${alertCount} need a response`}`} onPress={() => onNavigate('alerts')} radius={Radius.control} style={styles.glanceItem}>
        <View style={styles.glanceVisual}><Text style={[styles.glanceNumber, alertCount > 0 && styles.urgent]}>{alertCount}</Text></View>
        <Text numberOfLines={1} style={styles.glanceValue}>{alertCount === 0 ? 'None active' : 'Active'}</Text>
        <Text style={styles.glanceLabel}>Alerts</Text>
      </Tap>

      <Tap accessibilityHint="Opens the Team tab" accessibilityLabel={`Team: ${teamValue}${waiting > 0 ? `, ${waiting} waiting to join` : ''}`} onPress={() => onNavigate('team')} radius={Radius.control} style={styles.glanceItem}>
        <View style={styles.glanceVisual}>
          {active.length > 0 ? <AvatarStack names={active.map((m) => m.displayName ?? m.email ?? 'Athlete')} size={28} /> : <Text style={styles.glanceNumber}>{roster === 'loading' && team.status === 'ready' ? '–' : 0}</Text>}
        </View>
        <Text numberOfLines={1} style={styles.glanceValue}>{teamValue}</Text>
        <Text numberOfLines={1} style={[styles.glanceLabel, waiting > 0 && styles.waiting]}>{waiting > 0 ? `${waiting} waiting` : 'Team'}</Text>
      </Tap>
    </View>
  );
}

/* ─────────────────────────────── Screen ─────────────────────────────── */

/** Columns switch on at this width; below it, Home is a single mobile column. */
export const COACH_HOME_WIDE = 1024;

export function CoachHome({ onNavigate, sample = false }: { onNavigate: (tab: string) => void; sample?: boolean }) {
  const { user } = useAuthSession();
  const { state: team } = useCoachTeam(user?.uid ?? null);
  const { width, height } = useViewportSize();
  const [conditionsOpen, setConditionsOpen] = useState(false);

  // No live WBGT feed exists. The sample appears only when asked for, and says so wherever it shows.
  const reading = sample ? SAMPLE_READING : null;
  const plan = sample ? SAMPLE_PLAN : null;
  const readiness = readinessFor(reading, plan);
  const openPlan = () => onNavigate('plan');
  const heroAction = readiness === 'check-conditions' ? () => setConditionsOpen(true) : openPlan;

  const firstName = user?.displayName?.trim().split(/\s+/)[0] ?? null;
  const wide = width >= COACH_HOME_WIDE;
  // About half the first screen on phones; a fixed, generous height beside the side column on desktop.
  const heroHeight = wide ? 600 : Math.round(Math.min(560, Math.max(390, height * 0.54)));

  const greeting = (
    <View style={styles.greeting}>
      {team.status === 'ready' ? <Text numberOfLines={1} style={[Type.meta, styles.muted]}>{team.team.teamName}</Text> : null}
      <Text accessibilityRole="header" style={[Type.title, styles.ink]}>{partOfDay(new Date())}, {firstName ?? 'Coach'}.</Text>
    </View>
  );
  const hero = <ReadinessHero height={heroHeight} onAction={heroAction} readiness={readiness} reading={reading} />;
  const rest = (
    <View style={wide ? styles.sideColumn : styles.belowHero}>
      <Text accessibilityRole="header" style={[Type.section, styles.ink, styles.sectionHeading]}>Today</Text>
      <Glance alertCount={sample ? SAMPLE_ALERTS.filter((a) => a.severity === 'urgent').length : 0} onNavigate={onNavigate} plan={plan} team={team} />
    </View>
  );

  return (
    <View>
      {greeting}
      {wide ? <View style={styles.wideRow}><View style={styles.heroColumn}>{hero}</View>{rest}</View> : <>{hero}{rest}</>}
      <ConditionsSheet onClose={() => setConditionsOpen(false)} visible={conditionsOpen} />
    </View>
  );
}

/* ─────────────────────────────── Styles ─────────────────────────────── */

const styles = StyleSheet.create({
  ink: { color: Color.ink },
  muted: { color: Color.inkMuted },
  subtle: { color: Color.inkSubtle },
  gapXs: { marginTop: Space.xs },
  gapM: { marginTop: Space.m },

  greeting: { gap: 2, marginBottom: Space.l, marginTop: Space.xs },

  hero: { backgroundColor: Color.surface, borderCurve: 'continuous', borderRadius: Radius.hero, justifyContent: 'flex-end', overflow: 'hidden' },
  heroCopy: { padding: Space.xl },
  heroTitle: { color: Color.ink },
  heroTitleWide: { fontSize: 68, lineHeight: 64 },
  heroStatus: { marginTop: Space.m },
  heroReading: { color: Color.ink, fontFamily: Type.bodyStrong.fontFamily, fontSize: 18, lineHeight: 24 },
  heroDetail: { ...Type.body, color: 'rgba(246,243,236,0.86)', marginTop: Space.xs, maxWidth: 440 },
  heroDetailLarge: { ...Type.body, color: Color.ink, fontSize: 17, lineHeight: 24, maxWidth: 440 },
  heroMeta: { ...Type.meta, color: Color.inkMuted, marginTop: Space.s },
  heroAction: { alignItems: 'flex-start', marginTop: Space.xl },


  belowHero: { marginTop: Space.section },
  wideRow: { alignItems: 'flex-start', flexDirection: 'row', gap: Space.xxl + Space.s },
  heroColumn: { flex: 1.35 },
  sideColumn: { flex: 1, paddingTop: Space.xs },
  sectionGap: { marginTop: Space.section },
  sectionHeading: { marginBottom: Space.m },

  glance: { backgroundColor: Color.surface, borderCurve: 'continuous', borderRadius: Radius.surface, flexDirection: 'row', gap: Space.xs, padding: Space.s },
  glanceItem: { flex: 1, gap: 2, minHeight: 112, overflow: 'hidden', padding: Space.m },
  glanceVisual: { height: 38, justifyContent: 'center', marginBottom: Space.s },
  glanceNumber: { color: Color.ink, fontFamily: Type.data.fontFamily, fontSize: 36, lineHeight: 38 },
  glanceValue: { ...Type.bodyStrong, color: Color.ink, fontSize: 15 },
  glanceLabel: { ...Type.meta, color: Color.inkMuted },
  urgent: { color: Palette.emergency },
  waiting: { color: Color.accent },
  miniBar: { flexDirection: 'row', gap: 3, height: 10 },
  miniWork: { backgroundColor: Color.accent, borderRadius: 5 },
  miniRest: { backgroundColor: Color.support, borderRadius: 5 },
});
