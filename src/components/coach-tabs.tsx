import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { Facts, SampleTag } from '@/components/whoop-ui';
import { Face, Palette } from '@/constants/theme';
import { CoachPalette, CoachRadius, CoachType } from '@/constants/coach-theme';
import { enter } from '@/lib/motion';
import { ZONES } from '@/lib/practice';
import { checkPlan } from '@/lib/plan-check';
import { UIL_GUIDANCE, UIL_SOURCE_URL, UIL_VERSION } from '@/lib/uil-wbgt';
import type { FieldReading } from '@/services/practice-sessions';
import { getMyTeamInvite, NETWORK_ERROR, respondToJoinRequest, type TeamInvite, type TeamSummary } from '@/services/team-invites';
import { clockTime, usePracticePlans } from '@/state/practice-plans';
import { TrainerAthletes } from '@/components/trainer-athletes';
import { TrainerMonitor } from '@/components/trainer-monitor';
import { SlidingTabs } from '@/components/sliding-tabs';
import { useCoachData, useRoster } from '@/state/team-session';

// Team, Plan and Profile, decluttered after WHOOP: one heading per section, small caps groups,
// full-width rows and metric tiles. Every number comes from the team's real data or the UIL chart.

function useMyTeam() {
  const [mine, setMine] = useState<{ team: TeamSummary; invite: TeamInvite } | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    getMyTeamInvite().then((value) => { if (live) setMine(value); }).catch(() => { if (live) setMine(null); });
    return () => { live = false; };
  }, []);
  return mine;
}

/* ─────────────────────────────── Team ─────────────────────────────── */

