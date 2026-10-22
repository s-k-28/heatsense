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

import { Entry } from '@/constants/entry-theme';

// Form fields for onboarding, in the entry design language (welcome / sign-in /
// role): raised charcoal fields with a quiet neutral outline, Inter type, and 16pt
// corners to sit with the 18pt buttons. Focus draws a light-blue edge; errors add a
// soft red edge plus a short message, so color is never the only signal.
const ease = Easing.out(Easing.cubic);
const ERROR = Entry.error;
const ROW_HEIGHT = 48;
// React Native's Role type omits 'listbox'; React Native Web passes it through to the DOM.
const LISTBOX = 'listbox' as Role;
const MENU_PADDING = 6;
const FOCUS_RING = { outlineColor: Entry.blue, outlineStyle: 'solid', outlineWidth: 2, outlineOffset: 3 } as const;
const RADIUS = 16;
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

// The field itself: fill, outline, focus edge, and error edge, shared by both field types.
// The fill sits on the frame: an opaque absolute layer would paint over the text on web.
function FieldFrame({ height, active, invalid, hover, press, children }: { height: number; active: boolean; invalid: boolean; hover: SharedValue<number>; press?: SharedValue<number>; children: React.ReactNode }) {
  const focus = useTimedValue(active ? 1 : 0, 200);
  const error = useTimedValue(invalid ? 1 : 0, 200);
  const frame = useAnimatedStyle(() => ({ transform: [{ scale: 1 - (press?.value ?? 0) * 0.015 }] }));
  const outline = useAnimatedStyle(() => ({
    borderColor: interpolateColor(hover.value, [0, 1], [Entry.line, Entry.lineStrong]),
    opacity: 1 - error.value * (1 - focus.value),
  }));
  const focusRing = useAnimatedStyle(() => ({ opacity: focus.value }));
  const errorRing = useAnimatedStyle(() => ({ opacity: error.value * (1 - focus.value) }));
  const lift = useAnimatedStyle(() => ({ opacity: Math.max(focus.value, hover.value * 0.5) }));
  const radius = RADIUS;
  return (
    <Animated.View style={[{ height, borderRadius: radius }, styles.fill, frame]}>
      {/* Decorative layers: on web an absolutely positioned layer paints above the input, so none of them take touches. */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.lift, { borderRadius: radius }, lift]} />
      {children}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.outline, { borderRadius: radius }, outline]} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.focusRing, { borderRadius: radius }, focusRing]} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.errorRing, { borderRadius: radius }, errorRing]} />
    </Animated.View>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <Text style={[styles.label, null]}>{children}</Text>;
}

function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <Text accessibilityLiveRegion="polite" role="alert" style={[styles.error, null]}>{message}</Text>;
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
  /** Keep `label` for screen readers but don't draw it (e.g. paired inputs under one shared label). */
  hideLabel?: boolean;
  /** Outline the field as invalid without a message under it (the message is shown elsewhere). */
  invalid?: boolean;
} & Pick<TextInputProps, 'returnKeyType' | 'onSubmitEditing' | 'autoCapitalize' | 'textContentType' | 'autoComplete' | 'maxLength' | 'submitBehavior' | 'keyboardType' | 'inputMode' | 'accessibilityHint' | 'autoCorrect'>;

export function OnboardingTextField({ label, value, onChangeText, placeholder, error, height = 60, inputRef, onFocus, onBlur, hideLabel, invalid, ...inputProps }: TextFieldProps) {
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
        <FieldFrame height={height} active={focused} invalid={!!error || !!invalid} hover={hover} >
          <TextInput
            ref={inputRef}
            accessibilityLabel={label}
            aria-invalid={!!error || !!invalid}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={Entry.placeholder}
            selectionColor={Entry.peach}
            cursorColor={Entry.peach}
            keyboardAppearance="dark"
            autoCorrect={false}
            onFocus={() => { setFocused(true); onFocus?.(); }}
            onBlur={() => { setFocused(false); onBlur?.(); }}
            style={[styles.input, null, noWebOutline]}
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
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={Entry.muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="m6 9 6 6 6-6" /></Svg>
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
};

// The menu opens inline, pushing the fields below it down, so it can never be
// clipped by the phone frame or the scroll view.
export function OnboardingSelectField({ label, placeholder, options, value, onChange, open, onOpenChange, error, height = 60, maxVisibleRows = 5 }: SelectFieldProps) {
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
        style={[{ borderRadius: RADIUS }, focused && !open && FOCUS_RING]}>
        <FieldFrame height={height} active={open} invalid={!!error && !open} hover={hover} press={press} >
          <View style={styles.selectRow}>
            <Text numberOfLines={1} style={[value ? styles.inputText : styles.placeholder, styles.selectText, null]}>{value ?? placeholder}</Text>
            <Chevron open={open} />
          </View>
        </FieldFrame>
      </Pressable>

      {mounted && (
        <Animated.View style={[styles.menuClip, menu]}>
          <View style={styles.menu}>
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
      <Text numberOfLines={1} style={[styles.optionText, selected && styles.optionTextSelected, null]}>{label}</Text>
      {selected && <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={Entry.peach} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><Path d="m5 12 4 4L19 6" /></Svg>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: { color: Entry.ink, fontWeight: '500', fontSize: 13.5, letterSpacing: -0.1, marginBottom: 8, marginLeft: 2 },
  error: { color: ERROR, fontWeight: '400', fontSize: 12.5, lineHeight: 17, marginTop: 7, marginLeft: 2 },
  fill: { backgroundColor: Entry.surface },
  lift: { backgroundColor: 'rgba(255,255,255,0.025)' },
  outline: { borderWidth: 1.5 },
  focusRing: { borderWidth: 1.5, borderColor: Entry.blue },
  errorRing: { borderWidth: 1.5, borderColor: ERROR },
  input: { flex: 1, paddingHorizontal: 18, color: Entry.ink, fontWeight: '400', fontSize: 16, letterSpacing: -0.1 },
  inputText: { color: Entry.ink, fontWeight: '400' },
  placeholder: { color: Entry.placeholder, fontWeight: '400' },
  selectRow: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 18, paddingRight: 16, gap: 12 },
  selectText: { flex: 1, fontSize: 16, letterSpacing: -0.1 },
  menuClip: { overflow: 'hidden' },
  menu: { borderRadius: RADIUS, borderWidth: 1, borderColor: Entry.line, backgroundColor: Entry.raised, overflow: 'hidden' },
  menuList: { padding: MENU_PADDING },
  option: { height: ROW_HEIGHT, borderRadius: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  optionHover: { backgroundColor: 'rgba(255,255,255,0.05)' },
  optionPressed: { backgroundColor: 'rgba(255,255,255,0.09)' },
  optionText: { color: Entry.muted, fontWeight: '400', fontSize: 15.5 },
  optionTextSelected: { color: Entry.ink, fontWeight: '600' },
});
