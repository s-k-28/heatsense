import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedProps, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Line, Path, Polyline, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { Palette, Spacing, Type } from '@/constants/theme';
import { EASE_OUT, FILL_MS } from '@/lib/motion';

/** A ring made of segments. The centre holds whatever you pass as children. */
export function Ring({
  children,
  max,
  segments,
  size = 132,
  stroke = 14,
  summary,
  track = 'rgba(255,255,255,0.08)',
}: {
  children?: ReactNode;
  /** The value a full ring stands for. Leave it out and the segments fill the whole ring. */
  max?: number;
  segments: { color: string; value: number }[];
  size?: number;
  stroke?: number;
  summary: string;
  /** The unfilled ring behind the segments. */
  track?: string;
}) {
  const reduced = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = max ?? (segments.reduce((sum, segment) => sum + segment.value, 0) || 1);
  const gap = segments.filter((segment) => segment.value > 0).length > 1 ? 4 : 0;
  // Where each segment starts along the ring, worked out before rendering.
  const starts = segments.map((_, i) => segments.slice(0, i).reduce((sum, segment) => sum + (segment.value / total) * c, 0));

  // The ring fills to its value on first show and whenever the value changes, so it reads as a quantity.
  const fill = useSharedValue(reduced ? 1 : 0);
  const signature = segments.map((segment) => segment.value).join(',') + `/${total}`;
  useEffect(() => {
    if (reduced) { fill.set(1); return; }
    fill.set(0);
    fill.set(withTiming(1, { duration: FILL_MS, easing: EASE_OUT }));
  }, [fill, reduced, signature]);

  return (
    <View accessible accessibilityLabel={summary} style={{ height: size, width: size }}>
      <Svg height={size} width={size}>
        <Circle cx={size / 2} cy={size / 2} fill="none" r={r} stroke={track} strokeWidth={stroke} />
        {segments.map((segment, index) => (segment.value <= 0 ? null : (
          <RingSegment
            circumference={c}
            color={segment.color}
            fill={fill}
            key={index}
            length={Math.max(0, (segment.value / total) * c - gap)}
            r={r}
            size={size}
            start={starts[index]}
            stroke={stroke}
          />
        )))}
      </Svg>
      <View style={styles.ringCenter}>{children}</View>
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function RingSegment({ circumference, color, fill, length, r, size, start, stroke }: { circumference: number; color: string; fill: SharedValue<number>; length: number; r: number; size: number; start: number; stroke: number }) {
  const props = useAnimatedProps(() => ({ strokeDasharray: [length * fill.value, circumference] }));
  return (
    <AnimatedCircle
      animatedProps={props}
      cx={size / 2}
      cy={size / 2}
      fill="none"
      originX={size / 2}
      originY={size / 2}
      r={r}
      rotation={-90}
      stroke={color}
      strokeDashoffset={-start}
      strokeLinecap="round"
      strokeWidth={stroke}
    />
  );
}

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
            <SvgText fill="rgba(48,209,88,0.95)" fontWeight="600" fontSize={12} letterSpacing={1} textAnchor="end" x={width - 8} y={y(band[1]) + 15}>HER USUAL RANGE</SvgText>
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
  axisText: { color: Palette.inkMuted, ...Type.labelSmall, letterSpacing: 0.6, textTransform: 'none' },
  ringCenter: { alignItems: 'center', bottom: 0, justifyContent: 'center', left: 0, position: 'absolute', right: 0, top: 0 },
  avatar: { alignItems: 'center', backgroundColor: Palette.surfaceMuted, borderWidth: 2, justifyContent: 'center' },
  avatarText: { color: Palette.ink, fontWeight: '600', letterSpacing: 0.5 },
  strip: { flexDirection: 'row' },
  stripItem: { alignItems: 'center', flex: 1, gap: 2, paddingVertical: Spacing.one },
  stripDivider: { borderLeftColor: Palette.border, borderLeftWidth: StyleSheet.hairlineWidth },
  stripValue: { color: Palette.ink, ...Type.figure, fontSize: 30, lineHeight: 34 },
  stripLabel: { color: Palette.inkMuted, ...Type.labelSmall },
  segmentRow: { borderRadius: 7, flexDirection: 'row', gap: 3, height: 14, overflow: 'hidden' },
  segment: { borderRadius: 7 },
  segmentLabels: { flexDirection: 'row', gap: 3, marginTop: Spacing.two },
  segmentTime: { color: Palette.ink, ...Type.figure, fontSize: 18, lineHeight: 21 },
  segmentName: { color: Palette.inkMuted, ...Type.labelSmall },
  tlRow: { flexDirection: 'row', minHeight: 64 },
  tlTime: { color: Palette.inkMuted, ...Type.labelSmall, fontSize: 14, lineHeight: 18, paddingTop: 2, width: 64 },
  tlTrack: { alignItems: 'center', width: 24 },
  tlDot: { alignItems: 'center', borderRadius: 11, height: 22, justifyContent: 'center', width: 22 },
  tlMark: { color: '#1A0E07', fontWeight: '700', fontSize: 14 },
  tlLine: { backgroundColor: Palette.border, flex: 1, marginVertical: 3, width: 2 },
  tlCopy: { flex: 1, gap: 1, paddingBottom: Spacing.four, paddingLeft: Spacing.three },
  tlTitle: { color: Palette.ink, ...Type.body, fontWeight: '500' },
  tlDetail: { color: Palette.inkMuted, ...Type.subhead },
  photo: { backgroundColor: Palette.surface, borderCurve: 'continuous', borderRadius: 18, justifyContent: 'flex-end', overflow: 'hidden' },
  photoCopy: { padding: Spacing.four },
  photoTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '600', letterSpacing: 0.3 },
  photoSub: { color: 'rgba(255,255,255,0.82)', ...Type.subhead, marginTop: 1 },
  dateTile: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderCurve: 'continuous', borderRadius: 10, height: 46, justifyContent: 'center', width: 46 },
  dateMonth: { color: Palette.coral, fontWeight: '600', fontSize: 11, letterSpacing: 1, lineHeight: 13 },
  dateDay: { color: Palette.ink, fontWeight: '700', fontSize: 22, lineHeight: 24 },
});
