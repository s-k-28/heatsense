# UI audit coverage — October 23, 2026

Snapshot: source inventory taken around 18:26 Chicago, while coordinated work remains active. This is a coverage record, not a full-app pass. Route files, role-specific dashboard tabs, branch/state checks, assertions, screenshots and native workflows are different units and must not be added together as “screens tested.”

## Evidence rules and counts

- **22 app TSX files:** 21 route files plus `_layout.tsx`. A route is not necessarily a distinct screen: one is a dynamic redirect and another is a trainer wrapper around the join screen; `/dashboard` contains 15 role-specific tab surfaces.
- **15 dashboard tab surfaces:** five for each role, listed below. These are source-mapped surfaces, not 15 independently verified native screens.
- **17 distinct implementation modules** have concrete source-audit evidence in the four agent ledgers below: eight in the monitor/shared-state/Home batches; three Profile/record/calendar modules; three Protocols/Learn/Alerts modules; and three staff-form/plan-store modules. This counts modules with documented source work once, not every branch read or lint invocation. The dashboard mapping and other routes are inventory/source spot-checks and are not included in that audit-module count. Root's additional ongoing modules may extend coverage later.
- **Three locally reproducible fixture entrypoints** were executed by this agent: `/tmp/heatsense-state-check.cjs`, `/tmp/heatsense-monitor-check.cjs`, `/tmp/heatsense-home-check.cjs`. They transpile actual production modules/declarations with mocked dependencies. They establish scoped state/helper/render-tree behavior, not native layout or Firestore integration. Do not count their assertions as screens.
- Other agents report production helper/callback/store fixtures in their ledgers. Those were not independently rerun by this inventory author, and are not added into a synthetic app-wide test total.
- **Zero native screen passes, screenshots, OS Share/notification workflows or Accessibility Inspector results were captured by this author.** Root owns runtime testing. The Profile ledger records one root-reported narrow-calendar defect; that is evidence of a defect before the fix, not a passing native workflow. Root should append exact runtime artifacts separately.

Audit ledgers: [Monitor, roster and shared state](audit-monitor-roster.md), [Profile and saved records](audit-profile-records.md), [Protocols, Learn and Alerts](audit-protocols-learn-alerts.md), [Staff forms and plans](audit-staff-forms.md). Review method: [UI audit protocol](../system/ui-audit-protocol.md). Earlier layout context: [Home/Sessions/Band](home-sessions-band-audit.md), [Home copy](home-copy-hierarchy-audit.md), [Rossark polish](../system/rossark-app-polish.md).

## Actual route inventory

Discovered with `rg --files src/app`, confirmed by a recursive TSX file inventory. “Inventory only” means this batch has not completed a systematic screen/state audit for that route; it does not imply an existing defect.

| Route file | Surface / major states from source | Coverage at this snapshot |
| --- | --- | --- |
| `index.tsx` | Entry redirect when no explicit step; seven explicit introduction steps with final role choice | Inventory and source spot-check; cofounder-owned onboarding; no full runtime pass |
| `welcome.tsx` | Welcome / account-entry destinations | Inventory only |
| `sign-in.tsx` | Email/Google sign-in, account creation, pending/auth readiness, rejected sign-in | Source spot-check; native authentication pending |
| `role.tsx` | Coach/trainer/athlete selection; Continue disabled before selection | Source spot-check |
| `setup/[role].tsx` | Legacy role-normalizing dashboard redirect | Source read; redirect, not a new rendered screen |
| `setup/coach.tsx` | Create a team / join as staff choice | Source spot-check |
| `setup/athlete.tsx` | Six-digit code entry, lookup, team preview, join pending/error, role-specific next step | Inventory and source spot-check; full form/keyboard/network flow pending |
| `setup/trainer.tsx` | Trainer wrapper using shared team-join implementation | Source read; not counted as an independent implementation |
| `team/create.tsx` | School/name/sport/level/UIL-class draft, validity, next to invite | Source spot-check; actual team persistence happens in following flow |
| `team/invite.tsx` | Lookup/create code, copy/share, regeneration confirmation, approval/decline | Source spot-check; native Share and database workflows pending |
| `athlete/profile.tsx` | Required identity/profile inputs, optional jersey, validation/save/error | Inventory and source spot-check; cofounder-owned flow |
| `athlete/body.tsx` | Optional body/concern inputs, unit controls, save/skip/error | Inventory and source spot-check; cofounder-owned flow |
| `athlete/safety.tsx` | Emergency-contact data, save/skip/error, profile prerequisite | Inventory and source spot-check; cofounder-owned flow |
| `athlete/done.tsx` | Loading membership, joined/no-team completion, dashboard/join destinations | Inventory and source spot-check |
| `ready.tsx` | Role-specific setup completion, dashboard destination | Inventory and source spot-check |
| `pair-band.tsx` | Demo ready/wear/light/select/connecting/connected; help and setup return | Source spot-check; no BLE implementation or real hardware-pairing pass implied |
| `notifications.tsx` | Illustrative alerts, ask permission / skip, completion | Source read; native permission outcomes pending |
| `dashboard.tsx` | Role normalization, five tabs per role, header, development review states | Source mapped below; runtime owned by root |
| `athlete-vitals.tsx` | Sample/real, loading/error/no-team/no-practice/no-sample, single/trend/stale, unknown recovery | Source audit + helper/state fixtures; native screen pending |
| `practice-record.tsx` | Invalid/missing/signed-out/loading/error, real/sample detail, readings failure/retry, Share gating | Profile ledger + extracted formatter fixtures; native flow pending |
| `plan-editor.tsx` | Store loading/error/retry/missing plan, draft editing, validation, save/delete | Staff ledger + actual store fixture; native persistence/keyboard pending |

