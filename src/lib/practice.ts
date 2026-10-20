// Today's field conditions. One source for the dashboard card and the Dynamic Island, so the two
// can't disagree. These are sample readings until the field sensor feeds real ones.
export type Zone = 'green' | 'yellow' | 'orange' | 'red' | 'black';

export const ZONES: Record<Zone, { label: string; color: string; text: string }> = {
  green: { label: 'Green zone', color: '#30D158', text: '#30D158' },
  yellow: { label: 'Yellow zone', color: '#FFD60A', text: '#FFD60A' },
  orange: { label: 'Orange zone', color: '#FF9F0A', text: '#FF9F0A' },
  red: { label: 'Red zone', color: '#FF453A', text: '#FF453A' },
  // The Black zone's own color disappears on a dark screen, so its text stays white.
  black: { label: 'Black zone', color: '#000000', text: '#FFFFFF' },
};

export const TODAY: { zone: Zone; wbgtF: number } = { zone: 'orange', wbgtF: 84 };

/** Sample practice session: 72 minutes long, water every 10 minutes. */
export const PRACTICE_MINUTES = 72;
export const WATER_BREAK_MINUTES = 10;

export function formatWbgt(fahrenheit: number, celsius: boolean) {
  return celsius ? `${Math.round(((fahrenheit - 32) * 5) / 9)}°C` : `${Math.round(fahrenheit)}°F`;
}

/** Hourly WBGT samples from 7 AM up to the latest reading. There is no forecast, so the line stops at "now". */
export const SAMPLE_HOURLY_WBGT = [62, 64, 67, 71, 75, 79, 82, 84, 84];

/**
 * A field reading the dashboard can show. Only the built-in sample exists today, so every reading
 * says where it came from and screens must label anything that isn't live.
 */
export type FieldReading = {
  source: 'sample';
  wbgtF: number;
  zone: Zone;
  observedLabel: string;
  location: string;
  hourlyWbgtF: number[];
  guidance: string;
};

/** Work, rest, and water guidance for one practice. */
export type PracticePlan = { workMinutes: number; restMinutes: number; waterEveryMinutes: number; equipment: string; zone: Zone };

export const SAMPLE_READING: FieldReading = {
  source: 'sample',
  wbgtF: TODAY.wbgtF,
  zone: TODAY.zone,
  observedLabel: '4:10 PM',
  location: 'Memorial Stadium',
  hourlyWbgtF: SAMPLE_HOURLY_WBGT,
  guidance: 'Modify work and rest intervals before athletes take the field.',
};

export const SAMPLE_PLAN: PracticePlan = { workMinutes: 20, restMinutes: 10, waterEveryMinutes: WATER_BREAK_MINUTES, equipment: 'Off during breaks', zone: TODAY.zone };

/**
 * What the coach should do next, from the reading and plan we actually have.
 * - No reading: conditions have to be checked before anything else.
 * - A plan made for a different zone than the current reading: that plan needs another look.
 * - Otherwise: review (or prepare) the practice plan for these conditions.
 */
export type Readiness = 'check-conditions' | 'review-plan' | 'plan-needs-review';

export function readinessFor(reading: FieldReading | null, plan: PracticePlan | null): Readiness {
  if (!reading) return 'check-conditions';
  if (plan && plan.zone !== reading.zone) return 'plan-needs-review';
  return 'review-plan';
}

/**
 * An incident that needs the coach right now (sample data; null means all clear). The Dynamic Island
 * switches to a warning while one is open, and goes back once the coach acknowledges it.
 */
export const INCIDENT: { detail: string; title: string } | null = {
  title: 'Maya Chen needs a recovery check',
  detail: 'Heart rate and skin temperature stayed up through a low-movement break.',
};
