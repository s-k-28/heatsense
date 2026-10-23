import { useEffect, useState } from 'react';

import { SAMPLE_READING } from '@/lib/practice';
import { watchTeamVitals, type VitalsRecord } from '@/services/band-vitals';
import { watchActiveSession, watchReadings, type FieldReading, type PracticeSession } from '@/services/practice-sessions';
import { firebaseAuth, firestore } from '@/services/firebase';
import { getMyTeamInvite, watchMyMembership, type Membership } from '@/services/team-invites';
import { useAuthSession } from '@/state/auth-session';
import { watchRoster, watchTrainers, type RosterMember } from '@/services/team-roster';

// The team's open practice session, live: the coach's own team, or the team an athlete belongs to.
// Every Home and the Practice sheet read this, so they always agree on the latest reading.

export type TeamSession =
  | { status: 'loading' }
  | { status: 'no-team' }
  | { status: 'error' }
  | { status: 'ready'; teamId: string; session: PracticeSession | null; readings: FieldReading[] };

let cachedTeamId: string | null | undefined;

export type SessionRole = 'coach' | 'athlete' | 'trainer';

export function useTeamSession(role: SessionRole = 'coach'): TeamSession {
  const [teamId, setTeamId] = useState<string | null | undefined>(role === 'coach' ? cachedTeamId : undefined);
  const [session, setSession] = useState<PracticeSession | null | undefined>(undefined);
  const [readings, setReadings] = useState<FieldReading[]>([]);
  const [failed, setFailed] = useState(false);

  // Coaches find their team through their invite; athletes and trainers through an approved membership.
  useEffect(() => {
    if (role === 'coach') return;
    const uid = firebaseAuth?.currentUser?.uid;
    if (!uid) return;
    return watchMyMembership(uid, (membership) => setTeamId(membership?.status === 'active' ? membership.teamId : null), () => setTeamId(null));
  }, [role]);

  useEffect(() => {
    if (role !== 'coach' || cachedTeamId !== undefined) return;
    let live = true;
    getMyTeamInvite()
      .then((mine) => { cachedTeamId = mine?.invite.teamId ?? null; if (live) setTeamId(cachedTeamId); })
      .catch(() => { if (live) setTeamId(null); });
    return () => { live = false; };
  }, [role]);

  useEffect(() => {
    if (!teamId) return;
    return watchActiveSession(teamId, (next) => { setSession(next); setFailed(false); }, () => setFailed(true));
  }, [teamId]);

  useEffect(() => {
    if (!session) return;
    return watchReadings(session, setReadings, () => setFailed(true));
  }, [session]);

  // No signed-in member means no membership to wait for.
  if (teamId === undefined && role !== 'coach' && !firebaseAuth?.currentUser) return { status: 'no-team' };
  if (teamId === undefined) return { status: 'loading' };
  if (!teamId) return { status: 'no-team' };
  if (failed) return { status: 'error' };
  if (session === undefined) return { status: 'loading' };
  return { status: 'ready', teamId, session, readings: session ? readings : [] };
}

export type CoachData = { sample: boolean; teamId: string | null; session: PracticeSession | null; readings: FieldReading[] };

/**
 * What the coach tabs render: the live session, or, in a build with no Firebase at all, a sample
 * practice with three readings so the screens can be reviewed. Screens must label sample data wherever it shows.
 */
