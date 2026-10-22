import { Easing, FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

// HeatSense motion tokens. Production polish (200–500 ms, no bounce) with restraint: things people
// tap many times a session stay instant. Every helper returns undefined when Reduce Motion is on,
// so screens render in their final state.

export const EASE_OUT = Easing.out(Easing.cubic);

const MAX_STAGGER = 8; // past this many items, the rest arrive together rather than trickling in

/** A block entering a screen: fade + 10 px rise, staggered by its position. */
export function enter(index: number, reduced: boolean) {
  if (reduced) return undefined;
  return FadeInDown.duration(280)
    .delay(Math.min(index, MAX_STAGGER) * 40)
    .easing(EASE_OUT)
    .withInitialValues({ opacity: 0, transform: [{ translateY: 10 }] });
}

/** A value that changed (a new reading): a short cross-fade, nothing more. */
export function swap(reduced: boolean) {
  return reduced ? undefined : FadeIn.duration(320).easing(EASE_OUT);
}

/** Leaving is quieter than arriving. */
export function leave(reduced: boolean) {
  return reduced ? undefined : FadeOut.duration(180);
}

/** Lists that gain or lose items close the gap smoothly instead of jumping. */
export function settle(reduced: boolean) {
  return reduced ? undefined : LinearTransition.duration(260).easing(EASE_OUT);
}

/** Rings and progress arcs fill to their value. */
export const FILL_MS = 900;
