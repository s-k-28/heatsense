# HeatSense entry UI

This pass implements the Fieldline direction in the welcome, Google sign-in, and role-selection screens. It replaces the unrelated wristband hero, field photo, and orange sphere with one original SVG character and a shared field-line scene. The approved WBGT dashboard hero is outside this pass.

## Design decisions

The entry flow should tell a coach or athlete what to do next. Welcome establishes field conditions and practice planning first, sign-in explains how the account connects to a team, and role selection describes the two views. The wristband is explicitly optional.

| Element | Implementation |
| --- | --- |
| Canvas / surface | Field charcoal `#101416` / raised charcoal `#1A2024` |
| Text | Warm white `#F6F3EC` and muted `#B0BAC0` |
| Controls | Peach `#FFB183` primary action; blue `#A8D9E8` selected role; warm-white Google button |
| Type | Barlow Condensed semibold headings; Inter body and controls, already bundled by the app |
| Layout | Brand header, one field illustration, left-aligned heading and explanation, clear action |
| Character | H silhouette, peach fold, blue crossbar, small eyes and a brow; hand-authored SVG paths |
| Feedback | Selected border and check mark remain visible; short role-selection lean respects reduced motion |
| Small screens | Scrollable content, wrapping descriptions, content-sized buttons, smaller illustration |

The original concept placed a very large character above large outlined options. In the implementation, the role character is smaller so the two options and continuation stay prominent. Controls use different treatments for selection and progression. Copy names actual tasks rather than generic health benefits.

## Shared implementation

- `src/constants/entry-theme.ts`: entry color and typography tokens.
- `src/components/entry-ui.tsx`: screen shell, brand header, back control, buttons, loading and focus states.
- `src/components/fieldline-character.tsx`: vector character and field scene.
- `src/components/mobile-viewport.tsx`: fixed readable desktop preview width, independent of window height.

Google authentication continues to use the existing native and web services. The sign-in button is busy and disabled during authentication and session restoration. The previously nonfunctional Terms and Privacy links have been removed from the sign-in copy; real policy destinations still need to be supplied before release.

## Verification

- TypeScript, Expo lint, authentication configuration preflight, and production web export passed.
- Reviewed the live app in Chrome at 390 × 844, 320 × 568, and a short 800 × 600 desktop viewport.
- Welcome opens sign-in; Back returns correctly.
- Coach and Athlete selections update the visible check mark, accessible checked state, and button label; Continue opens the matching setup route.
- At the smallest viewport, controls and wrapped descriptions remain reachable by scrolling.
- Google opens the real account chooser. The button displays a busy state and blocks duplicate clicks. Closing the chooser restores the button; the browser's background polling delayed recovery during automated testing, and the ready state was verified with the app foregrounded.
- This pass tested the chooser and cancellation, not a fresh completed Google login or native simulator build.

## Actual app screenshots

| Welcome | Sign-in | Role selection |
| --- | --- | --- |
| ![Welcome](screenshots/entry-ui/welcome-390.png) | ![Sign-in](screenshots/entry-ui/sign-in-390.png) | ![Role selection](screenshots/entry-ui/role-390.png) |

These are screenshots of the implemented React Native web app, not generated mockups. The remaining setup and dashboard screens retain their existing styles.
