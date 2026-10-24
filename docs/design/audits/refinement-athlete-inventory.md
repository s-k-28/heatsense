# Athlete refinement inventory — phase 1

Source snapshot: October 23, 2026. Read-only audit; only this document was created. No implementation, runtime screen traversal, native Share/call, keyboard test or Accessibility Inspector result is claimed. Root owns device/browser evidence and the shared design system. All runtime cases below remain pending until actually exercised.

## Scope and actual navigation

The athlete has five tabs: **Home, Band, Sessions, Learn, Profile**. Their displayed bar order is Band / Sessions / Home / Learn / Profile (`dashboard.tsx:55`). Home's page title is Today. No separate athlete Monitor, Team, Protocols, Coach Plan or Alerts feature is invented by this inventory.

`dashboard-content.tsx:92` renders `AthleteHome`, `AthleteBand`, `AthleteSessions`, `LearnTab` and `ProfileTab role="Athlete"`. Athlete dashboard is wrapped by `AthleteAppearanceProvider`; practice-record opts into that appearance through `role=athlete`. Header Account opens Profile; athlete has no Alerts bell callback. Header band control opens Band and is omitted while already on Band.

**Important current-source distinction:** Athlete Home now mounts `HomeOverview` in `coach-home.tsx`, whose hero is `FieldHero`. It does not mount the legacy athlete branch of `CoachToday`. The currently active composition includes the field-photo hero, three concentric condition rings, practice-guidance section, personal pulse and seven-day heat chart. Legacy `CoachToday` has other orb/dial/detail controls; these must not be mistaken for additional current athlete Home screens or blindly changed as if active there.

## Home: controls, data and nested guidance

Sources: `role-tabs.tsx:49`, `coach-home.tsx:56`, `field-hero.tsx:57`, `coach-tabs.tsx:289`, `body-strip.tsx`.

| Control or surface | Exact destination / behavior | Source-covered states |
| --- | --- | --- |
| Join your team card | `/setup/athlete` | No approved team; declined request; pending card is informational |
| Practice data unavailable / Try again | `useCoachDataState('athlete').retry` | Failed team subscription; HomeOverview receives null while loading |
| Hero View guidance | Opens local Practice guidance `Modal` | Disabled without data; enabled with current team data, including no active practice |
| Concentric Field conditions rings | Same local guidance modal | Loading, no field reading, heat-zone/guidance/recheck values |
| View practice guidance | Same local guidance modal | No shared athlete schedule; no editable staff plan granted |
| Practice guidance / Done | Closes modal; Android request-close also closes | Current summary + ZoneRules, or empty guidance message |
| UIL activity chart row in guidance | `Linking.openURL(UIL_SOURCE_URL)` | Uses existing UIL version; no local external-link failure feedback in ZoneRules |
| Retry history | Actual past-session retry | Seven-day history failure; separate loading text |
| Seven-day heat day bars | Changes local selected day / peak text | Seven generated date slots, empty/readings selection; no route from these bars |
| Read-only alert preview strip | Opens guidance modal | Loading, active practice, overdue/unapplied counts, no session |
| Your band image/link | Navigates to Band tab via `onOpenBand` | `BandSpot quiet travel={false}`; no band flight between dashboard tabs |
| Compact Simulated tag | Expands source explanation in place | Generated 10× example provenance |
| Pair your band | `/pair-band` | Shown when no personal/sample band is available |
| BodyStrip metrics | Read-only grouped signals | Heart rate, skin, sweat, oxygen; explicit simulated accessible summary |
| Athletic trainer rows | Read-only names | Omitted when returned list is empty; no athlete call/message action |

Protected: current field number/unit, measurement age, observed trend/headroom, UIL zone colors and thresholds, acknowledgment/recheck ring calculations, personal pulse provenance, and exact symptom safety copy. Ring/graph values are not decorative progress goals to replace or normalize during typography work.

## Band: viewer, signals and disclosures

