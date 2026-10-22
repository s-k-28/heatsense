import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type NativeScrollEvent, type NativeSyntheticEvent, type TextInputProps } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { MobileViewport } from '@/components/mobile-viewport';
import { Entry } from '@/constants/entry-theme';

// The onboarding step system (after WHOOP's setup flow): a quiet top bar, open space, a small
// object, one title, one line of context, the input, and a round NEXT button in the corner whose
// ring shows how far through setup you are. Every setup screen uses this so the flow reads as one.

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const ease = Easing.out(Easing.cubic);

/** Small caps label used for field names, buttons and section heads. */
export const caps = { fontFamily: Entry.strong, fontSize: 13, letterSpacing: 1.4, textTransform: 'uppercase' } as const;

type Next = { label?: string; onPress: () => void; enabled: boolean; loading?: boolean };

export function StepScreen({
  onBack,
  right,
  icon,
  title,
  children,
  next,
  progress,
  footer,
  top = 'open',
}: {
  onBack?: () => void;
  right?: ReactNode;
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  next?: Next;
  /** 0–1: how far through setup this step is. Drawn as the ring around NEXT. */
  progress?: number;
  /** Replaces the NEXT row, e.g. stacked buttons. */
  footer?: ReactNode;
  /** 'open' leaves WHOOP's empty space above short steps; 'tight' starts the content near the top. */
  top?: 'open' | 'tight';
}) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  return (
    <MobileViewport>
      <View style={styles.screen}>
        <StatusBar style="light" />
        <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
          {onBack ? <IconButton label="Back" onPress={onBack} path="m15 5-7 7 7 7" /> : <View style={styles.iconButton} />}
          {right ?? <View style={styles.iconButton} />}
        </View>
        <ScrollView bounces={false} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 20 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={top === 'open' ? styles.openSpace : styles.tightSpace} />
          <Animated.View entering={reduced ? undefined : FadeIn.duration(260)} style={styles.body}>
            {icon ? <View style={styles.icon}>{icon}</View> : null}
            <Text accessibilityRole="header" style={styles.title}>{title}</Text>
            {children ? <View style={styles.children}>{children}</View> : null}
          </Animated.View>
          <View style={styles.footer}>
            {footer ?? (next ? <NextButton {...next} progress={progress ?? 0} /> : null)}
          </View>
        </ScrollView>
      </View>
    </MobileViewport>
  );
}

function IconButton({ label, onPress, path }: { label: string; onPress: () => void; path: string }) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" hitSlop={8} onPress={onPress} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      <Svg fill="none" height={24} stroke={Entry.ink} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" width={24}><Path d={path} /></Svg>
    </Pressable>
  );
}

/** "Need help?" style text action: peach small caps. */
export function StepLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" hitSlop={10} onPress={onPress} style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
      <Text style={[caps, { color: Entry.peach }]}>{label}</Text>
    </Pressable>
  );
}

const RING = 76;
const STROKE = 3;
const R = (RING - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

/** The round NEXT button. The peach arc fills with setup progress. */
export function NextButton({ label = 'Next', onPress, enabled, loading = false, progress }: Next & { progress: number }) {
  const reduced = useReducedMotion();
  const arc = useSharedValue(0);
  useEffect(() => { arc.set(withTiming(Math.max(0.04, Math.min(1, progress)), { duration: reduced ? 0 : 700, easing: ease })); }, [arc, progress, reduced]);
  const arcProps = useAnimatedProps(() => ({ strokeDashoffset: CIRC * (1 - arc.value) }));
  const active = enabled && !loading;
  return (
    <Pressable
      accessibilityHint={`Setup ${Math.round(progress * 100)} percent complete`}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: !active }}
      disabled={!active}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.nextRow, pressed && styles.pressed]}>
      <Text style={[caps, styles.nextLabel, !active && { color: Entry.placeholder }]}>{loading ? 'Saving' : label}</Text>
      <View style={styles.ring}>
        <Svg height={RING} style={StyleSheet.absoluteFill} width={RING}>
          <Circle cx={RING / 2} cy={RING / 2} fill={active ? Entry.raised : Entry.surface} r={R} stroke={Entry.line} strokeWidth={STROKE} />
          <AnimatedCircle animatedProps={arcProps} cx={RING / 2} cy={RING / 2} fill="none" r={R} rotation={-90} origin={`${RING / 2}, ${RING / 2}`} stroke={Entry.peach} strokeDasharray={`${CIRC} ${CIRC}`} strokeLinecap="round" strokeWidth={STROKE} />
        </Svg>
        {loading ? <ActivityIndicator color={Entry.ink} /> : (
          <Svg fill="none" height={28} stroke={active ? Entry.ink : Entry.placeholder} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} viewBox="0 0 24 24" width={28}><Path d="M5 12h14M13 6l6 6-6 6" /></Svg>
        )}
      </View>
    </Pressable>
  );
}

