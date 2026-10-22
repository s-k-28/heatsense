import { useEffect, useState } from 'react';

import { SAMPLE_READING } from '@/lib/practice';
import { firestore } from '@/services/firebase';
import { watchActiveSession, watchReadings, type FieldReading, type PracticeSession } from '@/services/practice-sessions';
import { getMyTeamInvite } from '@/services/team-invites';
import { watchRoster, type RosterMember } from '@/services/team-roster';

// The coach's team and its open practice session, live. Home and the Practice sheet both read this,
// so they always agree on the latest reading.

export type TeamSession =
  | { status: 'loading' }
  | { status: 'no-team' }
  | { status: 'error' }
  | { status: 'ready'; teamId: string; session: PracticeSession | null; readings: FieldReading[] };

let cachedTeamId: string | null | undefined;

export function useTeamSession(): TeamSession {
  const [teamId, setTeamId] = useState<string | null | undefined>(cachedTeamId);
  const [session, setSession] = useState<PracticeSession | null | undefined>(undefined);
  const [readings, setReadings] = useState<FieldReading[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (cachedTeamId !== undefined) return;
    let live = true;
    getMyTeamInvite()
      .then((mine) => { cachedTeamId = mine?.invite.teamId ?? null; if (live) setTeamId(cachedTeamId); })
      .catch(() => { if (live) setTeamId(null); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!teamId) return;
    return watchActiveSession(teamId, (next) => { setSession(next); setFailed(false); }, () => setFailed(true));
  }, [teamId]);

  useEffect(() => {
    if (!session) return;
    return watchReadings(session, setReadings, () => setFailed(true));
  }, [session]);

  if (teamId === undefined) return { status: 'loading' };
  if (!teamId) return { status: 'no-team' };
  if (failed) return { status: 'error' };
  if (session === undefined) return { status: 'loading' };
  return { status: 'ready', teamId, session, readings: session ? readings : [] };
}

export type CoachData = { sample: boolean; teamId: string | null; session: PracticeSession | null; readings: FieldReading[] };

/**
 * What the coach tabs render: the live session, or, in a build with no Firebase at all, one sample
 * reading so the screens can be reviewed. Screens must label sample data wherever it shows.
 */
export function useCoachData(): CoachData | null {
  const team = useTeamSession();
  // Fixed on mount, so the sample doesn't drift on every render.
  const [base] = useState(() => Date.now());
  if (team.status === 'ready') return { sample: false, teamId: team.teamId, session: team.session, readings: team.readings };
  if (!firestore && (team.status === 'no-team' || team.status === 'error')) {
    return {
      sample: true,
      teamId: null,
      session: { id: 'sample', teamId: 'sample', venue: SAMPLE_READING.location, uilClass: 3, recheckMinutes: 30, startedAt: new Date(base - 40 * 60_000), endedAt: null },
      readings: [{ id: 'sample', wbgtF: SAMPLE_READING.wbgtF, enteredValue: SAMPLE_READING.wbgtF, enteredUnit: 'F', source: 'handheld', measuredAt: new Date(base - 12 * 60_000), zone: SAMPLE_READING.zone, recordedBy: 'sample', acknowledgedAt: null }],
    };
  }
  if (team.status === 'no-team') return { sample: false, teamId: null, session: null, readings: [] };
  return null;
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
