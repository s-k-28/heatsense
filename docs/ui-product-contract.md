# HeatSense UI product contract

This document keeps interface work tied to the HeatSense product instead of drifting into generic fitness-app UI.

## Product hierarchy

1. **WBGT compliance is the primary product.** It must remain useful without a wristband.
2. **The wristband is optional context.** It adds heart-rate recovery, skin-temperature trend, sweat response, movement, and collapse detection.
3. **A human makes the decision.** HeatSense communicates risk and required actions; it does not diagnose heat illness.

## Visual system

- **Signed-in screens follow [the design system](design-system.md)**, starting with Coach Home (October 2026). Where the older notes below conflict with it for a redesigned screen (blue section markers, glow on progress bars, the locked orange hero), the design system wins.
- Welcome, sign-in, and role selection use the Fieldline entry system: field charcoal `#101416`, warm white `#F6F3EC`, peach `#FFB183` for the primary action, and pale blue `#A8D9E8` for selection. Barlow Condensed headings and Inter body text connect the entry flow to the athletic workspace. Tokens live in `src/constants/entry-theme.ts`; shared layouts and controls live in `src/components/entry-ui.tsx`. See [implementation and screenshots](entry-ui-review.md).
- Coach workspace (September 16 rebuild): graphite canvas (`#0C0E11`), raised charcoal (`#171A1F`), pure-white primary text, bright warm-gray secondary text, and cool blue (`#8BB8FF`) for controls. Bold Barlow Condensed is used for headings and numerals outside the locked hero; Inter semibold/bold is used for body text and controls. Tokens live in `src/constants/coach-theme.ts`.
- Other setup, trainer, and athlete screens continue to use their existing shared theme. Extending the Fieldline entry system to those screens is a separate design pass.
- Color carries meaning: green is normal, amber is caution, orange is warning, and coral/red is emergency.
- The approved orange WBGT hero is locked: original gradient, Atkinson Hyperlegible Next type, black 84°F reading, sun badge, guidance, and squiggle chart. Home and Plan reuse the original `RiskHero` component without restyling it.
- The dark recheck card sits below the locked hero, so typography and countdown improvements never change the approved card. Shared athlete/alert/session detail screens use the dark workspace treatment.
- Use native symbols with consistent optical size. Do not place unrelated emoji, glossy 3D icons, or mismatched illustration styles in the interface.
- Cards exist to group real controls or related information. Do not add a card only to fill space.
- Negative space must reveal hierarchy. If a region feels empty, first remove forced expansion or add missing product information; never add decorative metrics.

## Motion system

- Motion explains a change: a runner settles onto a signal, a chart redraws after selection, or a native symbol confirms a tap.
- Prefer short ease-out transitions and damped springs. Avoid looping bounce, glow, parallax, or scale effects without a product state change.
- Respect reduced-motion settings.
- A selected signal must remain understandable after the animation ends through a persistent border or state marker.
- Countdown and roster bars use the same `WorkspaceProgress` component: 12-point rounded tracks, white rounded fills, a soft glow, and reduced-motion-aware Reanimated updates. Roster proportions are identified by explicit Normal/Caution/Review labels and counts, not fill color.
- Section titles share `WorkspaceSectionTitle`: bold white display type and one blue vertical marker. Non-hero text is at least 13 points with semibold body weight and bright metadata.
- The sample 30-minute recheck uses absolute timestamps, clamps at zero, and shows an overdue state. It does not silently restart or mark a new reading as taken. Review-avatar pulses and all transitions respect reduced motion.

## Data and claims

- Label mock values as examples, samples, demos, or illustrative conditions.
- Use each athlete's own baseline for physiological trends.
- Never present skin temperature as core temperature.
- Never imply that the wristband replaces WBGT monitoring or diagnoses heat stroke.
- Numeric thresholds remain placeholders until they are tested and reviewed by qualified school athletics personnel.
- UIL actions and timing must be checked against the current official plan before release.

## Screen review checklist

Before a screen is accepted:

- Can every component be traced to the PRD or a required navigation/accessibility behavior?
- Is WBGT still visibly primary and the wristband visibly optional?
- Are sample data and demo teams unmistakably labeled?
- Does every animation communicate state, priority, or causality?
- Are icons from one coherent system and are touch targets at least 44 points?
- Is copy specific enough that it could not be pasted into an unrelated health app?
- Are warnings actionable without pretending to be a medical diagnosis?
- Does the screen still work with larger text and reduced motion?

## Current onboarding map

| Step | Product purpose | Required content |
| --- | --- | --- |
| 1 | Establish the hierarchy | WBGT is primary; athlete context is additive |
| 2 | Explain field risk | Current WBGT, school-specific zone, check timing, recent trend |
| 3 | Explain the practice plan | Work, rest, water, and equipment adjustments |
| 4 | Explain optional hardware | Four physiological features and the athlete's personal baseline |
| 5 | Explain movement context | Why the same heart rate means something different during exertion and rest |
| 6 | Explain alerts | Normal, Caution, Warning, Emergency, and the collapse override |
| 7 | Establish the user context | School/team example, hydration and emergency readiness, role selection |
| Completion | Begin real setup | School and team required; wristband pairing optional |

## Role workspaces

All roles use five-item floating navigation. Labels and information priority change because the work changes. Coach-specific dark tokens are separate from the existing warm theme.

The coach rebuild preserves five-item navigation and content priority, with a dark floating dock and animated blue active marker. Its Plan, Team, Alerts, and Profile screens use the same dark tokens. The trainer and athlete workspaces retain their existing presentation.

For coach preview and verification:

```bash
npm run web
node --test scripts/check-coach-countdown.mjs
```

Open `/dashboard?role=coach`. The existing 84°F / Orange sample classification and 20/10-minute practice adjustments are unchanged. All current values are explicitly sample data; no live weather, wearable, or school policy service is connected. `npm install` and `npm run web` copy the installed Skia CanvasKit file into `public/` automatically.

| Role | Five tabs | Home-screen priority |
| --- | --- | --- |
| Coach | Home, Plan, Team, Alerts, Profile | Current WBGT, required practice adjustments, roster exceptions |
| Athletic trainer | Home, Monitor, Athletes, Protocols, Profile | Triage, personal-baseline signal context, response protocol |
| Athlete | Home, My Status, Sessions, Learn, Profile | Personal heat context, scheduled breaks, recovery trend, education |

The first 70% mockup includes 15 role screens: five per role. Every screen uses explicitly labeled demo data until live weather, team, and optional wearable integrations are connected.

## Reference set

- [UIL Heat Stress and Athletic Participation](https://www.uiltexas.org/health/info/heat-stress-and-athletic-participation)
- [Apple Human Interface Guidelines: Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- [Apple UI Design Dos and Don'ts](https://developer.apple.com/design/tips/)
- [Approved Pinterest health-dashboard reference](https://www.pinterest.com/pin/49750770879847106/)
- [Approved Pinterest wearable-dashboard reference](https://www.pinterest.com/pin/4362930884633155/)
- [Approved Pinterest risk-color reference](https://www.pinterest.com/pin/169659110952554883/)
- [Anti AI Slop UI checklist](https://github.com/rwcod/anti-ai-slop-ui/blob/main/SKILL.md)
