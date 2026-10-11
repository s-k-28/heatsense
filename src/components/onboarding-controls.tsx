import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

// Shared onboarding controls, modeled on the sign-in screen's Google / Apple buttons:
// charcoal surface, precise white outline, white type, neutral (never orange) states.
// Every onboarding screen should use these so the flow stays visually consistent.
export const onboardingFont = Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif', default: '"Helvetica Neue", Helvetica, Arial, sans-serif' });

export const OnboardingTokens = {
  surface: '#222222',
  surfaceRaised: '#272727',
  outline: 'rgba(255,255,255,0.85)',
  outlineStrong: '#FFFFFF',
  outlineDisabled: 'rgba(255,255,255,0.22)',
  text: '#FFFFFF',
  textMuted: '#B8B8B8',
  // Restrained icon colors for options (logo and mascot keep their own colors).
  iconBlue: '#7AA7FF',
  iconGreen: '#5ED3A0',
  iconTeal: '#5CC4D9',
} as const;

const ease = Easing.out(Easing.cubic);
const FOCUS_RING = { outlineColor: '#FFFFFF', outlineStyle: 'solid', outlineWidth: 2, outlineOffset: 3 } as const;

function useMs() {
  const reducedMotion = useReducedMotion();
  return useCallback((value: number) => (reducedMotion ? 0 : value), [reducedMotion]);
}

export function SelectionIndicator({ selected }: { selected: boolean }) {
  const ms = useMs();
  const progress = useSharedValue(selected ? 1 : 0);
  useEffect(() => { progress.set(withTiming(selected ? 1 : 0, { duration: ms(200), easing: ease })); }, [ms, progress, selected]);
  const fill = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ scale: 0.6 + progress.value * 0.4 }] }));
  return (
    <View style={styles.indicator}>
      <View style={styles.indicatorRing} />
      <Animated.View style={[styles.indicatorFill, fill]}>
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><Path d="m5 12 4 4L19 6" /></Svg>
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
  /** 'row': icon · text · indicator in a pill. 'stacked': icon and indicator on top, text below. */
  layout?: 'row' | 'stacked';
  height: number;
};

export function OnboardingSelectionButton({ icon, title, description, selected, onPress, layout = 'row', height }: SelectionButtonProps) {
  const ms = useMs();
  const [focused, setFocused] = useState(false);
  const progress = useSharedValue(selected ? 1 : 0);
  const hover = useSharedValue(0);
  const press = useSharedValue(0);
  useEffect(() => { progress.set(withTiming(selected ? 1 : 0, { duration: ms(220), easing: ease })); }, [ms, progress, selected]);

  const radius = layout === 'row' ? 9999 : 30;
  const frame = useAnimatedStyle(() => ({
    borderColor: interpolateColor(Math.max(progress.value, hover.value), [0, 1], [OnboardingTokens.outline, OnboardingTokens.outlineStrong]),
    backgroundColor: interpolateColor(Math.max(progress.value, hover.value * 0.6), [0, 1], [OnboardingTokens.surface, OnboardingTokens.surfaceRaised]),
    transform: [{ scale: 1 - press.value * 0.015 }],
  }));
  // Selected: a hairline inner ring (reads as a ~2px white edge) plus a faint top highlight.
  const selectedEdge = useAnimatedStyle(() => ({ opacity: progress.value }));

  const copy = (
    <View style={layout === 'row' ? styles.rowCopy : styles.stackCopy}>
      <Text style={[styles.title, { fontFamily: onboardingFont }]}>{title}</Text>
      <Text style={[styles.description, { fontFamily: onboardingFont }]}>{description}</Text>
    </View>
  );

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`${title}. ${description}`}
      aria-checked={selected}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onHoverIn={() => { hover.set(withTiming(1, { duration: ms(200), easing: ease })); }}
      onHoverOut={() => { hover.set(withTiming(0, { duration: ms(200), easing: ease })); }}
      onPressIn={() => { press.set(withTiming(1, { duration: ms(110), easing: ease })); }}
      onPressOut={() => { press.set(withTiming(0, { duration: ms(200), easing: ease })); }}
      style={[{ borderRadius: radius }, focused && FOCUS_RING]}>
      <Animated.View style={[styles.frame, { height, borderRadius: radius }, frame]}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.selectedEdge, { borderRadius: radius }, selectedEdge]} />
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

export function OnboardingContinueButton({ enabled, onPress, label = 'Continue' }: { enabled: boolean; onPress: () => void; label?: string }) {
  const ms = useMs();
  const [focused, setFocused] = useState(false);
  const hover = useSharedValue(0);
  const press = useSharedValue(0);
  const frame = useAnimatedStyle(() => ({
    borderColor: interpolateColor(hover.value, [0, 1], [OnboardingTokens.outline, OnboardingTokens.outlineStrong]),
    backgroundColor: interpolateColor(hover.value, [0, 1], ['rgba(255,255,255,0)', 'rgba(255,255,255,0.05)']),
    transform: [{ scale: 1 - press.value * 0.015 }],
  }));
  const arrow = useAnimatedStyle(() => ({ transform: [{ translateX: hover.value * 3 }] }));

  if (!enabled) {
    return (
      <View accessible accessibilityRole="button" accessibilityLabel={label} aria-disabled style={[styles.continue, styles.continueDisabled]}>
        <Text style={[styles.continueText, styles.continueTextDisabled, { fontFamily: onboardingFont }]}>{label}</Text>
        <Text style={[styles.continueText, styles.continueTextDisabled, { fontFamily: onboardingFont }]}>→</Text>
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onHoverIn={() => { hover.set(withTiming(1, { duration: ms(200), easing: ease })); }}
      onHoverOut={() => { hover.set(withTiming(0, { duration: ms(200), easing: ease })); }}
      onPressIn={() => { press.set(withTiming(1, { duration: ms(110), easing: ease })); }}
      onPressOut={() => { press.set(withTiming(0, { duration: ms(200), easing: ease })); }}
      style={[{ borderRadius: 9999 }, focused && FOCUS_RING]}>
      <Animated.View style={[styles.continue, frame]}>
        <Text style={[styles.continueText, { fontFamily: onboardingFont }]}>{label}</Text>
        <Animated.Text style={[styles.continueText, { fontFamily: onboardingFont }, arrow]}>→</Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: { borderWidth: 1.5, overflow: 'hidden' },
  selectedEdge: { boxShadow: 'inset 0 0 0 0.75px rgba(255,255,255,0.9), inset 0 1px 0 1px rgba(255,255,255,0.08)' },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 26, gap: 18 },
  iconSlot: { width: 28, alignItems: 'center' },
  rowCopy: { flex: 1, gap: 4 },
  stack: { flex: 1, padding: 22, justifyContent: 'space-between' },
  stackTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stackCopy: { gap: 4 },
  title: { color: OnboardingTokens.text, fontSize: 20, fontWeight: '600', letterSpacing: -0.4 },
  description: { color: OnboardingTokens.textMuted, fontSize: 14, lineHeight: 19, fontWeight: '400' },
  indicator: { width: 26, height: 26 },
  indicatorRing: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 13, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.55)' },
  indicatorFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 13, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  continue: { height: 60, borderRadius: 9999, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  continueDisabled: { borderColor: OnboardingTokens.outlineDisabled },
  continueText: { color: OnboardingTokens.text, fontSize: 17.5, fontWeight: '600', letterSpacing: -0.2 },
  continueTextDisabled: { opacity: 0.4 },
});
