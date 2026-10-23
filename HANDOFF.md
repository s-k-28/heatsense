# HeatSense handoff

HeatSense is a Congressional App Challenge (TX04) entry. It is an Expo app that helps school coaches, athletic trainers and athletes follow UIL heat rules, driven by WBGT field readings and a heart-rate band that is simulated for now. Repo: `s-k-28/heatsense`. Work lands on `main` and is mirrored to `cac-dev`.

This file covers what was built in the last working session, how the app is put together now, how to check your work, and what is still open. Latest commit at handoff: `0362f16`.

---

## 1. Ground rules (read first)

- **Expo SDK 57.** `AGENTS.md` says Expo has changed. Read https://docs.expo.dev/versions/v57.0.0/ before you write Expo code.
- **Welcome and onboarding design belong to Saatvik, the co-founder.** Only change those screens when asked. Bug fixes and wiring are fine.
- **Never commit `ios/Podfile.lock`.** It always shows as modified locally. Leave it unstaged.
- **Git:**
  - Stage paths explicitly. Don't use bare `git stash`.
  - Push every finished change: `git push origin HEAD:main` and `git push --force-with-lease origin HEAD:cac-dev`.
- **Credentials:**
  - Never type real passwords or keys anywhere.
  - Test accounts only on the local Firebase emulators.
  - The user does real-account sign-ins themselves.
- **Free Firebase plan (Spark), project `heatsense-aa3c8`:**
  - There are no Cloud Functions. All logic runs in the app, and Firestore rules enforce it.
  - Push notifications are local notifications the phone schedules.
- **Design system, so new UI matches:**
  - Sentence case everywhere.
  - Numbers use Barlow Condensed: `Face.figure` for the value, `Face.label` for the unit.
  - Information goes in grouped `Rows`/`ListRow` with hairline dividers, `StatRow` for side-by-side figures, `Facts` for readable rules (bold lead-in plus the sentence), and `Card` for a self-contained block.
  - Don't put a small grey subtitle under every item.
  - No glowing blobs, ring trios or 2×2 metric-tile grids. These were removed on purpose.
  - Peach (`Palette.coral`) only on things you can tap.
  - Palette lives in `src/constants/theme.ts`: canvas `#101416`, surface `#1A2024`, ink `#F6F3EC`, muted `#B0BAC0`, coral `#FFB183`.
- **Motion:**
  - Reanimated 4. Helpers are in `src/lib/motion.ts` (`enter`, `leave`, `settle`, `swap`).
  - Every animation must respect reduced motion.
  - Values that update every second (live heart rate) don't animate.

## 2. Stack

| Area | Choice |
|---|---|
| App | Expo SDK 57, React Native 0.86, Expo Router (native stack, `fade`), React Compiler |
| Motion | Reanimated 4.5 (`scheduleOnRN` from `react-native-worklets`) |
| Backend | Firebase Auth (Google + Email/Password) and Firestore. Rules in `firebase/firestore.rules` |
| Notifications | `expo-notifications`, local only |
| Widgets | iOS Live Activity (`src/widgets/PracticeActivity.tsx`) |
| Charts | `react-native-svg` (`src/components/ui/charts.tsx`) |

## 3. What was built this session (oldest → newest)

### Onboarding and auth
- **One band travels through onboarding** (`src/components/band-journey.tsx`):
  - Each screen registers a `BandSpot`.
  - One overlay (`BandJourneyLayer`, mounted in `src/app/_layout.tsx`) flies between spots with ease `(0.77, 0, 0.175, 1)` over 700 ms. The in-tree copy shows at rest.
  - It resets on `/dashboard`. It covers all roles and starts from the welcome screen (one `journeyId` prop was added there).
- **Email and password sign-in** alongside Google:
  - `src/services/email-auth.ts` covers sign-in, create account (sets the display name, then sends a verification email), password reset, and friendly error messages.
  - The UI is in `src/app/sign-in.tsx`.
  - The Email/Password provider is enabled in the Firebase project.
- **Returning users skip onboarding.** `homeRoute()` in `src/services/team-invites.ts` sends coaches to `/dashboard?role=coach`, members to their role dashboard, and everyone else to `/role`. It is used by `src/app/index.tsx` and by sign-in.
- **HeatSense launch screen** replaces the Expo splash. See `app.json` → `splash` (logo on `#101416`) plus `SplashScreen.setOptions({ duration: 350, fade: true })`.

