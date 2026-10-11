import { BlurMask, Canvas, Circle, Path, interpolateColors } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { useDerivedValue, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { CoachColors as C } from '@/constants/coach-theme';
import { arcPath, tiers, type TierName } from './coach-data';

export type GaugeProps = { tier: TierName; width: number };
const track = arcPath(0, 1);

export default function WbgtGaugeCanvas({ tier, width }: GaugeProps) {
  const reducedMotion = useReducedMotion();
  const index = tiers.findIndex((item) => item.name === tier);
  const position = useSharedValue(index);
  useEffect(() => {
    position.value = withTiming(index, { duration: reducedMotion ? 0 : 650 });
  }, [index, position, reducedMotion]);
  // Black keeps its black identity, with a white keyline to stay visible on graphite.
  const color = useDerivedValue(() => interpolateColors(position.value, [0, 1, 2, 3, 4], [C.green, C.yellow, C.orange, C.red, '#E9EBEF']));
  const progress = useDerivedValue(() => (position.value + 0.5) / 5);
  const cx = useDerivedValue(() => 160 + 144 * Math.cos(Math.PI + progress.value * Math.PI));
  const cy = useDerivedValue(() => 159 + 144 * Math.sin(Math.PI + progress.value * Math.PI));
  return (
    <Canvas style={{ width, height: width * 0.55 }}>
      <Path path={track} color="#313237" style="stroke" strokeWidth={3} transform={[{ scale: width / 320 }]} />
      <Path path={track} color={color} style="stroke" strokeWidth={9} strokeCap="round" end={progress} opacity={0.25} transform={[{ scale: width / 320 }]}><BlurMask blur={9} style="normal" /></Path>
      <Path path={track} color={color} style="stroke" strokeWidth={3} strokeCap="round" end={progress} transform={[{ scale: width / 320 }]} />
      <Circle cx={cx} cy={cy} r={5} color={color} transform={[{ scale: width / 320 }]} />
      {[0.2, 0.4, 0.6, 0.8].map((p) => <Circle key={p} cx={160 + 144 * Math.cos(Math.PI + p * Math.PI)} cy={159 + 144 * Math.sin(Math.PI + p * Math.PI)} r={2} color={C.surface} transform={[{ scale: width / 320 }]} />)}
    </Canvas>
  );
}
