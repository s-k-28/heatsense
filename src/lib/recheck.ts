/** The first field reading is due when practice starts; later checks follow the measurement time. */
export function nextReadingDueAt(
  session: { startedAt: Date; recheckMinutes: number },
  latest: { measuredAt: Date } | null,
) {
  return latest
    ? latest.measuredAt.getTime() + session.recheckMinutes * 60_000
    : session.startedAt.getTime();
}

export function recheckStatus(
  session: { startedAt: Date; recheckMinutes: number },
  latest: { measuredAt: Date } | null,
  now: number,
) {
  const dueAt = nextReadingDueAt(session, latest);
  return { dueAt, overdue: now > dueAt, msLeft: dueAt - now };
}
