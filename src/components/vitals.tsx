import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { LineChart } from '@/components/ui/charts';
import { ListRow, MetricTile, Rows, Tiles } from '@/components/whoop-ui';
import { Palette } from '@/constants/theme';
import type { Activity } from '@/lib/band-packet';
import { DEFAULT_BODY_KG } from '@/lib/band-motion';
import { swap } from '@/lib/motion';
import { disconnectBand, isLive, reconnectLastBand, useBand } from '@/state/band-ble';
import type { DemoMember } from '@/state/demo-team';
import { DEMO_SPEED } from '@/state/demo-team';

// Band vitals, shown the same way everywhere: the coach's team list, the trainer's monitor, an
// athlete's detail screen and an athlete's own Band tab. All of it is simulated until the band
// firmware exists, and every view says so.

export function SimulatedTag() {
  return (
    <View accessibilityLabel="Simulated band data" accessible style={styles.tag}>
      <View style={styles.tagDot} />
      <Text style={styles.tagText}>SIMULATED BAND DATA · {DEMO_SPEED}× SPEED</Text>
    </View>
  );
}

const statusTone = (member: DemoMember) => (member.status === 'watch' ? Palette.warning : Palette.safe);
const statusLabel = (member: DemoMember) => (member.status === 'watch' ? 'Slow recovery' : 'Usual range');

/** One row per athlete: name, live heart rate, and whether recovery looks usual. */
export function TeamVitalsRows({ members, role = 'coach' }: { members: DemoMember[]; role?: 'coach' | 'trainer' }) {
  return (
    <Rows>
      {members.map((m) => (
        <ListRow
          detail={`${m.athlete.position} · ${m.vitals.phase === 'work' ? 'Working' : 'On break'} · ${statusLabel(m)}`}
          key={m.athlete.id}
          label={m.athlete.name}
          onPress={() => router.push({ pathname: '/athlete-vitals', params: { id: m.athlete.id, role } })}
          value={`${m.vitals.heartRate} bpm`}
          valueTone={statusTone(m)}
        />
      ))}
    </Rows>
  );
}

/** The full picture for one athlete: live heart rate, its last six minutes, and the other signals. */
export function VitalsDetail({ member }: { member: DemoMember }) {
  const reduced = useReducedMotion();
  const { vitals } = member;
  return (
    <>
      <SimulatedTag />
      <View style={styles.hero}>
        <Animated.Text entering={swap(reduced)} key={vitals.heartRate} style={styles.hr}>{vitals.heartRate}</Animated.Text>
        <Text style={styles.hrUnit}>BPM · {vitals.phase === 'work' ? 'WORKING' : 'ON BREAK'}</Text>
        <View style={[styles.pill, { borderColor: statusTone(member) }]}>
          <Text style={[styles.pillText, { color: statusTone(member) }]}>{statusLabel(member)}</Text>
        </View>
      </View>
      <LineChart
        labels={['6 min ago', 'Now']}
        max={190}
        min={60}
        summary={`Heart rate over the last six minutes, now ${vitals.heartRate} beats per minute`}
        tone={member.status === 'watch' ? Palette.warning : Palette.coral}
        values={member.history}
      />
      {member.status === 'watch' ? (
        <View style={styles.note}>
          <Text style={styles.noteTitle}>Heart rate is staying high through this break</Text>
          <Text style={styles.noteBody}>Check in with {member.athlete.name.split(' ')[0]}: shade, water, and how they feel. A trend to look at, not a diagnosis.</Text>
        </View>
      ) : null}
      <View style={styles.tiles}>
        <Tiles>
          <MetricTile label="Skin temp" unit="°F" value={vitals.skinTempF.toFixed(1)} />
          <MetricTile label="Sweat (GSR)" unit="µS" value={vitals.sweat.toFixed(1)} />
          <MetricTile label="Movement" unit="%" value={String(vitals.movement)} />
          <MetricTile label="Resting HR" unit="bpm" value={String(member.athlete.restingHr)} />
        </Tiles>
      </View>
      <Rows>
        <ListRow detail="MAX30102 optical sensor on the band" label="Heart rate source" />
        <ListRow detail="Simulated stream. Real readings arrive with the band firmware." label="Data" />
      </Rows>
    </>
  );
}

