import { useCallback, useEffect, useMemo, useState } from 'react';

import { classifyWbgt } from '@/lib/uil-wbgt';
import { watchRecentSessions, type SessionSummary } from '@/services/practice-sessions';
import { useAuthSession } from '@/state/auth-session';

// Sample mode only, under the SAMPLE DATA tag: a season of practices so the history has a shape.
// Deterministic: practices most days but Sunday, heat building through the month.
const VENUES = ['Memorial Stadium', 'Practice field 2', 'Memorial Stadium', 'Indoor facility'];
const SAMPLE_HISTORY = Array.from({ length: 100 }, (_, i) => i + 1)
  .filter((daysAgo) => {
    const day = new Date(Date.now() - daysAgo * 86_400_000).getDay();
    return day !== 0 && daysAgo % 9 !== 4;
  })
  .map((daysAgo) => {
    const wbgtF = Math.round((83.5 + 4.2 * Math.sin(daysAgo / 3.1) + ((daysAgo * 7) % 5) * 0.55 - Math.min(daysAgo, 60) * 0.06) * 10) / 10;
    return { daysAgo, venue: VENUES[daysAgo % VENUES.length], minutes: 60 + ((daysAgo * 13) % 5) * 15, readingCount: 3 + (daysAgo % 4), wbgtF, zone: classifyWbgt(wbgtF, 3) ?? 'green' };
  });

/** The team's finished practices: real ones from the team, sample ones in sample mode. */
export function usePastSessionsState(teamId: string | null, sample: boolean, count = 10) {
  const { user } = useAuthSession();
  const uid = user?.uid ?? null;
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision((value) => value + 1), []);
  const identity = useMemo(() => ({ teamId, count, uid, sample, revision }), [teamId, count, uid, sample, revision]);
  const [past, setPast] = useState<{ identity: typeof identity; status: 'ready' | 'error'; list: SessionSummary[] | null } | null>(null);
  useEffect(() => {
    if (!teamId || sample || !uid) return;
    let active = true;
    const fail = () => { if (active) setPast({ identity, status: 'error', list: null }); };
    let stop: (() => void) | undefined;
    try {
      stop = watchRecentSessions(teamId, count,
        (list) => { if (active) setPast({ identity, status: 'ready', list }); }, fail);
    } catch { fail(); }
    return () => { active = false; stop?.(); };
  }, [count, identity, sample, teamId, uid]);
  if (!sample) {
    if (!teamId || !uid) return { status: 'idle' as const, data: [] as SessionSummary[], retry };
    if (past?.identity !== identity) return { status: 'loading' as const, data: null, retry };
    return { status: past.status, data: past.list, retry };
  }
  const day = 86_400_000;
  const data: SessionSummary[] = SAMPLE_HISTORY.slice(0, count).map((h, i) => {
    const startedAt = new Date(new Date().setHours(16, 0, 0, 0) - h.daysAgo * day);
    return {
      session: { id: `sample-${i}`, teamId: 'sample', venue: h.venue, uilClass: 3 as const, recheckMinutes: 30, startedAt, endedAt: new Date(startedAt.getTime() + h.minutes * 60_000) },
      readingCount: h.readingCount,
      peak: { wbgtF: h.wbgtF, zone: h.zone },
    };
  });
  return { status: 'ready' as const, data, retry };
}

/** Compatibility view: null while loading, empty on failure. Use state for error UI. */
export function usePastSessions(teamId: string | null, sample: boolean, count = 10) {
  const result = usePastSessionsState(teamId, sample, count);
  return result.status === 'error' ? [] : result.data;
}
