# HeatSense character direction

## Decision

Explore **Fieldline** as the lead character. It turns HeatSense's existing H and curved signal mark into a grounded field companion. Its peach fold suggests protective shade; the blue crossbar suggests a cooler path through heat. This is a visual metaphor for planning safer practices, not a measurement or medical claim.

Concept art: [character sheet](../concepts/heatsense-fieldline-v1.png) and [onboarding placement](../concepts/heatsense-fieldline-onboarding-v1.png). These are exploratory raster images, not production masters. [Scout](../concepts/heatsense-scout-v2.png) is the more anthropomorphic fallback.

## First implementation

The welcome, sign-in, and role screens now use an original vector implementation in `src/components/fieldline-character.tsx`, with a brief lean after role selection and a static pose under Reduce Motion. The concept PNGs remain references; the app does not render those raster sheets. The entry UI is documented with actual Chrome screenshots in [entry-ui-review.md](../../archive/entry-ui-review.md). This is the first in-app iteration; feedback from coaches and athletes and a broader character rollout remain future work.

## Why the current character misses

The current glossy orange sphere has a familiar face, but no silhouette or behavior that says field, WBGT, guidance, or protection. It also sits beside a separate 2D flame character in the coach UI. The two styles dilute recognition. The app's [UI product contract](../system/ui-product-contract.md) calls for a coherent illustration system and restrained, meaningful motion.

## Research translated into design rules

- Duolingo's [character construction guide](https://design.duolingo.com/illustration/characters) emphasizes simple repeatable shapes and a silhouette that can support many poses. Its [Duo guide](https://design.duolingo.com/illustration/duo) shows why a distinct feature must remain consistent through changes of view. We should use the lesson, not its owl shape or humor.
- Headspace's [illustration guide](https://live.standards.site/headspace/illustration) treats faces, shapes, and sprites as one system. Their recognizable orange face is also a reason to avoid another orange round character.
- The National Weather Service [explains WBGT](https://www.weather.gov/news/211009-WBGT) as a planning tool for athletes in direct sun, with shade and work/rest adjustments among protective actions. The character should point toward those actions rather than personify heat itself.
- [Apple's motion guidance](https://developer.apple.com/design/human-interface-guidelines/motion) favors short feedback with a purpose and support for reduced motion. [W3C guidance](https://www.w3.org/WAI/tips/designing/) says status cannot rely on color alone. A character expression must never replace a risk label or action.

## Character grammar

| Element | Rule |
| --- | --- |
| Silhouette | Asymmetric H-shaped field marker, one taller pillar and one planted pillar, joined by a curved band. Recognizable in solid black at 24 px. |
| Signature | One peach fold with a short diagonal notch; one pale-blue crossbar. Keep both in every full-color pose. |
| Face | Two small eyes and one restrained brow on the taller pillar. No nose, huge smile, cheeks, ears, fingers, or shoes. |
| Colors | Graphite `#171B20`, peach `#FFAA75`, cool blue `#A8D9E8`, warm off-white `#F6F3EC`. Safety severity colors remain reserved for risk UI. |
| Tone | Calm, alert, supportive, a little athletic. Never goofy during caution or warning. |
| Motion | One short lean or glance after a user action. No perpetual bounce or wave. Static pose under Reduce Motion. |

## Where it belongs

- **Role selection:** a single large pose above the choice controls, as in the concept mockup.
- **Education and empty states:** small poses that direct attention to a specific action, such as moving to shade, checking WBGT, or preparing water.
- **Warnings and emergencies:** put the instruction, severity label, and response action first. Do not show a smiling character on an urgent alert.
- **App icon:** keep the existing H mark for now. Test a one-color Fieldline silhouette at 24, 48, and 128 px before considering an icon change.

## Production path

1. Redraw Fieldline as an original SVG master with consistent geometry. The AI concept art is reference material only; do not cut it into production sprites.
2. Make front, three-quarter, and side poses, plus calm, guide, and attentive expressions. Build a one-color version and a simple layer rig for native animation.
3. Replace both the 3D orange sphere and the 2D flame with this one character system after the vector master passes small-size and accessibility checks.
4. Show the two concepts to coaches and teen athletes. Ask what each seems to represent, whether it feels trustworthy in a heat warning, and which silhouette they remember after five seconds. Refine the form from their feedback before adopting it as the brand character.
5. Check the final character name and artwork for conflicts before public brand use. “Fieldline” and “Scout” are working names.

## Design judgment

Fieldline is the stronger direction for HeatSense: it is made from the product's H-shaped visual language and can stay composed when the interface discusses risk. Scout is more expressive but risks reading as a generic figure in a sun visor. Neither concept image should be treated as a finished logo or UI asset.
