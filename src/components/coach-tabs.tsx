import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { Card, Facts, ListRow, Rows, SampleTag, SectionTitle, StatRow } from '@/components/whoop-ui';
import { Palette } from '@/constants/theme';
import { ZONES } from '@/lib/practice';
import { UIL_GUIDANCE, UIL_SOURCE_URL, UIL_VERSION } from '@/lib/uil-wbgt';
import type { FieldReading } from '@/services/practice-sessions';
import { getMyTeamInvite, NETWORK_ERROR, respondToJoinRequest, type TeamInvite, type TeamSummary } from '@/services/team-invites';
import { useTemperature } from '@/state/preferences';
import { clockTime, usePracticePlans } from '@/state/practice-plans';
import { LiveVitalsRows, TeamVitalsRows } from '@/components/vitals';
import { useDemoTeam } from '@/state/demo-team';
import { useCoachData, useMembership, useNow, useRoster, useTeamVitals, type SessionRole } from '@/state/team-session';

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

export function TeamTab({ readOnly = false, role = 'coach' }: { readOnly?: boolean; role?: SessionRole }) {
  const data = useCoachData(role);
  const mine = useMyTeam();
  const roster = useRoster(data?.teamId ?? null);
  const [busy, setBusy] = useState<string | null>(null);
  const waiting = roster?.filter((m) => m.status === 'pending') ?? [];
  const demo = useDemoTeam(data?.readings.at(-1)?.zone ?? 'yellow');
  const staff = roster?.filter((m) => m.status === 'active' && m.role === 'trainer') ?? [];
  const active = roster?.filter((m) => m.status === 'active' && m.role === 'athlete') ?? [];
  const live = useTeamVitals(data?.session ?? null);
  const now = useNow(15_000);

  const respond = async (uid: string, approve: boolean) => {
    if (!data?.teamId) return;
    setBusy(uid);
    try { await respondToJoinRequest(data.teamId, uid, approve); }
    catch { Alert.alert('Couldn’t update the request', NETWORK_ERROR); }
    finally { setBusy(null); }
  };

  const code = mine?.invite.code;
  // The coach reads their own team; a trainer reads the team they belong to.
  const membership = useMembership(role !== 'coach');
  const team = role === 'coach' ? mine?.team : membership?.status === 'active' ? membership.team : null;
  return (
    <>
      {data?.sample ? <SampleTag /> : null}
      <Card message={team ? [team.school, team.sport, 'level' in team ? team.level : null].filter(Boolean).join(' · ') : mine === null && !readOnly ? 'Not set up yet. Create it to get the code athletes join with.' : readOnly && !team ? 'Join your team to see its athletes. Enter the code from your coach in Profile.' : undefined} title={team?.teamName ?? 'Your team'}>
        {team ? (
          <StatRow stats={[
            { label: 'Athletes', value: String(active.length) },
            { label: 'Staff', value: String(staff.length) },
            { label: 'Waiting', value: String(waiting.length), tone: waiting.length && !readOnly ? Palette.coral : undefined },
          ]} />
        ) : null}
      </Card>

      {readOnly ? null : <>
      <View style={styles.gap12} />
      <Rows>
        {mine === null ? (
          <ListRow label="Create your team" onPress={() => router.push('/team/create')} />
        ) : (
          <ListRow
            label="Team code"
            onPress={code ? () => Share.share({ message: `Join ${mine!.team.teamName} on HeatSense with the code ${code}.` }) : undefined}
            value={code ? code.replace(/(\d{3})(\d{3})/, '$1 $2') : '…'}
          />
        )}
      </Rows>
      </>}

      {waiting.length && !readOnly ? (
        <>
          <SectionTitle title={`Waiting to join · ${waiting.length}`} />
          <Rows>
            {waiting.map((m) => (
              <ListRow
                key={m.userId}
                label={m.displayName ?? 'Athlete'}
                trailing={
                  <View style={styles.decide}>
                    <Pressable accessibilityLabel={`Decline ${m.displayName ?? 'athlete'}`} accessibilityRole="button" disabled={busy === m.userId} onPress={() => respond(m.userId, false)} style={styles.decline}><Text style={styles.declineText}>Decline</Text></Pressable>
                    <Pressable accessibilityLabel={`Approve ${m.displayName ?? 'athlete'}`} accessibilityRole="button" disabled={busy === m.userId} onPress={() => respond(m.userId, true)} style={styles.approve}><Text style={styles.approveText}>Approve</Text></Pressable>
                  </View>
                }
              />
            ))}
          </Rows>
        </>
      ) : null}

      {staff.length ? (
        <>
          <SectionTitle title="Staff" />
          <Rows>
            {staff.map((m) => <ListRow key={m.userId} label={m.displayName ?? 'Trainer'} value="Athletic trainer" />)}
          </Rows>
        </>
      ) : null}

      {active.length || !demo.enabled ? <SectionTitle title={`Athletes${active.length ? ` · ${active.length}` : ''}`} /> : null}
      {active.length ? (
        <Rows>
          {active.map((m) => (
            <ListRow key={m.userId} label={m.displayName ?? 'Athlete'} onPress={() => router.push({ pathname: '/athlete-vitals', params: { id: m.userId, role: role === 'trainer' ? 'trainer' : 'coach' } })} />
          ))}
        </Rows>
      ) : demo.enabled ? null : (
        <Text style={styles.empty}>{roster === null && data?.teamId ? 'Loading roster…' : mine === null ? 'Create your team, then share its code to invite athletes.' : 'No athletes yet. Share your team code to invite them.'}</Text>
      )}

      {live.length ? (
        <>
          <SectionTitle title={`Live vitals · ${live.length}`} />
          <LiveVitalsRows now={now} records={live} roster={roster} />
        </>
      ) : null}

      {demo.enabled ? (
        <>
          <SectionTitle title={`Sample athletes · ${demo.members.length}`} />
          <TeamVitalsRows members={demo.members} role={role === 'trainer' ? 'trainer' : 'coach'} />
        </>
      ) : null}
    </>
  );
}

