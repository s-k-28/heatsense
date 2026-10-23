# Athlete band views — October 23, 2026

## Scope and references

The athlete appearance boundary makes neutral cards black, supporting text white and most prose headings Inter Medium. The athlete Band page title is explicitly Inter Bold at the user's request. Coach/trainer base styles retain their own appearance. WHOOP screenshot archives contain no font files; no proprietary WHOOP font is claimed or distributed.

Reference images inspected: WHOOP `device-battery/001`, `pairing-a-device/004`, and `pairing-mode-information/001` in the local reference bundle. They use a whole-device view for context and specific camera angles/crops for device tasks. HeatSense uses its own band artwork and does not copy WHOOP hardware or instructions.

## Generated assets

Built-in image generation, with the existing `assets/images/wristband-hero.webp` as the product reference and transparent output enabled. Original source render retained. Outputs copied into the project:

- `assets/images/band-views/side.png`: opposite three-quarter angle of the entire band.
- `assets/images/band-views/module.png`: near-front close-up of the module and flame badge.
- `assets/images/band-views/strap.png`: strap holes, material and keeper close-up.

All three were visually inspected. They are illustrative product views derived from one reference, not manufacturing/CAD evidence or proof of physical sensors. The app keeps simulated reading provenance visible.

Prompt set: each asked for one isolated rendering of the exact reference band, retaining black matte silicone, graphite housing and peach flame emblem; no displays, text, invented buttons, lights or new branding. Side requested the opposite camera angle at roughly60°, full closed oval and margin. Module requested a nearly front-on close-up with short strap lengths. Strap requested the keeper/oval holes and a small portion of the module. All requested realistic neutral studio rim light, a square composition and genuine transparency.

## Placement and motion

- Home: original band, compact link to Band.
- Header: small side view as the athlete's persistent Band shortcut.
- Band: original overview + three generated views, previous/next controls, zoom toggle and a user-triggered two-second heart-rate exploration.
- Profile: side view; staff retain the previous image.
- Learn: module close-up linked to Band.

The band does **not** travel between navigation tabs. Dashboard artwork is independent of the onboarding journey; the global journey layer is disabled on the dashboard. This supersedes the earlier cross-tab travel experiment. The short exploration zooms artwork locally, pulses an app control, selects Heart rate and scrolls its actual chart into view. It does not pretend that the front logo is a physical heart-rate button.

Rossark motion rules: fixed layout, small camera crossfade/translation, no fake3D spin, interrupted transitions continue, no autoplay, reduced motion goes straight to the result, preview callbacks are canceled on unmount and paused while backgrounded. Quiet Home artwork additionally checks viewport visibility at750ms intervals; it is not a per-frame visibility observer.

## Verification

- Native Device Hub: athlete black surfaces/white text, bold Band title, Home/Sessions/saved-record navigation and rendered band viewer observed.
- Repeated Home→Band→Home→Band transitions recorded and a contact sheet reviewed; no cross-tab flying band.
- Viewer source lifecycle assertions cover2-second phase timing, background pause/resume, unmount cancellation and immediate reduced-motion result.
- Runtime camera/zoom/preview and post-merge staff regression checks continue in this session; this document does not claim every app state or physical device has passed.
