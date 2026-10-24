# HeatSense authentication setup

HeatSense uses Firebase Authentication. Google sign in uses the native Google SDK on iOS and Android and a Firebase popup on web. The app only opens account screens after Firebase confirms a user. Apple sign in is deferred until Apple Developer access is available.

## Email/password on a development iPhone

A fresh build includes the public HeatSense Firebase configuration from `src/constants/firebase-client.json`, matching `.env.example`. Email/password sign-in no longer needs an ignored local `.env` file. This does not bypass Firebase Authentication, security rules, or role checks. Google native OAuth still uses the client IDs configured through the template below.

If an older build says **“Sign-in is unavailable in this sample build”**, pull current `main`, restart Metro with `npm start -- --dev-client --clear`, and reload the app. An installed bundle needs a new build if it is not loading from Metro. No native module was added for this fix.

For a custom project, set all required Firebase client values together. For hosted accounts, leave both emulator flags unset. Accounts created in the local Auth emulator do not exist in the hosted project; the default loopback emulator cannot be reached through a phone's own `127.0.0.1`.

Regression: `npm run check:email-auth` tests the actual app service with no Expo environment injected. With local emulators running, `npm run check:email-auth -- --emulator` additionally exercises the real SDK account/sign-in flow without sending test credentials to production. This is not a physical-device or hosted-account sign-in test.

## Firebase project

1. The dedicated **HeatSense** Firebase project is `heatsense-aa3c8`. Google Authentication is enabled with `siddarthakodithyala28@gmail.com` as its support email. Add each deployed web domain to Authorized domains before using web sign-in there.
   Google Auth Platform currently lists the audience as **External** and **In production** (checked October 16, 2026), so the consent screen is not limited to test accounts. The current app does not request sensitive or restricted Google scopes.
2. Copy `.env.example` to `.env`. It contains the public Firebase web app and Google OAuth client identifiers for this project. These are client configuration, not admin credentials. Never place a service account JSON or OAuth client secret in the app.
3. The registered iOS app uses bundle ID `com.s-k-28.heatsense-app`. Its reversed OAuth URL scheme is declared in the Google Sign-In plugin in `app.json`, so every native prebuild includes the callback scheme. The `GoogleService-Info.plist` file is not needed in the repository for this Firebase JS SDK setup. If the iOS OAuth client is rotated, update its client ID in `.env.example` and the reversed URL scheme in `app.json` from the latest Firebase configuration file.
4. For Android, first choose an `android.package` in `app.json`, then register it in Firebase with development and release SHA-1 certificates. Rebuild after changing native configuration.
5. Rebuild the iOS development app after copying `.env`; a Metro reload alone cannot add the native OAuth URL scheme.
6. Run `npm run check:auth` before a build. It checks Firebase IDs, the native iOS callback scheme, the local `.env`, and the absence of the old sign-in bypass. GitHub Actions runs that check, TypeScript, lint, and the web export on each push and pull request. `npm run check:auth:android` intentionally fails until an Android package is configured; Android also needs its signing SHA-1 certificates registered and a device test before release.

## Verification

- Verified on October 12, 2026: Google popup sign-in on `localhost:8083` reached the role screen for `siddarthakodithyala28@gmail.com`; Firebase Authentication recorded that Google user; reloading the app preserved the session.
- Verified on October 12, 2026: the iOS development build succeeded and installed on the dedicated **HeatSense Dev** simulator with the reversed Google OAuth URL scheme in the built app.
- Verified on October 16, 2026: the native iOS account chooser returned a Google ID token, Firebase accepted it, and HeatSense opened role selection. After a cold restart, Firebase restored the same Google user and the app opened role selection without another sign-in. Both coach and athlete entry screens opened from role selection.
- Verified on October 16, 2026: the revised web popup offered the signed-in Google accounts, selecting `siddarthakodithyala28@gmail.com` completed Firebase sign-in, and HeatSense opened role selection. Reloading preserved the session and role selection. Web and native sign-in both return the Firebase user's UID; the shared screen advances after its session observer restores that user.
- With no Firebase configuration, Google sign in shows an inline setup error and does not enter the role screen.
- With configuration complete, sign in with Google on the dedicated HeatSense simulator and confirm the Firebase Authentication user appears in the console. Restart the app and confirm the session persists.
- Test cancellation, repeat sign in, sign out, web origin restrictions, and a production iOS build.
- Prototype team invites and dashboard sample data still require backend authorization and production data before launch.
