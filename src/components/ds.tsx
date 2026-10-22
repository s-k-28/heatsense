import { useState, type ReactNode } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Switch, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, SlideInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { isKeyboardFocus } from '@/components/entry-ui';
import { FramedModalContent } from '@/components/mobile-viewport';
import { Color, Motion, Radius, Space, TOUCH, Type } from '@/constants/design-system';

// Shared building blocks for screens on the HeatSense design system (docs/design/design-system.md).

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/* ─────────────────────────────── Glyphs ─────────────────────────────── */

type GlyphName = 'arrow' | 'copy' | 'check' | 'drop' | 'helmet' | 'clock' | 'minus' | 'plus' | 'close' | 'chevron' | 'warning' | 'phone' | 'share' | 'lock' | 'info' | 'logout';

// Lucide-style strokes, the same family as the onboarding icons.
const GLYPHS: Record<GlyphName, string[]> = {
  arrow: ['M5 12h14', 'M13 6l6 6-6 6'],
  copy: ['M10 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2Z', 'M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2'],
  check: ['M20 6 9 17l-5-5'],
  drop: ['M12 2.7s-6 6.4-6 11.3a6 6 0 0 0 12 0c0-4.9-6-11.3-6-11.3Z'],
  helmet: ['M3 14a9 9 0 0 1 18 0v2H3Z', 'M12 5v6', 'M3 16h12l2 4H7'],
  clock: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z', 'M12 6v6l4 2'],
  minus: ['M5 12h14'],
  plus: ['M12 5v14', 'M5 12h14'],
  close: ['M18 6 6 18', 'M6 6l12 12'],
  chevron: ['M9 18l6-6-6-6'],
  warning: ['M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z', 'M12 9v4', 'M12 17h.01'],
  phone: ['M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z'],
  share: ['M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8', 'M16 6l-4-4-4 4', 'M12 2v13'],
  lock: ['M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z', 'M7 11V7a5 5 0 0 1 10 0v4'],
  info: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z', 'M12 16v-4', 'M12 8h.01'],
  logout: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
};

export function Glyph({ color = Color.ink, name, size = 20, strokeWidth = 1.9 }: { color?: string; name: GlyphName; size?: number; strokeWidth?: number }) {
  return (
    <Svg aria-hidden fill="none" height={size} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} viewBox="0 0 24 24" width={size}>
      {GLYPHS[name].map((d) => <Path d={d} key={d} />)}
    </Svg>
  );
}

export function Arrow({ color, size = 18 }: { color: string; size?: number }) {
  return <Glyph color={color} name="arrow" size={size} strokeWidth={2} />;
}

/* ─────────────────────────────── Controls ─────────────────────────────── */

/** Every tappable thing: a quick press-scale, a hover wash on web, and a keyboard-only focus ring. */
export function Tap({
  accessibilityHint,
  accessibilityLabel,
  accessibilityRole = 'button',
  accessibilityState,
  children,
  disabled,
  onPress,
  radius,
  style,
}: {
  accessibilityHint?: string;
  accessibilityLabel: string;
  accessibilityRole?: 'button' | 'checkbox' | 'link';
  accessibilityState?: { checked?: boolean; selected?: boolean; disabled?: boolean };
  children: ReactNode;
  disabled?: boolean;
  onPress: () => void;
  radius: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ ...accessibilityState, disabled: Boolean(disabled) }}
      disabled={disabled}
      onBlur={() => setFocused(false)}
      onFocus={(event: unknown) => setFocused(isKeyboardFocus(event as { target?: unknown }))}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={onPress}
      onPressIn={() => { if (!reducedMotion) scale.set(withTiming(0.97, { duration: Motion.press })); }}
      onPressOut={() => scale.set(withTiming(1, { duration: Motion.release, easing: Easing.out(Easing.quad) }))}
      style={[style, { borderRadius: radius }, styles.noOutline, disabled && styles.disabled, pressStyle]}>
      {hovered && !disabled ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: Color.wash, borderRadius: radius }]} /> : null}
      {children}
      {focused ? <View pointerEvents="none" style={[styles.focusRing, { borderRadius: radius + 3 }]} /> : null}
    </AnimatedPressable>
  );
}

/** The one peach button in a section. */
export function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Tap accessibilityLabel={label} onPress={onPress} radius={Radius.pill} style={styles.primary}>
      <Text style={styles.primaryText}>{label}</Text>
      <Arrow color={Color.onAccent} />
    </Tap>
  );
}

