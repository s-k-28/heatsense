# Coach refinement inventory — phase 1

Source snapshot: HEAD `b32673c`, with the current shared workspace changes, 2026-10-23. Scope: coach Home, Plan, Team, Alerts and their nested controls/routes/modals/forms. **Inventory only: no implementation, service, authentication, state, metric, formula, threshold or color edits in this phase.** Root owns the design principles/tokens and subsequent ownership assignments.

Evidence: handlers, source branches and style declarations were inspected. The click checklist below is **not executed in this phase**. Previous root reports establish only specific earlier checks: coach Home recording sheet open/Done, athlete read-only sheet open/Done, and one weekly day selection. Those reports do not establish the entire checklist, large-text/native AX coverage or persistence. See [previous coverage](ui-audit-coverage-2026-10-23.md) and the linked agent ledgers for narrower historical evidence.

## Source and route map

| Entry surface | Source | Interactive descendants and destinations |
| --- | --- | --- |
| Coach dashboard shell | `app/dashboard.tsx`, `components/dashboard-shell.tsx`, `dashboard-content.tsx` | Plan/Team/Home/Alerts/Profile tabs; header bell → Alerts; account avatar → Profile; staff band chip → Team. Tab selection, large-title collapse and scroll reset are shared shell concerns. Profile is root/other-agent scope. |
| Home | `coach-home.tsx`, `field-hero.tsx` | Photo hero CTA, entire condition-ring cluster and actionable alert strip → local FieldCheckSheet; rhythm title → Plan tab; horizontal individual block selectors update selected block/time; empty Team pulse Share code → parent `shareTeamCode`; seven day columns change selected daily readout; plan/team/history retry actions restart their existing reads. |
| Home field modal | `field-check-sheet.tsx` | Auth/team lookup/start-practice/current-practice branches, Done, keyboard, input and radio chips, source link, reading save, guidance expansion/acknowledgement, Share and End. This is a different container/style system from the Home photo/ring composition. |
| Plan | `coach-tabs.tsx` PlanTab / CoachZoneRules | UIL-details disclosure and source link; New plan and each plan card → `/plan-editor` with optional plan ID. Active plan sorts first. Colored work/rest preview is informative, not independently interactive. |
| Plan editor | `app/plan-editor.tsx` | Cancel; name; six timing steppers; Equipment SlidingTabs; generated schedule preview; zone check; Fix to meet UIL; Use for today; Save changes/plan; Save as copy; Delete native confirmation. Store loading/error/retry/missing-ID branches precede the editable form. |
| Team / Roster | `coach-tabs.tsx` TeamTab | Roster/Live SlidingTabs; local lookup retry/sign-in/create; code Share native sheet; approve/decline; nested TrainerAthletes search/filter/reset/share; each athlete → `/athlete-vitals?id=…&role=coach`; staff rows are informational. |
| Team / Live | `trainer-monitor.tsx` with `role=coach` | Effort/A–Z segmented control; warning athlete and signal row destinations → role-preserving detail; Mark checked in; disclosure of scoped check-ins; metadata retry. Charts are informative and excluded from decorative AX focus. |
| Athlete detail opened by staff | `app/athlete-vitals.tsx`, `vitals.tsx`, `vital-cards.tsx` | Back → navigation history or coach Team fallback; sample practice-plan disclosure; metadata/history retry. Physiological metric charts and band identity are not record/edit controls. Stale and unknown data meanings must remain intact. |
| Team creation/invite route | `app/team/create.tsx`, `app/team/invite.tsx` | Create draft fields/dropdowns and source link → invitation screen; retry code lookup; Copy; Share; regenerate confirmation/cancel; join-request approve/decline; Continue → `/ready?role=Coach`; Back fallback to setup/create. These are reachable from the coach dashboard but use the protected onboarding design family. Inventory does not authorize redesigning them. |
| Alerts | `alerts-tab.tsx` | Open/Resolved SlidingTabs; overdue/Add reading and guidance/Open practice → same FieldCheckSheet; Adjust plan → editor with active ID; View vitals → athlete detail; request Review → Team; Resolve changes scoped local resolution only. Zone-change rows and resolved items are historical/informational. |

The current Home weekly chart selects a day; it **does not** open `/practice-record`. Do not invent that destination during a style pass. Native saved-record routes are reachable elsewhere and remain recorded in the Profile/records ledger.

## Concrete consistency findings