Sources: `role-tabs.tsx:137`, `band-viewer.tsx`, `vitals.tsx`, `vital-cards.tsx`, `dashboard-scroll.tsx`.

| Control | Behavior and boundary |
| --- | --- |
| Previous band view / Next band view | Wrap four genuine asset sources: Overview → Side → Module → Strap; 48-point controls outside art |
| Zoom in / Zoom out | Local transform inside fixed 220-point art stage; 48-point toggle; no global journey |
| Explore heart rate | User-triggered two-second local preview, button feedback at ~1100 ms, selects heart signal and scrolls to chart at ~1600 ms, settles ~2000 ms |
| Simulated · 10× source control | Expands explanation that values are generated, not physical measurements |
| Heart rate / Skin temp / Sweat / Movement / Blood oxygen tabs | Changes one selected analysis inline; horizontal list; unsupported partial optional signals are omitted rather than fabricated |
| HeatSense Band row | `/pair-band`; label Connected or Pair from preference; not a device-settings route |

Band has no numeric text-entry form and no modal. It has a no-band fallback illustration with pairing row. Viewer has asset-error fallback to original overview, then explicit unavailable feedback if fallback also fails. Preview does not autoplay, does not press a drawn hardware control, pauses while app/route is inactive, cancels scheduled callbacks on unmount and gives an immediate result with reduced motion. These are source behaviors; runtime timing/scroll and background cases still require evidence.

Metric visuals to preserve: heart-rate line + average/max/min + estimated-zone bars; skin-temperature line and explicitly named simulation reference when applicable; GSR bucket bars; movement work/rest strip; oxygen range gauge; source tags, units and selected tab. Exact histories/calculations/signal colors are outside visual redesign scope. The personal tab uses simulated `DemoMember` histories; optional real-band absence behavior is implemented in the shared VitalCards.

## Sessions: calendar, list and saved record

Sources: `role-tabs.tsx:196`, `heat-calendar.tsx`, `practice-record.tsx`, `services/practice-record.ts`.

| Control | Exact behavior |
| --- | --- |
| Team Try again | Retry athlete team data |
| History Try again | Retry past practices subscription |
| Week / Month | Segmented calendar view; keeps picked date in displayed period |
| Seven week date buttons | Select day and show its peak/records; horizontal viewport keeps most recent days reachable |
| Previous month / Next month | Change month offset; Next disabled for current month; picked day follows new month |
| Month date cells | Select date; future dates disabled; selection border retained |
| Selected-day venue/time record link | `/practice-record?role=athlete&teamId=<team>&id=<practice>` plus `sample=1` for sample aggregates |
| Recent practice row | Same saved-record destination; shows date, venue, duration, count and peak unit/zone |
| Show N more practices | Adds up to ten rows; history retrieval remains limited to latest 40 finished practices |

Source states: team loading/error/no-team; history loading/error/empty/populated/capped; week/month; selected empty/recorded day; current/past month; future-disabled cell; today's reading overlay only when measurement date is today. No new calendar scheduling or editing action exists.

### `/practice-record`

Athlete styling is explicitly selected by route `role=athlete`. Back returns to previous route, or athlete Sessions if none. Header Share is disabled until the record and its readings are available; sample summary sharing explicitly excludes unavailable individual measurements. Native share cancellation is not presented as successful delivery; rejection shows an alert.

States inspected: incomplete/invalid path parts; auth pending; signed out + Sign in; practice loading/error + Try again; missing record; summary-only sample; readings loading/error + Try again; no readings; populated readings with entered units, sources and guidance-confirmation timestamps; Share busy/disabled. Backend reads retain UID/team/record/retry keys. Saved policy label and original recorded measurement units/source must remain intact.

## Learn: all choices and help states

Source: `learn-tab.tsx`, shared `SafetyStatus` and `ZonePicker` in `protocols-tab.tsx`.

