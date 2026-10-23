import { useEffect, useState } from 'react';

import type { Zone } from '@/lib/practice';
import { recentSessions, type SessionSummary } from '@/services/practice-sessions';

// Shown in sample mode only, under the SAMPLE DATA tag, so the history has something to show.
const SAMPLE_HISTORY: { daysAgo: number; venue: string; minutes: number; readingCount: number; wbgtF: number; zone: Zone }[] = [
  { daysAgo: 1, venue: 'Memorial Stadium', minutes: 95, readingCount: 5, wbgtF: 86.2, zone: 'yellow' },
  { daysAgo: 2, venue: 'Memorial Stadium', minutes: 60, readingCount: 4, wbgtF: 88.4, zone: 'orange' },
  { daysAgo: 4, venue: 'Practice field 2', minutes: 110, readingCount: 6, wbgtF: 80.9, zone: 'green' },
];

/** The team's finished practices: real ones from the team, sample ones in sample mode. */
export function usePastSessions(teamId: string | null, sample: boolean) {
  const [past, setPast] = useState<SessionSummary[] | null>(null);
  useEffect(() => {
    if (!teamId || sample) return;
    let live = true;
    recentSessions(teamId).then((list) => { if (live) setPast(list); }).catch(() => { if (live) setPast([]); });
    return () => { live = false; };
  }, [sample, teamId]);
  if (!sample) return teamId ? past : [];
  const day = 86_400_000;
  return SAMPLE_HISTORY.map((h, i) => {
    const startedAt = new Date(new Date().setHours(16, 0, 0, 0) - h.daysAgo * day);
    return {
      session: { id: `sample-${i}`, teamId: 'sample', venue: h.venue, uilClass: 3 as const, recheckMinutes: 30, startedAt, endedAt: new Date(startedAt.getTime() + h.minutes * 60_000) },
      readingCount: h.readingCount,
      peak: { wbgtF: h.wbgtF, zone: h.zone },
    };
  });
}
