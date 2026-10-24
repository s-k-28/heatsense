# WHOOP references for HeatSense Protocols

Inspected in Chrome on October 23, 2026. The reference requested by the user is **WHOOP**, correcting the earlier “Loop” spelling. These are published product screenshots, not third-party concept designs. “Less vibe-coded” is a qualitative design judgment, not a measurable provenance score.

## Evidence

- [WHOOP on the App Store](https://apps.apple.com/hr/app/whoop/id933944389): the current screenshot carousel shows Sleep, Recovery and Strain detail screens. Observed: each screen gives one score the strongest emphasis and places its supporting metrics in compact, aligned rows below. The screenshots are App Store marketing creatives containing actual app UI; they are not a complete recorded flow.
- [WHOOP Health Monitor product article](https://www.whoop.com/us/en/thelocker/health-monitor-feature/): the article dated September 11, 2021 contains a readable Health Monitor screenshot. Observed: the live heart-rate number has a clear hierarchy, supporting metrics are secondary, status appears with the metric, and the health-report action is separate. Its old metric grid conflicts with HeatSense’s explicit no-grid rule and is not copied.
- [WHOOP Health Monitor & Report support](https://support.whoop.com/s/article/WHOOP-Health-Monitor-Report?language=en_US): confirms the overview-to-detail and separate export-report task structure. This is workflow evidence, not visual evidence for the current screen layout.

## Translation into HeatSense

The transfer is the task hierarchy and aligned rows, not WHOOP’s rings, colours, marks or product claims. The inference is that a sideline response tool benefits from the same separation of a main task from supporting details.

```text
Respond | Prepare | Tools

What are you seeing?       -> Response / Change
  Collapsed or confused      condition heading and progress
  Dizzy or exhausted         emergency call when applicable
  Cramping                   timestamped response steps
                             save response / clear

Cold-water immersion / Open timer
  [expanded: one clock, explanation, start/stop]

Incident log
  compact dated rows
```

Before: three pill choices, a large idle timer card and the incident history compete for attention. After: a grouped situation list opens a focused response checklist. The timer is a deliberate expandable tool and opens automatically for the heat-stroke response. It remains available for the same situations as before. The emergency call remains red; the timer uses the existing peach action colour. Daily readiness uses a single group of check rows and its existing animated progress. The calculator uses a single column of labelled fields instead of a 2×2 input grid.

Existing medical wording, timing constants, treatment steps, team persistence, incident sharing, reduced-motion helpers and UIL logic are preserved. No clinical advice is derived from WHOOP. No new dependency or copied asset is introduced.

## Deeper review: recorded screens already in the workspace

The existing `~/Downloads/WHOOP iOS *.zip` archives contain Mobbin-watermarked product captures. ZIP member timestamps are October 22, 2026; **that is an export timestamp, not a verified app-capture date or version**. No exact Mobbin screen URL is embedded in these files. They provide readable in-app evidence beyond the App Store marketing composites; they do not establish that the same layout is currently shipping. Images were inspected locally and are not copied into HeatSense assets or this repository.

| Archive and exact image | Observed UI | Appropriate HeatSense translation |
| --- | --- | --- |
| `Health monitor`, `WHOOP iOS Health monitor 1.png` | Live HR is the first reading. A calibration-progress message precedes the supporting metrics; unavailable skin temperature is withheld rather than invented. | State whether the band is simulated, missing, stale or uncalibrated before interpreting values. Do not imply a fixed reference range is personal. |
| `Health monitor`, `WHOOP iOS Health monitor 2.png` | Supporting metrics show current values and their comparison ranges. Skin temperature is a change from baseline, rather than absolute skin temperature. Export/report is a separate action. | Keep absolute skin temperature clearly labelled in HeatSense. A future baseline-change display requires real baseline data. Keep sharing separate from live monitoring. |
| `Health monitor`, `WHOOP iOS Health monitor 3.png` | Selecting a respiratory metric opens an explanatory sheet with that value, its personal range and the 30-day basis used for comparison. | A signal list can open one detailed graph/explanation, instead of putting every graph, summary and explanation on the same page. Show the basis of an estimated/reference comparison. |
| `Home`, `WHOOP iOS Home 5.png` | An empty Stress chart explicitly says no data and shows calibration progress. | A band without samples should show an honest empty state. Do not manufacture a normal-looking trace, healthy status or fresh timestamp. |
| `Home`, `WHOOP iOS Home 17.png` | Compact metric rows place the current value at the right and a smaller comparison value immediately below, with a direction marker. Weekly time-in-zone values carry a weekly label. | Use aligned values and an explicit comparison period for staff summaries. Do not add arrows unless the baseline and direction have a defined meaning. |
| `Home`, `WHOOP iOS Home 18.png` | A time-series chart includes a last-update timestamp, readable time ticks and an activity marker. A separate weekly chart compares dated strain/recovery points. | Keep sample freshness visible and separate from signal interpretation. A practice timeline should use the actual recording window and work/rest events; do not relabel wall-clock history as a longer simulated window. |
| `My plan`, `WHOOP iOS My plan 2.png` | A collapsed/expanded current-plan block has total progress, individual goal counts and one detail action. | On coach Plan, show the selected plan and work/rest constraints before the library. Keep rule-specific checks together. |
| `My plan`, `WHOOP iOS My plan 4.png` | Plan detail names the active plan, provides a date window, shows overall progress and puts a labelled goal line on a daily chart. | Use explicit practice duration and dates when reviewing a saved plan or session. UIL compliance is a set of constraints, not a proprietary score. |
| `Device & battery`, `WHOOP iOS Device & battery 0.png` | Connection identity and last sync sit above the device rendering; battery is separate from connection/sync. Status and advanced controls are separated. | Distinguish paired state, last sample and battery. HeatSense’s simulated fixed battery must not appear to be real BLE telemetry. |
| `Profile`, `WHOOP iOS Profile 1.png` and `3.png` | Identity and membership precede period-selectable highlights; activity summary has a real empty state. | Keep identity, practice records and settings distinct; preserve honest empty records instead of inserting sample achievements. |
| `Settings`, `WHOOP iOS Settings 2.png` | Account, device, application and privacy settings are separate destinations in a vertical list. | Group HeatSense settings by task. A profile overview need not show every notification switch and support item at once. |

### Concrete source comparison and priorities

These comparisons were made against the source tree on October 23, during a shared working session; other agents may subsequently correct them.

1. **One metric detail at a time.** `src/components/vitals.tsx` gives HR a hero, then `VitalCards` repeats HR and places five similarly weighted chart cards on the same screen. WHOOP’s overview-to-metric explanation is a stronger fit for athlete Band and the staff athlete detail route: a compact signal selector, then one selected chart and its context. This is a recommendation, not a claim that the recorded WHOOP screen already uses HeatSense’s proposed selector.
2. **Calibrated and reference ranges must remain distinct.** At inspection, `vital-cards.tsx` called the fixed `USUAL_SKIN = [91, 95]` a usual range. `vitals.tsx` and the real-data branch of `athlete-vitals.tsx` also used “usual range” solely when the recovery flag was not `watch`. WHOOP’s captures explicitly distinguish calibration from established personal ranges. HeatSense should label simulator/reference values honestly and avoid claiming personal normality from an absent flag. Parent is correcting these labels.
3. **Freshness belongs next to live values.** WHOOP’s device and chart screens make last-sync/update visible. The inspected `athlete-vitals.tsx` showed a numeric HR even when `useAthletes` marked its sample stale; a null update time also fell back to wording implying recency. Staff detail should preserve the same signal-lost/unknown state already present on Monitor, rather than making old data appear live. Parent was notified.

Additional boundary: `VitalCards` derives its horizontal window from the fixed 30-second `HISTORY_STEP_SEC`. That is appropriate for the deterministic simulator, but real observed samples may contain dropped intervals. Real charts should eventually derive timestamps from actual samples rather than claiming a continuous fixed-duration recording. No backend/data-model change was made for this recommendation.

### What is deliberately not transferred

- WHOOP’s recovery, strain, longevity and stress scores: HeatSense has no equivalent validated model or sensor history.
- Personal-baseline colours/ranges or calibration countdowns without the corresponding data and calibration process.
- Ring trios, 2×2 metric cards, promotional gradients, upgrade banners, badges or achievement screens. Their presence in a commercial app does not make them appropriate for a sideline safety tool, and several conflict with the project brief.
- WHOOP’s clinical interpretations, medical claims or treatment recommendations. HeatSense’s medical content remains independent of this visual research.
- Hardware gestures, sensor availability, device battery or sync status presented as implemented HeatSense features.

The reusable element is the relationship between current status, supporting evidence and the next action. The visual treatment continues to use HeatSense’s Barlow figures, sentence-case labels, Rows/ListRow, restrained surfaces, Fill and Segmented.
