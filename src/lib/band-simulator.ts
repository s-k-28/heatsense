// Simulated HeatSense Band signals for the demo team. There is no band firmware yet (see README,
// "HeatSense Band"), so this stands in for it: the same signals the band is designed to stream
// (MAX30102 heart rate and blood oxygen, skin temperature, GSR sweat level, MPU6050 movement), shaped by the
// practice's work/rest rhythm and the field's heat. Every screen that shows these labels them
// SIMULATED. Deterministic for a given time, so the demo is repeatable; free of app imports so
// `node scripts/check-band-simulator.ts` can test it.

export type DemoZone = 'green' | 'yellow' | 'orange' | 'red' | 'black';

export type DemoAthlete = {
  id: string;
  name: string;
  position: string;
  /** Resting heart rate, bpm. */
  restingHr: number;
  /** How quickly heart rate falls back during rest: 1 = typical, lower = slower. */
  recovery: number;
};

export type Vitals = {
  heartRate: number; // bpm
  skinTempF: number; // °F
  sweat: number; // GSR, microsiemens
  movement: number; // 0–100, share of max activity
  spo2: number; // blood oxygen, %, from the MAX30102's red/IR channels
  phase: 'work' | 'rest';
};

export type RecoveryStatus = 'usual' | 'watch';

export const DEMO_TEAM: DemoAthlete[] = [
  { id: 'demo-1', name: 'Jordan Reyes', position: 'Midfielder', restingHr: 62, recovery: 1 },
  { id: 'demo-2', name: 'Ava Thompson', position: 'Forward', restingHr: 58, recovery: 1.15 },
  // Recovers slowly: heart rate stays high through breaks, so the trainer's view has something to catch.
  { id: 'demo-3', name: 'Marcus Lee', position: 'Defender', restingHr: 66, recovery: 0.45 },
  { id: 'demo-4', name: 'Sofia Patel', position: 'Goalkeeper', restingHr: 60, recovery: 0.95 },
];

const HEAT_LOAD: Record<DemoZone, number> = { green: 0, yellow: 0.35, orange: 0.6, red: 0.85, black: 1 };

/** Smooth, repeatable wobble from a seed and time (seconds): two sines, no randomness. */
function wobble(seed: number, t: number, amount: number) {
  return amount * (0.6 * Math.sin(t / 7 + seed * 1.7) + 0.4 * Math.sin(t / 2.3 + seed * 3.1));
}

const seedOf = (id: string) => [...id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);

/**
 * One athlete's signals at `t` seconds into practice. Practice alternates work and rest blocks
 * (`workSec` / `restSec`); heart rate climbs in work and decays in rest at the athlete's recovery
 * speed; heat adds to heart rate, skin temperature and sweat.
 */
export function vitalsAt(athlete: DemoAthlete, t: number, zone: DemoZone, workSec = 20 * 60, restSec = 10 * 60): Vitals {
  const seed = seedOf(athlete.id);
  const cycle = workSec + restSec;
  const into = ((t % cycle) + cycle) % cycle;
  const phase: Vitals['phase'] = into < workSec ? 'work' : 'rest';
  const heat = HEAT_LOAD[zone];

  const workHr = 150 + heat * 18;
  const minutesIn = phase === 'work' ? into / 60 : (into - workSec) / 60;
  // Work: climbs toward the work rate over ~3 min. Rest: decays toward resting at the athlete's speed.
  const restFloor = athlete.restingHr + 30 + heat * 12;
  const peak = workHr + (1 - athlete.recovery) * 8;
  const hr = phase === 'work'
    ? restFloor + (peak - restFloor) * (1 - Math.exp(-minutesIn / 1.2))
    : restFloor + (peak - restFloor) * Math.exp(-minutesIn * 0.55 * athlete.recovery ** 2);

  const minutes = t / 60;
  const skin = 91.5 + heat * 3 + Math.min(1.6, minutes / 40) + (phase === 'work' ? 0.4 : 0);
  const sweat = 2 + heat * 9 + Math.min(4, minutes / 15) + (phase === 'work' ? 1.5 : 0);
  const move = phase === 'work' ? 72 : 12;

  return {
    heartRate: Math.round(hr + wobble(seed, t, 3)),
    skinTempF: Math.round((skin + wobble(seed + 1, t, 0.15)) * 10) / 10,
    sweat: Math.round((sweat + wobble(seed + 2, t, 0.4)) * 10) / 10,
    movement: Math.max(0, Math.min(100, Math.round(move + wobble(seed + 3, t, 8)))),
    // Healthy athletes sit at 95–99%; hard work and heat shave off a point or two.
    spo2: Math.round(98.2 - heat * 1.2 - (phase === 'work' ? 0.8 : 0) + wobble(seed + 4, t, 0.6)),
    phase,
  };
}

/**
 * Recovery check during a rest block: after 4 minutes of rest, heart rate should have come down at
 * least 60% of the way from its work peak to its resting level for these conditions. A trend worth
 * a look, not a diagnosis.
 */
export function recoveryStatus(athlete: DemoAthlete, t: number, zone: DemoZone, workSec = 20 * 60, restSec = 10 * 60): RecoveryStatus {
  const cycle = workSec + restSec;
  const into = ((t % cycle) + cycle) % cycle;
  if (into < workSec + 4 * 60) return 'usual';
  const restStart = t - (into - workSec);
  const peak = vitalsAt(athlete, restStart - 1, zone, workSec, restSec).heartRate;
  const floor = athlete.restingHr + 30 + HEAT_LOAD[zone] * 12;
  const now = vitalsAt(athlete, t, zone, workSec, restSec).heartRate;
  return (peak - now) / Math.max(1, peak - floor) >= 0.6 ? 'usual' : 'watch';
}
