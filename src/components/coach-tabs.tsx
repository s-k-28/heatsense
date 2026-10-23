import { useAthletePalette, useAthleteStyles } from '@/components/athlete-appearance';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Share, StyleSheet, Text, View } from 'react-native';

import { Card, Facts, ListRow, Rows, SampleTag, SectionTitle } from '@/components/whoop-ui';
import { ActionButton } from '@/components/ui/action-button';
import { Face, Palette } from '@/constants/theme';
import { ZONES } from '@/lib/practice';
import { checkPlan } from '@/lib/plan-check';
import { UIL_GUIDANCE, UIL_SOURCE_URL, UIL_VERSION } from '@/lib/uil-wbgt';
import type { FieldReading } from '@/services/practice-sessions';
import { getMyTeamInvite, NETWORK_ERROR, respondToJoinRequest, type TeamInvite, type TeamSummary } from '@/services/team-invites';
import { clockTime, usePracticePlans } from '@/state/practice-plans';
import { Segmented } from '@/components/motion/segmented';
import { TrainerAthletes } from '@/components/trainer-athletes';
import { TrainerMonitor } from '@/components/trainer-monitor';
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
  const styles = useAthleteStyles(baseStyles);
  const data = useCoachData('coach');
  const mine = useMyTeam();
  const roster = useRoster(data?.teamId ?? null);
  const [busy, setBusy] = useState<{ uid: string; approve: boolean } | null>(null);
  const [view, setView] = useState<'roster' | 'live'>('roster');
  const waiting = roster?.filter((m) => m.status === 'pending') ?? [];
  const staff = roster?.filter((m) => m.status === 'active' && m.role === 'trainer') ?? [];

  const respond = async (uid: string, approve: boolean) => {
    if (!data?.teamId || busy) return;
    setBusy({ uid, approve });
    try { await respondToJoinRequest(data.teamId, uid, approve); }
    catch { Alert.alert('Couldn’t update the request', NETWORK_ERROR); }
    finally { setBusy(null); }
  };
  const code = mine?.invite.code;
  const team = mine?.team ?? null;

  return (
    <>
      <Segmented onChange={setView} options={[{ key: 'roster', label: 'Roster' }, { key: 'live', label: 'Live' }]} value={view} />
      <View style={styles.gap12} />

      {view === 'live' ? <TrainerMonitor role="coach" /> : (
        <>
          {data?.sample ? <SampleTag /> : null}
          {mine === null ? (
            <Card message="Create your team to get the code athletes join with." onPress={() => router.push('/team/create')} title="Create your team" />
          ) : (
            <View style={styles.teamCard}>
              <Text style={styles.teamName}>{team?.teamName ?? 'Your team'}</Text>
              {team ? <Text style={styles.teamMeta}>{[team.school, team.sport, 'level' in team ? team.level : null].filter(Boolean).join(' · ')}</Text> : null}
              <View style={styles.codeRow}>
                <View>
                  <Text style={styles.codeLabel}>Team code</Text>
                  <Text accessibilityLabel={code ? `Team code ${code.split('').join(' ')}` : 'Team code loading'} style={styles.code}>{code ? code.replace(/(\d{3})(\d{3})/, '$1 $2') : '··· ···'}</Text>
                </View>
                <ActionButton accessibilityLabel="Share team code" disabled={!code} label="Share" onPress={() => Share.share({ message: `Join ${team?.teamName ?? 'our team'} on HeatSense with the code ${code}.` })} style={styles.shareCode} variant="secondary" />
              </View>
            </View>
          )}

          {waiting.length ? (
            <>
              <SectionTitle title={`Waiting to join · ${waiting.length}`} />
              <Rows>
                {waiting.map((m) => (
                  <View key={m.userId} style={styles.request}>
                    <Text style={styles.requestName}>{m.displayName ?? (m.role === 'trainer' ? 'Athletic trainer' : 'Athlete')}</Text>
                    <View style={styles.decide}>
                      <ActionButton accessibilityLabel={`Decline ${m.displayName ?? 'request'}`} busy={busy?.uid === m.userId && !busy.approve} busyLabel="Declining…" disabled={Boolean(busy)} label="Decline" onPress={() => respond(m.userId, false)} style={styles.decision} variant="secondary" />
                      <ActionButton accessibilityLabel={`Approve ${m.displayName ?? 'request'}`} busy={busy?.uid === m.userId && busy.approve} busyLabel="Approving…" disabled={Boolean(busy)} label="Approve" onPress={() => respond(m.userId, true)} style={styles.decision} variant="secondary" />
                    </View>
                  </View>
                ))}
              </Rows>
            </>
          ) : null}

          <SectionTitle title="Athletes" />
          <TrainerAthletes embedded role="coach" />

          {staff.length ? (
            <>
              <SectionTitle title="Staff" />
              <Rows>
                {staff.map((m) => <ListRow key={m.userId} label={m.displayName ?? 'Trainer'} value="Athletic trainer" />)}
              </Rows>
            </>
          ) : null}
        </>
      )}
    </>
  );
}

