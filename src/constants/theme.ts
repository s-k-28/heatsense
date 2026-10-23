import '@/global.css';

import { Platform } from 'react-native';

export const Palette = {
  // The dashboard shares the onboarding's palette (constants/entry-theme.ts): a deep blue-black
  // canvas, slightly raised surfaces, warm off-white ink, and peach as the one accent, used only on
  // things you can tap. Status colors (below) are reserved for status.
  canvas: '#101416',
  grouped: '#101416',
  surface: '#1A2024',
  surfaceMuted: '#242D32',
  ink: '#F6F3EC',
  inkMuted: '#B0BAC0',
  inkFaint: '#7D898F',
  border: '#354147',
  outline: 'rgba(246,243,236,0.85)',
  fill: 'rgba(176,186,192,0.16)',
  coral: '#FFB183',
  coralDark: '#FFB183',
  coralSoft: 'rgba(255,177,131,0.14)',
  peach: '#FFB183',
  sage: '#96A99C',
  safe: '#30D158',
  caution: '#FFD60A',
  warning: '#FF9F0A',
  emergency: '#FF453A',
  info: '#0A84FF',
  white: '#FFFFFF',
  card: '#1A2024',
  cardEdge: '#242D32',
  zoneOrangeDeep: '#7A3A16',
  zoneYellowDeep: '#7A5C0E',
  zoneRedDeep: '#6E1C14',
  zoneBlackDeep: '#000000',
} as const;

// Two families, each with one job. Barlow Condensed (bundled) sets figures and the short uppercase
// labels above them, like an instrument panel. SF Pro sets anything read as a sentence, so titles,
// rows and explanations keep the system font and Dynamic Type.
export const Face = {
  figure: 'BarlowCondensed_700Bold',
  label: 'BarlowCondensed_600SemiBold',
} as const;

export const Type = {
  // Group labels read as words, not as spaced-out capitals.
  label: { fontWeight: '600', fontSize: 15, lineHeight: 20 },
  labelSmall: { fontWeight: '500', fontSize: 14, lineHeight: 18 },
  figure: { fontWeight: '700', fontSize: 30, lineHeight: 33, letterSpacing: 0.2 },
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: 0.37 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '600', letterSpacing: 0.35 },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600', letterSpacing: 0.38 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.43 },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400', letterSpacing: -0.43 },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400', letterSpacing: -0.31 },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: '400', letterSpacing: -0.23 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400', letterSpacing: -0.08 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400', letterSpacing: 0 },
  display: { fontSize: 48, lineHeight: 54, fontWeight: '600', letterSpacing: 0.3 },
  tab: { fontSize: 11, lineHeight: 13, fontWeight: '500', letterSpacing: 0.55 },
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
  // SF Pro everywhere on iOS: the system font. Weights come from fontWeight on each style.
  ios: { light: 'System', regular: 'System', medium: 'System', bold: 'System' },
  android: { light: 'sans-serif-light', regular: 'sans-serif', medium: 'sans-serif-medium', bold: 'sans-serif-medium' },
  default: {
    light: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    regular: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    medium: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    bold: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  },
})!;

export const Fonts = {
  light: face.light,
  regular: face.regular,
  medium: face.medium,
  semibold: face.medium,
  bold: face.bold,
  extrabold: face.bold,
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
  small: 10,
  medium: 14,
  large: 20,
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
