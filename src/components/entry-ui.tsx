import { StatusBar } from 'expo-status-bar';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { HeatSenseLogo } from '@/components/heatsense-logo';
import { MobileViewport } from '@/components/mobile-viewport';
import { Entry } from '@/constants/entry-theme';

export function EntryScreen({ children }: { children: (compact: boolean) => ReactNode }) {
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(0);
  return (
    <MobileViewport>
      <View onLayout={(event: LayoutChangeEvent) => setHeight(event.nativeEvent.layout.height)} style={entryStyles.screen}>
        <StatusBar style="light" />
        <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={[entryStyles.content, { paddingTop: Math.max(insets.top + 12, 26), paddingBottom: Math.max(insets.bottom + 12, 24) }]}>
          {children(height > 0 && height < 760)}
        </ScrollView>
      </View>
    </MobileViewport>
  );
}

/** Brand header. With `onBack` the brand is centered between Back and either a spacer or a discreet step count ("01 / 03"). */
export function EntryHeader({ onBack, step }: { onBack?: () => void; step?: string }) {
  return (
    <View style={entryStyles.header}>
      {onBack ? <EntryBackButton onPress={onBack} /> : null}
      <View accessible accessibilityLabel="HeatSense" style={entryStyles.brand}>
        <HeatSenseLogo height={26} />
        <Text style={entryStyles.wordmark}>HeatSense</Text>
      </View>
      {onBack ? (
        <View style={entryStyles.stepSlot}>
          {step ? <Text accessibilityLabel={`Step ${step.replace(' / ', ' of ')}`} style={entryStyles.step}>{step}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

// Keyboard focus only: on web a tap also focuses, but shouldn't leave a ring (:focus-visible).
export function isKeyboardFocus(event: { target?: unknown }) {
  return Platform.OS !== 'web' || Boolean((event.target as Element | null)?.matches?.(':focus-visible'));
}

function EntryBackButton({ onPress }: { onPress: () => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onPress} onFocus={(event) => setFocused(isKeyboardFocus(event))} onBlur={() => setFocused(false)} style={({ pressed }) => [entryStyles.back, focused && entryStyles.focus, pressed && entryStyles.pressed]}>
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Entry.ink} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><Path d="m14 6-6 6 6 6" /></Svg>
    </Pressable>
  );
}

/** Peach primary action. `neutral` is the warm-white Google button; `secondary` is a quiet outlined action. */
export function EntryButton({ label, onPress, disabled = false, loading = false, loadingLabel = 'Signing in…', icon, neutral = false, secondary = false }: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean; loadingLabel?: string; icon?: ReactNode; neutral?: boolean; secondary?: boolean }) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      aria-disabled={disabled || loading} aria-busy={loading}
      disabled={disabled || loading} onPress={onPress}
      onFocus={(event) => setFocused(isKeyboardFocus(event))} onBlur={() => setFocused(false)}
      style={({ pressed }) => [entryStyles.button, neutral && entryStyles.neutralButton, secondary && entryStyles.secondaryButton, disabled && !loading && entryStyles.disabledButton, focused && entryStyles.focus, pressed && entryStyles.pressedButton]}>
      {loading ? <ActivityIndicator color={secondary ? Entry.ink : Entry.canvas} /> : icon}
      <Text style={[entryStyles.buttonLabel, secondary && { color: Entry.ink }, disabled && !loading && { color: Entry.muted }]}>{loading ? loadingLabel : label}</Text>
    </Pressable>
  );
}

/** Quiet text action under a button, e.g. "Skip for now". */
export function EntryLink({ label, onPress, disabled = false, align = 'center' }: { label: string; onPress: () => void; disabled?: boolean; align?: 'center' | 'left' }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)} hitSlop={10}
      style={({ pressed }) => [{ alignSelf: align === 'center' ? 'center' : 'flex-start', paddingVertical: 4 }, pressed && entryStyles.pressed, disabled && { opacity: 0.5 }]}>
      <Text style={[entryStyles.link, hovered && { textDecorationLine: 'underline' }]}>{label}</Text>
    </Pressable>
  );
}

export const entryStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Entry.canvas },
  content: { flexGrow: 1, paddingHorizontal: 26 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  wordmark: { color: Entry.ink, fontFamily: Entry.strong, fontSize: 19, letterSpacing: -0.6 },
  // Same width as Back so the brand stays centered; the count may extend left of it.
  stepSlot: { width: 44, height: 44, justifyContent: 'center' },
  step: { position: 'absolute', right: 0, width: 80, textAlign: 'right', color: Entry.subtle, fontFamily: Entry.medium, fontSize: 12, letterSpacing: 0.4, fontVariant: ['tabular-nums'] },
  back: { height: 44, width: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderColor: Entry.line, borderWidth: 1 },
  headline: { color: Entry.ink, fontFamily: Entry.display, fontSize: 58, lineHeight: 58, letterSpacing: -0.8 },
  headlineCompact: { fontSize: 48, lineHeight: 49 },
  // Form pages: the same display face, smaller so the fields stay the focus.
  formHeadline: { color: Entry.ink, fontFamily: Entry.display, fontSize: 48, lineHeight: 48, letterSpacing: -0.6 },
  formHeadlineCompact: { fontSize: 42, lineHeight: 42 },
  description: { color: Entry.muted, fontFamily: Entry.body, fontSize: 15, lineHeight: 23, marginTop: 14 },
  button: { minHeight: 58, paddingVertical: 16, paddingHorizontal: 18, borderRadius: 18, backgroundColor: Entry.peach, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12 },
  neutralButton: { backgroundColor: Entry.ink },
  secondaryButton: { backgroundColor: Entry.surface, borderWidth: 1, borderColor: Entry.lineStrong },
  disabledButton: { backgroundColor: Entry.raised },
  buttonLabel: { color: Entry.canvas, fontFamily: Entry.strong, fontSize: 16, flexShrink: 1, textAlign: 'center' },
  note: { color: Entry.muted, fontFamily: Entry.body, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  focus: Platform.OS === 'web' ? { outlineColor: Entry.blue, outlineWidth: 3, outlineOffset: 4, outlineStyle: 'solid' } : { borderColor: Entry.blue, borderWidth: 2 },
  pressed: { opacity: 0.8 },
  pressedButton: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  link: { color: Entry.muted, fontFamily: Entry.medium, fontSize: 14, lineHeight: 20 },
});
