# Dashboard button and control audit

Source snapshot: October 23, 2026, after the first dashboard cleanup. This is a local source audit, not a claim about WHOOP's implementation. No app code was changed for this audit. Browser reference collection is handled by the parent in the single Chrome research session.

## Findings that matter most

1. **There is no complete dashboard action primitive.** `ui/list.tsx` exports a filled `Button`, but it has only `label`, `onPress` and tint/gray appearance. It cannot represent disabled, loading, destructive or focus states. Consequently, screens rebuild these behaviours themselves.
2. **The best existing state handling lives in onboarding.** `EntryButton` already derives disabled/busy state, blocks activation while loading, shows a spinner and has keyboard-focus styling. Preserve onboarding's separate design ownership; port the behaviour contract into a dashboard primitive rather than restyling EntryButton or importing its ornamental ring everywhere.
3. **Touch targets vary substantially.** Directly specified heights range from 28-point small segments and 32-point rename to 84-point monitoring rows. A 48-point dashboard minimum is a proposed project target, not a claim that every smaller control violates a cited platform rule. Width matters too: some narrow swatches and two-button approval groups have no minimum width.
4. **Press feedback is not shared.** Local opacity values include .55, .6 and .7; entry buttons use opacity .92 and scale .98. `PressScale` defines a .97 animation but is not used anywhere in `src` beyond its own declaration. Several controls have no pressed treatment.
5. **Async correctness is separate from appearance.** Practice save/start/end/acknowledge have explicit pending states, but their semantic/visual treatment differs. Protocol save functions currently return void from optimistic hooks; putting a spinner on those buttons alone would falsely imply durable-save confirmation.

## Inventory and method

Counts below are JSX source sites, not rendered button counts. A single mapped site may produce many controls. Measured with `<Pressable` opening-tag matches; imports and closing tags are excluded.

| Screen file | Direct Pressable sites | Key shared controls already used |
| --- | ---: | --- |
| `src/components/field-check-sheet.tsx` | 8 | `ui/list` Row, Group, TextLink |
| `src/components/coach-today.tsx` | 2 | Local CTA and team link |
| `src/components/coach-tabs.tsx` | 3 | 9 ListRow sites, Segmented |
| `src/components/trainer-monitor.tsx` | 3 | Rows, Segmented |
| `src/components/trainer-athletes.tsx` | 1 | ListRow; local filter tabs |
| `src/components/profile-tab.tsx` | 3 | 10 ListRow sites, 3 Segmented sites, native Switch |
| `src/components/protocols-tab.tsx` | 14 | 6 ListRow sites, Segmented |
| `src/components/learn-tab.tsx` | 3 | ListRow; local selection controls |
| **Requested dashboard screens total** | **37** | |

The foundation adds 3 sites in `whoop-ui.tsx`, 4 in `ui/list.tsx`, 3 in `entry-ui.tsx`, and 1 in `motion/segmented.tsx`. `motion/press-scale.tsx` defines one AnimatedPressable. These counts indicate fragmentation; they are not a quality percentage.

## Shared components: actual contracts

