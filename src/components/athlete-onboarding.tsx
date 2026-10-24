import { Text } from '@/components/ui/text';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Easing, FadeIn, FadeInUp, useReducedMotion } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { EntryButton, EntryHeader, EntryLink } from '@/components/entry-ui';
import { SelectionIndicator } from '@/components/onboarding-controls';
import { Entry, ONBOARDING_STEPS } from '@/constants/entry-theme';

// Shared pieces of athlete onboarding, in the entry design language (welcome /
// sign-in / role): field charcoal, Archivo headings and Manrope body, peach for the primary
// action, selected answers, and focus; light blue only for small accents.
export const ATHLETE_SCREEN = Entry.canvas;
export const ATHLETE_ERROR = Entry.error;
export const athleteEase = Easing.out(Easing.cubic);

const FOCUS_RING = { outlineColor: Entry.peach, outlineStyle: 'solid', outlineWidth: 2, outlineOffset: 3 } as const;
const isKeyboardFocus = (event: { target?: unknown }) => Platform.OS !== 'web' || Boolean((event.target as Element | null)?.matches?.(':focus-visible'));

/**
 * Entrance helpers: a fade-up and a fade, both off under reduced motion.
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
        if (reducedMotion || Platform.OS === 'web') return undefined;
        if (!rises.has(delay)) rises.set(delay, FadeInUp.duration(300).easing(athleteEase));
        return rises.get(delay);
      },
      fade: (delay: number) => {
        if (reducedMotion || Platform.OS === 'web') return undefined;
        if (!fades.has(delay)) fades.set(delay, FadeIn.duration(300).easing(athleteEase));
        return fades.get(delay);
      },
    };
  }, [reducedMotion]);
}

/** Back, the HeatSense brand, and the progress track for this step of the athlete flow. */
export function AthleteHeader({ onBack, step, bandDock }: { onBack?: () => void; step?: number; bandDock?: boolean }) {
  return <EntryHeader bandDock={bandDock} onBack={onBack} progress={step ? { step, total: ONBOARDING_STEPS.athlete } : undefined} />;
}

/** The entry peach primary button. */
export function AthletePillButton({ label, enabled, loading = false, onPress }: { label: string; enabled: boolean; loading?: boolean; onPress: () => void }) {
  return <EntryButton label={label} disabled={!enabled && !loading} loading={loading} loadingLabel="Saving…" onPress={onPress} />;
}

// ── Questions ───────────────────────────────────────────────────────────────

/** Small label that opens a group of questions. */
export function AthleteSectionLabel({ children }: { children: string }) {
  return <Text accessibilityRole="header" style={choiceStyles.section}>{children}</Text>;
}

export type Choice = { code: string; label: string };

function CheckboxIndicator({ selected }: { selected: boolean }) {
  return (
    <View style={[choiceStyles.box, selected && choiceStyles.boxOn]}>
      {selected && <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={Entry.canvas} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round"><Path d="m5 12 4 4L19 6" /></Svg>}
    </View>
  );
}

function ChoiceRow({ choice, selected, multiple, onPress }: { choice: Choice; selected: boolean; multiple: boolean; onPress: () => void }) {
  // The focus ring is for keyboard users; a tap focuses the row too, but shouldn't draw a second outline.
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      accessibilityLabel={choice.label}
      onPress={onPress}
      onFocus={(event) => setFocused(isKeyboardFocus(event))}
      onBlur={() => setFocused(false)}
      style={({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) => [
        choiceStyles.row,
        selected && choiceStyles.rowOn,
        (hovered || pressed) && !selected && choiceStyles.rowHover,
        pressed && { transform: [{ scale: 0.99 }] },
        focused && FOCUS_RING,
      ]}>
      <Text style={[choiceStyles.rowText, selected && choiceStyles.rowTextOn]}>{choice.label}</Text>
      {multiple ? <CheckboxIndicator selected={selected} /> : <SelectionIndicator selected={selected} />}
    </Pressable>
  );
}

/** One question with single-select (radio) answers. Tapping the chosen answer again clears it. */
export function SingleChoice({ question, choices, value, onChange }: { question: string; choices: readonly Choice[]; value: string | null; onChange: (code: string | null) => void }) {
  return (
    <View accessibilityRole="radiogroup" aria-label={question} style={choiceStyles.group}>
      <Text style={choiceStyles.question}>{question}</Text>
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
      <Text style={choiceStyles.question}>{question}</Text>
      {choices.map((choice) => (
        <ChoiceRow key={choice.code} choice={choice} multiple selected={value.includes(choice.code)} onPress={() => toggle(choice.code)} />
      ))}
    </View>
  );
}

/** Quiet text action under the main button, e.g. "Skip for now". */
export function AthleteTextLink({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <EntryLink label={label} onPress={onPress} disabled={disabled} />;
}

const choiceStyles = StyleSheet.create({
  section: { color: Entry.ink, fontFamily: Entry.strong, fontSize: 14, letterSpacing: -0.1 },
  group: { gap: 10 },
  question: { color: Entry.ink, fontFamily: Entry.body, fontSize: 15.5, lineHeight: 22, marginBottom: 2 },
  row: { minHeight: 54, borderRadius: 18, borderWidth: 1, borderColor: Entry.line, backgroundColor: Entry.surface, flexDirection: 'row', alignItems: 'center', gap: 14, paddingLeft: 18, paddingRight: 16, paddingVertical: 13 },
  rowHover: { borderColor: Entry.lineStrong },
  rowOn: { borderColor: Entry.peach, backgroundColor: Entry.peachTint },
  rowText: { flex: 1, color: Entry.muted, fontFamily: Entry.body, fontSize: 15.5, lineHeight: 21 },
  rowTextOn: { color: Entry.ink, fontFamily: Entry.medium },
  box: { width: 22, height: 22, borderRadius: 7, borderWidth: 1, borderColor: Entry.muted, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: Entry.peach, borderColor: Entry.peach },
});
