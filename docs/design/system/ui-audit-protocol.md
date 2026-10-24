# HeatSense UI audit and return-loop protocol

This protocol evaluates observable interface and workflow quality. It does not assign a “vibe-coded percentage,” infer how an app was authored from its appearance, or treat an agent's aesthetic opinion as user research.

## Source grounding

The following summaries came from the parent agent's Chrome research. The author of this protocol did not independently browse these pages.

- [Nielsen Norman Group: ten usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/): use status feedback, consistency, minimalist content, and useful error handling to assess concrete decisions and outcomes.
- [Expo: professional design principles in AI app development](https://expo.dev/blog/how-to-apply-professional-design-principles-in-ai-app-development): use its eight visual principles and screenshot critique as a structured design-review framework. The article does not establish the provenance of any HeatSense screen or a causal effect on retention.
- [Apple Human Interface Guidelines: writing](https://developer.apple.com/design/human-interface-guidelines/writing): keep the words needed for the task, name actions with verbs, and make empty states useful.

Reference screenshots from WHOOP and Strava are comparison evidence for specific patterns, not a guarantee that copying a pattern will improve HeatSense. The user's current Home direction explicitly includes an orb and three rings for all three roles. Audit their meaning, behavior, hierarchy, and motion rather than treating their mere presence as a defect. Welcome and onboarding retain their separate design ownership.

## 1. Make each run reproducible

Use the Firebase emulators and `scripts/seed-emulator.mjs` for persisted workflow checks. Sample mode is suitable for layout and simulated-band inspection; it cannot establish successful real-team writes. Never mark a save task passed merely because a sample screen looks correct.

Record the following before the run:

| Field | Required record |
| --- | --- |
| Build | Git commit, changed working-tree paths, platform/build identifier |
| Environment | Emulator or sample mode; test fixture/seed revision; app and simulator versions |
| Surface | Device, logical viewport dimensions, text scale, display units, Reduce Motion setting |
| Identity | Test role and fixture account ID; approved/pending/declined membership |
| Data | Team/session fixture IDs, practice start, latest measurement time, zone/class, recheck interval, acknowledgement state |
| Time | Run start and capture timestamps, timezone, fixture offsets |
| Task | Script ID, expected persisted outcome, starting route/tab |

Use the same fixture, task order, and settings for the before/after comparison. Record countdown capture times rather than requiring identical clock text. Check the expected deadline and allow for the existing display-update interval. Capture a screenshot and accessibility tree at the start, decision point, pending/error state when applicable, and completed result.

Suggested artifact names: `audit/<run-id>/<role>/<task>-<state>.png` and `.ax.txt`. Each completed task also needs the relevant emulator record or read-only service evidence. Keep the test data local and synthetic.

## 2. Repeat the same task walkthroughs

| ID | Starting state and actions | Observable success |
| --- | --- | --- |
| C1: first reading | Coach with a team and no practice → start practice → open reading entry → save a fixture reading → review and acknowledge guidance | First reading is due immediately. Exactly one reading is saved; displayed zone matches the existing classifier fixture; acknowledgement persists. Home, sheet, and record agree |
| C2: recheck | Active practice with an acknowledged reading → approach the due time → open the correct recording action → save the next reading | Deadline follows measurement time, not screen-open time. The new reading updates the record, guidance state, and next deadline without deleting earlier readings |
| C3: finish and retrieve | Coach ends practice → opens heat history → selects the saved practice | The same practice and complete readings reopen. The record is useful without invented freshness, missing readings, or a dead row |
| T1: band follow-through | Approved trainer → Home band overview → Monitor → named athlete → return → check in | The correct athlete and role reach the detail route. Fresh, stale, simulated, and slow-recovery states agree. A check-in affects the current session and does not suppress a future session's flags |
| T2: trainer recording | Approved trainer with open practice → log a reading and acknowledge guidance | Trainer can complete the authorized recording flow. Start/end controls remain coach-only; denied writes produce useful feedback |
| A1: access transition | Athlete pending membership → coach approves fixture request → athlete Home | Waiting state explains the next step. Team readings appear only after approval; athlete has no staff recording controls |
| A2: personal detail | Approved athlete → read today's guidance → expand full rules → open Band, or pair when unpaired → return | Values retain source labels. The athlete can distinguish field conditions from personal band signals. Practice-day counts are not represented as verified attendance or protocol completion |
| R1: resume and retry | Save a reading → restart or switch tabs → reopen Home; repeat with a failed save and a repeated tap | Saved state and measurement-based deadlines persist. Failure is visible and recoverable; retries do not silently create duplicate records |

Use the current classifier self-check fixtures for boundary cases rather than inventing new thresholds during UI review. No test task should trigger a real emergency call, contact other people, or enter live-account credentials.

## 3. Cover states without testing every combination

Use pairwise coverage plus explicit high-consequence cases. Log the actual state exercised; a screenshot of a different state is not a substitute.

| Dimension | States to exercise |
| --- | --- |
| All three Home roles | Loading; no team or pending membership; no active practice; active practice with no reading; fresh reading; overdue reading |
| Staff record | Mixed acknowledgements; all acknowledged; failed save; busy action; duplicate tap; history reopened after restart |
| Trainer bands | Empty roster; approved athletes with no sample; fresh samples; stale samples; fresh slow-recovery flag; simulated data |
| Athlete context | Pending/declined/approved; paired/unpaired; simulated personal signals; history loading/available/empty |
| Layout | Current iPhone size; narrow 320–375 pt width; default and approximately 200% text scale |
| Motion | Normal and Reduce Motion; repeated live updates; background/foreground; tab return |

For large text, prioritize complete content and usable vertical scrolling over fitting every item into the same viewport. At default text size, the urgent next action should be discoverable without hunting through unrelated modules.

## 4. Judge coherent UI with observable criteria

For each task, record completion, time to correct action, taps, backtracks, accidental actions, data contradictions, clipped content, and whether help was needed. Report the counts and sample size. Agent completion is a functional audit result, not evidence that representative coaches or athletes will behave identically.

The interface passes when:

- The full field reading has an authoritative value, unit, source/freshness context, and consistent zone across destinations. Repeating it in a saved record can be necessary; repeating the same hero in several navigation layers needs a task reason.
- Zero, unknown, loading, stale, and no-practice states remain distinct in both visible text and accessibility output.
- Each ring has a truthful quantity and denominator. A readings-distribution ring is not an invented daily target; practice days do not imply attendance or verified acclimatization. Each disclosure adds useful information rather than restating the label.
- One primary action serves the current task. Supporting navigation, disclosures, and destructive actions have consistent roles and labels. A busy state identifies the operation actually running.
- A surface groups related content. Count repeated facts, simultaneous control types, equal-weight sections, nested card surfaces, and captions that merely repeat their heading. These are review signals, not an automatic aesthetic score. Units, freshness, and source labels remain when they prevent ambiguity.
- Information hierarchy makes the decision clear before secondary history and settings. Tap targets, large text, keyboard behavior, the floating tab bar, and focus/accessibility labels remain usable.
- Motion explains a state change, response, or intentional Home character treatment. Live values do not bounce or repeatedly redraw. Recheck updates do not refill from zero on every tick. Reduce Motion preserves the meaningful final state.
- The result persists and can be resumed. A pleasing arrival animation never substitutes for a successful write, useful feedback, or a working destination.

Compare before/after using the same task and state. Removing cards or captions is not a pass if guidance disappears, the correct action becomes harder to find, or the result can no longer be retrieved.

## 5. Finding template

Copy this template for every proposed change. A finding without evidence is a hypothesis awaiting verification.

```text
Finding ID / short name:
Run ID / build / working-tree revision:
Exact screen, role, route, tab, and fixture state:
Reproduction steps:
Screenshot path + capture timestamp:
Accessibility-tree path + relevant element/label/state:
Code source: path, symbol, line at the recorded revision:
Expected behavior and supporting contract/source:
Observed behavior:
User task affected / concrete harm:
Proposed disposition: remove | rewrite | move on demand | fix flow
Smallest proposed change:
Severity (0–3) + reason:
Confidence: high | medium | low + evidence basis:
Before verification: task result, taps/backtracks, persisted state:
After verification: same fixture/task, result, evidence paths:
Remaining uncertainty / human validation needed:
```

Use **remove** for redundant material, **rewrite** for necessary but unclear copy, **move on demand** for relevant secondary detail, and **fix flow** when navigation, permissions, persistence, feedback, or recovery is wrong. Do not choose removal merely because it makes a screenshot quieter.

### Severity and confidence

| Severity | Observable meaning |
| --- | --- |
| 0 | No demonstrated task impairment, or intentional behavior consistent with the current brief. Record as a preference/hypothesis; do not inflate it into a defect |
| 1 | Local clarity, readability, or consistency problem. The user can complete the task directly and the result remains correct |
| 2 | Material task friction or a recoverable failure: hidden next step, repeated backtracking, clipped control, misleading pending state, or a workflow requiring a workaround |
| 3 | Incorrect consequential information or outcome, lost/duplicated records, falsely current stale data, an unusable essential action, or a broken role boundary. Stop the affected release task until corrected and reverified |

Confidence is separate from severity: **high** means reproduced with matching screenshot/accessibility/persisted-state or code evidence; **medium** means directly observed once with a credible task mechanism; **low** means an inference from static appearance or incomplete state. Do not translate confidence into a made-up percentage. A severe but uncertain issue calls for focused reproduction, not certainty by assertion.

## 6. Measure useful return loops

HeatSense is practice-driven. App opens, time spent watching an orb, daily streaks, and notification clicks alone do not establish product value or healthy retention. Proposed measurements below are not currently instrumented analytics.

| Proposed measure | Definition and denominator |
| --- | --- |
| Activation | Teams completing a first practice with a saved field reading and acknowledged guidance / eligible teams attempting that first workflow |
| First-reading delay | Time from practice creation to the first successful persisted reading. Measure separately because the initial reading is due immediately; it is not a later-deadline recheck opportunity |
| On-time recheck completion | Subsequent due episodes followed by a successful saved reading by that episode's measurement-based deadline / eligible subsequent due episodes. Censor episodes when practice ends before the deadline; do not create repeated opportunities merely because the same overdue screen reopens |
| Next-practice return | Activated teams completing the workflow at their next observed eligible practice / activated teams with an observed next eligible practice. Without a practice schedule or later opportunity, absence is unknown, not churn |
| Trainer follow-through | Eligible fresh band-flag episodes followed by the relevant detail/check-in task / observed eligible episodes. A checked-in control is a workflow action, not evidence of a clinical outcome |
| Record retrieval | Attempts that open the intended saved practice and its readings / observed retrieval attempts |
| Useful reminder completion | Eligible reminder opens followed by the correct persisted task within a predefined task window / eligible reminder opens. Report this with completion and error measures, not notification opens alone |

For action timeliness, use a successful persistence timestamp when available; do not let backdating the measurement make a late interaction appear prompt. Measurement timeliness and entry timeliness are different quantities. Existing records may not contain every timestamp needed, so do not retrospectively invent an event history from screenshots.

Guardrails include duplicate submissions, overdue duration, incorrect or stale values presented as current, role errors, failed writes, repeated navigation, and notification-disable behavior. Keep sample sessions separate from real-team cohorts. Report team-level counts and the eligible opportunity definition, especially with a small sample.

No analytics package, event pipeline, or retention experiment is installed by this document. For now, the audit can use local task logs and emulator records. If instrumentation is authorized later, propose minimal successful-outcome events and timestamps first, with explicit cohort/window definitions. A before/after visual comparison or higher engagement cannot establish that a design caused retention; causal claims require an appropriate study and sufficient observed data.
