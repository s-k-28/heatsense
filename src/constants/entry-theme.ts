import { Typeface } from '@/constants/typography';
// Entry brand colors are separate from safety risk levels.
export const Entry = {
  canvas: '#090B0C', surface: '#131718', raised: '#1D2425', line: 'rgba(214,218,214,0.10)',
  ink: '#F4F0E8', muted: '#D6DAD6', peach: '#FFB183', blue: '#A9DCE8',
  display: Typeface.display, body: Typeface.body,
  medium: Typeface.body, strong: Typeface.button,
  // Onboarding headings: the refined welcome type, not the condensed display face.
  heading: Typeface.display,
  // Thin dark edge on the peach button, and the faint (opaque) peach tint behind a selected choice.
  peachEdge: '#2B1A10', peachTint: '#241E1B',
  // Onboarding forms (setup, team, athlete profile) built on the same palette.
  lineStrong: '#4B5A62', placeholder: '#AAB8B3', subtle: '#BAC5C1', error: '#FF9F8E',
  selected: '#22292D', characterFill: '#29343B', characterLine: '#42525C',
} as const;

/** Real steps in each multistep flow, for the progress track.
 *  Coach: create or join, team details, invitation code. Athlete: team code, then three profile pages. */
export const ONBOARDING_STEPS = { coach: 3, athlete: 4 } as const;