These are implementation facts and design-review candidates, not claims that a screen looked wrong on an inspected device. Final choices must follow root's forthcoming token contract.

| ID / source | Current inconsistency | Refinement obligation / guardrail |
| --- | --- | --- |
| C01 — `theme.ts`, `coach-theme.ts`, `coach-home.tsx`, `field-hero.tsx` | Two neutral surface families: shared surface `#1A2024`/canvas `#101416` versus coach surface `#151819`/canvas `#0B0D0E`. Home timeline/history use CoachPalette while embedded field sheet uses shared Palette. | Use one published role surface mapping consistently through the nested modal; retain zone colors and chart tones exactly. Do not flatten meaningful data/source states into neutral decoration. |
| C02 — theme Face versus FieldHero value | Face.figure is bundled `BarlowCondensed_700Bold`; ring/Team pulse/history numerals use it, but hero value is system 68/800 with tabular numerals. Same-page readings therefore have visibly different numeral shapes by implementation. | Root decides ordinary UI font and metric-font contract. Keep metric size hierarchy and unit distinction; do not substitute a decorative display face independently. |
| C03 — CoachType and local headings | CoachType page40/800, section26/800, card21/700 coexist with local Alerts title19/700, status22/800, editor header20/800, field-sheet shared title22/700 and card title18/700. | Map each heading's function to the published type scale; reuse across modal entry and return. Preserve current accessible header roles. |
| C04 — local supporting copy | FieldHero uses white opacity .7/.75/.85; CoachPalette muted/faint differ from shared inkMuted/inkFaint; labels are handwritten12/13/14/15 with mixed500/600/700. | Assign consistent supporting text tokens. Preserve photo contrast and timestamps/units/provenance. Do not delete essential content merely because it is gray/small. |
| C05 — CTA primitive mix | Hero is a custom pill Pressable, New plan/Create team are custom Pressables, source/Done/Cancel use TextLink, retries/Share/approve/decline/editor saves use ActionButton. ActionButton itself is17/600/23 with radius14; hero is16/800/pill and52 high. | Root chooses primary/secondary/text/destructive styles and focus/pressed/busy rules. Migrate only visual implementations while preserving handler, disabled conditions, labels, ref guards and actual async feedback. |
| C06 — variant/style overrides | Team code Share is `variant=secondary` but its style paints CoachPalette.peach; ActionButton text color still comes from the secondary variant. Alerts Resolve uses text variant with an interactive filled surface. Editor Save/Fix override shared radius/background/height. | Token and semantic variant should agree; inspect actual contrast and emphasis after shared primitive work. Preserve approve/decline distinction and destructive End/Delete semantics. |
| C07 — selected-control families | Roster/Live, Open/Resolved and Equipment use SlidingTabs; roster subsets use standalone coach chips; field class/unit/source/measurement time use local radio chips; timing uses +/- circles. | Different jobs may justify different controls, but their label typography, target/focus state, edge/surface and selected treatment need one family. Do not replace native radio/adjustable semantics with generic buttons. |
| C08 — corner radii and spacing | Coach card30/panel24/input22/pill999 coexist with field sheet inputs Radius.medium, chips10, shared actions14, roster avatar22/day pill999 and calendar/chart-specific radii. Section starts use28/32/34, coach padding20/22, shared sheet spacing constants. | Publish role/container/action/input radii and spacing relationships; preserve chart shapes and metric geometry. Avoid blanket radius replacement in SVG/data marks. |
| C09 — modal container transition | Home is photo + unboxed metric sections + coach surfaces; FieldCheckSheet is pageSheet with shared canvas/group rows, input surfaces and a separate title/Done style. | Treat this as part of the same journey, not a separately finished screen. Verify first-entry, return and re-entry typography/background/button continuity. |
| C10 — source target/layout opportunities | Source has44-min-width timeline blocks in horizontal scroll; weekly chart has seven viewport-dependent columns; Team code row has no wrap in coachStyles; Plan card top aligns name and status on a single baseline. | Verify at320pt and large text before changing. Do not call the weekly columns44pt compliant from source. Preserve horizontal timeline scroll and block selection. |
| C11 — motion families | Shared Home layout wrappers are static after the modal/absolute-position issue; gradient ring fill remains local. Plan rules/cards and Alerts items still use entering/layout animations. Custom coach pressed scale and shared PressScale coexist. | Apply root's motion contract and verify return-from-modal/reduced-motion behavior. Do not reintroduce layout entering on Home wrappers or animate live numeric text. |
| C12 — shared/role appearance boundaries | Home child helpers use useAthleteStyles; coach-only Plan/Team use coachStyles directly; exported ZoneRules uses shared appearance hooks. Athlete reuses HomeOverview but cannot read roster or coach-local plan. | Typography/surface refactor must preserve context mapping and separate staff subscriptions. The same visual composition does not authorize athlete recording/invite/approval actions. |

