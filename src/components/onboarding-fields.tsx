import { useCallback, useEffect, useState, type Ref } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type Role, type TextInputProps, type TextStyle } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { GlassSurface } from '@/components/glass-surface';
import { onboardingFont, OnboardingTokens } from '@/components/onboarding-controls';

// Form fields for onboarding, in the same component family as the sign-in screen's
// Sign-in buttons: a charcoal pill with a clear white outline and white type.
// Focus brightens the outline to a solid 2px white; errors use a restrained red
// outline plus a short message. Never orange.
const ease = Easing.out(Easing.cubic);
const ERROR = '#FF8E8E';
const ROW_HEIGHT = 48;
// React Native's Role type omits 'listbox'; React Native Web passes it through to the DOM.
const LISTBOX = 'listbox' as Role;
const MENU_PADDING = 6;
const FOCUS_RING = { outlineColor: '#FFFFFF', outlineStyle: 'solid', outlineWidth: 2, outlineOffset: 3 } as const;
// The field draws its own focus state, so drop the browser's default input outline.
// React Native's types omit 'none', but React Native Web passes it through (Chrome ignores a 0 width on its 'auto' outline).
const noWebOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null;

function useMs() {
  const reducedMotion = useReducedMotion();
  return useCallback((value: number) => (reducedMotion ? 0 : value), [reducedMotion]);
}

function useTimedValue(target: number, duration: number) {
  const ms = useMs();
  const value = useSharedValue(target);
  useEffect(() => { value.set(withTiming(target, { duration: ms(duration), easing: ease })); }, [ms, value, target, duration]);
  return value;
}

// 'glass' is the coach onboarding look; 'flat' is the sign-in screen's look (plain
// dark interior, no glass), used by athlete onboarding.
export type FieldSurface = 'glass' | 'flat';

// The pill itself: surface, outline, focus ring, and error ring, shared by both field types.
function FieldFrame({ height, active, invalid, hover, press, surface = 'glass', children }: { height: number; active: boolean; invalid: boolean; hover: SharedValue<number>; press?: SharedValue<number>; surface?: FieldSurface; children: React.ReactNode }) {
  const focus = useTimedValue(active ? 1 : 0, 200);
  const error = useTimedValue(invalid ? 1 : 0, 200);
  const frame = useAnimatedStyle(() => ({ transform: [{ scale: 1 - (press?.value ?? 0) * 0.015 }] }));
  const outline = useAnimatedStyle(() => ({
    borderColor: interpolateColor(Math.max(focus.value, hover.value * 0.6), [0, 1], [OnboardingTokens.outline, OnboardingTokens.outlineStrong]),
    opacity: 1 - error.value * (1 - focus.value),
  }));
  const focusRing = useAnimatedStyle(() => ({ opacity: focus.value }));
  const errorRing = useAnimatedStyle(() => ({ opacity: error.value * (1 - focus.value) }));
  const lift = useAnimatedStyle(() => ({ opacity: Math.max(focus.value, hover.value * 0.5) }));
  const radius = height / 2;
  return (
    <Animated.View style={[{ height, borderRadius: radius }, surface === 'flat' && styles.flat, frame]}>
      {/* Decorative only: on web an absolutely positioned layer paints above the input, so it must not take touches. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {/* A flat field paints its fill on the frame itself: an opaque absolute layer would cover the text on web. */}
        {surface === 'glass' && <GlassSurface radius={radius} sheen={0.8} style={StyleSheet.absoluteFill} />}
      </View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.lift, { borderRadius: radius }, lift]} />
      {children}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.outline, { borderRadius: radius }, outline]} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.focusRing, { borderRadius: radius }, focusRing]} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.errorRing, { borderRadius: radius }, errorRing]} />
    </Animated.View>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <Text style={[styles.label, { fontFamily: onboardingFont }]}>{children}</Text>;
}

function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <Text accessibilityLiveRegion="polite" role="alert" style={[styles.error, { fontFamily: onboardingFont }]}>{message}</Text>;
}

