import { Text } from '@/components/ui/text';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { createContext, useContext } from 'react';
import { Alert, Share, StyleSheet, View } from 'react-native';

import { CoachLargeTitle, LargeTitle, type DashboardRole } from '@/components/dashboard-shell';
import { HeatIcon } from '@/components/heat-icon';
import { AlertsTab } from '@/components/alerts-tab';
import { PlanTab, TeamTab } from '@/components/coach-tabs';
import { ProfileTab } from '@/components/profile-tab';
import { CoachHome as CoachHomeScreen } from '@/components/coach-home';
import { LearnTab } from '@/components/learn-tab';
import { AthleteBand, AthleteHome, AthleteSessions, TrainerHome } from '@/components/role-tabs';
import { TrainerAthletes } from '@/components/trainer-athletes';
import { TrainerMonitor } from '@/components/trainer-monitor';
import { ProtocolsTab } from '@/components/protocols-tab';
import { LineChart } from '@/components/ui/charts';
import { Card, CardHeader } from '@/components/ui/list';
import { Palette, Spacing, Type } from '@/constants/theme';
import { TODAY, ZONES } from '@/lib/practice';
import { ensureTeamInvite, getMyTeamInvite } from '@/services/team-invites';
import { useTeamDraft, type TeamDraft } from '@/state/onboarding';
import { usePreferences, useTemperature } from '@/state/preferences';

type IconName = ComponentProps<typeof HeatIcon>['name'];

