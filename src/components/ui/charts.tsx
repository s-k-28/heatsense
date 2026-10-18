import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { Palette, Type } from '@/constants/theme';

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
  const max = Math.max(...values, floor + 1);
  const current = highlight ?? values.length - 1;
  return (
    <View accessible accessibilityLabel={summary} style={styles.chart}>
      <View style={[styles.bars, { height }]}>
        {values.map((value, index) => (
          <View
            key={index}
            style={[
              styles.bar,
              { backgroundColor: index === current ? tone : 'rgba(235,235,245,0.2)', height: Math.max(6, ((value - floor) / (max - floor)) * height), width: values.length > 8 ? 9 : 16 },
            ]}
          />
        ))}
      </View>
      <View style={styles.axis}>
        {labels.map((label, index) => <Text key={index} style={styles.axisLabel}>{label}</Text>)}
      </View>
    </View>
  );
}

/** A plain line over faint gridlines, with the latest reading marked. Data points are drawn as given. */
export function LineChart({
  height = 96,
  labels,
  max: fixedMax,
  min: fixedMin,
  summary,
  tone,
  values,
}: {
  height?: number;
  labels?: [string, string];
  /** Fix the vertical range so small changes aren't blown up into big swings. */
  max?: number;
  min?: number;
  summary: string;
  tone: string;
  values: number[];
}) {
  const [width, setWidth] = useState(0);
  const pad = 6;
  const min = fixedMin ?? Math.min(...values);
  const max = fixedMax ?? Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => {
    const x = pad + (index / (values.length - 1)) * Math.max(0, width - pad * 2);
    const y = pad + (1 - (value - min) / span) * (height - pad * 2);
    return { x, y };
  });
  const last = points[points.length - 1];

  return (
    <View accessible accessibilityLabel={summary} onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)} style={styles.chart}>
      <Svg height={height} width="100%">
        {[0.25, 0.5, 0.75].map((fraction) => (
          <Line key={fraction} stroke={Palette.border} strokeWidth={StyleSheetHairline} x1={0} x2={width} y1={height * fraction} y2={height * fraction} />
        ))}
        {width > 0 ? (
          <>
            <Polyline fill="none" points={points.map((point) => `${point.x},${point.y}`).join(' ')} stroke={tone} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
            <Circle cx={last.x} cy={last.y} fill={tone} r={4} />
          </>
        ) : null}
      </Svg>
      {labels ? (
        <View style={styles.axis}>
          <Text style={styles.axisLabel}>{labels[0]}</Text>
          <Text style={styles.axisLabel}>{labels[1]}</Text>
        </View>
      ) : null}
    </View>
  );
}

const StyleSheetHairline = StyleSheet.hairlineWidth;

const styles = StyleSheet.create({
  chart: { marginTop: 14 },
  bars: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between' },
  bar: { borderRadius: 4 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  axisLabel: { color: Palette.inkMuted, ...Type.caption },
});
