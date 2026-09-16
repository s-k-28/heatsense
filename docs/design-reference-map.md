# HeatSense design reference map

HeatSense adapts interaction and information patterns from these references. It does not copy their branding, data, or screens. Every pattern below maps to a requirement in the product contract.

## Approved direction

| HeatSense area | Reference | Pattern carried forward | HeatSense adaptation |
| --- | --- | --- | --- |
| Athlete overview and signal details | [Smart Fitness Wearable Assistant](https://www.pinterest.com/pin/4362930884633155/) | Warm background, compact metric modules, one dominant visualization per detail screen | Personal WBGT context, HR recovery, skin trend, sweat trend, and exertion; wristband remains optional |
| WBGT status | [Air pollution screens](https://www.pinterest.com/pin/169659110952554883/) and [original Dribbble source](https://dribbble.com/shots/14795971-Air-pollution-screens) | Oversized risk number, semantic gradient, secondary values along the lower edge | WBGT number, UIL risk zone, work/rest interval, water interval, equipment guidance |
| Athlete trend interpretation | [Fitness Training Load](https://www.pinterest.com/pin/839147343102897010/) | One dominant trend, short status label, plain-language interpretation | Personal-baseline trend with movement context; never presented as a diagnosis |
| Coach and trainer monitoring | [Patient Health Dashboard](https://www.pinterest.com/pin/4595501298658286464/) | Triage-first overview, compact rows, comparison before detail | Roster prioritized by current risk and acknowledgement state, not decorative card grids |
| Alerts | [Emergency & SOS Call UI](https://www.pinterest.com/pin/739716307569600526/) | High-contrast action hierarchy and persistent acknowledgement | Warning and Emergency actions mapped to the PRD's OLED, haptic, BLE, and coach response behavior |
| Profile and settings | [Health Tracker App Profile](https://www.pinterest.com/pin/335870084732012938/) | Grouped identity, goals/history, and settings rows | School/team identity, role switching, alert preferences, privacy, device pairing, and data permissions |
| Bottom navigation | User-provided 11-style navigation reference | Detached five-item dock, outline icons, active capsule, generous touch areas | Warm cream surface with coral-to-peach active treatment; role-specific labels with identical geometry |
| Athlete home | User-provided orange activity dashboard reference | Asymmetric bento summary, one larger recent-activity module, compact weekly bars, detached dock | Today’s WBGT exposure, hydration/recovery, personal status, and recent practice sessions; no calories or generic fitness goals |

## Search vocabulary

Pinterest searches stay broad enough to find strong adjacent-product patterns:

- `weather risk mobile app ui`
- `sports team dashboard mobile app`
- `health analytics mobile app dashboard`
- `emergency alert mobile app ui`
- `coach team roster mobile app ui`
- `athlete activity tracking app ui`
- `health app profile settings ui`
- `patient monitoring dashboard list health risk ui`
- `bluetooth device pairing mobile app ui onboarding`

## Guardrails against generic generated UI

- One primary visual decision per screen; supporting data is quieter.
- No collection of equally weighted cards when a ranked list, timeline, or single chart communicates the task better.
- No all-caps section labels, em-dash disclaimers, ornamental gradients, or fabricated precision.
- Coral is brand/action. Green, amber, orange, and red are reserved for safety meaning.
- Atkinson Hyperlegible Next is used for fast recognition in bright outdoor conditions.
- Motion explains change or state. Ambient animation stops when Reduce Motion is enabled.
- Wristband data is always labeled optional, illustrative, and non-diagnostic.
