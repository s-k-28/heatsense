import { Segmented } from '@/components/motion/segmented';
import { Text } from '@/components/ui/text';
import { useAthletePalette, useAthleteStyles } from '@/components/athlete-appearance';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { Surface } from '@/components/ui/surface';
import { Fill } from '@/components/motion/fill';
import { BarChart, LineChart } from '@/components/ui/charts';
import { Face, Palette } from '@/constants/theme';
import { swap } from '@/lib/motion';
import { HISTORY_STEP_SEC } from '@/state/demo-team';
import { useTemperature } from '@/state/preferences';

// The band's five signals, each drawn the way it's best read, like an activity's analysis page:
// heart rate as a trend plus time in zones, skin temperature against its usual range, sweat as
// bars, movement as a work/rest strip, blood oxygen on a gauge. One sample per 30 s; a signal the
// band didn't send has no card rather than an invented value.

/** One band sample: the simulator's always has every signal, a real band's may not. */
export type VitalSample = { heartRate: number; skinTempF: number | null; sweat: number | null; movement: number; spo2: number | null; sampledAt?: Date };
type Vitals = VitalSample;
const complete = (values: (number | null)[]): values is number[] => values.length > 1 && values.every((v) => v !== null);

/** How far back the history reaches, as an axis label. */
const since = (count: number) => `${Math.max(1, Math.round(((count - 1) * HISTORY_STEP_SEC) / 60))} min ago`;
const avg = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / Math.max(1, values.length);
const one = (v: number) => v.toFixed(1);
const whole = (v: number) => String(Math.round(v));

