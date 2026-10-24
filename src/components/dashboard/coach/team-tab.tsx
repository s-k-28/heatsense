import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { SimulatedTag } from '@/components/band/vitals';
import { CapsLabel, ListRow, Rows, SampleTag, SectionTitle } from '@/components/ui/data-display';
import { Palette } from '@/constants/theme';
import { getMyTeamInvite, NETWORK_ERROR, respondToJoinRequest, type TeamInvite, type TeamSummary } from '@/services/team-invites';
import { useDemoTeam, type DemoMember } from '@/state/demo-team';
import { useCoachData, useRoster, type SessionRole } from '@/state/team-session';

// The coach's Team tab as it was at b5ae852: team name and code, join requests, staff, the athletes,
// and the demo team's live band vitals, each opening that athlete's detail screen.

function useMyTeam() {
  const [mine, setMine] = useState<{ team: TeamSummary; invite: TeamInvite } | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    getMyTeamInvite().then((value) => { if (live) setMine(value); }).catch(() => { if (live) setMine(null); });
    return () => { live = false; };
  }, []);
  return mine;
}

const statusTone = (member: DemoMember) => (member.status === 'watch' ? Palette.warning : Palette.safe);
const statusLabel = (member: DemoMember) => (member.status === 'watch' ? 'Slow recovery' : 'Usual range');

/** Each demo athlete's live heart rate, phase and recovery, opening their vitals. */
function TeamVitalsRows({ members, role = 'coach' }: { members: DemoMember[]; role?: 'coach' | 'trainer' }) {
  return (
    <Rows>
      {members.map((m) => (
        <ListRow
          detail={`${m.athlete.position} · ${m.vitals.phase === 'work' ? 'Working' : 'On break'} · ${statusLabel(m)}`}
          key={m.athlete.id}
          label={m.athlete.name}
          onPress={() => router.push({ pathname: '/athlete-vitals', params: { id: m.athlete.id, role } })}
          value={`${m.vitals.heartRate} bpm`}
          valueTone={statusTone(m)}
        />
      ))}
    </Rows>
  );
}

export function TeamTabClassic({ readOnly = false, role = 'coach' }: { readOnly?: boolean; role?: SessionRole }) {
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
      <Text style={styles.teamMeta}>{mine ? [mine.team.school, mine.team.sport, mine.team.level].filter(Boolean).join(' · ') : 'Create a team in setup to invite athletes.'}</Text>

      {readOnly ? null : <>
      <CapsLabel>Getting started</CapsLabel>
      <Rows>
        <ListRow
          detail="Athletes enter it after they sign in"
          label="Team code"
          onPress={code ? () => Share.share({ message: `Join ${mine!.team.teamName} on HeatSense with the code ${code}.` }) : undefined}
          value={code ? code.replace(/(\d{3})(\d{3})/, '$1 $2') : '------'}
        />
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

      <SectionTitle title={`Athletes${active.length ? ` · ${active.length}` : ''}`} />
      {active.length ? (
        <Rows>
          {active.map((m) => (
            <ListRow detail="No band data yet" key={m.userId} label={m.displayName ?? 'Athlete'} onPress={() => router.push({ pathname: '/athlete-vitals', params: { id: m.userId, role: role === 'trainer' ? 'trainer' : 'coach' } })} />
          ))}
        </Rows>
      ) : (
        <Text style={styles.empty}>{roster === null && data?.teamId ? 'Loading roster…' : 'No athletes yet. Share your team code to invite them.'}</Text>
      )}

      {demo.enabled ? (
        <>
          <SectionTitle title="Live vitals" />
          <SimulatedTag />
          <TeamVitalsRows members={demo.members} role={role === 'trainer' ? 'trainer' : 'coach'} />
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  teamName: { color: Palette.ink, fontSize: 28, fontWeight: '700', letterSpacing: -0.5, marginTop: 4 },
  teamMeta: { color: Palette.inkMuted, fontSize: 16, marginTop: 4 },
  decide: { flexDirection: 'row', gap: 8 },
  approve: { backgroundColor: Palette.coral, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  approveText: { color: '#1A0E07', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  decline: { borderColor: Palette.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  declineText: { color: Palette.inkMuted, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  empty: { color: Palette.inkMuted, fontSize: 16, lineHeight: 22 },
});
