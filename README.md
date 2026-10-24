<p align="center">
  <img src="assets/images/heatsense-logo.png" alt="HeatSense H logo" width="120" />
</p>

# HeatSense

A sports heat-safety app for coaches, athletic trainers and athletes. Record field WBGT, review class-specific UIL guidance, plan practice, and keep a shared record.

Built with Expo SDK 57, React Native 0.86, TypeScript 6, Firebase Authentication and Firestore. The HeatSense Band is in development; band signals and demo pairing are explicitly simulated.

## Run locally

Use the Node 22 line used by CI, npm, and Xcode with an iOS Simulator for native development. Java is required for the Firebase emulators.

```sh
npm ci
cp .env.example .env.local
npm run emulators
```

For local test accounts and data, set these flags in `.env.local` before starting Metro:

```dotenv
EXPO_PUBLIC_USE_FIREBASE_EMULATORS=1
EXPO_PUBLIC_USE_AUTH_EMULATOR=1
```

In another terminal:

```sh
node scripts/seed-emulator.mjs --live
npm run ios
```

After the native build is installed, `npm start -- --dev-client` starts Metro. `npm run web` runs the browser preview. See [development setup](docs/engineering/development.md) for environment modes, optional fixtures and troubleshooting.

## Check changes

```sh
npm run typecheck
npm run lint
npm run check:unused
npm run check:docs
npm run test:logic
```

`npm run test:invites` runs the Firebase rules and flow suite in its own emulator process; stop an existing emulator process first. `npm run check:auth` checks the configured sign-in setup.

## Repository layout

```text
src/
  app/                  Expo Router routes; URLs stay here
  components/
    band/               Band views, illustrations and signal charts
    branding/           Shared H logo and brand assembly
    dashboard/
      athlete/          Athlete Home, Band, Sessions and Learn
      coach/            Coach Home, Plan, Team and Alerts
      trainer/          Trainer Home, Monitor, Athletes and Protocols
    layout/             Phone frame and modal framing
    motion/             Reusable motion primitives
    onboarding/         Entry screens, fields and selection controls
    practice/           Field checks, heat history and reading visuals
    ui/                 Shared buttons, text, surfaces and data displays
  constants/            Palette, fonts, sports and shared tokens
  lib/                  Calculations, simulation and activity helpers
  services/             Firebase, authentication and device integrations
  state/                Session, preferences and local state
  widgets/              iOS Live Activity
firebase/               Firestore rules and indexes
scripts/                Checks, emulator fixtures and capture tools
docs/                   Engineering guides, design records and archives
assets/                 Runtime images and font license notices
public/                 Static web configuration and generated Skia runtime
```

Framework configuration remains at the repository root because Expo, TypeScript, npm and Firebase discover it there. Native `ios/` and `android/` directories are generated build inputs; do not mix scratch files into them.

## Documentation

- [Documentation index](docs/README.md)
- [Architecture and code organization](docs/engineering/architecture.md)
- [Development and verification](docs/engineering/development.md)
- [Firebase and Google sign-in](docs/engineering/auth-setup.md)
- [Design system and motion](docs/design/README.md)
- [Cleanup record and maintenance rules](docs/engineering/repository-maintenance.md)
- [Product, hardware proposal and submission history](docs/archive/project-overview-2026-10-23.md)

The historical product overview retains the detailed diagrams, band proposal, research references and team/AI-use disclosure placeholders. Dated audits describe the build they inspected; they are not current test guarantees.

## Safety and data

HeatSense supports staff decisions; it is not a medical device. Field readings, band simulation and saved practice records remain distinct. Authentication, private athlete records and team permissions are enforced through Firebase and Firestore rules. Health and contact storage remains gated in the existing services; this cleanup does not change those controls.

## License

[MIT](LICENSE). Font attribution and license notices are retained in [assets/fonts/licenses](assets/fonts/licenses).