export function SecondaryButton({ label, onPress, style }: { label: string; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Tap accessibilityLabel={label} onPress={onPress} radius={Radius.pill} style={[styles.secondary, style]}>
      <Text style={[Type.button, { color: Color.ink }]}>{label}</Text>
    </Tap>
  );
}

/** A secondary action set in type: peach text and an arrow, no container. */
export function TextAction({ arrow = true, hint, label, onPress }: { arrow?: boolean; hint?: string; label: string; onPress: () => void }) {
  return (
    <Tap accessibilityHint={hint} accessibilityLabel={label} onPress={onPress} radius={Radius.control} style={styles.textAction}>
      <Text style={styles.textActionLabel}>{label}</Text>
      {arrow ? <Arrow color={Color.accent} size={16} /> : null}
    </Tap>
  );
}

/* ─────────────────────────────── Sheet ─────────────────────────────── */

/** Bottom sheet: dims the screen, slides up inside the phone frame, closes on Done or a tap outside. */
export function Sheet({ children, hideDone, onClose, title, visible }: { children: ReactNode; hideDone?: boolean; onClose: () => void; title: string; visible: boolean }) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <Pressable accessibilityLabel="Close" accessibilityRole="button" onPress={onClose} style={styles.scrim} />
      <FramedModalContent>
        <View pointerEvents="box-none" style={styles.sheetDock}>
          <Animated.View entering={reducedMotion ? undefined : SlideInDown.duration(Motion.state + 60)} style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Space.l) + Space.l }]}>
            <View style={styles.sheetGrip} />
            <Text accessibilityRole="header" style={[Type.section, { color: Color.ink }]}>{title}</Text>
            {children}
            {hideDone ? null : (
              <Tap accessibilityLabel="Done" onPress={onClose} radius={Radius.pill} style={styles.sheetDone}>
                <Text style={[Type.button, { color: Color.ink }]}>Done</Text>
              </Tap>
            )}
          </Animated.View>
        </View>
      </FramedModalContent>
    </Modal>
  );
}

/* ─────────────────────────────── People ─────────────────────────────── */

export function initialsOf(name: string) {
  return name.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join('') || '?';
}

/** Initials in a soft peach circle. Profile photos aren't stored yet; when they are, they go here. */
export function Avatar({ name, size = 44, muted }: { name: string; size?: number; muted?: boolean }) {
  return (
    <View accessible={false} style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }, muted && styles.avatarMuted]}>
      <Text style={[styles.avatarText, { fontSize: Math.round(size * 0.34) }, muted && styles.avatarTextMuted]}>{initialsOf(name)}</Text>
    </View>
  );
}

/** Up to four overlapping avatars and a "+n" for the rest. */
export function AvatarStack({ names, size = 30 }: { names: string[]; size?: number }) {
  const shown = names.slice(0, 4);
  const extra = names.length - shown.length;
  return (
    <View accessible={false} style={styles.stack}>
      {shown.map((name, index) => (
        <View key={`${name}-${index}`} style={[styles.stackItem, { marginLeft: index === 0 ? 0 : -size * 0.32, borderRadius: size / 2 + 2 }]}>
          <Avatar name={name} size={size} />
        </View>
      ))}
      {extra > 0 ? <Text style={[Type.meta, styles.stackExtra]}>+{extra}</Text> : null}
    </View>
  );
}

/** A short state word in an outlined capsule. Use only for a defined state the screen explains. */
export function OutlinePill({ label, tone = Color.inkMuted }: { label: string; tone?: string }) {
  return (
    <View style={[styles.pill, { borderColor: tone }]}>
      <Text style={[styles.pillText, { color: tone }]}>{label}</Text>
    </View>
  );
}

/* ─────────────────────────────── Layout ─────────────────────────────── */

/** Small team name over a display-type page title. */
export function PageHeader({ label, title }: { label?: string | null; title: string }) {
  return (
    <View style={styles.pageHeader}>
      {label ? <Text numberOfLines={1} style={styles.pageLabel}>{label.toUpperCase()}</Text> : null}
      <Text accessibilityRole="header" style={[Type.page, { color: Color.ink }]}>{title}</Text>
    </View>
  );
}