/** A few figures side by side, smaller than a page's headline stats. */
function Figures({ items }: { items: { label: string; value: string; unit?: string }[] }) {
  const { fontScale } = useWindowDimensions();
  const styles = useAthleteStyles(baseStyles);
  return (
    <View style={styles.figures}>
      {items.map((item) => (
        <View accessible accessibilityLabel={`${item.label} ${item.value}${item.unit ? ` ${item.unit}` : ''}`} key={item.label} style={[styles.figure, fontScale > 1.3 && styles.figureStacked]}>
          <Text style={styles.figureValue}>{item.value}{item.unit ? <Text style={styles.figureUnit}>{item.unit}</Text> : null}</Text>
          <Text style={styles.figureLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

function VitalCard({ title, now, unit, children }: { title: string; now: string; unit: string; children: ReactNode }) {
  const styles = useAthleteStyles(baseStyles);
  const reduced = useReducedMotion();
  return (
    <Animated.View entering={swap(reduced)}><Surface style={styles.card}>
      <View accessible accessibilityLabel={`${title}, now ${now} ${unit}`} style={styles.head}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.now}>{now}<Text style={styles.nowUnit}>{unit}</Text></Text>
      </View>
      {children}
    </Surface></Animated.View>
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

function HeartRate({ history, startLabel }: { history: Vitals[]; startLabel: string }) {
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale > 1.25;
  const Palette = useAthletePalette();
  const styles = useAthleteStyles(baseStyles);
  const hr = history.map((v) => v.heartRate);
  const share = ZONES.map((zone, i) => {
    const ceiling = i === 0 ? Infinity : ZONES[i - 1].min;
    return hr.filter((v) => v >= zone.min && v < ceiling).length / hr.length;
  });
  return (
    <VitalCard now={whole(hr.at(-1)!)} title="Heart rate" unit=" bpm">
      <Figures items={[{ label: 'Avg', value: whole(avg(hr)) }, { label: 'Max', value: whole(Math.max(...hr)) }, { label: 'Min', value: whole(Math.min(...hr)) }]} />
      <LineChart labels={[startLabel, 'Now']} max={190} min={60} summary={`Heart rate from ${startLabel}, average ${whole(avg(hr))}`} tone={Palette.coral} values={hr} />
      <Text style={styles.sub}>Time in estimated zones</Text>
      {ZONES.map((zone, i) => (
        <View accessible accessibilityLabel={`${zone.label} zone, ${Math.round(share[i] * 100)} percent`} key={zone.name} style={[styles.zoneRow, stacked && styles.zoneRowStacked]}>
          <View style={[styles.zoneLabels, stacked && styles.zoneLabelsWide]}>
          <Text style={[styles.zoneName, stacked && styles.zoneTextLarge]}>{zone.name}</Text>
          <Text style={[styles.zoneLabel, stacked && styles.zoneLabelLarge]}>{zone.label}</Text>
          {stacked ? <Text style={[styles.zonePct, styles.zoneTextLarge]}>{Math.round(share[i] * 100)}%</Text> : null}
          </View>
          <Fill color={zone.color} delay={i * 50} height={10} progress={Math.max(share[i] > 0 ? 0.03 : 0, share[i])} radius={4} style={styles.zoneBar} />
          {!stacked ? <Text style={styles.zonePct}>{Math.round(share[i] * 100)}%</Text> : null}
        </View>
      ))}
    </VitalCard>
  );
}

const SIMULATED_SKIN: [number, number] = [91, 95];

function SkinTemp({ t, simulated, startLabel }: { t: number[]; simulated: boolean; startLabel: string }) {
  const styles = useAthleteStyles(baseStyles);
  const temp = useTemperature();
  const values = t.map((v) => temp.precise(v));
  const change = values.at(-1)! - values[0];
  const reference: [number, number] = [temp.precise(SIMULATED_SKIN[0]), temp.precise(SIMULATED_SKIN[1])];
  return (
    <VitalCard now={one(values.at(-1)!)} title="Skin temp" unit={temp.unit}>
      <Figures items={[{ label: 'Avg', value: one(avg(values)), unit: '°' }, { label: 'Max', value: one(Math.max(...values)), unit: '°' }, { label: 'Change', value: `${change >= 0 ? '+' : ''}${one(change)}`, unit: '°' }]} />
      <LineChart band={simulated ? reference : undefined} format={(v) => v.toFixed(0)} labels={[startLabel, 'Now']} max={Math.max(temp.precise(97), ...values)} min={Math.min(temp.precise(89), ...values)} summary={`Skin temperature from ${startLabel}, now ${one(values.at(-1)!)} ${temp.unit}`} tone="#FFB347" values={values} />
      {simulated ? <View style={styles.legend}><View style={styles.legendSwatch} /><Text style={styles.legendText}>Simulation reference, {reference[0]}–{reference[1]}{temp.unit}</Text></View> : <Text style={styles.legendText}>Personal baseline has not been established.</Text>}
    </VitalCard>
  );
}

function Sweat({ s, startLabel }: { s: number[]; startLabel: string }) {
  // 90-second buckets, so the bars show the sweat response building through work and easing in rest.
  const buckets = Array.from({ length: Math.ceil(s.length / 3) }, (_, i) => avg(s.slice(i * 3, i * 3 + 3)));
  return (
    <VitalCard now={one(s.at(-1)!)} title="Sweat (GSR)" unit=" µS">
      <Figures items={[{ label: 'Avg', value: one(avg(s)) }, { label: 'Peak', value: one(Math.max(...s)) }, { label: 'Low', value: one(Math.min(...s)) }]} />
      <BarChart labels={[startLabel, 'Now']} summary={`Sweat level in groups of three samples, now ${one(s.at(-1)!)} microsiemens`} tone="#64D2FF" values={buckets} />
    </VitalCard>
  );
}

function Movement({ history, simulated, startLabel }: { history: Vitals[]; simulated: boolean; startLabel: string }) {
  const Palette = useAthletePalette();
  const styles = useAthleteStyles(baseStyles);
  const m = history.map((v) => v.movement);
  const active = m.filter((v) => v >= 40).length * HISTORY_STEP_SEC;
  return (
    <VitalCard now={whole(m.at(-1)!)} title="Movement" unit="%">
      <Figures items={[{ label: simulated ? 'Active' : 'Active samples', value: String(simulated ? Math.round(active / 60) : m.filter((v) => v >= 40).length), unit: simulated ? ' min' : undefined }, { label: simulated ? 'Resting' : 'Rest samples', value: String(simulated ? Math.round((m.length * HISTORY_STEP_SEC - active) / 60) : m.filter((v) => v < 40).length), unit: simulated ? ' min' : undefined }, { label: 'Avg', value: whole(avg(m)), unit: '%' }]} />
      <View accessible accessibilityLabel={`Work and rest samples from ${startLabel}`} style={styles.strip}>
        {m.map((v, i) => <View key={i} style={[styles.stripCell, { backgroundColor: v >= 40 ? Palette.coral : v >= 20 ? 'rgba(255,177,131,0.45)' : 'rgba(235,235,245,0.14)' }]} />)}
      </View>
      <View style={styles.stripAxis}><Text style={styles.legendText}>{startLabel}</Text><Text style={styles.legendText}>Now</Text></View>
    </VitalCard>
  );
}

const GAUGE: [number, number] = [90, 100];

function BloodOxygen({ o }: { o: number[] }) {
  const styles = useAthleteStyles(baseStyles);
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

/** A signal list and one selected analysis, shared by the Band tab and staff detail screen. */
export type BandSignal = 'heart' | 'skin' | 'sweat' | 'movement' | 'oxygen';

export function VitalCards({ history, simulated = false, selectedSignal, onSignalChange, previewHeartRate = false }: { history: Vitals[]; simulated?: boolean; selectedSignal?: BandSignal; onSignalChange?: (signal: BandSignal) => void; previewHeartRate?: boolean }) {
  const styles = useAthleteStyles(baseStyles);
  const [localSelected, setLocalSelected] = useState<BandSignal>('heart');
  const selected = selectedSignal ?? localSelected;
  const setSelected = (signal: BandSignal) => { setLocalSelected(signal); onSignalChange?.(signal); };
  const temp = useTemperature();
  const skin = history.map((v) => v.skinTempF);
  const sweat = history.map((v) => v.sweat);
  const spo2 = history.map((v) => v.spo2 ?? null);
  const startLabel = history[0]?.sampledAt ? history[0].sampledAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : simulated ? since(history.length) : 'Earlier samples';
  const latest = history.at(-1);
  if (!latest) return null;
  const signals = [
    { id: 'heart', label: 'Heart rate', value: `${whole(latest.heartRate)} bpm`, available: true },
    { id: 'skin', label: 'Skin temp', value: latest.skinTempF === null ? '—' : `${one(temp.precise(latest.skinTempF))}${temp.unit}`, available: complete(skin) },
    { id: 'sweat', label: 'Sweat (GSR)', value: latest.sweat === null ? '—' : `${one(latest.sweat)} µS`, available: complete(sweat) },
    { id: 'movement', label: 'Movement', value: `${whole(latest.movement)}%`, available: true },
    { id: 'oxygen', label: 'Blood oxygen', value: latest.spo2 === null ? '—' : `${whole(latest.spo2)}%`, available: complete(spo2) },
  ].filter((s) => s.available);
  const active = signals.some((s) => s.id === selected) ? selected : 'heart';
  return (
    <View style={styles.cards}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityLabel="Band signals">
        <Segmented size="sm" itemWidth={112} value={active} highlightedKey={previewHeartRate ? 'heart' : undefined} onChange={setSelected} options={signals.map(signal => ({ key: signal.id as BandSignal, label: signal.label === 'Sweat (GSR)' ? 'Sweat' : signal.label, accessibilityLabel: `${signal.label}, ${signal.value}` }))} />
      </ScrollView>
      {active === 'heart' ? <HeartRate history={history} startLabel={startLabel} /> : null}
      {active === 'skin' && complete(skin) ? <SkinTemp simulated={simulated} startLabel={startLabel} t={skin} /> : null}
      {active === 'sweat' && complete(sweat) ? <Sweat s={sweat} startLabel={startLabel} /> : null}
      {active === 'movement' ? <Movement history={history} simulated={simulated} startLabel={startLabel} /> : null}
      {active === 'oxygen' && complete(spo2) ? <BloodOxygen o={spo2} /> : null}
    </View>
  );
}

const baseStyles = StyleSheet.create({
  signalPreview: { backgroundColor: Palette.coralSoft, borderColor: Palette.coral, borderRadius: 6 },
  signalTabs: { gap: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Palette.border },
  signalTab: { minHeight: 48, minWidth: 44, justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent', paddingVertical: 10 },
  signalTabOn: { borderBottomColor: Palette.coral },
  signalLabel: { color: Palette.inkMuted, fontSize: 16, fontWeight: '500' },
  signalLabelOn: { color: Palette.ink, fontWeight: '600' },
  cards: { gap: 0 },
  card: { marginTop: 20, padding: 20 },
  head: { alignItems: 'baseline', flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  title: { color: Palette.ink, fontSize: 18, fontWeight: '600' },
  now: { color: Palette.ink, fontFamily: Face.figure, fontSize: 52, lineHeight: 58 },
  nowUnit: { color: Palette.inkMuted, fontFamily: Face.label, fontSize: 18 },
  figures: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  figure: { flexGrow: 1, flexBasis: 84 },
  figureStacked: { flexBasis: '100%' },
  figureValue: { color: Palette.ink, fontFamily: Face.figure, fontSize: 22, lineHeight: 26 },
  figureUnit: { color: Palette.inkMuted, fontFamily: Face.label, fontSize: 15 },
  figureLabel: { color: Palette.inkMuted, fontSize: 14, fontWeight: '500' },
  sub: { color: Palette.ink, fontSize: 15, fontWeight: '600', marginBottom: 8, marginTop: 18 },
  zoneRow: { alignItems: 'center', flexDirection: 'row', gap: 10, minHeight: 36, paddingVertical: 4 },
  zoneRowStacked: { alignItems: 'stretch', flexDirection: 'column', gap: 8, paddingVertical: 8 },
  zoneLabels: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  zoneLabelsWide: { alignSelf: 'stretch' },
  zoneTextLarge: { width: 'auto', flexShrink: 1 },
  zoneLabelLarge: { width: 'auto', flex: 1 },
  zoneName: { color: Palette.ink, fontFamily: Face.figure, fontSize: 16, width: 24 },
  zoneLabel: { color: Palette.inkMuted, fontSize: 14, width: 66 },
  zoneBar: { flex: 1 },
  zonePct: { color: Palette.ink, fontFamily: Face.figure, fontSize: 16, textAlign: 'right', width: 40 },
  legend: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  legendSwatch: { backgroundColor: 'rgba(48,209,88,0.35)', borderRadius: 3, height: 10, width: 16 },
  legendText: { color: Palette.inkMuted, flexShrink: 1, fontSize: 13, fontWeight: '500' },
  strip: { borderRadius: 6, flexDirection: 'row', gap: 2, height: 34, marginTop: 16, overflow: 'hidden' },
  stripCell: { borderRadius: 2, flex: 1 },
  stripAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  gauge: { marginTop: 18 },
  gaugeTrack: { backgroundColor: 'rgba(235,235,245,0.08)', borderRadius: 7, height: 14, justifyContent: 'center' },
  gaugeSafe: { backgroundColor: 'rgba(48,209,88,0.18)', borderRadius: 7, bottom: 0, position: 'absolute', right: 0, top: 0 },
  gaugeRange: { backgroundColor: 'rgba(100,210,255,0.55)', borderRadius: 7, bottom: 2, position: 'absolute', top: 2 },
  gaugeMark: { backgroundColor: '#F6F3EC', borderRadius: 2, height: 22, marginLeft: -2, position: 'absolute', width: 4 },
  gaugeAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
});
