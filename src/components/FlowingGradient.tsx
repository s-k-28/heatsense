import { useEffect } from 'react';
import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

/**
 * Drop-in replacement for LinearGradient whose start/end points drift in a
 * slow, smooth loop instead of sitting fixed -- reads as the gradient
 * itself flowing rather than a static painted fill. Colors stay put;
 * only where the gradient is "aimed" moves, which is enough to sell the
 * effect without needing per-frame color interpolation.
 */
export default function FlowingGradient({
  colors,
  style,
  children,
}: {
  colors: readonly [string, string, ...string[]];
  style?: ViewStyle | ViewStyle[];
  children?: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    t.value = withRepeat(withTiming(1, { duration: 7000, easing: Easing.linear }), -1, true);
  }, [reduceMotion, t]);

  const animatedProps = useAnimatedProps(() => {
    'worklet';
    const angle = t.value * Math.PI * 2;
    return {
      start: { x: 0.1 + Math.cos(angle) * 0.12, y: 0.05 + Math.sin(angle) * 0.1 },
      end: { x: 0.9 + Math.sin(angle) * 0.12, y: 1 - Math.cos(angle) * 0.1 },
    };
  }, [reduceMotion]);

  return (
    <AnimatedLinearGradient animatedProps={reduceMotion ? undefined : animatedProps} colors={colors} style={style}>
      {children}
    </AnimatedLinearGradient>
  );
}
