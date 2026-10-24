# Development and verification

## Requirements

CI uses Node 22 and npm. Local cleanup checks ran on Node 24.14.1. Native iOS development also needs Xcode and an installed iOS Simulator; Android development needs the Android toolchain. Firebase emulators require Java.

```sh
npm ci
cp .env.example .env.local
```

npm's install step generates the Skia web runtime in `public/`. Keep the generated WASM file out of Git. See [auth setup](auth-setup.md) for Google OAuth configuration.

## Environment modes

| Mode | Configuration |
| --- | --- |
| Local emulator workflow | Set `EXPO_PUBLIC_USE_FIREBASE_EMULATORS=1` and `EXPO_PUBLIC_USE_AUTH_EMULATOR=1` alongside the Firebase values in `.env.local`. |
| Hosted HeatSense (default) | No `.env` is needed for email/password sign-in: the app bundles the public HeatSense Firebase client identifiers. Omit emulator flags for hosted accounts. Do not use real records for automated fixtures. |
| Custom Firebase | Supply all required Firebase client values together. Incomplete overrides do not inherit values from another project. |

The default emulator listeners accept local connections only. On a physical phone, `127.0.0.1` is that phone, not your development computer. Use hosted sign-in with emulator flags unset unless you have explicitly configured a reachable test server. Emulator and hosted accounts are separate.

Environment changes require a Metro restart. The repository ignores `.env*` except `.env.example`. Never place a secret in an `EXPO_PUBLIC_` variable: Expo embeds those values in client code.

## Start the local workflow

Terminal1:

```sh
npm run emulators
```

Terminal2, optional synthetic fixtures:

```sh
node scripts/seed-emulator.mjs --live
```

The seed script documents its local test identities. It writes fixtures and can keep demo signals moving; do not run it against production.

Terminal3:

```sh
npm run ios
```

Once the native build is installed:

```sh
npm start -- --dev-client
```

Use `npm run android` or `npm run web` for the corresponding platform. Rebuild the native app when native dependencies or configuration change.

## Verification commands

| Command | Checks |
| --- | --- |
| `npm run typecheck` | TypeScript source and import contracts |
| `npm run lint` | Expo ESLint and React rules |
| `npm run check:unused` | Unreachable files, unused dependencies and unresolved imports through Knip's Expo/Router plugins |
| `npm run check:docs` | Relative links in maintained Markdown documentation |
| `npm run test:logic` | Existing UIL classifier, recheck, plan-check and band simulator assertions |
| `npm run check:auth` | Sign-in configuration sanity and bundled/template parity |
| `npm run check:email-auth` | Fresh-install Firebase initialization, full overrides and incomplete-project isolation |
| `npm run check:email-auth -- --emulator` | The same checks plus actual email account creation, sign-out, sign-in and wrong-password handling against a running local Auth emulator |
| `npm run test:invites` | Authentication/Firestore emulator rules and flows |
| `npx expo export --platform all --output-dir /tmp/heatsense-export` | iOS, Android and web JavaScript bundles plus static routes |

`test:invites` starts its own emulators. Stop an existing emulator process first to avoid port conflicts. A successful bundle is not a native interaction, permissions or physical-device test.

## Tooling map

- `scripts/check-*.ts`: calculation checks.
- `scripts/check-auth-config.mjs`: auth preflight.
- `scripts/test-team-invites.mjs`: emulator integration suite.
- `scripts/seed-emulator.mjs`: optional local fixtures.
- `scripts/capture-screen.sh`, `capture-manifest.mjs`: operator-run screenshot tools; the latter reads [screen-manifest.json](../design/manifests/screen-manifest.json). Configure its Expo URL for the running build.
- `.github/workflows/auth-preflight.yml`: installation, auth preflight, source checks and web export in CI.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| The app shows an older UI | Check `git rev-parse --short HEAD`, restart Metro with `npm start -- --dev-client --clear`, then relaunch the installed app. |
| A native module cannot be found | Rebuild with `npm run ios` or `npm run android`; a JavaScript reload cannot add native modules. |
| OAuth sign-in fails | Compare the platform OAuth values with [auth setup](auth-setup.md). |
| Emulator tests cannot bind ports | Stop an existing emulator process before running the self-contained test command. |
| Firestore rejects a write | Inspect the relevant rules and role; do not weaken authorization to bypass the failure. |

Keep personal tool state, temporary exports and recordings outside the project. See [maintenance](repository-maintenance.md).