/** One setting or link inside a grouped surface: title, optional value or switch, optional chevron. */
export function SettingRow({ detail, onPress, onToggle, title, toggled, value, tone }: { detail?: string; onPress?: () => void; onToggle?: (value: boolean) => void; title: string; toggled?: boolean; value?: string; tone?: string }) {
  const body = (
    <>
      <View style={styles.settingText}>
        <Text style={[Type.body, { color: tone ?? Color.ink }]}>{title}</Text>
        {detail ? <Text style={[Type.meta, { color: Color.inkMuted }]}>{detail}</Text> : null}
      </View>
      {value ? <Text style={[Type.support, { color: Color.inkMuted }]}>{value}</Text> : null}
      {onToggle ? (
        <Switch
          accessibilityLabel={title}
          ios_backgroundColor={Color.outline}
          onValueChange={onToggle}
          thumbColor={Color.ink}
          trackColor={{ false: Color.outline, true: Color.accent }}
          value={Boolean(toggled)}
          {...(Platform.OS === 'web' ? { activeThumbColor: Color.ink } : {})}
        />
      ) : null}
      {onPress ? <Glyph color={Color.inkSubtle} name="chevron" size={18} /> : null}
    </>
  );
  if (!onPress) return <View style={styles.setting}>{body}</View>;
  return <Tap accessibilityLabel={title} onPress={onPress} radius={Radius.control} style={styles.setting}>{body}</Tap>;
}

/** One surface holding related rows. Rows are separated by space, not lines. */
export function Group({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <View>
      {title ? <Text style={styles.groupTitle}>{title}</Text> : null}
      <View style={styles.group}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', backgroundColor: 'rgba(255,177,131,0.16)', justifyContent: 'center' },
  avatarMuted: { backgroundColor: Color.control },
  avatarText: { color: Color.accent, fontFamily: Type.bodyStrong.fontFamily },
  avatarTextMuted: { color: Color.inkMuted },
  stack: { alignItems: 'center', flexDirection: 'row' },
  stackItem: { borderColor: Color.canvas, borderWidth: 2 },
  stackExtra: { color: Color.inkMuted, marginLeft: Space.s },
  pill: { alignItems: 'center', borderRadius: Radius.pill, borderWidth: 1.25, justifyContent: 'center', minHeight: 26, paddingHorizontal: 10 },
  pillText: { ...Type.meta, fontFamily: Type.bodyStrong.fontFamily, fontSize: 12 },
  pageHeader: { gap: 4, marginBottom: Space.xl, marginTop: Space.xs },
  pageLabel: { ...Type.meta, color: Color.inkMuted, letterSpacing: 1.2 },
  group: { backgroundColor: Color.surface, borderCurve: 'continuous', borderRadius: Radius.surface, paddingHorizontal: Space.l, paddingVertical: Space.xs },
  groupTitle: { ...Type.meta, color: Color.inkMuted, fontFamily: Type.bodyStrong.fontFamily, marginBottom: Space.s, marginLeft: Space.xs },
  setting: { alignItems: 'center', flexDirection: 'row', gap: Space.m, marginHorizontal: -Space.s, minHeight: 52, paddingHorizontal: Space.s, paddingVertical: Space.s },
  settingText: { flex: 1, gap: 2 },
  noOutline: Platform.select({ web: { outlineStyle: 'none' } as unknown as ViewStyle, default: {} }),
  disabled: { opacity: 0.45 },
  focusRing: { borderColor: Color.focus, borderWidth: 2, bottom: -3, left: -3, position: 'absolute', right: -3, top: -3 },
  primary: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: Color.accent, borderCurve: 'continuous', flexDirection: 'row', gap: Space.s, minHeight: 58, overflow: 'hidden', paddingHorizontal: 26 },
  primaryText: { ...Type.button, color: Color.onAccent },
  secondary: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: Color.control, borderCurve: 'continuous', justifyContent: 'center', minHeight: 48, overflow: 'hidden', paddingHorizontal: 22 },
  textAction: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 6, marginLeft: -Space.s, marginTop: Space.xs, minHeight: TOUCH, paddingHorizontal: Space.s },
  textActionLabel: { ...Type.button, color: Color.accent, fontSize: 15 },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(5,7,8,0.6)' },
  sheetDock: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Color.surface, borderCurve: 'continuous', borderTopLeftRadius: Radius.hero, borderTopRightRadius: Radius.hero, maxHeight: '88%', maxWidth: 560, paddingHorizontal: Space.xl, paddingTop: Space.m, width: '100%' },
  sheetGrip: { alignSelf: 'center', backgroundColor: Color.control, borderRadius: 3, height: 5, marginBottom: Space.l, width: 40 },
  sheetDone: { alignItems: 'center', backgroundColor: Color.control, justifyContent: 'center', marginTop: Space.xl, minHeight: 52, overflow: 'hidden' },
});
