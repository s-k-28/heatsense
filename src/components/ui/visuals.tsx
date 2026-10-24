import { Text } from '@/components/ui/text';
import { StyleSheet, View } from 'react-native';

import { Palette, Spacing, Type } from '@/constants/theme';

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
          // Short segments (a 4-minute break) still get room for their label.
          <View key={segment.label} style={{ flex: segment.flex, minWidth: 52 }}>
            <Text numberOfLines={1} style={styles.segmentTime}>{segment.time}</Text>
            <Text numberOfLines={1} style={styles.segmentName}>{segment.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
