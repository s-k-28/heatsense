import { ActionButton } from '@/components/ui/action-button';
import { surfaceStyles } from '@/components/ui/surface';
import { Text } from '@/components/ui/text';
import { useAthleteStyles } from '@/components/ui/role-appearance';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { CoachPalette } from '@/constants/coach-theme';
import { Palette, Spacing } from '@/constants/theme';
import { SAMPLE_HOURLY_WBGT, ZONES } from '@/lib/practice';
import { zoneThresholds, type UilClass, type Zone } from '@/lib/uil-wbgt';
import { useTemperature } from '@/state/preferences';
import { useNow, type CoachData } from '@/state/team-session';

// Coach Home's first card: the field photo carries the latest WBGT, which way it's heading, how far
// it is from the next zone, and the next thing to do. One card instead of a photo plus
// a separate reading card. Sample builds draw the sample day ending at the sample reading.

const PHOTO = require('@/assets/images/home/field-hero.webp');
const ORDER: Zone[] = ['green', 'yellow', 'orange', 'red', 'black'];
const HOUR = 3_600_000;

type Point = { t: number; f: number };

function seriesFor(data: CoachData | null): Point[] {
  const latest = data?.readings.at(-1);
  if (!data || !latest) return [];
  if (data.sample) {
    const values = [...SAMPLE_HOURLY_WBGT];
    values[values.length - 1] = latest.wbgtF;
    const end = latest.measuredAt.getTime();
    return values.map((f, i) => ({ t: end - (values.length - 1 - i) * HOUR, f }));
  }
  return data.readings.map((r) => ({ t: r.measuredAt.getTime(), f: r.wbgtF }));
}

/** °F per hour over the last two hours of readings, or null with too little to go on. */
function trendPerHour(points: Point[]) {
  const last = points.at(-1);
  if (!last) return null;
  const first = points.filter((p) => p.t <= last.t && last.t - p.t <= 2 * HOUR).sort((a, b) => a.t - b.t)[0];
  if (!first) return null;
  const hours = (last.t - first.t) / HOUR;
  return hours >= 0.25 ? (last.f - first.f) / hours : null;
}

function arrowFor(rate: number) {
  if (rate >= 2) return '↑';
  if (rate >= 0.5) return '↗';
  if (rate > -0.5) return '→';
  if (rate > -2) return '↘';
  return '↓';
}

// "3°" rather than "3.0°", but keep the decimal when it matters near a line ("2.9°").
const tidy = (n: number) => n.toFixed(1).replace(/\.0$/, '');
const zoneColor = (zone: Zone) => ZONES[zone].color === '#000000' ? '#8E8E93' : ZONES[zone].color;
const zoneName = (zone: Zone) => ZONES[zone].label.replace(' zone', '');