## State and meaning risks to keep distinct from visual polish

No fixes are authorized in this phase. These are functional findings for separate ownership decisions:

- PlanTab still consumes legacy useCoachData and ignores plan-store status. Team-data failure can look like “Take a field reading,” and hydration can expose the default plan list before stored plans arrive. The editor has stronger loading/error handling; preserve it.
- Alerts still consumes legacy data/roster/vitals hooks. It has a generic unavailable branch for null practice, but cannot distinguish team loading from error/retry at that consumer, and roster/vitals errors can resemble an absence of associated alerts.
- Alerts derives slow-recovery items from every raw `recovery=watch` sample, with no freshness check in that branch. Preserve data-source/time labels and audit stale behavior separately; a type/spacing pass must not imply this is clinically verified.
- Field-sheet Source and Measured-time controls appear below Save reading. Verify discoverability with the number pad visible and ensure saved metadata always matches the visible choices. Their order must not be moved without preserving the intended input workflow.
- Plan Save/Use today/Delete still use existing store APIs. Prior ledger documents swallowed AsyncStorage write failures. A visual saved-state badge cannot claim durable persistence.
- Alerts Resolve is account/team/practice scoped view-local acknowledgement, not durable shared resolution. Do not relabel it as a team-wide resolved incident or successful care.
- Home ring Heat zone ordinal, guidance acknowledgement ratio, elapsed recheck fraction, physical WBGT, trend delta, next-zone headroom, weekly peak heights and colors are different meanings. Preserve all calculations and semantics; never turn the ring fraction into a medical score.

## Detailed click checklist — not executed in this phase

Record results separately for source/sample and authenticated emulator data. For every tested row, append role, initial state, exact input/action, observed result, screenshot/AX artifact and remaining uncertainty. Repeat affected controls with keyboard,320pt viewport,200% or OS accessibility text, Reduced Motion and a return-from-modal cycle. Do not count these rows as tests passed.

### Shell and Home

- [ ] SH01 Select coach Home, Plan, Team, Alerts and Profile tabs; confirm destination and selected tab; return to the original tab.
- [ ] SH02 Header bell opens coach Alerts; account avatar opens Profile; available band chip opens Team; scrolling title does not overlap controls.
- [ ] H01 Home initial team lookup: loading copy, disabled hero action, unknown rings; no false empty roster/history or “all clear.”
- [ ] H02 Practice lookup failure → Try again → loading → current data; verify no old account/session values leak.
- [ ] H03 Hero CTA with no practice opens StartForm; existing practice/no reading opens Log WBGT; pending guidance opens its confirmation; existing acknowledged reading opens current practice.
- [ ] H04 Entire condition-ring cluster opens the same practice modal; confirm values/legend and no overlapping layout after Done/reopen.
- [ ] H05 Practice rhythm heading/name opens Plan, then Back returns Home with same selected tab and scroll behavior.
- [ ] H06 Horizontally scroll all rhythm blocks; select first/work/rest/last; time/title/duration update correctly;44pt targets remain usable.
- [ ] H07 Plan metadata loading/error/retry; do not show the built-in plan as saved user data before hydration resolves.
- [ ] H08 Team pulse loading/error/retry, empty roster Share code, partial live/stale/unknown recovery; verify actual source labels.
- [ ] H09 Home Share code: existing team native Share; no team with incomplete draft → team/create; rejection → recoverable alert; cancellation makes no delivery claim.
- [ ] H10 Seven-day heat: select every day, including no-reading and live-today day; readout changes without unit/color mismatch. Cross-midnight readings must stay on their measured date for the current overlay.
- [ ] H11 Seven-day history pending/error/retry/empty/full40-window; check cap note and absence of fake zero peaks.
- [ ] H12 Alert strip overdue/pending-guidance/current/no-practice states; actionable strip opens practice; disabled state is truthful.

### Shared field modal and forms

