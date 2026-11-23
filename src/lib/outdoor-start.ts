import type { Zone } from './uil-wbgt';

export const OUTDOOR_START_WINDOW_MINUTES = 15;
export const MAX_RECHECK_MINUTES = 30;

export type OutdoorStartCheck = 'missing' | 'stale' | 'invalid-time' | 'stop' | 'ready';

export function checkOutdoorStart(reading: { measuredAt: Date; zone: Zone } | null, now: number): OutdoorStartCheck {
  if (!reading) return 'missing';
  const age = now - reading.measuredAt.getTime();
  if (!Number.isFinite(age) || age < 0) return 'invalid-time';
  if (reading.zone === 'black') return 'stop';
  return age > OUTDOOR_START_WINDOW_MINUTES * 60_000 ? 'stale' : 'ready';
}

/** Legacy practice records started as soon as they were opened. */
export function outdoorStartTime(session: { startedAt: Date; outdoorStart?: { at: Date } | null }): Date | null {
  return session.outdoorStart === undefined ? session.startedAt : session.outdoorStart?.at ?? null;
}

export function outdoorPracticeDuration(session: Parameters<typeof outdoorStartTime>[0] & { endedAt: Date | null }): number | null {
  const start = outdoorStartTime(session);
  return start && session.endedAt ? Math.max(0, session.endedAt.getTime() - start.getTime()) : null;
}
