import { useAthletePalette, useAthleteStyles } from '@/components/athlete-appearance';
import { useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { PressScale } from '@/components/motion/press-scale';
import { Palette } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'text' | 'danger';

export type ActionButtonProps = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  busy?: boolean;
  busyLabel?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

/** Dashboard actions only. Onboarding keeps its separate EntryButton design. */
export function ActionButton({ label, onPress, variant = 'primary', disabled = false, busy = false, busyLabel, accessibilityLabel, accessibilityHint, style }: ActionButtonProps) {
  const Palette = useAthletePalette();
  const styles = useAthleteStyles(baseStyles);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const blocked = disabled || busy;
  const shownLabel = busy ? busyLabel ?? label : label;
  const ink = variant === 'primary' ? Palette.canvas : variant === 'danger' ? Palette.emergency : Palette.ink;

  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? shownLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: blocked, busy }}
      disabled={blocked}
      onPress={() => { if (!blocked) onPress(); }}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onFocus={(event) => setFocused(Platform.OS !== 'web' || Boolean((event.target as unknown as Element | null)?.matches?.(':focus-visible')))}
      onBlur={() => setFocused(false)}
      style={[
        styles.button, styles[variant], style, styles.target,
        focused && styles.focused,
        disabled && !busy && styles.disabled,
        pressed && !blocked && styles.pressed,
      ]}>
      <View style={styles.content}>
        {busy ? <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.spinnerSlot}><ActivityIndicator color={ink} size="small" /></View> : null}
        <Text style={[styles.label, { color: ink }]}>{shownLabel}</Text>
        {busy ? <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.spinnerSlot} /> : null}
      </View>
    </PressScale>
  );
}

const baseStyles = StyleSheet.create({
  button: { alignItems: 'center', borderColor: 'transparent', borderRadius: 14, borderWidth: 1, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  target: { minHeight: 48, minWidth: 48 },
  primary: { backgroundColor: Palette.coral },
  secondary: { backgroundColor: Palette.surface, borderColor: Palette.border },
  text: { backgroundColor: 'transparent' },
  danger: { backgroundColor: 'transparent', borderColor: Palette.emergency },
  focused: { borderColor: Palette.ink },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
  content: { alignItems: 'center', flexDirection: 'row', gap: 8, maxWidth: '100%' },
  spinnerSlot: { alignItems: 'center', justifyContent: 'center', width: 20 },
  label: { flexShrink: 1, fontSize: 17, fontWeight: '600', lineHeight: 23, textAlign: 'center' },
});