/** Full-width pill in small caps. Primary is peach; `outline` is the quiet alternative. */
export function CapsButton({ label, onPress, outline = false, disabled = false, loading = false }: { label: string; onPress: () => void; outline?: boolean; disabled?: boolean; loading?: boolean }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.capsButton, outline ? styles.capsOutline : styles.capsFill, disabled && styles.disabled, pressed && styles.pressed]}>
      {loading ? <ActivityIndicator color={outline ? Entry.ink : Entry.canvas} /> : <Text style={[caps, styles.capsText, { color: outline ? Entry.ink : Entry.canvas }]}>{label}</Text>}
    </Pressable>
  );
}

/** WHOOP-style single choice: full-width rows that turn light when picked. */
export function ChoiceRows<T extends string>({ options, value, onChange, label }: { options: readonly { value: T; label: string; detail?: string }[]; value: T | null; onChange: (value: T) => void; label: string }) {
  return (
    <View accessibilityLabel={label} accessibilityRole="radiogroup" style={styles.rows}>
      {options.map((option) => {
        const on = option.value === value;
        return (
          <Pressable
            accessibilityLabel={option.detail ? `${option.label}. ${option.detail}` : option.label}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [styles.choice, on && styles.choiceOn, pressed && styles.pressed]}>
            <Text style={[caps, styles.choiceText, on && { color: Entry.canvas }]}>{option.label}</Text>
            {option.detail ? <Text style={[styles.choiceDetail, on && { color: Entry.raised }]}>{option.detail}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Small caps label above a dark input. */
export function StepField({ label, error, inputRef, ...input }: TextInputProps & { label: string; error?: string | null; inputRef?: React.Ref<TextInput> }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={[caps, styles.fieldLabel]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={Entry.placeholder}
        ref={inputRef}
        selectionColor={Entry.peach}
        {...input}
        onBlur={(event) => { setFocused(false); input.onBlur?.(event); }}
        onFocus={(event) => { setFocused(true); input.onFocus?.(event); }}
        style={[styles.input, focused && styles.inputFocused, error ? styles.inputError : null, input.style]}
      />
      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

/** Two-way switch, e.g. Imperial / Metric. */
export function Segmented<T extends string>({ options, value, onChange, label }: { options: readonly { value: T; label: string }[]; value: T; onChange: (value: T) => void; label: string }) {
  return (
    <View accessibilityLabel={label} accessibilityRole="tablist" style={styles.segmented}>
      {options.map((option) => (
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: option.value === value }} key={option.value} onPress={() => onChange(option.value)} style={[styles.segment, option.value === value && styles.segmentOn]}>
          <Text style={[caps, { color: option.value === value ? Entry.ink : Entry.muted }]}>{option.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const ITEM = 48;
const VISIBLE = 5;

/**
 * A scroll wheel column (birthday, height, weight). Snaps to whole items and reports the centered
 * one. Works the same on iOS, Android and web, so the flow doesn't fork per platform.
 */
export function Wheel<T extends string | number>({ items, value, onChange, format = String, label, width = 96 }: { items: readonly T[]; value: T; onChange: (value: T) => void; format?: (value: T) => string; label: string; width?: number }) {
  const ref = useRef<ScrollView>(null);
  const index = Math.max(0, items.indexOf(value));
  const settled = useRef(index);

  useEffect(() => {
    if (settled.current === index) return;
    settled.current = index;
    ref.current?.scrollTo({ animated: false, y: index * ITEM });
  }, [index]);

  const settle = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.min(items.length - 1, Math.max(0, Math.round(event.nativeEvent.contentOffset.y / ITEM)));
    settled.current = next;
    if (items[next] !== value) onChange(items[next]);
  };

  return (
    <View
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      accessibilityLabel={label}
      accessibilityRole="adjustable"
      accessibilityValue={{ text: format(value) }}
      accessible
      onAccessibilityAction={(event) => {
        const next = index + (event.nativeEvent.actionName === 'increment' ? 1 : -1);
        if (next >= 0 && next < items.length) onChange(items[next]);
      }}
      style={[styles.wheel, { width }]}>
      <View pointerEvents="none" style={styles.wheelBand} />
      <ScrollView
        contentContainerStyle={{ paddingVertical: ITEM * Math.floor(VISIBLE / 2) }}
        contentOffset={{ x: 0, y: index * ITEM }}
        decelerationRate="fast"
        nestedScrollEnabled
        onMomentumScrollEnd={settle}
        onScrollEndDrag={(event) => { if (!event.nativeEvent.velocity?.y) settle(event); }}
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM}>
        {items.map((item, i) => {
          const distance = Math.abs(i - index);
          return (
            <View key={String(item)} style={styles.wheelItem}>
              <Text style={[styles.wheelText, distance === 0 && styles.wheelTextOn, { opacity: distance === 0 ? 1 : distance === 1 ? 0.55 : 0.25 }]}>{format(item)}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: Entry.canvas, flex: 1 },
  bar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14 },
  iconButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  openSpace: { flexGrow: 1, maxHeight: 140, minHeight: 24 },
  tightSpace: { height: 8 },
  body: {},
  icon: { marginBottom: 24 },
  title: { color: Entry.ink, fontFamily: Entry.strong, fontSize: 32, letterSpacing: -0.8, lineHeight: 38, marginTop: 8 },
  children: { gap: 22, marginTop: 36 },
  footer: { marginTop: 'auto', paddingTop: 28 },
  link: { alignSelf: 'flex-start', paddingVertical: 4 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  nextRow: { alignItems: 'center', alignSelf: 'flex-end', flexDirection: 'row', gap: 16 },
  nextLabel: { color: Entry.ink },
  ring: { alignItems: 'center', height: RING, justifyContent: 'center', width: RING },
  capsButton: { alignItems: 'center', borderRadius: 999, justifyContent: 'center', minHeight: 60, paddingHorizontal: 20 },
  capsFill: { backgroundColor: Entry.peach },
  capsOutline: { borderColor: Entry.lineStrong, borderWidth: 1 },
  capsText: { fontSize: 15 },
  rows: { gap: 12 },
  choice: { alignItems: 'center', backgroundColor: Entry.raised, borderRadius: 14, justifyContent: 'center', minHeight: 66, paddingHorizontal: 18, paddingVertical: 14 },
  choiceOn: { backgroundColor: Entry.ink },
  choiceText: { color: Entry.ink, fontSize: 15, textAlign: 'center' },
  choiceDetail: { color: Entry.muted, fontFamily: Entry.body, fontSize: 15, lineHeight: 20, marginTop: 5, textAlign: 'center' },
  field: { gap: 10 },
  fieldLabel: { color: Entry.muted, fontSize: 12 },
  input: { backgroundColor: Entry.surface, borderColor: Entry.line, borderRadius: 14, borderWidth: 1, color: Entry.ink, fontFamily: Entry.body, fontSize: 18, minHeight: 60, paddingHorizontal: 18 },
  inputFocused: { borderColor: Entry.muted },
  inputError: { borderColor: Entry.error },
  error: { color: Entry.error, fontFamily: Entry.body, fontSize: 15 },
  segmented: { backgroundColor: Entry.surface, borderRadius: 12, flexDirection: 'row', padding: 4 },
  segment: { alignItems: 'center', borderRadius: 10, flex: 1, justifyContent: 'center', minHeight: 48 },
  segmentOn: { backgroundColor: Entry.raised },
  wheel: { height: ITEM * VISIBLE, overflow: 'hidden' },
  wheelBand: { backgroundColor: Entry.raised, borderRadius: 10, height: ITEM, left: 0, position: 'absolute', right: 0, top: ITEM * Math.floor(VISIBLE / 2) },
  wheelItem: { alignItems: 'center', height: ITEM, justifyContent: 'center' },
  wheelText: { color: Entry.muted, fontFamily: Entry.medium, fontSize: 20, fontVariant: ['tabular-nums'] },
  wheelTextOn: { color: Entry.ink, fontFamily: Entry.strong, fontSize: 24 },
});
