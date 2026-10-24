# WHOOP button and screen study

Inspected October 23, 2026. This study covers **28 actual screenshots across all 21 locally available WHOOP flow categories**, including product surfaces, settings, device help, forms, chat sheets and history. It does **not** claim to cover every screen in the WHOOP app. The local gallery manifest identifies the available exports as partial.

Primary local source: [reference gallery](</Users/siddarthakodithyala/HeatSense-design-references-2026-10-23/index.html>) and [manifest](</Users/siddarthakodithyala/HeatSense-design-references-2026-10-23/manifest.json>). Screens bear the Mobbin watermark; exact original screen/flow URLs are not embedded. Export timestamps do not establish capture date or shipping app version. All screenshot links below point to inspected files in the local evidence folder; the images are not copied into app assets.

## Observed screenshots and translations

These are visual observations. HeatSense translations are design recommendations, not claims about WHOOP internals. Screen numbering is the archive/export filename, not an assertion about action timing or complete flow order.

| Flow / screenshot | Observed control hierarchy | HeatSense translation |
| --- | --- | --- |
| [Home / daily tasks · 10](</Users/siddarthakodithyala/HeatSense-design-references-2026-10-23/screens/WHOOP/home/010-whoop-ios-home-10-e6394736.png>) | A current-day task block uses one neutral edit action; activity entries remain navigation rows. Promotional blocks are visually stronger but are irrelevant to HeatSense. | Keep one practice action beside current context; move activity history into rows. |
| [Profile identity · 1](</Users/siddarthakodithyala/HeatSense-design-references-2026-10-23/screens/WHOOP/profile/001-whoop-ios-profile-1-c639370e.png>) | Identity has an adjacent neutral edit control, then separate summary sections. Period selection uses a filled selected segment. | Reuse identity/edit, record period and settings destinations; avoid achievement tiles. |
| [Settings destinations · 2](</Users/siddarthakodithyala/HeatSense-design-references-2026-10-23/screens/WHOOP/settings/002-whoop-ios-settings-2-1c6f4f0e.png>) | Account, device, app and privacy are vertical destination rows; labels and leading icons align consistently. | Rows/ListRow for settings destinations; avoid making every destination a peach button. |
| [Device status · 0](</Users/siddarthakodithyala/HeatSense-design-references-2026-10-23/screens/WHOOP/device-battery/000-whoop-ios-device-battery-0-d4ac86a3.png>) | Connection identity and last sync are distinct from battery. Status/advanced selection uses an underline; one switch controls broadcast. | Separate paired, fresh/stale and simulated battery; use real Switch semantics. |
| [Plan result actions · 3](</Users/siddarthakodithyala/HeatSense-design-references-2026-10-23/screens/WHOOP/my-plan/003-whoop-ios-my-plan-3-3bf15b1c.png>) | A bright full-width continuation sits above a similarly sized outlined alternate. The summary appears before both. | One primary commitment, one secondary alternate; retain identical label hierarchy and touch size. |
| [Metric calibration · 1](</Users/siddarthakodithyala/HeatSense-design-references-2026-10-23/screens/WHOOP/health-monitor/001-whoop-ios-health-monitor-1-2996b4b7.png>) | A calibration message precedes the metric grid; unavailable skin value is withheld. No primary task button competes with the readings. | Use honest calibration/reference labels; a data screen does not need a prominent button by default. |
| [Team member identity · 1](</Users/siddarthakodithyala/HeatSense-design-references-2026-10-23/screens/WHOOP/team-member-profile/001-whoop-ios-team-member-profile-1-1044825b.png>) | Another member has identity and highlights without the self-edit control seen on the owner profile. | Staff athlete detail should have role-appropriate actions rather than inheriting profile editing. |
| [Snapshot / generated text · 1](</Users/siddarthakodithyala/HeatSense-design-references-2026-10-23/screens/WHOOP/snapshot/001-whoop-ios-snapshot-1-0bd3b0c3.png>) | History and composer controls are compact icons, while the main body is text. A stop-like square appears in the composer. | Keep utility controls small in hierarchy but accessible in hit target; this capture alone does not prove a loading state. |
| [Community tasks · 5](</Users/siddarthakodithyala/HeatSense-design-references-2026-10-23/screens/WHOOP/community/005-whoop-ios-community-5-afeaa9b1.png>) | Team entry and creation use equally weighted neutral rows. A section-level text action leads to the full recommendation list; promotional cards are separate. | Coach Team setup/join tasks should use rows; choose a primary only when there is a single next task. |
| [Conversation log · 1](</Users/siddarthakodithyala/HeatSense-design-references-2026-10-23/screens/WHOOP/conversation-history/001-whoop-ios-conversation-history-1-af0e4844.png>) | A single dated group contains a full-width row with leading icon and trailing chevron; a close control is separate at the top. | Incident/session logs can use dated groups and navigable rows, without a large empty panel. |
| [Chat suggestions and utilities · 2](</Users/siddarthakodithyala/HeatSense-design-references-2026-10-23/screens/WHOOP/chatting-with-whoop/002-whoop-ios-chatting-with-whoop-2-2e627183.png>) | Suggested responses are compact white pills; copy/feedback are low-emphasis icons; composer attachment action is a distinct rounded square. | Compact choices are appropriate for a short answer set, not a permanent roster-filter cloud. |
| [Feedback selection · 1](</Users/siddarthakodithyala/HeatSense-design-references-2026-10-23/screens/WHOOP/giving-feedback/001-whoop-ios-giving-feedback-1-57089137.png>) | The selected thumb is filled white with dark icon; the other remains neutral. Submission is outlined, not another saturated control. | Separate selected state from action priority; use accessibility checked/selected state. |
| [Attachment action menu · 1](</Users/siddarthakodithyala/HeatSense-design-references-2026-10-23/screens/WHOOP/uploading-a-pdf-file/001-whoop-ios-uploading-a-pdf-file-1-2c3902ac.png>) | Opening attachments reveals one grouped icon-and-label menu above the composer; the plus becomes a close icon in the same location. | Use one action sheet/menu for secondary choices rather than scattering buttons across a screen. |
| [Memory filters and destinations · 3](</Users/siddarthakodithyala/HeatSense-design-references-2026-10-23/screens/WHOOP/memory/003-whoop-ios-memory-3-4807bd5f.png>) | Text/talk use side-by-side neutral controls; navigation rows remain distinct; the chosen filter is white while neighbouring filters are dark. | Use one meaningful segmentation control, with a clear selected state, before details; avoid copying gradients. |
| [Device choice and fallback help · 4](</Users/siddarthakodithyala/HeatSense-design-references-2026-10-23/screens/WHOOP/pairing-a-device/004-whoop-ios-pairing-a-device-4-b973a85e.png>) | The discovered device is a large chevron row; upgrade/help are equal-width outlined fallback actions lower down. | Distinguish choosing a device from retry/help. Do not advertise device actions before hardware exists. |
| [Voice confirmation · 2](</Users/siddarthakodithyala/HeatSense-design-references-2026-10-23/screens/WHOOP/sending-a-voice-message/002-whoop-ios-sending-a-voice-message-2-e1e7bcd8.png>) | A cross and check flank the waveform; suggestions remain above the composer rather than becoming part of that control. | Destructive/cancel and confirm actions should have separate roles and labels; avoid unlabeled icons in safety workflows. |
| [Metric explanation and disclosure · 2](</Users/siddarthakodithyala/HeatSense-design-references-2026-10-23/screens/WHOOP/healthspan/002-whoop-ios-healthspan-2-af89b338.png>) | Information is a small top utility; a related-insights link is text; the expanded metric section uses an upward chevron. | A section disclosure and a navigation action need different cues; copy the distinction, not the proprietary score. |
| [Unselected field / dim continuation · 3](</Users/siddarthakodithyala/HeatSense-design-references-2026-10-23/screens/WHOOP/setting-up-an-account/003-whoop-ios-setting-up-an-account-3-ba7956ca.png>) | Country search results are neutral rows. Next and its arrow are visibly dim when no option is selected. | Invalid forms should visibly reduce continuation emphasis and expose disabled semantics; do not infer those semantics from pixels alone. |
| [Primary and alternate · 1](</Users/siddarthakodithyala/HeatSense-design-references-2026-10-23/screens/WHOOP/onboarding/001-whoop-ios-onboarding-1-8728240b.png>) | A bright full-width device-owner choice precedes an outlined non-owner choice with matching proportions. | Use consistent primary/secondary variants. The HeatSense onboarding design is out of scope for changes. |
| [Picker and next action · 1](</Users/siddarthakodithyala/HeatSense-design-references-2026-10-23/screens/WHOOP/trial-code/001-whoop-ios-trial-code-1-59357eaa.png>) | A native-looking wheel selects the quantity; a single round blue arrow and adjacent label commit it. | A value input and an action are separate controls. Do not copy trial/referral flow into HeatSense. |
| [Instruction detail · 2](</Users/siddarthakodithyala/HeatSense-design-references-2026-10-23/screens/WHOOP/pairing-mode-information/002-whoop-ios-pairing-mode-information-2-c0a156a3.png>) | A large close icon and readable numbered instructions form a help page, without a redundant bottom commitment button in the inspected viewport. | Contextual help may only need Close/Back; extra filled buttons are not obligatory. |
| [Selected field / enabled-looking continuation · 4](</Users/siddarthakodithyala/HeatSense-design-references-2026-10-23/screens/WHOOP/setting-up-an-account/004-whoop-ios-setting-up-an-account-4-e6bfdf88.png>) | The chosen country becomes a white row with dark label. Next is bright compared with account screen 3. | Selection should change more than hue: weight/fill plus accessibility state. |
| [Keyboard-aware submission · 2](</Users/siddarthakodithyala/HeatSense-design-references-2026-10-23/screens/WHOOP/giving-feedback/002-whoop-ios-giving-feedback-2-f45fb874.png>) | Selected thumb and outlined submit remain visible; submit is above the software keyboard with a separate keyboard Done control. | Reading/plan Save must remain reachable when the keyboard is open; Done should dismiss editing, not silently save. |
| [Retry state · 5](</Users/siddarthakodithyala/HeatSense-design-references-2026-10-23/screens/WHOOP/pairing-a-device/005-whoop-ios-pairing-a-device-5-090ae4e0.png>) | A recovery explanation is followed by a single outlined Retry action. This is evidence for a failure/retry layout, not for the intervening request animation. | Keep retry contextual, preserve the previous input, and avoid presenting the error as a new screen of cards. |
| [Plan detail / edit controls · 4](</Users/siddarthakodithyala/HeatSense-design-references-2026-10-23/screens/WHOOP/my-plan/004-whoop-ios-my-plan-4-5b7d81e4.png>) | Date navigation uses small chevrons; the current plan has an edit icon; section edit is text plus a pencil; progress is a bar. | Coach plan editing can be secondary to the plan itself; progress is not an action. |
| [Metric explanation sheet · 3](</Users/siddarthakodithyala/HeatSense-design-references-2026-10-23/screens/WHOOP/health-monitor/003-whoop-ios-health-monitor-3-b6d64a2a.png>) | A close control dismisses an explanation focused on one metric and its range. The background is dimmed. | One selected signal/detail sheet can replace all charts competing on the Band screen. |
| [Trends / timestamps · 18](</Users/siddarthakodithyala/HeatSense-design-references-2026-10-23/screens/WHOOP/home/018-whoop-ios-home-18-55775ae1.png>) | Chart update time and explicit axes provide context. A row chevron leads to details; an info icon explains the weekly comparison. | Preserve timestamp provenance and readable history; do not imply old values are current. |
| [Completed attachment / response · 4](</Users/siddarthakodithyala/HeatSense-design-references-2026-10-23/screens/WHOOP/uploading-a-pdf-file/004-whoop-ios-uploading-a-pdf-file-4-ce69394c.png>) | An attachment is shown as a compact file row with date; response utilities are icons; next suggestions are compact filled choices. | Saved records should confirm identity/time, with secondary follow-up choices rather than a new giant CTA. |

