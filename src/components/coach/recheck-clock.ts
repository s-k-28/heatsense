export const RECHECK_MS = 30 * 60 * 1000;

// Absolute timestamps prevent a paused/backgrounded app from extending a recheck.
export function recheckState(measuredAt: number, now: number) {
  const remaining = Math.max(0, Math.min(RECHECK_MS, measuredAt + RECHECK_MS - now));
  const seconds = Math.ceil(remaining / 1000);
  return {
    remaining,
    fraction: remaining / RECHECK_MS,
    due: remaining === 0,
    label: `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`,
    ageMinutes: Math.max(0, Math.floor((now - measuredAt) / 60000)),
  };
}