`_layout.tsx` supplies providers/navigation and is not counted as an additional screen.

## Fifteen dashboard tab surfaces

Actual mapping: `app/dashboard.tsx` `roleTabs`, dispatched by `components/dashboard-content.tsx`. Profile is the same component with three role variants. Coach Team Live reuses Monitor; coach Team roster reuses TrainerAthletes. Reuse is not a separate implementation test.

| Role / tab | Implementation and major state obligations | Current evidence |
| --- | --- | --- |
| Coach / Plan | `coach-tabs.tsx` PlanTab; stored plans pending/error/custom/active; selected-plan zone check; editor return | Source spot-check + staff editor/store ledger; wrapper state and device interaction pending |
| Coach / Team | TeamTab; team/code pending/error/no-team, requests/approve/decline, roster/live subviews, staff | Reused roster/Monitor source audit; wrapper source gaps listed below |
| Coach / Home | CoachToday; team loading/error/retry, no practice, first reading, acknowledged/unacknowledged, recheck due/late, history loading/error/empty | Source audit + actual Home render-tree and shared-state fixtures; device pending |
| Coach / Alerts | AlertsTab; no/current practice, field/signal alerts, source labels, local resolved scope | Protocols/Alerts ledger; native alert navigation pending |
| Coach / Profile | ProfileTab coach; identity/edit, team/code states, period records, settings/permissions/sign-out | Profile ledger; history/membership limitations listed below |
| Trainer / Monitor | TrainerMonitor; roster and signal loading/error/retry; live/stale/no sample; cue/check-in/sort | Monitor ledger + actual helper/state fixtures; device pending |
| Trainer / Athletes | TrainerAthletes; roster loading/error/empty; search/filter/no result; signal status; known/unknown days | Monitor ledger + actual helper fixtures; device pending |
| Trainer / Home | Shared CoachToday read-only start behavior; trainer can record in an existing real session; band summary unknown/partial/stale/error | Actual Home render-tree + state fixtures; native record transition pending |
| Trainer / Protocols | Respond/Prepare/Tools, symptoms, timer, steps, save/reset, readiness, emergency plan, calculators, UIL selector | Protocols ledger + production callback/helper fixtures; no clinical or native audit claim |
| Trainer / Profile | Shared ProfileTab with trainer team/membership/settings/record states | Profile ledger; real account transitions pending |
| Athlete / Band | AthleteBand; paired/unpaired, explicit simulated source, personal metrics, shared band graphic | Earlier Home/Sessions/Band source audit; root actively testing visual integration |
| Athlete / Sessions | AthleteSessions; team/history loading/error/no-team/empty, calendar/list, forty-record cap, show more and record destination | Source reviewed against current metadata integration; root owns runtime |
| Athlete / Home | AthleteHome + read-only CoachToday; pending/declined/no-team, record/error/unknown history, guidance disclosure, personal band destination | Source reviewed + shared CoachToday fixtures; root owns native/runtime |
| Athlete / Learn | LearnTab; symptom selections/clear, eight hydration states, saved plan unavailable/error, sources | Protocols/Learn ledger; native selectors/large text pending |
| Athlete / Profile | Shared ProfileTab plus athlete-only appearance and band identity | Profile ledger; root owns appearance/runtime verification |

## State coverage that still needs real execution

These are obligations, not a multiplied screen count:

1. Account A → sign out → account B, same team ID, different team ID, role switch, active session changes, revoked/pending/declined membership. Local listener lifecycle fixtures cover isolation mechanisms; they do not exercise Firebase authorization or native navigation.
2. Delayed initial response, permission denial, offline listener failure after a value, retry recovery, empty success. Metadata is wired in Monitor/roster/vitals/Home/Sessions; remaining consumers below still use legacy views.
3. Zero/single/multiple/stale samples, missing timestamp, raw recovery unknown, mixed simulated/real provenance, missing scalar metrics and legitimate zero values.
4. New practice → actual handheld reading → inspect guidance → acknowledge → recheck → save/end → retrieve the same record. Field-sheet source checks are not an end-to-end saved-reading workflow.
5. Protocol steps/timer → switch Respond/Prepare/Tools → change situation → explicit new response → failed save/retry → successful incident; avoid any real emergency call.
6. Plan cold storage hydration, corrupt storage, save/delete/active change, restart. Stubbed reads are covered; durable write failure feedback remains incomplete.
7. Narrow viewport and largest OS text, long names/venues/serials, calendar overflow, selected controls, 48-point actions, keyboard visibility, VoiceOver order and Reduced Motion.
8. Native Share cancel/reject, notification allow/deny/error, camera/photo picker allow/deny, sign-out cancel/fail/succeed, external source-link rejection. No local helper test substitutes for those OS workflows.

## Material remaining source issues and priorities

The following were read in current source. They are not fabricated runtime failures. Severity uses the protocol's 0–3 rubric; proposed fixes must remain within current owners' authorization.

| Priority / severity | Evidence / task consequence | Suggested next action |
| --- | --- | --- |
| P1 / 2 — coach Team wrapper | `coach-tabs.tsx` local `useMyTeam` uses an empty effect dependency list and turns rejection into null; null shows Create your team. A mounted account switch can retain the old code/team; a failed read can look like absent ownership. Team Share also passes an unhandled native promise. | Parent authorized the next focused fix: account/retry keyed lookup, explicit error and native Share rejection. At this snapshot pending; do not mark fixed until implementation/check evidence is appended. |
| P1 / 2 — Profile record and membership error meaning | `profile-tab.tsx` Season still uses legacy `usePastSessions`, which intentionally returns [] on error. Noncoach membership still uses the legacy data-only `useMembership`, which returns null on listener error. | Adopt state metadata and retry in these consumers; an error must not imply zero practices or require joining another team. Account snapshot isolation is already fixed upstream. |
| P1 / 2 — durable plan writes | `state/practice-plans.ts` persists through `AsyncStorage.setItem(...).catch(() => {})`; the staff ledger explicitly documents this limit. | Coordinate async persistence feedback so failed Save/Delete/active-plan writes are recoverable and retained drafts do not imply durable storage. Preserve existing API callers until migrated. |
| P2 / 1 — cold-open saved record destination | `practice-record.tsx` close fallback selects athlete Sessions even for a staff-origin link without navigation history. | Root owns adding role origin and choosing role-appropriate fallback; verify appearance parameter does not affect data access. |
| P2 / 2 — demo pairing persistence | `pair-band.tsx` marks local `bandConnected` and shows connected before `savePairing(...).catch(() => {})` completes. Demo provenance is visible, but an account write failure is hidden. | Keep demo meaning explicit; distinguish local demonstration connection from saved pairing and provide failure/retry when account persistence is requested. No real BLE promise. |
| P2 / 1 — notification request outcome | `notifications.tsx` catches permission errors as false then advances in finally, with no pending/failed outcome. | Verify deliberate denial/skip remains allowed; surface actual request failure and block duplicate requests without claiming alerts are enabled. Onboarding is cofounder-owned. |
| P2 / 1 — available-history caps | Coach Home reads up to40 finished practices but its calendar has no caller-level cap disclosure; shared calendar cannot prove complete older-month coverage. | Show a compact provenance note when the fetched window is full, then inspect an older month. Athlete Sessions already discloses40 and Profile discloses100. |
| P2 / 1 — month targets and long values | Profile ledger notes narrow seven-column month cells cannot all reach44 points; ListRow long serial/policy values have not been captured at large text. | Root runtime/AX check; offer accessible alternative navigation if actual targets/focus prove difficult. Do not certify target compliance from hit slop or source alone. |
| P3 / 1 — legacy preview content | Exported FieldCard uses fixed hourly readings and “Updated Now” based on a preference; current source usage is in dashboard development states, not the normal mapped Home. | Keep explicitly confined to review/sample context or retire dead compatibility content. Do not describe it as a production Home defect without a live route reproduction. |

No “200 screens,” hundreds of runtime passes, automated accessibility pass, polished-UI percentage or retention improvement is supported by this evidence. Add new runtime rows with exact role/tab/state, screenshot/AX artifact, actual interaction and result before increasing runtime coverage claims.