## Category coverage

Counts below are **screenshots containing the identified visual pattern**, not individual button counts. Categories overlap. They describe this 28-screen inspected set, not the full app.

| Category | Inspected screenshots |
| --- | ---: |
| Compact suggested choice | 3 |
| Dim, apparently unavailable continuation | 1 |
| Section disclosure | 1 |
| Icon utility or navigation | 21 |
| Grouped action menu | 1 |
| Missing/calibration state | 1 |
| Outlined alternate or submission | 7 |
| Value picker | 1 |
| Prominent filled commitment | 4 |
| Destination/value row | 11 |
| Neutral secondary action | 3 |
| Visibly selected control | 6 |
| Text action | 3 |
| Switch | 1 |

No screenshot in this inspected set verifies a native **pressed**, hover, spinner/loading or asynchronous completion transition. A stop-like icon during generation and an enabled-looking arrow do not prove the underlying accessibility or request state. Do not invent WHOOP timing, easing, haptics or interaction semantics from static exports.

## Button hierarchy to transfer

1. **Primary commitment:** one prominent filled action for the next meaningful step. WHOOP often uses white; HeatSense should use its peach token. Primary describes importance, not every tappable element.
2. **Secondary alternative:** an outlined or neutral-filled control with the same readable type and touch size, but reduced visual emphasis. Save, Share and Retry can be secondary when they support the main task.
3. **Text action:** Edit, Change, Hide and section-level navigation sit near the thing they affect. Avoid adding a new card just to hold a link.
4. **Destination row:** a row has an aligned label and trailing chevron when it leads somewhere. Its entire hit area should be tappable. A current value is data; the chevron supplies navigation meaning.
5. **Selected control:** white/dark inversion in the WHOOP examples makes selection distinguishable beyond hue. HeatSense can use a neutral selected surface, weight/outline and accessibility state, reserving peach for action emphasis.
6. **Utility icon:** Back, Close, Info, attachment and confirmation occupy fixed, predictable positions. Their glyphs are visually lighter than primary actions. Safety-related actions need explicit names or accessible labels, not guesswork from symbols.
7. **Action sheet:** secondary choices belong in one menu with consistently aligned icons and labels. Do not turn each option into a standalone promotional card.

