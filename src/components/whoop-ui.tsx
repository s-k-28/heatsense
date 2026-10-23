import { useAthletePalette, useAthleteStyles } from '@/components/athlete-appearance';
import { Children, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { PressScale } from '@/components/motion/press-scale';
import { Face, Palette } from '@/constants/theme';
import { settle } from '@/lib/motion';

// The dashboard's building blocks: one heading per section, rows grouped on one surface with
// hairline dividers, stats and cards. Sentence case throughout, peach only on things you can tap.

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const styles = useAthleteStyles(baseStyles);
  return (
    <View style={styles.sectionRow}>
      <Text accessibilityRole="header" style={styles.section}>{title}</Text>
      {action && onAction ? (
        <PressScale accessibilityRole="button" onPress={onAction} style={styles.sectionTarget}>
          <Text style={styles.sectionAction}>{action}</Text>
        </PressScale>
      ) : null}
    </View>
  );
}

/** A quiet heading for a group of rows. */
export function CapsLabel({ children }: { children: string }) {
  const styles = useAthleteStyles(baseStyles);
  return <Text accessibilityRole="header" style={styles.caps}>{children}</Text>;
}

/** Stands in for a profile picture or initials before someone has a name. */
export function PersonGlyph({ size = 44 }: { size?: number }) {
  const Palette = useAthletePalette();
  return <Svg fill="none" height={size} stroke={Palette.inkMuted} strokeLinecap="round" strokeWidth={1.8} viewBox="0 0 24 24" width={size}><Path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0" /></Svg>;
}

const Chevron = () => (
  <Svg fill="none" height={18} stroke={Palette.inkMuted} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" width={18}><Path d="m9 6 6 6-6 6" /></Svg>
);

/** One row: a label, an optional detail line, and a value, control or chevron. */
export function ListRow({ label, detail, value, valueTone, onPress, trailing, destructive, selected }: { label: string; detail?: string; value?: string; valueTone?: string; onPress?: () => void; trailing?: ReactNode; destructive?: boolean; selected?: boolean }) {
  const Palette = useAthletePalette();
  const styles = useAthleteStyles(baseStyles);
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
    <Pressable accessibilityRole="button" accessibilityState={selected === undefined ? undefined : { selected }} onPress={onPress} style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && styles.pressed]}>{body}</Pressable>
  ) : (
    // A row that holds its own controls (approve, a switch) can't be one accessible element, or those controls disappear for VoiceOver.
    <View accessible={!trailing} style={styles.row}>{body}</View>
  );
}

/** Rows on one surface with hairline dividers. Reading lists appear immediately; changed rows settle calmly. */
export function Rows({ children }: { children: ReactNode }) {
  const styles = useAthleteStyles(baseStyles);
  const reduced = useReducedMotion();
  return (
    <View style={styles.rows}>
      {Children.toArray(children).map((child, i) => (
        <Animated.View key={(child as { key?: string }).key ?? i} layout={settle(reduced)}>
          {i > 0 ? <View style={styles.divider} /> : null}
          {child}
        </Animated.View>
      ))}
    </View>
  );
}

/**
 * Information people read (a zone rule, a warning sign, a step to take): a bold lead-in and the rest
 * of the sentence at full reading size, as one paragraph, never a title with a small grey line under it.
 */
export function Facts({ items }: { items: { title: string; body: string; tone?: string }[] }) {
  const styles = useAthleteStyles(baseStyles);
  // When any item has a dot, the others keep the dot's space so every paragraph starts on one edge.
  const dotted = items.some((item) => item.tone);
  return (
    <Rows>
      {items.map((item) => (
        <View accessible key={item.title} style={styles.fact}>
          {dotted ? <View style={[styles.factDot, { backgroundColor: item.tone ?? 'transparent' }]} /> : null}
          <Text style={styles.factText}><Text style={styles.factTitle}>{item.title}. </Text>{item.body}</Text>
        </View>
      ))}
    </Rows>
  );
}

