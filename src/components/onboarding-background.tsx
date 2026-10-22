import { useEffect, useId, useMemo, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { Entry } from '@/constants/entry-theme';

// The onboarding backdrop: the near-black field with a few thin peach curves behind
// the content, in the welcome screen's language. Every screen picks a variant so the
// pages feel related without repeating the same composition. The curves are drawn on
// a 390 × 844 phone and stretch to the real screen; strokes keep their width.
//
// Each curve fades out toward one or both ends, so lines enter from the edge instead
// of stopping abruptly. Decorative only: hidden from screen readers, never touchable.

export type OnboardingBackgroundVariant = 'welcome' | 'auth' | 'role' | 'team' | 'code' | 'form' | 'complete' | 'ready';

type Fade = 'both' | 'left' | 'right';
type Curve = { d: string; width: number; opacity: number; fade: Fade };

const c = (d: string, width: number, opacity: number, fade: Fade = 'both'): Curve => ({ d, width, opacity, fade });

const CURVES: Record<OnboardingBackgroundVariant, Curve[]> = {
  // Most expressive: lines sweep through and around the band, two more settle by the button.
  // Listed in drawing order for the intro: the primary curve first, the subtle ones last.
  welcome: [
    c('M-20 330 C70 330 130 300 200 250 C260 205 320 150 410 125', 1.5, 0.8, 'left'),
    c('M-20 430 C60 400 120 380 200 400 C280 420 330 446 410 440', 1.3, 0.6, 'right'),
    c('M-20 352 C80 346 150 320 215 272 C275 226 330 182 410 162', 1, 0.34, 'left'),
    c('M-20 205 C60 230 120 245 190 230 C260 215 320 170 410 150', 1, 0.24),
    c('M-20 470 C90 442 170 432 250 446 C320 458 360 470 410 466', 1, 0.2),
    c('M-20 712 C70 706 140 722 200 742 C270 765 330 750 410 712', 1.2, 0.46),
    c('M60 860 C150 795 260 762 410 738', 1, 0.18, 'right'),
  ],
  // Over the lower edge of the photograph, where it fades into the page.
  auth: [
    c('M-20 470 C90 430 200 470 290 430 C340 408 380 396 410 392', 1.2, 0.5),
    c('M-20 496 C100 466 210 500 300 462 C350 442 385 430 410 428', 1, 0.2),
  ],
  // Asymmetric and restrained: one sweep rising to the right through the open band between the
  // headline and the role panels (which are opaque, so lines pass behind them), one faint echo.
  role: [
    c('M40 392 C150 386 250 352 410 262', 1.4, 0.7, 'left'),
    c('M-20 430 C110 428 240 400 410 318', 1, 0.3, 'left'),
    c('M-20 470 C90 462 160 470 240 448', 1, 0.14, 'right'),
  ],
  // Restrained: the top-right corner beside the header, and a quiet line at the foot.
  team: [
    c('M300 -10 C318 70 350 130 410 158', 1.3, 0.5, 'left'),
    c('M340 -10 C352 46 376 88 410 104', 1, 0.24, 'left'),
    c('M-20 772 C80 796 180 806 270 860', 1, 0.16, 'right'),
  ],
  // Top and bottom only, well away from the six code boxes.
  code: [
    c('M-20 120 C90 90 200 170 300 120 C350 95 380 82 410 76', 1.2, 0.46),
    c('M-20 150 C100 130 210 200 320 150 C360 132 390 122 410 118', 1, 0.2),
    c('M-20 792 C100 742 250 782 410 722', 1.2, 0.36),
    c('M-20 822 C120 782 260 816 410 772', 1, 0.16),
  ],
  // Minimal: a quiet pair by the header so long forms stay easy to read.
  form: [
    c('M318 -10 C330 40 362 74 410 84', 1.2, 0.4, 'left'),
    c('M352 -10 C362 22 384 40 410 46', 1, 0.2, 'left'),
  ],
  // The branded finish: a sweep from the top-right corner, and a more expressive pair low
  // on the page in the open space above the actions, both clear of the centered copy.
  complete: [
    c('M250 -10 C280 60 330 110 410 132', 1.3, 0.55, 'left'),
    c('M300 -10 C318 40 350 74 410 88', 1, 0.24, 'left'),
    c('M-20 694 C90 642 200 692 300 652 C350 632 390 620 410 614', 1.4, 0.62),
    c('M-20 724 C110 684 220 728 320 690 C360 674 392 664 410 660', 1, 0.26),
    c('M-20 612 C60 598 120 602 170 590', 1, 0.14, 'right'),
  ],
  // What to expect next: a long list, so the lines keep to the top-right corner and the very foot.
  ready: [
    c('M250 -10 C280 60 330 110 410 132', 1.3, 0.55, 'left'),
    c('M300 -10 C318 40 350 74 410 88', 1, 0.24, 'left'),
    c('M-20 842 C110 800 250 832 410 788', 1.2, 0.4),
  ],
};

// Where along the width each fade reaches full strength.
const STOPS: Record<Fade, [number, number][]> = {
  both: [[0, 0], [0.28, 1], [0.72, 1], [1, 0]],
  left: [[0, 0], [0.45, 1], [1, 1]],
  right: [[0, 1], [0.55, 1], [1, 0]],
};

/** Draw the curves in on an outside clock (the welcome intro), one after another, instead of fading them in. */
export type CurveDraw = { clock: SharedValue<number>; start: number; duration: number; stagger: number };

type Props = {
  variant: OnboardingBackgroundVariant;
  /**
   * Set on scrolling forms: the curves are placed inside the scroll content at this height
   * (the screen's), so they scroll away with the header instead of sitting behind fields.
   */
  height?: number;
  /** Wait before the curves reveal. */
  delay?: number;
  draw?: CurveDraw;
  /** Draw the curves in on their own, starting this many ms after the screen opens, then hold still. */
  drawIn?: number;
};

function progress(t: number, start: number, duration: number) {
  'worklet';
  return Math.min(1, Math.max(0, (t - start) / duration));
}
function easeInOut(p: number) {
  'worklet';
  return p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2;
}

export function OnboardingBackground({ variant, delay = 0, height, draw: outside, drawIn }: Props) {
  const reducedMotion = useReducedMotion();
  // A screen that asks for drawIn gets its own short clock instead of the welcome intro's.
  const own = useSharedValue(0);
  const draw = useMemo<CurveDraw | undefined>(
    () => outside ?? (drawIn === undefined ? undefined : { clock: own, start: drawIn, duration: 1000, stagger: 140 }),
    [drawIn, outside, own],
  );
  useEffect(() => {
    if (drawIn === undefined || reducedMotion) return;
    const end = drawIn + 1000 + 140 * CURVES[variant].length;
    own.set(withTiming(end, { duration: end, easing: Easing.linear }));
    return () => cancelAnimation(own);
  }, [drawIn, own, reducedMotion, variant]);
  // SVG ids must be unique per instance (several screens stay mounted in the stack on web).
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const reveal = useSharedValue(reducedMotion || draw ? 1 : 0);
  const drift = useSharedValue(0);
  const width = useSharedValue(0);
  const curves = CURVES[variant];

  useEffect(() => {
    // Drawn curves arrive with the intro and then hold still, so nothing competes with the product.
    if (reducedMotion || draw) { reveal.set(1); return; }
    reveal.set(withDelay(delay, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) })));
    // A very slow sway, so the field feels alive without ever pulling focus.
    drift.set(withDelay(delay + 1100, withRepeat(withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.sin) }), -1, true)));
    return () => { cancelAnimation(reveal); cancelAnimation(drift); };
  }, [delay, draw, drift, reducedMotion, reveal]);

  const layer = useAnimatedStyle(() => {
    // While drawing, the whole field eases about 10 px into place, then stops.
    const settle = draw ? 1 - easeInOut(progress(draw.clock.value, draw.start, draw.duration + draw.stagger * (curves.length - 1))) : 0;
    return {
      opacity: reveal.value,
      transform: [{ translateX: -10 * (1 - reveal.value) - 6 * drift.value + 10 * settle }, { translateY: 3 * drift.value + 4 * settle }],
    };
  });

  const path = (curve: Curve) => (
    <Path key={curve.d} d={curve.d} fill="none" stroke={`url(#${id}${curve.fade})`} strokeOpacity={curve.opacity} strokeWidth={curve.width} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
  );
  const field = (children: ReactNode) => (
    <Svg width="100%" height="100%" viewBox="0 0 390 844" preserveAspectRatio="none">
      <Defs>
        {(Object.keys(STOPS) as Fade[]).map((fade) => (
          <LinearGradient key={fade} id={`${id}${fade}`} x1="0" y1="0" x2="390" y2="0" gradientUnits="userSpaceOnUse">
            {STOPS[fade].map(([offset, opacity]) => <Stop key={offset} offset={offset} stopColor={Entry.peach} stopOpacity={opacity} />)}
          </LinearGradient>
        ))}
      </Defs>
      {children}
    </Svg>
  );

  return (
    <View pointerEvents="none" accessible={false} aria-hidden importantForAccessibility="no-hide-descendants" style={[styles.root, height !== undefined && { bottom: undefined, height }]}>
      <Animated.View onLayout={(event: LayoutChangeEvent) => width.set(event.nativeEvent.layout.width)} style={[styles.layer, layer]}>
        {draw && !reducedMotion
          ? curves.map((curve, index) => (
            <CurveWipe key={curve.d} draw={draw} index={index} width={width}>{field(path(curve))}</CurveWipe>
          ))
          : field(curves.map(path))}
      </Animated.View>
    </View>
  );
}

/**
 * Draws one curve in from the left: a window slides across it while its content slides the
 * other way by the same amount, so the line appears to extend along its path. Transforms only.
 */
function CurveWipe({ children, draw, index, width }: { children: ReactNode; draw: CurveDraw; index: number; width: SharedValue<number> }) {
  const window = useAnimatedStyle(() => {
    const p = easeInOut(progress(draw.clock.value, draw.start + draw.stagger * index, draw.duration));
    // Until the layer has a width the wipe can't hide anything, so stay hidden rather than flash.
    return { opacity: width.value > 0 || p >= 1 ? Math.min(1, p * 4) : 0, transform: [{ translateX: -(1 - p) * width.value }] };
  });
  const content = useAnimatedStyle(() => {
    const p = easeInOut(progress(draw.clock.value, draw.start + draw.stagger * index, draw.duration));
    return { transform: [{ translateX: (1 - p) * width.value }] };
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.clip, window]}>
      <Animated.View style={[StyleSheet.absoluteFill, content]}>{children}</Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  // Slightly wider than the screen so the drift never reveals a line's end.
  layer: { position: 'absolute', top: 0, bottom: 0, left: -12, right: -12 },
  clip: { overflow: 'hidden' },
});
