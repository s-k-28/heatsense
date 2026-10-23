# Protocols, Learn and Alerts audit — October 23, 2026

Scope: `protocols-tab.tsx`, `learn-tab.tsx`, `alerts-tab.tsx`. This is a source-level audit and implementation record. The root agent owns Device Hub and runtime screenshots. No runtime interaction or accessibility audit result is claimed here. Rossark motion skill and project `MOTION.md` were read; existing motion/components are reused.

## First batch: findings and changes

| Finding from inspected source | Implemented change | Limit of evidence |
| --- | --- | --- |
| Eight hydration swatches used `flex: 1`; at a 320-point screen minus outer/card margins, individual targets could be much narrower than 44 points | Minimum 44-point width and 56-point height, wrapping into numbered rows on smaller screens; original color order and threshold mapping retained | Layout styles verified; physical screen and large-font captures pending |
| Symptom choices remained two columns at large text | One column below 360-point screen width or font scale above 1.2; all symptom strings retained | Source only; actual OS accessibility sizes pending |
| Protocol checklist timestamps reduced remaining instruction width | Timestamp sits below instruction in a flexible copy column; checkbox still controls the same timestamped record | Source binding inspected; completion/uncompletion runtime pending |
| Protocol headings, timer heading and action rows competed for horizontal space | Flexible/wrapping heading/action rows; calculator result items can stack | Source only; localized/large-text capture pending |
| Five UIL selector buttons conveyed identity only by color | Every zone now has its full label, color dot, neutral surface and explicit selected border; screen-reader label retains latest-field identification | Same zones, ranges and rules; exact rendered sizing pending |
| Alert title and timestamp competed on one line | Timestamp/source sits below title | Source only |
| Null practice data displayed an apparently empty Alerts screen | Explicit practice-data-unavailable state; no invented refresh action | The current hook combines loading and unavailable/error into null; UI does not claim to distinguish them |
| Simulated alert signals could appear with no simulation label when sample field mode was off | Signal alert metadata now labels Simulated or Band from record provenance; incoming real-team signal time uses `sampledAt` | No detector or recovery thresholds changed; runtime data variants pending |

Earlier batch retained: shared Clear selection action, press feedback for hydration and Call 911, checklist confirmation from scale 0.9, and readable incident Share affordance. No extra idle loops were added. Live timer text stays still. Reduced Motion is respected by the reused components; live preference updates in shared infrastructure are reviewed by the root agent.

## State checklist

“Inspected” means the branch and handler were read in source. It does not mean the action was exercised on a device.

| Surface/state | Source evidence | Runtime status |
| --- | --- | --- |
| Respond initial situation list | Three ListRow destinations; correct situation key passed | Pending |
| Respond heat stroke | Original five steps, emergency action and auto-open immersion timer retained | Pending; never place a real emergency call during testing |
| Respond exhaustion | Original six steps and tone retained | Pending |
| Respond cramps | Original four steps retained; immersion section hidden in this state | Pending |
| Step selected/unselected | Checkbox state follows timestamp map; toggling removes/re-adds timestamp | Pending |
| Change response / Clear | Existing handlers reset checklist; Clear also resets clock | Pending |
| Timer closed/open | Expanded state and header action remain bound to timerOpen | Pending |
| Timer idle/running/stopped/restart | Original clock timestamps, 30-minute fill denominator and 5-minute check cadence retained | Pending |
| Save disabled/enabled | Disabled before steps or timer start; original incident payload and save handler retained | Pending |
| Incident empty/populated/share | Existing log source, latest records and native Share payload retained | Pending; cancel native share normally |
| Prepare checklist partial/complete | Original six checks, count, fills and timestamps retained | Pending |
| Emergency plan absent/partial/full | Existing fields and Not set values retained | Pending |
| Emergency plan edit/save/cancel | Existing draft and persistence functions retained | Pending |
| Emergency plan share | Existing six-field payload retained | Pending |
| Calculator blank/partial | No result until original validity condition is satisfied | Pending |
| Calculator valid/weight gain/loss | Original numerical formula, units, warning boundaries and advice retained | Pending |
| Calculator keyboard / Done | Existing decimal-pad and dismiss handler retained | Pending |
| UIL five selections/current reading | Same ORDER and UIL_GUIDANCE/zoneRange lookups | Pending |
| Learn none/single/multiple symptoms | Original severity precedence severe > moderate > mild retained | Pending |
| Learn clear | Shared text action resets selected array | Pending |
| Hydration each of eight selections | Original index mapping and selected accessibility state retained | Pending |
| Learn emergency help absent/present | Existing saved-plan rows retained; no invented help locations | Pending |
| Alerts practice unavailable | Explicit separate branch when useCoachData returns null | Pending |
| Alerts no practice / no open / no resolved | Distinct existing text states retained | Pending |
| Alerts overdue / unapplied / plan mismatch | Existing item generation and real destinations retained | Pending |
| Alerts simulation / incoming records | Explicit source metadata; measured timestamp on incoming records | Pending |
| Alerts resolve / resolved zone changes | Existing resolve keys, local resolution dates and history ordering retained | Pending |
| Narrow screen / large text / reduced motion | Responsive styles and existing reduced-motion guards inspected | Pending on all three surfaces |

## Validation performed

- Targeted ESLint passed for Protocols, Learn and Alerts after first layout and safety-status batches; latest verification is recorded in handoff to the root agent.
- Full `npx tsc --noEmit` passed after the first layout batch.
- `git diff --check` passed after the first layout batch.
- A literal source comparison against HEAD confirmed unchanged symptom/advice/hydration strings, Protocols situation steps, readiness/EAP constants, timer constants and sweat-calculation block. This is preservation evidence, not medical validation.
- No new test suite mirrors these reversible style changes. Device interaction remains necessary for native Share, emergency dial confirmation, keyboard behavior, selected-control visibility and large-text layout.