- Ten symptom checkboxes: Confused or foggy; Fainted or about to; Throwing up; Dizzy; Headache; Nauseous; Very tired or weak; Cold, clammy skin; Muscle cramps; Very thirsty. Multiple selection retains existing severe > moderate > mild precedence. Clear selection resets the selected array. Advice is inline, not a new modal or diagnosis workflow.
- Eight numbered urine-color choices, lighter-to-darker order unchanged. Selection border and accessible selected state remain. Existing three result groups and fluid quantities are protected.
- Saved emergency help shows AED, Cooling tub, Hospital and Calls 911 if present. It is read-only. SafetyStatus exposes loading/error/unavailable and Try again. There is no invented call action, location or contact permission.
- Five UIL selections: Green, Yellow, Orange, Red, Black; visible labels + colored dots + selected border. Current field identity is included in accessibility labels. Class/ranges/rest/max/cooling values remain source-derived.
- Explore your band / Views and signals link navigates to Band tab, using module artwork. No global band travel is triggered.

No Learn text-entry or keyboard form. Its transient selections reset when its tab subtree unmounts. That is existing behavior and should be tested before changing persistence.

## Profile boundary and real settings

Source: `profile-tab.tsx`. Profile is a real fifth athlete tab, not omitted from full-flow testing. Its detailed redesign may be owned separately, but downstream athlete traversal must include:

- Profile picture native alert: Choose from library / Take photo / Remove photo when present / Cancel. Camera permission denial offers Settings; picker cancellation is silent; image failure alert is explicit. Photo copying is local and account-owned.
- Edit your name uses native iOS prompt; non-iOS currently explains the limitation. Local name is account-owned; asynchronous Firebase display-name update failure is swallowed.
- Overview / Settings segments. Overview has 30d / 90d / Recent record period, actual loading/error/empty/populated/capped states, practice count/time/peak values, band device row to `/pair-band`, team and trainer rows, Join a team when appropriate.
- Athlete Settings: Zone changes switch; Send a test alert (busy/error handling); °F/°C; Lock Screen practice clock; Sample athletes; UIL heat chart external link; Data permissions and Safety and limitations alerts; Log out confirmation/error paths. Staff-only recheck and slow-recovery notification switches are not athlete controls.
- Band device currently shows a **fixed simulated 78%** with Simulated serial text. This is not measured battery data and must not lose its source label or become an inferred real reading.
- Data permissions copy states that health answers and emergency contacts stay private to the athlete. Do not introduce staff visibility or copy those answers into Home, team rows or share reports.

## Pairing and health/setup route boundaries

### `/pair-band`

This currently uses onboarding Entry components, even when opened from Band/Profile. Six actual steps: ready → wear → light → select → connecting → connected. Buttons: Get started; Continue; Start pairing; discovered HeatSense Band serial row; final Continue; Back before connected. Wear has Need help?/Hide tips; light has Not seeing the light?/Hide tips. `onboarding=1` adds I don’t have a band yet at ready and finishes to `/notifications`; otherwise final goes back or athlete Band. Search and connection are simulated with an explicit Demo pairing/Bluetooth disclaimer.

No serial-entry field or real Bluetooth scan permission exists. No disconnect/firmware settings screen is implemented by this route. It invokes account pairing persistence only when Firebase/auth exist; source failure handling and timers are priority findings below. Onboarding ownership rules still apply; changing onboarding presentation requires explicit direction beyond a dashboard design pass.

### Health/setup routes inspected as dependencies, not invented Profile destinations

`/athlete/profile`: Full name, Date of birth, Grade level, inherited/read-only team Sport or Sport selection, optional Jersey number, Continue; existing validation/save/error and keyboard sequencing. `/athlete/body`: Height, feet / Height, inches; Weight (optional); Have you experienced a heat-related illness before?; conditional What type of heat illness? (optional); Do you have any concerns about exercising in hot weather?; conditional Other concern (optional); How accustomed are you to training in hot weather?; Continue / Skip for now. Existing choice sets and exclusivity rules are preserved, not redefined by this audit. `/athlete/safety`: Primary emergency contact Full name / Relationship / Phone number, Add another contact / Remove secondary contact with the same secondary fields, Additional safety notes (optional) multiline text with length counter, Finish setup / Skip for now. These use onboarding fields and private persistence; they are not exposed as new dashboard-edit features by this audit.

