import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Line, Path, Polyline, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { Palette, Spacing, Type } from '@/constants/theme';

/** A ring made of segments. The centre holds whatever you pass as children. */
export function Ring({
  children,
  segments,
  size = 132,
  stroke = 14,
  summary,
}: {
  children?: ReactNode;
  segments: { color: string; value: number }[];
  size?: number;
  stroke?: number;
  summary: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;
  const gap = segments.filter((segment) => segment.value > 0).length > 1 ? 4 : 0;
  let offset = 0;
  return (
    <View accessible accessibilityLabel={summary} style={{ height: size, width: size }}>
      <Svg height={size} width={size}>
        <Circle cx={size / 2} cy={size / 2} fill="none" r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        {segments.map((segment, index) => {
          const length = Math.max(0, (segment.value / total) * c - gap);
          const start = offset;
          offset += (segment.value / total) * c;
          if (segment.value <= 0) return null;
          return (
            <Circle
              cx={size / 2}
              cy={size / 2}
              fill="none"
              key={index}
              r={r}
              rotation={-90}
              originX={size / 2}
              originY={size / 2}
              stroke={segment.color}
              strokeDasharray={`${length} ${c}`}
              strokeDashoffset={-start}
              strokeLinecap="round"
              strokeWidth={stroke}
            />
          );
        })}
      </Svg>
      <View style={styles.ringCenter}>{children}</View>
    </View>
  );
}

/** An initials avatar with a status-colored ring, so who needs a look reads before any text does. */
export function RingAvatar({ color, name, size = 44 }: { color: string; name: string; size?: number }) {
  const letters = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join('');
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.avatar, { borderColor: color, borderRadius: size / 2, height: size, width: size }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.34 }]}>{letters}</Text>
    </View>
  );
}

