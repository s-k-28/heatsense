import { createContext, useContext, type ReactNode } from 'react';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
import { Palette } from '@/constants/theme';

const AthleteAppearance = createContext(false);
export function AthleteAppearanceProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  return <AthleteAppearance.Provider value={enabled}>{children}</AthleteAppearance.Provider>;
}
export const useAthleteAppearance = () => useContext(AthleteAppearance);
/** Both roles now share one palette and typography system. Context only identifies the role. */
export const useAthletePalette = () => Palette;
type Style = ViewStyle & TextStyle & ImageStyle;
export const athleteStyle = (style: Style): Style => style;
export function useAthleteStyles<T extends Record<string, Style>>(base: T): T { return base; }