### `/athlete-vitals`

This route is currently a **staff athlete detail**, reached from coach/trainer rosters, not the athlete's personal Band tab. It defaults to coach lookup unless `role=trainer`. Do not link it from athlete Home as a shortcut without redesigning access/context deliberately. Existing controls: Back with role-specific fallback; sample practice-plan toggle; data/history retries. States include missing id, loading, team error/no-team, athlete not in current roster, no current practice, no band data, stale signal, real/simulated source, partial optional metrics and unknown practice-day history. Private health answers are not displayed. Preserve that boundary.

## Source findings to resolve after shared design system

| Priority | Exact finding / evidence | Bounded later action; no implementation in this phase |
| --- | --- | --- |
| High | PairBandScreen reuses one timeout ref for 1200-ms search and 1800-ms connection; effects lack step-change cleanup. Going back from connecting can still trigger connected/pair preference later. `savePairing` errors are caught silently | Cancel each step's timer on change/unmount and guard account/step ownership; show a truthful persistence failure without claiming physical pairing |
| High | Pairing BandShot and Link call repeating animations without cancel cleanup/focus/background gating | Add lifecycle ownership while retaining onboarding art and reduced-motion result |
| High | Learn WhereHelpIs still uses nullable `useCoachData`; a loading/error team passes null into safety hook and can display Join a team while an existing membership resolves | Use actual team status before presenting unavailable/no-team; preserve emergency plan source and no stale fallback |
| Medium | Athlete Home repeats the guidance destination through hero, concentric rings, practice-guidance CTA and alert strip; all are real working controls | Establish hierarchy/spacing in shared system; preserve visuals, values and safety destinations |
| Medium | FieldHero uses a 68-point heavy value; HomeOverview contains CoachType/CoachPalette styles plus athlete remapping. Shared neutral styles are transformed, but inline values/colors and some background tokens bypass transformation | Normalize typography/surfaces through approved role-aware tokens; keep all metric values, chart geometry and safety/signal colors |
| Medium | AthleteAppearance maps muted/faint tokens to white and regular/medium Inter, but other routes retain Entry font rules; typography differs across dashboard, pairing and staff detail | Scope intended route appearance; do not automatically restyle protected onboarding or staff screens |
| Medium | HeatHistory month uses seven equal aspect-ratio cells; narrow content width can yield targets below 44 points, unlike week buttons/48-point month arrows | Define accessible calendar density/scroll or alternative layout; keep date/zone semantics and day grouping |
| Medium | VitalCards zone rows have fixed height 28 and fixed 24/66/40 label columns; Figures uses three columns without wrapping | Large-text layout/overflow checks and flexible labels; keep bars/zone ranges/percentages unchanged |
| Medium | BodyStrip puts label/value on one row; large figure/unit can consume label width at accessibility sizes | Allow contained wrapping/stacking with preserved values/units and source summary |
| Medium | PersonalPulse repeats three equal columns with 50-point figure style and 28-point word overrides; narrow/large text can crowd Watch/Usual/Demo | Responsive typography/layout only; do not remove provenance or derive new recovery assessments |
| Medium | Guidance page sheet has manual padding and Done button; no explicit safe-area hook in that local modal | Runtime check page-sheet header, home indicator, longest rules and largest text; no premature claim of clipping |
| Medium | Profile BandDevice accessibility hint says band settings but routes to pairing | Align hint/label with the real destination; no invented settings screen |
| Medium | Profile trainer list displays None yet for an empty return; useTrainers return alone does not expose loading/error | Verify current subscription contract before distinguishing actual none from loading; do not invent trainers |
| Medium | Profile photo picker uses delayed callbacks; rename server update failure is silent; UIL external link rejection has no local feedback | Bound async callbacks to account/mount and add truthful failure handling where authorized |
| High privacy-copy review | Safety setup intro says contacts are kept for authorized safety staff, while its explicit privacy paragraph says only the athlete can currently see them and nothing is shared or contacted automatically | Verify access contract and make explanations consistent through an explicitly authorized copy correction; never broaden data access to fit aspirational wording |
| Medium | Body setup says answers can be updated anytime, but no health edit destination is exposed by the inspected Profile overview/settings | Confirm intended entry point before promising an available edit flow; do not invent a dashboard health-sharing feature |
| Low | Band viewer preview heart-tab highlight is transient; Explore selects/scrolls actual existing heart chart | Check scroll destination on long/large-text layouts and interruption; preserve no-autoplay/no-hardware-press/no-nav-travel rules |
| Protected observation | BodyStrip static Usual/Warm/Heavy/Low labels use existing simulator thresholds, not established personal baselines | Document provenance; no threshold/clinical copy change during style work |