### Making it functional
- **Team tab contradiction fixed:** it no longer says "no athletes" while listing demo athletes.
- **Real heat alerts on the free plan:**
  - `src/services/heat-alerts.ts` schedules recheck reminders 5 minutes before a recheck is due and again when it is due, and sends zone-change alerts.
  - `src/state/heat-alerts.ts` (`useHeatAlerts`, mounted in `src/app/dashboard.tsx`) schedules them for non-athletes and alerts when someone else logs a reading that changes the zone.
- **Trainers log readings** once the coach has started practice: the field check sheet takes a `trainerTeamId`, and the rules allow `isActiveTrainer`.
- **Athletes see past practices:** `recentSessions()` in `src/services/practice-sessions.ts` feeds the Sessions tab, which shows a weekly chart, today, and earlier practices with peak heat.
- **Live Activity shows the team's real reading.** It shows a grey "no reading" state until there is one, and incident data appears only in the sample build.
- **Header bell** opens Alerts, and the avatar opens Profile. The fake notifications are gone.
- **Profile** shows the real team for athletes and trainers.
- **`athlete/done`** no longer goes blank while the membership loads.
- **Dead routes removed:** `/detail`, the practice-location redirect, more than 17 dead source files, and unused assets.

### Band backend (free plan)
- **Service** (`src/services/band-vitals.ts`):
  - `savePairing` and `forgetPairing` write to `athletes/{uid}/band/current` (owner only; serial must match `^HS-[0-9A-F]{4}$`).
  - `publishVitals` and `watchTeamVitals` use `sessions/{id}/vitals/{athleteUid}`:
    - The athlete writes their own document while practice is open, at most once every 10 s.
    - The coach, the trainer and the athlete can read it.
- **Uplink:** `src/state/band-uplink.ts` (`useBandUplink`) is used by athletes who are approved, paired and in an open practice. Every 30 s it publishes a sample from the simulator, labelled `simulated` everywhere. Serial is `HS-02A7`.
- **Simulator:** `src/lib/band-simulator.ts` is deterministic. It models heart rate, skin temp, GSR sweat and movement against the work/rest rhythm and heat. Sample mode runs at 10× speed (`src/state/demo-team.ts`).
- **Who sees live vitals:**
  - Coach Team tab: `TeamVitalsRows` for sample athletes, `LiveVitalsRows` for real ones.
  - Trainer Monitor tab.
  - The `/athlete-vitals` detail screen.
- **Tests:** `scripts/test-team-invites.mjs` has 50 passing checks, covering invites, roles, trainer readings, band pairing and vitals rules.

### UI de-vibe-coding (several passes)
- **References:** WHOOP screens studied from Mobbin. Strava on Mobbin is Pro-only, so it was skipped.
- **Shared components** (`src/components/whoop-ui.tsx`): `Facts`, `StatRow` and `Card` were added. `ListRow` gained a `selected` prop. The sample-data tag is now a dot plus text.
- **Every tab rewritten to one-line rows** with no subtitle under each item:
  - Coach: Home, Plan, Team, Alerts, Profile.
  - Athlete: Home, Band, Sessions, Learn, Profile.
  - Trainer: Monitor, Athletes, Protocols, Profile.
  - Learn and Protocols use `Facts` (`zoneFacts()`).
- **Last pass (`3d76db1`):**
  - **Coach Home** (`src/components/coach-today.tsx`):
    - A plain large WBGT reading and the zone name sit over a five-step UIL zone scale (`ZoneScale`).
    - Next reading / readings / applied show as a `StatRow`.
    - A full-width *Add a reading* button.
    - This replaced the animated blob orb and three progress rings.
  - **Plan zone rules** (`ZoneRules` in `src/components/coach-tabs.tsx`) and **band vitals** are list rows instead of 2×2 tiles.
  - **Every band vital can be checked:**
    - In `VitalsDetail` (`src/components/vitals.tsx`), tapping Heart rate, Skin temp, Sweat or Movement switches the big number and the 6-minute chart to that signal.
    - The simulated history now keeps every signal (`DemoMember.history: Vitals[]`).
  - **A paired athlete sees their own band** on the Band tab. `useOwnBand` in `src/state/demo-team.ts` uses the same simulated source the uplink sends. Before, they saw a "firmware later" placeholder. Unpaired athletes get a pair prompt.
  - **Smaller fixes:**
    - The profile avatar is neutral instead of peach.
    - The live heart rate no longer re-animates every tick.
    - Heart-rate heroes are left-aligned to match Home.
  - **Deleted:** `heat-orb.tsx`, `FerrofluidOrb.tsx`, `Ring`, `MetricTile`/`Tiles`, and the unused visuals (`RingAvatar`, `PhotoBanner`, `Spark`, `DateTile`, `BaselineChart`, `Timeline`).

