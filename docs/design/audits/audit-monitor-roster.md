# Monitor, roster and athlete detail audit

Date: 2026-10-23. Scope: coach/trainer Monitor, shared athlete roster, and `/athlete-vitals`. This record distinguishes source review and executable checks from device verification. No screenshots, VoiceOver results, listener-error results or retention measurements are claimed by this audit.

## Implemented findings

| Screen / state | Evidence and harm | Change | Verification / confidence |
| --- | --- | --- | --- |
| Monitor / a new cue after check-in | `trainer-monitor.tsx`: the previous acknowledgement keyed athlete and scope without cue type; acknowledging recovery could hide a subsequent lost signal during the ten-minute acknowledgement window. Severity 2. | Store the attention kind with the check-in; only the same cue is acknowledged. Role, team and practice remain scoped. Existing thresholds and expiry remain unchanged. | Actual-source fixture checks cover matching cue, changed cue, changed role, changed practice and expiry. High confidence in helper behavior; device interaction pending. |
| Monitor / partially reporting roster | Count denominator used only athletes with an existing sample, making missing signals invisible in the ratio. Severity 2. | Fresh reporting count uses the approved roster denominator. All-stale summary shows dashes instead of an old average. | Source review; device partially reporting fixture pending. High confidence in calculation. |
| Monitor / stale readings | Historical recovery, effort and phase could distract from signal freshness. Severity 2. | Signal loss takes priority in attention; stale rows mask current numbers, phase and old recovery claims. Stale rows sort after fresh in Effort mode. | Actual-source stale-priority fixture and source review. Device stale fixture pending. |
| Roster / status and navigation | Small icon-only signal states made stale and absent signals hard to distinguish. Severity 1. | Explicit `Band live`, `Live · slow recovery`, `Signal stale`, `No band signal`; simulated source remains visible. Full name and destination chevron retained. | Source review and label fixtures. VoiceOver/narrow-width review pending. |
| Roster / missing join date | An unknown join date appeared as zero recorded days and could enter Under 14. Severity 2. | Unknown real counts show `—` and are excluded from that count filter. Explicit sample-team counts remain available. A simulated band alone does not make practice days known. | Actual-source fixtures cover unknown real, sample-team, simulated-band-with-unknown-date, and 14+ labels. High confidence. |
| Roster / empty and filtered views | Empty controls and a stranded no-results list add work. Severity 1. | Search appears at eight athletes or while a query exists; meaningful subset filters only, selected filter retained; reset clears query and filter together. | Source review. Query/filter/roster-change device cases pending. |
| Athlete detail / separate subscriptions | Staleness depended on the independently arriving roster view. Before it arrived a raw old sample could be treated as fresh. Severity 2. | Derive stale directly from the displayed sample's `updatedAt`, using the existing greater-than-two-minute cutoff; missing timestamp is stale. | Source review comparing the existing hook cutoff. Device delayed subscription case pending. |
| Athlete detail / unknown recovery | Raw `unknown` was labelled `No recovery flag`. Severity 2. | Display `Recovery status unavailable` separately from `No recovery flag` and `Slow recovery`. | Source branch review. Raw unknown device fixture pending. |
| Athlete detail / real practice records | Team practice dates were passed into a card that claims `Acclimatized` and full equipment at day 14. Recorded team dates do not verify attendance or completion. Severity 2. | Real detail shows the recorded count with an explicit attendance/completion caveat. Sample plan remains accessible through a labelled disclosure below vitals. | Source review; no changes to thresholds or protocol content. Device 0/14+/unknown cases pending. |
| Athlete detail / trainer Back fallback | With no navigation history the destination always selected coach Team. Severity 2. | Trainer fallback selects trainer Monitor; coach selects coach Team. Existing history still goes Back. | Source branch review; cold-open device case pending. |
| Athlete detail / single sample and stale rows | Fragment wrapped several direct ListRows, preventing Rows from separating each metric. Severity 1. | Metrics are direct Rows children; band identity is a separate context block. Zero sweat and oxygen handling retain null checks. | Source review; stale/single-sample device layout pending. |
| Athlete detail / large name and visual continuity | One-line name truncation, 44-point Back and a separate hardcoded canvas reduced consistency. Severity 1. | Wrapping title, 48-point Back, shared canvas. | Lint/typecheck; large text and long-name device review pending. |

## State checklist

Legend: **source** = inspected implementation; **fixture** = actual-source helper executed locally; **device pending** = no screen or AX proof captured by this agent.

