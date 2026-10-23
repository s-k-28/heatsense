import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BarChart, LineChart } from '@/components/ui/charts';
import { Face, Palette } from '@/constants/theme';
import { HISTORY_STEP_SEC } from '@/state/demo-team';

// The band's five signals, each drawn the way it's best read, like an activity's analysis page:
// heart rate as a trend plus time in zones, skin temperature against its usual range, sweat as
// bars, movement as a work/rest strip, blood oxygen on a gauge. One sample per 30 s; a signal the
// band didn't send has no card rather than an invented value.

/** One band sample: the simulator's always has every signal, a real band's may not. */
export type VitalSample = { heartRate: number; skinTempF: number | null; sweat: number | null; movement: number; spo2: number | null };
type Vitals = VitalSample;
const complete = (values: (number | null)[]): values is number[] => values.length > 1 && values.every((v) => v !== null);

/** How far back the history reaches, as an axis label. */
const since = (count: number) => `${Math.max(1, Math.round(((count - 1) * HISTORY_STEP_SEC) / 60))} min ago`;
const avg = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / Math.max(1, values.length);
const one = (v: number) => v.toFixed(1);
const whole = (v: number) => String(Math.round(v));

/** A few figures side by side, smaller than a page's headline stats. */
function Figures({ items }: { items: { label: string; value: string; unit?: string }[] }) {
  return (
    <View style={styles.figures}>
      {items.map((item) => (
        <View accessible accessibilityLabel={`${item.label} ${item.value}${item.unit ? ` ${item.unit}` : ''}`} key={item.label} style={styles.figure}>
          <Text style={styles.figureValue}>{item.value}{item.unit ? <Text style={styles.figureUnit}>{item.unit}</Text> : null}</Text>
          <Text style={styles.figureLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

function VitalCard({ title, now, unit, children }: { title: string; now: string; unit: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <View accessible accessibilityLabel={`${title}, now ${now} ${unit}`} style={styles.head}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.now}>{now}<Text style={styles.nowUnit}>{unit}</Text></Text>
      </View>
      {children}
    </View>
  );
}

// Heart-rate zones for a high-school athlete (max around 200 bpm), lowest to highest.
const ZONES = [
  { name: 'Z5', label: 'Max', min: 175, color: '#FF453A' },
  { name: 'Z4', label: 'Hard', min: 160, color: '#FF7A45' },
  { name: 'Z3', label: 'Tempo', min: 140, color: Palette.coral },
  { name: 'Z2', label: 'Easy', min: 120, color: '#C9A27E' },
  { name: 'Z1', label: 'Recovery', min: 0, color: '#6B7A82' },
];

function HeartRate({ history }: { history: Vitals[] }) {
  const hr = history.map((v) => v.heartRate);
  const share = ZONES.map((zone, i) => {
    const ceiling = i === 0 ? Infinity : ZONES[i - 1].min;
    return hr.filter((v) => v >= zone.min && v < ceiling).length / hr.length;
  });
  return (
    <VitalCard now={whole(hr.at(-1)!)} title="Heart rate" unit=" bpm">
      <Figures items={[{ label: 'Avg', value: whole(avg(hr)) }, { label: 'Max', value: whole(Math.max(...hr)) }, { label: 'Min', value: whole(Math.min(...hr)) }]} />
      <LineChart labels={[since(hr.length), 'Now']} max={190} min={60} summary={`Heart rate since ${since(hr.length)}, average ${whole(avg(hr))}`} tone={Palette.coral} values={hr} />
      <Text style={styles.sub}>Time in zones</Text>
      {ZONES.map((zone, i) => (
        <View accessible accessibilityLabel={`${zone.label} zone, ${Math.round(share[i] * 100)} percent`} key={zone.name} style={styles.zoneRow}>
          <Text style={styles.zoneName}>{zone.name}</Text>
          <Text style={styles.zoneLabel}>{zone.label}</Text>
          <View style={styles.zoneTrack}><View style={[styles.zoneFill, { backgroundColor: zone.color, width: `${Math.max(share[i] > 0 ? 3 : 0, share[i] * 100)}%` }]} /></View>
          <Text style={styles.zonePct}>{Math.round(share[i] * 100)}%</Text>
        </View>
      ))}
    </VitalCard>
  );
}

const USUAL_SKIN: [number, number] = [91, 95];

function SkinTemp({ t }: { t: number[] }) {
  const change = t.at(-1)! - t[0];
  return (
    <VitalCard now={one(t.at(-1)!)} title="Skin temp" unit="°F">
      <Figures items={[{ label: 'Avg', value: one(avg(t)), unit: '°' }, { label: 'Max', value: one(Math.max(...t)), unit: '°' }, { label: 'Change', value: `${change >= 0 ? '+' : ''}${one(change)}`, unit: '°' }]} />
      <LineChart band={USUAL_SKIN} format={(v) => v.toFixed(0)} labels={[since(t.length), 'Now']} max={97} min={89} summary={`Skin temperature since ${since(t.length)}, now ${one(t.at(-1)!)} degrees`} tone="#FFB347" values={t} />
      <View style={styles.legend}><View style={styles.legendSwatch} /><Text style={styles.legendText}>Usual range, {USUAL_SKIN[0]}–{USUAL_SKIN[1]}°F</Text></View>
    </VitalCard>
  );
}

function Sweat({ s }: { s: number[] }) {
  // 90-second buckets, so the bars show the sweat response building through work and easing in rest.
  const buckets = Array.from({ length: Math.ceil(s.length / 3) }, (_, i) => avg(s.slice(i * 3, i * 3 + 3)));
  return (
    <VitalCard now={one(s.at(-1)!)} title="Sweat (GSR)" unit=" µS">
      <Figures items={[{ label: 'Avg', value: one(avg(s)) }, { label: 'Peak', value: one(Math.max(...s)) }, { label: 'Low', value: one(Math.min(...s)) }]} />
      <BarChart labels={[since(s.length), 'Now']} summary={`Sweat level in 90-second steps, now ${one(s.at(-1)!)} microsiemens`} tone="#64D2FF" values={buckets} />
    </VitalCard>
  );
}

function Movement({ history }: { history: Vitals[] }) {
  const m = history.map((v) => v.movement);
  const active = m.filter((v) => v >= 40).length * HISTORY_STEP_SEC;
  return (
    <VitalCard now={whole(m.at(-1)!)} title="Movement" unit="%">
      <Figures items={[{ label: 'Active', value: String(Math.round(active / 60)), unit: ' min' }, { label: 'Resting', value: String(Math.round((m.length * HISTORY_STEP_SEC - active) / 60)), unit: ' min' }, { label: 'Avg', value: whole(avg(m)), unit: '%' }]} />
      <View accessible accessibilityLabel={`Work and rest since ${since(m.length)}: ${Math.round(active / 60)} minutes active`} style={styles.strip}>
        {m.map((v, i) => <View key={i} style={[styles.stripCell, { backgroundColor: v >= 40 ? Palette.coral : v >= 20 ? 'rgba(255,177,131,0.45)' : 'rgba(235,235,245,0.14)' }]} />)}
      </View>
      <View style={styles.stripAxis}><Text style={styles.legendText}>{since(m.length)}</Text><Text style={styles.legendText}>Now</Text></View>
    </VitalCard>
  );
}

const GAUGE: [number, number] = [90, 100];

function BloodOxygen({ o }: { o: number[] }) {
  const lo = Math.min(...o);
  const hi = Math.max(...o);
  const at = (v: number) => `${((v - GAUGE[0]) / (GAUGE[1] - GAUGE[0])) * 100}%` as const;
  return (
    <VitalCard now={whole(o.at(-1)!)} title="Blood oxygen" unit="%">
      <Figures items={[{ label: 'Avg', value: whole(avg(o)), unit: '%' }, { label: 'Low', value: whole(lo), unit: '%' }, { label: 'High', value: whole(hi), unit: '%' }]} />
      <View accessible accessibilityLabel={`Blood oxygen ranged ${lo} to ${hi} percent; 95 and above is typical`} style={styles.gauge}>
        <View style={styles.gaugeTrack}>
          <View style={[styles.gaugeSafe, { left: at(95) }]} />
          <View style={[styles.gaugeRange, { left: at(lo), width: `${Math.max(2, ((hi - lo) / (GAUGE[1] - GAUGE[0])) * 100)}%` }]} />
          <View style={[styles.gaugeMark, { left: at(o.at(-1)!) }]} />
        </View>
        <View style={styles.gaugeAxis}>
          <Text style={styles.legendText}>90%</Text><Text style={styles.legendText}>95%</Text><Text style={styles.legendText}>100%</Text>
        </View>
      </View>
    </VitalCard>
  );
}

/** All five signals for one athlete, one card each. */
export function VitalCards({ history }: { history: Vitals[] }) {
  const skin = history.map((v) => v.skinTempF);
  const sweat = history.map((v) => v.sweat);
  const spo2 = history.map((v) => v.spo2 ?? null);
  return (
    <View style={styles.cards}>
      <HeartRate history={history} />
      {complete(skin) ? <SkinTemp t={skin} /> : null}
      {complete(sweat) ? <Sweat s={sweat} /> : null}
      <Movement history={history} />
      {complete(spo2) ? <BloodOxygen o={spo2} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cards: { gap: 12 },
  card: { backgroundColor: Palette.surface, borderRadius: 16, padding: 18 },
  head: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between' },
  title: { color: Palette.ink, fontSize: 18, fontWeight: '600' },
  now: { color: Palette.ink, fontFamily: Face.figure, fontSize: 30, lineHeight: 34 },
  nowUnit: { color: Palette.inkMuted, fontFamily: Face.label, fontSize: 18 },
  figures: { flexDirection: 'row', gap: 12, marginTop: 10 },
  figure: { flex: 1 },
  figureValue: { color: Palette.ink, fontFamily: Face.figure, fontSize: 22, lineHeight: 26 },
  figureUnit: { color: Palette.inkMuted, fontFamily: Face.label, fontSize: 15 },
  figureLabel: { color: Palette.inkMuted, fontSize: 14, fontWeight: '500' },
  sub: { color: Palette.ink, fontSize: 15, fontWeight: '600', marginBottom: 8, marginTop: 18 },
  zoneRow: { alignItems: 'center', flexDirection: 'row', gap: 10, height: 28 },
  zoneName: { color: Palette.ink, fontFamily: Face.figure, fontSize: 16, width: 24 },
  zoneLabel: { color: Palette.inkMuted, fontSize: 14, width: 66 },
  zoneTrack: { backgroundColor: 'rgba(235,235,245,0.08)', borderRadius: 4, flex: 1, height: 10, overflow: 'hidden' },
  zoneFill: { borderRadius: 4, height: 10 },
  zonePct: { color: Palette.ink, fontFamily: Face.figure, fontSize: 16, textAlign: 'right', width: 40 },
  legend: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 8 },
  legendSwatch: { backgroundColor: 'rgba(48,209,88,0.35)', borderRadius: 3, height: 10, width: 16 },
  legendText: { color: Palette.inkMuted, fontSize: 13, fontWeight: '500' },
  strip: { borderRadius: 6, flexDirection: 'row', gap: 2, height: 34, marginTop: 16, overflow: 'hidden' },
  stripCell: { borderRadius: 2, flex: 1 },
  stripAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  gauge: { marginTop: 18 },
  gaugeTrack: { backgroundColor: 'rgba(235,235,245,0.08)', borderRadius: 7, height: 14, justifyContent: 'center' },
  gaugeSafe: { backgroundColor: 'rgba(48,209,88,0.18)', borderRadius: 7, bottom: 0, position: 'absolute', right: 0, top: 0 },
  gaugeRange: { backgroundColor: 'rgba(100,210,255,0.55)', borderRadius: 7, bottom: 2, position: 'absolute', top: 2 },
  gaugeMark: { backgroundColor: Palette.ink, borderRadius: 2, height: 22, marginLeft: -2, position: 'absolute', width: 4 },
  gaugeAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
});