type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  error?: string | null;
  height?: number;
  inputRef?: Ref<TextInput>;
  onFocus?: () => void;
  onBlur?: () => void;
  surface?: FieldSurface;
  /** Keep `label` for screen readers but don't draw it (e.g. paired inputs under one shared label). */
  hideLabel?: boolean;
  /** Outline the field as invalid without a message under it (the message is shown elsewhere). */
  invalid?: boolean;
} & Pick<TextInputProps, 'returnKeyType' | 'onSubmitEditing' | 'autoCapitalize' | 'textContentType' | 'autoComplete' | 'maxLength' | 'submitBehavior' | 'keyboardType' | 'inputMode' | 'accessibilityHint' | 'autoCorrect'>;

export function OnboardingTextField({ label, value, onChangeText, placeholder, error, height = 60, inputRef, onFocus, onBlur, surface, hideLabel, invalid, ...inputProps }: TextFieldProps) {
  const ms = useMs();
  const [focused, setFocused] = useState(false);
  const hover = useSharedValue(0);
  return (
    <View>
      {!hideLabel && <FieldLabel>{label}</FieldLabel>}
      <Pressable
        accessible={false}
        focusable={false}
        onHoverIn={() => { hover.set(withTiming(1, { duration: ms(200), easing: ease })); }}
        onHoverOut={() => { hover.set(withTiming(0, { duration: ms(200), easing: ease })); }}>
        <FieldFrame height={height} active={focused} invalid={!!error || !!invalid} hover={hover} surface={surface}>
          <TextInput
            ref={inputRef}
            accessibilityLabel={label}
            aria-invalid={!!error || !!invalid}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#8A8A8A"
            selectionColor="#FFFFFF"
            cursorColor="#FFFFFF"
            keyboardAppearance="dark"
            autoCorrect={false}
            onFocus={() => { setFocused(true); onFocus?.(); }}
            onBlur={() => { setFocused(false); onBlur?.(); }}
            style={[styles.input, { fontFamily: onboardingFont }, noWebOutline]}
            {...inputProps}
          />
        </FieldFrame>
      </Pressable>
      <FieldError message={error} />
    </View>
  );
}

