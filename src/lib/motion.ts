import { Platform } from 'react-native';
import { Easing, FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

// HeatSense motion tokens. Production polish (200–500 ms, no bounce) with restraint: things people
// tap many times a session stay instant. Every helper returns undefined when Reduce Motion is on,
// so screens render in their final state. On web, Reanimated layout builders can retain absolute
// positioning after a resize/modal transition and collapse list height. Keep browser content in
// normal flow. Page transitions, presses, segmented controls and chart clocks are separate.

// Cubic ease-out as a Bézier factory also resolves correctly in web layout transitions.
export const EASE_OUT = Easing.bezier(0.215, 0.61, 0.355, 1);


/** A native block entering a screen: fade + 10 px rise. */
export function enter(index: number, reduced: boolean) {
  if (Platform.OS === 'web' || reduced || index < 0) return undefined;
  return FadeInDown.duration(300)
    .easing(EASE_OUT)
    .withInitialValues({ opacity: 0, transform: [{ translateY: 10 }] });
}

/** A value that changed (a new reading): a short cross-fade, nothing more. */
export function swap(reduced: boolean) {
  return Platform.OS === 'web' || reduced ? undefined : FadeIn.duration(320).easing(EASE_OUT);
}

/** Leaving is quieter than arriving. */
export function leave(reduced: boolean) {
  return Platform.OS === 'web' || reduced ? undefined : FadeOut.duration(180);
}

/** Lists that gain or lose items close the gap smoothly instead of jumping. */
export function settle(reduced: boolean) {
  return Platform.OS === 'web' || reduced ? undefined : LinearTransition.duration(260).easing(EASE_OUT);
}
