# HeatSense design system

How signed-in HeatSense screens should look and behave. Coach Home (`src/components/coach-home.tsx`) is the first screen built on it. Plan, Team, Alerts, Profile, and the athlete dashboard move over one at a time. Onboarding keeps its own Fieldline components (`entry-ui.tsx`) and is not affected.

Tokens live in `src/constants/design-system.ts`, and shared controls (`Tap`, `PrimaryButton`, `SecondaryButton`, `TextAction`, `Sheet`, `Glyph`) in `src/components/ds.tsx`. Import from there instead of writing hex values, font sizes, or new button styles in a screen. Coach Home and the coach Plan tab (`coach-plan.tsx`) use them.

## The idea

Each screen answers one question, and the layout makes that answer impossible to miss. Coach Home asks "Is the team ready for practice?" One photo hero holds the answer and the one primary action. Everything else is smaller, quieter, and further down.

Premium comes from hierarchy, type, real imagery, and restraint. It does not come from more cards, borders, gradients, badges, or motion.

## Hierarchy

1. **One focal point per screen.** On a phone it takes about half the first screenful.
2. **One primary action.** It is the only peach button on the screen, and its label comes from real state (see `readinessFor` in `src/lib/practice.ts`).
3. **Supporting information** is set in type on the canvas, or on one `surface` when it is a single tappable thing.
4. **Housekeeping** goes last.

Sections must not look interchangeable. If two sections share the same composition, ask whether one of them belongs on another tab.

## Color roles

| Role | Token | Use |
| --- | --- | --- |
| Canvas | `Color.canvas` `#101416` | Page background |
| Surface | `Color.surface` `#1A2024` | One raised region, such as a tappable plan summary or a sheet |
| Control | `Color.control` `#242D32` | Secondary buttons and icon buttons |
| Ink | `Color.ink` `#F6F3EC` | Headings, primary text |
| Muted | `Color.inkMuted` `#B0BAC0` | Supporting text |
| Subtle | `Color.inkSubtle` `#8A959B` | Metadata only |
| Accent | `Color.accent` `#FFB183` | The primary action, text actions, selected tab |
| Support | `Color.support` `#A8D9E8` | Keyboard focus, data visualization, confirmations |

Aim for roughly 70% neutral canvas and type, 20% surfaces and photography, and 10% accent. Heat-zone colors from `ZONES` are the only other hues allowed, and they always come with the zone's name written out.

## Type

Barlow Condensed SemiBold is for a few big moments. Inter Regular and Inter SemiBold handle everything else. Don't use other weights.

| Style | Font | Size / line | Use |
| --- | --- | --- | --- |
| `hero` | Barlow | 52 / 50 (44 under 380pt wide, 68 on desktop) | One headline per screen |
| `section` | Barlow | 24 / 28 | Section headings |
| `data` | Barlow | 38 / 40 | Large values: a reading, a code, an interval |
| `title` | Inter SemiBold | 20 / 26 | Greeting, sheet titles in body type |
| `body` / `bodyStrong` | Inter | 16 / 23 | Content, names, list titles |
| `support` | Inter | 14 / 20 | Descriptions under a title |
| `meta` | Inter | 13 / 18 | Timestamps, sources, "sample" notes |
| `button` | Inter SemiBold | 16 / 20 | Every button and text action |

Uppercase is for the hero headline only. Write copy that names a specific thing to do ("Check field conditions before practice.") rather than describing the product ("Everything you need in one place.").

## Geometry and space

- Radius grows with size: hero `32`, surface `22`, control `14`. Pills (`999`) are for buttons only.
- Spacing comes from `Space`. Separate sections with `Space.section` (44), not with lines.
- Touch targets are at least 44pt. Text actions carry padding to reach that size.

## Components

- **Primary button:** peach fill, Inter SemiBold, a trailing arrow, at least 54pt tall, fully rounded. No shadow, border, or gradient.
- **Secondary button:** `control` fill, ink text, at least 48pt tall.
- **Text action:** peach text plus an arrow, with no container. Use it for contextual next steps ("Open plan", "Review", "Manage").
- **Rows:** a title in `bodyStrong`, a detail in `support`, and the action on the right. The whole row is tappable. No avatar, icon box, or divider unless it carries information.
- **Surface:** use one only when the region is a single tappable object. Never put a surface inside a surface.
- **Sheet:** slides up from the bottom, `surface` fill, top corners `32`, a grip, and one "Done" button.
- **Navigation dock:** one solid `surface`, no outline, no sliding pill. The selected tab is peach, and its icon settles in over 180ms.

