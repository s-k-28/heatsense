import { Platform } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { CoachColors as C } from '@/constants/coach-theme';

const paths = {
  heat: 'M10 14.5V5a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0ZM12 9v9M17 5h3M17 9h2',
  home: 'm3 10 9-7 9 7M5 9v11h5v-6h4v6h5V9',
  plan: 'M9 5H5v16h14V5h-4M9 3h6v4H9ZM8 11h8M8 15h6',
  team: 'M15 21v-3a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v3M17 14a4 4 0 0 1 4 4v3M16 4a4 4 0 0 1 0 8',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  profile: 'M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2',
  clock: 'M12 6v6l4 2',
  water: 'M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13ZM9 15a3 3 0 0 0 3 3',
  equipment: 'm8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4c0 4-8 4-8 0Z',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  chevron: 'm9 5 7 7-7 7',
  location: 'M19 9c0 6-7 12-7 12S5 15 5 9a7 7 0 0 1 14 0Z',
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12M6 18 18 6',
  signal: 'M3 17v3M8 13v7M13 8v12M18 3v17',
  shield: 'm12 2 8 3v6c0 6-8 11-8 11S4 17 4 11V5l8-3Zm-4 9 3 3 5-6',
  alert: 'M12 3 2 21h20L12 3Zm0 6v5m0 3v1',
} as const;

// Hide decorative icons from screen readers; the native props leak into the DOM on web.
const hiddenFromAccessibility = Platform.OS === 'web'
  ? { 'aria-hidden': true }
  : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };

export type InstrumentIconName = keyof typeof paths;

export function InstrumentIcon({ name, size = 22, color = C.text }: { name: InstrumentIconName; size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round" {...hiddenFromAccessibility}>
      <Path d={paths[name]} />
      {name === 'clock' && <Circle cx={12} cy={12} r={9} />}
      {name === 'team' && <Circle cx={9} cy={7} r={4} />}
      {name === 'profile' && <Circle cx={12} cy={6} r={4} />}
      {name === 'location' && <Circle cx={12} cy={9} r={2} />}
    </Svg>
  );
}
