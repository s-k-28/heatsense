# Staff forms audit — October 23, 2026

Owned scope: `field-check-sheet.tsx`, `plan-editor.tsx`; root explicitly authorized `state/practice-plans.ts` to expose hydration metadata. Staff styling was preserved. No browser, Device Hub, screenshots, native call, native share or Accessibility Inspector audit was performed by this agent. Root owns runtime evidence.

## Findings and implemented behavior

| Source finding | Change | Runtime cases still needed |
| --- | --- | --- |
| Field team lookup treated any rejection as no team, showing Create your team after a network failure | Explicit failed lookup plus retry; Create team only follows a successful no-team result | Offline lookup → retry → correct team; successful no-team |
| Lookup/session state could survive a different signed-in account or trainer-team prop | Key the sheet content by UID and trainer scope; session records also carry team identity and subscription callbacks are cancelled on cleanup | Account change while modal is open; trainer team change |
| Practice-session subscription failure had no reload action | Explicit retry clears its displayed record and resubscribes | Failed listener before/after first value; actual recovery |
| Readings subscription failure had no reload action; an already loaded list could silently look current | Retry/reload action; retained readings get explicit potentially-out-of-date feedback | Failure with cached list and no list, then reload |
| Reading inputs could change while a request was pending; success then cleared newer text | Freeze input, units, source and measured-time choices while saving; existing number/time/source payload is retained | Keyboard save, failed save retains text, successful save clears expected draft |
| Starting practice allowed changing parameters during request | Freeze venue, UIL class and recheck interval while starting; preserve existing error/retry through the Start action | Delayed create, reject create, existing selection retention |
| Native practice Share rejection was unhandled | Busy opening state and explicit failure; cancellation/success do not assert delivery | Native cancel and failure; original report remains intact |
| UIL source-link rejection was unhandled | Existing form error area reports failure; source URL stays unchanged | Open source successfully; native rejection |
| Plan editor initialized its one-time draft before asynchronous plan-store hydration | Store exposes loading/ready/error and retry; editor mounts its draft only after ready, using the saved plan; missing requested IDs cannot become default plans | Slow cold-load deep link to custom plan; failed storage read then retry |
| Plan hydration errors were swallowed and indistinguishable from no saved plans | Keep current collection intact on read/parse failure; show explicit load failure; reject obsolete concurrent hydration results | Corrupt/unreadable storage; retry; existing custom plan retention |
| Plan name had no explicit accessibility label | Added Plan name label; title is a header | VoiceOver actual reading order |
| Header and adjacent save actions could compete at narrow/large text | Flexible centered title, wrapping secondary-action row | 320-point width, largest accessibility fonts |
| Timing controls could crowd their labels and had small visible controls | Responsive stacked rows, 44-point controls, explicit adjustable value metadata; same increments and clamps | All six steppers, both bounds, increment/decrement with VoiceOver |
| Today’s zone lookup null resembled an absent field reading | State explicitly says practice data unavailable and plan not checked | Loading/unavailable session versus actually no reading |

## Behavior and check evidence

- Targeted ESLint and full TypeScript passed after implementing the scoped batch. Final reruns are recorded in handoff to root.
- Existing `node scripts/check-plan-check.ts` passed; it prints Node's existing module-type warning.
- Seventeen assertions ran against the transpiled actual practice-plan store with AsyncStorage stubbed: delayed hydration, saved custom data/active plan retained, failure and invalid JSON retain current plans, retry, obsolete concurrent read exclusion, built-in deletion protection, unchanged stored payload shape. These tests do not use the real device's storage.
- Thirteen assertions evaluated actual extracted field-sheet subscription callbacks: failed lookup differs from successful null lookup, trainer bypass, cancelled lookup cannot publish, session callback binds correct team, and callbacks do nothing after cleanup. These do not mount React Native.
- Existing UIL classification, break guidance, source URL/version, recheck choices, measured-at choices and reading payload calculation are unchanged. Plan scheduling, interval clamps and one-tap UIL fix calculations are unchanged.
- No completed native runtime or accessibility audit is implied by source checks or behavioral stubs.

## Remaining limits

- Practice-plan writes still use the existing synchronous store API, whose AsyncStorage write failures are swallowed. This batch adds honest read/hydration state; it does not claim durable disk-write confirmation. A separate coordinated persistence change is needed to await and display write failures without breaking existing callers.
- Field sheet requires a connected/signed-in real team to write. Sample builds explicitly say practice records are unavailable, rather than offering a misleading create-team flow. Read-only sample Home evidence remains outside this form.
- Subscriptions still update while the modal is mounted but hidden; this preserves current behavior. Functional countdown intervals are not decorative animation. A future visibility/performance pass may pause visual clock updates without changing timestamps.
- Real keyboard avoidance, large-text clipping, native Share, source link behavior and slow/offline service recovery remain runtime work for root.
