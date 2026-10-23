import { Children, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Palette } from '@/constants/theme';
import { enter, settle } from '@/lib/motion';

// The dashboard's building blocks: one heading per section, rows grouped on one surface with
// hairline dividers, and metric tiles. Sentence case throughout, peach only on things you can tap.

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionRow}>
      <Text accessibilityRole="header" style={styles.section}>{title}</Text>
      {action && onAction ? (
        <Pressable accessibilityRole="button" hitSlop={10} onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** A quiet heading for a group of rows. */
export function CapsLabel({ children }: { children: string }) {
  return <Text accessibilityRole="header" style={styles.caps}>{children}</Text>;
}

const Chevron = () => (
  <Svg fill="none" height={18} stroke={Palette.inkMuted} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" width={18}><Path d="m9 6 6 6-6 6" /></Svg>
);

/** One row: a label, an optional detail line, and a value, control or chevron. */
export function ListRow({ label, detail, value, valueTone, onPress, trailing, destructive }: { label: string; detail?: string; value?: string; valueTone?: string; onPress?: () => void; trailing?: ReactNode; destructive?: boolean }) {
  const body = (
    <>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowLabel, destructive && { color: Palette.emergency }]}>{label}</Text>
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
      {value ? <Text style={[styles.rowValue, valueTone ? { color: valueTone } : null]}>{value}</Text> : null}
      {trailing ?? (onPress ? <Chevron /> : null)}
    </>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>{body}</Pressable>
  ) : (
    // A row that holds its own controls (approve, a switch) can't be one accessible element, or those controls disappear for VoiceOver.
    <View accessible={!trailing} style={styles.row}>{body}</View>
  );
}

/** Rows on one surface with hairline dividers. They arrive one after another and close up smoothly when one leaves. */
export function Rows({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <View style={styles.rows}>
      {Children.toArray(children).map((child, i) => (
        <Animated.View entering={enter(i, reduced)} key={(child as { key?: string }).key ?? i} layout={settle(reduced)}>
          {i > 0 ? <View style={styles.divider} /> : null}
          {child}
        </Animated.View>
      ))}
    </View>
  );
}

/** A metric tile: a label, a big value, and an optional status line. */
export function MetricTile({ label, value, unit, pill, pillTone = Palette.safe }: { label: string; value: string; unit?: string; pill?: string; pillTone?: string }) {
  return (
    <View accessible style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}{unit ? <Text style={styles.tileUnit}> {unit}</Text> : null}</Text>
      {pill ? <View style={styles.pill}><View style={[styles.pillDot, { backgroundColor: pillTone }]} /><Text style={styles.pillText}>{pill}</Text></View> : null}
    </View>
  );
}

export function Tiles({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <View style={styles.tiles}>
      {Children.toArray(children).map((child, i) => (
        <Animated.View entering={enter(i, reduced)} key={(child as { key?: string }).key ?? i} style={styles.tileSlot}>{child}</Animated.View>
      ))}
    </View>
  );
}

/** Marks example numbers so nobody takes them for the team's own. */
export function SampleTag() {
  return (
    <View accessible accessibilityLabel="Sample data" style={styles.sample}>
      <Text style={styles.sampleText}>Sample data</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  sectionRow: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, marginTop: 32 },
  section: { color: Palette.ink, fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  sectionAction: { color: Palette.coral, fontSize: 16, fontWeight: '600' },
  caps: { color: Palette.inkMuted, fontSize: 15, fontWeight: '600', marginBottom: 8, marginTop: 24 },
  rows: { backgroundColor: Palette.surface, borderRadius: 16, overflow: 'hidden' },
  divider: { backgroundColor: Palette.border, height: StyleSheet.hairlineWidth, marginLeft: 18 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 56, paddingHorizontal: 18, paddingVertical: 13 },
  rowCopy: { flex: 1, gap: 2 },
  rowLabel: { color: Palette.ink, fontSize: 17, fontWeight: '500' },
  rowDetail: { color: Palette.inkMuted, fontSize: 15, lineHeight: 20 },
  rowValue: { color: Palette.ink, fontSize: 17, fontVariant: ['tabular-nums'], fontWeight: '600' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tileSlot: { width: '48.5%' },
  tile: { backgroundColor: Palette.surface, borderRadius: 16, gap: 6, minHeight: 112, padding: 16 },
  tileLabel: { color: Palette.inkMuted, fontSize: 15, fontWeight: '500' },
  tileValue: { color: Palette.ink, fontSize: 32, fontVariant: ['tabular-nums'], fontWeight: '700', letterSpacing: -0.5 },
  tileUnit: { color: Palette.inkMuted, fontSize: 17, fontWeight: '500' },
  pill: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  pillDot: { borderRadius: 4, height: 8, width: 8 },
  pillText: { color: Palette.inkMuted, fontSize: 14, fontWeight: '500' },
  sample: { alignSelf: 'flex-start', borderColor: Palette.border, borderRadius: 999, borderWidth: 1, marginBottom: 12, paddingHorizontal: 10, paddingVertical: 3 },
  sampleText: { color: Palette.inkMuted, fontSize: 13, fontWeight: '500' },
});