/** Numbers side by side, value over its label, the way an activity summary reads. */
export function StatRow({ stats }: { stats: { label: string; value: string; unit?: string; tone?: string }[] }) {
  const styles = useAthleteStyles(baseStyles);
  return (
    <View style={styles.statRow}>
      {stats.map((stat) => (
        <View accessible accessibilityLabel={`${stat.label}: ${stat.value}${stat.unit ? ` ${stat.unit}` : ''}`} key={stat.label} style={styles.stat}>
          <Text style={[styles.statValue, stat.tone ? { color: stat.tone } : null]}>{stat.value}{stat.unit ? <Text style={styles.statUnit}>{stat.unit}</Text> : null}</Text>
          <Text style={styles.statLabel}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}

/** One self-contained card: a title, an optional message, and whatever it holds. */
export function Card({ title, message, children, onPress }: { title: string; message?: string; children?: ReactNode; onPress?: () => void }) {
  const styles = useAthleteStyles(baseStyles);
  const body = (
    <>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle}>{title}</Text>
        {onPress ? <Chevron /> : null}
      </View>
      {message ? <Text style={styles.cardMessage}>{message}</Text> : null}
      {children}
    </>
  );
  return onPress ? (
    <PressScale accessibilityRole="button" onPress={onPress} style={styles.card}>{body}</PressScale>
  ) : <View style={styles.card}>{body}</View>;
}

/** Marks example numbers so nobody takes them for the team's own. */
export function SampleTag() {
  const styles = useAthleteStyles(baseStyles);
  return (
    <View accessible accessibilityLabel="Sample data" style={styles.sample}>
      <View style={styles.sampleDot} />
      <Text style={styles.sampleText}>Sample data</Text>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  sectionTarget: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-end' },
  sectionRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', marginBottom: 12, marginTop: 32 },
  section: { flexShrink: 1, color: Palette.ink, fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  sectionAction: { color: Palette.coral, fontSize: 16, fontWeight: '600' },
  caps: { color: Palette.inkMuted, fontSize: 15, fontWeight: '600', marginBottom: 8, marginTop: 24 },
  rows: { backgroundColor: Palette.surface, borderRadius: 16, overflow: 'hidden' },
  divider: { backgroundColor: Palette.border, height: StyleSheet.hairlineWidth, marginLeft: 18 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 56, paddingHorizontal: 18, paddingVertical: 13 },
  rowCopy: { flex: 1, gap: 2 },
  rowSelected: { backgroundColor: Palette.fill },
  rowLabel: { color: Palette.ink, fontSize: 17, fontWeight: '500' },
  rowDetail: { color: Palette.inkMuted, fontSize: 15, lineHeight: 20 },
  rowValue: { flexShrink: 1, textAlign: 'right', maxWidth: '50%', color: Palette.ink, fontSize: 17, fontVariant: ['tabular-nums'], fontWeight: '600' },
  fact: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, paddingHorizontal: 18, paddingVertical: 16 },
  factDot: { borderRadius: 5, height: 10, marginTop: 7, width: 10 },
  factText: { color: Palette.inkMuted, flex: 1, fontSize: 17, lineHeight: 24 },
  factTitle: { color: Palette.ink, fontWeight: '600' },
  statRow: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, gap: 2 },
  statValue: { color: Palette.ink, fontFamily: Face.figure, fontSize: 36, lineHeight: 40, letterSpacing: 0.2 },
  statUnit: { color: Palette.inkMuted, fontFamily: Face.label, fontSize: 22 },
  statLabel: { color: Palette.inkMuted, fontSize: 15, fontWeight: '500' },
  card: { backgroundColor: Palette.surface, borderRadius: 16, gap: 14, padding: 18 },
  cardTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { color: Palette.ink, flex: 1, fontSize: 18, fontWeight: '600' },
  cardMessage: { color: Palette.inkMuted, fontSize: 17, lineHeight: 24, marginTop: -6 },
  sample: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 6, marginBottom: 12 },
  sampleDot: { backgroundColor: Palette.info, borderRadius: 3, height: 6, width: 6 },
  sampleText: { color: Palette.inkMuted, fontSize: 14, fontWeight: '500' },
});
