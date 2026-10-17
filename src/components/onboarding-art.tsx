import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import { Entry } from '@/constants/entry-theme';

// Small supporting graphics for onboarding, drawn in Fieldline's shape language
// (see fieldline-character.tsx): charcoal bodies with a soft outline, one peach
// fold, a flowing blue band, and thin field lines. Decorative: hidden from screen
// readers, never interactive, and sized to sit beside a headline, not above a form.

const FILL = Entry.characterFill;
const LINE = Entry.characterLine;

/** Arrives once with a short settle (no idle loop), or appears instantly under reduced motion. */
function Settle({ children, delay = 250 }: { children: React.ReactNode; delay?: number }) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (!reduceMotion) progress.value = withDelay(delay, withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) }));
  }, [delay, progress, reduceMotion]);
  const style = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ translateY: (1 - progress.value) * 8 }, { rotate: `${(1 - progress.value) * -4}deg` }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

function Art({ size, children, viewBox = '0 0 120 120' }: { size: number; children: React.ReactNode; viewBox?: string }) {
  return (
    <View pointerEvents="none" accessible={false} aria-hidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      <Settle>
        <Svg width={size} height={size} viewBox={viewBox}>{children}</Svg>
      </Settle>
    </View>
  );
}

const Ground = () => <Ellipse cx="60" cy="110" rx="44" ry="5" fill="#080D10" opacity={0.6} />;

/** Page 1, "Make it yours.": a jersey with a peach collar fold and a blue band. */
export function JerseyMark({ size = 96 }: { size?: number }) {
  return (
    <Art size={size}>
      <Ground />
      <Path d="M38 20 L50 14 Q60 22 70 14 L82 20 L102 36 L92 54 L84 48 L84 100 Q84 106 78 106 L42 106 Q36 106 36 100 L36 48 L28 54 L18 36Z" fill={FILL} stroke={LINE} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M50 14 Q60 30 70 14 Q66 26 60 28 Q54 26 50 14Z" fill={Entry.peach} />
      <Path d="M36 70 C52 62 66 78 84 66 L84 78 C66 90 52 74 36 82Z" fill={Entry.blue} />
      <Path d="M53 42 h15 l-9 20" stroke={Entry.ink} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.9} />
    </Art>
  );
}

/** Page 2, "Know your body.": a low peach sun over a flowing blue band and field lines. */
export function HeatMark({ size = 96 }: { size?: number }) {
  return (
    <Art size={size}>
      <Path d="M8 96 L60 70 L114 92 M14 108 L60 82 L112 104" stroke={Entry.line} strokeWidth={1} fill="none" />
      <Circle cx="60" cy="50" r="24" fill={Entry.peach} />
      <Path d="M60 14 v8 M60 78 v8 M24 50 h8 M88 50 h8 M35 25 l6 6 M79 69 l6 6 M85 25 l-6 6 M41 69 l-6 6" stroke={Entry.peach} strokeWidth={3} strokeLinecap="round" opacity={0.7} />
      <Path d="M14 74 C34 62 50 86 72 74 C88 66 98 70 108 78 C96 90 82 86 70 92 C50 102 34 82 14 90Z" fill={Entry.blue} />
      <Path d="M50 46 Q55 42 60 46" stroke={FILL} strokeWidth={3} strokeLinecap="round" fill="none" />
    </Art>
  );
}

/** Page 3, "Safety comes first.": a shield split by Fieldline's blue crossbar, with the peach fold on top. */
export function ShieldMark({ size = 96 }: { size?: number }) {
  return (
    <Art size={size}>
      <Ground />
      <Path d="M60 12 L96 24 Q98 25 98 28 L98 56 Q98 88 60 106 Q22 88 22 56 L22 28 Q22 25 24 24Z" fill={FILL} stroke={LINE} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M22 50 C40 40 58 64 98 48 L98 62 C60 78 40 56 22 66Z" fill={Entry.blue} />
      <Path d="M60 12 L96 24 Q98 25 98 28 L98 34 C82 26 70 30 60 22 C50 30 38 26 22 34 L22 28 Q22 25 24 24Z" fill={Entry.peach} />
      <Path d="M48 82 l8 8 l16 -18" stroke={Entry.ink} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.9} />
    </Art>
  );
}

/** Coach team creation: a roster clipboard with a peach clip and a blue band. */
export function RosterMark({ size = 88 }: { size?: number }) {
  return (
    <Art size={size}>
      <Ground />
      <Rect x="28" y="18" width="64" height="88" rx="10" fill={FILL} stroke={LINE} strokeWidth={1.5} />
      <Path d="M46 12 h28 q4 0 4 4 v10 q0 4 -4 4 h-28 q-4 0 -4 -4 v-10 q0 -4 4 -4Z" fill={Entry.peach} />
      <Path d="M28 58 C48 50 64 70 92 58 L92 70 C64 82 48 62 28 70Z" fill={Entry.blue} />
      <Path d="M42 44 h36 M42 84 h24 M42 94 h30" stroke={Entry.ink} strokeWidth={3} strokeLinecap="round" opacity={0.8} />
    </Art>
  );
}

/** Thin field-line perspective, for behind a headline or code entry. Fills its parent; never takes touches. */
export function FieldLines({ opacity = 1 }: { opacity?: number }) {
  return (
    <View pointerEvents="none" accessible={false} aria-hidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', top: 0, left: -26, right: -26, bottom: 0, opacity }}>
      <Svg width="100%" height="100%" viewBox="0 0 400 220" preserveAspectRatio="none">
        <Path d="M-30 182 L167 70 L435 144 M-30 215 L167 103 L435 177 M43 140 L312 215 M122 96 L393 170" stroke={Entry.line} strokeWidth={1} fill="none" />
        <Path d="M-10 196 L167 88 L414 158" stroke={Entry.blue} strokeOpacity={0.35} strokeWidth={1.4} fill="none" />
      </Svg>
    </View>
  );
}