## Proportions and spacing

These are visual estimates from raster exports, not WHOOP design tokens. Large actions commonly occupy roughly nine-tenths of the content width with matching left/right edges; paired primary/outline actions have similar height and corner shape, separated by a clear gap. Compact chips are visibly shorter than full-width commitments. Label baselines align, and icon-label gaps remain consistent within a group. Screen-size scaling and screenshot export resolution prevent reliable point measurements.

Recommended **HeatSense implementation values**, rather than measured WHOOP values: full-width action minimum height 52–56 points; secondary minimum 48–52; row minimum 56; icon hit area at least 44×44; horizontal button padding 18–20; icon-label gap 8–10; vertical gap 12 between stacked actions. Use existing theme spacing/radii first, allow long labels to wrap or grow, and test Dynamic Type. These are starting recommendations to validate in Device Hub.

## Component contract for the existing library

Use one reusable action primitive with primary, secondary, text and danger variants rather than separate ad-hoc styles per tab. Keep selected options and destination rows as their own controls: a selected option is not a primary action. Existing Rows/ListRow and Segmented already encode those roles and should be reused.

For asynchronous actions, the **HeatSense** component should preserve width/height while showing a busy label or spinner, prevent duplicate submissions, and expose disabled/busy accessibility state. This is a quality requirement proposed for HeatSense, not an observed WHOOP animation. Errors should retain the input and appear beside the failed action. Keyboard layouts must keep the action reachable, as the feedback captures illustrate.