| Component and source location | Existing strengths | Gaps / implications |
| --- | --- | --- |
| `whoop-ui.tsx:12` SectionTitle action | Button role; 10-point hit slop; reuses heading action typography | No explicit minimum size, pressed feedback, disabled/loading or focus state |
| `whoop-ui.tsx:40` ListRow | Button role when navigable; optional selected state; 56-point row; opacity .7; noninteractive parent with trailing controls remains individually accessible | No disabled/loading API; no accessibility hint/label pass-through; no focus treatment. Keep row-with-control separate from a row-wide action |
| `whoop-ui.tsx:108` Card action | Entire card is a button when actionable; chevron; opacity .7 | No state API or minimum target contract; card and row navigation should retain different layouts |
| `ui/list.tsx:67` Row | Explicit composed accessibility label; role; 52-point row; surface highlight rather than faded text | No disabled/loading/selected API. With no onPress it groups the entire row as accessible, even if trailing contains an interactive child; unlike ListRow's explicit trailing-control handling |
| `ui/list.tsx:138` Button | 50-point minimum, radius 14; tint/gray; opacity .55 | No disabled/loading/busy, icon, destructive intent, focus or accessibility-label override |
| `ui/list.tsx:150` TextLink | Button role; hit slop 10; opacity .55 | Optional onPress allows an inert element still announced as a button. No explicit target size, disabled/loading or focus treatment |
| `ui/list.tsx:17` CardHeader action | Button role; pressed opacity | Its content has a 24-point minimum. No minimum wrapper size or state contract |
| `entry-ui.tsx:152` EntryButton | Disabled-or-loading gate; accessibility disabled/busy and aria flags; spinner/loading label; explicit focus; 58-point minimum | Preserve existing appearance. Static .98 press scale does not consult Reduce Motion; label remains original accessibilityLabel while visible label changes. Review separately with onboarding owner |
| `entry-ui.tsx:174` EntryLink | Disabled gate, label, hit slop, hover underline | No explicit disabled accessibility state/focus style; vertical size is text plus 8 points. Out of dashboard migration scope |
| `motion/press-scale.tsx:12` PressScale | Forwards Pressable props; 120ms in/160ms out; reads Reduce Motion | No button semantics, size or state contract by itself. Press-in skips animation with Reduce Motion, but press-out always requests withTiming(1). If Reduce Motion changes mid-press, no explicit cancellation/reset is installed. Do not make it a mandatory wrapper before reviewing this edge |
| `motion/segmented.tsx:16` Segmented | Tablist/tab roles and selected state; animated selection uses Reduce Motion; one component already serves several screens | No per-option disabled state or pressed feedback; no visible focus. Targets: md minHeight 38, sm 28 with hitSlop 4. The small control's width is initialized from options/itemWidth only on mount, so later item-width changes do not recalculate it |

Native Pressable may derive some accessibility disabled behaviour from its `disabled` prop. The audit distinguishes absence of an **explicit shared contract** from a claim that a particular native screen reader never announces disabled. Busy state still needs intentional representation.

## Screen-by-screen migration map

| Screen and exact source evidence | Current variations | Recommended replacement / preserve |
| --- | --- | --- |
| Coach Home `coach-today.tsx:60,75,125,130` | CTA is coral/radius14/min54; team link is a 52-point divider row; both opacity .7 | Primary DashboardButton for main action; retain team navigation as ListRow or a row-styled action rather than making a second filled button |
| Team `coach-tabs.tsx:72,89–90,195–201` | Share coral/radius12/min44. Approve/Decline are radius999, vertical padding8 and font15, with no minimum height/width. Disabled uses busy user ID, but no changed label/spinner/explicit busy state or press feedback on approval buttons | Compact action pair with actual 48-point targets; secondary Decline, primary Approve; controlled loading label for the pending operation. Share can be secondary when another primary exists |
| Practice sheet `field-check-sheet.tsx:108,154,214,259,313,364–381` | Radios min40; primary min54; confirm outlined min50; share/end text min48. Start has disabled state but no busy semantic; Save/Acknowledge/End change text and disable without a common visual pending state. Expanded-guidance header min48 has no pressed feedback | Shared primary/secondary/text buttons and a dedicated selection group. Keep keyboard dismissal/save logic. Derive disabled/busy from one contract; preserve explicit expanded/checked semantics |
| Monitor `trainer-monitor.tsx:41,111,115,157–165` | Live row min84. Flag detail and Checked in min44, opacity .7, no explicit min width | Keep live row identity and freshness; use compact text action min48 for Checked in. Do not animate changing heart-rate figures or convert whole list into buttons that scale |
| Athletes `trainer-athletes.tsx:79–89,120` | Filter tabs have selected semantics and underline, min46; no pressed feedback/focus or min width | Selection API can share sizing/interaction helpers while preserving underline layout. Do not force all filters into a pill just because Segmented exists |
| Profile `profile-tab.tsx:102,107,166,186,269` | Avatar is 72×72; rename min32; device row has padding but no explicit min. Native Switch lives inside a noninteractive ListRow; preferences use small Segmented. Logout uses destructive ListRow and existing confirmation | Increase rename target; preserve native Switch semantics and no nested row action. Keep destructive logout row. Do not turn settings toggles into action buttons |
| Protocols `protocols-tab.tsx:114,191,196,203,206,213,224,243,290,320,323,332,374,423` | Header/text links rely on hit slop; Call911 red min54; save/share outlined min46; timer coral min52 or neutral Stop; checklist rows min60/64; timer disclosure min60; zone choices height44 | Shared primary/secondary/text controls for saves/timer/text actions; preserve emergency intent as a deliberate red treatment and keep the existing call-confirmation handler. Keep checkbox rows and expanded disclosure semantics as their own controls |
| Learn `learn-tab.tsx:56,68,85,136,149` | Symptoms are checkbox pills with padding9 and no minimum; Clear has hitSlop8 but no pressed state; hydration swatches height52 with flexible narrow width and no press feedback | Dedicated checkbox-choice and single-choice swatch controls, each exposing state and label. A text button for Clear. Reflow or scroll swatches if needed to make width targets usable; do not replace safety states with coral |

