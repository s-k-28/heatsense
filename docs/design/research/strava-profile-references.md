# Strava → HeatSense profile

Reviewed in Chrome on October 23, 2026. These are product references, not mockups or claims about how either app was coded.

## Evidence

- [Strava’s official iPhone App Store listing](https://apps.apple.com/us/app/strava-run-bike-walk/id426826309): the “Improve with personalized data” creative contains a real Progress screen. Observed: date-period choices sit above primary activity totals and a single chart; quieter detail follows below. The “Lift it. Log it. See your gains.” creative shows an activity with an unboxed numeric summary. The App Store images are marketing creatives containing app screens, not an interactive recording.
- [Viewing Your Activity History on Strava](https://support.strava.com/en-us/articles/15402014-viewing-your-activity-history-on-strava): official documentation confirms the mobile You → Progress structure and a selectable date range. It also describes activity history and filtering.
- [Your Strava Profile Page](https://support.strava.com/en-us/articles/15402175-your-strava-profile-page): official documentation separates identity, activity overview, and period-based stats. This article describes the web profile. Its visible “My Stats” image uses a plain table with section labels. The older full profile image failed to render, so no detailed visual claim is based on it.
- [Uiland’s Strava profile category](https://uiland.design/screens/strava/screens/185fbe68-2a25-435f-b770-c034e0c89a51/screen-type/my-account-profile): the inspectable first screen is from Following athletes, not an adequate visual source for profile settings. Other visual details could not be verified. This source did not determine the implementation.

## HeatSense comparison and translation

| Before | Applied translation |
| --- | --- |
| Centered oversized avatar, repeated identity text, followed by every preference | Compact left-aligned identity with a clear Edit affordance; Overview and Settings separate two different jobs |
| Three equal-weight stat rows in another rounded card | A period-first practice record, one primary practice count, then two quiet rows for hours and peak WBGT |
| Season data with no sample marker | Sample data labelled beside the record it describes |
| Device card claims “synced just now” using simulated values | Device row explicitly says Simulated; pairing and battery presentation remain available |
| Full outlined destructive button beneath long settings list | Existing destructive ListRow within the settings view |

Overview/Settings is our interpretation of Strava’s separation of identity, progress and configuration, not a claim that Strava uses these exact two labels. HeatSense retains its own canvas `#101416`, surface `#1A2024`, ink `#F6F3EC`, muted `#B0BAC0`, coral `#FFB183`, system text, and Barlow Condensed figures. Existing `Segmented`, `Rows`, `ListRow`, `SampleTag`, `Fill` and `FloatingBand` are reused.

All profile actions remain: edit name, select/remove photo, team creation/join, trainer list, band pairing, date-range selection, notifications/test alert, units, practice clock, sample athletes, help/privacy explanations, and sign-out. Unsupported previous-period comparisons were removed in the follow-up below. No package or backend changes.

## Validation

`npx tsc --noEmit`, `npx eslint src/components/profile-tab.tsx`, and `git diff --check -- src/components/profile-tab.tsx` passed. Parent agent owns the Device Hub visual review for all three roles, including the settings view, long identity text and an unpaired athlete.

## Deeper cross-screen review (research only)

The user subsequently requested deeper WHOOP/Strava research before further implementation. The recommendations below are proposals, not additional code changes. The three original research tabs closed after the first completed agent turn. Parent created one shared Chrome research session; cross-agent tab ownership prevented this child from controlling the root-owned tab. Further screenshot capture is coordinated through the parent to preserve the single-session request.

### What the verified Strava screens actually contribute

1. **Progress is a destination, not decoration.** The official iPhone Progress creative shows a period selector, totals, then a chart. The official activity-history article confirms the date-range and sport context. This supports keeping HeatSense's trend exploration in a deliberate history/detail destination rather than repeating miniature charts everywhere.
2. **The activity itself supplies the hierarchy.** The official strength activity creative has an activity title and a small collection of unboxed measurements beneath the main workout visual. This supports summary facts attached to a specific practice, rather than unrelated “dashboard metrics.” It does not support copying Strava's map or muscle illustration into HeatSense.
3. **Lists and summaries answer different questions.** The official documentation separates activity search, progress summaries, calendar browsing and profile statistics. Filtering an actual history is useful; presenting search, tabs and filter chips before any records exist is not established by this evidence.
4. **Social context remains attached to a record.** The official community/feed creative visibly shows an activity title, author, timestamp, a compact numeric summary and activity content. HeatSense can use identity/time/source context on practice records without importing likes, competitive leaderboards or an engagement feed into a heat-safety workflow.

### Proposed translations by role and destination

| HeatSense destination | Useful Strava reference | Specific translation to evaluate | Avoid |
| --- | --- | --- | --- |
| Coach Home | One activity summary and a clear next destination | Latest field measurement, its actual age, due status and one next action; today's timeline below | Permanent onboarding cards, duplicate statistics, a second competing hero |
| Coach Plan | Record-bound details, selected period context | Selected plan as a readable schedule; show only concrete failures against current UIL rules with a repair action | Repeating the full WBGT hero and a second complete rule chart |
| Coach Team | Identity attached to readable records | Roster and live monitoring remain separate tasks; team code and pending approvals grouped above roster when relevant | Decorative activity feed, likes or rankings |
| Athlete Home | A concise summary that leads into detail | Field guidance first; one compact personal-band entry leads to the Band destination | Staff acknowledgement counters or a duplicated practice-history dashboard |
| Athlete Band | Activity analysis / Progress chart hierarchy | A selected signal with one readable time series and contextual units/range; remaining signals become deliberate drill-ins | Five equal-weight chart cards in a wall, or decorative gradients standing in for signal meaning |
| Athlete Sessions | Activity Search and Training Calendar | Calendar/date context, then consistent chronological rows that open an individual practice record | One large three-stat card for every previous practice |
| Athlete Learn | No directly analogous verified screen | Keep learning task-based and derive the education interaction from HeatSense needs; use restrained rows/disclosures for explanations | Pretending Strava provides a medical symptom workflow |
| Trainer Monitor | Record rows and focused numeric summary | Stable athlete rows with name, current signal, freshness and one reason to act; exceptions above the full list | Competitive ranking, continuously reordering rows, charts without a useful scale |
| Trainer Athletes | Activity Search's principle of contextual filtering | Readable names and key acclimatization/band state; search/filter when the actual roster needs it | Empty controls and three layers of filtering for four names |
| Trainer Protocols | No directly analogous verified screen | Ordered actions and useful timestamps may share record typography, but the emergency flow requires its own hierarchy | Copying fitness progress rings, social motifs or celebratory completion UI |
| Profile for every role | Identity plus a separate Progress destination | Quiet account identity, real practice record, configuration in its own view | Treating profile as a second Home dashboard |

These are design inferences from the verified references. They are not assertions that Strava contains coaching plans, heat protocols, a live team-health monitor or medical guidance. Safety content and thresholds remain HeatSense-specific.

### Open visual evidence to collect before another redesign

- A directly inspectable mobile activity detail screen with its lower analysis sections, not only an App Store creative.
- A directly inspectable mobile activity-history list and its filter state.
- A directly inspectable club/member list to determine whether its density and identity treatment help HeatSense's roster.
- Current WHOOP signal detail and journal/check-in examples (parent-led research).

Do not infer these missing layouts from app popularity, a source title, inaccessible previews, or memory. Existing official help images include older web screenshots; they are historical references and do not establish today's iPhone layout.

### Additional official documentation (text evidence, not new Chrome screenshots)

- [Activity details and privacy](https://support.strava.com/en-us/articles/15401987-how-do-my-activity-privacy-controls-work-on-strava): confirms that an individual activity has a dedicated details destination, with date/time, statistics and analysis. **Translation:** HeatSense's practice list should eventually open the saved practice and its readings, not end at a peak number.
- [Clubs on the Mobile App](https://support.strava.com/en-us/articles/15401837-clubs-on-the-mobile-app): documents separate club Overview, Activities and Stats destinations, an explicit pending-request review, and a member list. **Translation:** coach Team should keep membership administration separate from live vitals; pending requests are a concrete task rather than a permanent card. This source does not verify row geometry, colours or density.

Both documents are current official text retrieved during the follow-up research. No new visual layout claim is based on these text-only pages. Parent retains sole control of the shared Chrome session for screenshot evidence.

### Highest-value remaining mismatches in the current HeatSense code

1. **Sessions has no detail destination.** `AthleteSessions` renders only five `ListRow` summaries with no `onPress`, and the calendar reports a day's peak and venue. A user cannot inspect the exact saved readings or guidance applications for a selected past practice from this screen. Strava's documented history → activity relationship suggests the missing interaction matters more than another style pass. Proposed record detail: venue/date/duration, ordered measured readings with their original units and source, current rules version and applied state. This requires product/data work, not only a row restyle.
2. **Period labels imply more history than is loaded.** `Season` requests at most 100 finished sessions and calls the last filter “All.” A busy team can have more than 100 sessions. Its “3M” comparison also needs 180 days of data; sample history covers roughly 100 days, so the prior period is incomplete. Do not present an apparent decline as a measured trend when previous-period coverage is missing. Use an explicit record-window label, fetch the required date range, or suppress comparisons until coverage is known.
3. **Coach Plan foregrounds reference material before the plan.** `PlanTab` renders Today's rules, full `ZoneRules`, equipment facts and a source row before the plan list. The active plan can fall well below the first viewport. A task-first translation would show the active plan and exact compliance failures first, with a source-linked rules disclosure available alongside it. Keep the current zone/measurement timestamp visible as context, without rebuilding Home's reading hero.
4. **Band detail is still a wall of equivalent cards.** `VitalCards` assigns the same container treatment to all five signals and repeats average/max/min sets. A selected signal with one chart and relevant contextual detail would give the user a clearer reason to inspect it. The right secondary statistics differ by signal; “average/max/min” should not be a universal template.
5. **Roster and live effort answer different questions.** HeatSense already separates Team roster/live and Trainer Athletes/Monitor. Retain that separation. Strava's club statistics and rankings should not turn HeatSense into a contest or imply that higher effort is safer; roster state and attention reasons are more relevant than a leaderboard.

### Regression risks to review from the first profile change

- Settings now needs an explicit Settings tab selection. Check discoverability of temperature, sample athletes, recheck notifications and sign-out; the overview should not strand users who used to find them by scrolling.
- The period picker remains small and fixed-width. Verify touch targets, VoiceOver selected state, Reduce Motion and accessibility text sizes before relying on it across more screens. The underlying `Segmented` currently gives its small items a 28-point minimum height with a 4-point hit slop.
- Exercise long names and team names. The compact header wraps names beside Edit, but long text and large accessibility sizes need a real device check.
- Check overview with loading, no team, pending team approval, zero finished practices and sample data. A blank or zero value should never disguise failed retrieval. `usePastSessions` currently turns failures into an empty list; visual changes do not fix that pre-existing ambiguity.
- Verify photo selection/removal, rename, pairing, settings switches and test-alert actions after toggling Overview/Settings. These handlers are preserved but the layout change does not prove they work end to end.
- Band battery and serial remain simulator-derived. The new visible Simulated label removes the previous “synced just now” claim, but does not make the battery a measurement.
- The profile change intentionally preserves shared `Fill`, `FloatingBand` and `Segmented` from the uncommitted motion pass. Their off-screen/background behaviour belongs to the motion review, not Strava evidence.

## Follow-up correction: honest summary coverage

The period-semantics mismatch above is now fixed in `profile-tab.tsx`:

- The choices are **30d**, **90d**, and **Recent**, matching the actual rolling-day filters. Recent applies no date filter to the records loaded; it makes no all-time claim.
- A visible scope note states that the summary uses up to 100 recent finished practices, with the selected day filter when applicable. This also explains that even a 30/90-day view may be bounded by the loaded record count.
- Previous-period deltas were removed. The data hook does not return completeness metadata, so neither real nor sample history can prove that a comparison period is fully covered.
- The summary still shows the practice count, hours and peak WBGT for the selected available records, including their sample label where applicable.

No fetching, backend or history-retention changes were made. The remaining data limitation is made explicit rather than silently represented as an all-time total or a trend.

## Follow-up implementation: saved practice detail

`AthleteSessions` now opens a `practice-record` route from every history row. Show-more controls reveal the loaded history ten records at a time; a scope note makes the 40-record window explicit.

Real records load the stored session and its saved readings using Firestore's existing coach/approved-member read permissions. The detail shows venue, date, duration, peak WBGT, original entered measurement value/unit, source, zone and guidance-confirmation time. Share uses the existing `sessionReport`, replacing its current-policy description with the session's actual saved policy identifier. Loading, unavailable/permission error, retry, invalid link, missing session and missing readings have distinct states. There is no write action.

Sample history contains summary aggregates only. Its detail therefore shows the existing sample summary with a visible Sample data label and explains that individual readings/acknowledgements are unavailable. No fake reading history is generated and no Firestore query is made for a sample. The sample share action is explicitly a sample summary.

The existing `ReadingsTimeline` hardcodes “Today's readings” and “Now.” It is deliberately not reused for past records, because those labels would imply the historical session is live. A future historical chart needs explicit end-time/label support.

`npx tsc --noEmit`, scoped ESLint for the new route/service and role-tabs, and whitespace checks passed. Parent owns Device Hub walkthrough; real permission/error behaviour still needs an authenticated emulator walkthrough if not already performed there.