export function FieldHero({ data, onAction, readOnly = false }: { data: CoachData | null; onAction: () => void; readOnly?: boolean }) {
  const styles = useAthleteStyles(baseStyles);
  const temp = useTemperature();
  const now = useNow();
  const celsius = temp.unit === '°C';
  const change = (f: number) => tidy(celsius ? (f * 5) / 9 : f);

  const session = data?.session ?? null;
  const latest = data?.readings.at(-1) ?? null;
  const zone = latest?.zone ?? null;
  const uilClass: UilClass = session?.uilClass ?? 3;
  const bounds = zoneThresholds(uilClass);
  const next = zone ? (ORDER[ORDER.indexOf(zone) + 1] as Exclude<Zone, 'green'> | undefined) : undefined;
  const nextAt = next ? bounds[next] : null;
  const points = seriesFor(data);
  const rate = trendPerHour(points);
  const headroom = latest && nextAt !== null ? nextAt - latest.wbgtF : null;
  const minutesAgo = latest ? Math.max(0, Math.round((now - latest.measuredAt.getTime()) / 60_000)) : 0;
  const action = !data ? 'Loading practice…' : readOnly ? 'View guidance' : !session ? 'Check field conditions' : latest && !latest.acknowledgedAt ? 'Review guidance' : latest ? 'Add a reading' : 'Take first reading';

  return (
    <View style={styles.card}>
      <Image accessibilityIgnoresInvertColors contentFit="cover" contentPosition={{ top: '12%', left: '50%' }} source={PHOTO} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.92)']} locations={[0, 0.2, 0.45, 0.85]} pointerEvents="none" style={StyleSheet.absoluteFill} />

      <View style={styles.top}>
        {zone ? (
          <View accessible accessibilityLabel={ZONES[zone].label} style={styles.tag}>
            <View style={[styles.dot, { backgroundColor: zoneColor(zone) }]} />
            <Text style={styles.tagText}>{ZONES[zone].label}</Text>
          </View>
        ) : <View />}
        <Text style={styles.venue}>{session?.venue ?? 'Field'}{data?.sample ? ' · Sample' : ''}</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.label}>Field WBGT</Text>
        {latest && zone ? (
          <>
            <View style={styles.readingRow}>
              <Text accessibilityLabel={`${temp.value(latest.wbgtF)} degrees ${celsius ? 'Celsius' : 'Fahrenheit'}`} style={styles.value}>
                {temp.value(latest.wbgtF)}<Text style={styles.unit}>{temp.unit}</Text>
              </Text>
              {rate !== null ? (
                <Text accessibilityLabel={`${rate === 0 ? 'Stable' : rate > 0 ? 'Rising' : 'Falling'}, observed change ${change(Math.abs(rate))} degrees ${celsius ? 'Celsius' : 'Fahrenheit'} per hour`} style={styles.rate}>
                  <Text style={{ color: zoneColor(zone) }}>{arrowFor(rate)}</Text> {rate >= 0 ? '+' : '−'}{change(Math.abs(rate))}°/hr
                </Text>
              ) : null}
            </View>
            <Text style={styles.headroom}>
              {next && headroom !== null
                ? `${change(headroom)}° below ${zoneName(next)}`
                : 'Black zone: no outdoor activity'}
            </Text>
          </>
        ) : (
          <Text accessibilityLiveRegion="polite" style={styles.headroom}>{!data ? 'Loading your team’s practice…' : session ? 'No reading yet this practice.' : 'No practice started.'}</Text>
        )}

        <View style={styles.actionRow}>
          <ActionButton disabled={!data} label={action} onPress={onAction} style={styles.button} />
          {latest ? <Text style={styles.measured}>Measured {minutesAgo === 0 ? 'just now' : `${minutesAgo} min ago`}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  card: { ...surfaceStyles.card, borderCurve: 'continuous', marginTop: Spacing.three, minHeight: 400, overflow: 'hidden' },
  top: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', padding: Spacing.three },
  tag: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, flexDirection: 'row', flexShrink: 1, gap: 6, paddingHorizontal: 9, paddingVertical: 5 },
  dot: { borderRadius: 4, height: 8, width: 8 },
  tagText: { color: Palette.white, flexShrink: 1, fontSize: 13, fontWeight: '600' },
  venue: { color: 'rgba(255,255,255,0.8)', flexShrink: 1, fontSize: 13, marginLeft: 12 },
  body: { flex: 1, gap: 2, justifyContent: 'flex-end', paddingBottom: 28, paddingHorizontal: Spacing.five, paddingTop: 64 },
  label: { color: 'rgba(255,255,255,0.75)', fontSize: 15, fontWeight: '600' },
  readingRow: { alignItems: 'baseline', flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  value: { color: Palette.white, fontSize: 68, fontVariant: ['tabular-nums'], fontWeight: '800', letterSpacing: -1.8 },
  unit: { color: 'rgba(255,255,255,0.75)', fontSize: 22, fontWeight: '600', letterSpacing: 0 },
  rate: { color: Palette.white, fontSize: 17, fontVariant: ['tabular-nums'], fontWeight: '600' },
  headroom: { color: 'rgba(255,255,255,0.85)', fontSize: 16, lineHeight: 24 },
  actionRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 14 },
  button: { flexShrink: 1, maxWidth: '100%' },
  buttonText: { color: CoachPalette.peachInk, fontSize: 16, fontWeight: '800' },
  measured: { color: 'rgba(255,255,255,0.7)', flexShrink: 1, fontSize: 13 },
  pressed: { opacity: 0.7 },
});
