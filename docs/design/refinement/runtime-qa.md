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

## Coach runtime expansion

- Local Coach sign-in succeeded and correctly replaced Maya Chen with Dana Rivera in Profile; no cross-account name carryover was observed.
- Home375×667 inspected: photo WBGT, condition ring and typography. Selected Block1: detail changed to16min /4:10PM. Selected Sunday: chart showed No reading. Home alert preview opened Practice sheet.
- Practice sheet: empty save showed Enter the WBGT number from your meter. °C changed the accessible input label. Entering0°C successfully saved32°F in the local emulator (a valid cold reading under the existing classifier); the conversion and live update were verified. Removed only this newly created test reading using emulator-admin cleanup to restore the original3-reading seed. Source and measured-time choices were exercised. No production write occurred.
- Plan → UIL details opened the current rules. New plan opened correct loading guidance, then real Yellow-zone check. All12 Increase/Decrease actions changed and restored Start, Check-in, Work block, Break, Practice length and Water every. All3 Equipment choices exposed selected state. Break3min failed the4min rule; Fix to meet UIL restored compliance. Saved a named temporary plan, edited it, saved a copy and verified persisted name after full reload. Use for today activated the temporary plan. Delete opened the new web confirmation; Cancel retained it. Final deletion of the two temporary audit plans is pending user confirmation under the computer-use permanent-deletion rule; original Standard is preserved.
- Team → Under14 filtered to Leo; All restored. Searching no-such-athlete showed No athletes in this view; clearing restored roster. Opened Leo detail and inspected Heart, Skin, Sweat, Movement and Oxygen analyses at375×667. Back returned Coach Team. Live and A–Z/Effort sort tabs opened with correct aria-selected. Dynamic recovery cue disappeared before check-in click, so check-in completion is NOT marked tested.
- Alerts → Resolved showed the prior zone-change record; Open returned current items. Open practice opened the actual Practice sheet; Done returned. Review navigated to Team requests. Resolve and approval/decline are not yet exercised on seeded users.
- Coach Profile opened; all5 switches toggled both ways and restored true/true/true/true/false. Staff-specific Data permissions disclosure correctly described roster access and private athlete health/contact answers.
- Sign-in: blank email, missing password, malformed email and missing create-account name produced readable feedback. Email/Google choice and account-form toggle opened. Forgot-password malformed email initially had misleading backend feedback; UI validation was corrected before service invocation. Retest pending. No real account or OAuth credential used.

## QA fixes actually reproduced

- Desktop/mobile frame switching no longer remounts an open Profile dialog.
- Web custom controls now expose checked/selected/expanded/busy aliases. Live sort and Equipment selected states verified from actual aria-selected values.
- Web plan steppers now expose named buttons (all12 exercised); native adjustable actions are retained.
- Web plan deletion now opens an inline confirmation; cancellation exercised, permanent confirmation awaits consent.
- Metric selector now reuses the shared sliding pill control; five analyses were opened before this final selector refinement, so its final-state retest is pending.

## Isolated onboarding and practice workflow

Fixture accounts `ui.coach.20261023@heatsense.test` and `ui.athlete.20261023@heatsense.test` were created only in local Auth emulator, with distinct UIDs. They are separate from the seeded Dana/Maya records.

- Coach Role selection: Athlete, Trainer and Coach radios each exposed checked state; final Coach continued. Coach setup Create/Join choices opened. Join as staff reached the real trainer-code route; I don’t have a code reached Ready; Back returned through the correct forms.
- Create Team: School, Team name, Sport, Level and UIL class menus opened; Football/Varsity/Class3 enabled Create. UI Audit Team created in local Firestore. Invitation loading disabled Continue. Copy changed to Copied. Regeneration warning Cancel retained code; Generate replaced it. Share invitation used browser clipboard fallback and showed Invitation copied. Continue → Ready → Finish reached Coach Home.
- New Coach Home: loading and settled empty states inspected. Empty roster hid irrelevant search/filters; Live correctly showed no practice. Home share initially gave no web feedback; corrected common helper and retested Home/Team/empty-roster Share actions, all showing actual Copied feedback.
- Practice start: blank venue disabled Start; Class2/Class3 and15/30/45/60 intervals changed selected state. Started UI Audit Field/Class3/30min, saved84°F → Yellow and acknowledged guidance; applied state/timestamp appeared. End returned to Start form; Profile showed1 saved practice.
- First-reading state: background Home incorrectly said Field checks current before any reading. Corrected only presentation flag; started second15min practice and verified actionable warning First reading due. Underlying alert count/timing/rings unchanged. Saved84°F in that second practice.
- Practice export: browser initially returned Couldn’t share, then common copy fallback added. Copied succeeded. Copied initially survived new readings; fixed exact-report snapshot matching and verified acknowledgement immediately restores Share practice record. Export content unchanged.
- Official UIL link opened the exact `https://www.uiltexas.org/files/athletics/25-26WBGTChart.png` source, then the extra source tab was closed.
- Native current screen captured from the booted simulator: new Archivo/Manrope sign-in/photo layout visually inspected. Device Hub window became unavailable to computer-use binding; native interaction/keyboard pass is pending reopening the iPhone window. Browser Metro pass continues. This snapshot is not a native dashboard interaction claim.

## Athlete onboarding runtime expansion

- Join: letters in `abc123` were removed; incomplete code disabled Join. `000000` returned Code not found. Current isolated-team code showed Checking code → Team found → Join request sent, then Continue opened basic profile. Membership remains pending staff approval.
- Basic profile: invalid date `13/44/2020` produced validation feedback; grade menu scrolled and selected 12th. Valid fictional date, jersey and name saved; Football remained read-only from the team.
- Body: height/weight inputs, history No/Yes and conditional type/Other fields opened. Two concern checkboxes selected together; None cleared them. Returning history to No cleared the conditional type. Somewhat accustomed selected and saved. Removed unsupported “update anytime” promise and redundant introductory copy.
- Safety at375×667: partial contact produced name, relationship and phone errors; short phone produced country-code guidance. Relationship menu selected Family member. Added secondary contact and verified all six controls have distinct primary/secondary accessible names. Removed the unsaved secondary draft. Valid fictional primary contact and optional local-only note saved; Finish setup opened demo pairing. Scrolled bottom/focused notes screenshot inspected: complete action, privacy copy and skip action visible without overlap.
- Forgot password malformed-email retest passed with “Enter a valid email address” before service call.
- Pairing so far: Get started → fit tips → Hide tips → Continue → pairing-light help → Start pairing. Search state opened; Back returned to pairing-light step and cancelled discovery. Remaining connection/completion steps are pending.
