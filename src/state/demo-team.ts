import { useEffect, useState } from 'react';

import { DEMO_TEAM, recoveryStatus, vitalsAt, type DemoAthlete, type DemoZone, type RecoveryStatus, type Vitals } from '@/lib/band-simulator';
import { usePreferences } from '@/state/preferences';

// The live demo team: simulated band signals for a few made-up athletes, ticking once a second.
// Practice time runs at 10× so a full work/rest cycle plays out in three minutes, and it starts
// late in a work block so the first recovery check arrives within a minute of opening the app.

export const DEMO_SPEED = 10;
const START_SECONDS = 17 * 60;
const HISTORY = 36; // samples behind "now", one per 10 simulated seconds → the last 6 minutes
const openedAt = Date.now();

export type DemoMember = { athlete: DemoAthlete; vitals: Vitals; status: RecoveryStatus; history: number[] };

/** Simulated practice time, in seconds, at a wall-clock moment. */
export function demoSeconds(now: number) {
  return START_SECONDS + ((now - openedAt) / 1000) * DEMO_SPEED;
}

export function useDemoTeam(zone: DemoZone): { enabled: boolean; members: DemoMember[]; seconds: number } {
  const { demoTeam } = usePreferences();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!demoTeam) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [demoTeam]);
  if (!demoTeam) return { enabled: false, members: [], seconds: 0 };
  const t = demoSeconds(now);
  const members = DEMO_TEAM.map((athlete) => ({
    athlete,
    vitals: vitalsAt(athlete, t, zone),
    status: recoveryStatus(athlete, t, zone),
    history: Array.from({ length: HISTORY }, (_, i) => vitalsAt(athlete, t - (HISTORY - 1 - i) * 10, zone).heartRate),
  }));
  return { enabled: true, members, seconds: t };
}