| State / path | Status | Next verification |
| --- | --- | --- |
| Trainer and coach roster → detail | source; device pending | Open each role, verify title, chart, Back and active bottom tab. |
| Cold-open detail with no history | source; device pending | Confirm role-specific fallback. |
| Initial loading and no team | source; device pending | Confirm no premature no-athlete wording; listener errors remain a shared-hook limitation below. |
| Approved roster, no practice | source; device pending | Monitor/detail explain signals appear during practice. |
| Practice, no samples | source; device pending | Distinguish no samples from stale records. |
| One sample | source; device pending | All available metrics visible, absent fields dashes, no fake trend. |
| Multiple fresh samples | source; device pending | Charts correspond to the selected athlete/practice, units and timestamps intact. |
| Stale/missing timestamp | source + attention fixture; device pending | Numbers and trends masked, last-received time retained, stale status spoken. |
| Unknown recovery | source; device pending | “Unavailable” rather than a normal claim. |
| Mixed simulated and real sources | label fixture + source; device pending | Simulation disclosure remains visible; no clinical claim implied by a demo. |
| Under 14 / Live / Watch / query / zero matches | source; device pending | Counts match rows; reset restores all; filter remains escapable after roster updates. |
| Check-in / changed cue / expiry / team or role switch | fixture + source; device pending | Changed cue returns; check-in history remains scoped. |
| Long names, large text, 320-point width | source layout safeguards; device pending | Row wrapping, button fit, segmented labels, serials and metric values. |
| Reduced Motion | source; device pending | Spark final state visible immediately, no trace or enter movement; actual numeric samples stay still. |
| VoiceOver | source labels and targets; device pending | Row announces name/current state/source and destination; no decorative spark announcements. |
| Permission/listener error | source + hook lifecycle fixture; device pending | Distinct error with retry now implemented; reproduce real Firestore denial/offline behavior on emulators/device before calling end-to-end verified. |

## Checks actually run

- Targeted ESLint: `npx eslint src/components/trainer-monitor.tsx src/components/trainer-athletes.tsx src/app/athlete-vitals.tsx` — passed.
- TypeScript: `npx tsc --noEmit` — passed for the current shared workspace.
- `git diff --check` — passed at the batch checkpoint.
- One-off Node/TypeScript AST fixture harness extracted the actual `attention`, `checkInCurrent`, `practiceDayLabel`, `bandLabel`, `HR_MAX` and `hrPercent` declarations. Assertions passed for stale priority; missing signal; matching versus changed cue; role/practice isolation; acknowledgement expiry; unknown/sample/14+ practice-day labels; and stale simulated source. No implementation-mirroring test file added.

## Shared-state follow-up completed

`team-session.ts` now keys listener snapshots by account, role, team and session. It masks the previous snapshot immediately on scope changes and ignores stopped callbacks. Disable/re-enable and retry also create a fresh snapshot identity. Coach lookup and membership errors differ from no-team. New `useCoachDataState`, `useRosterState` and `useTeamVitalsState` expose status and retry; legacy data-only APIs remain compatible.

`past-sessions.ts` now offers `usePastSessionsState` with idle/loading/ready/error and retry. The legacy hook keeps its prior data/null/array contract. Actual practice-day readiness requires history status ready and a known join date. Failed history reads no longer count as known empty history in `useAthletes`. Recovery unknown is preserved upstream.

Monitor, roster and athlete detail consume these states: listener errors show a retry action; loading stays distinct from no samples or empty roster; unavailable day counts show a dash, leave Under 14 and cannot trigger a practice-day cue. Unknown recovery has explicit copy. Filtered empty results retain retry access when a dependent data source fails.

### Follow-up checks actually run

- ESLint on the three owned screen files and `team-session.ts`, `athletes.ts`, `past-sessions.ts` — passed without warnings after retry integration.
- TypeScript and `git diff --check` — passed.
- `/tmp/heatsense-state-check.cjs` transpiles the actual state modules and executes them with a deterministic hook lifecycle harness and mocked listeners. Passed account/team/session isolation, stale callback rejection, membership and coach lookup error versus no-team, disable/re-enable reset, roster retry error → loading → ready, history error versus empty, history retry and scope isolation, practice history readiness, unavailable join dates, unknown recovery preservation, and team loading state. This is a local behavior harness; it does not claim React Native rendering or Firebase emulator end-to-end coverage.

### Remaining device checks

Check serial/value fitting, long names and Segmented labels at large text, reduced-motion timing, VoiceOver announcements, role-specific cold-open Back, and emulator-backed permission/offline retry. No device or accessibility inspector pass is claimed by this agent.

No backend, permission, clinical threshold, dependency, analytics, commit or push changes were made in these batches.