## Further candidates / constraints

1. **Addressed by coordinated second batch:** root agent keyed shared safety state by account/team/day and added explicit status, saving, retry and boolean save results. Owned UI now renders loading/error/unavailable separately, retries actual subscriptions, and closes/resets a form only when its save returns true. This is source/check evidence; live failure/retry still needs runtime exercise.
2. **Fixed in second batch:** Respond component stays mounted across Respond/Prepare/Tools; inactive Respond returns null after hooks, so its UI, fills and accessibility controls unmount while response timestamps/checks persist. The functional one-second clock remains active only when running. Switching subtabs no longer discards the response. This does not persist through dashboard-tab unmount or app restart.
3. **Addressed in third batch:** Change situation intentionally preserves the current cooling clock, including when Cramping is selected; an existing clock no longer disappears in that case. New response is an explicit discard boundary with confirmation when steps/timer exist. A successfully saved response still resets. Clinical timing content remains unchanged.
4. **Addressed in third batch:** rejected native Share promises show a failure alert and leave records intact. Resolved dismissal/success return silently; the app does not assert delivery or completed export.
5. **Addressed in third batch with root authorization:** strict nonnegative decimal input, zero-required-value errors, the existing weight-combination boundary, and negative computed-sweat feedback prevent misleading results. Blank fluid input still means zero. The original sweat/rehydration formulas, advice and warning thresholds are unchanged.
6. **Addressed in third batch:** local alert resolution is scoped to account/team/practice as well as item ID. It remains view-local and is not represented as durable/shared reporting.
7. All runtime tasks above remain open until the root agent records actual device evidence. No full-app, Inspector, or clinical pass is implied.

## Second batch: safety state and save feedback

The root agent changed `state/emergency-plan.ts`; this agent changed only the three owned UI files and this record.

- Incident log: loading/error/unavailable are explicit; retry uses the hook. Save is disabled without a ready record, shows saving feedback, and resets the response only on successful persistence. Clear, Change and step edits are blocked while a save is pending.
- Readiness: do not render unchecked fallback rows while the record is loading/error/unavailable. Show saving feedback and disable checks during pending writes, preventing rapid toggles from racing a whole-record save.
- Emergency plan: loading/error/unavailable are explicit; Set up/Edit appear only when ready. Save waits for a true result; failure retains draft and editor. Fields and Cancel are disabled during pending save. Draft editor visibility is bound to account/team identity, preventing an old draft from becoming the new team's edit form.
- Learn: saved emergency-plan help now distinguishes unavailable/loading/error from an actually empty plan. Retry is available for failed subscription.
- Respond: state survives Protocols subtab switches; hidden controls and animated fill are unmounted. All clinical instructions/timing constants remain unchanged.

Runtime requests for root: active timer → Prepare → Tools → Respond; partial checklist across that route; failure and retry on plan/log/checks; blocked duplicate saves; long venue/hospital/caller; 320-point width and accessibility text sizes; all hydration selections; each UIL selector's non-color identification. No device pass has yet been received.

## Third batch: identity, deliberate reset, calculator and sharing

Only Protocols, Alerts and this audit record changed in this batch. Learn is reserved for the root agent's athlete styling work.

- Respond now wraps its stateful session with an account/team key. A confirmed account/team change unmounts the prior session, cleans up its interval and prevents its unsaved data being saved into the new team. A transient null data/error state retains the last resolved scope for the same UID; saving remains unavailable while the current team is unresolved. Before the first team resolves, the unassociated scope is separate and does not silently migrate into a team record.
- Change situation keeps cooling timestamps; checked steps reset because different situations have different steps. An existing cooling clock stays visible even in the Cramping view. New response confirms discarding unsaved steps/time; successful incident persistence also clears the response.
- Calculator input accepts ordinary decimal digits, a decimal point or comma, and surrounding whitespace. It rejects pasted suffixes, exponent notation, nonfinite values and negative values. Required weights/time must exceed zero. Partial blank required fields produce no result; blank fluids retains the original zero default. Inconsistent weights or a negative computed sweat amount show specific input feedback. No new clinical limits or rounding rules were introduced.
- Native sharing distinguishes a resolved dismissal from a rejected operation; cancellation is silent, rejection produces an error, and the saved record remains untouched.
- Alert resolution dates are shown only when their UID/team/practice scope matches the current context.

Behavior checks use TypeScript AST extraction of actual source functions/expressions with Node VM and native Share/Alert stubs; they do not mount React Native or simulate OS UI. Results: 36 assertions for parsing/input feedback/actual formula output/share dismissal-success-rejection; 12 assertions for situation changes and deliberate discard; 7 final identity cases including transient unavailability; 4 alert-resolution scope assertions. Earlier five owner assertions were rerun with the final seven-case version. No permanent implementation-mirroring test suite was added.

Clinical preservation check: situation instructions, readiness/EAP constants, immersion constants and six numerical formula/warning statements match HEAD verbatim. Input acceptance/validation changed intentionally; calculation formulas and clinical advice did not.

Runtime still pending: response/team switch, transient outage with running clock, New response keep/discard, native Share cancel/failure, real keyboard/pasted values, and scoped alert Resolve across practice changes. Repeated lint/typecheck/diff results are reported to root; these are source/behavior checks, not a device or Accessibility Inspector pass.
