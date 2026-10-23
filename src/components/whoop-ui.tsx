import { Children, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Palette } from '@/constants/theme';
import { enter, settle } from '@/lib/motion';

// The dashboard's building blocks, after WHOOP: one heading per section, small caps group labels,
// full-width dark rows with one idea each, and metric tiles. One accent color, no decoration.

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionRow}>
      <Text accessibilityRole="header" style={styles.section}>{title}</Text>
      {action && onAction ? (
        <Pressable accessibilityRole="button" hitSlop={10} onPress={onAction}>
          <Text style={styles.sectionAction}>{action.toUpperCase()}  →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function CapsLabel({ children }: { children: string }) {
  return <Text style={styles.caps}>{children.toUpperCase()}</Text>;
}

const Chevron = () => (
  <Svg fill="none" height={18} stroke={Palette.inkMuted} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" width={18}><Path d="m9 6 6 6-6 6" /></Svg>
);

/** One full-width row: small caps label, optional detail line, and a value, control or chevron. */
export function ListRow({ label, detail, value, valueTone, onPress, trailing, destructive }: { label: string; detail?: string; value?: string; valueTone?: string; onPress?: () => void; trailing?: ReactNode; destructive?: boolean }) {
  const body = (
    <>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowLabel, destructive && { color: Palette.emergency }]}>{label.toUpperCase()}</Text>
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
      {value ? <Text style={[styles.rowValue, valueTone ? { color: valueTone } : null]}>{value}</Text> : null}
      {trailing ?? (onPress ? <Chevron /> : null)}
    </>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>{body}</Pressable>
  ) : (
    <View accessible style={styles.row}>{body}</View>
  );
}

/** Rows arrive one after another and close up smoothly when one leaves. */
export function Rows({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <View style={styles.rows}>
      {Children.toArray(children).map((child, i) => (
        <Animated.View entering={enter(i, reduced)} key={(child as { key?: string }).key ?? i} layout={settle(reduced)}>{child}</Animated.View>
      ))}
    </View>
  );
}

/** A metric tile: small caps label, a big value, and an optional status pill. */
export function MetricTile({ compact = false, label, value, unit, pill, pillTone = Palette.safe }: { compact?: boolean; label: string; value: string; unit?: string; pill?: string; pillTone?: string }) {
  return (
    <View accessible style={[styles.tile, compact && styles.tileCompact]}>
      <Text style={[styles.tileLabel, compact && styles.tileLabelCompact]}>{label.toUpperCase()}</Text>
      <Text style={[styles.tileValue, compact && styles.tileValueCompact]}>{value}{unit ? <Text style={[styles.tileUnit, compact && styles.tileUnitCompact]}> {unit}</Text> : null}</Text>
      {pill ? <View style={[styles.pill, { borderColor: pillTone }]}><Text style={[styles.pillText, { color: pillTone }]}>{pill}</Text></View> : null}
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

export function SampleTag() {
  return <Text style={styles.sample}>SAMPLE DATA</Text>;
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  sectionRow: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, marginTop: 32 },
  section: { color: Palette.ink, fontSize: 24, fontWeight: '700', letterSpacing: -0.4 },
  sectionAction: { color: Palette.coral, fontSize: 13, fontWeight: '800', letterSpacing: 1.3 },
  caps: { color: Palette.inkMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1.4, marginBottom: 10, marginTop: 20 },
  rows: { gap: 8 },
  row: { alignItems: 'center', backgroundColor: Palette.card, borderRadius: 14, flexDirection: 'row', gap: 12, minHeight: 60, paddingHorizontal: 18, paddingVertical: 12 },
  rowCopy: { flex: 1, gap: 3 },
  rowLabel: { color: Palette.ink, fontSize: 14, fontWeight: '700', letterSpacing: 1.2 },
  rowDetail: { color: Palette.inkMuted, fontSize: 14, lineHeight: 19 },
  rowValue: { color: Palette.ink, fontSize: 17, fontVariant: ['tabular-nums'], fontWeight: '600' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tileSlot: { width: '48.5%' },
  tile: { backgroundColor: Palette.card, borderRadius: 16, gap: 8, minHeight: 122, padding: 16 },
  tileLabel: { color: Palette.inkMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1.3 },
  tileValue: { color: Palette.ink, fontSize: 30, fontVariant: ['tabular-nums'], fontWeight: '700' },
  tileUnit: { color: Palette.inkMuted, fontSize: 16, fontWeight: '600' },
  tileCompact: { gap: 4, minHeight: 0, paddingHorizontal: 14, paddingVertical: 12 },
  tileLabelCompact: { fontSize: 11 },
  tileValueCompact: { fontSize: 22 },
  tileUnitCompact: { fontSize: 13 },
  pill: { alignSelf: 'flex-start', borderRadius: 999, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 3 },
  pillText: { fontSize: 12, fontWeight: '700' },
  sample: { color: Palette.inkMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.6, marginBottom: 6, textAlign: 'center' },
});
