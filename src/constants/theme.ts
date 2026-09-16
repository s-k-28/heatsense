import '@/global.css';

import { Platform } from 'react-native';

export const Palette = {
  canvas: '#F6F3EC',
  surface: '#FFFDF8',
  surfaceMuted: '#ECE8DD',
  ink: '#1B1C19',
  inkMuted: '#6D7068',
  border: '#DDD8CC',
  coral: '#F06F5F',
  coralDark: '#D95749',
  coralSoft: '#FBE1DA',
  peach: '#F4B29F',
  sage: '#96A99C',
  safe: '#39765B',
  caution: '#9A7100',
  warning: '#C45B18',
  emergency: '#B42318',
  white: '#FFFFFF',
} as const;

// HeatSense intentionally uses one warm visual system across light and dark
// device preferences. Risk colors communicate safety state, not appearance mode.
export const Colors = {
  light: {
    text: Palette.ink,
    background: Palette.canvas,
    backgroundElement: Palette.surface,
    backgroundSelected: Palette.coralSoft,
    textSecondary: Palette.inkMuted,
  },
  dark: {
    text: Palette.ink,
    background: Palette.canvas,
    backgroundElement: Palette.surface,
    backgroundSelected: Palette.coralSoft,
    textSecondary: Palette.inkMuted,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = {
  regular: 'AtkinsonHyperlegibleNext_400Regular',
  medium: 'AtkinsonHyperlegibleNext_500Medium',
  semibold: 'AtkinsonHyperlegibleNext_600SemiBold',
  bold: 'AtkinsonHyperlegibleNext_700Bold',
  extrabold: 'AtkinsonHyperlegibleNext_800ExtraBold',
  mono: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
  fallback: Platform.select({ ios: 'System', default: 'sans-serif' }),
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  seven: 32,
  eight: 40,
  nine: 48,
  ten: 64,
} as const;

export const Radius = {
  small: 12,
  medium: 18,
  large: 26,
  pill: 999,
} as const;

export const Motion = {
  instant: 140,
  quick: 220,
  settle: 520,
  ambient: 860,
} as const;

export const TypeScale = {
  micro: 10,
  caption: 12,
  bodySmall: 14,
  body: 16,
  titleSmall: 20,
  title: 25,
  displaySmall: 31,
  display: 39,
  metric: 56,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 520;
