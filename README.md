# HeatSense

HeatSense is an Expo and React Native application for UIL member schools managing heat exposure during outdoor practice. Staff enter a measured wet-bulb globe temperature (WBGT), and the app maps it to the school's UIL Class 2 or Class 3 zone, presents the corresponding activity limits, checks a practice plan, schedules rechecks, and records what staff acknowledged. Coaches, athletic trainers, and athletes use role-specific views of the same team and practice data.

The project is a 2026 Congressional App Challenge entry for Texas District 4. [Watch the three-minute demonstration](https://youtu.be/qMQcvorwxp8). The [UIL 2026–27 required plan](https://www.uiltexas.org/health/info/heat-stress-and-athletic-participation) is the governing source for school practice decisions. HeatSense is a decision-support prototype, not a medical device or a substitute for a school's emergency action plan.

## Implemented system

| Component | Implementation |
| --- | --- |
| Client | Expo SDK 57, React Native 0.86, Expo Router, TypeScript 6 |
| Identity | Firebase Authentication; coach-owned teams, six-digit invite codes, pending membership and coach approval |
| Storage and authorization | Cloud Firestore on the Firebase Spark plan; security rules enforce schema, role permissions, timestamps, and append-only WBGT readings |
| Heat engine | Pure TypeScript WBGT classifier for UIL Classes 2 and 3, shared by practice guidance, plan checks, and display logic |
| Practice workflow | Staff-entered field readings, zone-specific limits, plan validation and suggested timing fixes, recheck reminders, and shareable practice records |
| iOS glance view | Expo Live Activity shows the zone and WBGT, adding practice and break clocks after a session starts |
| Weather context | A separately labeled local-weather WBGT estimate; it does not replace a field measurement or drive compliance records |
| Team telemetry demonstration | Deterministic simulated athlete vitals, recovery states, and Firestore uplink, visibly labeled as simulation |

### WBGT and practice invariant

`src/lib/uil-wbgt.ts` classifies plausible WBGT values after conversion and rounding to one decimal place, using the school's fixed UIL class. `src/lib/plan-check.ts` compares a proposed practice schedule with the zone's activity limits. `src/services/practice-sessions.ts` persists measured readings and their timestamps. Firestore rules in `firebase/firestore.rules` independently recompute the submitted zone and reject a mismatch; the app's UI is not the authorization boundary. Readings cannot be deleted through the rules, and later changes are limited to the permitted guidance acknowledgment.

For example, **88.4°F WBGT in UIL Class 3 is Orange**: practice is limited to two hours, with at least four separate rest breaks per hour of at least four minutes. The school must follow the complete UIL plan, including its other equipment and rapid-cooling requirements.

### Team data and access

A coach creates the team and its invitation code. Athletes and athletic trainers request membership; the coach approves or rejects each request. Firebase Authentication identifies the caller, while Firestore rules decide which records that caller may read or mutate. Coaches manage sessions; approved trainers can add readings; athletes follow team conditions and access their own data. The vitals collection restricts writes to the athlete's document during an active practice and prevents teammates from reading one another's telemetry.

### Band demonstration boundary

The team assembled and separately tested a wired sensor prototype. **The submitted app does not contain band firmware or a Bluetooth Low Energy integration.** Its pairing interaction is a labeled demo, and the team vitals shown in the app come from `src/lib/band-simulator.ts`. Simulated samples can travel through the app's Firestore vitals path; this validates the data flow and UI, not physiological accuracy or live team monitoring. The prototype's sensor output has not been clinically validated. Neither the band nor its recovery indicator diagnoses heat illness.

## Repository map

| Path | Responsibility |
| --- | --- |
| `src/app/` | Expo Router screens and role-specific navigation |
| `src/components/` | Practice, dashboard, band, and shared interface components |
| `src/lib/uil-wbgt.ts` | Classifier and UIL zone guidance |
| `src/lib/plan-check.ts` | Practice-plan constraint checks |
| `src/services/` | Authentication, Firestore persistence, alerts, and team operations |
| `src/state/` | Session, team, athlete, and simulated telemetry state |
| `src/widgets/` | iOS Live Activity presentation |
| `firebase/firestore.rules` | Server-side access and data invariants |
| `scripts/` | Logic, auth, emulator, and documentation checks |
| `docs/engineering/` | Setup and architecture details |

## Run and verify

Follow [development setup](docs/engineering/development.md) for Firebase configuration, native builds, and emulator instructions. From the repository root:

```sh
npm install
npm run typecheck
npm run lint
npm run check:unused
npm run check:docs
npm run test:logic
```

`npm run test:invites` runs the Firestore and Authentication emulator checks when the Firebase CLI and emulator prerequisites are available. The logic suite covers WBGT boundaries, recheck timing, practice-plan validation, and deterministic band simulation. These checks establish code-level behavior; a supervised field study and sensor validation have not been completed.

## Sources and licensing

- [UIL heat stress plan](https://www.uiltexas.org/health/info/heat-stress-and-athletic-participation) and [UIL FAQ](https://www.uiltexas.org/health/info/heat-stress-and-athletic-participationWBGTs)
- [Architecture](docs/engineering/architecture.md), [development guide](docs/engineering/development.md), and [documentation index](docs/README.md)
- [MIT license](LICENSE)
