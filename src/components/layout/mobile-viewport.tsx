import { createContext, useContext, type ReactNode } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

export const SCREEN_BACKGROUND = '#090B0C';
const DESKTOP_BACKGROUND = '#0A0D0E';
// Wider than any phone: show the app as a centered phone instead of stretching it across the window.
const DESKTOP_BREAKPOINT = 600;
const FRAME_WIDTH = 410;
const FRAME_MAX_HEIGHT = 880;

type Frame = { framed: boolean; width: number; height: number };
const FrameContext = createContext<Frame | null>(null);

function frameFor(width: number, height: number): Frame {
  if (Platform.OS !== 'web' || width < DESKTOP_BREAKPOINT) return { framed: false, width, height };
  // Keep the phone width readable when a desktop browser window is short.
  return { framed: true, width: Math.min(FRAME_WIDTH, width - 48), height: Math.max(320, Math.min(FRAME_MAX_HEIGHT, height - 48)) };
}

/**
 * Wraps the whole app once, at the root. On a desktop browser every screen renders inside one
 * phone-sized frame in the middle of the window; on phones and native it fills the screen.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  const frame = frameFor(width, height);
  return (
    <FrameContext.Provider value={frame}>
      <View style={frame.framed ? styles.desktop : styles.fill}>
        <View style={frame.framed ? [styles.frame, { width: frame.width, height: frame.height }] : styles.fill}>{children}</View>
      </View>
    </FrameContext.Provider>
  );
}

/**
 * The size screens should lay out against: the phone frame on desktop web, the window elsewhere.
 * Use this instead of useWindowDimensions so a screen behaves the same in the frame as on a phone.
 */
export function useViewportSize() {
  const window = useWindowDimensions();
  const frame = useContext(FrameContext);
  return frame ?? frameFor(window.width, window.height);
}

/**
 * Modals render outside the frame on web. This keeps their content inside the frame's bounds,
 * centered where the frame is, so a sheet still opens from the bottom of the "phone".
 */
export function FramedModalContent({ backdrop, children }: { backdrop?: boolean; children: ReactNode }) {
  const frame = useViewportSize();
  return (
    <View pointerEvents="box-none" style={[frame.framed ? styles.modalCenter : styles.fill, backdrop && styles.modalBackdrop]}>
      <View style={frame.framed ? [styles.modalFrame, { width: frame.width, height: frame.height }] : styles.fill}>{children}</View>
    </View>
  );
}

/** Kept for screens that still wrap themselves; the root PhoneFrame already does the framing. */
export function MobileViewport({ children }: { children: ReactNode }) {
  return <View style={[styles.fill, styles.screen]}>{children}</View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  screen: { backgroundColor: SCREEN_BACKGROUND },
  desktop: { alignItems: 'center', backgroundColor: DESKTOP_BACKGROUND, flex: 1, justifyContent: 'center' },
  frame: { backgroundColor: SCREEN_BACKGROUND, borderRadius: 30, boxShadow: '0 24px 60px rgba(0,0,0,0.45)', overflow: 'hidden' },
  modalCenter: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  modalFrame: { borderRadius: 30, overflow: 'hidden' },
  modalBackdrop: { backgroundColor: 'rgba(5,7,8,0.72)' },
});
