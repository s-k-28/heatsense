# Reusable agent UI audit prompt

Copy the prompt below and fill in its scope. It uses the [audit protocol](ui-audit-protocol.md) and [Apple research ledger](apple-ui-research-ledger.md).

---

Audit **[screens / roles / task flows]** in **[checkout / build]**. Mode: **[audit-only / implement already-authorized fixes]**. Deliver evidence-backed findings and a small, verifiable improvement set.

Read `AGENTS.md`, the latest user brief, `docs/design/ui-audit-protocol.md`, and `docs/design/apple-ui-research-ledger.md`. Follow current authorization and preserve unrelated work. HeatSense's requested Home orb and three circles are intentional; assess their meaning and behaviour. Preserve onboarding's separate ownership and the existing tokens/component library.

1. **Record the fixture.** Note role, membership, team/session, environment, platform/viewport, text size, units, Reduce Motion, build revision and capture times. Use local synthetic emulator data for persisted workflows. Sample mode can establish layout, not successful real-team writes.
2. **Inspect the actual app.** Capture screenshots and AX/accessibility trees at the decision point, relevant pending/error state and result. Walk the task: navigate, act, inspect the saved outcome, leave and reopen it. Test the relevant loading, empty, failure, stale and role-boundary states. Do not infer functionality from a button's appearance or source alone.
3. **Apply the text deletion test.** For each heading, subtitle and instruction: what decision, source distinction or consequence does it add? Is that already conveyed nearby? Remove only redundancy; rewrite necessary unclear copy; move optional definitions to the moment they are needed. Keep essential units, measurement age, source/simulation labels, safety instructions and actual practice rules. Do not replace deleted filler with different filler.
4. **Report concrete findings.** For each, give screen/role/state, reproduction, screenshot + AX paths, exact source location at the recorded revision, observed versus expected behaviour, task impact, smallest disposition/change, severity0–3 and confidence. Use the protocol's definitions. No generic “vibe score,” authorship inference, unsupported percentages or aesthetic preference presented as a defect.
5. **Separate evidence types.** Visual critique, manual AX/assistive checks, automated accessibility audit results, source inspection and persistence tests are different. Name exactly what ran and its outcome. A tool that fails to produce a report is **unknown**, not passed. Neither a screenshot nor an empty automated report certifies full accessibility.
6. **Keep changes small.** In audit-only mode, stop at findings. In authorized implementation mode, fix the smallest demonstrated issue using existing components; preserve data, permissions and unrelated screens. Avoid new dependencies or a wholesale redesign. Recheck the same fixture/task before and after: hierarchy, controls, large text, Reduce Motion, navigation return and persisted result. Report regressions and unresolved severity3 findings honestly.

**Evidence stop rule:** stop researching when a directly inspected reference supports the proposed pattern and the app evidence establishes the defect and task consequence. Collect more only to resolve a specific conflict or missing fact. If reproduction, AX, audit output or data verification is unavailable, mark that item **unknown / not tested**, state what would resolve it, and narrow the conclusion. Do not keep browsing to manufacture certainty.

**Deliver:** a short prioritized findings table, comparable before/after artifact links when changed, checks actually completed, and explicit remaining unknowns. For return use, discuss correct next-practice/recheck tasks and record retrieval; app opens, awards, screenshots and pleasing motion do not prove retention gains.
