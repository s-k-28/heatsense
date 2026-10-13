# HeatSense authentication setup

HeatSense uses Firebase Authentication. Google sign in uses the native Google SDK on iOS and Android and a Firebase popup on web. The app only opens account screens after Firebase confirms a user. Apple sign in is deferred until Apple Developer access is available.

## Firebase project

1. Create a dedicated **HeatSense** Firebase project in the account that owns the app. Do not use an unrelated existing project.
2. In Authentication, enable the Google provider. Set the support email to the project owner's address. Add `localhost` and each deployed web domain to Authorized domains.
3. Add a web app. Copy its public Firebase config values into a local `.env` based on `.env.example`. These values are Firebase client configuration, not an admin key. Never place a service account JSON or OAuth client secret in the app.
4. Add an iOS app with bundle ID `com.s-k-28.heatsense-app`. From its `GoogleService-Info.plist`, copy `CLIENT_ID` into `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` and `REVERSED_CLIENT_ID` into `GOOGLE_IOS_URL_SCHEME` in `.env`. The app config adds the URL scheme during native build. The plist is not needed in the repository for this Firebase JS SDK setup.
5. For Android, first choose an `android.package` in `app.json`, then register it in Firebase with development and release SHA-1 certificates. Rebuild after changing native configuration.
6. Copy the Google **web OAuth client ID** into `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. The native SDK uses it to request a Google ID token for Firebase.

## Verification

- With no Firebase configuration, Google sign in shows an inline setup error and does not enter the role screen.
- With configuration complete, sign in with Google on the dedicated HeatSense simulator and confirm the Firebase Authentication user appears in the console. Restart the app and confirm the session persists.
- Test cancellation, repeat sign in, sign out, web origin restrictions, and a production iOS build.
- Prototype team invites and dashboard sample data still require backend authorization and production data before launch.