- [ ] F01 Open from Home hero, ring, strip and Alerts; Done, system Back/dismiss and reopen; state/layout stays coherent.
- [ ] F02 Signed out → Sign in destination; successful no-team → Create your team; sample/no backend → honest unavailable recording state.
- [ ] F03 Lookup failure/session-listener failure → the correct retry; successful null result must differ from error.
- [ ] F04 Edit practice location; clear it and verify Start disabled; test80-character limit/long name and keyboard visibility.
- [ ] F05 Select UIL Class2 and3; check selected/disabled/AX state; open UIL chart; test link failure UI without changing source URL.
- [ ] F06 Select15/30/45/60-minute recheck options; Start session; busy freezes inputs; failure retains draft; success shows the current session.
- [ ] F07 Current session: verify venue/class/start time, first-reading due, countdown/on-time/overdue; no fake refresh confirmation.
- [ ] F08 Expand/collapse latest-zone guidance; inspect breaks, duration, football equipment, cooling requirement and source/version/class.
- [ ] F09 Apply guidance → saving/success/error; applied timestamp corresponds to the correct reading; pending input state cannot duplicate/confuse confirmation.
- [ ] F10 Log WBGT number in°F/°C; blank/non-number/out-of-range values show existing validation; comma decimal and legitimate zero handling follow existing validation.
- [ ] F11 Choose Handheld/Station/Other source and Measured now/5/10/15 min ago, then save; verify stored original value/unit/source/time through the existing record service.
- [ ] F12 Numeric keyboard open: Save reading visible/reachable, dismisses keyboard, busy freezes fields/choices, failed save retains text, successful save clears expected draft only.
- [ ] F13 Readings listener fails after values: warning says data may be out of date; Reload actually loads again rather than implying current data.
- [ ] F14 Inspect reading History rows newest/current chronology and units; long source/time strings wrap.
- [ ] F15 Share practice record: pending native sheet, cancel, failure and original saved record retained; no export success inferred from dismissal.
- [ ] F16 End practice: busy/error/current-session removal; verify intentionally destructive action and preserved saved history with an emulator fixture only.

### Plan and editor

- [ ] P01 Active plan first, custom/built-in plans, no misleading zone status when practice lookup is pending/error.
- [ ] P02 UIL details show/hide, five zones/current class, source link; hidden state removes controls from AX focus.
- [ ] P03 New plan opens unbound editor; custom card opens matching ID; built-in opens New from standard; Cancel/Back preserves original plan.
- [ ] P04 Delayed store hydration, read failure → retry, missing requested plan ID; do not silently edit a default instead.
- [ ] P05 Edit Plan name; long/empty name and keyboard flow preserve existing validation/default behavior.
- [ ] P06 Start stepper:15-minute steps,05:00–21:00 bounds; touch and adjustable increment/decrement agree.
- [ ] P07 Check-in:5-minute steps,0–30; Work:5-minute steps,5–60; Break:1-minute steps,2–20.
- [ ] P08 Practice length:6-minute steps,30–180; Water:5-minute steps,5–30; verify both bounds and disabled +/- feedback for each.
- [ ] P09 Equipment On/Off in breaks/Off SlidingTabs; selected item and generated schedule retain current calculations.
- [ ] P10 Generated work/rest timeline and labels update; short/end-of-practice schedule edge cases keep existing behavior.
- [ ] P11 Zone check compares plan to actual UIL guidance; Fix to meet UIL updates only its existing fix fields; black-zone no-outdoor behavior remains unchanged.
- [ ] P12 Use for today saves/activates and returns; Save plan/changes returns without unexpected active-plan change; Save as copy leaves original intact.
- [ ] P13 Delete plan native confirmation → Cancel leaves it; Delete removes custom plan and falls back to Standard if active. Built-in deletion remains protected.
- [ ] P14 Restart after save/use/delete to check actual persistence; injected failure must not be claimed passed through source or stub tests.

### Team roster, Live and athlete detail