### Overnight build (Oct 23): the five tabs made into tools
References: WHOOP (Mobbin downloads in `~/Downloads/WHOOP iOS *.zip`), Strava, Polar Team (live team tiles), Cal AI (streak and calendar), Gentler Streak (Apple Design Award: body metrics vs usual, period comparisons).
- **Band vitals (`src/components/vital-cards.tsx`):** five signals over the last 30 minutes, each with its own chart: heart rate (trend + time in zones), skin temp (against usual range), sweat (bars), movement (work/rest strip), blood oxygen (gauge). SpO₂ added to the simulator, uplink and rules (optional, range-checked, tested).
- **Home (`coach-today.tsx`):** readings timeline over the UIL zone bands (`readings-timeline.tsx`); week/month heat history (`heat-calendar.tsx`) with tap-a-day detail. Sample mode has a ~100-day season and a three-reading afternoon.
- **Trainer:**
  - Monitor (`trainer-monitor.tsx`): needs attention + Checked in, live tile grid (HR, % of max, trend from `vitalsHistory` for real athletes), team figures.
  - Athletes (`trainer-athletes.tsx`): searchable roster with filters, heat-acclimatization day (`src/lib/acclimatization.ts`, NATA 14-day phases) and band status.
  - One athlete model for both: `src/state/athletes.ts`.
- **Coach Team (`coach-tabs.tsx` TeamTab):** Roster (code, approvals, roster, staff) | Live (the Monitor grid).
- **Protocols (`protocols-tab.tsx`):**
  - Respond: steps with timestamps, Call 911, immersion timer, incident log you can share.
  - Prepare: daily readiness, editable emergency action plan.
  - Tools: sweat-rate calculator, UIL zone picker.
  - Device-local storage via `src/state/stored.ts`.
- **Alerts (`alerts-tab.tsx`):** live status bar with recheck countdown, Open/Resolved, resolve band and roster alerts, alerts when today's plan breaks the zone.
- **Profile (`profile-tab.tsx`):**
  - Photo (expo-image-picker, kept in app documents, shown in the header) and an editable name (updates Firebase displayName).
  - Season stats (1M/3M/All vs before), athlete band device card.
  - Notification switches wired to `state/heat-alerts.ts`, test alert, °F/°C.
- **Athlete:** Home has Your body (`body-strip.tsx`) and acclimatization. Learn (`learn-tab.tsx`) has a symptom check, a hydration color check and the zone explorer. Sessions uses the shared heat history.
- **Plans:** `src/lib/plan-check.ts` checks a plan against the zone. The editor has Today's zone + Fix to meet UIL, the Plan list flags failing plans, and the built-in Standard plan is now 16/4 (20/10 failed Green and Yellow).
- **Band presence:** header chip on every dashboard tab (athlete battery, or live bands for staff).
- **Fixed:** the yellow dev warning bar was a require cycle (`band-journey` ↔ `wristband`); constants moved to `wristband-asset.ts`.

### Docs and tooling
- **README:** startup-technical rewrite; gallery of 16 screenshots (13 recaptured on Oct 23) in `docs/screenshots/readme/`.
- **Task list:** kept in `~/.claude/heatsense-tasks.json`, outside the repo.

## 4. Running and checking

```bash
npm install
npx expo run:ios                 # dev client build (first time / after native changes)
npx expo start --dev-client      # Metro
npx tsc --noEmit                 # typecheck — must be clean
npx eslint src                   # lint — must be clean (0 warnings at handoff)
node scripts/check-band-simulator.ts
node scripts/check-uil-wbgt.ts
node scripts/check-plan-check.ts
npm run test:invites             # Firestore rules + flows on emulators (50/50)
npm run check:auth               # auth config sanity
```