/** The coach's team: the roster to run (code, approvals, acclimatization, staff) and, during practice, everyone live. */
export function TeamTab() {
  const data = useCoachData('coach');
  const mine = useMyTeam();
  const roster = useRoster(data?.teamId ?? null);
  const [busy, setBusy] = useState<string | null>(null);
  const [view, setView] = useState<'roster' | 'live'>('roster');
  const waiting = roster?.filter((m) => m.status === 'pending') ?? [];
  const staff = roster?.filter((m) => m.status === 'active' && m.role === 'trainer') ?? [];

  const respond = async (uid: string, approve: boolean) => {
    if (!data?.teamId) return;
    setBusy(uid);
    try { await respondToJoinRequest(data.teamId, uid, approve); }
    catch { Alert.alert('Couldn’t update the request', NETWORK_ERROR); }
    finally { setBusy(null); }
  };
  const code = mine?.invite.code;
  const team = mine?.team ?? null;

  return (
    <>
      <SlidingTabs label="Team view" onChange={(index) => setView(index === 0 ? 'roster' : 'live')} options={['Roster', 'Live']} selected={view === 'roster' ? 0 : 1} variant="coach" />
      <View style={styles.gap12} />

      {view === 'live' ? <TrainerMonitor role="coach" /> : (
        <>
          {data?.sample ? <SampleTag /> : null}
          {mine === null ? (
            <View style={styles.teamCard}>
              <Text style={styles.teamName}>Build your roster</Text>
              <Text style={styles.teamMeta}>Create a team to get the code athletes use to join.</Text>
              <Pressable accessibilityRole="button" onPress={() => router.push('/team/create')} style={({ pressed }) => [styles.newPlan, styles.createTeam, pressed && styles.pressed]}><Text style={styles.newPlanText}>Create team</Text></Pressable>
            </View>
          ) : (
            <View style={styles.teamCard}>
              <Text style={styles.teamName}>{team?.teamName ?? 'Your team'}</Text>
              {team ? <Text style={styles.teamMeta}>{[team.school, team.sport, 'level' in team ? team.level : null].filter(Boolean).join(' · ')}</Text> : null}
              <View style={styles.codeRow}>
                <View>
                  <Text style={styles.codeLabel}>Team code</Text>
                  <Text accessibilityLabel={code ? `Team code ${code.split('').join(' ')}` : 'Team code loading'} style={styles.code}>{code ? code.replace(/(\d{3})(\d{3})/, '$1 $2') : '··· ···'}</Text>
                </View>
                <Pressable accessibilityRole="button" disabled={!code} onPress={() => Share.share({ message: `Join ${team?.teamName ?? 'our team'} on HeatSense with the code ${code}.` })} style={({ pressed }) => [styles.shareCode, pressed && { opacity: 0.7 }]}>
                  <Text style={styles.shareCodeText}>Share</Text>
                </Pressable>
              </View>
            </View>
          )}

          {waiting.length ? (
            <>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Waiting to join · {waiting.length}</Text>
              <View style={styles.peopleCard}>
                {waiting.map((m) => (
                  <View key={m.userId} style={styles.personRow}>
                    <Text style={styles.personName}>{m.displayName ?? 'Athlete'}</Text>
                      <View style={styles.decide}>
                        <Pressable accessibilityLabel={`Decline ${m.displayName ?? 'athlete'}`} accessibilityRole="button" disabled={busy === m.userId} onPress={() => respond(m.userId, false)} style={styles.decline}><Text style={styles.declineText}>Decline</Text></Pressable>
                        <Pressable accessibilityLabel={`Approve ${m.displayName ?? 'athlete'}`} accessibilityRole="button" disabled={busy === m.userId} onPress={() => respond(m.userId, true)} style={styles.approve}><Text style={styles.approveText}>Approve</Text></Pressable>
                      </View>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          <Text accessibilityRole="header" style={styles.sectionTitle}>Athletes</Text>
          <TrainerAthletes embedded onShare={code ? () => Share.share({ message: `Join ${team?.teamName ?? 'our team'} on HeatSense with the code ${code}.` }) : undefined} role="coach" />

          {staff.length ? (
            <>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Staff</Text>
              <View style={styles.peopleCard}>{staff.map((m) => <View key={m.userId} style={styles.personRow}><Text style={styles.personName}>{m.displayName ?? 'Trainer'}</Text><Text style={styles.personMeta}>Athletic trainer</Text></View>)}</View>
            </>
          ) : null}
        </>
      )}
    </>
  );
}

/* ─────────────────────────────── Plan ─────────────────────────────── */

export function PlanTab() {
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

      <ZoneRules hideSummary latest={latest} uilClass={uilClass} />

      <View style={styles.planHead}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Practice plans</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/plan-editor')} style={({ pressed }) => [styles.newPlan, pressed && styles.pressed]}><Text style={styles.newPlanText}>New plan</Text></Pressable>
      </View>
      <View style={styles.planList}>
        {plans.length === 0 ? <View style={styles.planEmpty}><Text style={styles.planName}>Build your first practice</Text><Text style={styles.rulesBody}>Set work, recovery, water, and check-in timing.</Text></View> : plans.map((plan, index) => {
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
export function ZoneRules({ latest, uilClass, hideSummary = false }: { latest: FieldReading | null; uilClass: 2 | 3; hideSummary?: boolean }) {
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap12: { height: 12 },
  pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  segments: { backgroundColor: CoachPalette.surface, borderRadius: CoachRadius.pill, flexDirection: 'row', gap: 4, padding: 5 },
  segment: { alignItems: 'center', borderRadius: CoachRadius.pill, flex: 1, justifyContent: 'center', minHeight: 46 },
  segmentOn: { backgroundColor: CoachPalette.interactive },
  segmentText: { color: CoachPalette.muted, fontSize: 16, fontWeight: '700' },
  segmentTextOn: { color: CoachPalette.text },
  teamCard: { backgroundColor: CoachPalette.surface, borderRadius: CoachRadius.card, padding: 22 },
  teamName: { color: CoachPalette.text, ...CoachType.card, fontSize: 24 },
  teamMeta: { color: CoachPalette.muted, ...CoachType.body, marginTop: 4 },
  codeRow: { alignItems: 'flex-end', borderTopColor: 'rgba(255,255,255,0.08)', borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 14 },
  codeLabel: { color: CoachPalette.muted, ...CoachType.label },
  code: { color: CoachPalette.text, fontFamily: Face.figure, fontSize: 42, letterSpacing: 3.2, lineHeight: 46 },
  shareCode: { backgroundColor: CoachPalette.peach, borderRadius: CoachRadius.pill, justifyContent: 'center', minHeight: 46, paddingHorizontal: 21 },
  shareCodeText: { color: '#1A0E07', fontSize: 16, fontWeight: '700' },
  createTeam: { alignSelf: 'flex-start', marginTop: 18 },
  decide: { flexDirection: 'row', gap: 8 },
  approve: { backgroundColor: Palette.coral, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  approveText: { color: '#1A0E07', fontSize: 15, fontWeight: '600' },
  decline: { borderColor: Palette.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  declineText: { color: Palette.inkMuted, fontSize: 15, fontWeight: '600' },
  peopleCard: { backgroundColor: CoachPalette.surface, borderRadius: CoachRadius.card, overflow: 'hidden', paddingHorizontal: 18 },
  personRow: { alignItems: 'center', borderBottomColor: CoachPalette.hairline, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', minHeight: 66 },
  personName: { color: CoachPalette.text, fontSize: 17, fontWeight: '700' },
  personMeta: { color: CoachPalette.muted, fontSize: 14, fontWeight: '600' },
  empty: { color: Palette.inkMuted, fontSize: 16, lineHeight: 22 },
  summary: { color: CoachPalette.textSecondary, ...CoachType.body, marginBottom: 14, marginTop: 16 },
  sourceRow: { alignItems: 'center', backgroundColor: CoachPalette.surface, borderRadius: CoachRadius.panel, flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, minHeight: 62, paddingHorizontal: 20 },
  sourceLabel: { color: CoachPalette.text, fontSize: 16, fontWeight: '700' },
  sourceValue: { color: CoachPalette.muted, fontSize: 15, fontWeight: '600' },
  rulesHero: { backgroundColor: CoachPalette.surface, borderRadius: CoachRadius.card, padding: 24 },
  eyebrow: { color: CoachPalette.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  zoneHeading: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 12 },
  zoneMark: { borderRadius: 6, height: 12, width: 12 },
  rulesTitle: { color: CoachPalette.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.7, marginTop: 10 },
  rulesBody: { color: CoachPalette.textSecondary, ...CoachType.body, marginTop: 8 },
  rulesMeta: { color: CoachPalette.muted, ...CoachType.label, marginTop: 14 },
  rulesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  ruleMetric: { backgroundColor: CoachPalette.surface, borderRadius: CoachRadius.panel, minHeight: 94, padding: 17, width: '48%' },
  ruleLabel: { color: CoachPalette.muted, ...CoachType.label },
  ruleValue: { color: CoachPalette.text, fontFamily: Face.figure, fontSize: 24, lineHeight: 28, marginTop: 10 },
  planHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, marginTop: 32 },
  sectionTitle: { color: CoachPalette.text, ...CoachType.section, marginTop: 28 },
  newPlan: { backgroundColor: CoachPalette.peach, borderRadius: CoachRadius.pill, justifyContent: 'center', minHeight: 44, paddingHorizontal: 18 },
  newPlanText: { color: CoachPalette.peachInk, fontSize: 15, fontWeight: '800' },
  planList: { gap: 10 },
  planCard: { backgroundColor: CoachPalette.surface, borderRadius: CoachRadius.card, padding: 20 },
  planEmpty: { backgroundColor: CoachPalette.surface, borderRadius: CoachRadius.card, padding: 22 },
  planCardTop: { alignItems: 'baseline', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  planName: { color: CoachPalette.text, flex: 1, ...CoachType.card },
  planWhen: { color: CoachPalette.muted, fontSize: 14, fontWeight: '700' },
  timeline: { flexDirection: 'row', gap: 3, height: 7, marginTop: 20, overflow: 'hidden' },
  timelineWork: { backgroundColor: CoachPalette.peach, borderRadius: 4 },
  timelineRest: { backgroundColor: CoachPalette.interactive, borderRadius: 4 },
  timelineLabel: { color: CoachPalette.muted, fontSize: 13, fontWeight: '600', marginTop: 10 },
  identity: { alignItems: 'center', flexDirection: 'row', gap: 16, marginTop: 8 },
  avatar: { alignItems: 'center', backgroundColor: Palette.surface, borderRadius: 34, height: 68, justifyContent: 'center', width: 68 },
  avatarText: { color: Palette.ink, fontSize: 22, fontWeight: '600' },
  identityName: { color: Palette.ink, fontSize: 24, fontWeight: '700' },
  identityMeta: { color: Palette.inkMuted, fontSize: 15, marginTop: 2 },
  logout: { alignItems: 'center', alignSelf: 'center', borderColor: Palette.border, borderRadius: 999, borderWidth: 1, marginTop: 32, paddingHorizontal: 40, paddingVertical: 14 },
  logoutText: { color: Palette.emergency, fontSize: 17, fontWeight: '600' },
});