### State correctness issues revealed by the button audit

- `field-check-sheet.tsx:124–125` refuses Start when venue is blank, but its button at line154 disables only for missing class/busy. The user can tap an apparently enabled action that silently does nothing. The future primitive cannot fix this unless the caller supplies the actual validation condition or an error.
- Team approval stores one `busy: string | null` (`coach-tabs.tsx:38,43–48`) while allowing other rows to remain active. Two concurrent row actions can overwrite busy state and one completion can clear the other row's disabled indicator. Choose either a per-user pending map or a single intentionally global action lock before adding spinners.
- Protocol incident save resets the response immediately after calling a void-returning setter (`protocols-tab.tsx:153–159`). Emergency-plan Save similarly closes editing immediately. `src/state/emergency-plan.ts:15–61` performs optimistic saves and later alerts on failure. A button-only migration must not silently claim “Saved” or pretend a loading lifecycle exists; durable-save status requires an explicit asynchronous API.
- Profile test alert has no pending lock (`profile-tab.tsx:202–208`); repeated taps can repeat permission/test-alert requests. Keep this separate from real data saving and avoid unnecessary global dashboard blocking.

## Proposed small dashboard API

This is a proposal only; implementation waits for the parent to complete reference research.

```tsx
type DashboardButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'text';
  tone?: 'normal' | 'destructive';
  size?: 'regular' | 'compact';
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  icon?: ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
};
```

Use a new `src/components/dashboard-button.tsx` rather than changing onboarding. Keep its visual choices bounded: Palette tokens, system label typography, radius14 for substantial dashboard actions, no glow/ring/gradient. Regular target min52, compact min48, both with sufficient horizontal padding and a 48-point minimum width; labels may wrap and grow at accessibility sizes. A compact action can still be visually quiet without shrinking its hit area.

The primitive derives `blocked = disabled || loading`, passes disabled/busy semantics, gates press execution, shows a spinner with a task-specific loading label, and applies one visible disabled treatment. Press feedback should be a consistent surface/opacity change; reduced motion must preserve meaningful feedback without scale/travel. Keyboard focus needs an explicit visible treatment on web and native keyboard paths. User-facing loading text comes from callers, not a universal “Signing in…” default.

Do not swallow promises, infer successful saves from elapsed time, call business functions internally, or inject new confirmation dialogs. Existing confirmation decisions stay in the caller. Red is for destructive/emergency intent; risk colours in charts and swatches remain domain state. A text destructive variant can serve End practice; a filled destructive variant is reserved for the explicit Call911 action under the existing handler.

Two small companion changes should accompany migration:

- Extend **ListRow** with optional disabled/loading, accessibility label/hint and consistent focus/press handling. For rows containing independent interactive trailing controls, keep the parent noninteractive and do not collapse their accessibility elements. Avoid adding loading props to every static information row.
- Extend **Segmented** with disabled options, minimum real target sizes, focus and press feedback. Preserve selected/tab semantics and Reduce Motion. Checkbox choices, radio choices, disclosure rows and hydration swatches should remain semantically distinct; do not force them through a button-only API.

## Migration order and acceptance checks

