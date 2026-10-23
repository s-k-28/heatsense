# Apple-led UI research and HeatSense decisions

Research date: October 23, 2026. The parent agent read these sources through the user's single Chrome session. Ten tabs were used, with completed search/social tabs replaced by primary Apple references. This records evidence and decisions, not a claim that an open tab was researched. Article text was inspected; the WWDC writing transcript was read. WHOOP's visual evidence also includes all 22 downloaded Home captures, mapped separately in `whoop-home-screen-map.md`.

## Ten-tab evidence ledger

| Tab / source | Evidence actually inspected | Interpretation for HeatSense | Action or verification |
| --- | --- | --- | --- |
| 1. [Apple: accessibility audits](https://developer.apple.com/documentation/accessibility/performing-accessibility-audits-for-your-app) | Inspector checks descriptions, hit regions, contrast, clipping, traits and Dynamic Type; audits concern the current screen. Reports can include issue screenshots. Automated audits supplement manual assistive-technology testing. | A screenshot critique cannot certify usability or accessibility. Test the rendered state as well as source code. | Opened the installed Accessibility Inspector and selected the running HeatSense process. Its Run Audit attempts did not produce a results report; **no automated accessibility pass is claimed**. Manual Device Hub/AX checks are separate evidence. |
| 2. [Apple HIG: accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) | Adaptable text, redundant non-color status cues, contrast and simple interactions; situational limitations include lighting and screen brightness. | Outdoor heat monitoring needs readable text and named zones; a colored ring alone cannot convey risk. | Keep numeric values, units and zone names. Circle accessibility values include actual quantities; unknown counts announce loading. Large-text and outdoor-device checks remain required. |
| 3. [WWDC25: small writing changes](https://developer.apple.com/videos/play/wwdc2025/404/) | Transcript: filler removal at 1:18; repeated ideas at 6:12; purpose-first instructions at 7:13; consistent terminology at 9:23. | Repeating the countdown in a circle and a card, then explaining the button in gray text, makes one decision consume three blocks. | Removed that Home panel. Staff retain the direct action. Athlete field rules follow the circles without an inert review panel. Keep source, measurement age, simulation labels and actual rules because they change interpretation. |
| 4. [NN/G: usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) | System feedback, familiar language, consistency, error prevention/recovery and focus on relevant information. | “Clean” includes a completed action, accurate state and a recoverable failure. A less crowded screenshot alone is insufficient. | Audit saved outcomes and navigation. Trainer Monitor now selects the tab through the existing dashboard callback instead of pushing another dashboard route. |
| 5. [Apple HIG: writing](https://developer.apple.com/design/human-interface-guidelines/writing) | Clear action labels, concise necessary words, context-appropriate tone, consistent names and useful blank-screen guidance. | Gray text is not inherently a defect. Text is a defect when removing it changes neither the decision nor the meaning. | Use the deletion test below. Keep useful empty-state instructions; move optional metric definitions and count provenance into the existing disclosure. |
| 6. [Apple: Strava's award story](https://apps.apple.com/us/iphone/story/id1847900442) | Apple identifies Strava as its 2025 Apple Watch App of the Year. The editorial credits large tap targets, timely haptics, strong contrast, glanceable outdoor stats, immediate progress and social feedback. The same tab previously inspected [Slopes](https://developer.apple.com/news/?id=wq48r7mj), Apple's 2022 Design Award case study: simplify real physical tasks and avoid forcing people to assemble a story across screens. | These are context-sensitive interaction decisions, not a prescription to copy a color palette. For HeatSense the equivalent story is field condition → action → saved result → next check. | Preserve HeatSense's colors and figures, orb and three circles. Put the current task before historical exploration. Use actual saved readings in metric details. No claim that a progress ring will cause retention. |
| 7. [WHOOP Home flow](https://mobbin.com/flows/a1b64f5f-e446-4a21-99a2-a1321e2a9371) | Rendered flow and all 22 local captures: full three-metric summary at the top; compact summary at scrolled positions; different setup/calibration/mature states; focused insight, activity and metric sections. | The 22 captures are states and scroll positions, not 22 independent features to transplant. Empty scores remain unavailable rather than becoming invented values. | Reuse the hierarchy for coach, trainer and athlete, with role-appropriate data. Restore the user's historical orb as HeatSense's requested character element. Do not import sleep/recovery/strain scores or infer animation timing from still images. |
| 8. [Strava: activity history](https://support.strava.com/en-us/articles/15402014-viewing-your-activity-history-on-strava) | Progress summaries, activity search, dated history, selectable periods and access to the underlying activity. The article distinguishes mobile and website paths. | A summary earns its place when users can inspect the records behind it. Website screenshots are not mobile-layout evidence. | Reading and acknowledgement circles expose the actual saved measurements. Existing saved-practice destinations remain functional. Date-navigation expansion is still a product decision, not silently implemented from a screenshot. |
| 9. [Apple HIG: buttons](https://developer.apple.com/design/human-interface-guidelines/buttons) | Recognizable roles and labels; general 44×44 pt hit-region guidance; press states for custom controls; limited prominent choices; inline busy feedback for operations that take time. | The control contract matters as much as its shape: pressed, disabled, busy, success and failure must agree with the operation. | Existing shared ActionButton provides 48 pt minimums, pressed/disabled/busy states and a real spinner. The Home circles provide a large selectable region and expanded state. Audit each migrated action; component existence alone is not a pass. |
| 10. [Apple Design Resources](https://developer.apple.com/design/resources/) | Official platform UI kits, fonts, symbol tools, templates, Live Activities resources and device bezels. The live page currently lists newer iOS kits than the app's iOS 26.5 test environment. | Use these to calibrate platform behavior and geometry while preserving the product's visual system. A newer template is not authority to silently change deployment targets or rebuild the app in SwiftUI. | Keep the Expo implementation and existing HeatSense tokens. Reference platform-specific material selectively; do not install template bundles or change native dependencies merely to appear native. |

## What “vibe-coded” becomes in an actionable audit

Treat the phrase as the user's description of a quality problem, not detectable authorship. Every finding must identify a concrete rendered defect and a user consequence. Use the full workflow in `ui-audit-protocol.md`.

### The text deletion test

For each heading, caption and instruction, ask:

1. What decision, action, source distinction or consequence does this text clarify?
2. Is that already communicated by the adjacent number, heading, selected state or control?
3. Does removing it make a first-time user misunderstand the task? If yes, retain or rewrite it. If no, remove it.
4. Is it needed only after a tap or when something goes wrong? Put it at that moment.

For the rejected Home example, the circle already answered “when,” the button already named the action, and the gray sentence added neither a rule nor a consequence. The panel was removed rather than replaced with different filler. The same test preserves “Simulated,” measurement timestamps, units, actual rest/cooling instructions and the UIL source.

### Screenshots plus task evidence

For each role and state, capture a screenshot, accessibility representation and expected data outcome. Evaluate visual hierarchy, alignment, spacing, contrast, consistent components, action clarity, truthful states, response to input and continuity on return. Keep before/after fixtures comparable. An agent's completion time is not a representative user's usability result.

Use 0–3 issue severity with explicit impact and confidence. Do not invent a percentage of “vibe-coded material.” Automatic audits can find particular defects; they cannot decide whether the whole product has taste, nor does an empty report prove full accessibility.

## Changes supported by this pass

- All three Homes share the restored animated field orb and three real metric circles.
- Removed the repeated countdown card and generic gray review subtitle.
- Athlete Home advances directly to usable field guidance and personal band information.
- Metric disclosures expose readings and acknowledgement states rather than descriptions of their graphics.
- Team-day counts are available record dates, not verified attendance or protocol completion; provenance is available on demand and loading stays unknown.
- Trainer Home shows actual reporting/stale/slow-recovery counts and uses the existing Monitor tab navigation.
- Ring fill does not restart on each live countdown tick. Orb shape frequencies now join continuously at the repeating phase boundary. Reduce Motion stops the looping hero treatment.

These are scoped Home improvements. The entire app has not passed the complete audit matrix. Current source-level concerns outside this pass include fake refresh feedback and loading/error ambiguity; track them rather than claim that functional polish is finished everywhere.

## Retention that fits the actual product

Our inference from the reference workflows is that returning becomes useful when prior activity produces a clear next action and a trustworthy record. For HeatSense, assess completed practice workflows, subsequent timely rechecks, trainer follow-through and successful record retrieval. Separate first-reading delay from rechecks because the first check is due immediately. Count opportunities at actual practices; no-practice days do not establish churn. Do not infer causal retention improvements from awards, stars, screenshots, motion or an agent's aesthetic judgment.

No analytics, social feed, competitive heat-exposure streak or notification campaign was added by this research pass.

## Additional discussion sources inspected

- [Gary Simon on X](https://x.com/designcoursecom/status/2080802781087089047): explicit design direction and judgment rather than unopinionated default output. Commentary, not measured usability evidence.
- [Mitchelle Chibundu on LinkedIn](https://www.linkedin.com/posts/mitchellechibundu_the-biggest-giveaway-that-an-app-is-vibe-coded-activity-7497974817112068096-7XaK/): hierarchy and editorial judgment. Post text inspected; no unsupported claims about its video.
- [Expo design principles](https://expo.dev/blog/how-to-apply-professional-design-principles-in-ai-app-development): a visual vocabulary for screenshot critique. Eight principles inform the audit; they do not establish causality for retention.

Cal AI discovery returned several similarly named apps. No new Cal AI screens or behavior are asserted from a search overview. WHOOP and Strava remain the verified visual references for this Home pass.
