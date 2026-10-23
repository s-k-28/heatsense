import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, Share, StyleSheet, Switch, Text, View } from 'react-native';

import { CapsLabel, ListRow, MetricTile, Rows, SampleTag, SectionTitle, Tiles } from '@/components/whoop-ui';
import { Palette } from '@/constants/theme';
import { ZONES } from '@/lib/practice';
import { UIL_GUIDANCE, UIL_SOURCE_URL, UIL_VERSION, zoneRange } from '@/lib/uil-wbgt';
import { firebaseAuth } from '@/services/firebase';
import type { FieldReading } from '@/services/practice-sessions';
import { getMyTeamInvite, NETWORK_ERROR, respondToJoinRequest, watchMyMembership, type Membership, type TeamInvite, type TeamSummary } from '@/services/team-invites';
import { setPreference, usePreferences, useTemperature } from '@/state/preferences';
import { buildSchedule, clockTime, usePracticePlans } from '@/state/practice-plans';
import { useAuthSession } from '@/state/auth-session';
import { SimulatedTag, TeamVitalsRows } from '@/components/vitals';
import { useDemoTeam } from '@/state/demo-team';
import { useCoachData, useRoster, useTrainers, type SessionRole } from '@/state/team-session';

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

/** An athlete's or trainer's own membership, live: approved, waiting, or none. */
function useMembership(enabled: boolean) {
  const { user } = useAuthSession();
  const [membership, setMembership] = useState<Membership | null>(null);
  useEffect(() => {
    if (!enabled || !user) return;
    return watchMyMembership(user.uid, setMembership, () => setMembership(null));
  }, [enabled, user]);
  return enabled ? membership : null;
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

  const respond = async (uid: string, approve: boolean) => {
    if (!data?.teamId) return;
    setBusy(uid);
    try { await respondToJoinRequest(data.teamId, uid, approve); }
    catch { Alert.alert('Couldn’t update the request', NETWORK_ERROR); }
    finally { setBusy(null); }
  };

  const code = mine?.invite.code;
  return (
    <>
      {data?.sample ? <SampleTag /> : null}
      <Text style={styles.teamName}>{mine?.team.teamName ?? 'Your team'}</Text>
      <Text style={styles.teamMeta}>{mine ? [mine.team.school, mine.team.sport, mine.team.level].filter(Boolean).join(' · ') : mine === null ? 'Not set up yet.' : ' '}</Text>

      {readOnly ? null : <>
      <CapsLabel>Getting started</CapsLabel>
      <Rows>
        {mine === null ? (
          <ListRow detail="Your team code appears here once the team exists" label="Create your team" onPress={() => router.push('/team/create')} />
        ) : (
          <ListRow
            detail="Athletes enter it after they sign in. Tap to share."
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
                detail={`${m.role === 'trainer' ? 'Athletic trainer' : 'Athlete'}${m.email ? ` · ${m.email}` : ''}`}
                key={m.userId}
                label={m.displayName ?? 'Athlete'}
                trailing={
                  <View style={styles.decide}>
                    <Pressable accessibilityLabel={`Decline ${m.displayName ?? 'athlete'}`} accessibilityRole="button" disabled={busy === m.userId} onPress={() => respond(m.userId, false)} style={styles.decline}><Text style={styles.declineText}>DECLINE</Text></Pressable>
                    <Pressable accessibilityLabel={`Approve ${m.displayName ?? 'athlete'}`} accessibilityRole="button" disabled={busy === m.userId} onPress={() => respond(m.userId, true)} style={styles.approve}><Text style={styles.approveText}>APPROVE</Text></Pressable>
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
            {staff.map((m) => <ListRow detail="Athletic trainer" key={m.userId} label={m.displayName ?? 'Trainer'} />)}
          </Rows>
        </>
      ) : null}

      {active.length || !demo.enabled ? <SectionTitle title={`Athletes${active.length ? ` · ${active.length}` : ''}`} /> : null}
      {active.length ? (
        <Rows>
          {active.map((m) => (
            <ListRow detail="No band data yet" key={m.userId} label={m.displayName ?? 'Athlete'} onPress={() => router.push({ pathname: '/athlete-vitals', params: { id: m.userId, role: role === 'trainer' ? 'trainer' : 'coach' } })} />
          ))}
        </Rows>
      ) : demo.enabled ? null : (
        <Text style={styles.empty}>{roster === null && data?.teamId ? 'Loading roster…' : mine === null ? 'Create your team, then share its code to invite athletes.' : 'No athletes yet. Share your team code to invite them.'}</Text>
      )}

      {demo.enabled ? (
        <>
          <SectionTitle title={`Sample athletes · ${demo.members.length}`} />
          <SimulatedTag />
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
      <CapsLabel>Today</CapsLabel>
      <View style={styles.planHead}>
        <View style={[styles.zoneDot, { backgroundColor: latest ? (latest.zone === 'black' ? '#8E8E93' : ZONES[latest.zone].color) : Palette.inkFaint }]} />
        <View style={styles.flex}>
          <Text style={styles.planZone}>{latest ? ZONES[latest.zone].label : 'No reading yet'}</Text>
          <Text style={styles.planMeta}>{latest ? `${temp.value(latest.wbgtF)}${temp.unit} WBGT · ${zoneRange(latest.zone, uilClass)}` : 'Take a field reading to see today’s rules.'}</Text>
        </View>
      </View>

      <ZoneRules latest={latest} uilClass={uilClass} />

      <SectionTitle action="New" onAction={() => router.push('/plan-editor')} title="Practice plans" />
      <Rows>
        {plans.map((plan) => {
          const breaks = buildSchedule(plan).filter((block) => block.kind === 'rest').length;
          return (
            <ListRow
              detail={`${clockTime(plan.startMinutes, true)} · ${plan.lengthMinutes} min · ${plan.workMinutes}/${plan.restMinutes} · ${breaks} ${breaks === 1 ? 'break' : 'breaks'}`}
              key={plan.id}
              label={plan.name}
              onPress={() => router.push({ pathname: '/plan-editor', params: { id: plan.id } })}
              value={plan.id === active.id ? 'Today' : undefined}
              valueTone={Palette.coral}
            />
          );
        })}
      </Rows>
    </>
  );
}

/** What UIL requires for the latest reading's zone, as tiles, with the source. */
export function ZoneRules({ latest, uilClass }: { latest: FieldReading | null; uilClass: 2 | 3 }) {
  const guidance = latest ? UIL_GUIDANCE[latest.zone] : null;
  return (
    <>
      {guidance ? (
        <>
          <Text style={styles.summary}>{guidance.summary}</Text>
          <Tiles>
            <MetricTile label="Rest breaks" pill={`UIL Class ${uilClass}`} pillTone={Palette.inkMuted} unit={guidance.breaksPerHour ? 'per hr' : 'min/hr'} value={guidance.breaksPerHour ? `${guidance.breaksPerHour}+` : guidance.restMinutesPerHour ? String(guidance.restMinutesPerHour) : '--'} />
            <MetricTile label="Break length" unit="min" value={guidance.breakMinutes ? `${guidance.breakMinutes}+` : '--'} />
            <MetricTile label="Max practice" unit={guidance.maxPracticeMinutes ? 'hr' : undefined} value={guidance.maxPracticeMinutes ? String(guidance.maxPracticeMinutes / 60) : guidance.outdoorAllowed ? 'No limit' : 'None'} />
            <MetricTile label="Cooling zone" pill={guidance.coolingZoneRequired ? 'Required' : 'Optional'} pillTone={guidance.coolingZoneRequired ? Palette.warning : Palette.safe} value={guidance.coolingZoneRequired ? 'Tub' : '--'} />
          </Tiles>
          {guidance.football ? <ListRow detail={guidance.football} label="Football equipment" /> : null}
        </>
      ) : null}
      <Pressable accessibilityRole="link" onPress={() => Linking.openURL(UIL_SOURCE_URL)}>
        <Text style={styles.source}>Source: UIL WBGT activity guidelines {UIL_VERSION}. Your school’s plan may be stricter.</Text>
      </Pressable>

    </>
  );
}

/* ─────────────────────────────── Profile ─────────────────────────────── */

export function ProfileTab({ role }: { role: 'Coach' | 'Athletic trainer' | 'Athlete' }) {
  const { user } = useAuthSession();
  const member = useCoachData(role === 'Athlete' ? 'athlete' : role === 'Athletic trainer' ? 'trainer' : 'coach');
  const trainers = useTrainers(role === 'Athlete' ? member?.teamId ?? null : null);
  const mine = useMyTeam();
  const membership = useMembership(role !== 'Coach');
  const { bandConnected, celsius, demoTeam, practiceLiveActivity } = usePreferences();
  // Coaches read their own team; athletes and trainers their membership, which may still await approval.
  const teamName = role === 'Coach' ? mine?.team.teamName : membership?.status === 'declined' ? undefined : membership?.team?.teamName;
  const teamValue = teamName ? (membership?.status === 'pending' ? `${teamName} · waiting` : teamName) : 'None yet';
  const name = user?.displayName?.trim() || 'Your profile';
  const initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  const confirmSignOut = () =>
    Alert.alert('Log out of HeatSense?', undefined, [
      { style: 'cancel', text: 'Cancel' },
      { onPress: () => { if (firebaseAuth) signOut(firebaseAuth).catch(() => {}); router.replace('/welcome'); }, style: 'destructive', text: 'Log out' },
    ]);

  return (
    <>
      <View style={styles.identity}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
        <View style={styles.flex}>
          <Text style={styles.identityName}>{name}</Text>
          <Text style={styles.identityMeta}>{role}{teamName && membership?.status !== 'pending' ? ` · ${teamName}` : ''}</Text>
        </View>
      </View>

      <CapsLabel>Account</CapsLabel>
      <Rows>
        <ListRow label="Team" onPress={role === 'Coach' && mine === null ? () => router.push('/team/create') : undefined} value={teamValue} />
        {role !== 'Coach' && !member?.teamId && membership?.status !== 'pending' ? <ListRow detail="Enter the code from your coach" label="Join a team" onPress={() => router.push(role === 'Athlete' ? '/setup/athlete' : '/setup/trainer')} /> : null}
        {role === 'Athlete' ? <ListRow label="Athletic trainer" value={trainers.length ? trainers.map((t) => t.displayName ?? 'Trainer').join(', ') : 'None yet'} /> : null}
        {role === 'Athlete' ? (
          <ListRow label="HeatSense Band" onPress={() => router.push('/pair-band')} value={bandConnected ? 'Connected' : 'Not paired'} valueTone={bandConnected ? Palette.safe : Palette.inkMuted} />
        ) : null}
      </Rows>

      <CapsLabel>App settings</CapsLabel>
      <Rows>
        <ListRow detail="Made-up athletes with simulated band vitals" label="Demo team" trailing={<Switch accessibilityLabel="Show the simulated demo team" onValueChange={(value) => setPreference('demoTeam', value)} trackColor={{ true: Palette.coral }} value={demoTeam} />} />
        <ListRow label="Temperatures in °C" trailing={<Switch accessibilityLabel="Show temperatures in Celsius" onValueChange={(value) => setPreference('celsius', value)} trackColor={{ true: Palette.coral }} value={celsius} />} />
        <ListRow detail="Field zone and practice clock on the Lock Screen" label="Live Activity" trailing={<Switch accessibilityLabel="Show practice on the Dynamic Island and Lock Screen" onValueChange={(value) => setPreference('practiceLiveActivity', value)} trackColor={{ true: Palette.coral }} value={practiceLiveActivity} />} />
      </Rows>

      <CapsLabel>Support</CapsLabel>
      <Rows>
        <ListRow label="UIL heat chart" onPress={() => Linking.openURL(UIL_SOURCE_URL)} />
        <ListRow label="Data permissions" onPress={() => Alert.alert('Data permissions', role === 'Athlete' ? 'Your coach sees your name, team and whether your band is connected. Health answers and emergency contacts stay private to you.' : 'You see athletes on your roster and the practice records your team creates. Athletes’ health answers and emergency contacts stay private to them.')} />
        <ListRow label="Safety and limitations" onPress={() => Alert.alert('Safety and limitations', 'HeatSense supports, but doesn’t replace, your district’s emergency action plan or an athletic trainer’s judgment. It doesn’t diagnose heat illness.')} />
      </Rows>

      <Pressable accessibilityRole="button" onPress={confirmSignOut} style={({ pressed }) => [styles.logout, pressed && { opacity: 0.7 }]}>
        <Text style={styles.logoutText}>LOG OUT</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  teamName: { color: Palette.ink, fontSize: 28, fontWeight: '700', letterSpacing: -0.5, marginTop: 4 },
  teamMeta: { color: Palette.inkMuted, fontSize: 16, marginTop: 4 },
  decide: { flexDirection: 'row', gap: 8 },
  approve: { backgroundColor: Palette.coral, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  approveText: { color: '#1A0E07', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  decline: { borderColor: Palette.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  declineText: { color: Palette.inkMuted, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  empty: { color: Palette.inkMuted, fontSize: 16, lineHeight: 22 },
  planHead: { alignItems: 'center', flexDirection: 'row', gap: 14 },
  zoneDot: { borderRadius: 12, height: 24, width: 24 },
  planZone: { color: Palette.ink, fontSize: 26, fontWeight: '700' },
  planMeta: { color: Palette.inkMuted, fontSize: 15, marginTop: 2 },
  summary: { color: Palette.ink, fontSize: 17, lineHeight: 24, marginBottom: 14, marginTop: 16 },
  source: { color: Palette.inkMuted, fontSize: 13, lineHeight: 18, marginTop: 14, textDecorationLine: 'underline' },
  identity: { alignItems: 'center', flexDirection: 'row', gap: 16, marginTop: 8 },
  avatar: { alignItems: 'center', backgroundColor: Palette.coral, borderRadius: 34, height: 68, justifyContent: 'center', width: 68 },
  avatarText: { color: '#1A0E07', fontSize: 24, fontWeight: '800' },
  identityName: { color: Palette.ink, fontSize: 24, fontWeight: '700' },
  identityMeta: { color: Palette.inkMuted, fontSize: 15, marginTop: 2 },
  logout: { alignItems: 'center', alignSelf: 'center', borderColor: Palette.border, borderRadius: 999, borderWidth: 1, marginTop: 32, paddingHorizontal: 40, paddingVertical: 14 },
  logoutText: { color: Palette.ink, fontSize: 14, fontWeight: '800', letterSpacing: 1.4 },
});