- [ ] T01 Roster/Live switching preserves destination; loading/error/signed-out/no-team/real-team wrapper states remain distinct.
- [ ] T02 Code lookup retry replaces old state; account A→B never exposes A's team/code; Share busy/cancel/rejection are handled.
- [ ] T03 Approve and Decline for athlete/trainer requests; only chosen action shows correct pending label; other requests cannot race; rejected action preserves request.
- [ ] T04 Search appears for a sufficiently large roster or an existing query; case/whitespace query, clear and no matches.
- [ ] T05 All/Under14/Live/Watch meaningful filters; unknown days excluded from Under14; expired/missing signal is not Live/Watch; selected zero-count filter remains escapable.
- [ ] T06 Show all athletes resets query+filter; empty approved roster Share code works; do not offer approval-only controls to athlete-role views.
- [ ] T07 Each roster athlete opens matching detail with role=coach; full name, record-day uncertainty and simulation are readable.
- [ ] T08 Staff list contains approved trainers; informational rows do not imply an editable destination.
- [ ] T09 Live Effort/A–Z sort; bucket behavior and stale-last order; all-zero/partial reporting count retains full approved-roster denominator.
- [ ] T10 Needs-a-check athlete destination; Mark checked in; show/hide check-ins; different cue, ten-minute expiry, account/team/practice scope.
- [ ] T11 Detail Back/history and cold-open fallback go to coach Team; single sample, trend, stale/missing timestamp, null metrics/valid zeros, unknown recovery, band serial.
- [ ] T12 Detail sample-plan disclosure and practice-history retry; real practice days never imply attendance or completed acclimatization.

### Team creation and invitation continuation

- [ ] J01 Create team route Back; school/name fields; Sport/Level/UIL-class dropdown open/choose/dismiss/error; form validity; UIL source.
- [ ] J02 Create team advances to invite; pending/error/retry and successful code generation; no duplicate write from rapid taps.
- [ ] J03 Copy code and native/web Share; disabled before ready; clipboard/share cancellation/failure produces honest feedback.
- [ ] J04 Generate new code → confirmation Cancel; confirm with busy; failure retains correct active code; success updates code and expiry.
- [ ] J05 Invitation join requests approve/decline busy/error states; Continue → ready → coach dashboard; Back fallback remains valid.

### Alerts

- [ ] A01 Open/Resolved counts, select both including zero lists; correct empty/no-practice/unavailable wording.
- [ ] A02 Status zone/unit/measurement age and live countdown; overdue tone; long locale/large text fit.
- [ ] A03 Overdue Add reading and unacknowledged Open practice open the same modal; saving/applying updates derived alert source.
- [ ] A04 Plan mismatch Adjust plan opens the current plan ID; edit/fix/return refreshes the derived mismatch.
- [ ] A05 Sample and real slow-recovery View vitals target matching athletes; source and measured time retained; separately exercise stale raw samples.
- [ ] A06 Join request Review opens Team; trainer versus athlete request labels and final approval state are accurate.
- [ ] A07 Resolve available only for local-resolvable rows; Open decreases/Resolved increases, timestamp preserved; account/team/practice switch does not carry local resolutions.
- [ ] A08 Zone-transition entries remain historical, correctly ordered and non-resolvable; no action added by a visual refactor.
- [ ] A09 Every alert action at narrow/large text, keyboard navigation, visible focus, VoiceOver and Reduce Motion; modal return does not leave entering-animation overlap.

## Confirmed user constraint

Root removed only the top-right zone text from the Field conditions section header during this inventory. Preserve that removal in phase3. The inner-ring zone label remains intentional and must stay.

## Phase boundary / implementation handoff

Wait for root's principles, font choice, shared token/primitive contract and file ownership before phase3 edits. Preferred implementation boundaries are visual components/call-site styles; **existing services, auth, state, calculations, chart colors, source labels, permissions and persistence handlers remain unchanged.** Reachable onboarding routes need separate explicit ownership. Runtime check results should link artifacts rather than replacing unchecked items with unsupported “pass” totals.


## Phase 3 implementation checkpoint

Applied after reading [published principles](refinement/design-principles.md) and root's shared font/token/control foundation. Owned visual files only: `coach-home.tsx`, `field-hero.tsx`, `coach-tabs.tsx`, `alerts-tab.tsx`, `field-check-sheet.tsx`, `plan-editor.tsx`, `athlete-vitals.tsx`, and coach-reachable `trainer-athletes.tsx`. This checkpoint does not change services, authentication, state stores, validation, persistence or safety instructions.

### Exact source changes

