import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Ellipse, Path } from 'react-native-svg';

import { Entry } from '@/constants/entry-theme';

type FieldlineProps = { height?: number; reaction?: 'coach' | 'athlete' | null };

/** Fieldline's shapes, in drawing order (viewBox 0 0 320 270). Shared with the welcome intro, which builds him piece by piece. */
export const FIELDLINE_VIEWBOX = '0 0 320 270';
export const FIELDLINE_PARTS = {
  backLeg: 'M220 105 Q251 98 260 124 L283 230 Q289 251 266 252 L233 252 Q216 252 214 233 L199 144 Q196 113 220 105Z',
  band: 'M130 35 C134 112 160 133 207 137 C254 142 279 176 282 231 C263 196 229 192 192 187 C156 182 124 179 108 157Z',
  body: 'M107 27 Q147 4 151 37 C150 81 132 118 120 157 L94 237 Q90 252 72 252 H42 Q27 252 33 232 L74 100 Q82 74 79 59 Q78 38 107 27Z',
  fold: 'M80 116 C89 77 43 91 54 57 C61 36 96 22 128 14 C142 10 151 18 151 37 C144 11 134 21 119 35 C88 63 87 90 80 116Z',
  /** A small smile under the eyes, tilted with the head. */
  mouth: 'M106 97 Q117 104 127 91',
} as const;
/** The field lines behind him in FieldlineScene (viewBox 0 0 400 220, stretched). */
export const FIELD_LINES = {
  grid: 'M-30 182 L167 70 L435 144 M-30 215 L167 103 L435 177 M43 140 L312 215 M122 96 L393 170',
  accent: 'M-10 196 L167 88 L414 158',
} as const;
export const FIELDLINE_FILL = '#29343B';
export const FIELDLINE_LINE = '#42525C';

// Original vector drawing based on the Fieldline direction. No raster sprites or idle loops.
export function FieldlineCharacter({ height = 220, reaction = null }: FieldlineProps) {
  const reduceMotion = useReducedMotion();
  const lean = useSharedValue(0);
  useEffect(() => {
    lean.value = reduceMotion || !reaction ? 0 : withSequence(
      withTiming(reaction === 'coach' ? -3 : 3, { duration: 150 }),
      withTiming(0, { duration: 240 }),
    );
  }, [lean, reaction, reduceMotion]);
  const pose = useAnimatedStyle(() => ({ transform: [{ rotate: `${lean.value}deg` }] }));

  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Fieldline, the H-shaped HeatSense companion" style={{ height, width: height * 1.18 }}>
      <Animated.View style={pose}>
        <Svg width={height * 1.18} height={height} viewBox={FIELDLINE_VIEWBOX} aria-hidden>
          <Ellipse cx="160" cy="250" rx="137" ry="10" fill="#080D10" opacity={0.6} />
          <Path d={FIELDLINE_PARTS.backLeg} fill={FIELDLINE_FILL} stroke={FIELDLINE_LINE} strokeWidth={1.5} />
          <Path d={FIELDLINE_PARTS.band} fill={Entry.blue} />
          <Path d={FIELDLINE_PARTS.body} fill={FIELDLINE_FILL} stroke={FIELDLINE_LINE} strokeWidth={1.5} />
          <Path d={FIELDLINE_PARTS.fold} fill={Entry.peach} />
          {/* The face is fixed to the body: it only moves when he does. */}
          <Ellipse cx="106" cy="80" rx="5" ry="8" fill={Entry.ink} />
          <Ellipse cx="126" cy="74" rx="5" ry="8" fill={Entry.ink} />
          <Path d={FIELDLINE_PARTS.mouth} stroke={Entry.ink} strokeWidth={4} strokeLinecap="round" fill="none" />
        </Svg>
      </Animated.View>
    </View>
  );
}

export function FieldlineScene({ compact = false, small = false, reaction = null }: { compact?: boolean; small?: boolean; reaction?: FieldlineProps['reaction'] }) {
  return (
    <View style={{ height: small ? 142 : compact ? 200 : 274, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
      <View pointerEvents="none" accessible={false} aria-hidden style={{ position: 'absolute', left: -24, right: -24, bottom: 0, height: '80%' }}>
        <Svg width="100%" height="100%" viewBox="0 0 400 220" preserveAspectRatio="none">
          <Path d={FIELD_LINES.grid} stroke={Entry.line} strokeWidth={1} fill="none" />
          <Path d={FIELD_LINES.accent} stroke={Entry.blue} strokeOpacity={0.5} strokeWidth={1.6} fill="none" />
        </Svg>
      </View>
      <FieldlineCharacter height={small ? 132 : compact ? 182 : 246} reaction={reaction} />
    </View>
  );
}
