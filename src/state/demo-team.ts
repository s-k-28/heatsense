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

export type DemoMember = { athlete: DemoAthlete; vitals: Vitals; status: RecoveryStatus; history: Vitals[] };

/** Simulated practice time, in seconds, at a wall-clock moment. */
export function demoSeconds(now: number) {
  return START_SECONDS + ((now - openedAt) / 1000) * DEMO_SPEED;
}

/** One athlete's signals now, plus every signal over the last six minutes. */
function simulate(athlete: DemoAthlete, t: number, zone: DemoZone): DemoMember {
  return {
    athlete,
    vitals: vitalsAt(athlete, t, zone),
    status: recoveryStatus(athlete, t, zone),
    history: Array.from({ length: HISTORY }, (_, i) => vitalsAt(athlete, t - (HISTORY - 1 - i) * 10, zone)),
  };
}

/** Wall-clock time, ticking once a second while `on`. */
function useTick(on: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [on]);
  return now;
}

export function useDemoTeam(zone: DemoZone): { enabled: boolean; members: DemoMember[]; seconds: number } {
  const { demoTeam } = usePreferences();
  const now = useTick(demoTeam);
  if (!demoTeam) return { enabled: false, members: [], seconds: 0 };
  const t = demoSeconds(now);
  return { enabled: true, members: DEMO_TEAM.map((athlete) => simulate(athlete, t, zone)), seconds: t };
}

/** The athlete's own paired band: the same simulated source the uplink sends to the team. */
export function useOwnBand(on: boolean, zone: DemoZone): DemoMember | null {
  const now = useTick(on);
  return on ? simulate(DEMO_TEAM[0], demoSeconds(now), zone) : null;
}
