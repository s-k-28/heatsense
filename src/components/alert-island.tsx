import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Face, Palette, Type } from '@/constants/theme';

const BAND = require('@/assets/images/heatsense-band-refined.png');

const PILL = { height: 36, width: 124 };
const OPEN_HEIGHT = 76;

/**
 * The alert as it arrives on the phone: a Dynamic Island that grows out of its resting pill, the
 * athlete's band appears with a red dot, and her name and the reading slide out from the band.
 * The red dot keeps pulsing while the alert is open. Reduce Motion shows it already open, still.
 */
export function AlertIsland({ athlete, bpm, reason }: { athlete: string; bpm: number; reason: string }) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const open = useSharedValue(reduced ? 1 : 0);
  const content = useSharedValue(reduced ? 1 : 0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduced || width === 0) return;
    open.set(0);
    content.set(0);
    open.set(withDelay(350, withSpring(1, { damping: 16, mass: 0.9, stiffness: 140 })));
    content.set(withDelay(650, withTiming(1, { duration: 420, easing: Easing.bezier(0.22, 1, 0.36, 1) })));
    pulse.set(withDelay(1100, withRepeat(withSequence(withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 0 })), -1, false)));
    return () => {
      cancelAnimation(open);
      cancelAnimation(content);
      cancelAnimation(pulse);
    };
  }, [content, open, pulse, reduced, width]);

  const island = useAnimatedStyle(() => {
    const height = interpolate(open.value, [0, 1], [PILL.height, OPEN_HEIGHT]);
    return {
      borderRadius: height / 2,
      height,
      width: interpolate(open.value, [0, 1], [PILL.width, width]),
    };
  });
  const bandIn = useAnimatedStyle(() => ({ opacity: content.value, transform: [{ scale: interpolate(content.value, [0, 1], [0.6, 1]) }] }));
  const sprout = useAnimatedStyle(() => ({ opacity: content.value, transform: [{ translateX: interpolate(content.value, [0, 1], [-18, 0]) }] }));
  const reading = useAnimatedStyle(() => ({ opacity: content.value, transform: [{ translateX: interpolate(content.value, [0, 1], [12, 0]) }] }));
  const ring = useAnimatedStyle(() => ({ opacity: interpolate(pulse.value, [0, 1], [0.7, 0]), transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 2.4]) }] }));

  return (
    <View
      accessibilityLabel={`Live alert: ${athlete}, ${reason}. Heart rate ${bpm} beats per minute.`}
      accessible
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      style={styles.stage}>
      {width > 0 ? (
        <Animated.View style={[styles.island, island]}>
          <Animated.View style={[styles.band, bandIn]}>
            <Image contentFit="contain" source={BAND} style={styles.bandImage} />
            <View style={styles.dotWrap}>
              <Animated.View style={[styles.dotRing, ring]} />
              <View style={styles.dot} />
            </View>
          </Animated.View>
          <Animated.View style={[styles.copy, sprout]}>
            <Text style={styles.reason}>{reason}</Text>
            <Text numberOfLines={1} style={styles.athlete}>{athlete}</Text>
          </Animated.View>
          <Animated.View style={[styles.reading, reading]}>
            <Text style={styles.bpm}>{bpm}</Text>
            <Text style={styles.unit}>bpm</Text>
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { alignItems: 'center', height: OPEN_HEIGHT, justifyContent: 'flex-start' },
  island: { alignItems: 'center', backgroundColor: '#000000', borderCurve: 'continuous', flexDirection: 'row', overflow: 'hidden', paddingHorizontal: 14 },
  band: { height: 48, width: 48 },
  bandImage: { height: 48, width: 48 },
  dotWrap: { alignItems: 'center', height: 16, justifyContent: 'center', position: 'absolute', right: -2, top: 0, width: 16 },
  dotRing: { backgroundColor: Palette.emergency, borderRadius: 7, height: 14, position: 'absolute', width: 14 },
  dot: { backgroundColor: Palette.emergency, borderColor: '#000000', borderRadius: 8, borderWidth: 2.5, height: 16, width: 16 },
  copy: { flex: 1, marginLeft: 12 },
  reason: { color: Palette.emergency, ...Type.labelSmall, fontSize: 12 },
  athlete: { color: Palette.ink, ...Type.headline },
  reading: { alignItems: 'flex-end' },
  bpm: { color: Palette.emergency, fontWeight: '700', fontSize: 32, lineHeight: 34 },
  unit: { color: Palette.inkMuted, ...Type.labelSmall, fontSize: 11 },
});
