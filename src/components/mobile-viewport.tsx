import type { ReactNode } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

export const SCREEN_BACKGROUND = '#222222';
const DESKTOP_BACKGROUND = '#111111';
// Wider than any phone: show the screen as a centered mobile preview instead of stretching it.
const DESKTOP_BREAKPOINT = 600;

// Same frame the welcome and sign-in screens use, shared by the screens after them.
export function MobileViewport({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  const preview = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
  if (!preview) return <View style={styles.full}>{children}</View>;

  const frameHeight = Math.max(320, Math.min(880, height - 48));
  // Keep the phone width readable when a desktop browser window is short.
  const frameWidth = Math.min(410, width - 48);
  return (
    <View style={styles.desktop}>
      <View style={[styles.frame, { width: frameWidth, height: frameHeight }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: SCREEN_BACKGROUND },
  desktop: { flex: 1, backgroundColor: DESKTOP_BACKGROUND, alignItems: 'center', justifyContent: 'center' },
  frame: { backgroundColor: SCREEN_BACKGROUND, borderRadius: 30, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.45)' },
});