/** A connected HeatSense Band, live: the athlete's own heart rate and SpO2 from the band's sensor. */
export function LiveBandVitals() {
  const reduced = useReducedMotion();
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
  const activity = live ? reading?.activity ?? null : null;

  let status = 'Waiting for the first reading…';
  if (band.status !== 'connected') status = band.error ?? 'Band disconnected';
  else if (!live && age !== null) status = `No data for ${age}s. Is the band in range?`;
  else if (live && heartRate === null) status = 'Band on? Rest it snug against the skin and hold still.';
  else if (live) status = 'Live from your HeatSense Band';

  return (
    <>
      <View accessibilityLabel="Live band data, prototype sensor" accessible style={[styles.tag, { borderColor: Palette.safe }]}>
        <View style={[styles.tagDot, { backgroundColor: live ? Palette.safe : Palette.inkMuted }]} />
        <Text style={[styles.tagText, { color: Palette.safe }]}>LIVE BAND · PROTOTYPE SENSOR</Text>
      </View>
      <View style={styles.hero}>
        <Animated.Text entering={swap(reduced)} key={heartRate ?? 'none'} style={styles.hr}>{heartRate ?? '--'}</Animated.Text>
        <Text style={styles.hrUnit}>BPM · HEART RATE</Text>
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
        <Tiles>
          <MetricTile label="SpO2" unit={spo2 !== null ? '%' : undefined} value={spo2 !== null ? String(spo2) : '--'} />
          <MetricTile label="Updated" unit={age !== null ? 's ago' : undefined} value={age !== null ? String(age) : '--'} />
          <MetricTile label="Packets" value={reading ? String(reading.sequence) : '--'} />
          <MetricTile label="Battery" unit={reading?.battery != null ? '%' : undefined} value={reading?.battery != null ? String(reading.battery) : '--'} />
        </Tiles>
        {hasMotion ? (
          <View style={styles.motionTiles}>
            <Tiles>
              <MetricTile label="Steps" value={band.session.steps.toLocaleString()} />
              <MetricTile label="Cadence" unit={live ? 'spm' : undefined} value={live ? String(reading?.cadence ?? 0) : '--'} />
              <MetricTile label="Activity" value={activity ? ACTIVITY_LABEL[activity] : '--'} />
              <MetricTile label="Active energy" unit="kcal" value={String(Math.round(band.session.activeKcal))} />
            </Tiles>
          </View>
        ) : null}
      </View>
      <Rows>
        <ListRow detail={band.device?.name ?? 'HeatSense Band'} label="Band" value={band.status === 'connected' ? 'Connected' : 'Disconnected'} valueTone={band.status === 'connected' ? Palette.safe : Palette.inkMuted} />
        {band.status === 'connected'
          ? <ListRow destructive label="Disconnect band" onPress={disconnectBand} />
          : <ListRow label="Reconnect" onPress={reconnectLastBand} />}
        <ListRow detail="MAX30102 optical sensor. A prototype reading at rest, not a medical measurement." label="Heart rate source" />
        {hasMotion ? (
          <ListRow
            detail={`MPU6050 accelerometer and gyroscope. Totals since you connected: ${Math.round(band.session.activeSeconds / 60)} active min. Energy is an estimate above resting, assuming ${DEFAULT_BODY_KG} kg.`}
            label="Motion source"
          />
        ) : null}
      </Rows>
    </>
  );
}

const ACTIVITY_LABEL: Record<Activity, string> = { still: 'Still', active: 'Active', walking: 'Walking', running: 'Running' };

const styles = StyleSheet.create({
  tag: { alignItems: 'center', alignSelf: 'center', borderColor: Palette.info, borderRadius: 999, borderWidth: 1, flexDirection: 'row', gap: 6, marginBottom: 12, paddingHorizontal: 10, paddingVertical: 4 },
  tagDot: { backgroundColor: Palette.info, borderRadius: 3, height: 6, width: 6 },
  tagText: { color: Palette.info, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  hero: { alignItems: 'center', gap: 4, marginBottom: 12, marginTop: 4 },
  hr: { color: Palette.ink, fontSize: 72, fontVariant: ['tabular-nums'], fontWeight: '700', letterSpacing: -2 },
  hrUnit: { color: Palette.inkMuted, fontSize: 13, fontWeight: '700', letterSpacing: 1.4 },
  pill: { borderRadius: 999, borderWidth: 1, marginTop: 8, paddingHorizontal: 12, paddingVertical: 4 },
  pillText: { fontSize: 13, fontWeight: '700' },
  note: { backgroundColor: Palette.card, borderColor: Palette.warning, borderRadius: 16, borderWidth: 1, gap: 4, marginTop: 16, padding: 16 },
  noteTitle: { color: Palette.ink, fontSize: 16, fontWeight: '700' },
  noteBody: { color: Palette.inkMuted, fontSize: 15, lineHeight: 21 },
  tiles: { marginBottom: 20, marginTop: 20 },
  motionTiles: { marginTop: 12 },
  liveStatus: { color: Palette.inkMuted, fontSize: 13, marginTop: 6, textAlign: 'center' },
});
