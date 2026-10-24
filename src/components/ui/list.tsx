import { ActionButton } from '@/components/ui/action-button';
import { Surface } from '@/components/ui/surface';
import { Text } from '@/components/ui/text';
import { useAthletePalette, useAthleteStyles } from '@/components/ui/role-appearance';
import { Children, isValidElement, type ComponentProps, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { HeatIcon } from '@/components/ui/heat-icon';
import { Palette, Radius, Spacing, Type } from '@/constants/theme';

type IconName = ComponentProps<typeof HeatIcon>['name'];

export const chevron = { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' } as const;

/** A rounded surface, the building block of every screen. Flat: no outline, no shadow. */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const styles = useAthleteStyles(baseStyles);
  return <Surface style={[styles.card, style]}>{children}</Surface>;
}

/** Uppercase card label with its symbol. White unless the card reports a state. Tappable when it leads somewhere. */
export function CardHeader({
  icon,
  label,
  onPress,
  tone,
  trailing,
}: {
  icon?: IconName;
  label: string;
  onPress?: () => void;
  /** Only pass a tone when the card reports a state (a zone, an alert). Category cards stay neutral. */
  tone?: string;
  trailing?: string;
}) {
  const Palette = useAthletePalette();
  const styles = useAthleteStyles(baseStyles);
  const color = tone ?? Palette.ink;
  const content = (
    <View style={styles.cardHeader}>
      <View style={styles.categoryRow}>
        {icon ? <HeatIcon name={icon} size={16} tintColor={color} weight="semibold" /> : null}
        <Text style={[styles.categoryLabel, { color }]}>{label}</Text>
      </View>
      <View style={styles.categoryRow}>
        {trailing ? <Text style={styles.cardMeta}>{trailing}</Text> : null}
        {onPress ? <HeatIcon name={chevron} size={11} tintColor={Palette.inkMuted} weight="bold" /> : null}
      </View>
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.linkTarget, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

/** Inset grouped list: rows on one surface with hairline separators between them. */
export function Group({ children, inset = Spacing.four, style }: { children: ReactNode; inset?: number; style?: StyleProp<ViewStyle> }) {
  const styles = useAthleteStyles(baseStyles);
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <View style={[styles.group, style]}>
      {items.map((item, index) => (
        <View key={index}>
          {index > 0 ? <View style={[styles.separator, { marginLeft: inset }]} /> : null}
          {item}
        </View>
      ))}
    </View>
  );
}

export function Row({
  accessibilityLabel,
  centered,
  destructive,
  detail,
  strong,
  leading,
  metric,
  onPress,
  showChevron,
  title,
  trailing,
  value,
  valueTone,
}: {
  accessibilityLabel?: string;
  centered?: boolean;
  destructive?: boolean;
  /** Semibold title, for the one row on a screen that matters most. */
  strong?: boolean;
  detail?: string;
  leading?: ReactNode;
  /** A reading rather than a setting: uppercase label, value set in figures. */
  metric?: boolean;
  onPress?: () => void;
  showChevron?: boolean;
  title: string;
  trailing?: ReactNode;
  value?: string;
  valueTone?: string;
}) {
  const Palette = useAthletePalette();
  const styles = useAthleteStyles(baseStyles);
  const body = (pressed: boolean) => (
    <View style={[styles.row, pressed && styles.rowPressed]}>
      {leading}
      <View style={[styles.rowCopy, centered && styles.rowCopyCentered]}>
        <Text style={[styles.rowTitle, metric && styles.rowTitleMetric, strong && styles.rowTitleStrong, destructive && styles.rowTitleDestructive]}>{title}</Text>
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
      {value ? <Text style={[styles.rowValue, metric && styles.rowValueMetric, valueTone ? { color: valueTone } : null]}>{value}</Text> : null}
      {trailing}
      {showChevron ?? Boolean(onPress) ? <HeatIcon name={chevron} size={13} tintColor={Palette.inkFaint} weight="semibold" /> : null}
    </View>
  );
  const label = accessibilityLabel ?? [title, detail, value].filter(Boolean).join(', ');
  if (!onPress) return <View accessible accessibilityLabel={label}>{body(false)}</View>;
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => body(pressed)}
    </Pressable>
  );
}

