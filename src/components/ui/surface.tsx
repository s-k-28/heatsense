import { StyleSheet, View, type ViewProps } from 'react-native';
import { Palette } from '@/constants/theme';

/** Quiet tonal lift. Content spacing belongs to the screen, elevation belongs here. */
export function Surface({ style, ...props }: ViewProps) {
  return <View {...props} style={[surfaceStyles.card, style]} />;
}
export const surfaceStyles = StyleSheet.create({
  card: { backgroundColor: Palette.surface, borderCurve: 'continuous', borderRadius: 28, shadowColor: '#000000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 1 },
});
