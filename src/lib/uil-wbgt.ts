// UIL WBGT activity guidelines, 2025-26. Transcribed from the official chart:
// https://www.uiltexas.org/files/athletics/25-26WBGTChart.png
// Values are WBGT in °F (not air temperature or heat index). The chart publishes one decimal place,
// so readings are rounded to 0.1 °F before they are compared. Kept free of app imports so
// `node scripts/check-uil-wbgt.ts` can test it directly.

export type Zone = 'green' | 'yellow' | 'orange' | 'red' | 'black';

/** UIL splits Texas into heat classes; each school uses the class UIL assigns to its region. */
export type UilClass = 2 | 3;

export const UIL_SOURCE_URL = 'https://www.uiltexas.org/files/athletics/25-26WBGTChart.png';
export const UIL_VERSION = '2025-26';

/** Lowest reading (°F, inclusive) that starts each zone above Green. */
const LOWER_BOUND: Record<UilClass, Record<Exclude<Zone, 'green'>, number>> = {
  3: { yellow: 82.0, orange: 87.0, red: 90.1, black: 92.1 },
  2: { yellow: 79.7, orange: 84.7, red: 87.7, black: 89.8 },
};

export type UilGuidance = {
  summary: string;
  /** Minimum separate rest breaks per hour, when the chart states a count. */
  breaksPerHour?: number;
  /** Minimum length of each break, in minutes. */
  breakMinutes?: number;
  /** Total rest per hour, when the chart states a total instead of a count. */
  restMinutesPerHour?: number;
  maxPracticeMinutes?: number;
  football?: string;
  coolingZoneRequired: boolean;
  outdoorAllowed: boolean;
};

export const UIL_GUIDANCE: Record<Zone, UilGuidance> = {
  green: {
    summary: 'Normal activities.',
    breaksPerHour: 3,
    breakMinutes: 3,
    coolingZoneRequired: false,
    outdoorAllowed: true,
  },
  yellow: {
    summary: 'Use discretion for intense or prolonged exercise.',
    breaksPerHour: 3,
    breakMinutes: 4,
    coolingZoneRequired: true,
    outdoorAllowed: true,
  },
  orange: {
    summary: 'Practice is limited to 2 hours.',
    breaksPerHour: 4,
    breakMinutes: 4,
    maxPracticeMinutes: 120,
    football: 'Helmet, shoulder pads and shorts only. If WBGT rises to Orange mid-practice, players may keep football pants on.',
    coolingZoneRequired: true,
    outdoorAllowed: true,
  },
  red: {
    summary: 'Practice is limited to 1 hour, with 20 minutes of rest spread through the hour.',
    restMinutesPerHour: 20,
    maxPracticeMinutes: 60,
    football: 'No protective equipment and no conditioning.',
    coolingZoneRequired: true,
    outdoorAllowed: true,
  },
  black: {
    summary: 'No outdoor workouts. Delay practice until WBGT is lower.',
    coolingZoneRequired: false,
    outdoorAllowed: false,
  },
};

/** Rejects values no field meter would report, so a typo can't produce a confident zone. */
export function isPlausibleWbgtF(value: number) {
  return Number.isFinite(value) && value >= 32 && value <= 120;
}

export function celsiusToF(celsius: number) {
  return (celsius * 9) / 5 + 32;
}

/** The UIL zone for a WBGT reading in °F. Returns null for implausible input. */
export function classifyWbgt(wbgtF: number, uilClass: UilClass): Zone | null {
  if (!isPlausibleWbgtF(wbgtF)) return null;
  const reading = Math.round(wbgtF * 10) / 10;
  const bounds = LOWER_BOUND[uilClass];
  if (reading >= bounds.black) return 'black';
  if (reading >= bounds.red) return 'red';
  if (reading >= bounds.orange) return 'orange';
  if (reading >= bounds.yellow) return 'yellow';
  return 'green';
}

/** Where each zone above Green starts, in °F, for drawing the zones behind a chart. */
export function zoneBounds(uilClass: UilClass) {
  return LOWER_BOUND[uilClass];
}

/** The reading (°F) where each zone above Green starts, for drawing zone bands on a chart. */
export function zoneThresholds(uilClass: UilClass) {
  return LOWER_BOUND[uilClass];
}

/** The chart's range for a zone, written the way UIL prints it. */
export function zoneRange(zone: Zone, uilClass: UilClass) {
  const b = LOWER_BOUND[uilClass];
  const below = (n: number) => (Math.round((n - 0.1) * 10) / 10).toFixed(1);
  switch (zone) {
    case 'green': return `< ${b.yellow.toFixed(1)} °F`;
    case 'yellow': return `${b.yellow.toFixed(1)}–${below(b.orange)} °F`;
    case 'orange': return `${b.orange.toFixed(1)}–${below(b.red)} °F`;
    case 'red': return `${b.red.toFixed(1)}–${below(b.black)} °F`;
    case 'black': return `≥ ${b.black.toFixed(1)} °F`;
  }
}

/**
 * Work/rest intervals that meet the chart's break minimums by spacing the breaks evenly through
 * the hour. Only possible when the chart gives a break count; Red gives a total, Black allows none.
 */
export function evenIntervals(zone: Zone) {
  const { breaksPerHour: n, breakMinutes: m } = UIL_GUIDANCE[zone];
  if (!n || !m) return null;
  return { workMinutes: (60 - n * m) / n, restMinutes: m };
}
