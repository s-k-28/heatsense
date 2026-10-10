import Svg, { Path } from 'react-native-svg';

import { Palette } from '@/constants/theme';

/**
 * Vectorized from the flame mark on the wristband render -- a two-tongue
 * flame (a taller outer lobe, a smaller inner one licking up through it)
 * rather than HeatIcon's thermometer glyph. Used where the product's own
 * mark should show through directly (wristband module callouts, etc.)
 * rather than the app's general-purpose heat icon.
 */
export default function FlameLogo({ size = 24, color = Palette.coral }: { size?: number; color?: string }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M12.6 1.5c.3 2.6-.6 4.2-2.1 5.9-1.7 1.9-3.3 3.9-3.3 6.8 0 3.8 3 6.8 6.8 6.8 3.5 0 6.5-2.6 6.8-6.1.3-3.1-1.1-5.3-2.9-7.2-.3 1.6-1 2.6-1.9 3.3-.1-2.9-1.1-5.4-3.4-9.5z"
        fill={color}
      />
      <Path
        d="M12.9 10.4c.6 1.3.8 2.4.6 3.5-.2 1.4-1.3 2.4-2.7 2.4-1.5 0-2.7-1.1-2.8-2.6-.1-1.3.6-2.2 1.5-3 .1 1 .5 1.6 1.1 2 .2-1 .6-1.7 2.3-2.3z"
        fill={Palette.canvas}
        opacity={0.9}
      />
    </Svg>
  );
}