export function useCoachData(role: SessionRole = 'coach'): CoachData | null {
  const team = useTeamSession(role);
  // Fixed on mount, so the sample doesn't drift on every render.
  const [base] = useState(() => Date.now());
  if (team.status === 'ready') return { sample: false, teamId: team.teamId, session: team.session, readings: team.readings };
  if (!firestore && (team.status === 'no-team' || team.status === 'error')) {
    return {
      sample: true,
      teamId: null,
      session: { id: 'sample', teamId: 'sample', venue: SAMPLE_READING.location, uilClass: 3, recheckMinutes: 30, startedAt: new Date(base - 75 * 60_000), endedAt: null },
      // The afternoon heating up: Green at the start, Yellow by the second check, the latest not yet applied.
      readings: [
        { id: 'sample-1', wbgtF: 80.4, enteredValue: 80.4, enteredUnit: 'F', source: 'handheld', measuredAt: new Date(base - 72 * 60_000), zone: 'green', recordedBy: 'sample', acknowledgedAt: new Date(base - 71 * 60_000) },
        { id: 'sample-2', wbgtF: 82.6, enteredValue: 82.6, enteredUnit: 'F', source: 'handheld', measuredAt: new Date(base - 42 * 60_000), zone: 'yellow', recordedBy: 'sample', acknowledgedAt: new Date(base - 40 * 60_000) },
        { id: 'sample', wbgtF: SAMPLE_READING.wbgtF, enteredValue: SAMPLE_READING.wbgtF, enteredUnit: 'F', source: 'handheld', measuredAt: new Date(base - 12 * 60_000), zone: SAMPLE_READING.zone, recordedBy: 'sample', acknowledgedAt: null },
      ],
    };
  }
  if (team.status === 'no-team') return { sample: false, teamId: null, session: null, readings: [] };
  return null;
}

// Firestore keeps only each athlete's latest sample. Every sample this phone sees is kept here too,
// so a coach or trainer watching practice gets a trend. ponytail: in memory, since the app opened;
// 60 samples is 30 minutes at the band's 30-second cadence.
const HISTORY_LIMIT = 60;
const history = new Map<string, VitalsRecord[]>();

function remember(sessionId: string, records: VitalsRecord[]) {
  for (const r of records) {
    const key = `${sessionId}:${r.athleteUid}`;
    const list = history.get(key) ?? [];
    if (list.at(-1)?.sampledAt.getTime() === r.sampledAt.getTime()) continue;
    history.set(key, [...list, r].slice(-HISTORY_LIMIT));
  }
}

/** The samples this phone has seen for one athlete in a practice, oldest first. */
export function vitalsHistory(sessionId: string, athleteUid: string) {
  return history.get(`${sessionId}:${athleteUid}`) ?? [];
}

/** Coach and trainers: every athlete's latest band sample in the open practice, live. Empty without one. */
export function useTeamVitals(session: PracticeSession | null) {
  const [records, setRecords] = useState<VitalsRecord[]>([]);
  const open = session && !session.endedAt ? session : null;
  useEffect(() => {
    if (!open || !firestore) return;
    return watchTeamVitals(open, (next) => { remember(open.id, next); setRecords(next); }, () => setRecords([]));
  }, [open]);
  return open ? records : [];
}

/** An athlete's or trainer's own membership, live: approved, waiting, declined, or none (null). */
export function useMembership(enabled = true) {
  const { user } = useAuthSession();
  const [membership, setMembership] = useState<Membership | null | undefined>(undefined);
  useEffect(() => {
    if (!enabled || !user) return;
    return watchMyMembership(user.uid, setMembership, () => setMembership(null));
  }, [enabled, user]);
  return enabled && user ? membership : null;
}

/** Everyone who asked to join or was approved, live. Null while loading or without a team. */
export function useRoster(teamId: string | null) {
  const [members, setMembers] = useState<RosterMember[] | null>(null);
  useEffect(() => {
    if (!teamId) return;
    return watchRoster(teamId, setMembers, () => setMembers([]));
  }, [teamId]);
  return teamId ? members : null;
}

/** Re-renders on an interval so countdowns stay current. */
export function useNow(ms = 15_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(tick);
  }, [ms]);
  return now;
}

/** For athletes: the team's approved athletic trainers. Empty without a team or any trainer. */
export function useTrainers(teamId: string | null) {
  const [trainers, setTrainers] = useState<{ userId: string; displayName: string | null }[]>([]);
  useEffect(() => {
    if (!teamId) return;
    return watchTrainers(teamId, setTrainers, () => setTrainers([]));
  }, [teamId]);
  return teamId ? trainers : [];
}
