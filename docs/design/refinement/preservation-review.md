# Refinement preservation review

Baseline: `04f3831` (before full refinement). Compared that commit with HEAD plus current working files on 2026-10-23. This is source/fixture evidence, not a pixel-identical or native runtime certification. Global typography, neutral surfaces and surrounding layout are authorized differences.

## Confirmed preservation

- `src/services`, `src/state` and `firebase` have **no diff** from baseline: authentication service contracts, stored data/payload logic, subscriptions, authorization rules and persistence implementations are unchanged. In `src/lib`, only the authorized motion entry timing/stagger implementation differs; UIL/heat thresholds, scheduling, simulator, recovery and plan calculations are unchanged.
- `ui/charts.tsx` changes only the Text import to the shared wrapper. Comparing every non-import TypeScript declaration confirmed identical chart implementation, types, coordinates, ranges, fills, strokes and interaction code.
- BodyStrip's `items`, calendar's `tone`/`sameDay`/`dayOf`, and VitalCards' completion/axis/average/format helpers, zone definitions and simulated skin reference match baseline. Comparing every pre-existing variable initializer inside HeartRate/SkinTemp/Sweat/Movement/BloodOxygen confirmed the data/aggregation/range/formula calculations match.
- Semantic palette values remain exact: coral/peach, safe, caution, warning, emergency, info and the four deep zone colors. Original Home/Plan metric peach is independently pinned to `#FFAD83`; brand/control palette changes cannot recolor those marks.
- BodyStrip and calendar changes add larger-text stacking/scrolling/date targets; VitalCards adds neutral Surface wrappers and responsive labels/figures. These change containers and accessible layout, not the underlying chart types, peak/date calculation, original zone colors or metrics.

## Neutral metric drift found and corrected

Changing text tokens had also changed a few encoding marks indirectly. Root authorized bounded color-only corrections after the initial read-only review:

| Mark | Baseline value now explicitly pinned |
| --- | --- |
| Home absent-reading ring tone | `#7E8587` |
| Team pulse roster metric/rail | `#F7F6F2` |
| Team pulse zero/unknown watch metric/rail | `#B7BCBE` |
| Fresh non-watch Monitor sparkline | `#B0BAC0` |
| Home missing-day chart bar | `#222728` |
| VitalCards oxygen gauge position marker | `#F6F3EC` |

No formula, status, range, threshold, handler, layout or metric timing changed in this correction. New body/label ink, surfaces and selection outlines remain part of the authorized design system.

## Checks and limits

Executed `/tmp/heatsense-preservation-check.cjs` against actual source and baseline Git blobs: all listed assertions passed. Focused ESLint and full TypeScript were also run for the three color-correction files. Root owns browser/native QA and its screenshot ledger; this review did not open screens or test OS permissions, authentication, hardware, notifications, database writes or accessibility APIs.

A universal “all behavior unchanged” claim would be inaccurate: refinement work elsewhere includes profile dialogs and onboarding/sign-in/pairing retry, busy and callback-lifetime fixes. Those UI changes are visible in the baseline diff; they do not modify the unchanged service/state/Firebase contracts above. Their owner ledgers and root's runtime QA are the appropriate evidence. The local `ios/Podfile.lock` environment diff is outside this review and must stay out of product commits.


### Subsequent browser-flow correction

Root reproduced Reanimated web layout builders retaining absolute roster-row styles after resize, collapsing list height and obstructing row taps with floating navigation. `lib/motion.ts` now returns undefined for enter/swap/leave/settle on web. Native builder types/durations, reduced-motion behavior, page/press/segmented motion and chart-engine calculations remain intact. Actual-module platform fixtures plus lint/TypeScript passed; root owns fresh-load geometry/navigation retest. This browser-only layout exception is intentional and does not change auth, services, state or chart behavior.
