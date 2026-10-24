import { AnimatedText } from '@/components/ui/text';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Entry } from '@/constants/entry-theme';

// Shared onboarding controls in the entry design language (welcome / sign-in / role):
// charcoal surfaces with a quiet outline, and a peach edge plus a faint peach tint for
// the selected choice. Choices are told apart by their words, not by icons.

const ease = Easing.out(Easing.cubic);
const FOCUS_RING = { outlineColor: Entry.peach, outlineStyle: 'solid', outlineWidth: 2, outlineOffset: 3 } as const;

function useMs() {
  const reducedMotion = useReducedMotion();
  return useCallback((value: number) => (reducedMotion ? 0 : value), [reducedMotion]);
}

// Keyboard focus only: on web a tap also focuses, but shouldn't leave a ring (:focus-visible).
const isKeyboardFocus = (event: { target?: unknown }) => Platform.OS !== 'web' || Boolean((event.target as Element | null)?.matches?.(':focus-visible'));

/** Round selection mark for answer lists: outlined when off, peach with a dark check when on. */
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

type SelectionSurfaceProps = {
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
  minHeight?: number;
  /** Larger title for a screen whose main act is this choice (role selection). */
  large?: boolean;
};

/** A large rounded choice: title and one line of description. Selecting it warms the edge and fill to peach. */
export function OnboardingSelectionSurface({ title, description, selected, onPress, minHeight = 88, large = false }: SelectionSurfaceProps) {
  const ms = useMs();
  const [focused, setFocused] = useState(false);
  const progress = useSharedValue(selected ? 1 : 0);
  const hover = useSharedValue(0);
  useEffect(() => { progress.set(withTiming(selected ? 1 : 0, { duration: ms(240), easing: ease })); }, [ms, progress, selected]);

  const frame = useAnimatedStyle(() => ({
    borderColor: interpolateColor(progress.value, [0, 1], [interpolateColor(hover.value, [0, 1], [Entry.line, Entry.lineStrong]), Entry.peach]),
    backgroundColor: interpolateColor(progress.value, [0, 1], [Entry.surface, Entry.peachTint]),
  }));
  // The selected title warms to peach and eases a few px right, so the choice reads without a check mark.
  const titleStyle = useAnimatedStyle(() => ({ color: interpolateColor(progress.value, [0, 1], [Entry.ink, Entry.peach]), transform: [{ translateX: 4 * progress.value }] }));
  const descriptionStyle = useAnimatedStyle(() => ({ transform: [{ translateX: 4 * progress.value }] }));

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
      style={({ pressed }) => [{ borderRadius: 26 }, focused && FOCUS_RING, pressed && { transform: [{ scale: 0.99 }] }]}>
      <Animated.View style={[styles.surface, { minHeight }, frame]}>
        <AnimatedText style={[styles.title, large && styles.titleLarge, titleStyle]}>{title}</AnimatedText>
        <AnimatedText style={[styles.description, descriptionStyle]}>{description}</AnimatedText>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  surface: { borderWidth: 1, borderRadius: 26, paddingHorizontal: 22, paddingVertical: 18, justifyContent: 'center', gap: 5 },
  title: { fontFamily: Entry.heading, fontSize: 20, letterSpacing: -0.5 },
  titleLarge: { fontSize: 23, letterSpacing: -0.7 },
  description: { color: Entry.muted, fontFamily: Entry.body, fontSize: 14, lineHeight: 20 },
  indicator: { width: 22, height: 22 },
  indicatorRing: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 11, borderWidth: 1, borderColor: Entry.muted },
  indicatorFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 11, backgroundColor: Entry.peach, alignItems: 'center', justifyContent: 'center' },
});
