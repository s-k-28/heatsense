import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import Svg, { Polyline } from 'react-native-svg';

import { SimulatedTag } from '@/components/vitals';
import { StatRow } from '@/components/whoop-ui';
import { Face, Palette } from '@/constants/theme';
import { enter, settle } from '@/lib/motion';
import { ZONES } from '@/lib/practice';
import { hrPercent, useAthletes, type AthleteView } from '@/state/athletes';
import { DEMO_SPEED, useDemoTeam } from '@/state/demo-team';
import { useTemperature } from '@/state/preferences';
import { useCoachData, useNow } from '@/state/team-session';

// The trainer's live sideline view, after Polar Team's team screen: who needs attention first, then
// every athlete as a tile with heart rate, effort (share of max) and its recent trend.

const BAND = require('@/assets/images/heatsense-band-refined.png');
const time = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

function effortTone(pct: number) {
  if (pct >= 88) return '#FF453A';
  if (pct >= 80) return '#FF7A45';
  if (pct >= 70) return Palette.coral;
  if (pct >= 60) return '#C9A27E';
  return '#6B7A82';
}

function attention(a: AthleteView): string | null {
  if (!a.live) return null;
  if (a.live.stale) return 'No band signal for over 2 min';
  if (a.live.status === 'watch') return `${a.live.heartRate} bpm and staying high through rest`;
  if (hrPercent(a.live.heartRate) >= 90) return `${a.live.heartRate} bpm, ${hrPercent(a.live.heartRate)}% of max`;
  if (a.acclimatizationDay < 6 && a.live.phase === 'work' && hrPercent(a.live.heartRate) >= 80) return `Day ${a.acclimatizationDay} of acclimatization, working hard`;
  return null;
}