## Icons

Line icons with a 1.8–2px stroke, the same family as the onboarding (Lucide shapes or SF Symbols). Use an icon when it identifies an action (arrow, copy, share) or a tab. Don't add icons to informational text, and never put one inside a colored square.

## Photography

- Real, licensed photos of outdoor athletic settings, credited in `assets/images/home/CREDITS.md`. Never present a generated person as a real athlete.
- One photo per screen, on the focal point. Supporting sections don't get photo backgrounds.
- Grade warm and slightly desaturated. Export WebP at about 1400px wide.
- The only gradient allowed is a dark overlay that keeps text readable, and only where the text sits.

## Motion

| Pattern | Timing |
| --- | --- |
| Press | Scale to 0.97 in 120ms, back in 180ms |
| Hover (web) | 5% white wash |
| State change (tab, sheet, notice) | 180–280ms ease-out |
| Hero image reveal | 500ms fade |

Animate arrival of the focal point only: image, then headline, then action, all within about 300ms. Sections below it don't animate in. Nothing loops or pulses. Loading placeholders are static. Never animate a measurement in a way that suggests extra precision. Under reduced motion every animation is skipped.

## Data, empty states, and status

- Show only real data. Sample values appear only on request (`?sample=1`), and each one says "sample" in plain text.
- When data is missing, lead with the next step, not the backend error. The hero says "Check field conditions before practice.", not "No live reading". Put diagnostics in the view the action opens.
- An empty state is a sentence and, if there is one, an action. No illustration, checkmark, or success card. "No active alerts." is enough. Never say athletes are safe unless the system has verified it.
- Write status as words. A colored dot or capsule is allowed only when it maps to a defined state that is explained on the same screen.
- Heat guidance comes only from a configured heat policy (`src/lib/heat-policy.ts`). With no policy, screens list what's missing; they never fall back to default thresholds or intervals. Show the policy's name and source next to any guidance.
- A plan the coach approved is never replaced silently. When its inputs change, show the new version and ask for approval again.
- Show coaches only what they are allowed to see. Private health and safety answers from athlete onboarding never appear on coach screens.

## Accessibility

- Text over photos sits on the overlay, at contrast of at least 4.5:1.
- Focus rings appear for keyboard focus only (`isKeyboardFocus`): 2px `Color.focus`, offset 3px.
- Every control has an accessibility label. Values read naturally ("WBGT 84 degrees Fahrenheit, Orange zone.").
- Heat warnings never depend on color or animation alone.

## Anti-pattern checklist

Run this before calling any screen done. Each item was seen in generated UI, including an earlier version of Coach Home.

- [ ] Status dots that don't map to a defined, explained state
- [ ] Status messages put in pills or badges ("Not connected", "Pending", "Sample data")
- [ ] Emoji anywhere in the interface
- [ ] An icon inside a colored rounded square as decoration
- [ ] A card inside a card, or a bordered section around cards
- [ ] A colored vertical bar beside text
- [ ] Divider lines between ordinary content, or dashed lines filling empty space
- [ ] Gradients or glow other than a readability overlay on a photo; purple, neon, aurora, or radial blooms
- [ ] Outlines on things that aren't inputs, focus, or selection
- [ ] Glass or frosted surfaces
- [ ] Empty-state illustrations: giant checkmarks, clipboards, clouds, shields
- [ ] Fake numbers, charts, or athletes added to make a screen feel busy
- [ ] Sections that all slide in, floating elements, pulsing, bouncy cards, or large hover lifts
- [ ] Extra accent colors used only to tell cards apart
- [ ] Small uppercase labels on every section
- [ ] Buttons that duplicate the bottom navigation without context
- [ ] The same "icon + uppercase label + title + gray subtitle + bordered card + pill" block repeated
- [ ] Filler copy that describes the product instead of the next step
- [ ] More than one peach button on a screen

If a region feels empty after removing these, remove the space or add real product information. Never add decoration.
