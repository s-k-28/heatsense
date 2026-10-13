# HeatSense authentication setup

HeatSense uses Firebase Authentication. Google sign in uses the native Google SDK on iOS and Android and a Firebase popup on web. Apple sign in uses the native iOS sheet and Firebase credential exchange; web uses Firebase's Apple provider. The app only opens account screens after Firebase confirms a user.

## Firebase project

1. Create a dedicated **HeatSense** Firebase project in the account that owns the app. Do not use an unrelated existing project.
2. In Authentication, enable the Google provider. Set the support email to the project owner's address. Add `localhost` and each deployed web domain to Authorized domains.
3. Add a web app. Copy its public Firebase config values into a local `.env` based on `.env.example`. These values are Firebase client configuration, not an admin key. Never place a service account JSON or OAuth client secret in the app.
4. Add an iOS app with bundle ID `com.s-k-28.heatsense-app`. Download `GoogleService-Info.plist` to the project root, and set the reversed iOS client ID as `GOOGLE_IOS_URL_SCHEME` in `.env` before building. Keep the plist out of Git until its contents have been reviewed.
5. Add an Android app with the `android.package` declared in `app.json`, register development and release SHA-1 certificates, and download `google-services.json` to the project root. Rebuild after any native config change.
6. Copy the Google **web OAuth client ID** into `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. The native SDK uses it to request a Google ID token for Firebase.

## Apple provider

Enable Apple in Firebase Authentication and configure the Apple Developer Services ID, team ID, key ID, and private key in the Firebase console for web Apple sign in. The private key stays in Firebase. On iOS, the app already declares the Sign in with Apple entitlement; distribution provisioning must include that capability. Test native Apple sign in on a real iPhone before release.

## Verification

- With no Firebase configuration, Google sign in shows an inline setup error and does not enter the role screen.
- With configuration complete, sign in with Google on the dedicated HeatSense simulator and confirm the Firebase Authentication user appears in the console. Restart the app and confirm the session persists.
- Test cancellation, repeat sign in, sign out, web origin restrictions, and a production iOS build.
- Prototype team invites and dashboard sample data still require backend authorization and production data before launch.
