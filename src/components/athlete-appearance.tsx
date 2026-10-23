import { createContext, useContext, type ReactNode } from 'react';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';

import { Face, Palette } from '@/constants/theme';

const AthleteAppearance = createContext(false);

/** An explicit subtree boundary: staff screens keep their original styles. */
export function AthleteAppearanceProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  return <AthleteAppearance.Provider value={enabled}>{children}</AthleteAppearance.Provider>;
}

export const useAthleteAppearance = () => useContext(AthleteAppearance);

const athletePalette = { ...Palette, surface: '#000000', surfaceMuted: '#000000', card: '#000000', inkMuted: '#FFFFFF', inkFaint: '#FFFFFF' };
export function useAthletePalette() {
  return useAthleteAppearance() ? athletePalette : Palette;
}

type Style = ViewStyle & TextStyle & ImageStyle;
type Styles = Record<string, Style>;
const cache = new WeakMap<object, Styles>();

/** Only neutral card and text tokens change. Safety colors and selection cues retain their meaning. */
export function athleteStyle(style: Style): Style {
  const next = { ...style };
  if (style.backgroundColor === Palette.surface || style.backgroundColor === Palette.surfaceMuted) next.backgroundColor = '#000000';
  if (style.color === Palette.inkMuted || style.color === Palette.inkFaint) next.color = '#FFFFFF';
  if (style.fontFamily === Face.figure) {
    next.fontFamily = 'BarlowCondensed_600SemiBold';
  } else if (!style.fontFamily && (style.fontSize !== undefined || style.fontWeight !== undefined)) {
    // Screenshot references establish hierarchy, not a distributable WHOOP font license.
    // Use our already-bundled Inter family: calm medium headings, regular supporting copy.
    const weight = Number(style.fontWeight ?? 400);
    next.fontFamily = weight >= 500 ? 'Inter_500Medium' : 'Inter_400Regular';
    next.fontWeight = 'normal';
  }
  return next;
}

export function useAthleteStyles<T extends Styles>(base: T): T {
  const enabled = useAthleteAppearance();
  if (!enabled) return base;
  let result = cache.get(base);
  if (!result) {
    result = Object.fromEntries(Object.entries(base).map(([key, style]) => [key, athleteStyle(style)]));
    cache.set(base, result);
  }
  return result as T;
}
