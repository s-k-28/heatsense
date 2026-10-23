// Seeds the local Firebase emulators with a realistic team so every screen can be tried with real
// data and the real security rules: a coach, an athletic trainer, three athletes (one waiting for
// approval), an open practice with readings, past practices, and live band samples.
//
//   npm run emulators                      # in one terminal
//   node scripts/seed-emulator.mjs         # seed once
//   node scripts/seed-emulator.mjs --live  # seed, then keep the band samples moving every 15 s
//
// Emulator-only test accounts (never use these anywhere else). Sign in with email and password:
//   coach@heatsense.test · trainer@heatsense.test · athlete@heatsense.test
//   password for all three: heat-demo-2026
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
if (!process.env.FIRESTORE_EMULATOR_HOST.includes('127.0.0.1') && !process.env.FIRESTORE_EMULATOR_HOST.includes('localhost')) {
  throw new Error('Refusing to seed anything but a local emulator.');
}

const app = initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'heatsense-aa3c8' });
const auth = getAuth(app);
const db = getFirestore(app);
const PASSWORD = 'heat-demo-2026';
const MIN = 60_000;
const DAY = 86_400_000;
const now = Date.now();
const at = (ms) => Timestamp.fromMillis(ms);

async function user(email, displayName) {
  try { return (await auth.getUserByEmail(email)).uid; } catch {}
  return (await auth.createUser({ email, password: PASSWORD, displayName, emailVerified: true })).uid;
}

const coach = await user('coach@heatsense.test', 'Dana Rivera');
const trainer = await user('trainer@heatsense.test', 'Sam Okafor');
const maya = await user('athlete@heatsense.test', 'Maya Chen');
// Teammates who only need to exist in the roster.
const leo = 'seed-athlete-leo';
const ana = 'seed-athlete-ana';

const teamId = 'seed-team';
const code = '482913';
const preview = { teamName: 'Emerson Mavericks', school: 'Emerson High School', sport: 'Football' };
await db.doc(`teams/${teamId}`).set({ name: 'Emerson Mavericks', school: 'Emerson High School', sport: 'Football', level: 'Varsity', coachUid: coach, createdBy: coach, status: 'active', activeCode: code, createdAt: at(now - 30 * DAY), updatedAt: at(now) });
await db.doc(`inviteCodes/${code}`).set({ teamId, team: preview, createdBy: coach, createdAt: at(now - 30 * DAY), expiresAt: at(now + 7 * DAY), revoked: false });

const member = (uid, role, status, displayName, joinedDaysAgo) => db.doc(`teamMembers/${teamId}_${uid}`).set({
  role, status, inviteCode: code, team: preview, requestedAt: at(now - (joinedDaysAgo + 1) * DAY),
  teamId, userId: uid, displayName, email: null, joinedAt: status === 'active' ? at(now - joinedDaysAgo * DAY) : null,
});
await member(trainer, 'trainer', 'active', 'Sam Okafor', 25);
await member(maya, 'athlete', 'active', 'Maya Chen', 20);
await member(leo, 'athlete', 'active', 'Leo Park', 4);
await member(ana, 'athlete', 'pending', 'Ana Ruiz', 0);

// Past practices: most weekdays for three weeks, heat building.
const sessions = db.collection(`teams/${teamId}/sessions`);
for (let d = 21; d >= 1; d--) {
  const start = new Date(now - d * DAY); start.setHours(16, 0, 0, 0);
  if (start.getDay() === 0) continue;
  const id = `past-${d}`;
  await sessions.doc(id).set({ venue: 'Memorial Stadium', uilClass: 3, recheckMinutes: 30, policy: 'uil-wbgt@2025-26', startedBy: coach, startedAt: at(start.getTime()), endedAt: at(start.getTime() + 90 * MIN) });
  const peak = Math.round((80 + 6 * Math.sin(d / 3) + (21 - d) * 0.15) * 10) / 10;
  const zone = peak >= 90.1 ? 'red' : peak >= 87 ? 'orange' : peak >= 82 ? 'yellow' : 'green';
  await sessions.doc(id).collection('readings').doc('r1').set({ wbgtF: peak, enteredValue: peak, enteredUnit: 'F', source: 'handheld', measuredAt: at(start.getTime() + 40 * MIN), zone, uilClass: 3, recordedBy: coach, recordedAt: at(start.getTime() + 40 * MIN), acknowledgedBy: coach, acknowledgedAt: at(start.getTime() + 41 * MIN) });
}

// Today's practice, still open: Green at the start, Yellow now, the latest not yet applied.
const today = sessions.doc('today');
await today.set({ venue: 'Memorial Stadium', uilClass: 3, recheckMinutes: 30, policy: 'uil-wbgt@2025-26', startedBy: coach, startedAt: at(now - 50 * MIN), endedAt: null });
await today.collection('readings').doc('r1').set({ wbgtF: 80.6, enteredValue: 80.6, enteredUnit: 'F', source: 'handheld', measuredAt: at(now - 45 * MIN), zone: 'green', uilClass: 3, recordedBy: coach, recordedAt: at(now - 45 * MIN), acknowledgedBy: coach, acknowledgedAt: at(now - 44 * MIN) });
await today.collection('readings').doc('r2').set({ wbgtF: 84.2, enteredValue: 84.2, enteredUnit: 'F', source: 'handheld', measuredAt: at(now - 12 * MIN), zone: 'yellow', uilClass: 3, recordedBy: trainer, recordedAt: at(now - 12 * MIN), acknowledgedBy: null, acknowledgedAt: null });

// Live band samples for the two approved athletes; Leo's heart rate stays high through rest.
async function vitals(t) {
  const wave = (base, amp, period, phase = 0) => Math.round(base + amp * Math.sin(t / period + phase));
  const write = (uid, hr, recovery) => today.collection('vitals').doc(uid).set({
    heartRate: hr, skinTempF: Math.round((93.2 + Math.sin(t / 300) * 0.6) * 10) / 10, sweat: Math.round((7 + Math.sin(t / 200) * 2) * 10) / 10,
    movement: wave(55, 30, 90), spo2: wave(97, 1, 120), recovery, source: 'simulated', serial: 'HS-02A7',
    sampledAt: Timestamp.now(), updatedAt: Timestamp.now(),
  });
  await write(maya, wave(138, 22, 90), 'usual');
  await write(leo, wave(158, 8, 90, 1), t % 120 < 60 ? 'watch' : 'usual');
}
await vitals(0);
console.log(`Seeded team ${teamId} (code ${code}) with coach, trainer, 3 athletes, ${21} days of practices and live vitals.`);

if (process.argv.includes('--live')) {
  console.log('Updating band samples every 15 s. Ctrl+C to stop.');
  let t = 0;
  setInterval(() => { t += 15; vitals(t).catch((e) => console.error(e.message)); }, 15_000);
}
