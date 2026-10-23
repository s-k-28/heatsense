import { useEffect, useRef } from 'react';

import { ZONES } from '@/lib/practice';
import { setActivityReading } from '@/lib/practice-activity';
import { UIL_GUIDANCE } from '@/lib/uil-wbgt';
import { alertZoneChange, scheduleRecheck } from '@/services/heat-alerts';
import { firebaseAuth } from '@/services/firebase';
import { useCoachData, type SessionRole } from '@/state/team-session';

/** Keeps this phone's heat alerts in step with the team's practice record. Mount once on the dashboard. */
export function useHeatAlerts(role: SessionRole) {
  const data = useCoachData(role);
  const live = Boolean(data && !data.sample);
  const session = data?.session ?? null;
  const readings = data?.readings ?? [];
  const latest = readings.at(-1) ?? null;
  const previous = readings.at(-2) ?? null;

  // Recheck reminders go to whoever logs readings: the coach and approved trainers.
  const logs = live && role !== 'athlete';
  const dueAt = session && !session.endedAt ? (latest?.measuredAt ?? session.startedAt).getTime() + session.recheckMinutes * 60_000 : null;
  useEffect(() => {
    if (!logs) return;
    scheduleRecheck(dueAt).catch(() => {});
  }, [dueAt, logs]);

  // The Lock Screen and Dynamic Island follow the team's real latest reading.
  const wbgtF = latest?.wbgtF;
  const zone = latest?.zone;
  useEffect(() => {
    if (!live) return;
    setActivityReading(wbgtF !== undefined && zone ? { wbgtF, zone } : null);
  }, [live, wbgtF, zone]);

  // A zone change is announced once per new reading, never for the readings already there on open,
  // and not to the person who just entered it.
  const seen = useRef<string | null>(null);
  useEffect(() => {
    if (!live || !latest) return;
    const first = seen.current === null;
    if (seen.current === latest.id) return;
    seen.current = latest.id;
    if (first || !previous || previous.zone === latest.zone || latest.recordedBy === firebaseAuth?.currentUser?.uid) return;
    const zone = ZONES[latest.zone].label;
    alertZoneChange(`The field moved into the ${zone} zone`, `${latest.wbgtF.toFixed(1)} °F WBGT. ${UIL_GUIDANCE[latest.zone].summary}`).catch(() => {});
  }, [latest, live, previous]);
}
