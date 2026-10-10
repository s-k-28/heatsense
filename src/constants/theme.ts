import '@/global.css';

import { Platform } from 'react-native';

export const Palette = {
  // Flipped to a black-first scheme -- canvas/surface/ink/border inverted;
  // coral and the semantic risk colors (safe/caution/warning/emergency)
  // stay as-is since they already read clearly against a dark ground.
  canvas: '#0D0C0A',
  surface: '#17140F',
  surfaceMuted: '#231F19',
  ink: '#F5F1E8',
  inkMuted: '#A39C90',
  border: '#332D24',
  coral: '#F06F5F',
  coralDark: '#D95749',
  coralSoft: 'rgba(240,111,95,0.16)',
  peach: '#F4B29F',
  sage: '#96A99C',
  safe: '#4C9B76',
  caution: '#C99A2E',
  warning: '#E07C3E',
  emergency: '#E5584A',
  white: '#FFFFFF',

  // Deep/burnt tones for the sun glyph on a zone card -- a darker shade of
  // whatever zone color is active, instead of a flat neutral icon color.
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

export const Fonts = {
  regular: 'AtkinsonHyperlegibleNext_400Regular',
  medium: 'AtkinsonHyperlegibleNext_500Medium',
  semibold: 'AtkinsonHyperlegibleNext_600SemiBold',
  bold: 'AtkinsonHyperlegibleNext_700Bold',
  extrabold: 'AtkinsonHyperlegibleNext_800ExtraBold',
  mono: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
  fallback: Platform.select({ ios: 'System', default: 'sans-serif' }),

  // Onboarding-only set. Everywhere else in the app keeps the accessible
  // Atkinson Hyperlegible family above -- these two are scoped to the
  // "meet HeatSense" intro screens specifically.
  uiRegular: 'Inter_400Regular',
  uiMedium: 'Inter_500Medium',
  uiSemibold: 'Inter_600SemiBold',
  uiBold: 'Inter_700Bold',
  uiExtrabold: 'Inter_800ExtraBold',
  // A display serif with soft, curved (not straight-cut) letter terminals,
  // for the one big headline CTA on the first onboarding screen.
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