## Runtime matrix for phase 4

Every item below is source-inspected; runtime is **not yet verified** by this agent.

1. Athlete Home: loading, error/retry, pending, declined/no-team, empty practice, current reading, overdue/unapplied, populated/empty/error seven-day history; open/close guidance via each real affordance and system back; longest venue/rules.
2. Band: no band, paired/sample, source disclosure expand/collapse; all four camera sources, rapid prev/next interruptions, zoom in/out, source/fallback failure, preview normal/reduced/background/unmount; all five available analyses and unavailable optional signals.
3. Sessions: team/history loading/error/retry/no-team/empty; week/month, current/past month, future disabled, empty/recorded selected date, multiple same-day practices, show-more and 40-record limit; every record-link route retains role/team/id/sample context.
4. Record: malformed link, signed out, loading, permission/network error, missing record, readings loading/error/empty/full, summary-only sample, source/units/policy/ack timestamps; Share disabled/busy/cancel/rejection; Back direct entry and normal stack.
5. Learn: no selection, each severity, mixed selections, clear; all eight hydration indices; each UIL zone, no current reading versus actual current zone; emergency-plan loading/error/retry/empty/filled; Band link.
6. Profile: source periods/loading/error/empty/capped; native photo permission/cancel/error/remove, native rename, switches, unit conversion, test alert, team/trainer unresolved states, support alerts/link, logout cancel/failure/success.
7. Pairing: every forward/back/help/skip path, leave during search/connection, return, app background, reduced motion, account switch and failed persistence; no physical Bluetooth success claim.
8. Across each applicable surface: 320-point width, largest accessibility text, VoiceOver control names/selection/order, safe area, modal dismissal, scroll reachability, keyboard dismissal/focus and first-tap action. Health/profile/safety forms additionally need numeric input, validation/error, save failure/draft retention, optional skip and account privacy verification.

No screens, features, diagnoses, users, measurements, calendar events or successful accessibility/runtime passes were fabricated. This document is ready for phase-4 implementation assignment after root's shared design system is settled.


## Phase 4 implementation record

After root approved the shared principles, typography/tokens and Coach implementation order, this agent changed only the assigned nine source files and this inventory. Shared Text already supplies Archivo/Manrope and live input focus styling; no shared component/font/motion, onboarding field, graph implementation, backend or access-rule file was edited here.

### Applied refinement

