# Refinement audit — evidence and remaining checks

This checklist summarizes [runtime QA](runtime-qa.md) and the [source route map](route-map.md), with the [Profile/setup inventory](../refinement-profile-setup-inventory.md). **Updated in source is not the same as opened, visually inspected or successfully completed.** Repeated JSX controls are not independent screens. The inventory contains22 route files, including layout/redirect files; the actual main navigation reviewed here has five Coach and five Athlete tabs.

All browser execution recorded in the ledger used one Chrome session, Metro and local Firebase emulators. Test accounts and records were synthetic. This document adds no new runtime claims.

## Main navigation

Each of these ten tabs has recorded initial-view captures at **375×667,390×844,430×932 and1280×900 desktop preview**. These are viewport captures, not exhaustive full-page, all-state or native passes.

| Role / tab | Recorded runtime interactions beyond capture | Remaining limitation |
| --- | --- | --- |
| Coach Home | Practice block/day selection; Practice sheet; empty/new-team share→Copied; first-reading warning retested; practice start/read/acknowledge/end workflow | Query failure/native behavior not exhaustively exercised |
| Coach Plan | UIL disclosure; editor;12 steppers restored; three equipment selections; compliance failure/fix; save/edit/copy/reload/activate; Delete→Cancel | Two local audit plans await confirmation for permanent deletion |
| Coach Team | Under14/All/search/clear; current/stale athlete detail; Live; A–Z/Effort; Share→Copied; isolated approval/decline; check-in and expanded history; resized roster scroll/click retest | Different-cue/timeout/account-reset check-in branches not executed |
| Coach Alerts | Open/Resolved; Practice sheet; Review→requests; Resolve moved synthetic join alert with timestamp while membership stayed pending | Resolution lifetime/reset branches not exhaustively executed |
| Coach Profile | Five switches toggled/restored; staff privacy disclosure; shared responsive/dialog checks | Native OS actions and injected save/query failures remain separate |
| Athlete Home | Four entry points to read-only guidance sheet; UIL content; seven heat days; source disclosure; Band navigation; pending→approved membership behavior | Native safe areas/keyboard/performance not covered by web captures |
| Athlete Band | Four angles, reverse wrap, zoom; five analyses; Explore selects/scrolls Heart; interrupted Explore does not affect later screen | No real BLE or medical signal validation; final native analysis-selector pass absent |
| Athlete Sessions | Week/Month/date navigation; current-month Next disabled; rightmost dates; calendar/list→same record; Copied export; Back restores calendar | Error/retry, large text and native scroll interaction not comprehensively exercised |
| Athlete Learn | All ten symptoms, precedence and Clear; eight hydration shades; five zone rules; Band link; desktop width fix retested | Preserved mappings are not new medical-validation evidence |
| Athlete Profile | Periods; name empty/save/cancel; picture menu cancel; switches restored; °C→°F; privacy/safety/web alert notices; resize retains open dialog | Camera/library acquisition, real notifications and native keyboard not exercised |

At375px, Athlete Home was scrolled to the end: final alert action cleared navigation and document width remained375px. This does not establish bottom clearance on every other screen/state.

## Route-by-route checklist

“Source” indicates updated implementation or reviewed wrapper/redirect, as documented in the inventories. “Opened” below requires explicit runtime-ledger evidence. A route reached in a flow does not imply every control or error was tested.

