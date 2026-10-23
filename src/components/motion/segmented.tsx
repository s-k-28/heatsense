import { useAthletePalette, useAthleteStyles } from '@/components/athlete-appearance';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { Palette } from '@/constants/theme';
import { EASE_IN_OUT } from '@/lib/motion-engine';

// One segmented control for the whole app. The selected pill travels to the option you tap
// (220 ms, ease-in-out) instead of jumping there; with Reduce Motion it moves at once.

type Option<T extends string> = { key: T; label: string; badge?: ReactNode; disabled?: boolean };
type Tone = 'canvas' | 'card' | 'accent';

const THUMB: Record<Tone, string> = { canvas: Palette.surface, card: 'rgba(235,235,245,0.16)', accent: Palette.coral };

export function Segmented<T extends string>({ options, value, onChange, size = 'md', tone = 'canvas', itemWidth = 52 }: {
  options: Option<T>[];
  value: T;
  onChange: (next: T) => void;
  /** md fills the width; sm sits inline, each option `itemWidth` wide. */
  size?: 'md' | 'sm';
  tone?: Tone;
  itemWidth?: number;
}) {
  const Palette = useAthletePalette();
  const styles = useAthleteStyles(baseStyles);
  const reduced = useReducedMotion();
  const sm = size === 'sm';
  const pad = sm ? 3 : 4;
  const [layoutWidth, setLayoutWidth] = useState(0);
  const [focused, setFocused] = useState<T | null>(null);
  const width = sm ? Math.max(44, itemWidth) * options.length + pad * 2 : layoutWidth;
  const segment = width && options.length ? (width - pad * 2) / options.length : 0;
  const index = Math.max(0, options.findIndex((o) => o.key === value));
  const x = useSharedValue(index * segment);
  const placed = useRef(false);

  useEffect(() => {
    if (!segment) return;
    const target = index * segment;
    // The first placement lands where it belongs; later changes travel.
    x.value = !placed.current || reduced ? target : withTiming(target, { duration: 220, easing: EASE_IN_OUT });
    placed.current = true;
  }, [index, reduced, segment, x]);

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      accessibilityRole="tablist"
      onLayout={sm ? undefined : (e: LayoutChangeEvent) => setLayoutWidth(e.nativeEvent.layout.width)}
      style={[styles.track, sm ? styles.trackSm : styles.trackMd, sm && { width }]}>
      {segment ? <Animated.View pointerEvents="none" style={[styles.thumb, sm ? styles.thumbSm : styles.thumbMd, { backgroundColor: THUMB[tone], left: pad, top: pad, bottom: pad, width: segment }, thumb]} /> : null}
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: on, disabled: Boolean(o.disabled) }}
            disabled={o.disabled}
            key={o.key}
            onPress={() => onChange(o.key)}
            onFocus={(event) => setFocused(Platform.OS !== 'web' || Boolean((event.target as unknown as Element | null)?.matches?.(':focus-visible')) ? o.key : null)}
            onBlur={() => setFocused(null)}
            style={({ pressed }) => [styles.item, sm ? styles.itemSm : styles.itemMd, focused === o.key && styles.focused, o.disabled && styles.disabled, pressed && styles.pressed]}>
            <Text style={[sm ? styles.textSm : styles.textMd, { color: on ? (tone === 'accent' ? '#1A0E07' : Palette.ink) : Palette.inkMuted }]}>{o.label}</Text>
            {o.badge}
          </Pressable>
        );
      })}
    </View>
  );
}

const baseStyles = StyleSheet.create({
  track: { backgroundColor: 'rgba(235,235,245,0.08)', flexDirection: 'row' },
  trackMd: { borderRadius: 12, padding: 4 },
  trackSm: { borderRadius: 9, padding: 3 },
  thumb: { position: 'absolute' },
  thumbMd: { borderRadius: 9 },
  thumbSm: { borderRadius: 7 },
  item: { alignItems: 'center', borderColor: 'transparent', borderWidth: 1, flex: 1, flexDirection: 'row', gap: 8, justifyContent: 'center', minWidth: 44, paddingHorizontal: 4 },
  itemMd: { borderRadius: 9, minHeight: 48, paddingVertical: 8 },
  itemSm: { borderRadius: 7, minHeight: 44, paddingVertical: 6 },
  focused: { borderColor: Palette.ink },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
  textMd: { flexShrink: 1, textAlign: 'center', fontSize: 16, fontWeight: '600' },
  textSm: { flexShrink: 1, textAlign: 'center', fontSize: 14, fontWeight: '600' },
});
