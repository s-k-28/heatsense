# HeatSense authentication setup

HeatSense uses Firebase Authentication. Google sign in uses the native Google SDK on iOS and Android and a Firebase popup on web. The app only opens account screens after Firebase confirms a user. Apple sign in is deferred until Apple Developer access is available.

## Firebase project

1. The dedicated **HeatSense** Firebase project is `heatsense-aa3c8`. Google Authentication is enabled with `siddarthakodithyala28@gmail.com` as its support email. Add each deployed web domain to Authorized domains before using web sign-in there.
2. Copy `.env.example` to `.env`. It contains the public Firebase web app and Google OAuth client identifiers for this project. These are client configuration, not admin credentials. Never place a service account JSON or OAuth client secret in the app.
3. The registered iOS app uses bundle ID `com.s-k-28.heatsense-app`. Its OAuth URL scheme is in `.env.example` and is added by `app.config.js` during native prebuild. The `GoogleService-Info.plist` file is not needed in the repository for this Firebase JS SDK setup. If the iOS OAuth client is rotated, update its client ID and reversed URL scheme from the latest Firebase configuration file.
4. For Android, first choose an `android.package` in `app.json`, then register it in Firebase with development and release SHA-1 certificates. Rebuild after changing native configuration.
5. Rebuild the iOS development app after copying `.env`; a Metro reload alone cannot add the native OAuth URL scheme.

## Verification

- With no Firebase configuration, Google sign in shows an inline setup error and does not enter the role screen.
- With configuration complete, sign in with Google on the dedicated HeatSense simulator and confirm the Firebase Authentication user appears in the console. Restart the app and confirm the session persists.
- Test cancellation, repeat sign in, sign out, web origin restrictions, and a production iOS build.
- Prototype team invites and dashboard sample data still require backend authorization and production data before launch.
