import { useEffect, useRef } from 'react';

import { DEMO_TEAM, recoveryStatus, vitalsAt } from '@/lib/band-simulator';
import { publishVitals } from '@/services/band-vitals';
import { bandSerial, isLive, useBand } from '@/state/band-ble';
import { demoSeconds } from '@/state/demo-team';
import { usePreferences } from '@/state/preferences';
import { useCoachData } from '@/state/team-session';

const EVERY_MS = 30_000;
// A HeatSense Band connected over Bluetooth (src/state/band-ble.ts) sends its real heart rate, SpO2
// and movement, labelled `band`. Without one, the athlete's band is simulated with the same model
// the demo team uses, labelled `simulated` all the way to the coach's screen.
const SELF = DEMO_TEAM[0];
// The band reports movement in milli-g with gravity removed; the team record keeps 0-100, so 1 g is 100.
const movementPercent = (milliG: number) => Math.min(100, Math.round(milliG / 10));
export const PAIRED_SERIAL = 'HS-02A7';

/** Athlete: while approved, paired and in an open practice, sends a band sample to the team every 30 s. */
export function useBandUplink(enabled: boolean) {
  const data = useCoachData('athlete');
  const { bandConnected } = usePreferences();
  const band = useBand();
  // The interval reads the latest packet through a ref, so a new packet every second doesn't restart it.
  const latest = useRef(band);
  useEffect(() => { latest.current = band; }, [band]);
  const realBand = band.status === 'connected';
  const session = enabled && data && !data.sample && (bandConnected || realBand) ? data.session : null;
  const zone = data?.readings.at(-1)?.zone ?? 'yellow';

  useEffect(() => {
    if (!session || session.endedAt) return;
    const send = () => {
      const now = latest.current;
      if (now.status === 'connected') {
        // A real band: send only what it measured, and nothing while it has no valid heart rate.
        const reading = now.reading;
        if (!reading?.heartRate || !isLive(now) || !now.device) return;
        publishVitals(session, {
          heartRate: reading.heartRate,
          skinTempF: null,
          sweat: null,
          movement: movementPercent(reading.motion),
          spo2: reading.spo2 !== null && reading.spo2 >= 70 ? reading.spo2 : null,
          recovery: 'unknown',
          source: 'band',
          serial: bandSerial(now.device.id),
          sampledAt: new Date(now.receivedAt ?? Date.now()),
        }).catch(() => {});
        return;
      }
      const t = demoSeconds(Date.now());
      const v = vitalsAt(SELF, t, zone);
      publishVitals(session, {
        heartRate: v.heartRate,
        skinTempF: Math.round(v.skinTempF * 10) / 10,
        sweat: Math.round(v.sweat * 10) / 10,
        movement: Math.round(v.movement),
        spo2: v.spo2,
        recovery: recoveryStatus(SELF, t, zone),
        source: 'simulated',
        serial: PAIRED_SERIAL,
        sampledAt: new Date(),
      }).catch(() => {});
    };
    send();
    const timer = setInterval(send, EVERY_MS);
    return () => clearInterval(timer);
  }, [session, zone]);
}
