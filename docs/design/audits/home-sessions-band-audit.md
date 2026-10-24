# Focused Home, Sessions and Band audit

October 23, 2026. Reviewed current iPhone 17 Pro Max build through Metro and Device Hub, with source reviews in parallel. Applied existing Apple writing/hierarchy research and WHOOP/Strava screen observations in this folder. No new component dependency was needed.

## Finding → change

| Screen | Observed problem | Implemented response |
|---|---|---|
| Band | Five tall signal rows precede the actual chart; selected value is repeated | Compact horizontal signal tabs above the selected analysis |
| Band | Simulation header chip, full provenance sentence, recovery status and work/rest each compete for space | One activity/source row; compact visible Simulated · 10× disclosure; omit duplicate header chip on this tab and the routine No recovery flag label. Actual slow-recovery guidance remains |
| Athlete Home | Band card repeats navigation and puts simulation prose under a heading | Flat separated section, one explicit View band action, compact source disclosure beside the section title |
| Coach Home | Team-sharing action competes with the active practice task | Keep sharing on Home during setup/no practice; Team retains sharing during practice |
| Trainer Home | Source caption adds a separate layer; empty row duplicates Monitor navigation | Source disclosure grouped into overview heading; one Monitor destination |
| Staff Home | Loading history appears empty; old session readings can become today’s peak | Explicit loading state; today overlay filtered by measurement date |
| Sessions | Duplicate recent-count footer and confusing calendar quantities | Count once; retain cap notice at40; label Days with readings and remove redundant third statistic |
| Sessions | Calendar selection has no saved-record navigation | Selected date exposes venue/time links to actual saved records |
| Sessions | Month switches can leave an unrelated selected date below the calendar | Selection follows shown period; missing readings say No saved reading, not No practice |

## Caption test
A smaller secondary label is useful if removing it changes interpretation: WBGT, units, sample provenance, measured age, peak versus current, venue/date and saved-record limits remain. Repeating a heading, describing an obvious control, or duplicating navigation is avoidable. “Simulated” is a source attribute, so it stays visible but its full explanation is on demand.

## Verified in the running build
- Athlete Home View band opens Band. Source disclosure opens and closes.
- All five Band signal selectors switch the actual analysis; selected states update. Skin temperature includes its simulation reference range.
- Calendar saved-record link opens Practice field with20min duration and2saved readings; Back returns to Sessions.
- Month navigation changes October to September and moves the selected date to September1; empty values are shown as missing saved readings.
- TypeScript, full-src ESLint and diff whitespace checks pass.

## Scope and limits
Screenshots are in `docs/screenshots/focused-audit/`. Fresh simulator checks cover athlete Home, Sessions and Band. Shared coach/trainer Home changes were source/type checked; a fresh multi-device, large-text and all-role visual matrix is not claimed. Source labels and medical rules are retained. No new library, commit or production deployment.
