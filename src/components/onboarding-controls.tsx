import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { EntryButton } from '@/components/entry-ui';
import { Entry } from '@/constants/entry-theme';

// Shared onboarding controls in the entry design language (welcome / sign-in / role):
// raised charcoal surfaces with a quiet outline, a peach edge and check for the
// selected choice, and the peach primary button. No glass, no glowing borders.

/** Kept for screens that still reference it; this is the entry body face. */
export const onboardingFont = Entry.body;

export const OnboardingTokens = {
  surface: Entry.surface,
  surfaceRaised: Entry.selected,
  outline: Entry.line,
  outlineStrong: Entry.peach,
  outlineDisabled: Entry.line,
  text: Entry.ink,
  textMuted: Entry.muted,
  iconBlue: Entry.blue,
  iconGreen: Entry.blue,
  iconTeal: Entry.blue,
} as const;

const ease = Easing.out(Easing.cubic);
const FOCUS_RING = { outlineColor: Entry.blue, outlineStyle: 'solid', outlineWidth: 2, outlineOffset: 3 } as const;

function useMs() {
  const reducedMotion = useReducedMotion();
  return useCallback((value: number) => (reducedMotion ? 0 : value), [reducedMotion]);
}

// Keyboard focus only: on web a tap also focuses, but shouldn't leave a ring (:focus-visible).
const isKeyboardFocus = (event: { target?: unknown }) => Platform.OS !== 'web' || Boolean((event.target as Element | null)?.matches?.(':focus-visible'));

/** Round selection mark: outlined when off, peach with a dark check when on. */
export function SelectionIndicator({ selected }: { selected: boolean }) {
  const ms = useMs();
  const progress = useSharedValue(selected ? 1 : 0);
  useEffect(() => { progress.set(withTiming(selected ? 1 : 0, { duration: ms(200), easing: ease })); }, [ms, progress, selected]);
  const fill = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ scale: 0.6 + progress.value * 0.4 }] }));
  return (
    <View style={styles.indicator}>
      <View style={styles.indicatorRing} />
      <Animated.View style={[styles.indicatorFill, fill]}>
        <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={Entry.canvas} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><Path d="m5 12 4 4L19 6" /></Svg>
      </Animated.View>
    </View>
  );
}

type SelectionButtonProps = {
  icon: ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
  /** 'row': icon · text · indicator. 'stacked': icon and indicator on top, text below. */
  layout?: 'row' | 'stacked';
  height: number;
};

export function OnboardingSelectionButton({ icon, title, description, selected, onPress, layout = 'row', height }: SelectionButtonProps) {
  const ms = useMs();
  const [focused, setFocused] = useState(false);
  const progress = useSharedValue(selected ? 1 : 0);
  const hover = useSharedValue(0);
  useEffect(() => { progress.set(withTiming(selected ? 1 : 0, { duration: ms(220), easing: ease })); }, [ms, progress, selected]);

  const frame = useAnimatedStyle(() => ({
    borderColor: interpolateColor(progress.value, [0, 1], [interpolateColor(hover.value, [0, 1], [Entry.line, Entry.lineStrong]), Entry.peach]),
    backgroundColor: interpolateColor(progress.value, [0, 1], [Entry.surface, Entry.selected]),
  }));

  const copy = (
    <View style={layout === 'row' ? styles.rowCopy : styles.stackCopy}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`${title}. ${description}`}
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      onPress={onPress}
      onFocus={(event) => setFocused(isKeyboardFocus(event))}
      onBlur={() => setFocused(false)}
      onHoverIn={() => { hover.set(withTiming(1, { duration: ms(200), easing: ease })); }}
      onHoverOut={() => { hover.set(withTiming(0, { duration: ms(200), easing: ease })); }}
      style={({ pressed }) => [{ borderRadius: 20 }, focused && FOCUS_RING, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}>
      <Animated.View style={[styles.frame, { minHeight: height }, frame]}>
        {layout === 'row' ? (
          <View style={styles.row}>
            <View style={styles.iconSlot}>{icon}</View>
            {copy}
            <SelectionIndicator selected={selected} />
          </View>
        ) : (
          <View style={styles.stack}>
            <View style={styles.stackTop}>{icon}<SelectionIndicator selected={selected} /></View>
            {copy}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

/** The entry peach primary button, labelled "Continue" by default. */
export function OnboardingContinueButton({ enabled, onPress, label = 'Continue' }: { enabled: boolean; onPress: () => void; label?: string }) {
  return <EntryButton label={label} disabled={!enabled} onPress={onPress} />;
}

const styles = StyleSheet.create({
  frame: { borderWidth: 1, borderRadius: 20 },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14 },
  iconSlot: { width: 28, alignItems: 'center' },
  rowCopy: { flex: 1, gap: 5 },
  stack: { flex: 1, padding: 20, gap: 18, justifyContent: 'space-between' },
  stackTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stackCopy: { gap: 5 },
  title: { color: Entry.ink, fontWeight: '600', fontSize: 18, letterSpacing: -0.2 },
  description: { color: Entry.muted, fontWeight: '400', fontSize: 13, lineHeight: 19 },
  indicator: { width: 22, height: 22 },
  indicatorRing: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 11, borderWidth: 1, borderColor: Entry.muted },
  indicatorFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 11, backgroundColor: Entry.peach, alignItems: 'center', justifyContent: 'center' },
});
