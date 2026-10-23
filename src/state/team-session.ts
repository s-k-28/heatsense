import { useCallback, useEffect, useMemo, useState } from 'react';

import { SAMPLE_READING } from '@/lib/practice';
import { watchTeamVitals, type VitalsRecord } from '@/services/band-vitals';
import { watchActiveSession, watchReadings, type FieldReading, type PracticeSession } from '@/services/practice-sessions';
import { firebaseAuth, firestore } from '@/services/firebase';
import { getMyTeamInvite, watchMyMembership, type Membership } from '@/services/team-invites';
import { useAuthSession } from '@/state/auth-session';
import { watchRoster, watchTrainers, type RosterMember } from '@/services/team-roster';

// The team's open practice session, live: the coach's own team, or the team an athlete belongs to.
// Every Home and the Practice sheet read this, so they always agree on the latest reading.

export type TeamSession = (
  | { status: 'loading' }
  | { status: 'no-team' }
  | { status: 'error' }
  | { status: 'ready'; teamId: string; session: PracticeSession | null; readings: FieldReading[] }) & { retry?: () => void };

export type SessionRole = 'coach' | 'athlete' | 'trainer';
export type LiveStatus = 'idle' | 'loading' | 'ready' | 'error';
type WatchResult<T> = { status: LiveStatus; data: T | null; retry: () => void };
const NO_RETRY = () => {};
type Subscribe<T> = (next: (value: T) => void, error: () => void) => () => void;
const EMPTY_READINGS: FieldReading[] = [];
// Share only concurrent lookups. Persisted null/error answers can strand a newly created team.
const coachLookups = new Map<string, ReturnType<typeof getMyTeamInvite>>();
function lookupCoachTeam(uid: string) {
  const pending = coachLookups.get(uid);
  if (pending) return pending;
  const request = getMyTeamInvite();
  coachLookups.set(uid, request);
  const clear = () => { if (coachLookups.get(uid) === request) coachLookups.delete(uid); };
  request.then(clear, clear);
  return request;
}

/** A render must never expose a previous key while the new listener starts. */
function useKeyedWatch<T>(key: string | null, subscribe: Subscribe<T>): WatchResult<T> {
  // Identity also changes on A → disabled/B → A, so re-enabling cannot revive an old snapshot.
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision((value) => value + 1), []);
  const identity = useMemo(() => ({ key, revision }), [key, revision]);
  const [snapshot, setSnapshot] = useState<{ identity: typeof identity; status: 'ready' | 'error'; data: T | null } | null>(null);
  useEffect(() => {
    if (!key) return;
    let active = true;
    let stop: (() => void) | undefined;
    const fail = () => { if (active) setSnapshot({ identity, status: 'error', data: null }); };
    try {
      stop = subscribe((data) => { if (active) setSnapshot({ identity, status: 'ready', data }); }, fail);
    } catch { fail(); }
    return () => { active = false; stop?.(); };
  }, [identity, key, subscribe]);
  return !key ? { status: 'idle', data: null, retry }
    : snapshot?.identity === identity ? { status: snapshot.status, data: snapshot.data, retry }
      : { status: 'loading', data: null, retry };
}

export function useTeamSession(role: SessionRole = 'coach'): TeamSession {
  const { user } = useAuthSession();
  const uid = user?.uid ?? null;
  const ownerKey = uid ? JSON.stringify([uid, role]) : null;
  const lookup = useKeyedWatch<string | null>(ownerKey, useCallback((next, error) => {
    if (!uid) return () => {};
    if (role !== 'coach') {
      return watchMyMembership(uid, (membership) => next(membership?.status === 'active' ? membership.teamId : null), error);
    }
    let active = true;
    // Lookup failures are not evidence that the coach has no team. Do not cache failures/nulls.
    lookupCoachTeam(uid).then((mine) => { if (active) next(mine?.invite.teamId ?? null); }, () => { if (active) error(); });
    return () => { active = false; };
  }, [role, uid]));
  const teamId = lookup.status === 'ready' ? lookup.data : null;
  const teamKey = teamId && ownerKey ? JSON.stringify([ownerKey, teamId]) : null;
  const sessionResult = useKeyedWatch<PracticeSession | null>(teamKey, useCallback((next, error) => {
    return teamId ? watchActiveSession(teamId, next, error) : () => {};
  }, [teamId]));
  const session = sessionResult.status === 'ready' ? sessionResult.data : null;
  const sessionKey = session && teamKey ? JSON.stringify([teamKey, session.id]) : null;
  const readingsResult = useKeyedWatch<FieldReading[]>(sessionKey, useCallback((next, error) => {
    return session ? watchReadings(session, next, error) : () => {};
  }, [session]));
  const retry = () => {
    if (lookup.status === 'error') lookup.retry();
    else if (sessionResult.status === 'error') sessionResult.retry();
    else if (readingsResult.status === 'error') readingsResult.retry();
  };

  if (!uid) return { status: 'no-team' };
  if (lookup.status === 'error' || sessionResult.status === 'error' || readingsResult.status === 'error') return { status: 'error', retry };
  if (lookup.status !== 'ready') return { status: 'loading' };
  if (!teamId) return { status: 'no-team' };
  if (sessionResult.status !== 'ready' || (session && readingsResult.status !== 'ready')) return { status: 'loading' };
  return { status: 'ready', teamId, session, readings: session ? readingsResult.data ?? EMPTY_READINGS : EMPTY_READINGS };
}

