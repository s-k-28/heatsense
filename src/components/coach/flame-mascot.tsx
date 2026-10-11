import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';

// Flat 2D flame mascot drawn in layers (body, eyes, waving arm) so each part
// can animate on its own. All layers share one viewBox and stack exactly.
const VIEW_W = 200;
const VIEW_H = 214;
const SHOULDER = { x: 146, y: 138 };
const EYE_LINE_Y = 116;

const limb = '#F8973F';
const ink = '#2B1A12';

function BodyLayer() {
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
      <Defs>
        <LinearGradient id="flame" x1="0.8" y1="0" x2="0.2" y2="1">
          <Stop offset="0" stopColor="#FFCB63" />
          <Stop offset="0.55" stopColor="#FBA54C" />
          <Stop offset="1" stopColor="#F68A3C" />
        </LinearGradient>
        <LinearGradient id="back" x1="1" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F79A45" />
          <Stop offset="1" stopColor="#EE7B35" />
        </LinearGradient>
      </Defs>
      {/* Legs and feet sit behind the body. */}
      <Path d="M88 172 L84 194" stroke={limb} strokeWidth={14} strokeLinecap="round" />
      <Path d="M114 172 L120 194" stroke={limb} strokeWidth={14} strokeLinecap="round" />
      <Ellipse cx={78} cy={200} rx={15} ry={8} fill={limb} />
      <Ellipse cx={126} cy={200} rx={15} ry={8} fill={limb} />
      {/* Back tongues on the left give the flame its depth. */}
      <Path d="M66 136 C40 134 24 112 28 86 C36 98 46 102 54 100 C46 86 48 70 58 56 C62 74 72 84 82 88 Z" fill="url(#back)" />
      {/* Main body. */}
      <Path
        d="M101 182 C62 182 42 156 44 124 C45 104 54 92 56 76 C66 84 70 94 70 102 C72 76 84 50 108 26 C106 48 114 62 126 72 C130 62 132 54 130 42 C150 62 162 92 160 124 C158 158 138 182 101 182 Z"
        fill="url(#flame)"
      />
      {/* Hand on hip. */}
      <Path d="M58 140 C44 146 42 160 56 164" stroke={limb} strokeWidth={12} strokeLinecap="round" fill="none" />
      {/* Brows and mouth. */}
      <Path d="M76 98 Q84 92 92 97" stroke={ink} strokeWidth={4} strokeLinecap="round" fill="none" />
      <Path d="M112 95 Q120 90 128 95" stroke={ink} strokeWidth={4} strokeLinecap="round" fill="none" />
      <Path d="M90 136 Q102 156 116 135 Q103 141 90 136 Z" fill={ink} />
      <Ellipse cx={103} cy={146} rx={7} ry={4} fill="#E86A5A" />
    </Svg>
  );
}

function EyesLayer() {
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
      <G>
        <Ellipse cx={86} cy={EYE_LINE_Y} rx={7.5} ry={10.5} fill={ink} />
        <Ellipse cx={120} cy={EYE_LINE_Y - 2} rx={7.5} ry={10.5} fill={ink} />
        <Circle cx={88.5} cy={EYE_LINE_Y - 4} r={2.6} fill="#FFFFFF" />
        <Circle cx={122.5} cy={EYE_LINE_Y - 6} r={2.6} fill="#FFFFFF" />
      </G>
    </Svg>
  );
}

function ArmLayer() {
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
      <Path d={`M${SHOULDER.x} ${SHOULDER.y} C160 132 166 118 164 102`} stroke={limb} strokeWidth={12} strokeLinecap="round" fill="none" />
      <Circle cx={164} cy={98} r={9} fill={limb} />
      {/* Wave sparks. */}
      <Path d="M176 78 L180 68" stroke="#FFD35C" strokeWidth={4} strokeLinecap="round" />
      <Path d="M184 90 L194 84" stroke="#FFD35C" strokeWidth={4} strokeLinecap="round" />
      <Path d="M186 104 L197 104" stroke="#FFD35C" strokeWidth={4} strokeLinecap="round" />
    </Svg>
  );
}

const pct = (value: number, total: number) => `${(value / total) * 100}%`;

export function FlameMascot({ height = 104, onPress }: { height?: number; onPress?: () => void }) {
  const reducedMotion = useReducedMotion();
  const float = useSharedValue(0);
  const blink = useSharedValue(1);
  const wave = useSharedValue(0);
  const bounce = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    float.value = withRepeat(withTiming(-4, { duration: 1800, easing: Easing.inOut(Easing.sin) }), -1, true);
    // Blink roughly every four seconds.
    blink.value = withRepeat(withSequence(withDelay(3600, withTiming(0.1, { duration: 80 })), withTiming(1, { duration: 120 })), -1);
    // A short wave every ten seconds.
    wave.value = withRepeat(withSequence(
      withDelay(10000, withTiming(-16, { duration: 180 })),
      withTiming(10, { duration: 220 }),
      withTiming(-16, { duration: 220 }),
      withTiming(0, { duration: 200 }),
    ), -1);
    return () => { cancelAnimation(float); cancelAnimation(blink); cancelAnimation(wave); };
  }, [blink, float, reducedMotion, wave]);

  const handlePress = () => {
    onPress?.();
    if (reducedMotion) return;
    bounce.value = withSequence(withTiming(-10, { duration: 140, easing: Easing.out(Easing.quad) }), withSpring(0, { damping: 6, stiffness: 180 }));
    wave.value = withSequence(withTiming(-16, { duration: 160 }), withTiming(10, { duration: 200 }), withTiming(-16, { duration: 200 }), withTiming(0, { duration: 180 }));
  };

  const width = (height * VIEW_W) / VIEW_H;
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: float.value + bounce.value }] }));
  const eyeStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.value }] }));
  const armStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${wave.value}deg` }] }));

  return (
    <Pressable accessibilityRole="button" accessibilityLabel="HeatSense flame mascot" onPress={handlePress} hitSlop={8}>
      <Animated.View style={[{ width, height }, floatStyle]}>
        <View style={StyleSheet.absoluteFill}><BodyLayer /></View>
        <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: `50% ${pct(EYE_LINE_Y, VIEW_H)}` }, eyeStyle]}><EyesLayer /></Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: `${pct(SHOULDER.x, VIEW_W)} ${pct(SHOULDER.y, VIEW_H)}` }, armStyle]}><ArmLayer /></Animated.View>
      </Animated.View>
    </Pressable>
  );
}