function Spark({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return <View style={styles.sparkEmpty} />;
  const w = 120, h = 30, min = Math.min(...values) - 3, max = Math.max(...values) + 3;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / (max - min)) * h}`).join(' ');
  return <Svg height={h} width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"><Polyline fill="none" points={pts} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></Svg>;
}

function Tile({ a }: { a: AthleteView }) {
  const live = a.live!;
  const pct = hrPercent(live.heartRate);
  const tone = live.stale ? Palette.inkFaint : effortTone(pct);
  const [first, ...rest] = a.name.split(' ');
  return (
    <Pressable
      accessibilityLabel={`${a.name}, ${live.stale ? 'no recent signal' : `${live.heartRate} beats per minute, ${pct} percent of max`}${live.status === 'watch' ? ', slow recovery' : ''}`}
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/athlete-vitals', params: { id: a.id, role: 'trainer' } })}
      style={({ pressed }) => [styles.tile, live.status === 'watch' && styles.tileWatch, pressed && styles.pressed]}>
      <View style={styles.tileTop}>
        <Text numberOfLines={1} style={styles.tileName}>{first} {rest.map((p) => p[0]).join('')}</Text>
        <View style={[styles.dot, { backgroundColor: live.stale ? Palette.inkFaint : live.status === 'watch' ? Palette.warning : Palette.safe }]} />
      </View>
      <Text style={[styles.tileHr, live.stale && { color: Palette.inkMuted }]}>{live.stale ? '--' : live.heartRate}<Text style={styles.tileUnit}> bpm</Text></Text>
      <View style={styles.bar}><View style={[styles.barFill, { backgroundColor: tone, width: `${Math.min(100, pct)}%` }]} /></View>
      <View style={styles.tileFoot}>
        <Text style={[styles.tilePct, { color: tone }]}>{pct}%</Text>
        <Text style={styles.tileMeta}>{live.phase ? (live.phase === 'work' ? 'Work' : 'Rest') : a.acclimatizationDay < 14 ? `Day ${a.acclimatizationDay}` : ''}</Text>
      </View>
      <Spark color={tone} values={live.history} />
    </Pressable>
  );
}

export function TrainerMonitor() {
  const data = useCoachData('trainer');
  const temp = useTemperature();
  const { athletes, sample } = useAthletes('trainer');
  const demo = useDemoTeam(data?.readings.at(-1)?.zone ?? 'yellow');
  const now = useNow(5_000);
  const reduced = useReducedMotion();
  const [sort, setSort] = useState<'effort' | 'name'>('effort');
  const [checked, setChecked] = useState<Record<string, Date>>({});

  const onBand = athletes.filter((a) => a.live);
  if (!onBand.length) {
    return (
      <View style={styles.empty}>
        <Image accessibilityIgnoresInvertColors contentFit="contain" source={BAND} style={styles.emptyBand} />
        <Text style={styles.emptyTitle}>No bands live</Text>
        <Text style={styles.emptyBody}>During practice, every athlete wearing a HeatSense Band shows up here with heart rate and recovery.</Text>
      </View>
    );
  }

  const latest = data?.readings.at(-1) ?? null;
  // Checked-in athletes drop out of the attention list for 10 minutes.
  const flagged = onBand
    .map((a) => ({ a, why: attention(a) }))
    .filter(({ a, why }) => why && !(checked[a.id] && now - checked[a.id].getTime() < 10 * 60_000));
  const sorted = [...onBand].sort((x, y) => (sort === 'name' ? x.name.localeCompare(y.name) : (y.live!.heartRate - x.live!.heartRate)));
  const hrs = onBand.filter((a) => !a.live!.stale).map((a) => a.live!.heartRate);
  const cycle = 30 * 60, into = ((demo.seconds % cycle) + cycle) % cycle;
  const blockLeft = demo.enabled ? Math.ceil(((into < 20 * 60 ? 20 * 60 : cycle) - into) / 60) : null;

  return (
    <>
      {sample ? <SimulatedTag /> : null}
      <View accessible style={styles.strip}>
        <View style={[styles.stripEdge, { backgroundColor: latest ? (latest.zone === 'black' ? '#8E8E93' : ZONES[latest.zone].color) : Palette.inkFaint }]} />
        <View style={styles.stripCopy}>
          <Text style={[styles.stripZone, latest && { color: ZONES[latest.zone].text }]}>{latest ? `${ZONES[latest.zone].label} · ${temp.value(latest.wbgtF)}${temp.unit}` : 'No field reading yet'}</Text>
          <Text style={styles.stripMeta}>{onBand.length} on band{data?.session ? ` · practice ${Math.round((now - data.session.startedAt.getTime()) / 60_000)} min in` : ''}</Text>
        </View>
        {blockLeft !== null ? (
          <View style={styles.block}>
            <Text style={styles.blockValue}>{blockLeft}<Text style={styles.blockUnit}> min</Text></Text>
            <Text style={styles.blockLabel}>{into < 20 * 60 ? 'Work left' : 'Rest left'}</Text>
          </View>
        ) : null}
      </View>

      {flagged.length ? (
        <>
          <Text accessibilityRole="header" style={styles.section}>Needs attention</Text>
          <View style={styles.flags}>
            {flagged.map(({ a, why }, i) => (
              <Animated.View entering={enter(i, reduced)} key={a.id} layout={settle(reduced)} style={styles.flag}>
                <View style={styles.flagEdge} />
                <View style={styles.flagCopy}>
                  <Text style={styles.flagName}>{a.name}</Text>
                  <Text style={styles.flagWhy}>{why}</Text>
                  <View style={styles.flagActions}>
                    <Pressable accessibilityRole="button" onPress={() => setChecked({ ...checked, [a.id]: new Date() })} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
                      <Text style={styles.primaryText}>Checked in</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/athlete-vitals', params: { id: a.id, role: 'trainer' } })} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
                      <Text style={styles.secondaryText}>Vitals</Text>
                    </Pressable>
                  </View>
                </View>
              </Animated.View>
            ))}
          </View>
        </>
      ) : null}
      {Object.keys(checked).length ? (
        <Text style={styles.checked}>Checked in: {Object.entries(checked).map(([id, at]) => `${athletes.find((a) => a.id === id)?.name.split(' ')[0] ?? 'Athlete'} ${time(at)}`).join(' · ')}</Text>
      ) : null}

      <View style={styles.gridHead}>
        <Text accessibilityRole="header" style={styles.sectionInline}>Live</Text>
        <View accessibilityRole="tablist" style={styles.sort}>
          {(['effort', 'name'] as const).map((key) => (
            <Pressable accessibilityRole="tab" accessibilityState={{ selected: sort === key }} key={key} onPress={() => setSort(key)} style={[styles.sortItem, sort === key && styles.sortOn]}>
              <Text style={[styles.sortText, sort === key && styles.sortTextOn]}>{key === 'effort' ? 'Highest HR' : 'A–Z'}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={styles.grid}>
        {sorted.map((a) => <Animated.View key={a.id} layout={settle(reduced)} style={styles.cell}><Tile a={a} /></Animated.View>)}
      </View>

      <View style={styles.team}>
        <StatRow stats={[
          { label: 'Team avg', value: hrs.length ? String(Math.round(hrs.reduce((s, v) => s + v, 0) / hrs.length)) : '--', unit: ' bpm' },
          { label: 'Highest', value: hrs.length ? String(Math.max(...hrs)) : '--', unit: ' bpm' },
          { label: 'Watch', value: String(onBand.filter((a) => a.live!.status === 'watch').length), tone: onBand.some((a) => a.live!.status === 'watch') ? Palette.warning : undefined },
        ]} />
        {demo.enabled ? <Text style={styles.note}>Practice clock runs at {DEMO_SPEED}× in sample mode.</Text> : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.75 },
  empty: { alignItems: 'center', gap: 10, marginTop: 8 },
  emptyBand: { height: 200, width: 200 },
  emptyTitle: { color: Palette.ink, fontSize: 24, fontWeight: '700' },
  emptyBody: { color: Palette.inkMuted, fontSize: 16, lineHeight: 22, maxWidth: 320, textAlign: 'center' },
  strip: { alignItems: 'center', backgroundColor: Palette.surface, borderRadius: 16, flexDirection: 'row', gap: 14, overflow: 'hidden', paddingRight: 18 },
  stripEdge: { alignSelf: 'stretch', width: 6 },
  stripCopy: { flex: 1, gap: 2, paddingVertical: 14 },
  stripZone: { color: Palette.ink, fontSize: 18, fontWeight: '700' },
  stripMeta: { color: Palette.inkMuted, fontSize: 15 },
  block: { alignItems: 'flex-end' },
  blockValue: { color: Palette.ink, fontFamily: Face.figure, fontSize: 30, lineHeight: 34 },
  blockUnit: { color: Palette.inkMuted, fontFamily: Face.label, fontSize: 17 },
  blockLabel: { color: Palette.inkMuted, fontSize: 13, fontWeight: '500' },
  section: { color: Palette.ink, fontSize: 22, fontWeight: '700', marginBottom: 12, marginTop: 26 },
  flags: { gap: 10 },
  flag: { backgroundColor: 'rgba(255,159,10,0.1)', borderColor: 'rgba(255,159,10,0.35)', borderRadius: 16, borderWidth: 1, flexDirection: 'row', overflow: 'hidden' },
  flagEdge: { backgroundColor: Palette.warning, width: 4 },
  flagCopy: { flex: 1, gap: 2, padding: 14 },
  flagName: { color: Palette.ink, fontSize: 17, fontWeight: '700' },
  flagWhy: { color: Palette.inkMuted, fontSize: 15 },
  flagActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  primary: { backgroundColor: Palette.warning, borderRadius: 10, justifyContent: 'center', minHeight: 40, paddingHorizontal: 16 },
  primaryText: { color: '#101416', fontSize: 15, fontWeight: '700' },
  secondary: { backgroundColor: 'rgba(235,235,245,0.1)', borderRadius: 10, justifyContent: 'center', minHeight: 40, paddingHorizontal: 16 },
  secondaryText: { color: Palette.ink, fontSize: 15, fontWeight: '600' },
  checked: { color: Palette.inkMuted, fontSize: 14, marginTop: 10 },
  gridHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, marginTop: 26 },
  sectionInline: { color: Palette.ink, fontSize: 22, fontWeight: '700' },
  sort: { backgroundColor: 'rgba(235,235,245,0.08)', borderRadius: 9, flexDirection: 'row', padding: 3 },
  sortItem: { borderRadius: 7, paddingHorizontal: 10, paddingVertical: 6 },
  sortOn: { backgroundColor: 'rgba(235,235,245,0.16)' },
  sortText: { color: Palette.inkMuted, fontSize: 14, fontWeight: '600' },
  sortTextOn: { color: Palette.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { width: '48.4%' },
  tile: { backgroundColor: Palette.surface, borderColor: 'transparent', borderRadius: 16, borderWidth: 1, gap: 6, padding: 14 },
  tileWatch: { borderColor: 'rgba(255,159,10,0.6)' },
  tileTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  tileName: { color: Palette.ink, flex: 1, fontSize: 16, fontWeight: '600' },
  dot: { borderRadius: 5, height: 10, width: 10 },
  tileHr: { color: Palette.ink, fontFamily: Face.figure, fontSize: 44, lineHeight: 48 },
  tileUnit: { color: Palette.inkMuted, fontFamily: Face.label, fontSize: 18 },
  bar: { backgroundColor: 'rgba(235,235,245,0.08)', borderRadius: 3, height: 6, overflow: 'hidden' },
  barFill: { borderRadius: 3, height: 6 },
  tileFoot: { flexDirection: 'row', justifyContent: 'space-between' },
  tilePct: { fontFamily: Face.figure, fontSize: 16 },
  tileMeta: { color: Palette.inkMuted, fontSize: 13, fontWeight: '500' },
  sparkEmpty: { height: 30 },
  team: { backgroundColor: Palette.surface, borderRadius: 16, marginTop: 14, padding: 16 },
  note: { color: Palette.inkMuted, fontSize: 13, marginTop: 10 },
});