- Major Home rhythm/history surfaces, hero container, Plan/Team surfaces, Alerts status/cards/empty state, editor groups and roster groups now compose the shared `surfaceStyles.card` foundation. Neutral floating surfaces/shadow/radius follow the same contract. SVG rings, bar shapes, work/rest previews, day bars and chart geometry are not restyled as generic cards.
- Home supporting labels, alert/card headings, plan/source headings and athlete-detail identity/status hierarchy use the published type roles. The global bundled Text/TextInput wrappers remain the font mechanism; no extra family/loading system added.
- Hero CTA, New plan and Create team now use the shared ActionButton with their existing callbacks/disabled state. Team Share uses the primary semantic variant instead of secondary ink on a peach surface. Alerts Resolve stays a quiet text action; editor primary/secondary/Fix controls inherit shared sizes and surfaces instead of repainting them locally. Async busy/error/guard behavior remains with the existing handlers.
- Field-sheet location/WBGT inputs use the shared56pt,22-radius field vocabulary and supporting type; class/unit/source/time radios keep their current choices, radio semantics, selected states and disabled rules. Source content, UIL guidance and confirmation language are unchanged.
- Plan/Team header and code rows wrap; plan names/status and request names can share narrow width without forcing a fixed line. Coach roster search and athlete-detail headings align with the same input/type family. Existing scroll/keyboard/safe-area behavior stays in place.
- Metric peach is explicitly pinned to the original `#FFAD83` in Home guidance gradient, work blocks, personal pulse metric rails and Plan work preview. The UI brand token is independent. Zone colors, graph ranges, ring fraction meanings, observed trend/headroom calculations and all medical thresholds remain unchanged.
- Preserved the user's requested removal of only the top-right Field conditions zone label; the inner-ring zone label remains. Normal-flow Home wrappers, the SVG transform fix, role-specific read-only controls and all existing metadata loading/error/retry branches remain intact.

### Checks actually executed

- Targeted ESLint on the eight owned visual modules: passed without warnings after fixing a duplicate inherited style property and a duplicate theme import.
- Full `npx tsc --noEmit`: passed for the shared workspace at this checkpoint.
- Actual production shared Home render-tree fixtures: athlete path mounts no roster/local-plan subscriptions or recording sheet/invite; personal unknown recovery remains unavailable; history loading/error/retry differ from empty; coach uses its roster/plan and scrollable blocks; practice lookup error remains explicit. These use mocked dependencies, not a device renderer.
- Actual production `useMyTeam` helper lifecycle fixtures: account isolation, late callback rejection, error versus successful no-team, retry loading, sign-out and same-account re-entry. No live account/database operation performed.
- TypeScript-parser source comparison against HEAD confirmed unchanged `seriesFor`, `trendPerHour`, `arrowFor`, Home recheck/count/acknowledgement/today-peak/weekly/alert calculations, applied ratio and hydration tick calculation. Checked explicit metric peach, removed header label and absence of `originX`.

### Runtime still pending for this styling batch

Root owns browser/native verification. Check actual bundled font faces/weights, brand-button contrast, photo contrast, focused fields, keyboard Save/Done reachability, long names/code, narrow wrapped requests/actions, large text, role-specific Home modal return and Plan/Alerts entering behavior. Re-run the relevant H/F/P/T/A checklist rows above; source typechecking and mocked fixtures do not mark those runtime rows passed. Earlier root observations predate this visual checkpoint unless a new artifact is explicitly attached.

## Root QA follow-up — Plan editor

Root found web steppers exposing an adjustable parent while hiding both +/- buttons. The editor now preserves the native adjustable action/value and hidden-child model, while web exposes a group with named Decrease/Increase buttons. Existing increments, clamps, bounds,44pt targets and form/store logic remain unchanged. ZoneCheck now distinguishes team loading, error with retry, and an actual no-reading state using existing metadata; its checkPlan computation and Fix action are unchanged.

Root also identified that native Alert confirmation is unsuitable as the sole web delete path. Web now uses an inline shared Surface with Cancel/Delete plan actions. Native retains its Alert. Both confirmed paths invoke the same deletePlan(id) then close handler; cancel retains the plan. No persistence API was changed.

Focused ESLint, full TypeScript and diff checks passed. Actual-source function/callback fixtures in `/tmp/heatsense-plan-accessibility-check.cjs` passed web/native control semantics, clamp behavior, zone status/retry/check branching and web/native delete/cancel routing. These are mocked source fixtures; root owns actual keyboard operation, local test-plan Save/Delete persistence and screenshots. FieldCheckSheet End practice invokes its existing handler directly and has no corresponding Alert-only web path.
