# Refinement runtime QA ledger

Only checks actually opened and inspected are marked executed. All browser work uses one Chrome session against Metro and local Firebase emulators. Native checks use Device Hub. No production readings, real emergency calls, photo uploads or unexpected OS permissions are used.

## Executed checks

| Role / route or state | Action and result | Viewport / surface |
| --- | --- | --- |
| Athlete / Profile overview | Opened current Maya Chen profile; real seeded team and practice summary visible. 90d and Recent tabs opened; values remained readable. | Chrome 375×667 |
| Athlete / Profile name | Opened edit dialog; empty name disabled Save; Cancel closed; existing name Save returned to Profile and reopening retained Maya Chen. | Chrome 375×667 |
| Athlete / Profile picture menu | Opened Choose from library / Take photo / Cancel menu; Cancel returned. Native library/camera acquisition not exercised. | Chrome 375×667 |
| Athlete / Profile settings | Opened Settings; Zone changes, Lock Screen clock and Sample athletes toggled both ways and restored to initial true/true/false. Checked actual input.checked values. | Chrome 375×667 |
| Athlete / temperature | Selected °C; Overview peak changed from88°F to31°C. Returned to Settings and restored °F. | Chrome 375×667 |
| Athlete / Data permissions | Opened current privacy disclosure; private health/contact scope visible; Done closed. | Chrome 375×667 |
| Athlete / Safety and limitations | Opened medical limitation/EAP disclosure; readable text and Done inspected. | Chrome 375×667, screenshot captured |
| Athlete / test alert | Opened accurate web feedback: heat alerts require iPhone app; Done closed. No OS permission granted. | Chrome 375×667 |
| Athlete / Profile dialog responsive | Name dialog inspected at390×844 and430×932; no horizontal page overflow; controls remained visible. Desktop resize initially closed dialog. Fixed PhoneFrame/FramedModalContent to retain one component hierarchy; reran phone→desktop resizing and dialog/name stayed open. | Chrome390×844,430×932,desktop; screenshots captured |
| Coach / Home duplicate label | Removed only top-right zone header label; native AX confirms Field conditions header followed by existing ring/button; inner zone label retained. | Device Hub native, before broad typography refinement |

## Source-only checks and pending runtime work

See [route map](route-map.md), [Coach inventory](../refinement-coach-inventory.md), [Athlete inventory](../refinement-athlete-inventory.md), [Profile/setup inventory](../refinement-profile-setup-inventory.md). Unchecked rows there remain pending until execution is added here. Earlier session checks are historical evidence, not a substitute for this refinement's final QA.

OS photo acquisition, native share completion, notification allow/deny, real wristband hardware, screen-reader traversal, physical-device performance and production account transitions remain separate verification obligations. Source/helper checks do not certify them.
