# Repository maintenance

## October 24 cleanup

The cleanup used the locally installed [Anthropic Code Simplifier guidance](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/code-simplifier), the Minimalist skill, and Knip 6.43.0 with its Expo and Expo Router plugins. The Claude agent was not run as a separate coding process.

- Removed eight unreachable modules, including the abandoned map/location card, glass surface, unused animation helpers and retired design tokens. Removed the unreferenced Expo starter reset script and its destructive reset command.
- Removed unused `expo-device` and `expo-glass-effect` package declarations, plus the unconsumed Tamagui root provider and its `tamagui` / `@tamagui/config` dependencies. Configured native Expo plugins remain part of the existing native configuration; removing further native capabilities is a separate change.
- Grouped 44 component files by responsibility. Replaced misleading `whoop-ui`, `role-tabs` and `coach-tabs` file names with `ui/data-display`, `dashboard/athlete/athlete-tabs` and `dashboard/coach/plan-tab`.
- Preserved the restored classic Team implementation. Removed the superseded alternate Team implementation, the unused RiskHero wrapper and 192 unreferenced style definitions.
- Moved Trainer Home out of the Athlete module. Separated explicit preview field data and the reusable share action from dashboard navigation composition.
- Moved exploratory images out of runtime assets, retired the old README banner, grouped design research/audits/rules and moved design manifests beside their documentation.
- Replaced the long root README with a maintained entry point using the app's actual H mark. Preserved the detailed overview and earlier handoff in `docs/archive/`.
- Preserved the local warning probe and inactive environment backup outside the repository at `~/.local/share/heatsense/cleanup-2026-10-24/`. Local `CONTEXT.md` remains available to existing agent instructions and is ignored by Git. No private environment values were published.

## Verification scope

TypeScript, ESLint, Knip, existing calculation assertions, documentation links and all-platform Expo bundle export verify the source reorganization. Bundle export covers iOS, Android and web module resolution; it is not a fresh native binary build or a replacement for interaction/device QA.

The native walkthrough and its explicit limitations remain in the [October 23 rundown](../design/audits/rundown-2026-10-23.md). It predates this cleanup and must not be reported as a new native pass. After cleanup, a limited native smoke check opened Coach Home, Team, Plan and the New Plan editor, then cancelled without saving; this does not cover every role or interaction.

## Keep the project organized

- Keep route files in `src/app`; put role UI with its role and shared presentation in `components/ui`, `layout`, `practice` or `band`.
- Keep Firebase/device operations in services and state adapters. Avoid importing dashboard composition from reusable controls.
- Reuse existing controls, tokens and motion helpers. Do not add new abstractions or dependencies for one-off formatting.
- Run `npm run check:unused` before pushing. The maintained Knip gate covers unreachable files, dependency declarations and unresolved/unlisted imports. It intentionally does not remove public service APIs merely because they are currently unused.
- Knip's Expo plugin assumes `expo-updates`; the config documents the sole dependency exception because this app has no OTA update integration. Widgets and developer checks are explicit entry points.
- Run `npm run check:docs` when moving files. Historical documents under `docs/archive` retain period-specific references and are excluded from the maintained-link gate.
- Keep design studies and dated audit records in their documented folders. Keep build output, recordings, logs and local plugin state out of source control.
- Preserve human commit attribution. Project settings disable automatically generated AI commit/PR credits; actual project and contest disclosure records remain intact.