function Chevron({ open }: { open: boolean }) {
  const progress = useTimedValue(open ? 1 : 0, 220);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${progress.value * 180}deg` }] }));
  return (
    <Animated.View style={style}>
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><Path d="m6 9 6 6 6-6" /></Svg>
    </Animated.View>
  );
}

type SelectFieldProps = {
  label: string;
  placeholder: string;
  options: readonly string[];
  value: string | null;
  onChange: (value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  error?: string | null;
  height?: number;
  /** Rows shown before the menu scrolls. */
  maxVisibleRows?: number;
  surface?: FieldSurface;
};

// The menu opens inline, pushing the fields below it down, so it can never be
// clipped by the phone frame or the scroll view.
export function OnboardingSelectField({ label, placeholder, options, value, onChange, open, onOpenChange, error, height = 60, maxVisibleRows = 5, surface }: SelectFieldProps) {
  const ms = useMs();
  const [focused, setFocused] = useState(false);
  const [mounted, setMounted] = useState(open);
  const hover = useSharedValue(0);
  const press = useSharedValue(0);
  const progress = useSharedValue(open ? 1 : 0);
  // Mount as soon as the menu opens; unmount only after the close animation finishes.
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    progress.set(withTiming(open ? 1 : 0, { duration: ms(open ? 240 : 180), easing: ease }));
    if (open) return;
    const timer = setTimeout(() => setMounted(false), ms(180));
    return () => clearTimeout(timer);
  }, [ms, open, progress]);

  const rows = Math.min(options.length, maxVisibleRows);
  const menuHeight = rows * ROW_HEIGHT + MENU_PADDING * 2 + 2;
  const scrolls = options.length > maxVisibleRows;
  const menu = useAnimatedStyle(() => ({
    height: progress.value * menuHeight,
    marginTop: progress.value * 8,
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -6 }],
  }));

  return (
    <View>
      <FieldLabel>{label}</FieldLabel>
      <Pressable
        role="combobox"
        accessibilityLabel={`${label}, ${value ?? 'not selected'}`}
        aria-expanded={open}
        aria-invalid={!!error}
        onPress={() => onOpenChange(!open)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onHoverIn={() => { hover.set(withTiming(1, { duration: ms(200), easing: ease })); }}
        onHoverOut={() => { hover.set(withTiming(0, { duration: ms(200), easing: ease })); }}
        onPressIn={() => { press.set(withTiming(1, { duration: ms(110), easing: ease })); }}
        onPressOut={() => { press.set(withTiming(0, { duration: ms(200), easing: ease })); }}
        style={[{ borderRadius: height / 2 }, focused && !open && FOCUS_RING]}>
        <FieldFrame height={height} active={open} invalid={!!error && !open} hover={hover} press={press} surface={surface}>
          <View style={styles.selectRow}>
            <Text numberOfLines={1} style={[value ? styles.inputText : styles.placeholder, styles.selectText, { fontFamily: onboardingFont }]}>{value ?? placeholder}</Text>
            <Chevron open={open} />
          </View>
        </FieldFrame>
      </Pressable>

      {mounted && (
        <Animated.View style={[styles.menuClip, menu]}>
          <View style={[styles.menu, surface === 'flat' && styles.menuFlat]}>
            <ScrollView role={LISTBOX} aria-label={label} nestedScrollEnabled scrollEnabled={scrolls} showsVerticalScrollIndicator={scrolls} style={{ maxHeight: rows * ROW_HEIGHT }} contentContainerStyle={styles.menuList}>
              {options.map((option) => (
                <MenuOption key={option} label={option} selected={option === value} onPress={() => { onChange(option); onOpenChange(false); }} />
              ))}
            </ScrollView>
          </View>
        </Animated.View>
      )}
      <FieldError message={open ? null : error} />
    </View>
  );
}

function MenuOption({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      role="option"
      aria-selected={selected}
      accessibilityLabel={label}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [styles.option, (hovered || focused) && styles.optionHover, pressed && styles.optionPressed, focused && { ...FOCUS_RING, outlineOffset: -2 }]}>
      <Text numberOfLines={1} style={[styles.optionText, selected && styles.optionTextSelected, { fontFamily: onboardingFont }]}>{label}</Text>
      {selected && <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><Path d="m5 12 4 4L19 6" /></Svg>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: { color: '#E8E8E8', fontSize: 13.5, fontWeight: '500', letterSpacing: -0.1, marginBottom: 8, marginLeft: 4 },
  error: { color: ERROR, fontSize: 12.5, lineHeight: 17, marginTop: 7, marginLeft: 6 },
  lift: { backgroundColor: 'rgba(255,255,255,0.035)' },
  flat: { backgroundColor: '#101010' },
  menuFlat: { backgroundColor: '#141414', boxShadow: 'none' },
  outline: { borderWidth: 1.5 },
  // A full 2px white edge when focused, without shifting the layout.
  focusRing: { borderWidth: 2, borderColor: '#FFFFFF' },
  errorRing: { borderWidth: 1.5, borderColor: 'rgba(255,142,142,0.9)' },
  input: { flex: 1, paddingHorizontal: 22, color: OnboardingTokens.text, fontSize: 16, fontWeight: '500', letterSpacing: -0.1 },
  inputText: { color: OnboardingTokens.text, fontWeight: '500' },
  placeholder: { color: '#8A8A8A', fontWeight: '400' },
  selectRow: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 22, paddingRight: 20, gap: 12 },
  selectText: { flex: 1, fontSize: 16, letterSpacing: -0.1 },
  menuClip: { overflow: 'hidden' },
  menu: { borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', backgroundColor: '#2A2A2A', overflow: 'hidden', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' },
  menuList: { padding: MENU_PADDING },
  option: { height: ROW_HEIGHT, borderRadius: 18, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  optionHover: { backgroundColor: 'rgba(255,255,255,0.07)' },
  optionPressed: { backgroundColor: 'rgba(255,255,255,0.11)' },
  optionText: { color: '#D6D6D6', fontSize: 16, fontWeight: '400' },
  optionTextSelected: { color: '#FFFFFF', fontWeight: '600' },
});
