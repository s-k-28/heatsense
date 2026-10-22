import { Entry } from '@/constants/entry-theme';

// HeatSense app design system (docs/design/design-system.md). Built on the Fieldline entry palette so the
// signed-in app reads as the same product as onboarding. Coach Home uses it first; other screens
// adopt it one at a time. Onboarding keeps importing `Entry` directly, so nothing here changes it.

/** Color roles. Pick by role, not by hue: if no role fits, the color probably isn't needed. */
export const Color = {
  canvas: Entry.canvas,
  /** The one raised surface. Separate regions with this or with space, not with borders. */
  surface: Entry.surface,
  /** Secondary controls sitting on the canvas or on `surface`. */
  control: Entry.raised,
  ink: Entry.ink,
  inkMuted: Entry.muted,
  inkSubtle: Entry.subtle,
  /** The single primary action on a screen, and selected navigation. */
  accent: Entry.peach,
  onAccent: Entry.canvas,
  /** Supporting detail: data visualization, illustration, keyboard focus. */
  support: Entry.blue,
  focus: Entry.blue,
  error: Entry.error,
  /** Outlined controls (secondary choices, toggles off). Never a decorative border. */
  outline: Entry.lineStrong,
  /** Press and hover wash on dark surfaces. */
  wash: 'rgba(255,255,255,0.05)',
} as const;

/** Two families, three faces. Barlow is for a few large moments only; Inter does everything else. */
export const Font = {
  display: Entry.display, // Barlow Condensed SemiBold
  body: Entry.body, // Inter Regular
  strong: Entry.strong, // Inter SemiBold
} as const;

export const Type = {
  /** Hero headline. One per screen. */
  hero: { fontWeight: '700', fontSize: 52, lineHeight: 50, letterSpacing: 0.2 },
  heroCompact: { fontWeight: '700', fontSize: 44, lineHeight: 43, letterSpacing: 0.2 },
  /** Section headings. */
  section: { fontWeight: '700', fontSize: 26, lineHeight: 30, letterSpacing: 0.3 },
  /** Page title on tabs without a photo hero (Team, Alerts, Profile). */
  page: { fontWeight: '700', fontSize: 38, lineHeight: 40, letterSpacing: 0.3 },
  /** Large values: a reading, a team code, a work/rest interval. */
  data: { fontWeight: '700', fontSize: 38, lineHeight: 40, letterSpacing: 0.3 },
  /** Greeting and other one-line titles in body type. */
  title: { fontWeight: '600', fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  body: { fontWeight: '400', fontSize: 16, lineHeight: 23, letterSpacing: -0.15 },
  bodyStrong: { fontWeight: '600', fontSize: 16, lineHeight: 22, letterSpacing: -0.2 },
  support: { fontWeight: '400', fontSize: 14, lineHeight: 20, letterSpacing: -0.1 },
  meta: { fontWeight: '400', fontSize: 13, lineHeight: 18 },
  button: { fontWeight: '600', fontSize: 16, lineHeight: 20, letterSpacing: -0.2 },
} as const;

export const Space = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32, section: 44 } as const;

/** Radius follows size: the bigger the region, the softer the corner. Pills are for buttons only. */
export const Radius = { hero: 32, surface: 22, control: 14, pill: 999 } as const;

/** Durations in ms. Microinteractions stay at 120–240; only a hero image reveal runs longer. */
export const Motion = { press: 120, release: 180, state: 220, reveal: 500 } as const;

/** Smallest touch target on any platform. */
export const TOUCH = 44;
