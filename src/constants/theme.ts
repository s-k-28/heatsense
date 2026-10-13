import '@/global.css';

import { Platform } from 'react-native';

export const Palette = {
  // Matches the onboarding flow: charcoal ground, white type, quiet white
  // outlines instead of filled panels, and a single peach-orange accent
  // (eyebrows, the logo mark, small highlights). The semantic risk colors
  // (safe/caution/warning/emergency) stay as-is.
  canvas: '#222222',
  surface: '#222222',
  surfaceMuted: '#2A2A2A',
  ink: '#FFFFFF',
  inkMuted: '#B8B8B8',
  border: 'rgba(255,255,255,0.22)',
  outline: 'rgba(255,255,255,0.85)',
  coral: '#FF996B',
  coralDark: '#FF996B',
  coralSoft: 'rgba(255,153,107,0.14)',
  peach: '#F4B29F',
  sage: '#96A99C',
  safe: '#5ED3A0',
  caution: '#E3B341',
  warning: '#F0803C',
  emergency: '#FF6B5E',
  info: '#7AA7FF',
  white: '#FFFFFF',

  // Deep tones for a sun glyph sitting on a light zone fill.
  zoneOrangeDeep: '#7A3A16',
  zoneYellowDeep: '#7A5C0E',
  zoneRedDeep: '#6E1C14',
  zoneBlackDeep: '#000000',
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

// Helvetica Neue, like the onboarding screens. Weights are separate PostScript
// faces on iOS; the onboarding headline weight (500) is the heaviest we use.
const face = Platform.select({
  ios: { light: 'HelveticaNeue-Light', regular: 'HelveticaNeue', medium: 'HelveticaNeue-Medium' },
  android: { light: 'sans-serif-light', regular: 'sans-serif', medium: 'sans-serif-medium' },
  default: {
    light: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    regular: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    medium: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  },
})!;

export const Fonts = {
  light: face.light,
  regular: face.regular,
  medium: face.medium,
  semibold: face.medium,
  bold: face.medium,
  extrabold: face.medium,
  mono: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
  fallback: Platform.select({ ios: 'System', default: 'sans-serif' }),

  // Legacy "meet HeatSense" story set, still used by the optional intro screens.
  uiRegular: face.regular,
  uiMedium: face.medium,
  uiSemibold: face.medium,
  uiBold: face.medium,
  uiExtrabold: face.medium,
  ctaItalic: 'Fraunces_500Medium_Italic',
  ctaItalicSemibold: 'Fraunces_600SemiBold_Italic',
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
  medium: 24,
  large: 30,
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
