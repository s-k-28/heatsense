# HeatSense UI product contract

This document keeps interface work tied to the HeatSense product instead of drifting into generic fitness-app UI.

## Product hierarchy

1. **WBGT compliance is the primary product.** It must remain useful without a wristband.
2. **The wristband is optional context.** It adds heart-rate recovery, skin-temperature trend, sweat response, movement, and collapse detection.
3. **A human makes the decision.** HeatSense communicates risk and required actions; it does not diagnose heat illness.

## Visual system

- Warm cream canvas, warm-white surfaces, coral primary accent, near-black text.
- Color carries meaning: green is normal, amber is caution, orange is warning, and coral/red is emergency.
- DM Sans is the product typeface. Use a restrained weight hierarchy instead of many display styles.
- Use native symbols with consistent optical size. Do not place unrelated emoji, glossy 3D icons, or mismatched illustration styles in the interface.
- Cards exist to group real controls or related information. Do not add a card only to fill space.
- Negative space must reveal hierarchy. If a region feels empty, first remove forced expansion or add missing product information; never add decorative metrics.

## Motion system

- Motion explains a change: a runner settles onto a signal, a chart redraws after selection, or a native symbol confirms a tap.
- Prefer short ease-out transitions and damped springs. Avoid looping bounce, glow, parallax, or scale effects without a product state change.
- Respect reduced-motion settings.
- A selected signal must remain understandable after the animation ends through a persistent border or state marker.

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
| 2 | Explain compliance workflow | Pre-practice reading, 30-minute checks, zone-change actions |
| 3 | Explain optional hardware | Four physiological features, personal baseline, four risk tiers, collapse override |
| 4 | Establish the user context | School/team example, hydration and emergency readiness, role selection |
| Completion | Begin real setup | School and team required; wristband pairing optional |

## Reference set

- [UIL Heat Stress and Athletic Participation](https://www.uiltexas.org/health/info/heat-stress-and-athletic-participation)
- [Apple Human Interface Guidelines: Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- [Apple UI Design Dos and Don'ts](https://developer.apple.com/design/tips/)
- [Approved Pinterest health-dashboard reference](https://www.pinterest.com/pin/49750770879847106/)
- [Approved Pinterest wearable-dashboard reference](https://www.pinterest.com/pin/4362930884633155/)
- [Approved Pinterest risk-color reference](https://www.pinterest.com/pin/169659110952554883/)
- [Anti AI Slop UI checklist](https://github.com/rwcod/anti-ai-slop-ui/blob/main/SKILL.md)

