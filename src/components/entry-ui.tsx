import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { HeatSenseLogo } from '@/components/heatsense-logo';
import { MobileViewport } from '@/components/mobile-viewport';
import { OnboardingBackground, type CurveDraw, type OnboardingBackgroundVariant } from '@/components/onboarding-background';
import { Entry } from '@/constants/entry-theme';

type EntryScreenProps = {
  children: (compact: boolean) => ReactNode;
  /** Which composition of peach curves sits behind the page. */
  background?: OnboardingBackgroundVariant;
  backgroundDelay?: number;
  /** Draw the curves in on an outside clock (the welcome intro). */
  backgroundDraw?: CurveDraw;
  /** Drawn behind everything, under the curves (e.g. the sign-in photograph). */
  backdrop?: ReactNode;
};

export function EntryScreen({ children, background, backgroundDelay, backgroundDraw, backdrop }: EntryScreenProps) {
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(0);
  return (
    <MobileViewport>
      <View onLayout={(event: LayoutChangeEvent) => setHeight(event.nativeEvent.layout.height)} style={entryStyles.screen}>
        <StatusBar style="light" />
        {backdrop}
        {background ? <OnboardingBackground variant={background} delay={backgroundDelay} draw={backgroundDraw} /> : null}
        <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={[entryStyles.content, { paddingTop: Math.max(insets.top + 12, 26), paddingBottom: Math.max(insets.bottom + 12, 24) }]}>
          {children(height > 0 && height < 760)}
        </ScrollView>
      </View>
    </MobileViewport>
  );
}

/** Brand header. With `onBack` the brand is centered between Back and a spacer. `progress` adds the step track below it. */
export function EntryHeader({ onBack, progress }: { onBack?: () => void; progress?: { step: number; total: number } }) {
  return (
    <View>
      <View style={entryStyles.header}>
        {onBack ? <EntryBackButton onPress={onBack} /> : null}
        <View accessible accessibilityLabel="HeatSense" style={entryStyles.brand}>
          <HeatSenseLogo height={26} />
          <Text style={entryStyles.wordmark}>HeatSense</Text>
        </View>
        {onBack ? <View style={entryStyles.spacer} /> : null}
      </View>
      {progress ? <OnboardingProgress step={progress.step} total={progress.total} /> : null}
    </View>
  );
}

/** A short track that fills from the previous step to this one as the page opens. */
export function OnboardingProgress({ step, total }: { step: number; total: number }) {
  const reducedMotion = useReducedMotion();
  const fill = useSharedValue(reducedMotion ? step / total : (step - 1) / total);
  useEffect(() => {
    fill.set(withTiming(step / total, { duration: reducedMotion ? 0 : 700, easing: Easing.out(Easing.cubic) }));
  }, [fill, reducedMotion, step, total]);
  const bar = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${step} of ${total}`}
      accessibilityValue={{ min: 0, max: total, now: step }}
      style={entryStyles.track}>
      <Animated.View style={[entryStyles.trackFill, bar]} />
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

/** Peach pill, the primary action. `neutral` is the warm-white Google button; `secondary` is a quiet outlined pill. */
export function EntryButton({ label, onPress, disabled = false, loading = false, loadingLabel = 'Signing in…', icon, neutral = false, secondary = false }: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean; loadingLabel?: string; icon?: ReactNode; neutral?: boolean; secondary?: boolean }) {
  const [focused, setFocused] = useState(false);
  const primary = !neutral && !secondary && !(disabled && !loading);
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      aria-disabled={disabled || loading} aria-busy={loading}
      disabled={disabled || loading} onPress={onPress}
      onFocus={(event) => setFocused(isKeyboardFocus(event))} onBlur={() => setFocused(false)}
      style={({ pressed }) => [entryStyles.buttonWrap, focused && entryStyles.focus, pressed && entryStyles.pressedButton]}>
      {/* A hairline ring just outside the peach pill, as on the welcome reference. */}
      {primary ? <View pointerEvents="none" style={entryStyles.buttonRing} /> : null}
      <View style={[entryStyles.button, neutral && entryStyles.neutralButton, secondary && entryStyles.secondaryButton, disabled && !loading && entryStyles.disabledButton]}>
        {loading ? <ActivityIndicator color={secondary ? Entry.ink : Entry.canvas} /> : icon}
        <Text style={[entryStyles.buttonLabel, secondary && { color: Entry.ink }, disabled && !loading && { color: Entry.muted }]}>{loading ? loadingLabel : label}</Text>
      </View>
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
  // Same width as Back so the brand stays centered.
  spacer: { width: 44, height: 44 },
  track: { height: 3, borderRadius: 2, backgroundColor: Entry.raised, marginTop: 16, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: 2, backgroundColor: Entry.peach },
  back: { height: 44, width: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, borderColor: Entry.line, borderWidth: 1, backgroundColor: Entry.canvas },
  headline: { color: Entry.ink, fontFamily: Entry.heading, fontSize: 40, lineHeight: 46, letterSpacing: -1.4 },
  headlineCompact: { fontSize: 35, lineHeight: 40, letterSpacing: -1.2 },
  // Form pages: the same face, smaller so the fields stay the focus.
  formHeadline: { color: Entry.ink, fontFamily: Entry.heading, fontSize: 32, lineHeight: 38, letterSpacing: -1 },
  formHeadlineCompact: { fontSize: 28, lineHeight: 34, letterSpacing: -0.8 },
  description: { color: Entry.muted, fontFamily: Entry.body, fontSize: 15.5, lineHeight: 23, marginTop: 12, maxWidth: 340 },
  buttonWrap: { borderRadius: 999 },
  buttonRing: { position: 'absolute', top: -5, bottom: -5, left: -5, right: -5, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,177,131,0.32)' },
  button: { minHeight: 58, paddingVertical: 16, paddingHorizontal: 28, borderRadius: 999, borderWidth: 1, borderColor: Entry.peachEdge, backgroundColor: Entry.peach, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12 },
  neutralButton: { backgroundColor: Entry.ink, borderColor: Entry.ink },
  secondaryButton: { backgroundColor: Entry.surface, borderColor: Entry.lineStrong },
  disabledButton: { backgroundColor: Entry.raised, borderColor: Entry.raised },
  buttonLabel: { color: Entry.canvas, fontFamily: Entry.strong, fontSize: 16.5, letterSpacing: -0.2, flexShrink: 1, textAlign: 'center' },
  note: { color: Entry.muted, fontFamily: Entry.body, fontSize: 12.5, lineHeight: 18, textAlign: 'center' },
  focus: Platform.OS === 'web' ? { outlineColor: Entry.peach, outlineWidth: 2, outlineOffset: 4, outlineStyle: 'solid' } : { borderColor: Entry.peach, borderWidth: 2 },
  pressed: { opacity: 0.8 },
  pressedButton: { opacity: 0.92, transform: [{ scale: 0.985 }] },
  link: { color: Entry.muted, fontFamily: Entry.medium, fontSize: 14, lineHeight: 20 },
});