/* ─────────────────────────────── Plan ─────────────────────────────── */

export function PlanTab() {
  const Palette = useAthletePalette();
  const data = useCoachData();
  const { active, plans } = usePracticePlans();
  const [showRules, setShowRules] = useState(false);
  const latest = data?.readings.at(-1) ?? null;
  const session = data?.session ?? null;
  const uilClass = session?.uilClass ?? 3;
  return (
    <>
      {data?.sample ? <SampleTag /> : null}
      <SectionTitle action="New" onAction={() => router.push('/plan-editor')} title="Practice plans" />
      <Rows>
        {[...plans].sort((a, b) => Number(b.id === active.id) - Number(a.id === active.id)).map((plan) => {
          // A plan that breaks today's zone rules says so here, before anyone opens it.
          const fails = latest ? !checkPlan(plan, UIL_GUIDANCE[latest.zone]).ok : false;
          const when = plan.id === active.id ? 'Today' : `${clockTime(plan.startMinutes, true)} · ${plan.lengthMinutes} min`;
          return (
            <ListRow
              key={plan.id}
              label={plan.name}
              onPress={() => router.push({ pathname: '/plan-editor', params: { id: plan.id } })}
              value={fails ? `${plan.id === active.id ? 'Today · ' : ''}needs changes` : when}
              valueTone={fails ? Palette.emergency : plan.id === active.id ? Palette.coral : undefined}
            />
          );
        })}
      </Rows>
      <SectionTitle title="Field guidance" />
      <Rows>
        <ListRow
          label={latest ? 'UIL rules' : 'Take a field reading'}
          onPress={() => latest ? setShowRules(!showRules) : router.push('/dashboard?role=coach&tab=home')}
          selected={latest ? showRules : undefined}
          value={latest ? ZONES[latest.zone].label : 'Home'}
        />
      </Rows>
      {showRules && latest ? <ZoneRules latest={latest} uilClass={uilClass} /> : null}
    </>
  );
}

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
  flex: { flex: 1 },
  gap12: { height: 12 },
  teamCard: { backgroundColor: Palette.surface, borderRadius: 16, padding: 18 },
  teamName: { color: Palette.ink, fontSize: 22, fontWeight: '700' },
  teamMeta: { color: Palette.inkMuted, fontSize: 15, marginTop: 2 },
  codeRow: { alignItems: 'flex-end', borderTopColor: 'rgba(255,255,255,0.08)', borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', marginTop: 16, paddingTop: 14 },
  codeLabel: { color: Palette.inkMuted, fontSize: 14, fontWeight: '500' },
  code: { color: Palette.ink, fontFamily: Face.figure, fontSize: 36, letterSpacing: 2, lineHeight: 40 },
  shareCode: { flexShrink: 1, maxWidth: '100%' },
  request: { gap: 12, paddingHorizontal: 18, paddingVertical: 16 },
  requestName: { color: Palette.ink, fontSize: 17, fontWeight: '600' },
  decide: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  decision: { flexBasis: 150, flexGrow: 1 },
  empty: { color: Palette.inkMuted, fontSize: 16, lineHeight: 22 },
  summary: { color: Palette.ink, fontSize: 17, lineHeight: 24, marginBottom: 14, marginTop: 16 },
  sourceRow: { marginTop: 16 },
  identity: { alignItems: 'center', flexDirection: 'row', gap: 16, marginTop: 8 },
  avatar: { alignItems: 'center', backgroundColor: Palette.surface, borderRadius: 34, height: 68, justifyContent: 'center', width: 68 },
  avatarText: { color: Palette.ink, fontSize: 22, fontWeight: '600' },
  identityName: { color: Palette.ink, fontSize: 24, fontWeight: '700' },
  identityMeta: { color: Palette.inkMuted, fontSize: 15, marginTop: 2 },
  logout: { alignItems: 'center', alignSelf: 'center', borderColor: Palette.border, borderRadius: 999, borderWidth: 1, marginTop: 32, paddingHorizontal: 40, paddingVertical: 14 },
  logoutText: { color: Palette.emergency, fontSize: 17, fontWeight: '600' },
});
