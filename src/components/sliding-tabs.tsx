import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import { Palette, Type } from '@/constants/theme';

// The same sliding pill as the tab bar: 250ms on a long soft landing, the label color travelling
// with the pill. The pill takes each segment's measured frame, so it also works when segments
// differ in width. Reduce Motion jumps straight to the chosen segment.
const SLIDE_MS = 250;
const SLIDE_EASE = Easing.bezier(0.22, 1, 0.36, 1);
const PAD = 3;
const HEIGHT = 36;
const MUTED = 'rgba(193,193,193,0.8)';

type Frame = { width: number; x: number };

export function SlidingTabs({ label, onChange, options, selected }: { label: string; onChange: (index: number) => void; options: string[]; selected: number }) {
  const reduced = useReducedMotion();
  const [frames, setFrames] = useState<(Frame | undefined)[]>(() => options.map(() => undefined));
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  // Which segment the pill is over, as a number that glides on the same curve (0 → 1 → 2).
  const position = useSharedValue(selected);
  const placed = useRef(false);
  const ready = frames.every(Boolean);

  useEffect(() => {
    const target = frames[selected];
    if (!ready || !target) return;
    // First layout: sit on the selected segment. After that, glide.
    if (!placed.current || reduced) {
      x.set(target.x);
      width.set(target.width);
      position.set(selected);
      placed.current = true;
      return;
    }
    x.set(withTiming(target.x, { duration: SLIDE_MS, easing: SLIDE_EASE }));
    width.set(withTiming(target.width, { duration: SLIDE_MS, easing: SLIDE_EASE }));
    position.set(withTiming(selected, { duration: SLIDE_MS, easing: SLIDE_EASE }));
  }, [frames, position, ready, reduced, selected, width, x]);

  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }], width: width.value }));
  const measure = (index: number) => (event: LayoutChangeEvent) => {
    const { width: w, x: left } = event.nativeEvent.layout;
    setFrames((current) => (current[index]?.x === left && current[index]?.width === w ? current : current.map((frame, i) => (i === index ? { width: w, x: left } : frame))));
  };

  return (
    <View accessibilityLabel={label} accessibilityRole="tablist" style={styles.bar}>
      {ready ? <Animated.View pointerEvents="none" style={[styles.pill, pill]} /> : null}
      {options.map((option, index) => (
        <Segment
          active={index === selected}
          index={index}
          key={option}
          label={option}
          onLayout={measure(index)}
          onPress={() => onChange(index)}
          position={position}
        />
      ))}
    </View>
  );
}

/** One segment: the muted label fades out and the orange one in as the pill arrives. */
function Segment({ active, index, label, onLayout, onPress, position }: { active: boolean; index: number; label: string; onLayout: (event: LayoutChangeEvent) => void; onPress: () => void; position: SharedValue<number> }) {
  const lit = useAnimatedStyle(() => ({ opacity: interpolate(position.value, [index - 1, index, index + 1], [0, 1, 0], 'clamp') }));
  const dim = useAnimatedStyle(() => ({ opacity: 1 - interpolate(position.value, [index - 1, index, index + 1], [0, 1, 0], 'clamp') }));
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} hitSlop={4} onLayout={onLayout} onPress={onPress} style={styles.segment}>
      <Animated.Text numberOfLines={1} style={[styles.label, { color: MUTED }, dim]}>{label}</Animated.Text>
      <Animated.Text numberOfLines={1} style={[styles.label, styles.labelLit, lit]}>{label}</Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: 'rgba(32,32,32,0.86)', borderColor: 'rgba(191,192,203,0.08)', borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: PAD, padding: PAD },
  pill: { backgroundColor: 'rgba(69,69,69,0.92)', borderRadius: 999, height: HEIGHT, left: 0, position: 'absolute', top: PAD },
  // Each segment starts at its label's width and shares out the spare room, so no label is cut off.
  segment: { alignItems: 'center', flexGrow: 1, height: HEIGHT, justifyContent: 'center', paddingHorizontal: 14 },
  label: { ...Type.subhead, fontWeight: '600' },
  labelLit: { color: Palette.coral, position: 'absolute' },
});