export type CoachData = { sample: boolean; teamId: string | null; session: PracticeSession | null; readings: FieldReading[] };

/**
 * What the coach tabs render: the live session, or, in a build with no Firebase at all, a sample
 * practice with three readings so the screens can be reviewed. Screens must label sample data wherever it shows.
 */
export function useCoachDataState(role: SessionRole = 'coach'): { status: TeamSession['status']; data: CoachData | null; retry: () => void } {
  const team = useTeamSession(role);
  // Fixed on mount, so the sample doesn't drift on every render.
  const [base] = useState(() => Date.now());
  const status = team.status;
  const ready = team.status === 'ready' ? team : null;
  const teamId = ready?.teamId;
  const session = ready?.session;
  const readings = ready?.readings;
  const data = useMemo<CoachData | null>(() => {
    if (status === 'ready' && teamId) return { sample: false, teamId, session: session ?? null, readings: readings ?? EMPTY_READINGS };
    if (!firestore && (status === 'no-team' || status === 'error')) {
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
    if (status === 'no-team') return { sample: false, teamId: null, session: null, readings: EMPTY_READINGS };
    return null;
  }, [status, teamId, session, readings, base]);
  return { status: data?.sample ? 'ready' : team.status, data, retry: team.retry ?? NO_RETRY };
}

/** Compatibility data-only view. Use useCoachDataState when rendering loading/error states. */
export function useCoachData(role: SessionRole = 'coach'): CoachData | null {
  return useCoachDataState(role).data;
}

// Firestore keeps only each athlete's latest sample. Every sample this phone sees is kept here too,
// so a coach or trainer watching practice gets a trend. ponytail: in memory, since the app opened;
// 60 samples is 30 minutes at the band's 30-second cadence.
const HISTORY_LIMIT = 60;
type HistoryEntry = { uid: string; teamId: string; sessionId: string; athleteUid: string; records: VitalsRecord[] };
const history = new Map<string, HistoryEntry>();

function remember(uid: string, session: PracticeSession, records: VitalsRecord[]) {
  for (const r of records) {
    const key = JSON.stringify([uid, session.teamId, session.id, r.athleteUid]);
    const list = history.get(key)?.records ?? [];
    if (list.at(-1)?.sampledAt.getTime() === r.sampledAt.getTime()) continue;
    history.set(key, { uid, teamId: session.teamId, sessionId: session.id, athleteUid: r.athleteUid, records: [...list, r].slice(-HISTORY_LIMIT) });
  }
}

/** Samples for the signed-in viewer only. Optional teamId disambiguates team-local session ids. */
export function vitalsHistory(sessionId: string, athleteUid: string, teamId?: string) {
  const uid = firebaseAuth?.currentUser?.uid;
  if (!uid) return [];
  if (teamId) return history.get(JSON.stringify([uid, teamId, sessionId, athleteUid]))?.records ?? [];
  const matches = [...history.values()].filter((entry) => entry.uid === uid && entry.sessionId === sessionId && entry.athleteUid === athleteUid);
  // Older two-argument callers get no data rather than an ambiguous other team's history.
  return matches.length === 1 ? matches[0].records : [];
}

export function useTeamVitalsState(session: PracticeSession | null): WatchResult<VitalsRecord[]> {
  const { user } = useAuthSession();
  const uid = user?.uid ?? null;
  const open = session && !session.endedAt ? session : null;
  const key = uid && open && firestore ? JSON.stringify([uid, open.teamId, open.id]) : null;
  return useKeyedWatch(key, useCallback((next, error) => {
    if (!uid || !open || !firestore) return () => {};
    let active = true;
    const stop = watchTeamVitals(open, (records) => {
      if (!active) return;
      remember(uid, open, records);
      next(records);
    }, error);
    return () => { active = false; stop(); };
  }, [uid, open]));
}

/** Compatibility array view; useTeamVitalsState also exposes listener loading/error. */
export function useTeamVitals(session: PracticeSession | null) {
  return useTeamVitalsState(session).data ?? [];
}

/** An athlete's or trainer's own membership, live: approved, waiting, declined, or none. */
export function useMembership(enabled = true) {
  const { user } = useAuthSession();
  const uid = user?.uid ?? null;
  const result = useKeyedWatch<Membership | null>(enabled && uid ? uid : null, useCallback((next, error) => {
    return uid ? watchMyMembership(uid, next, error) : () => {};
  }, [uid]));
  return !enabled || !uid ? null : result.status === 'loading' ? undefined : result.data;
}

export function useRosterState(teamId: string | null): WatchResult<RosterMember[]> {
  const { user } = useAuthSession();
  const uid = user?.uid ?? null;
  return useKeyedWatch(uid && teamId ? JSON.stringify([uid, teamId]) : null, useCallback((next, error) => {
    return teamId ? watchRoster(teamId, next, error) : () => {};
  }, [teamId]));
}

/** Everyone who requested/was approved; null while loading or without a team. */
export function useRoster(teamId: string | null) {
  const result = useRosterState(teamId);
  return result.status === 'error' ? [] : result.data;
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
  const { user } = useAuthSession();
  const uid = user?.uid ?? null;
  const result = useKeyedWatch<{ userId: string; displayName: string | null }[]>(uid && teamId ? JSON.stringify([uid, teamId]) : null, useCallback((next, error) => {
    return teamId ? watchTrainers(teamId, next, error) : () => {};
  }, [teamId]));
  return result.data ?? [];
}
