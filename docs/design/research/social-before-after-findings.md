# LinkedIn and X: inspected comparisons

Read through the shared Chrome session on October 23, 2026. The actual posted images were downloaded, opened at full resolution and independently reviewed by a second agent. These are practitioner examples, not controlled usability studies.

## LinkedIn: Cal AI concept

[Manohar Sanaka's post](https://www.linkedin.com/posts/manohar-sanaka-b26555317_uxdesign-uidesign-productdesign-activity-7431690134670192640-UAXX/) and [original paired image](../../../../HeatSense-design-references-2026-10-23/social-comparisons/linkedin-cal-ai-concept-before-after.jpeg).

The redesign combines calorie and macro summaries into one module, replaces three small rings with bars, strengthens the selected date and moves the add action into the center navigation position. It reduces fragmentation. However, fewer dates are visible, the Settings destination disappears, and the bars lose explicit goal context. The comparison changes calories, protein, meal values and dates, so improved completion or retention is unverified. Treat it as a designer's concept, not an official shipped Cal AI update.

HeatSense decision: group related information, retain useful quantities and progress semantics, and preserve actual history/navigation. A tidier screenshot is insufficient if it removes information needed to act.

## X: Claude component review

[Yahia Bakour's post](https://x.com/mynameisyahia/status/2111598658982756648) and [original review screenshot](../../../../HeatSense-design-references-2026-10-23/social-comparisons/x-claude-component-review.jpeg).

The author describes using Claude to build a component comparison interface with per-item decisions and aggregated feedback. The screenshot exposes a real design conflict: documented outline buttons versus filled implementations. It presents two explicit choices and a feedback field instead of a vague instruction to improve the whole page.

HeatSense decision: review bounded changes with the same data, record the exact hierarchy/control/state change and verify the real destination. User-approved direction takes precedence over older design notes. This is workflow evidence; the screenshot does not demonstrate retention or validate either button variant as universally better.

## Additional X example screened

[Anshu's Fable/Claude redesign](https://x.com/anshuc/status/2064829593782210844) names the tool and shows a calorie-tracker prototype. The inspected thread also says it had just been built and recorded, rather than released. Its video and earlier preview are useful exploration evidence; they do not establish shipped quality, a complete matched-state comparison or measured usability. Do not copy decorative food scenes into HeatSense based on popularity.

## Immediate HeatSense application

1. Delete the duplicated Home countdown panel and gray review sentence. The circle and staff action already convey their meaning.
2. Show saved measurements and acknowledgement states when a metric is opened; optional help must add information.
3. Keep field rules, units, measurement age and simulation/source distinctions. They affect decisions.
4. Keep one clear staff recording action and working role-specific destinations.
5. Compare like-for-like states. Note data/time differences in existing captures rather than presenting them as controlled tests.

The Home changes are implemented. The wider app still needs the task/state matrix in `ui-audit-protocol.md`; this document does not declare the entire product audited.