/** A row of figures with hairline dividers between them. Flat: no box of its own. */
export function StatStrip({ items }: { items: { label: string; tone?: string; value: string }[] }) {
  return (
    <View style={styles.strip}>
      {items.map((item, index) => (
        <View accessible accessibilityLabel={`${item.label}: ${item.value}`} key={item.label} style={[styles.stripItem, index > 0 && styles.stripDivider]}>
          <Text numberOfLines={1} style={[styles.stripValue, item.tone ? { color: item.tone } : null]}>{item.value}</Text>
          <Text numberOfLines={1} style={styles.stripLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

/** A session drawn to scale: each block is as wide as it lasts. */
export function SegmentBar({ segments }: { segments: { color: string; flex: number; label: string; time: string }[] }) {
  return (
    <View accessible accessibilityLabel={segments.map((segment) => `${segment.label} at ${segment.time}`).join(', ')}>
      <View style={styles.segmentRow}>
        {segments.map((segment) => <View key={segment.label} style={[styles.segment, { backgroundColor: segment.color, flex: segment.flex }]} />)}
      </View>
      <View style={styles.segmentLabels}>
        {segments.map((segment) => (
          <View key={segment.label} style={{ flex: segment.flex }}>
            <Text numberOfLines={1} style={styles.segmentTime}>{segment.time}</Text>
            <Text numberOfLines={1} style={styles.segmentName}>{segment.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** A vertical timeline: time on the left, a dot on a line, then what happened. */
export function Timeline({ items }: { items: { color: string; detail?: string; mark?: string; time: string; title: string }[] }) {
  return (
    <View>
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <View accessible accessibilityLabel={`${item.time}. ${item.title}. ${item.detail ?? ''}`} key={`${item.time}-${item.title}`} style={styles.tlRow}>
            <Text style={styles.tlTime}>{item.time}</Text>
            <View style={styles.tlTrack}>
              <View style={[styles.tlDot, { backgroundColor: item.color }]}>
                {item.mark ? <Text style={styles.tlMark}>{item.mark}</Text> : null}
              </View>
              {last ? null : <View style={styles.tlLine} />}
            </View>
            <View style={[styles.tlCopy, last && { paddingBottom: 0 }]}>
              <Text style={styles.tlTitle}>{item.title}</Text>
              {item.detail ? <Text style={styles.tlDetail}>{item.detail}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** A photo with a readable caption at the bottom. */
export function PhotoBanner({ height = 168, source, subtitle, title }: { height?: number; source: number; subtitle?: string; title: string }) {
  return (
    <View accessible accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title} style={[styles.photo, { height }]}>
      <Image accessibilityIgnoresInvertColors contentFit="cover" contentPosition={{ top: '40%', left: '50%' }} source={source} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.78)']} locations={[0.25, 1]} pointerEvents="none" style={StyleSheet.absoluteFill} />
      <View style={styles.photoCopy}>
        <Text style={styles.photoTitle}>{title}</Text>
        {subtitle ? <Text style={styles.photoSub}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

/** A tiny trend line with no axes, for the end of a row. */
export function Spark({ color, values, width = 64 }: { color: string; values: number[]; width?: number }) {
  const height = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => `${(index / (values.length - 1)) * (width - 4) + 2},${height - 3 - ((value - min) / span) * (height - 6)}`).join(' ');
  return (
    <Svg accessibilityElementsHidden height={height} importantForAccessibility="no-hide-descendants" width={width}>
      <Polyline fill="none" points={points} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
    </Svg>
  );
}

/** A calendar tile: month over day. */
export function DateTile({ day, month }: { day: string; month: string }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.dateTile}>
      <Text style={styles.dateMonth}>{month.toUpperCase()}</Text>
      <Text style={styles.dateDay}>{day}</Text>
    </View>
  );
}

/**
 * The day's heat as one curve. The line runs up to the latest reading, and the planned practice window
 * is shaded so you can see what the afternoon looked like when athletes took the field.
 */
export function HeatDayChart({
  color,
  nowHour,
  startHour,
  values,
  window,
}: {
  color: string;
  nowHour: number;
  startHour: number;
  values: number[];
  window: [number, number];
}) {
  const [width, setWidth] = useState(0);
  const height = 150;
  const padX = 8;
  const top = 22;
  const bottom = 6;
  const endHour = startHour + values.length - 1;
  const lo = Math.min(...values) - 6;
  const hi = Math.max(...values) + 5;
  const x = (hour: number) => padX + ((hour - startHour) / (endHour - startHour)) * Math.max(0, width - padX * 2);
  const y = (value: number) => top + (1 - (value - lo) / (hi - lo)) * (height - top - bottom);
  const hours = values.map((_, index) => startHour + index).filter((hour) => hour <= nowHour);
  const seen = hours.map((hour) => ({ x: x(hour), y: y(values[hour - startHour]) }));
  const nowValue = values[Math.floor(nowHour) - startHour];
  const nowPoint = { x: x(nowHour), y: y(nowValue) };
  const line = [...seen.filter((point) => point.x < nowPoint.x), nowPoint].map((point) => `${point.x},${point.y}`).join(' ');
  const area = width > 0 ? `M${seen[0].x},${height - bottom} L${line.split(' ').join(' L')} L${nowPoint.x},${height - bottom} Z` : '';
  const label = (hour: number) => `${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 ? 'AM' : 'PM'}`;
  return (
    <View accessible accessibilityLabel={`WBGT through the day, from ${values[0]} at ${label(startHour)} to ${nowValue} now. Practice is planned from ${label(window[0])} to ${label(Math.ceil(window[1]))}.`} onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
      <Svg height={height} width="100%">
        <Defs>
          <SvgGradient id="heatday-fill" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.38} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </SvgGradient>
        </Defs>
        {width > 0 ? (
          <>
            {[0.33, 0.66].map((fraction) => (
              <Line key={fraction} stroke={Palette.border} strokeWidth={StyleSheet.hairlineWidth} x1={0} x2={width} y1={top + fraction * (height - top - bottom)} y2={top + fraction * (height - top - bottom)} />
            ))}
            <Rect fill="rgba(255,255,255,0.07)" height={height - 4} rx={8} width={x(window[1]) - x(window[0])} x={x(window[0])} y={2} />
            <Line stroke="rgba(255,255,255,0.22)" strokeDasharray="3 4" strokeWidth={1} x1={x(window[1])} x2={x(window[1])} y1={22} y2={height - bottom} />
            <SvgText fill="rgba(235,235,245,0.7)" fontSize={11} fontWeight="600" textAnchor="end" x={Math.min(width - 4, x(window[1]) - 4)} y={16}>Practice</SvgText>
            <Path d={area} fill="url(#heatday-fill)" />
            <Polyline fill="none" points={line} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />
            <Circle cx={nowPoint.x} cy={nowPoint.y} fill="#000000" r={6} stroke={color} strokeWidth={3} />
          </>
        ) : null}
      </Svg>
      <View style={styles.axisRow}>
        <Text style={styles.axisText}>{label(startHour)}</Text>
        <Text style={styles.axisText}>{label(Math.round((startHour + endHour) / 2))}</Text>
        <Text style={styles.axisText}>{label(endHour)}</Text>
      </View>
    </View>
  );
}

/** A reading drawn against a person's own usual range, so "elevated" is something you can see. */
export function BaselineChart({
  band,
  color,
  height = 150,
  labels,
  summary,
  values,
}: {
  band: [number, number];
  color: string;
  height?: number;
  labels: [string, string];
  summary: string;
  values: number[];
}) {
  const [width, setWidth] = useState(0);
  const padX = 8;
  const padTop = 8;
  const padBottom = 8;
  // The scale always shows the whole usual band and the highest reading, with a little air around both.
  const lo = band[0] - 12;
  const hi = Math.max(...values, band[1]) + 10;
  const x = (index: number) => padX + (index / (values.length - 1)) * Math.max(0, width - padX * 2);
  const y = (value: number) => padTop + (1 - (value - lo) / (hi - lo)) * (height - padTop - padBottom);
  const points = values.map((value, index) => `${x(index)},${y(value)}`).join(' ');
  const last = { x: x(values.length - 1), y: y(values[values.length - 1]) };
  return (
    <View accessible accessibilityLabel={summary} onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
      <Svg height={height} width="100%">
        <Defs>
          <SvgGradient id="baseline-fill" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.3} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </SvgGradient>
        </Defs>
        {width > 0 ? (
          <>
            <Rect fill="rgba(48,209,88,0.16)" height={y(band[0]) - y(band[1])} rx={6} width={width} x={0} y={y(band[1])} />
            <Line stroke="rgba(48,209,88,0.55)" strokeDasharray="4 4" strokeWidth={1} x1={0} x2={width} y1={y(band[1])} y2={y(band[1])} />
            <SvgText fill="rgba(48,209,88,0.95)" fontSize={11} fontWeight="600" textAnchor="end" x={width - 8} y={y(band[1]) + 15}>Her usual range</SvgText>
            <Path d={`M${x(0)},${height - padBottom} L${points.split(' ').join(' L')} L${last.x},${height - padBottom} Z`} fill="url(#baseline-fill)" />
            <Polyline fill="none" points={points} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />
            <Circle cx={last.x} cy={last.y} fill="#000000" r={6} stroke={color} strokeWidth={3} />
          </>
        ) : null}
      </Svg>
      <View style={styles.axisRow}>
        <Text style={styles.axisText}>{labels[0]}</Text>
        <Text style={styles.axisText}>{labels[1]}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  axisRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  axisText: { color: Palette.inkMuted, ...Type.caption },
  ringCenter: { alignItems: 'center', bottom: 0, justifyContent: 'center', left: 0, position: 'absolute', right: 0, top: 0 },
  avatar: { alignItems: 'center', backgroundColor: Palette.surfaceMuted, borderWidth: 2, justifyContent: 'center' },
  avatarText: { color: Palette.ink, fontWeight: '600' },
  strip: { flexDirection: 'row' },
  stripItem: { alignItems: 'center', flex: 1, gap: 2, paddingVertical: Spacing.one },
  stripDivider: { borderLeftColor: Palette.border, borderLeftWidth: StyleSheet.hairlineWidth },
  stripValue: { color: Palette.ink, fontSize: 24, fontWeight: '700', letterSpacing: 0.3, lineHeight: 29 },
  stripLabel: { color: Palette.inkMuted, ...Type.footnote },
  segmentRow: { borderRadius: 7, flexDirection: 'row', gap: 3, height: 14, overflow: 'hidden' },
  segment: { borderRadius: 7 },
  segmentLabels: { flexDirection: 'row', gap: 3, marginTop: Spacing.two },
  segmentTime: { color: Palette.ink, ...Type.footnote, fontWeight: '600' },
  segmentName: { color: Palette.inkMuted, ...Type.caption },
  tlRow: { flexDirection: 'row', minHeight: 64 },
  tlTime: { color: Palette.inkMuted, ...Type.footnote, fontVariant: ['tabular-nums'], paddingTop: 3, width: 64 },
  tlTrack: { alignItems: 'center', width: 24 },
  tlDot: { alignItems: 'center', borderRadius: 11, height: 22, justifyContent: 'center', width: 22 },
  tlMark: { color: '#1A0E07', fontSize: 12, fontWeight: '700' },
  tlLine: { backgroundColor: Palette.border, flex: 1, marginVertical: 3, width: 2 },
  tlCopy: { flex: 1, gap: 1, paddingBottom: Spacing.four, paddingLeft: Spacing.three },
  tlTitle: { color: Palette.ink, ...Type.body, fontWeight: '500' },
  tlDetail: { color: Palette.inkMuted, ...Type.subhead },
  photo: { backgroundColor: Palette.surface, borderCurve: 'continuous', borderRadius: 24, justifyContent: 'flex-end', overflow: 'hidden' },
  photoCopy: { padding: Spacing.four },
  photoTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '600', letterSpacing: 0.3 },
  photoSub: { color: 'rgba(255,255,255,0.82)', ...Type.subhead, marginTop: 1 },
  dateTile: { alignItems: 'center', backgroundColor: Palette.surfaceMuted, borderCurve: 'continuous', borderRadius: 12, height: 46, justifyContent: 'center', width: 46 },
  dateMonth: { color: Palette.coral, fontSize: 10, fontWeight: '700', letterSpacing: 0.6, lineHeight: 12 },
  dateDay: { color: Palette.ink, fontSize: 19, fontWeight: '700', lineHeight: 22 },
});