/** Solid square behind a symbol, as in the Settings app. */
export function IconTile({ color = '#636366', icon }: { color?: string; icon: IconName }) {
  const styles = useAthleteStyles(baseStyles);
  return (
    <View style={[styles.iconTile, { backgroundColor: color }]}>
      <HeatIcon name={icon} size={16} tintColor="#FFFFFF" weight="semibold" />
    </View>
  );
}

export function Initials({ name, size = 40 }: { name: string; size?: number }) {
  const styles = useAthleteStyles(baseStyles);
  const letters = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join('');
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.initials, { borderRadius: size / 2, height: size, width: size }]}>
      <Text style={[styles.initialsText, { fontSize: size * 0.38 }]}>{letters}</Text>
    </View>
  );
}

/** Standard filled button. */
export function Button({ label, onPress, tone = 'tint' }: { label: string; onPress: () => void; tone?: 'tint' | 'gray' }) {
  return <ActionButton label={label} onPress={onPress} variant={tone === 'gray' ? 'secondary' : 'primary'} />;
}

/** Plain text link in the tint color. */
export function TextLink({ label, onPress }: { label: string; onPress?: () => void }) {
  const styles = useAthleteStyles(baseStyles);
  return (
    <Pressable accessibilityRole="button" hitSlop={10} onPress={onPress} style={({ pressed }) => [styles.linkTarget, pressed && styles.pressed]}>
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

export const textStyles = StyleSheet.create({
  largeTitle: { color: Palette.ink, ...Type.largeTitle },
  title2: { color: Palette.ink, ...Type.title2 },
  title3: { color: Palette.ink, ...Type.title3 },
  headline: { color: Palette.ink, ...Type.headline },
  body: { color: Palette.ink, ...Type.body },
  subhead: { color: Palette.inkMuted, ...Type.subhead },
  footnote: { color: Palette.inkMuted, ...Type.footnote },
});

const baseStyles = StyleSheet.create({
  pressed: { opacity: 0.55 },
  card: { backgroundColor: Palette.card, borderColor: Palette.cardEdge, borderCurve: 'continuous', borderRadius: Radius.medium, borderWidth: 0, padding: Spacing.five },
  cardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 24 },
  categoryRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  categoryLabel: { ...Type.label },
  cardMeta: { color: Palette.inkMuted, ...Type.footnote },
  group: { backgroundColor: Palette.card, borderColor: Palette.cardEdge, borderCurve: 'continuous', borderRadius: Radius.medium, borderWidth: 0, overflow: 'hidden' },
  separator: { backgroundColor: Palette.border, height: StyleSheet.hairlineWidth },
  row: { alignItems: 'center', flexDirection: 'row', gap: Spacing.three, minHeight: 52, paddingHorizontal: Spacing.four, paddingVertical: 10 },
  rowPressed: { backgroundColor: 'rgba(255,255,255,0.08)' },
  rowCopy: { flex: 1, gap: 1 },
  rowCopyCentered: { alignItems: 'center' },
  rowTitleStrong: { fontWeight: '600' },
  rowTitleDestructive: { color: Palette.emergency },
  rowTitle: { color: Palette.ink, ...Type.body },
  rowTitleMetric: { ...Type.label },
  rowValueMetric: { ...Type.figure, fontSize: 24, lineHeight: 28 },
  rowDetail: { color: Palette.inkMuted, ...Type.subhead },
  rowValue: { color: Palette.inkMuted, ...Type.body, flexShrink: 1, maxWidth: '48%', textAlign: 'right' },
  iconTile: { alignItems: 'center', borderCurve: 'continuous', borderRadius: 7, height: 29, justifyContent: 'center', width: 29 },
  initials: { alignItems: 'center', backgroundColor: Palette.fill, justifyContent: 'center' },
  initialsText: { color: Palette.inkMuted, fontWeight: '600' },
  button: { alignItems: 'center', borderCurve: 'continuous', borderRadius: 14, justifyContent: 'center', minHeight: 50, paddingHorizontal: Spacing.five },
  buttonTint: { backgroundColor: Palette.coral },
  buttonGray: { backgroundColor: Palette.fill },
  buttonLabel: { ...Type.label, fontSize: 16, lineHeight: 20 },
  buttonLabelTint: { color: '#1A0E07' },
  buttonLabelGray: { color: Palette.ink },
  linkTarget: { minHeight: 44, minWidth: 44, justifyContent: 'center' },
  link: { color: Palette.coral, ...Type.body },
});
