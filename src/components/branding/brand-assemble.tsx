import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

// The HeatSense H coming together from its two real halves (split along its wave), as in the
// welcome intro: the upper half slides down, the lower half slides up, and they lock into the
// mark. Used as the branded finish at the end of onboarding. Static under reduced motion.

const TOP = require('@/assets/images/heatsense-logo-top.png');
const BOTTOM = require('@/assets/images/heatsense-logo-bottom.png');
const ASPECT = 801 / 763;
const ease = Easing.out(Easing.poly(5));

export function BrandAssemble({ size, delay = 0, style }: { size: number; delay?: number; style?: StyleProp<ViewStyle> }) {
  const reducedMotion = useReducedMotion();
  const p = useSharedValue(reducedMotion ? 1 : 0);
  useEffect(() => {
    if (!reducedMotion) p.set(withDelay(delay, withTiming(1, { duration: 900, easing: ease })));
  }, [delay, p, reducedMotion]);
  const gap = size * 0.18;
  const top = useAnimatedStyle(() => ({ opacity: Math.min(1, p.value * 2.5), transform: [{ translateY: -gap * (1 - p.value) }] }));
  const bottom = useAnimatedStyle(() => ({ opacity: Math.min(1, p.value * 2.5), transform: [{ translateY: gap * (1 - p.value) }] }));
  return (
    <View accessible={false} aria-hidden style={[{ height: size, width: size * ASPECT }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, top]}><Image contentFit="contain" source={TOP} style={StyleSheet.absoluteFill} /></Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, bottom]}><Image contentFit="contain" source={BOTTOM} style={StyleSheet.absoluteFill} /></Animated.View>
    </View>
  );
}
