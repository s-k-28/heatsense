# HeatSense authentication setup

HeatSense uses Firebase Authentication. Google sign in uses the native Google SDK on iOS and Android and a Firebase popup on web. The app only opens account screens after Firebase confirms a user. Apple sign in is deferred until Apple Developer access is available.

## Sign-in on a development iPhone

A fresh build includes the public HeatSense Firebase configuration from `src/constants/firebase-client.json` and Google OAuth identifiers from `src/constants/google-client.json`, matching `.env.example`. Email/password and Google sign-in do not need an ignored local `.env` file. This does not bypass Firebase Authentication, security rules, or role checks. A different Firebase project must supply its own Google OAuth client IDs; it never inherits HeatSense's clients.

If an older build says **“Sign-in is unavailable in this sample build”**, pull current `main`, restart Metro with `npm start -- --dev-client --clear`, and reload the app. An installed bundle needs a new build if it is not loading from Metro. No native module was added for this fix.

For a custom project, set all required Firebase client values together. For hosted accounts, leave both emulator flags unset. Accounts created in the local Auth emulator do not exist in the hosted project; the default loopback emulator cannot be reached through a phone's own `127.0.0.1`.

If sign-in reports incomplete Firebase configuration, inspect **`.env.local` as well as `.env`**. Expo gives local files priority; an old emulator config can override correct hosted settings. Back up any emulator config, copy `.env.example` to `.env.local`, run `npm run check:auth`, then restart Metro with `npm start -- --dev-client --clear` and reload the app. This preflight checks both development and production environments, including shell overrides, and rejects emulator settings for hosted device builds.

Regression: `npm run check:email-auth` tests the actual Firebase and native Google services with no Expo environment injected, custom-project isolation, cancellation and credential handoff. The Google account chooser and token exchange are stubbed. With local emulators running, `npm run check:email-auth -- --emulator` additionally exercises the real SDK account/sign-in flow without sending test credentials to production. These automated checks do not replace a native hosted-account sign-in test.

## Firebase project

1. The dedicated **HeatSense** Firebase project is `heatsense-aa3c8`. Google Authentication is enabled with `siddarthakodithyala28@gmail.com` as its support email. Add each deployed web domain to Authorized domains before using web sign-in there.
   Google Auth Platform currently lists the audience as **External** and **In production** (checked October 16, 2026), so the consent screen is not limited to test accounts. The current app does not request sensitive or restricted Google scopes.
2. No environment file is required for the team's project. For overrides, copy `.env.example` to `.env.local`. It contains the public Firebase web app and Google OAuth client identifiers for this project. These are client configuration, not admin credentials. Never place a service account JSON or OAuth client secret in the app.
3. The registered iOS app uses bundle ID `com.s-k-28.heatsense-app`. Its reversed OAuth URL scheme is declared in the Google Sign-In plugin in `app.json`, so every native prebuild includes the callback scheme. The `GoogleService-Info.plist` file is not needed in the repository for this Firebase JS SDK setup. If the iOS OAuth client is rotated, update its client ID in `.env.example` and the reversed URL scheme in `app.json` from the latest Firebase configuration file.
4. For Android, first choose an `android.package` in `app.json`, then register it in Firebase with development and release SHA-1 certificates. Rebuild after changing native configuration.
5. Rebuild the iOS development app if the native OAuth URL scheme changes; a Metro reload alone cannot add it. If the scheme is already installed and only client values change, restart Metro and reload. An app with an embedded bundle needs a new build to receive JavaScript changes.
6. Run `npm run check:auth` before a hosted build. It checks bundled Firebase and Google IDs, the native iOS callback scheme, all effective local environment overrides, emulator flags, and the absence of the old sign-in bypass, then runs `npm run test:auth` for service behavior and environment precedence. Those regressions include a fresh checkout with no env file. GitHub Actions runs this command, TypeScript, lint, and the web export on each push and pull request. `npm run check:auth:android` intentionally fails until an Android package is configured; Android also needs its signing SHA-1 certificates registered and a device test before release.

## Verification

- Verified on October 12, 2026: Google popup sign-in on `localhost:8083` reached the role screen for `siddarthakodithyala28@gmail.com`; Firebase Authentication recorded that Google user; reloading the app preserved the session.
- Verified on October 12, 2026: the iOS development build succeeded and installed on the dedicated **HeatSense Dev** simulator with the reversed Google OAuth URL scheme in the built app.
- Verified on October 16, 2026: the native iOS account chooser returned a Google ID token, Firebase accepted it, and HeatSense opened role selection. After a cold restart, Firebase restored the same Google user and the app opened role selection without another sign-in. Both coach and athlete entry screens opened from role selection.
- Verified on October 16, 2026: the revised web popup offered the signed-in Google accounts, selecting `siddarthakodithyala28@gmail.com` completed Firebase sign-in, and HeatSense opened role selection. Reloading preserved the session and role selection. Web and native sign-in both return the Firebase user's UID; the shared screen advances after its session observer restores that user.
- With no Firebase configuration, Google sign in shows an inline setup error and does not enter the role screen.
- With configuration complete, sign in with Google on the dedicated HeatSense simulator and confirm the Firebase Authentication user appears in the console. Restart the app and confirm the session persists.
- Test cancellation, repeat sign in, sign out, web origin restrictions, and a production iOS build.
- Prototype team invites and dashboard sample data still require backend authorization and production data before launch.
