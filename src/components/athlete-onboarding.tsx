import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInUp, interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { HeatSenseLogo } from '@/components/heatsense-logo';
import { SelectionIndicator } from '@/components/onboarding-controls';

// Shared pieces of athlete onboarding. The visual source of truth is the sign-in
// screen ("Built for the heat."): same near-black background, type, 22pt side
// padding, header, and white-outlined pill controls.
export const ATHLETE_SCREEN = '#090909';
export const ATHLETE_MUTED = '#B8B8B8';
export const ATHLETE_ERROR = '#FFB9A7';
export const athleteFont = Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif', default: '"Helvetica Neue", Helvetica, Arial, sans-serif' });

const T = {
  outline: 'rgba(255,255,255,0.85)',
  outlineStrong: '#FFFFFF',
  outlineDisabled: 'rgba(255,255,255,0.22)',
  surfaceHover: '#161616',
} as const;

export const athleteEase = Easing.out(Easing.cubic);
const FOCUS_RING = { outlineColor: '#FFFFFF', outlineStyle: 'solid', outlineWidth: 2, outlineOffset: 3 } as const;

function useMs() {
  const reducedMotion = useReducedMotion();
  return useCallback((value: number) => (reducedMotion ? 0 : value), [reducedMotion]);
}

/**
 * Entrance helpers: the same fade-up and fade the join screen uses, both off under reduced motion.
 * Keep these to Reanimated's built-in presets: on web, a customized entering animation
 * (e.g. withInitialValues) is pinned with position: absolute a few seconds after it ends,
 * which pulls the element out of the layout. Each delay's builder is created once.
 */
export function useAthleteEntrance() {
  const reducedMotion = useReducedMotion();
  return useMemo(() => {
    const rises = new Map<number, ReturnType<typeof FadeInUp.delay>>();
    const fades = new Map<number, ReturnType<typeof FadeIn.delay>>();
    return {
      rise: (delay: number) => {
        if (reducedMotion) return undefined;
        if (!rises.has(delay)) rises.set(delay, FadeInUp.delay(delay).duration(520).easing(athleteEase));
        return rises.get(delay);
      },
      fade: (delay: number) => {
        if (reducedMotion) return undefined;
        if (!fades.has(delay)) fades.set(delay, FadeIn.delay(delay).duration(450).easing(athleteEase));
        return fades.get(delay);
      },
    };
  }, [reducedMotion]);
}

function BackChevron() {
  return <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="m15 5-7 7 7 7" /></Svg>;
}

/** Back circle on the left, HeatSense logo on the right, and an optional discreet step count between them. */
export function AthleteHeader({ onBack, step }: { onBack?: () => void; step?: string }) {
  return (
    <View style={styles.topRow}>
      {onBack ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} hitSlop={8} style={({ pressed }) => [styles.circle, pressed && styles.pressed]}>
          <BackChevron />
        </Pressable>
      ) : <View style={styles.spacer} />}
      {step ? <Text accessibilityLabel={`Step ${step.replace(' / ', ' of ')}`} style={[styles.step, { fontFamily: athleteFont }]}>{step}</Text> : null}
      <View style={styles.logoPlate}><HeatSenseLogo height={24} /></View>
    </View>
  );
}

