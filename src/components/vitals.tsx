import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LineChart } from '@/components/ui/charts';
import { VitalCards } from '@/components/vital-cards';
import { ListRow, Rows } from '@/components/whoop-ui';
import { Face, Palette } from '@/constants/theme';
import { DEFAULT_BODY_KG } from '@/lib/band-motion';
import type { Activity } from '@/lib/band-packet';
import { disconnectBand, isLive, reconnectLastBand, useBand } from '@/state/band-ble';
import type { DemoMember } from '@/state/demo-team';
import { DEMO_SPEED } from '@/state/demo-team';

// Band vitals, shown the same way everywhere: the coach's team list, the trainer's monitor, an
// athlete's detail screen and an athlete's own Band tab. All of it is simulated until the band
// firmware exists, and every view says so. A HeatSense Band connected over Bluetooth gets its own
// live view, LiveBandVitals, labelled as a prototype sensor.

export function SimulatedTag() {
  return (
    <View accessibilityLabel="Simulated band data" accessible style={styles.tag}>
      <View style={styles.tagDot} />
      <Text style={styles.tagText}>Simulated band data · {DEMO_SPEED}× speed</Text>
    </View>
  );
}

const statusTone = (member: DemoMember) => (member.status === 'watch' ? Palette.warning : Palette.safe);
const statusLabel = (member: DemoMember) => (member.status === 'watch' ? 'Slow recovery' : 'Usual range');

/** The full picture for one athlete: live heart rate, then every band signal in its own card. */
export function VitalsDetail({ member }: { member: DemoMember }) {
  const { vitals } = member;
  return (
    <>
      <SimulatedTag />
      <View style={styles.hero}>
        <Text style={styles.hr}>{vitals.heartRate}</Text>
        <Text style={styles.hrUnit}>bpm · {vitals.phase === 'work' ? 'working' : 'on break'}</Text>
        <View style={styles.pill}>
          <View style={[styles.statusDot, { backgroundColor: statusTone(member) }]} />
          <Text style={styles.pillText}>{statusLabel(member)}</Text>
        </View>
      </View>
      {member.status === 'watch' ? (
        <View style={styles.note}>
          <Text style={styles.noteTitle}>Heart rate is staying high through this break</Text>
          <Text style={styles.noteBody}>Check in with {member.athlete.name.split(' ')[0]}: shade, water, and how they feel. A trend to look at, not a diagnosis.</Text>
        </View>
      ) : null}
      <VitalCards history={member.history} />
      <View style={styles.tiles}>
        <Rows>
          <ListRow label="Resting heart rate" value={`${member.athlete.restingHr} bpm`} />
        </Rows>
      </View>
    </>
  );
}

const ACTIVITY_LABEL: Record<Activity, string> = { still: 'Still', active: 'Active', walking: 'Walking', running: 'Running' };

/** A HeatSense Band connected over Bluetooth: the athlete's own heart rate, SpO2 and movement, live. */
export function LiveBandVitals() {
  const band = useBand();
  // Re-render every second so "updated Ns ago" and the live/stale state stay current.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  const live = isLive(band, now);
  const reading = band.reading;
  const heartRate = live ? reading?.heartRate ?? null : null;
  const spo2 = live ? reading?.spo2 ?? null : null;
  const age = band.receivedAt ? Math.round((now - band.receivedAt) / 1000) : null;
  const recent = band.history.filter((bpm) => bpm > 0).slice(-60);
  const hasMotion = reading?.steps != null;

  let status = 'Waiting for the first reading…';
  if (band.status !== 'connected') status = band.error ?? 'Band disconnected';
  else if (!live && age !== null) status = `No data for ${age}s. Is the band in range?`;
  else if (live && heartRate === null) status = 'Rest the sensor snug against your skin and hold still.';
  else if (live) status = 'Live from your HeatSense Band';

  return (
    <>
      <View accessibilityLabel="Live band data, prototype sensor" accessible style={styles.tag}>
        <View style={[styles.tagDot, { backgroundColor: live ? Palette.safe : Palette.inkMuted }]} />
        <Text style={styles.tagText}>Live band · prototype sensor</Text>
      </View>
      <View style={styles.hero}>
        <Text style={styles.hr}>{heartRate ?? '--'}</Text>
        <Text style={styles.hrUnit}>bpm · heart rate</Text>
        <Text style={styles.liveStatus}>{status}</Text>
      </View>
      {recent.length >= 2 ? (
        <LineChart
          labels={[`${recent.length}s ago`, 'Now']}
          max={Math.max(120, ...recent) + 10}
          min={Math.max(30, Math.min(...recent) - 10)}
          summary={`Heart rate over the last ${recent.length} seconds, now ${recent[recent.length - 1]} beats per minute`}
          tone={Palette.coral}
          values={recent}
        />
      ) : null}
      <View style={styles.tiles}>
        <Rows>
          <ListRow label="Blood oxygen" value={spo2 !== null ? `${spo2}%` : '--'} />
          {hasMotion ? <ListRow label="Steps" value={band.session.steps.toLocaleString()} /> : null}
          {hasMotion ? <ListRow label="Cadence" value={live && reading?.cadence != null ? `${reading.cadence} spm` : '--'} /> : null}
          {hasMotion ? <ListRow label="Activity" value={live && reading?.activity ? ACTIVITY_LABEL[reading.activity] : '--'} /> : null}
          {hasMotion ? <ListRow detail={`Above resting, assuming ${DEFAULT_BODY_KG} kg`} label="Active energy" value={`${Math.round(band.session.activeKcal)} kcal`} /> : null}
          <ListRow label="Updated" value={age !== null ? `${age}s ago` : '--'} />
        </Rows>
      </View>
      <Rows>
        <ListRow detail={band.device?.name ?? 'HeatSense Band'} label="Band" value={band.status === 'connected' ? 'Connected' : 'Disconnected'} valueTone={band.status === 'connected' ? Palette.safe : Palette.inkMuted} />
        {band.status === 'connected'
          ? <ListRow destructive label="Disconnect band" onPress={disconnectBand} />
          : <ListRow label="Reconnect" onPress={reconnectLastBand} />}
        <ListRow detail="MAX30102 optical sensor and MPU6050 motion sensor. Prototype readings, not medical measurements." label="Sensors" />
      </Rows>
    </>
  );
}

const styles = StyleSheet.create({
  tag: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 6, marginBottom: 12 },
  tagDot: { backgroundColor: Palette.info, borderRadius: 3, height: 6, width: 6 },
  tagText: { color: Palette.inkMuted, fontSize: 14, fontWeight: '500' },
  statusDot: { borderRadius: 5, height: 10, width: 10 },
  hero: { alignItems: 'flex-start', gap: 4, marginBottom: 12, marginTop: 4 },
  hr: { color: Palette.ink, fontFamily: Face.figure, fontSize: 112, lineHeight: 116 },
  hrUnit: { color: Palette.inkMuted, fontSize: 17, fontWeight: '500' },
  pill: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 10 },
  pillText: { color: Palette.ink, fontSize: 16, fontWeight: '600' },
  note: { backgroundColor: Palette.surface, borderRadius: 16, gap: 4, marginTop: 16, padding: 16 },
  noteTitle: { color: Palette.warning, fontSize: 17, fontWeight: '600' },
  noteBody: { color: Palette.inkMuted, fontSize: 15, lineHeight: 21 },
  tiles: { marginBottom: 20, marginTop: 20 },
  liveStatus: { color: Palette.inkMuted, fontSize: 15, marginTop: 6 },
});
