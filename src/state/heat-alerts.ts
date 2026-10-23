import { useEffect, useRef } from 'react';

import { ZONES } from '@/lib/practice';
import { nextReadingDueAt } from '@/lib/recheck';
import { setActivityReading } from '@/lib/practice-activity';
import { UIL_GUIDANCE } from '@/lib/uil-wbgt';
import { notifyNow, scheduleRecheck } from '@/services/heat-alerts';
import { firebaseAuth } from '@/services/firebase';
import { useBandUplink } from '@/state/band-uplink';
import { usePreferences } from '@/state/preferences';
import { useCoachData, useRoster, useTeamVitals, type SessionRole } from '@/state/team-session';

/** Keeps this phone in step with the team's practice: heat alerts, the Live Activity, and the athlete's band uplink. Mount once on the dashboard. */
export function useHeatAlerts(role: SessionRole) {
  const data = useCoachData(role);
  const { alertRecheck, alertZone, alertBand } = usePreferences();
  // An athlete's band reports to the team during practice (see band-uplink).
  useBandUplink(role === 'athlete');
  const live = Boolean(data && !data.sample);
  const session = data?.session ?? null;
  const readings = data?.readings ?? [];
  const latest = readings.at(-1) ?? null;
  const previous = readings.at(-2) ?? null;

  // Recheck reminders go to whoever logs readings: the coach and approved trainers.
  const logs = live && role !== 'athlete';
  const dueAt = session && !session.endedAt ? nextReadingDueAt(session, latest) : null;
  useEffect(() => {
    if (!logs) return;
    // Turning reminders off in Profile cancels the ones already scheduled.
    scheduleRecheck(alertRecheck ? dueAt : null).catch(() => {});
  }, [alertRecheck, dueAt, logs]);

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
    if (first || !alertZone || !previous || previous.zone === latest.zone || latest.recordedBy === firebaseAuth?.currentUser?.uid) return;
    const zone = ZONES[latest.zone].label;
    notifyNow(`The field moved into the ${zone} zone`, `${latest.wbgtF.toFixed(1)} °F WBGT. ${UIL_GUIDANCE[latest.zone].summary}`).catch(() => {});
  }, [alertZone, latest, live, previous]);

  // Coaches and trainers hear when an athlete's heart rate stops coming down during a break, once
  // per athlete per practice.
  const watching = role !== 'athlete' && live;
  const vitals = useTeamVitals(watching ? session : null);
  const roster = useRoster(watching ? data?.teamId ?? null : null);
  const warned = useRef(new Set<string>());
  useEffect(() => {
    if (!watching || !alertBand) return;
    vitals.filter((v) => v.recovery === 'watch' && !warned.current.has(v.athleteUid)).forEach((v) => {
      warned.current.add(v.athleteUid);
      const name = roster?.find((m) => m.userId === v.athleteUid)?.displayName ?? 'An athlete';
      notifyNow(`${name}: slow recovery`, `${v.heartRate} bpm and staying high through this break. Check in: shade, water, how they feel.`).catch(() => {});
    });
  }, [alertBand, roster, vitals, watching]);
}