## Apply across roles

| HeatSense surface | Recommended hierarchy |
| --- | --- |
| Coach Home / practice sheet | One log/review commitment; quiet guidance confirmation, history and sharing. Preserve overdue status as status, not a second action colour. |
| Coach Plan | Current plan and constraint checks first; Edit/Change secondary; no invented compliance score. |
| Coach Team / trainer Athletes | Full-width athlete rows and contextual actions; search/filter only when the roster warrants them. |
| Trainer Monitor | Attention status then athletes; one clear detail destination per athlete; keep stale signal separate from physiology. |
| Trainer Protocols | Symptom rows open one response; emergency call remains explicit; timer Start/Stop has consistent action styling; Save/Share secondary. |
| Athlete Band | Signal list or selector then one focused detail chart; honest simulation/calibration state; device settings separate. |
| Athlete Sessions / all Profile views | Dated record rows; identity and period summary; settings grouped by task instead of sharing the same long card stack. |

## Do not copy

Do not copy WHOOP branding, proprietary scores, ring trios, promotional gradients, referral cards, medical claims, sensor capability, battery state or calibration countdown. Do not transplant WHOOP account/health-data questions into HeatSense simply because they appear in the reference. HeatSense onboarding remains the co-founder’s existing design unless the user requests changes. No button component or app source was changed as part of this study.
