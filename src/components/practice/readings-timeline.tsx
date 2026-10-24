import { Text } from '@/components/ui/text';
import { useAthletePalette, useAthleteStyles } from '@/components/ui/role-appearance';
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { Face, Palette } from '@/constants/theme';
import { ZONES, type Zone } from '@/lib/practice';
import { zoneBounds, type UilClass } from '@/lib/uil-wbgt';
import type { FieldReading } from '@/services/practice-sessions';

// Today's field readings on the practice clock, over the UIL zones they fall in, so a coach sees
// the afternoon heating up (or cooling off) at a glance. Below it, every reading with its status.

const H = 150;
const PAD_TOP = 8;
const PAD_BOTTOM = 8;
const GUTTER = 34;
const tone = (zone: Zone) => (zone === 'black' ? '#8E8E93' : ZONES[zone].color);
const time = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export function ReadingsTimeline({ readings, startedAt, uilClass, now, temp }: { readings: FieldReading[]; startedAt: Date; uilClass: UilClass; now: number; temp: { value: (f: number) => number | string; unit: string } }) {
  const Palette = useAthletePalette();
  const styles = useAthleteStyles(baseStyles);
  const [width, setWidth] = useState(0);
  const values = readings.map((r) => r.wbgtF);
  const lo = Math.floor(Math.min(76, ...values) - 1);
  const hi = Math.ceil(Math.max(94, ...values) + 1);
  const t0 = Math.min(startedAt.getTime(), ...readings.map((r) => r.measuredAt.getTime()));
  const t1 = Math.max(now, ...readings.map((r) => r.measuredAt.getTime())) + 60_000;
  const plot = Math.max(1, width - GUTTER);
  const x = (t: number) => ((t - t0) / (t1 - t0)) * (plot - 12) + 6;
  const y = (f: number) => PAD_TOP + (1 - (f - lo) / (hi - lo)) * (H - PAD_TOP - PAD_BOTTOM);
  const b = zoneBounds(uilClass);
  const bands: { zone: Zone; from: number; to: number }[] = [
    { zone: 'green', from: lo, to: b.yellow },
    { zone: 'yellow', from: b.yellow, to: b.orange },
    { zone: 'orange', from: b.orange, to: b.red },
    { zone: 'red', from: b.red, to: b.black },
    { zone: 'black', from: b.black, to: hi },
  ];
  const points = readings.map((r) => ({ x: x(r.measuredAt.getTime()), y: y(r.wbgtF), zone: r.zone }));

  return (
    <View>
      <View accessible accessibilityLabel={`Today's readings: ${readings.map((r) => `${temp.value(r.wbgtF)} at ${time(r.measuredAt)}`).join(', ')}`} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
        <Svg height={H} width="100%">
          {width > 0 ? (
            <>
              {bands.map((band) => (
                <Rect fill={tone(band.zone)} height={Math.max(0, y(Math.max(lo, band.from)) - y(Math.min(hi, band.to)))} key={band.zone} opacity={0.13} width={plot} x={0} y={y(Math.min(hi, band.to))} />
              ))}
              {[b.yellow, b.orange, b.red, b.black].filter((v, i, all) => v > lo && v < hi && (i === 0 || y(all[i - 1]) - y(v) > 14)).map((v) => (
                <SvgText fill="rgba(235,235,245,0.5)" fontSize={11} fontWeight="600" key={v} textAnchor="end" x={width} y={y(v) + 4}>{String(temp.value(v))}</SvgText>
              ))}
              <Line stroke="rgba(235,235,245,0.35)" strokeDasharray="3 4" strokeWidth={1} x1={x(now)} x2={x(now)} y1={PAD_TOP} y2={H - PAD_BOTTOM} />
              {points.length > 1 ? <Polyline fill="none" points={points.map((p) => `${p.x},${p.y}`).join(' ')} stroke="rgba(246,243,236,0.7)" strokeLinejoin="round" strokeWidth={2} /> : null}
              {points.map((p, i) => (
                <Circle cx={p.x} cy={p.y} fill={tone(p.zone)} key={i} r={i === points.length - 1 ? 7 : 5} stroke="#1A2024" strokeWidth={2} />
              ))}
            </>
          ) : null}
        </Svg>
        <View style={[styles.axis, { marginRight: GUTTER }]}>
          <Text style={styles.axisText}>{time(new Date(t0))}</Text>
          <Text style={styles.axisText}>Now</Text>
        </View>
      </View>
      <View style={styles.list}>
        {[...readings].reverse().map((r) => (
          <View accessible key={r.id} style={styles.row}>
            <Text style={styles.rowTime}>{time(r.measuredAt)}</Text>
            <View style={[styles.dot, { backgroundColor: tone(r.zone) }]} />
            <Text style={styles.rowValue}>{temp.value(r.wbgtF)}<Text style={styles.rowUnit}>{temp.unit}</Text></Text>
            <Text style={[styles.rowZone, { color: ZONES[r.zone].text }]}>{ZONES[r.zone].label.replace(' zone', '')}</Text>
            <Text style={[styles.rowState, { color: r.acknowledgedAt ? Palette.safe : Palette.inkMuted }]}>{r.acknowledgedAt ? 'Applied' : 'Pending'}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  axisText: { color: Palette.inkMuted, fontSize: 13, fontWeight: '500' },
  list: { marginTop: 12 },
  row: { alignItems: 'center', borderTopColor: 'rgba(255,255,255,0.06)', borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 10, minHeight: 48 },
  rowTime: { color: Palette.inkMuted, fontSize: 15, fontVariant: ['tabular-nums'], width: 72 },
  dot: { borderRadius: 5, height: 10, width: 10 },
  rowValue: { color: Palette.ink, fontFamily: Face.figure, fontSize: 22, width: 64 },
  rowUnit: { color: Palette.inkMuted, fontFamily: Face.label, fontSize: 15 },
  rowZone: { flex: 1, fontSize: 15, fontWeight: '600' },
  rowState: { fontSize: 14, fontWeight: '600' },
});
