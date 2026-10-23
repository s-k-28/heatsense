import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type AnimatedStyle,
} from 'react-native-reanimated';

import { useBandSpot } from '@/components/band-journey';

// The HeatSense band as a product image: the official three-quarter render (cut out,
// cleaned of background haze, with a faint peach rim on its lit edge), a pre-drawn
// soft contact shadow, and the motion styles product imagery may use:
//   float   the welcome hero only: a slow 5.5 s drift of 7 px with a slight tilt; the
//           shadow tightens and darkens as the band comes down, softens as it rises
//   reveal  the first time the band enters a screen: fade, small rise, slight scale
//   settle  one short entrance on a calm screen, then still
// It is a flat render, so it never spins: depth comes from the float and the shadow.

export const WRISTBAND_HERO = require('@/assets/images/wristband-hero.webp');
const SHADOW = require('@/assets/images/wristband-shadow.png');
/** Width per unit of height of the hero render. */
export const WRISTBAND_ASPECT = 794 / 1142;

export type WristbandMotion = 'float' | 'reveal' | 'settle' | 'none';

type Props = {
  height: number;
  motion?: WristbandMotion;
  /** When the motion starts, in ms. */
  delay?: number;
  /** An entrance driven from outside (e.g. the welcome intro clock); replaces reveal/settle. */
  entrance?: AnimatedStyle<ViewStyle>;
  /** The same entrance for the shadow, so it appears as the band lands. */
  shadowEntrance?: AnimatedStyle<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  /** Makes this band the onboarding journey's spot with this id (see band-journey). */
  journeyId?: string;
};

const ease = Easing.inOut(Easing.sin);

export function Wristband({ height, motion = 'none', delay = 0, entrance, shadowEntrance, style, journeyId }: Props) {
  const { ref: spotRef, onLayout: onSpotLayout, away } = useBandSpot(journeyId);
  const reducedMotion = useReducedMotion();
  const width = height * WRISTBAND_ASPECT;
  const float = useSharedValue(0);
  const enter = useSharedValue(reducedMotion || motion === 'none' || motion === 'float' ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) return;
    if (motion === 'float') {
      float.set(withDelay(delay, withRepeat(withTiming(1, { duration: 2750, easing: ease }), -1, true)));
    } else if (motion === 'reveal' || motion === 'settle') {
      enter.set(withDelay(delay, withTiming(1, { duration: motion === 'reveal' ? 900 : 650, easing: Easing.out(Easing.cubic) })));
    }
    return () => { cancelAnimation(float); cancelAnimation(enter); };
  }, [delay, enter, float, motion, reducedMotion]);

  const band = useAnimatedStyle(() => {
    const rest = 1 - enter.value;
    const lift = motion === 'reveal' ? 22 : 12;
    return {
      opacity: enter.value,
      transform: [
        { translateY: -7 * float.value + lift * rest },
        { rotate: `${(float.value - 0.5) * 1.6 - 3 * rest}deg` },
        { scale: 1 - 0.05 * rest },
      ],
    };
  });
  const shadow = useAnimatedStyle(() => ({
    opacity: (0.95 - 0.3 * float.value) * enter.value,
    transform: [{ scaleX: 1 - 0.1 * float.value }],
  }));

  return (
    <View accessible accessibilityRole="image" accessibilityLabel="The HeatSense band" style={[{ width, height: height * 1.06, opacity: away ? 0 : 1 }, style]}>
      <Animated.View pointerEvents="none" style={[styles.shadow, { width: width * 1.25, height: height * 0.16, left: -width * 0.125 }, shadowEntrance]}>
        <Animated.View style={[StyleSheet.absoluteFill, shadow]}>
          <Image source={SHADOW} contentFit="fill" style={StyleSheet.absoluteFill} />
        </Animated.View>
      </Animated.View>
      <Animated.View onLayout={onSpotLayout} ref={spotRef} style={[{ width, height }, entrance]}>
        <Animated.View style={[{ width, height }, band]}>
          <Image source={WRISTBAND_HERO} contentFit="contain" priority="high" style={StyleSheet.absoluteFill} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: { position: 'absolute', bottom: 0 },
});
