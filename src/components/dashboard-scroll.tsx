import { createContext, useContext } from 'react';
import type { View } from 'react-native';

/** Bring a user-requested detail below the fixed dashboard header. */
export const DashboardScrollContext = createContext<(target: View | null) => void>(() => {});
export const useDashboardScroll = () => useContext(DashboardScrollContext);
