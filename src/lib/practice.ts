// Today's field conditions. One source for the dashboard card and the Dynamic Island, so the two
// can't disagree. These are sample readings until the field sensor feeds real ones.
export type Zone = 'green' | 'yellow' | 'orange' | 'red' | 'black';

export const ZONES: Record<Zone, { label: string; color: string; text: string }> = {
  green: { label: 'Green zone', color: '#30D158', text: '#30D158' },
  yellow: { label: 'Yellow zone', color: '#FFD60A', text: '#FFD60A' },
  orange: { label: 'Orange zone', color: '#FF9F0A', text: '#FF9F0A' },
  red: { label: 'Red zone', color: '#FF453A', text: '#FF453A' },
  // The Black zone's own color disappears on a dark screen, so its text stays white.
  black: { label: 'Black zone', color: '#000000', text: '#FFFFFF' },
};

export const TODAY: { zone: Zone; wbgtF: number } = { zone: 'orange', wbgtF: 84 };

/** Sample practice session: 72 minutes long, water every 10 minutes. */
export const PRACTICE_MINUTES = 72;
export const WATER_BREAK_MINUTES = 10;

export function formatWbgt(fahrenheit: number, celsius: boolean) {
  return celsius ? `${Math.round(((fahrenheit - 32) * 5) / 9)}°C` : `${Math.round(fahrenheit)}°F`;
}
