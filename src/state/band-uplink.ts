import { useEffect } from 'react';

import { DEMO_TEAM, recoveryStatus, vitalsAt } from '@/lib/band-simulator';
import { publishVitals } from '@/services/band-vitals';
import { demoSeconds } from '@/state/demo-team';
import { usePreferences } from '@/state/preferences';
import { useCoachData } from '@/state/team-session';

const EVERY_MS = 30_000;
// Until the band's Bluetooth layer exists, the athlete's own band is simulated: the same model
// the demo team uses, labelled `simulated` all the way to the coach's screen.
// ponytail: swap this for the BLE source (decodePacket) when the firmware lands; the uplink stays.
const SELF = DEMO_TEAM[0];
export const PAIRED_SERIAL = 'HS-02A7';

/** Athlete: while approved, paired and in an open practice, sends a band sample to the team every 30 s. */
export function useBandUplink(enabled: boolean) {
  const data = useCoachData('athlete');
  const { bandConnected } = usePreferences();
  const session = enabled && data && !data.sample && bandConnected ? data.session : null;
  const zone = data?.readings.at(-1)?.zone ?? 'yellow';

  useEffect(() => {
    if (!session || session.endedAt) return;
    const send = () => {
      const t = demoSeconds(Date.now());
      const v = vitalsAt(SELF, t, zone);
      publishVitals(session, {
        heartRate: v.heartRate,
        skinTempF: Math.round(v.skinTempF * 10) / 10,
        sweat: Math.round(v.sweat * 10) / 10,
        movement: Math.round(v.movement),
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