| Route file (`src/app/…`) | Source scope | Recorded opening / task evidence | Outstanding |
| --- | --- | --- | --- |
| `_layout.tsx` | Bundled typography and frame/modal foundation | Phone→desktop open-dialog preservation retested; native sign-in snapshot | Native lifecycle/keyboard/window interaction |
| `index.tsx` | Entry/redirect inventory | No separate route execution recorded | Redirect branches |
| `welcome.tsx` | Shared typography/entry foundation | Repeated sign-out→Welcome→Get started→Sign-in round trips | Complete responsive/native variants |
| `sign-in.tsx` | Validation/pending/error and account-opening feedback; copy cleanup | Local Coach/Athlete sign-in; blank/missing/malformed fields; email/Google choice; create-name validation; malformed reset retest passed | Actual OAuth, real reset delivery, injected home-route failure |
| `role.tsx` | Shared choice design and concise copy | Three radios checked; Coach continued | Final native/large-text pass |
| `setup/coach.tsx` | Create/Join choices | Both choices opened; staff Join reached trainer code | Query/error and native states |
| `setup/athlete.tsx` | Code input/preview/retry/actions | Digit filtering; incomplete/invalid code; actual isolated invite; pending request→basic profile | Expired/rate-limit/listener-failure UI |
| `setup/trainer.tsx` | Delegates shared Join screen | Reached from Join as staff; no-code→Ready; Back through forms | Actual trainer request/approval flow |
| `setup/[role].tsx` | Dynamic fallback reviewed | No separate fallback execution recorded | Unsupported-role redirect |
| `team/create.tsx` | Fields, menus, validation and keyboard-aware layout | School/name/Sport/Level/Class3; Create→real local team | Failed save, long/large-text/native keyboard |
| `team/invite.tsx` | Loading/code, shared actions, wrapping and confirmation | Continue disabled while loading; Copy; regenerate Cancel and confirm; browser Share→Invitation copied; Ready round trip | Native share, revoked/expired invite states; decline |
| `ready.tsx` | Role-specific introduction/actions | Coach finish→Home; trainer no-code reached Ready | All role variants/native layout |
| `athlete/profile.tsx` | Form typography/wrapping; removed redundant intro | Invalid DOB; grade scroll/12th; fictional basics/jersey saved; inherited Football readonly | Failure/retry; complete field-boundary matrix |
| `athlete/body.tsx` | Readable optional/privacy/error content | Height/weight; history conditional fields; multiselect/exclusive None; saved acclimatization self-report | Save failure, all skip/reopen combinations |
| `athlete/safety.tsx` | Correct athlete-private copy, targets and notes layout | Partial/invalid contact errors; relationship; add/remove secondary; distinct accessible labels; fictional primary/note saved; bottom/focused-notes capture | Native keyboard; production storage remains gated; no automatic contacts |
| `pair-band.tsx` | Demo steps/persistence/cancellation refinements | Fit/light help; discovery Back cancels; discover→Connecting→Connected after persistence | Real device/BLE; injected save failure/native completion |
| `notifications.tsx` | Relevant example, optional request and web guidance | Web Continue→Done | Actual native allow/deny/error and permission persistence |
| `athlete/done.tsx` | Real membership states and retryable unavailable state | Request sent→pending dashboard; approved account later loaded Home | Error/timeout/retry injection |
| `dashboard.tsx` | Shared shell/role composition | Ten-tab four-size matrix; seeded/isolated and pending/approved accounts | All-state native/device performance |
| `plan-editor.tsx` | Form/control/accessibility refinements | Actual stepper/equipment/compliance/save/edit/copy/activate/reload checks | Confirmed permanent deletion; failures/native keyboard |
| `athlete-vitals.tsx` | Analysis/detail layout and selector | Coach opened Leo/five analyses; current/stale isolated detail;375px scroll/click after resize; shared selector retested through Band | Native selector/large-text and injected data errors |
| `practice-record.tsx` | Scoped record, original metadata, share/back | Athlete calendar/list opened same record; Copied; Back restored Sessions | Permission/missing/cross-midnight/error UI and native share |

## Reproduced fixes and status

- **Retested:** open Profile dialog survives phone/desktop frame change; plan controls expose meaningful selected/checked state; stepper feedback changes/restores actual values; malformed password-reset email is rejected before the reset service.
- **Retested:** Home/Team share copy feedback; practice export copy feedback invalidates when the exact report changes; first-reading warning appears before a measurement; desktop Learn uses the phone-frame width; Band selection scrolls selected Heart into view and Explore cannot affect a later route.
- **Retested cancellation only:** plan Delete confirmation retained the record on Cancel. This does not prove or authorize permanent deletion.
- **Retested:** narrowed Coach roster no longer retains an absolute398px row after resize. With web layout builders disabled, actual width343px and relative124px parent allow the row to scroll fully above navigation; the intended detail URL opens and Back returns Team. Native layout builders, chart clocks and interactive motion remain intact. Profile/invitation blocks received the same browser guard.
- **Retested:** fixed dashboard header is opaque black while content scrolls. Section font token now resolves the documented Archivo700 face; page/metric800 remains unchanged.
- **Source evidence only:** listener/identity handling, pending/error states, typography, targets and accessibility properties were updated or inventoried. Type/lint results do not establish runtime behavior; states not explicitly executed in the ledger remain untested.

## Remaining limits and cleanup

- The native simulator screen was captured again after the final code changes: [current sign-in typography/photo snapshot](../../../screenshots/refinement/native-current.png). The shorter copy is visible. Earlier native AX checked the Home zone-label change. The Device Hub window became unavailable to computer-use; **current native dashboard, keyboard and safe-area interaction remain pending reopening that window**. A read-only simulator screenshot does not establish an interaction pass.
- No real camera/library acquisition, native OS notification permission, completed native share, real OAuth credential flow or production account lifecycle was verified here. Menu cancellation and web copy are narrower results.
- Real BLE hardware/firmware is unfinished. Simulated band data and demo pairing remain labelled; imagery and animations establish no hardware or medical accuracy.
- Native screen-reader traversal, full keyboard/focus audit, Dynamic Type/200% text, automated accessibility coverage and physical-device performance/energy profiling are not complete. Selected/check states inspected in web are not full accessibility certification.
- Query/permission/save/offline/retry coverage is partial. Historical source inventories contain additional candidates; do not mark them resolved merely because typography changed.
- Two temporary **local browser** audit plans remain awaiting user confirmation for permanent deletion under the computer-use rule. Plans use the existing device-local store; the test accounts and practice records use Firebase emulators. Original Standard is preserved. The newly added cold-reading test was already removed through the recorded emulator-admin cleanup; no production reading was written.

Review completion against this evidence and the live ledger, not a claimed total of all screens/states. Implementation and available browser checks are recorded; the native and unexercised-state limits above remain explicit.

## Validation recorded

Full `npx tsc --noEmit`, `npm run lint`, scoped whitespace checks and existing recheck/UIL WBGT/band-simulator/plan checks passed. The baseline preservation check also passed after the browser-flow changes. Services, state and Firebase rules were unchanged; chart implementation changed only imports, with numerical helpers/initializers and protected color marks verified. Native acquisition, hardware, account-production and error-state limits above are not covered by these checks.
