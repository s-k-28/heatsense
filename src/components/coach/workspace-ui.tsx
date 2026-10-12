import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { CoachColors as C, CoachFonts as F } from '@/constants/coach-theme';

export function WorkspaceSectionTitle({ title }: { title: string }) {
  return <View style={styles.heading}><View style={styles.marker} /><Text accessibilityRole="header" style={styles.title}>{title}</Text></View>;
}

// The shared treatment for countdown, roster, and future loading indicators.
export function WorkspaceProgress({ value, label, segments }: { value: number; label: string; segments?: number[] }) {
  const reducedMotion = useReducedMotion();
  const bounded = Math.max(0, Math.min(1, value));
  const progress = useSharedValue(reducedMotion ? bounded : 0);
  useEffect(() => {
    progress.value = withTiming(bounded, { duration: reducedMotion ? 0 : 500, easing: Easing.out(Easing.cubic) });
  }, [bounded, progress, reducedMotion]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return <View accessible accessibilityLabel={label} accessibilityRole={segments ? 'image' : 'progressbar'} accessibilityValue={segments ? undefined : { min: 0, max: 100, now: Math.round(bounded * 100) }} style={styles.track}>
    <Animated.View style={[styles.fillRow, fillStyle]}>
      {(segments ?? [1]).map((weight, index) => <View key={index} style={[styles.fill, { flex: weight }]} />)}
    </Animated.View>
  </View>;
}

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  marker: { backgroundColor: C.accent, width: 3, height: 20, borderRadius: 2 },
  title: { color: C.text, fontFamily: F.display, fontSize: 25, lineHeight: 29, flexShrink: 1 },
  track: { height: 12, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)', width: '100%' },
  fillRow: { height: '100%', flexDirection: 'row', gap: 5 },
  fill: { height: '100%', backgroundColor: '#FAFCFF', borderRadius: 999, boxShadow: '0 0 9px rgba(255,255,255,0.25)' },
});
