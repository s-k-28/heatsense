# HeatSense component reference inventory

This inventory makes the reference workflow repeatable: inspect a real product pattern, state what HeatSense borrows, implement it with project tokens, and verify it in Simulator. A screen is not approved because it merely has polished cards.

| Component family | Reference direction | HeatSense-specific use | Current status |
| --- | --- | --- | --- |
| Onboarding progress and navigation | User-provided warm fitness onboarding; native iOS navigation behavior | Seven learning steps plus three role-specific setup routes | Needs a composition-variety pass; repeated headline/card/button skeleton remains on early slides |
| WBGT status hero | [Air pollution screens](https://www.pinterest.com/pin/169659110952554883/) | One dominant WBGT value, zone, and required practice adjustments | Implemented on onboarding and coach home |
| Practice plan | UIL plan hierarchy plus activity schedule/timeline references | Work/rest/water/equipment instructions and timed checkpoints | Implemented; needs final content verification against official UIL plan |
| Personal signals | User-provided wearable dashboard and [Fitness Training Load](https://www.pinterest.com/pin/839147343102897010/) | HR recovery, skin trend, sweat trend, and movement relative to personal baseline | Animated onboarding visual and trainer/athlete screens implemented |
| Team roster | [Sports roster search board](https://www.pinterest.com/search/pins/?q=sports%20team%20roster%20dashboard%20mobile%20ui) and [selected player profile](https://www.pinterest.com/pin/1124985181967899061/) | Status distribution, meaningful filters, and dense athlete rows | Implemented; detail route still pending |
| Alerts | [Emergency and SOS UI](https://www.pinterest.com/pin/739716307569600526/) | Acknowledgement, escalation, and clear next action | Implemented as overview; acknowledgement interaction pending |
| Response protocol | [Emergency protocol search board](https://www.pinterest.com/search/pins/?q=emergency%20medical%20protocol%20mobile%20app%20ui) and [Callert](https://www.pinterest.com/pin/221802350394347537/) | District EAP-first response with immediate/recovery modes | Implemented with native segmented control |
| Session analytics | [Apple Health analytics search board](https://www.pinterest.com/search/pins/?q=apple%20health%20activity%20analytics%20mobile%20ui) and [clean fitness app](https://www.pinterest.com/pin/576390452337943140/) | Recovery trend, time range, summary, and recent sessions | Implemented with native segmented control; chart interaction pending |
| Safety education | [Health education search board](https://www.pinterest.com/search/pins/?q=health%20education%20mobile%20app%20ui%20cards) and [Withings flow](https://www.pinterest.com/pin/2674081024819499/) | Urgent symptom action plus expandable practical guidance | Implemented with progressive disclosure |
| Profile and settings | [Profile search board](https://www.pinterest.com/search/pins/?q=health%20app%20profile%20settings%20ui%20mobile), [health profile](https://www.pinterest.com/pin/335870084732012938/), and [medical profile](https://www.pinterest.com/pin/26036504091923599/) | Identity, role, school/team, alert preferences, pairing, and data permissions | Redesigned; generic icon bubbles removed |
| Bottom navigation | User-provided five-tab navigation reference | Role-specific labels with one shared detached geometry | Implemented; test native glass only after reduced-transparency fallback |
| Role setup | Air-quality gradient hierarchy plus flat checklist patterns | Coach, trainer, and athlete receive genuinely different required tasks | Redesigned and visually verified |
| Empty, loading, offline, and error states | Native Apple Health/system patterns | Weather unavailable, no team members, no paired band, lost BLE, stale reading | Not yet designed; required before mockup reaches 70% completeness |

## Review questions

Before a component is accepted:

1. What user decision does it help make?
2. Is its information hierarchy different from neighboring screens for a real reason?
3. Is a card necessary, or would a flat row, timeline, or direct label be clearer?
4. Does every color have semantic or brand meaning?
5. Does motion explain a state change and stop when Reduce Motion is enabled?
6. Is sample data clearly labeled, and are medical limitations stated without legal-sounding filler?
7. Was the rendered screen checked on the target simulator size?