// Matches "Continue with Google": full-width pill, white outline, dark interior, white text.
export function AthletePillButton({ label, enabled, loading = false, onPress }: { label: string; enabled: boolean; loading?: boolean; onPress: () => void }) {
  const ms = useMs();
  const [focused, setFocused] = useState(false);
  const hover = useSharedValue(0);
  const press = useSharedValue(0);
  useEffect(() => { if (!enabled) { hover.set(0); press.set(0); } }, [enabled, hover, press]);
  const frame = useAnimatedStyle(() => ({
    borderColor: interpolateColor(hover.value, [0, 1], [T.outline, T.outlineStrong]),
    backgroundColor: interpolateColor(hover.value, [0, 1], [ATHLETE_SCREEN, T.surfaceHover]),
    transform: [{ scale: 1 - press.value * 0.015 }],
  }));

  if (!enabled) {
    return (
      <View accessible accessibilityRole="button" accessibilityLabel={label} aria-disabled aria-busy={loading} style={[styles.pill, styles.pillDisabled]}>
        {loading ? <ActivityIndicator size="small" color="#FFFFFF" accessibilityLabel="Saving" /> : <Text style={[styles.pillText, styles.pillTextDisabled, { fontFamily: athleteFont }]}>{label}</Text>}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      // Ring for keyboard focus only; a tap shouldn't leave a second outline (web: :focus-visible).
      onFocus={(event) => setFocused(Platform.OS !== 'web' || Boolean((event.target as unknown as Element | null)?.matches?.(':focus-visible')))}
      onBlur={() => setFocused(false)}
      onHoverIn={() => { hover.set(withTiming(1, { duration: ms(200), easing: athleteEase })); }}
      onHoverOut={() => { hover.set(withTiming(0, { duration: ms(200), easing: athleteEase })); }}
      onPressIn={() => { press.set(withTiming(1, { duration: ms(110), easing: athleteEase })); }}
      onPressOut={() => { press.set(withTiming(0, { duration: ms(200), easing: athleteEase })); }}
      style={[{ borderRadius: 9999 }, focused && FOCUS_RING]}>
      <Animated.View style={[styles.pill, frame]}>
        <Text style={[styles.pillText, { fontFamily: athleteFont }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // flexGrow + stretch: fill the row whether the caller wraps it in a row or a column.
  topRow: { flexGrow: 1, alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  circle: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: '#FFFFFF', backgroundColor: ATHLETE_SCREEN, alignItems: 'center', justifyContent: 'center' },
  logoPlate: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(9,9,9,0.62)', alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  spacer: { width: 44, height: 44 },
  step: { color: '#8E8E8E', fontSize: 12.5, letterSpacing: 1, fontVariant: ['tabular-nums'] },
  pill: { height: 60, borderRadius: 9999, borderWidth: 1.5, borderColor: T.outline, backgroundColor: ATHLETE_SCREEN, alignItems: 'center', justifyContent: 'center' },
  pillDisabled: { borderColor: T.outlineDisabled },
  pillText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', letterSpacing: -0.1 },
  pillTextDisabled: { opacity: 0.4 },
});

// ── Questions ───────────────────────────────────────────────────────────────

/** Understated label that opens a group of questions. */
export function AthleteSectionLabel({ children }: { children: string }) {
  return <Text accessibilityRole="header" style={[choiceStyles.section, { fontFamily: athleteFont }]}>{children}</Text>;
}

export type Choice = { code: string; label: string };

function CheckboxIndicator({ selected }: { selected: boolean }) {
  return (
    <View style={[choiceStyles.box, selected && choiceStyles.boxOn]}>
      {selected && <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round"><Path d="m5 12 4 4L19 6" /></Svg>}
    </View>
  );
}

function ChoiceRow({ choice, selected, multiple, onPress }: { choice: Choice; selected: boolean; multiple: boolean; onPress: () => void }) {
  // The focus ring is for keyboard users; a tap focuses the row too, but shouldn't draw a
  // second outline. On web the browser knows which is which (:focus-visible).
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      accessibilityLabel={choice.label}
      onPress={onPress}
      onFocus={(event) => setFocused(Platform.OS !== 'web' || Boolean((event.target as unknown as Element | null)?.matches?.(':focus-visible')))}
      onBlur={() => setFocused(false)}
      style={({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) => [
        choiceStyles.row,
        selected && choiceStyles.rowOn,
        (hovered || pressed) && !selected && choiceStyles.rowHover,
        pressed && { transform: [{ scale: 0.99 }] },
        focused && FOCUS_RING,
      ]}>
      <Text style={[choiceStyles.rowText, { fontFamily: athleteFont }]}>{choice.label}</Text>
      {multiple ? <CheckboxIndicator selected={selected} /> : <SelectionIndicator selected={selected} />}
    </Pressable>
  );
}

/** One question with single-select (radio) answers. Tapping the chosen answer again clears it. */
export function SingleChoice({ question, choices, value, onChange }: { question: string; choices: readonly Choice[]; value: string | null; onChange: (code: string | null) => void }) {
  return (
    <View accessibilityRole="radiogroup" aria-label={question} style={choiceStyles.group}>
      <Text style={[choiceStyles.question, { fontFamily: athleteFont }]}>{question}</Text>
      {choices.map((choice) => (
        <ChoiceRow key={choice.code} choice={choice} multiple={false} selected={value === choice.code} onPress={() => onChange(value === choice.code ? null : choice.code)} />
      ))}
    </View>
  );
}

/** One question with checkbox answers. Exclusive answers (e.g. "None") clear the others, and vice versa. */
export function MultiChoice({ question, choices, value, exclusive, onChange }: { question: string; choices: readonly Choice[]; value: string[]; exclusive: readonly string[]; onChange: (codes: string[]) => void }) {
  const toggle = (code: string) => {
    if (value.includes(code)) onChange(value.filter((item) => item !== code));
    else if (exclusive.includes(code)) onChange([code]);
    else onChange([...value.filter((item) => !exclusive.includes(item)), code]);
  };
  return (
    <View role="group" aria-label={question} style={choiceStyles.group}>
      <Text style={[choiceStyles.question, { fontFamily: athleteFont }]}>{question}</Text>
      {choices.map((choice) => (
        <ChoiceRow key={choice.code} choice={choice} multiple selected={value.includes(choice.code)} onPress={() => toggle(choice.code)} />
      ))}
    </View>
  );
}

/** Quiet text action under the main button, e.g. "Skip for now". */
export function AthleteTextLink({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      hitSlop={10}
      style={choiceStyles.linkWrap}>
      <Text style={[choiceStyles.link, { fontFamily: athleteFont }, hover && choiceStyles.underline, disabled && { opacity: 0.5 }]}>{label}</Text>
    </Pressable>
  );
}

const choiceStyles = StyleSheet.create({
  section: { color: '#FFFFFF', fontSize: 14, fontWeight: '500', letterSpacing: -0.1 },
  group: { gap: 10 },
  question: { color: '#E8E8E8', fontSize: 15.5, lineHeight: 22, fontWeight: '400', marginBottom: 2 },
  row: { minHeight: 54, borderRadius: 27, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)', backgroundColor: '#101010', flexDirection: 'row', alignItems: 'center', gap: 14, paddingLeft: 22, paddingRight: 16, paddingVertical: 12 },
  rowHover: { borderColor: 'rgba(255,255,255,0.75)', backgroundColor: '#141414' },
  rowOn: { borderColor: '#FFFFFF', backgroundColor: '#181818' },
  rowText: { flex: 1, color: '#FFFFFF', fontSize: 15.5, lineHeight: 21, fontWeight: '400' },
  box: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  linkWrap: { alignSelf: 'center', paddingVertical: 4 },
  link: { color: ATHLETE_MUTED, fontSize: 14, lineHeight: 20 },
  underline: { textDecorationLine: 'underline' },
});