const icons = {
  check: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  heart: { ios: 'heart.fill', android: 'favorite', web: 'favorite' },
  medical: { ios: 'cross.case.fill', android: 'medical_services', web: 'medical_services' },
  phone: { ios: 'phone.fill', android: 'call', web: 'call' },
  sun: { ios: 'sun.max.fill', android: 'sunny', web: 'sunny' },
  warning: { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
} as const satisfies Record<string, IconName>;

// Hourly readings from 7 AM up to now (4:10 PM). There is no forecast, so the line stops at the latest reading.
const HOURLY_WBGT = [62, 64, 67, 71, 75, 79, 82, 84, 84];

/** Lets a section's "Show All" link switch tabs without threading props through every screen. */
const NavContext = createContext<(tab: string) => void>(() => {});

/** The team this coach set up during onboarding, with the sample school as a stand-in until they do. */
function useTeam() {
  const draft = useTeamDraft();
  return { draft, school: draft.school.trim() || 'Liberty High School', name: draft.teamName.trim() || 'Liberty Patriots' };
}

export async function shareTeamCode(draft: TeamDraft) {
  try {
    // A coach who already created a team shares that team's active code; otherwise use the setup draft.
    const existing = await getMyTeamInvite();
    const complete = Boolean(draft.school.trim() && draft.teamName.trim() && draft.sport && draft.level);
    // No team yet: the code comes from creating one, so go there instead of explaining.
    if (!existing && !complete) {
      router.push('/team/create');
      return;
    }
    const teamName = existing ? existing.team.teamName : draft.teamName;
    const invite = existing
      ? existing.invite
      : await ensureTeamInvite({ school: draft.school, teamName: draft.teamName, sport: draft.sport!, level: draft.level! });
    await Share.share({ message: `Join ${teamName} on HeatSense with the code ${invite.code}.` });
  } catch {
    Alert.alert('Couldn’t share the code', 'Check your connection and try again.');
  }
}

export function DashboardContent({ onNavigate, role, tab }: { onNavigate?: (tab: string) => void; role: DashboardRole; tab: string }) {
  const content = role === 'coach' ? <CoachContent tab={tab} /> : role === 'trainer' ? <TrainerContent tab={tab} /> : <AthleteContent tab={tab} />;
  return <NavContext.Provider value={onNavigate ?? (() => {})}>{content}</NavContext.Provider>;
}

function CoachContent({ tab }: { tab: string }) {
  const go = useContext(NavContext);
  if (tab === 'plan') return <><CoachLargeTitle title="Plan" /><PlanTab /></>;
  if (tab === 'team') return <><CoachLargeTitle title="Team" /><TeamTab /></>;
  if (tab === 'alerts') return <><CoachLargeTitle title="Alerts" /><AlertsTab onNavigate={go} /></>;
  if (tab === 'profile') return <><CoachLargeTitle title="Profile" /><ProfileTab role="Coach" /></>;
  return <CoachHome />;
}

function TrainerContent({ tab }: { tab: string }) {
  const go = useContext(NavContext);
  if (tab === 'monitor') return <><LargeTitle title="Monitor" /><TrainerMonitor /></>;
  if (tab === 'athletes') return <><LargeTitle title="Athletes" /><TrainerAthletes /></>;
  if (tab === 'protocols') return <><LargeTitle title="Protocols" /><ProtocolsTab /></>;
  if (tab === 'profile') return <><LargeTitle title="Profile" /><ProfileTab role="Athletic trainer" /></>;
  return <><LargeTitle title="Today" /><TrainerHome onOpenMonitor={() => go('monitor')} /></>;
}

function AthleteContent({ tab }: { tab: string }) {
  const go = useContext(NavContext);
  if (tab === 'band') return <><LargeTitle title="Band" /><AthleteBand /></>;
  if (tab === 'sessions') return <><LargeTitle title="Sessions" /><AthleteSessions /></>;
  if (tab === 'learn') return <><LargeTitle title="Learn" /><LearnTab onOpenBand={() => go('band')} /></>;
  if (tab === 'profile') return <><LargeTitle title="Profile" /><ProfileTab role="Athlete" /></>;
  return <><LargeTitle title="Today" /><AthleteHome onOpenBand={() => go('band')} /></>;
}

/* ─────────────────────────────── Home screens ─────────────────────────────── */


/** Coach Home: the WHOOP-style orb, practice rings, get-started cards and today's readings. */
function CoachHome() {
  const go = useContext(NavContext);
  const { draft } = useTeam();
  return <CoachHomeScreen onInvite={() => shareTeamCode(draft)} onOpenPlan={() => go('plan')} />;
}

/** Today's field reading: the one card every role shares. The figure, how it got there, and what it means. */
export function FieldCard({ onPress, showZone = true }: { onPress?: () => void; showZone?: boolean }) {
  const temp = useTemperature();
  const { refreshedAt } = usePreferences();
  const latest = HOURLY_WBGT[HOURLY_WBGT.length - 1];
  // A change in whole degrees, in the user's unit: "+5°".
  const wholeDelta = (fahrenheit: number) => `${fahrenheit < 0 ? '−' : '+'}${Math.abs(Math.round(temp.value(32 + fahrenheit) - temp.value(32)))}°`;
  const threeHoursAgo = HOURLY_WBGT[HOURLY_WBGT.length - 4];
  return (
    <Card>
      <CardHeader icon={icons.sun} label="Field WBGT" onPress={onPress} tone={Palette.warning} trailing="Memorial Stadium" />
      <View style={styles.fieldTop}>
        <View style={styles.valueRow}>
          <Text style={styles.heroValue}>{temp.value(TODAY.wbgtF)}</Text>
          <Text style={styles.heroUnit}>{temp.unit}</Text>
        </View>
        <View style={styles.fieldTrend}>
          {showZone ? <Text style={[styles.zoneLine, { color: ZONES[TODAY.zone].text }]}>{ZONES[TODAY.zone].label}</Text> : null}
          <Text style={styles.fieldTrendText}>{wholeDelta(latest - HOURLY_WBGT[0])} since 7 AM</Text>
        </View>
      </View>
      <Text style={styles.cardBody}>Modify work and rest before athletes take the field.</Text>
      <LineChart
        format={(value) => `${temp.value(value)}°`}
        labels={['7 AM', '11 AM', 'Now']}
        max={88}
        min={60}
        summary={`Hourly WBGT today, rising from ${temp.value(HOURLY_WBGT[0])} to ${temp.value(latest)} degrees by 4 PM.`}
        tone={Palette.warning}
        values={HOURLY_WBGT}
      />
      <View style={styles.statRow}>
        <Stat label="Peak today" value={`${temp.value(Math.max(...HOURLY_WBGT))}°`} />
        <Stat label="Last 3 hours" value={wholeDelta(latest - threeHoursAgo)} />
        <Stat label="Updated" value={refreshedAt ? 'Now' : '2 min'} />
      </View>
    </Card>
  );
}

/** Kept for the coach workspace route, which still imports it. */
export function RiskHero(_props: { mode: 'coach' }) {
  return <FieldCard />;
}

/* ─────────────────────────────── Other screens ─────────────────────────────── */

/* ─────────────────────────────── Building blocks ─────────────────────────────── */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.55 },
  categoryRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  categoryLabel: { ...Type.label },
  flexOne: { flex: 1 },
  planStats: { marginTop: Spacing.five },
  planName: { color: Palette.inkMuted, ...Type.label, fontSize: 13, marginBottom: Spacing.three, marginTop: -Spacing.one },
  todayTag: { backgroundColor: 'rgba(255,153,107,0.16)', borderRadius: 6, color: Palette.coral, overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 3, ...Type.labelSmall, fontSize: 11 },
  liveAlert: { backgroundColor: '#140E0F', borderColor: 'rgba(255,69,58,0.28)', borderCurve: 'continuous', borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', padding: Spacing.four, paddingTop: Spacing.three },
  liveHead: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: Spacing.four },
  liveDot: { backgroundColor: Palette.emergency, borderRadius: 4, height: 8, width: 8 },
  liveEyebrow: { color: Palette.emergency, ...Type.label, fontSize: 13 },
  liveTitle: { color: Palette.ink, ...Type.title2, fontWeight: '700', marginTop: Spacing.one },
  liveStats: { borderColor: 'rgba(255,255,255,0.08)', borderBottomWidth: StyleSheet.hairlineWidth, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', marginTop: Spacing.four, paddingVertical: Spacing.three },
  liveStat: { flex: 1, gap: 1 },
  liveStatValueRow: { alignItems: 'baseline', flexDirection: 'row', gap: 2 },
  liveStatValue: { color: Palette.ink, ...Type.figure, fontSize: 26, lineHeight: 29 },
  liveStatUnit: { color: Palette.inkMuted, ...Type.labelSmall, fontSize: 10 },
  liveStatLabel: { color: Palette.inkMuted, ...Type.labelSmall, fontSize: 11 },
  alertPrimary: { alignItems: 'center', backgroundColor: Palette.emergency, borderCurve: 'continuous', borderRadius: 14, flexDirection: 'row', gap: Spacing.two, justifyContent: 'center', marginTop: Spacing.four, minHeight: 52 },
  alertPrimaryText: { color: '#FFFFFF', ...Type.label, fontSize: 17 },
  alertSecondary: { alignItems: 'center', justifyContent: 'center', marginTop: Spacing.one, minHeight: 44 },
  alertSecondaryText: { color: Palette.ink, ...Type.subhead, fontWeight: '600' },
  allClear: { alignItems: 'center', flexDirection: 'row', gap: Spacing.four },
  allClearIcon: { alignItems: 'center', backgroundColor: 'rgba(48,209,88,0.14)', borderRadius: 26, height: 52, justifyContent: 'center', width: 52 },
  allClearTitle: { color: Palette.ink, ...Type.title3, fontWeight: '700' },
  alertSummary: { marginTop: Spacing.five },
  feedEnd: { alignItems: 'flex-end', gap: 2 },
  feedTime: { color: Palette.ink, ...Type.figure, fontSize: 17, lineHeight: 20 },
  feedStatus: { color: Palette.inkMuted, ...Type.labelSmall, fontSize: 11 },
  schedule: { backgroundColor: Palette.card, borderColor: Palette.cardEdge, borderCurve: 'continuous', borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  scheduleRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.three, minHeight: 72, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three },
  scheduleRowNow: { backgroundColor: 'rgba(255,153,107,0.08)' },
  scheduleDivider: { borderTopColor: 'rgba(255,255,255,0.08)', borderTopWidth: StyleSheet.hairlineWidth },
  scheduleTime: { color: Palette.inkMuted, ...Type.figure, fontSize: 19, lineHeight: 22, width: 40 },
  scheduleTrack: { alignItems: 'center', justifyContent: 'center', width: 6 },
  scheduleBar: { borderRadius: 3, width: 4 },
  scheduleCopy: { flex: 1, gap: 2 },
  scheduleHead: { alignItems: 'center', flexDirection: 'row', gap: Spacing.two },
  scheduleTitle: { ...Type.label, fontSize: 15 },
  scheduleNow: { backgroundColor: Palette.coral, borderRadius: 4, color: '#1A0E07', overflow: 'hidden', paddingHorizontal: 5, paddingVertical: 1, ...Type.labelSmall, fontSize: 10, lineHeight: 13 },
  scheduleDetail: { color: Palette.inkMuted, ...Type.footnote },
  scheduleLength: { alignItems: 'flex-end', minWidth: 30 },
  scheduleMinutes: { color: Palette.ink, ...Type.figure, fontSize: 22, lineHeight: 24 },
  scheduleUnit: { color: Palette.inkMuted, ...Type.labelSmall, fontSize: 10, lineHeight: 12 },
  planNote: { color: Palette.inkMuted, ...Type.footnote, marginTop: Spacing.three, textAlign: 'center' },
  readiness: { alignItems: 'center', flexDirection: 'row', gap: Spacing.five, marginTop: Spacing.three },
  readinessCopy: { flex: 1, gap: 2 },
  readinessTitle: { color: Palette.ink, ...Type.title3 },
  readinessSub: { color: Palette.inkMuted, ...Type.footnote },
  legendCol: { gap: 5, marginTop: Spacing.three },
  ringNumber: { color: Palette.ink, ...Type.figure, fontSize: 42, lineHeight: 44 },
  ringOf: { color: Palette.inkMuted, ...Type.labelSmall },
  sosTitle: { color: Palette.ink, ...Type.title2, marginTop: Spacing.three },
  sosBody: { color: Palette.inkMuted, ...Type.subhead, marginTop: 2 },
  sosButton: { alignItems: 'center', backgroundColor: Palette.emergency, borderCurve: 'continuous', borderRadius: 16, flexDirection: 'row', gap: Spacing.two, justifyContent: 'center', marginTop: Spacing.five, minHeight: 54 },
  sosButtonText: { color: '#FFFFFF', ...Type.label, fontSize: 18 },
  statusHero: { alignItems: 'center', marginTop: Spacing.five },
  statusTitle: { color: Palette.ink, ...Type.title2, marginTop: Spacing.four },
  statusBody: { color: Palette.inkMuted, ...Type.subhead, marginTop: Spacing.one, maxWidth: 300, textAlign: 'center' },
  sessionsHero: { marginTop: Spacing.five },
  sessionsLabel: { color: Palette.inkMuted, ...Type.label, fontSize: 13 },
  zoneDot: { borderRadius: 5, height: 10, width: 10 },
  topicGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three, marginTop: Spacing.five },
  topic: { backgroundColor: Palette.card, borderColor: Palette.cardEdge, borderCurve: 'continuous', borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, gap: Spacing.four, minHeight: 148, padding: Spacing.four, width: '48%' },
  topicDanger: { backgroundColor: 'rgba(255,69,58,0.12)' },
  topicIcon: { alignItems: 'center', borderRadius: 12, height: 48, justifyContent: 'center', width: 48 },
  topicTitle: { color: Palette.ink, ...Type.headline },
  incidentHero: { borderCurve: 'continuous', borderRadius: 16, padding: Spacing.five },
  incidentNumbers: { alignItems: 'flex-end', flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.two, marginTop: Spacing.four },
  incidentBpm: { color: Palette.ink, ...Type.figure, fontSize: 76, lineHeight: 76 },
  incidentUnit: { color: Palette.inkMuted, ...Type.label, fontSize: 18 },
  incidentOver: { color: Palette.emergency, ...Type.footnote, fontWeight: '600', marginBottom: 6 },
  incidentTop: { alignItems: 'center', flexDirection: 'row', gap: Spacing.three },
  incidentName: { color: Palette.ink, ...Type.title3 },
  incidentMeta: { color: Palette.inkMuted, ...Type.footnote },
  needsPill: { backgroundColor: 'rgba(255,69,58,0.2)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  needsPillText: { color: Palette.emergency, ...Type.labelSmall },
  identity: { alignItems: 'center', marginTop: Spacing.five },
  bigAvatar: { alignItems: 'center', borderRadius: 48, height: 96, justifyContent: 'center', width: 96 },
  bigAvatarText: { color: '#2A1206', fontWeight: '700', fontSize: 42, letterSpacing: 0.5 },
  identityName: { color: Palette.ink, ...Type.title2, marginTop: Spacing.three },
  identityMeta: { color: Palette.inkMuted, ...Type.subhead, marginTop: 2 },
  identityStats: { marginTop: Spacing.five },
  contextBelow: { marginTop: Spacing.four },
  firstBlock: { marginTop: Spacing.three },
  hero: { backgroundColor: Palette.surface, borderCurve: 'continuous', borderRadius: 18, justifyContent: 'flex-end', marginTop: Spacing.three, minHeight: 250, overflow: 'hidden' },
  zoneTag: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, flexDirection: 'row', gap: 6, left: Spacing.four, paddingHorizontal: 9, paddingVertical: 6, position: 'absolute', top: Spacing.four },
  zoneTagText: { color: '#FFFFFF', ...Type.labelSmall, fontSize: 13, lineHeight: 15 },
  heroCopy: { padding: Spacing.four },
  heroTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '600', letterSpacing: 0.3, lineHeight: 33 },
  heroButton: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', borderCurve: 'continuous', borderRadius: 18, flexDirection: 'row', gap: 6, marginTop: Spacing.three, minHeight: 40, paddingHorizontal: Spacing.four },
  heroButtonText: { color: '#FFFFFF', ...Type.subhead, fontWeight: '600' },
  todayBar: { gap: Spacing.one, marginTop: Spacing.three, paddingHorizontal: Spacing.two, paddingTop: Spacing.four, paddingBottom: Spacing.two },
  todayItem: { alignItems: 'center', flex: 1, gap: 2, paddingBottom: Spacing.three },
  todayRow: { flexDirection: 'row' },
  todayPlanLine: { borderTopColor: Palette.border, borderTopWidth: StyleSheet.hairlineWidth, marginHorizontal: Spacing.three, paddingBottom: Spacing.one, paddingTop: Spacing.three },
  todayPlanText: { color: Palette.inkMuted, ...Type.footnote },
  inviteRow: { marginTop: Spacing.three },
  todayNumber: { color: Palette.ink, ...Type.figure, fontSize: 26, lineHeight: 28 },
  todayNumberSmall: { fontSize: 19, lineHeight: 21 },
  todayLabelRow: { alignItems: 'center', flexDirection: 'row', gap: 4, marginTop: Spacing.two },
  todayValue: { color: Palette.inkMuted, ...Type.footnote },
  todayLabel: { color: Palette.ink, ...Type.label, fontSize: 14 },
  sheet: { backgroundColor: Palette.canvas, flex: 1 },
  sheetBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingBottom: Spacing.three, paddingHorizontal: Spacing.five, paddingTop: Spacing.five },
  sheetTitle: { color: Palette.ink, ...Type.title2 },
  sheetContent: { gap: Spacing.three, paddingHorizontal: Spacing.five, paddingTop: Spacing.two },
  sheetLead: { color: Palette.ink, ...Type.body },
  sheetHeading: { color: Palette.ink, ...Type.headline, marginTop: Spacing.three },
  sheetBody: { color: Palette.inkMuted, ...Type.body },
  block: { marginTop: Spacing.three },
  contextLine: { color: Palette.inkMuted, ...Type.subhead, marginTop: 2 },
  cardName: { color: Palette.ink, ...Type.title2, marginTop: Spacing.three },
  cardNameFirst: { color: Palette.ink, ...Type.title2 },
  cardNameInline: { color: Palette.ink, ...Type.title3, flex: 1 },
  cardBody: { color: Palette.inkMuted, ...Type.subhead, marginTop: 2 },
  cardBodyTop: { color: Palette.inkMuted, ...Type.subhead, marginTop: Spacing.three },
  cardFootnote: { color: Palette.inkMuted, ...Type.footnote, marginTop: Spacing.three },
  cardAction: { marginTop: Spacing.four },
  valueRow: { alignItems: 'baseline', flexDirection: 'row', gap: 4, marginTop: Spacing.two },
  heroValue: { color: Palette.ink, ...Type.figure, fontSize: 64, lineHeight: 66 },
  heroUnit: { color: Palette.inkMuted, ...Type.label, fontSize: 20, lineHeight: 24 },
  zoneLine: { color: Palette.warning, ...Type.label },
  fieldTop: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between' },
  fieldTrend: { alignItems: 'flex-end', gap: 2, paddingBottom: Spacing.two },
  fieldTrendText: { color: Palette.inkMuted, ...Type.footnote },
  statRow: { borderTopColor: Palette.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', marginTop: Spacing.four, paddingTop: Spacing.three },
  stat: { flex: 1, gap: 1 },
  statLabel: { color: Palette.inkMuted, ...Type.labelSmall },
  statValue: { color: Palette.ink, ...Type.figure, fontSize: 26, lineHeight: 29 },
  signOut: { marginTop: Spacing.seven },
  track: { borderRadius: 4, flexDirection: 'row', gap: 2, height: 8, marginTop: Spacing.four, overflow: 'hidden' },
  segment: { minWidth: 6 },
  summary: { paddingBottom: Spacing.two, paddingHorizontal: Spacing.one },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.four, marginTop: Spacing.three },
  legendItem: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  legendDot: { borderRadius: 4, height: 8, width: 8 },
  segmented: { height: 32, width: '100%' },
  footnote: { color: Palette.inkMuted, ...Type.footnote, marginHorizontal: Spacing.four, marginTop: Spacing.three },
  statusTop: { alignItems: 'center', flexDirection: 'row', gap: Spacing.three },
  step: { alignItems: 'center', backgroundColor: Palette.fill, borderRadius: 14, height: 28, justifyContent: 'center', width: 28 },
  stepText: { color: Palette.ink, fontWeight: '700', fontSize: 16 },
  guideRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 52, paddingHorizontal: Spacing.four },
  guidePressed: { backgroundColor: 'rgba(255,255,255,0.08)' },
  guideTitle: { color: Palette.ink, ...Type.body },
  guideBody: { color: Palette.inkMuted, ...Type.subhead, paddingBottom: Spacing.four, paddingHorizontal: Spacing.four },
  rotated: { transform: [{ rotate: '90deg' }] },
  suggestionBody: { color: Palette.ink, ...Type.subhead, paddingRight: Spacing.five },
  suggestionAction: { alignItems: 'flex-start', marginTop: Spacing.three },
  dismiss: { position: 'absolute', right: Spacing.three, top: Spacing.three },
});
