// Turns the band's motion data into an energy estimate. The band reports what the athlete is doing
// (still, active, walking, running) and their cadence; each maps to a MET value (multiples of resting
// energy use) from the Compendium of Physical Activities. Active energy is the part above rest:
//   kcal per minute = (MET - 1) × 3.5 × body mass (kg) / 200
// This is an estimate for awareness, not a measurement. Free of app imports so
// `node scripts/check-band-packet.ts` can test it.

import type { Activity } from './band-packet.ts';

/** Used when the athlete hasn't entered a weight. */
export const DEFAULT_BODY_KG = 70;

export function metFor(activity: Activity | null, cadence: number | null): number {
  const spm = cadence ?? 0;
  switch (activity) {
    case 'running':
      return spm >= 170 ? 10.5 : 9;
    case 'walking':
      if (spm > 120) return 4.8; // brisk
      if (spm >= 100) return 3.8;
      return 3;
    case 'active':
      return 3; // drills, stretching, moving without steady steps
    default:
      return 1; // still: resting energy only
  }
}

/** Energy above rest for `seconds` at this MET, in kilocalories. */
export function activeKcal(met: number, seconds: number, bodyKg = DEFAULT_BODY_KG) {
  return (Math.max(0, met - 1) * 3.5 * bodyKg) / 200 / 60 * seconds;
}
