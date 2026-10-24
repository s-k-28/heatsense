import '@/global.css';

import { Platform, type TextStyle } from 'react-native';
import { Typeface } from '@/constants/typography';

export const Palette = {
  // The dashboard shares the onboarding's palette (constants/entry-theme.ts): a deep blue-black
  // canvas, slightly raised surfaces, warm off-white ink, and peach as the one accent, used only on
  // things you can tap. Status colors (below) are reserved for status.
  canvas: '#090B0C',
  grouped: '#090B0C',
  surface: '#131718',
  surfaceMuted: '#1D2425',
  ink: '#F4F0E8',
  inkMuted: '#D6DAD6',
  inkFaint: '#BAC5C1',
  border: 'rgba(214,218,214,0.10)',
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
  interactive: '#252B2C',
  ice: '#A9DCE8',
  card: '#131718',
  cardEdge: 'rgba(214,218,214,0.06)',
  zoneOrangeDeep: '#7A3A16',
  zoneYellowDeep: '#7A5C0E',
  zoneRedDeep: '#6E1C14',
  zoneBlackDeep: '#000000',
} as const;

// Archivo sets headings and metrics; Manrope sets reading and action text.
export const Face = {
  figure: Typeface.display,
  label: Typeface.label,
} as const;

export const Type = {
  label: { fontFamily: Typeface.label, fontWeight: '600', fontSize: 15, lineHeight: 21 },
  labelSmall: { fontFamily: Typeface.label, fontWeight: '600', fontSize: 14, lineHeight: 20 },
  figure: { fontFamily: Typeface.display, fontWeight: '800', fontVariant: ['tabular-nums'] as TextStyle['fontVariant'], fontSize: 30, lineHeight: 35, letterSpacing: -0.6 },
  largeTitle: { fontFamily: Typeface.display, fontSize: 40, lineHeight: 46, fontWeight: '800', letterSpacing: -1.2 },
  title2: { fontFamily: Typeface.heading, fontSize: 26, lineHeight: 33, fontWeight: '700', letterSpacing: -0.6 },
  title3: { fontFamily: Typeface.button, fontSize: 20, lineHeight: 27, fontWeight: '700', letterSpacing: -0.3 },
  headline: { fontFamily: Typeface.button, fontSize: 18, lineHeight: 25, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontFamily: Typeface.body, fontSize: 16, lineHeight: 24, fontWeight: '600', letterSpacing: -0.15 },
  callout: { fontFamily: Typeface.body, fontSize: 16, lineHeight: 23, fontWeight: '600', letterSpacing: -0.15 },
  subhead: { fontFamily: Typeface.body, fontSize: 15, lineHeight: 22, fontWeight: '600', letterSpacing: -0.1 },
  footnote: { fontFamily: Typeface.label, fontSize: 14, lineHeight: 20, fontWeight: '600', letterSpacing: -0.1 },
  caption: { fontFamily: Typeface.label, fontSize: 13, lineHeight: 19, fontWeight: '600', letterSpacing: 0 },
  display: { fontFamily: Typeface.display, fontSize: 48, lineHeight: 56, fontWeight: '800', letterSpacing: -1 },
  tab: { fontFamily: Typeface.button, fontSize: 12, lineHeight: 18, fontWeight: '700', letterSpacing: 0 },
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

/** Compatibility names all resolve to the same two-family system. */
export const Fonts = {
  light: Typeface.body, regular: Typeface.body, medium: Typeface.body,
  semibold: Typeface.body, bold: Typeface.button, extrabold: Typeface.display,
  mono: Typeface.display, fallback: Platform.select({ ios: 'System', default: 'sans-serif' }),
  uiRegular: Typeface.body, uiMedium: Typeface.body, uiSemibold: Typeface.body,
  uiBold: Typeface.button, uiExtrabold: Typeface.display, ctaItalic: Typeface.display,
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
  small: 22,
  medium: 28,
  large: 32,
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
