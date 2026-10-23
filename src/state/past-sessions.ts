import { useEffect, useState } from 'react';

import { classifyWbgt } from '@/lib/uil-wbgt';
import { recentSessions, type SessionSummary } from '@/services/practice-sessions';

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
export function usePastSessions(teamId: string | null, sample: boolean, count = 10) {
  const [past, setPast] = useState<SessionSummary[] | null>(null);
  useEffect(() => {
    if (!teamId || sample) return;
    let live = true;
    recentSessions(teamId, count).then((list) => { if (live) setPast(list); }).catch(() => { if (live) setPast([]); });
    return () => { live = false; };
  }, [count, sample, teamId]);
  if (!sample) return teamId ? past : [];
  const day = 86_400_000;
  return SAMPLE_HISTORY.slice(0, count).map((h, i) => {
    const startedAt = new Date(new Date().setHours(16, 0, 0, 0) - h.daysAgo * day);
    return {
      session: { id: `sample-${i}`, teamId: 'sample', venue: h.venue, uilClass: 3 as const, recheckMinutes: 30, startedAt, endedAt: new Date(startedAt.getTime() + h.minutes * 60_000) },
      readingCount: h.readingCount,
      peak: { wbgtF: h.wbgtF, zone: h.zone },
    };
  });
}
