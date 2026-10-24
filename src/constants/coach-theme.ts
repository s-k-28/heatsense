import { Typeface } from '@/constants/typography';
/** Coach-only visual language. Keep these tokens out of the shared theme so Athlete remains unchanged. */
export const CoachPalette = {
  canvas: '#090B0C',
  surface: '#131718',
  surfaceAlt: '#1D2425',
  interactive: '#252B2C',
  text: '#F4F0E8',
  textSecondary: '#D6DAD6',
  muted: '#D6DAD6',
  faint: '#BAC5C1',
  peach: '#FFAD83',
  peachInk: '#24140C',
  hairline: 'rgba(247,246,242,0.07)',
} as const;

export const CoachRadius = {
  card: 30,
  panel: 24,
  input: 22,
  pill: 999,
} as const;

export const CoachType = {
  page: { fontFamily: Typeface.display, fontSize: 40, lineHeight: 44, fontWeight: '800' as const, letterSpacing: -1.5 },
  section: { fontFamily: Typeface.heading, fontSize: 26, lineHeight: 31, fontWeight: '700' as const, letterSpacing: -0.7 },
  card: { fontFamily: Typeface.button, fontSize: 21, lineHeight: 26, fontWeight: '700' as const, letterSpacing: -0.35 },
  body: { fontFamily: Typeface.body, fontSize: 16, lineHeight: 23, fontWeight: '600' as const },
  label: { fontFamily: Typeface.label, fontSize: 14, lineHeight: 18, fontWeight: '600' as const },
} as const;