/* ─────────────────────────────── Plan ─────────────────────────────── */

export function PlanTab() {
  const data = useCoachData();
  const temp = useTemperature();
  const { active, plans } = usePracticePlans();
  const latest = data?.readings.at(-1) ?? null;
  const session = data?.session ?? null;
  const uilClass = session?.uilClass ?? 3;
  return (
    <>
      {data?.sample ? <SampleTag /> : null}
      {latest ? (
        <Card message={UIL_GUIDANCE[latest.zone].summary} title="Today">
          <StatRow stats={[
            { label: 'WBGT', value: String(temp.value(latest.wbgtF)), unit: temp.unit },
            { label: 'Zone', value: ZONES[latest.zone].label.replace(' zone', ''), tone: latest.zone === 'black' ? Palette.inkMuted : ZONES[latest.zone].color },
            { label: 'UIL class', value: String(uilClass) },
          ]} />
        </Card>
      ) : (
        <Card message="Take a field reading to see today’s rules." title="Today" />
      )}

      <ZoneRules hideSummary latest={latest} uilClass={uilClass} />

      <SectionTitle action="New" onAction={() => router.push('/plan-editor')} title="Practice plans" />
      <Rows>
        {plans.map((plan) => (
          <ListRow
            key={plan.id}
            label={plan.name}
            onPress={() => router.push({ pathname: '/plan-editor', params: { id: plan.id } })}
            value={plan.id === active.id ? 'Today' : `${clockTime(plan.startMinutes, true)} · ${plan.lengthMinutes} min`}
            valueTone={plan.id === active.id ? Palette.coral : undefined}
          />
        ))}
      </Rows>
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap12: { height: 12 },
  decide: { flexDirection: 'row', gap: 8 },
  approve: { backgroundColor: Palette.coral, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  approveText: { color: '#1A0E07', fontSize: 15, fontWeight: '600' },
  decline: { borderColor: Palette.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  declineText: { color: Palette.inkMuted, fontSize: 15, fontWeight: '600' },
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
