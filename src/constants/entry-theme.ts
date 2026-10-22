// Entry brand colors are separate from safety risk levels.
export const Entry = {
  canvas: '#101416', surface: '#1A2024', raised: '#242D32', line: '#354147',
  ink: '#F6F3EC', muted: '#B0BAC0', peach: '#FFB183', blue: '#A8D9E8',
  display: 'BarlowCondensed_600SemiBold', body: 'Inter_400Regular',
  medium: 'Inter_500Medium', strong: 'Inter_600SemiBold',
  // Onboarding headings: the refined welcome type, not the condensed display face.
  heading: 'Inter_600SemiBold',
  // Thin dark edge on the peach button, and the faint (opaque) peach tint behind a selected choice.
  peachEdge: '#2B1A10', peachTint: '#241E1B',
  // Onboarding forms (setup, team, athlete profile) built on the same palette.
  lineStrong: '#4B5A62', placeholder: '#7D898F', subtle: '#8A959B', error: '#FF9F8E',
  selected: '#22292D', characterFill: '#29343B', characterLine: '#42525C',
} as const;

/** Real steps in each multistep flow, for the progress track.
 *  Coach: create or join, team details, invitation code. Athlete: team code, then three profile pages. */
export const ONBOARDING_STEPS = { coach: 3, athlete: 4 } as const;
