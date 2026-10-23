/** Coach-only visual language. Keep these tokens out of the shared theme so Athlete remains unchanged. */
export const CoachPalette = {
  canvas: '#0B0D0E',
  surface: '#151819',
  surfaceAlt: '#1B1F20',
  interactive: '#222728',
  text: '#F7F6F2',
  textSecondary: '#E0E1DF',
  muted: '#B7BCBE',
  faint: '#7E8587',
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
  page: { fontSize: 40, lineHeight: 44, fontWeight: '800' as const, letterSpacing: -1.5 },
  section: { fontSize: 26, lineHeight: 31, fontWeight: '800' as const, letterSpacing: -0.7 },
  card: { fontSize: 21, lineHeight: 26, fontWeight: '700' as const, letterSpacing: -0.35 },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '500' as const },
  label: { fontSize: 14, lineHeight: 18, fontWeight: '600' as const },
} as const;
