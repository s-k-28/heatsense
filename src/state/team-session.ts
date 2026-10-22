import { useEffect, useState } from 'react';

import { watchActiveSession, watchReadings, type FieldReading, type PracticeSession } from '@/services/practice-sessions';
import { getMyTeamInvite } from '@/services/team-invites';

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
