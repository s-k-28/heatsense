import { useEffect, type ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { EASE_OUT } from '@/lib/motion-engine';

// Press feedback for buttons, tiles and cards: the whole thing scales to 0.97 while pressed
// (120 ms in, 160 ms back), the way a physical button gives. Rows in lists keep their highlight.

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PressScale({ children, style, onPressIn, onPressOut, ...rest }: Omit<PressableProps, 'style' | 'children'> & { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  useEffect(() => {
    if (reduced) { cancelAnimation(scale); scale.set(1); }
    return () => cancelAnimation(scale);
  }, [reduced, scale]);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => { if (!reduced) scale.set(withTiming(0.97, { duration: 170, easing: EASE_OUT })); onPressIn?.(e); }}
      onPressOut={(e) => {
        if (reduced) { cancelAnimation(scale); scale.set(1); }
        else scale.set(withTiming(1, { duration: 180, easing: EASE_OUT }));
        onPressOut?.(e);
      }}
      style={[style, animated]}>
      {children}
    </AnimatedPressable>
  );
}
