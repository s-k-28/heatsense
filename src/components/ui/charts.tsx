import { Text } from '@/components/ui/text';
import { useAthleteAppearance, useAthleteStyles } from '@/components/athlete-appearance';
import { Fragment, useId, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle, useReducedMotion, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Line, LinearGradient as SvgGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { Palette, Type } from '@/constants/theme';
import { seg, useOneShotClock } from '@/lib/motion-engine';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);

// Charts draw on once when they appear (MOTION.md), then hold: later readings land without a redraw.
const BAR_STAGGER = 40;
const BAR_GROW = 500;

/** One bar growing from its base, `delay` ms into the chart's draw-on clock. */
function Bar({ clock, color, delay, height, width }: { clock: SharedValue<number>; color: string; delay: number; height: number; width: number }) {
  const styles = useAthleteStyles(baseStyles);
  const grow = useAnimatedStyle(() => ({ height: Math.max(6, height * seg(clock.value, delay, delay + BAR_GROW)) }));
  return <Animated.View style={[styles.bar, { backgroundColor: color, width }, grow]} />;
}

/** Bars like Health's day/hour charts: one color, the current bar at full strength. */
export function BarChart({
  floor = 0,
  height = 96,
  highlight,
  labels,
  summary,
  tone,
  values,
}: {
  /** Value the shortest bar stands for, so a narrow range still shows its shape. */
  floor?: number;
  height?: number;
  highlight?: number;
  labels: string[];
  summary: string;
  tone: string;
  values: number[];
}) {
  const styles = useAthleteStyles(baseStyles);
  const max = Math.max(...values, floor + 1);
  const current = highlight ?? values.length - 1;
  const clock = useOneShotClock(BAR_GROW + BAR_STAGGER * values.length, true, useReducedMotion());
  return (
    <View accessible accessibilityLabel={summary} style={styles.chart}>
      <View style={[styles.bars, { height }]}>
        {values.map((value, index) => (
          <Bar
            key={index}
            clock={clock}
            color={index === current ? tone : 'rgba(235,235,245,0.2)'}
            delay={index * BAR_STAGGER}
            height={Math.max(6, ((value - floor) / (max - floor)) * height)}
            width={values.length > 8 ? 9 : 16}
          />
        ))}
      </View>
      <View style={styles.axis}>
        {labels.map((label, index) => <Text key={index} style={styles.axisLabel}>{label}</Text>)}
      </View>
    </View>
  );
}

/** Smooth path through the points: each segment bends toward its neighbours without overshooting much. */
function smooth(points: { x: number; y: number }[]) {
  if (points.length === 0) return '';
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x},${c1.y} ${c2.x},${c2.y} ${p2.x},${p2.y}`;
  }
  return d;
}

/**
 * A trend line with a soft fill beneath it, three gridlines labelled on the right, and the latest
 * reading ringed. Data points are drawn as given; pass min and max to fix the scale.
 */
export function LineChart({
  band,
  format = (value: number) => String(Math.round(value)),
  height = 112,
  labels,
  max: fixedMax,
  min: fixedMin,
  summary,
  tone,
  values,
}: {
  /** A shaded range behind the line, such as a person's usual range. */
  band?: [number, number];
  /** How the gridline values on the right are written. */
  format?: (value: number) => string;
  height?: number;
  labels?: string[];
  /** Fix the vertical range so small changes aren't blown up into big swings. */
  max?: number;
  min?: number;
  summary: string;
  tone: string;
  values: number[];
}) {
  const styles = useAthleteStyles(baseStyles);
  const athlete = useAthleteAppearance();
  const [width, setWidth] = useState(0);
  const id = `fill${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const gutter = 30;
  const top = 10;
  const bottom = 6;
  const min = fixedMin ?? Math.min(...values);
  const max = fixedMax ?? Math.max(...values);
  const span = max - min || 1;
  const plot = Math.max(0, width - gutter - 8);
  const y = (value: number) => top + (1 - (value - min) / span) * (height - top - bottom);
  const points = values.map((value, index) => ({ x: 6 + (values.length === 1 ? 0.5 : index / (values.length - 1)) * plot, y: y(value) }));
  const last = points[points.length - 1];
  const line = smooth(points);
  const grid = [max, (max + min) / 2, min];
  // ponytail: dash length from the polyline, padded 20% for the curve's bends; measure the path if a trace ever ends early.
  const dash = 1.2 * points.reduce((sum, p, i) => (i ? sum + Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y) : 0), 0) + 1;
  // The line traces left to right, then the fill and the latest reading arrive. Starts after onLayout.
  const clock = useOneShotClock(1000, width > 0, useReducedMotion());
  const trace = useAnimatedProps(() => ({ strokeDashoffset: dash * (1 - seg(clock.value, 0, 700, 'inOut')) }));
  const area = useAnimatedProps(() => ({ opacity: seg(clock.value, 450, 900) }));
  const dot = useAnimatedProps(() => ({ opacity: seg(clock.value, 650, 1000) }));

  return (
    <View accessible accessibilityLabel={summary} onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)} style={styles.chart}>
      <Svg height={height} width="100%">
        <Defs>
          <SvgGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={tone} stopOpacity={0.32} />
            <Stop offset="1" stopColor={tone} stopOpacity={0} />
          </SvgGradient>
        </Defs>
        {width > 0 && last ? (
          <>
            {band ? <Rect fill="rgba(48,209,88,0.12)" height={y(band[0]) - y(band[1])} rx={4} width={width - gutter} x={0} y={y(band[1])} /> : null}
            {grid.map((value, index) => (
              <Fragment key={index}>
                <Line stroke="rgba(255,255,255,0.08)" strokeDasharray={index === 2 ? undefined : '2 4'} strokeWidth={1} x1={0} x2={width - gutter} y1={y(value)} y2={y(value)} />
                <SvgText fill={athlete ? '#FFFFFF' : 'rgba(235,235,245,0.5)'} fontWeight={athlete ? '400' : '600'} fontSize={11} textAnchor="end" x={width} y={y(value) + 4}>{format(value)}</SvgText>
              </Fragment>
            ))}
            <AnimatedG animatedProps={area}>
              <Path d={`${line} L${last.x},${height - bottom} L${points[0].x},${height - bottom} Z`} fill={`url(#${id})`} />
            </AnimatedG>
            <AnimatedPath animatedProps={trace} d={line} fill="none" stroke={tone} strokeDasharray={[dash, dash]} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
            <AnimatedG animatedProps={dot}>
              <Line stroke={tone} strokeDasharray="2 3" strokeOpacity={0.5} strokeWidth={1} x1={last.x} x2={last.x} y1={last.y + 8} y2={height - bottom} />
              <Circle cx={last.x} cy={last.y} fill={tone} opacity={0.22} r={10} />
              <Circle cx={last.x} cy={last.y} fill={tone} r={4.5} stroke="#101214" strokeWidth={2} />
            </AnimatedG>
          </>
        ) : null}
      </Svg>
      {labels ? (
        <View style={[styles.axis, { marginRight: gutter }]}>
          {labels.map((label, index) => <Text key={index} style={styles.axisLabel}>{label}</Text>)}
        </View>
      ) : null}
    </View>
  );
}


const baseStyles = StyleSheet.create({
  chart: { marginTop: 14 },
  bars: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between' },
  bar: { borderRadius: 4 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  axisLabel: { color: Palette.inkMuted, ...Type.labelSmall, letterSpacing: 0.6, textTransform: 'none' },
});