- `role-tabs.tsx`: Home band section uses the shared Surface with deliberate padding/gaps; guidance sheet keeps normal-flow content, a wrapping heading/action and comfortable scrolling clearance. All actual athlete tab/destination behavior remains intact.
- `learn-tab.tsx`: hydration card and band exploration use the shared surface treatment; inline advice corners follow the common radius while retaining its semantic color. Emergency-help loading/errors now follow `useCoachDataState('athlete')` before consulting the saved plan, avoiding the misleading Join a team state during initial team loading. Advice strings, selected symptom precedence, hydration shade order/quantities and UIL rules are unchanged.
- `band-viewer.tsx`: shared Surface replaces the bespoke card shell. Its four sources, 48-point controls, fixed 220-point stage, local zoom/camera transitions and two-second user-triggered preview contract are unchanged. It has no navigation band flight or fabricated physical-button animation.
- `body-strip.tsx`: supporting label/value rows stack at larger font scales instead of crowding. Values, unit conversion, simulated provenance and threshold-based notes remain unchanged.
- `vitals.tsx`: slow-recovery note uses the same Surface spacing; source disclosure, safety limitation and signal selection remain unchanged.
- `vital-cards.tsx`: each selected analysis sits in a consistent Surface; figures wrap and stack for accessibility sizes. Estimated-zone text/percentage groups stack above the same fill at large text; normal-size layout retains its reading order. Fixed clipping-prone zone row height becomes a minimum, and legend copy can wrap. Existing line/bar/strip/gauge types, all Fill percentages, colors, data, thresholds and calculations are preserved. `ui/charts.tsx` was not touched.
- `heat-calendar.tsx`: shared Surface and consistent padding. Month date grid has a horizontally reachable minimum width so each date slot remains at least 44 points; the minimum grows for accessibility text. Week date circles grow with larger type. Date grouping, today overlay, peak calculation, selection, month offset, future-disabled state and color semantics are unchanged. Week/month chart structure remains present.
- `practice-record.tsx`: clearer header semantics and reading-row spacing, retaining existing shared Rows surfaces without adding a card inside a card. Source units, measurement/ack times, policy, auth/team/record scoping, share payload and summary-only sample distinction remain unchanged.
- `pair-band.tsx`: uses separate step-owned search/connection delays with cleanup on step/focus/app changes; old callbacks cannot advance the UI after Back, unmount or account change. Account-keyed flow uses existing auth/service APIs. Simulated connection waits for `savePairing` success before showing connected and has visible failure/retry; no Bluetooth layer or data access was added. Both repeating illustrations cancel and pause via the existing motion-activity hook. Rapid page reveals use restrained opacity entrances; protected headings/instructions/demo disclaimer remain. Device selection adopts the shared surface and the demo caption stays readable.

### Checks actually performed

- Targeted ESLint passed on the nine owned source files. Full `npx tsc --noEmit` passed after each source group; latest rerun is reported to root.
- `git diff --check` passed after the source groups.
- Twenty-five assertions executed the actual extracted pairing callbacks with stubbed timers/auth/save API: cancelled step has no callback, hidden state schedules nothing, pending save cannot update UI after cleanup, rejected save does not claim connection, successful save connects once, changed UID is excluded, and search timeout is cleaned up. This is callback behavior evidence, not a physical pairing or native UI test.
- Fifteen named clinical/provenance/metric constants/helpers matched current HEAD: symptom choices/advice/shades/hydration mapping; estimated heart zones, skin reference, oxygen gauge and numerical helpers; pairing headings/instructions/step list. No graph implementation file was changed.
- No permanent tests mirror reversible styles. Root owns all screenshots and native/web interaction evidence.

### Findings resolved versus still pending

Source changes address pairing timer/lifecycle and visible persistence failure, Learn's team-loading ambiguity, calendar target sizing, metric container/large-text crowding and shared surface consistency. Original phase-1 findings remain above as historical evidence; they are not all still-open bugs.

Not changed: health/safety setup privacy-copy inconsistency, absence of a Profile health-edit destination, Profile native-picker/name/link behavior (other agent owns these), BodyStrip simulator threshold semantics, Home's repeated guidance affordances (shared HomeOverview owner), and real backend/connectivity functionality. No new permission, staff visibility, medical recommendation or measured band signal was introduced.

Runtime verification remains pending for the full matrix above, especially 375×667 / 390×844 / 430×932 / desktop, large text/calendar horizontal reachability, guidance modal return/scroll, all five analyses and source disclosures, pairing Back/background/account-change/failure/retry, saved-record Share and navigation. Source/type/callback checks are not counted as opened screens or an accessibility pass.
