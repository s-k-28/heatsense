import { useEffect, useState } from 'react';

import { getMyTeamInvite, type TeamInvite, type TeamSummary } from '@/services/team-invites';

export type TeamState =
  | { status: 'loading' }
  | { status: 'ready'; team: TeamSummary; invite: TeamInvite }
  | { status: 'none' }
  | { status: 'error' };

/** The signed-in coach's team and its live invite code, from the same callable the invite screen uses. */
export function useCoachTeam(uid: string | null) {
  const [result, setResult] = useState<{ uid: string; attempt: number; state: TeamState } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!uid) return;
    let live = true;
    getMyTeamInvite()
      .then((found) => { if (live) setResult({ uid, attempt, state: found ? { status: 'ready', ...found } : { status: 'none' } }); })
      .catch(() => { if (live) setResult({ uid, attempt, state: { status: 'error' } }); });
    return () => { live = false; };
  }, [attempt, uid]);
  const state: TeamState = !uid ? { status: 'none' } : result && result.uid === uid && result.attempt === attempt ? result.state : { status: 'loading' };
  return { state, retry: () => setAttempt((value) => value + 1) };
}