1. Build/review the isolated dashboard button states: primary/secondary/text/destructive, enabled/disabled/loading, short/long label, icon/no icon, accessibility text size, keyboard focus and Reduce Motion. A tiny component showcase is useful; a new package or design-system rewrite is unnecessary.
2. Migrate **practice sheet and Team approval** first: they expose missing async/validation contracts. Verify one-tap Save with keyboard open and duplicate-tap prevention. Update pending-action callers where necessary before declaring loading support complete.
3. Migrate **protocol Save/Share/timer actions** while retaining checkbox/disclosure/emergency logic. Check Stop vs Restart, save failure and call confirmation. No accidental emergency-call activation in automated verification.
4. Migrate **Home/Monitor/Profile text actions**, then section headings/links and segmented choices. Verify only one substantial primary action dominates a screen.
5. Review **Learn and swatches** as a distinct selection-control pass. Check selected state without relying on colour alone, readable spoken labels, target width and no overlap.

Regression checks must include disabled presses causing no side effect, loading preventing repeat activation, selected/checked/expanded/busy being announced correctly, interactive trailing controls reachable independently, long text wrapping without changing semantic order, focus visible against the canvas, Reduce Motion cancelling movement, and returning from navigation with the correct selected tab. Preserve Welcome and onboarding appearance throughout.

## Remaining uncertainty

Declared styles establish minimums, not the rendered bounds on every phone. This audit does not claim device-measured hit rectangles, contrast ratios or complete screen-reader results. Parent's Device Hub walkthrough should verify actual bounds, clipping, focus and assistive behaviour before the migration is treated as finished. WHOOP/Strava screenshots can guide hierarchy and component appearance, but they cannot prove either app's loading semantics or accessibility implementation.

## Approved first implementation

After the audit, the parent authorized the isolated primitive and selection-control fixes. The audit tables above remain a snapshot of the pre-migration source.

- New `src/components/ui/action-button.tsx` exports `ActionButton` and `ActionButtonProps`. The accepted API uses `variant: primary | secondary | text | danger`, `disabled`, `busy`, `busyLabel`, optional accessibility label/hint, and layout style. The danger variant is neutral with a red outline/label. Only primary uses a peach background.
- The native button receives disabled/busy state and blocks execution while either is true. Disabled dims the control; busy preserves readable styling and shows a spinner in a reserved slot beside the loading label. A symmetric empty slot keeps the text centred. Text can wrap and scale without a maximum-font-size clamp.
- All action variants keep a minimum 48-point height/width, consistent padding/radius, and a constant-width border for focus without layout changes. Press feedback reuses `PressScale`, plus a quiet opacity change that still works with Reduce Motion. The existing 120/160ms .97 scale is our project interaction choice, not a measured WHOOP behaviour.
- `src/components/motion/press-scale.tsx` now resets immediately on press-out under Reduce Motion. A live Reduce Motion change cancels animation and restores scale1; unmount cleanup cancels ongoing timing.
- `src/components/motion/segmented.tsx` now uses actual md48/sm44 targets, minimum option width44 and no overlapping hit slop. It preserves label/badge and selected-thumb movement, adds focus/pressed styling and optional disabled options, and recomputes small-control width when options/itemWidth change.
- No onboarding or dashboard screen migration was performed by this agent. Parent owns subsequent button replacements and Device Hub verification.

Scoped ESLint, full TypeScript and whitespace checks are run on these changes. Rendered compact-button widths, long-label wrapping and the larger segment heights still need the parent’s device walkthrough after migration.

### Scoped follow-up migrations

This agent subsequently migrated two explicitly assigned action sites:

- **Profile Edit:** the name is readable text beside a dedicated `ActionButton` text variant, minimum48. Its spoken label is “Edit your name”; photo selection, device row, native Switch controls, destructive logout ListRow and Overview/Settings remain unchanged. Profile's direct Pressable count is now **2 instead of3**, with **1 ActionButton** site.
- **Saved practice Share:** now uses a primary `ActionButton`, the existing `canShare` disabled condition and busy state tied to the actual native share promise. A synchronous ref guard prevents duplicate share-sheet presentation before React rerenders; `finally` clears the pending state. The visible Share label stays stable while its reserved spinner appears. Sample-summary and historical saved-policy content are unchanged. The new route's direct Pressable count is **3 instead of4**, with **1 ActionButton** site; Back and two retry actions were outside this assigned migration.

These are scope counts, not global totals: the parent and another agent are migrating other dashboard files concurrently. The original37-site table intentionally remains the pre-migration baseline. Onboarding was not edited.