- **Sample mode** (no Firebase, sample data tagged everywhere; used for screenshots):
  1. Move `.env` aside.
  2. Restart Metro with `--clear`.
  3. Open screens with deep links such as `heatsenseapp://dashboard?role=coach&tab=home`. Roles are `coach`, `athlete` and `trainer`. Tabs include `home`, `plan`, `team`, `alerts`, `profile`, `band`, `sessions`, `learn`, `monitor`, `athletes` and `protocols`.
  4. Put `.env` back when done.
- **Emulator mode:** in `.env.local`, set `EXPO_PUBLIC_USE_FIREBASE_EMULATORS=1` and `EXPO_PUBLIC_USE_AUTH_EMULATOR=1`, then run `npm run emulators`. Remove `.env.local` to return to real Firebase.
- **Seeded emulator data:** `node scripts/seed-emulator.mjs` (add `--live` to keep band samples moving) creates a coach, trainer and three athletes (one pending), three weeks of practices, today's open practice and live vitals. The emulator-only sign-in details are in the script's header. Turn off Profile → Sample athletes to see the real team.
- **Firestore rules:** after a rules change, deploy with `npx -y firebase-tools@14 deploy --only firestore:rules`, and run `npm run test:invites` first.

## 5. Open work

| # | Item | State | Notes |
|---|---|---|---|
| 1 | README screenshots | done | Recaptured Oct 23. |
| 2 | Trends for real athletes | done | Kept in memory on the watching phone (`vitalsHistory` in `state/team-session.ts`). |
| 3 | Dev warnings (yellow LogBox bar) | done | Was a require cycle; fixed in `wristband-asset.ts`. |
| 4 | First tap on *Save reading* only dismisses the keyboard | needs a real device | Seen only under automation; `keyboardShouldPersistTaps="always"` is already set. |
| 5 | Swap in the 8 band angle renders | blocked | The image file isn't in the repo yet; the current render is used. |
| 6 | Parent/guardian consent flow | blocked | Needs a product decision from the team. |
| 7 | README team names + AI-use disclosure | blocked | Required by the contest; the team must supply the wording. |
| 8 | Live sign-in test on a real account | blocked | The user does it (no automated real-credential entry). |
| 9 | Real band over Bluetooth | future | Replace the simulator in `useBandUplink` with BLE packets (marked `ponytail:` there). The Firestore path and the UI stay. |
| 13 | Real-team smoke test | done | Oct 23 on the emulators with seeded data: trainer (Monitor, Athletes, Protocols writes), athlete (Learn reads the plan, Home), coach (Team roster, approve, heat history, Alerts). Found and fixed a cached-team bug when switching accounts. |
| 11 | Share Protocols data with staff | done | Team docs: `safety/eap` (everyone reads; athletes see it on Learn), `incidents` and `readiness/{day}` (staff only). Phone-local only in sample mode. |
| 12 | Profile photo for teammates | future | Stored on the phone only (Firebase Storage needs the Blaze plan). |
| 10 | Server push for zone changes | future | Needs Cloud Functions (Blaze plan). Today, zone alerts fire only when the phone sees the new reading. |

## 6. Map of key files

```
src/app/                      routes (index, welcome, sign-in, role, setup/*, athlete/*, team/*, dashboard, athlete-vitals, plan-editor, pair-band, notifications, ready)
src/components/coach-today.tsx   coach/trainer Home
src/components/coach-tabs.tsx    Team, Plan (ZoneRules), Profile
src/components/role-tabs.tsx     athlete Home/Band/Sessions/Learn, trainer Monitor/Protocols
src/components/alerts-tab.tsx    alerts derived from today's practice
src/components/vitals.tsx        vitals rows + VitalsDetail (signal picker)
src/components/whoop-ui.tsx      Rows, ListRow, StatRow, Facts, Card, SectionTitle, SampleTag
src/components/field-check-sheet.tsx  add a WBGT reading / start-end practice
src/components/band-journey.tsx  onboarding band shared-element
src/services/*                   Firestore + auth + notifications
src/state/*                      hooks: team-session, demo-team, band-uplink, heat-alerts, preferences
src/lib/practice.ts, uil-wbgt.ts  UIL zones and guidance
firebase/firestore.rules         the backend
scripts/test-team-invites.mjs    rules/flow tests
```
