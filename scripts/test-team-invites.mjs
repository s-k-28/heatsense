// End-to-end test of the team invitation backend against the Firebase Emulator Suite.
//
//   npm run test:invites
//
// That starts the Auth, Firestore and Functions emulators and runs this file with
// real signed-in accounts (coach, athlete, a stranger), the real callables and the
// real security rules. Admin access is used only to set up edge cases (expiry, a
// leading-zero code) and to inspect what was stored.
import { createCipheriv, createHmac, hkdfSync, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { deleteApp, initializeApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, updateProfile } from 'firebase/auth';
import { collection, connectFirestoreEmulator, doc, getDoc, getDocs, getFirestore, onSnapshot, query, where } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const projectId = process.env.GCLOUD_PROJECT ?? 'heatsense-aa3c8';
const requireFromFunctions = createRequire(join(root, 'functions', 'package.json'));
const { initializeApp: initAdmin } = requireFromFunctions('firebase-admin/app');
const { getFirestore: getAdminFirestore, Timestamp } = requireFromFunctions('firebase-admin/firestore');
const admin = getAdminFirestore(initAdmin({ projectId }, 'admin'));

let passed = 0;
let failed = 0;
async function test(name, body) {
  try {
    await body();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed++;
    console.log(`  ✗ ${name}\n      ${error?.stack ?? error}`);
  }
}
function assert(condition, message) { if (!condition) throw new Error(message); }
function equal(actual, expected, message) { if (actual !== expected) throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
async function rejects(promise, code, message) {
  try { await promise; } catch (error) {
    if (code && error.code !== code) throw new Error(`${message}: expected ${code}, got ${error.code} (${error.message})`);
    return error;
  }
  throw new Error(`${message}: expected a rejection`);
}

let userCount = 0;
async function signUp(label) {
  const app = initializeApp({ apiKey: 'demo-key', projectId, authDomain: `${projectId}.firebaseapp.com` }, `${label}-${++userCount}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  const functions = getFunctions(app);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  const { user } = await createUserWithEmailAndPassword(auth, `${label}-${Date.now()}-${userCount}@example.com`, 'password123');
  await updateProfile(user, { displayName: label });
  await user.getIdToken(true);
  const call = async (name, data) => (await httpsCallable(functions, name)(data)).data;
  return { app, auth, db, uid: user.uid, call };
}

const details = { school: 'McKinney High', teamName: 'Lions Varsity', sport: 'Football', level: 'Varsity' };
const ago = (ms) => Timestamp.fromMillis(Date.now() - ms);

// Mirrors the server's key derivation so the test can plant a known leading-zero code.
const secret = readFileSync(join(root, 'functions', '.secret.local'), 'utf8').match(/INVITE_CODE_SECRET=(.*)/)[1].trim();
const derive = (info) => Buffer.from(hkdfSync('sha256', secret, 'heatsense-invites', info, 32));
const hashCode = (code) => createHmac('sha256', derive('code-hmac')).update(code).digest('hex');
function encryptCode(code) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', derive('code-cipher'), iv);
  const body = Buffer.concat([cipher.update(code, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map((part) => part.toString('base64')).join('.');
}

console.log('\nHeatSense team invites (emulators)\n');

const coach = await signUp('coach');
const athlete = await signUp('athlete');
const stranger = await signUp('stranger');
let invite;

console.log('Coach creates a team');
await test('creates the team and returns a 6-digit code', async () => {
  invite = await coach.call('ensureTeamInvite', { details });
  assert(/^\d{6}$/.test(invite.code), `code ${invite.code} is not 6 digits`);
  assert(new Date(invite.expiresAt).getTime() > Date.now(), 'expiry is in the past');
});
await test('stores team, coach membership and a hashed invite (no plain-text code)', async () => {
  const team = (await admin.doc(`teams/${invite.teamId}`).get()).data();
  equal(team.coachUid, coach.uid, 'coachUid');
  equal(team.createdBy, coach.uid, 'createdBy');
  equal(team.name, details.teamName, 'name');
  equal(team.status, 'active', 'status');
  const member = (await admin.doc(`teamMembers/${invite.teamId}_${coach.uid}`).get()).data();
  equal(member.role, 'coach', 'coach membership role');
  const stored = (await admin.doc(`teamInvites/${team.activeInviteId}`).get()).data();
  equal(stored.codeHash, hashCode(invite.code), 'codeHash');
  equal(stored.status, 'active', 'invite status');
  equal(stored.usageCount, 0, 'usageCount');
  assert(!JSON.stringify(stored).includes(`"${invite.code}"`), 'invite record contains the plain code');
  assert(!JSON.stringify(team).includes(invite.code), 'team record contains the plain code');
});
await test('retrying and "refreshing" return the same team and code', async () => {
  const again = await coach.call('ensureTeamInvite', { details });
  equal(again.code, invite.code, 'code after retry');
  equal(again.teamId, invite.teamId, 'teamId after retry');
  const mine = await coach.call('getMyTeamInvite', {});
  equal(mine.invite.code, invite.code, 'code from getMyTeamInvite');
  equal(mine.team.teamName, details.teamName, 'team name from getMyTeamInvite');
  const teams = await admin.collection('teams').where('coachUid', '==', coach.uid).get();
  equal(teams.size, 1, 'teams for this coach');
});
await test('parallel first-time requests create exactly one team and one code', async () => {
  const fresh = await signUp('coach-parallel');
  const results = await Promise.all(Array.from({ length: 6 }, () => fresh.call('ensureTeamInvite', { details: { ...details, teamName: 'Parallel' } })));
  equal(new Set(results.map((r) => r.teamId)).size, 1, 'distinct teams');
  equal(new Set(results.map((r) => r.code)).size, 1, 'distinct codes');
  const invites = await admin.collection('teamInvites').where('teamId', '==', results[0].teamId).get();
  equal(invites.size, 1, 'invite records');
});
await test('rejects missing fields and signed-out callers', async () => {
  await rejects(coach.call('ensureTeamInvite', { details: { ...details, school: ' ' } }), 'functions/invalid-argument', 'blank school');
  const app = initializeApp({ apiKey: 'demo-key', projectId }, 'signed-out');
  const functions = getFunctions(app);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  await rejects(httpsCallable(functions, 'lookupInvite')({ code: invite.code }), 'functions/unauthenticated', 'signed-out lookup');
  await rejects(httpsCallable(functions, 'ensureTeamInvite')({ details }), 'functions/unauthenticated', 'signed-out create');
  await deleteApp(app);
});

console.log('Athlete joins');
await test('a valid code shows the right team preview', async () => {
  const result = await athlete.call('lookupInvite', { code: invite.code });
  equal(result.status, 'valid', 'status');
  equal(result.teamId, invite.teamId, 'teamId');
  equal(result.team.teamName, details.teamName, 'teamName');
  equal(result.team.school, details.school, 'school');
  assert(!('inviteId' in result), 'lookup leaked the invite id');
});
await test('join creates one pending request; repeats are not duplicated', async () => {
  const first = await athlete.call('requestToJoinTeam', { code: invite.code });
  equal(first.status, 'pending', 'first status');
  const second = await athlete.call('requestToJoinTeam', { code: invite.code });
  equal(second.status, 'pending', 'second status');
  const member = (await admin.doc(`teamMembers/${invite.teamId}_${athlete.uid}`).get()).data();
  equal(member.status, 'pending', 'stored status');
  equal(member.role, 'athlete', 'stored role');
  equal(member.userId, athlete.uid, 'stored userId');
  equal(member.team?.sport, details.sport, 'team preview saved on the request');
  equal(member.team?.teamName, details.teamName, 'team name saved on the request');
  assert(member.requestedAt, 'requestedAt missing');
  const team = (await admin.doc(`teams/${invite.teamId}`).get()).data();
  equal(member.inviteId, team.activeInviteId, 'inviteId');
  equal((await admin.doc(`teamInvites/${team.activeInviteId}`).get()).data().usageCount, 1, 'usageCount');
});
await test('the coach cannot join their own team', async () => {
  await rejects(coach.call('requestToJoinTeam', { code: invite.code }), 'functions/failed-precondition', 'coach joining own team');
});

console.log('Security rules');
await test('a pending athlete cannot read the team yet, but can read their own request', async () => {
  await rejects(getDoc(doc(athlete.db, 'teams', invite.teamId)), 'permission-denied', 'pending athlete reading team');
  const own = await getDocs(query(collection(athlete.db, 'teamMembers'), where('userId', '==', athlete.uid)));
  equal(own.size, 1, 'own memberships');
});
await test('nobody can read or list invites, the code index, or other people’s memberships', async () => {
  const team = (await admin.doc(`teams/${invite.teamId}`).get()).data();
  await rejects(getDoc(doc(coach.db, 'teamInvites', team.activeInviteId)), 'permission-denied', 'coach reading invite');
  await rejects(getDocs(collection(athlete.db, 'teamInvites')), 'permission-denied', 'athlete listing invites');
  await rejects(getDocs(collection(athlete.db, 'inviteCodeIndex')), 'permission-denied', 'athlete listing code index');
  await rejects(getDoc(doc(stranger.db, 'teamMembers', `${invite.teamId}_${athlete.uid}`)), 'permission-denied', 'stranger reading membership');
  await rejects(getDocs(query(collection(stranger.db, 'teamMembers'), where('teamId', '==', invite.teamId))), 'permission-denied', 'stranger listing roster');
});
await test('clients cannot write teams, invites or memberships directly', async () => {
  const { setDoc, updateDoc } = await import('firebase/firestore');
  await rejects(setDoc(doc(athlete.db, 'teamInvites', 'forged'), { teamId: invite.teamId }), 'permission-denied', 'forging an invite');
  await rejects(updateDoc(doc(athlete.db, 'teamMembers', `${invite.teamId}_${athlete.uid}`), { status: 'active' }), 'permission-denied', 'self-approval write');
  await rejects(updateDoc(doc(coach.db, 'teams', invite.teamId), { coachUid: athlete.uid }), 'permission-denied', 'ownership change');
});

console.log('Approval');
await test('athletes and strangers cannot approve', async () => {
  await rejects(athlete.call('respondToJoinRequest', { teamId: invite.teamId, athleteUid: athlete.uid, approve: true }), 'functions/permission-denied', 'self-approval');
  await rejects(stranger.call('respondToJoinRequest', { teamId: invite.teamId, athleteUid: athlete.uid, approve: true }), 'functions/permission-denied', 'stranger approval');
  equal((await admin.doc(`teamMembers/${invite.teamId}_${athlete.uid}`).get()).data().status, 'pending', 'status after refused approvals');
});
await test('the coach sees the pending request live, approves it, and the athlete is updated live', async () => {
  const pendingSeen = new Promise((resolve, reject) => {
    const stop = onSnapshot(
      query(collection(coach.db, 'teamMembers'), where('teamId', '==', invite.teamId), where('role', '==', 'athlete'), where('status', '==', 'pending')),
      (snap) => { if (snap.docs.some((d) => d.data().userId === athlete.uid)) { stop(); resolve(); } },
      reject,
    );
  });
  await pendingSeen;
  const approvedSeen = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('athlete listener never saw approval')), 10_000);
    const stop = onSnapshot(
      query(collection(athlete.db, 'teamMembers'), where('userId', '==', athlete.uid)),
      (snap) => { if (snap.docs.some((d) => d.data().status === 'active')) { clearTimeout(timer); stop(); resolve(); } },
      reject,
    );
  });
  const result = await coach.call('respondToJoinRequest', { teamId: invite.teamId, athleteUid: athlete.uid, approve: true });
  equal(result.status, 'approved', 'approval result');
  await approvedSeen;
  const member = (await admin.doc(`teamMembers/${invite.teamId}_${athlete.uid}`).get()).data();
  equal(member.status, 'active', 'stored status');
  assert(member.joinedAt, 'joinedAt missing');
});
await test('the approved athlete can now read the team, and re-joining says "member"', async () => {
  const team = await getDoc(doc(athlete.db, 'teams', invite.teamId));
  equal(team.data().name, details.teamName, 'team name');
  equal((await athlete.call('requestToJoinTeam', { code: invite.code })).status, 'member', 'rejoin status');
  await rejects(coach.call('respondToJoinRequest', { teamId: invite.teamId, athleteUid: athlete.uid, approve: false }), 'functions/failed-precondition', 'answering twice');
});
await test('an approved athlete cannot create a team of their own', async () => {
  await rejects(athlete.call('ensureTeamInvite', { details }), 'functions/permission-denied', 'athlete creating a team');
});

console.log('Codes');
await test('regenerating revokes the old code and issues a new one', async () => {
  const fresh = await coach.call('regenerateInvite', { teamId: invite.teamId });
  assert(/^\d{6}$/.test(fresh.code), 'new code format');
  assert(fresh.code !== invite.code, 'code did not change');
  const reader = await signUp('athlete-revoked');
  equal((await reader.call('lookupInvite', { code: invite.code })).status, 'not-found', 'old code lookup');
  equal((await reader.call('lookupInvite', { code: fresh.code })).status, 'valid', 'new code lookup');
  const old = (await admin.collection('teamInvites').where('teamId', '==', invite.teamId).where('status', '==', 'revoked').get()).docs[0]?.data();
  assert(old?.revokedAt, 'old invite has no revokedAt');
  equal((await coach.call('getMyTeamInvite', {})).invite.code, fresh.code, 'code after refresh');
  invite = fresh;
});
await test('only the coach can regenerate', async () => {
  await rejects(stranger.call('regenerateInvite', { teamId: invite.teamId }), 'functions/permission-denied', 'stranger regenerating');
});
await test('concurrent regenerations leave exactly one active code', async () => {
  const results = await Promise.all(Array.from({ length: 5 }, () => coach.call('regenerateInvite', { teamId: invite.teamId }).catch((e) => e)));
  assert(results.some((r) => r.code), 'no regeneration succeeded');
  const active = await admin.collection('teamInvites').where('teamId', '==', invite.teamId).where('status', '==', 'active').get();
  equal(active.size, 1, 'active invites');
  const indexed = await admin.collection('inviteCodeIndex').where('teamId', '==', invite.teamId).get();
  equal(indexed.size, 1, 'index entries');
  invite = (await coach.call('getMyTeamInvite', {})).invite;
  equal(active.docs[0].data().codeHash, hashCode(invite.code), 'active code matches what the coach sees');
});
await test('an expired code says expired, and the coach gets a fresh code on return', async () => {
  const team = (await admin.doc(`teams/${invite.teamId}`).get()).data();
  const stored = (await admin.doc(`teamInvites/${team.activeInviteId}`).get()).data();
  await admin.doc(`teamInvites/${team.activeInviteId}`).update({ expiresAt: ago(1000) });
  await admin.doc(`inviteCodeIndex/${stored.codeHash}`).update({ expiresAt: ago(1000) });
  const reader = await signUp('athlete-expired');
  equal((await reader.call('lookupInvite', { code: invite.code })).status, 'expired', 'lookup');
  await rejects(reader.call('requestToJoinTeam', { code: invite.code }), 'functions/failed-precondition', 'joining with an expired code');
  const renewed = await coach.call('getMyTeamInvite', {});
  assert(renewed.invite.code !== invite.code || renewed.invite.expiresAt !== invite.expiresAt, 'expired code was not renewed');
  equal((await reader.call('lookupInvite', { code: renewed.invite.code })).status, 'valid', 'renewed code');
  invite = renewed.invite;
});
await test('leading-zero codes keep their zeros end to end', async () => {
  const code = '004821';
  const team = (await admin.doc(`teams/${invite.teamId}`).get()).data();
  const current = (await admin.doc(`teamInvites/${team.activeInviteId}`).get()).data();
  const inviteRef = admin.collection('teamInvites').doc();
  const expiresAt = Timestamp.fromMillis(Date.now() + 86_400_000);
  const batch = admin.batch();
  batch.update(admin.doc(`teamInvites/${team.activeInviteId}`), { status: 'revoked', revokedAt: Timestamp.now() });
  batch.delete(admin.doc(`inviteCodeIndex/${current.codeHash}`));
  batch.set(inviteRef, { teamId: invite.teamId, codeHash: hashCode(code), codeCipher: encryptCode(code), status: 'active', createdBy: coach.uid, createdAt: Timestamp.now(), expiresAt, revokedAt: null, usageCount: 0 });
  batch.set(admin.doc(`inviteCodeIndex/${hashCode(code)}`), { inviteId: inviteRef.id, teamId: invite.teamId, expiresAt });
  batch.update(admin.doc(`teams/${invite.teamId}`), { activeInviteId: inviteRef.id });
  await batch.commit();
  equal((await coach.call('getMyTeamInvite', {})).invite.code, code, 'coach sees');
  const reader = await signUp('athlete-zero');
  equal((await reader.call('lookupInvite', { code })).status, 'valid', 'lookup with zeros');
  equal((await reader.call('lookupInvite', { code: '004 821' })).status, 'valid', 'lookup with a space');
  equal((await reader.call('lookupInvite', { code: '4821' })).status, 'not-found', 'lookup without zeros');
});
await test('wrong formats are rejected', async () => {
  const reader = await signUp('athlete-format');
  for (const code of ['12345', '1234567', 'abcdef', '']) equal((await reader.call('lookupInvite', { code })).status, 'not-found', `code "${code}"`);
});

console.log('Abuse protection');
await test('repeated wrong codes lock the account out, even for a valid code', async () => {
  const guesser = await signUp('guesser');
  const statuses = [];
  for (let i = 0; i < 6; i++) statuses.push((await guesser.call('lookupInvite', { code: String(100000 + i) })).status);
  assert(statuses.slice(0, 4).every((s) => s === 'not-found' || s === 'valid'), `early statuses ${statuses}`);
  equal(statuses[5], 'rate-limited', 'status after five misses');
  const locked = await guesser.call('lookupInvite', { code: invite.code });
  equal(locked.status, 'rate-limited', 'valid code while locked');
  assert(locked.retryAfterSeconds > 0, 'retryAfterSeconds');
  await rejects(guesser.call('requestToJoinTeam', { code: invite.code }), 'functions/resource-exhausted', 'joining while locked');
  const limit = (await admin.doc(`rateLimits/uid_${guesser.uid}`).get()).data();
  equal(limit.lockouts, 1, 'lockouts recorded');
});

console.log('Athlete profile (onboarding page 1)');
{
  const { serverTimestamp, setDoc } = await import('firebase/firestore');
  const basics = (overrides = {}) => ({
    fullName: 'Jordan Lee', ageBand: '13to17', grade: '10th', sport: 'Football', sportSource: 'team', jersey: '00', teamId: invite.teamId,
    onboarding: { step: 'body', profileCompletedAt: serverTimestamp() }, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...overrides,
  });
  await test('the athlete saves their own profile, and "00" jersey keeps its zeros', async () => {
    await setDoc(doc(athlete.db, 'athletes', athlete.uid), basics());
    const saved = (await getDoc(doc(athlete.db, 'athletes', athlete.uid))).data();
    equal(saved.jersey, '00', 'jersey');
    equal(saved.onboarding.step, 'body', 'onboarding step');
  });
  await test('updates merge without changing createdAt', async () => {
    await setDoc(doc(athlete.db, 'athletes', athlete.uid), { grade: '11th', updatedAt: serverTimestamp() }, { merge: true });
    equal((await admin.doc(`athletes/${athlete.uid}`).get()).data().grade, '11th', 'grade after update');
    await rejects(setDoc(doc(athlete.db, 'athletes', athlete.uid), { createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true }), 'permission-denied', 'rewriting createdAt');
  });
  await test('bad values and extra fields are refused', async () => {
    const other = await signUp('athlete-profile');
    const ref = doc(other.db, 'athletes', other.uid);
    await rejects(setDoc(ref, basics({ grade: '13th' })), 'permission-denied', 'unknown grade');
    await rejects(setDoc(ref, basics({ jersey: 'abc' })), 'permission-denied', 'letters in jersey');
    await rejects(setDoc(ref, basics({ jersey: '1234' })), 'permission-denied', 'four-digit jersey');
    await rejects(setDoc(ref, basics({ birthDate: '2010-04-18' })), 'permission-denied', 'storing a birth date');
    await rejects(setDoc(ref, basics({ fullName: 'J' })), 'permission-denied', 'one-letter name');
    await rejects(setDoc(ref, basics({ onboarding: { step: 'profile', profileCompletedAt: serverTimestamp() } })), 'permission-denied', 'step not past page 1');
    await setDoc(ref, basics({ jersey: null, teamId: null, sportSource: 'self', sport: 'Soccer' }));
  });
  await test('nobody else can write it; strangers can’t read it', async () => {
    await rejects(setDoc(doc(stranger.db, 'athletes', athlete.uid), basics()), 'permission-denied', 'stranger writing');
    await rejects(getDoc(doc(stranger.db, 'athletes', athlete.uid)), 'permission-denied', 'stranger reading');
  });
  await test('the coach can read an approved athlete, but not a pending one', async () => {
    equal((await getDoc(doc(coach.db, 'athletes', athlete.uid))).data().fullName, 'Jordan Lee', 'approved athlete name');
    const waiting = await signUp('athlete-pending');
    const live = (await coach.call('getMyTeamInvite', {})).invite.code;
    equal((await waiting.call('requestToJoinTeam', { code: live })).status, 'pending', 'pending request');
    await setDoc(doc(waiting.db, 'athletes', waiting.uid), basics());
    await rejects(getDoc(doc(coach.db, 'athletes', waiting.uid)), 'permission-denied', 'coach reading pending athlete');
  });
}

console.log('Athlete health (onboarding page 2)');
{
  const { serverTimestamp, setDoc, updateDoc, deleteDoc } = await import('firebase/firestore');
  const health = (overrides = {}) => ({
    heightCm: 175.3, weightKg: 68, previousHeatIllness: 'yes', previousHeatIllnessType: 'heatExhaustion',
    heatConcerns: ['heatIntolerance', 'other'], otherConcern: 'Cramps late in practice', heatAcclimatization: 'somewhat',
    updatedAt: serverTimestamp(), ...overrides,
  });
  const healthRef = (user, uid = user.uid) => doc(user.db, 'athletes', uid, 'private', 'health');
  await test('the athlete saves and reads their own health answers', async () => {
    await setDoc(healthRef(athlete), health());
    equal((await getDoc(healthRef(athlete))).data().previousHeatIllnessType, 'heatExhaustion', 'stored type');
  });
  await test('an all-blank answer set is allowed (every question is optional)', async () => {
    const other = await signUp('athlete-blank');
    await setDoc(healthRef(other), health({ heightCm: null, weightKg: null, previousHeatIllness: null, previousHeatIllnessType: null, heatConcerns: [], otherConcern: null, heatAcclimatization: null }));
  });
  await test('even the approved athlete’s coach cannot read health answers', async () => {
    equal((await getDoc(doc(coach.db, 'athletes', athlete.uid))).exists(), true, 'coach can still read the profile');
    await rejects(getDoc(healthRef(coach, athlete.uid)), 'permission-denied', 'coach reading health');
    await rejects(getDoc(healthRef(stranger, athlete.uid)), 'permission-denied', 'stranger reading health');
    await rejects(setDoc(healthRef(coach, athlete.uid), health()), 'permission-denied', 'coach writing health');
  });
  await test('inconsistent or extra answers are refused', async () => {
    const ref = healthRef(athlete);
    await rejects(setDoc(ref, health({ heatConcerns: ['none', 'heatIntolerance'], otherConcern: null })), 'permission-denied', '"None" with another concern');
    await rejects(setDoc(ref, health({ heatConcerns: ['preferNot', 'other'] })), 'permission-denied', '"Prefer not" with another concern');
    await rejects(setDoc(ref, health({ previousHeatIllness: 'no' })), 'permission-denied', 'illness type without "Yes"');
    await rejects(setDoc(ref, health({ heatConcerns: ['heatIntolerance'] })), 'permission-denied', 'other text without "Other concern"');
    await rejects(setDoc(ref, health({ medication: 'ibuprofen' })), 'permission-denied', 'extra medical field');
    await rejects(setDoc(ref, health({ heatAcclimatization: 'expert' })), 'permission-denied', 'unknown acclimatization code');
    await rejects(setDoc(ref, health({ heightCm: 400 })), 'permission-denied', 'impossible height');
    await rejects(setDoc(doc(athlete.db, 'athletes', athlete.uid, 'private', 'other'), health()), 'permission-denied', 'another private document');
  });
  await test('finishing page 2 moves onboarding to page 3 without touching health data', async () => {
    await updateDoc(doc(athlete.db, 'athletes', athlete.uid), { 'onboarding.step': 'safety', 'onboarding.bodyCompletedAt': serverTimestamp(), updatedAt: serverTimestamp() });
    const profile = (await admin.doc(`athletes/${athlete.uid}`).get()).data();
    equal(profile.onboarding.step, 'safety', 'step');
    assert(!('heatConcerns' in profile) && !('heightCm' in profile), 'health fields leaked into the profile');
  });
  await test('the athlete can delete their health answers', async () => {
    await deleteDoc(healthRef(athlete));
    equal((await admin.doc(`athletes/${athlete.uid}/private/health`).get()).exists, false, 'deleted');
  });
}

console.log('Athlete emergency information (onboarding page 3)');
{
  const { serverTimestamp, setDoc, updateDoc, deleteDoc } = await import('firebase/firestore');
  const contact = (overrides = {}) => ({ name: 'Morgan Lee', relationship: 'parent', phoneNumber: '+12145550182', ...overrides });
  const safety = (overrides = {}) => ({ primaryContact: contact(), secondaryContact: contact({ name: 'Sam Lee', relationship: 'guardian', phoneNumber: '+442079460958' }), safetyNotes: 'Carries an inhaler in the side pocket of the bag.', updatedAt: serverTimestamp(), ...overrides });
  const safetyRef = (user, uid = user.uid) => doc(user.db, 'athletes', uid, 'private', 'safety');
  await test('the athlete saves and reads two contacts (one international) and notes', async () => {
    await setDoc(safetyRef(athlete), safety());
    const saved = (await getDoc(safetyRef(athlete))).data();
    equal(saved.secondaryContact.phoneNumber, '+442079460958', 'international number');
  });
  await test('nobody else can read or write it, including the approved athlete’s coach', async () => {
    await rejects(getDoc(safetyRef(coach, athlete.uid)), 'permission-denied', 'coach reading contacts');
    await rejects(getDoc(safetyRef(stranger, athlete.uid)), 'permission-denied', 'stranger reading contacts');
    await rejects(setDoc(safetyRef(coach, athlete.uid), safety()), 'permission-denied', 'coach writing contacts');
  });
  await test('partial, malformed, or extra information is refused', async () => {
    const ref = safetyRef(athlete);
    await rejects(setDoc(ref, safety({ primaryContact: null })), 'permission-denied', 'second contact without a first');
    await rejects(setDoc(ref, safety({ primaryContact: contact({ phoneNumber: '2145550182' }) })), 'permission-denied', 'number not in E.164');
    await rejects(setDoc(ref, safety({ primaryContact: contact({ relationship: 'friend' }) })), 'permission-denied', 'unknown relationship');
    await rejects(setDoc(ref, safety({ primaryContact: { name: 'Morgan Lee', relationship: 'parent' } })), 'permission-denied', 'contact without a phone');
    await rejects(setDoc(ref, safety({ primaryContact: contact({ insurance: 'BCBS 12345' }) })), 'permission-denied', 'extra contact field');
    await rejects(setDoc(ref, safety({ ssn: '000-00-0000' })), 'permission-denied', 'extra top-level field');
    await rejects(setDoc(ref, safety({ safetyNotes: 'x'.repeat(501) })), 'permission-denied', 'notes over 500 characters');
  });
  await test('finishing onboarding records completion and whether the step was skipped', async () => {
    await updateDoc(doc(athlete.db, 'athletes', athlete.uid), { 'onboarding.step': 'done', 'onboarding.safetySkipped': false, 'onboarding.completedAt': serverTimestamp(), updatedAt: serverTimestamp() });
    const profile = (await admin.doc(`athletes/${athlete.uid}`).get()).data();
    equal(profile.onboarding.step, 'done', 'step');
    equal(profile.onboarding.safetySkipped, false, 'safetySkipped');
    assert(!JSON.stringify(profile).includes('+1214'), 'a phone number leaked into the profile');
  });
  await test('the athlete can remove a contact, or delete everything', async () => {
    await setDoc(safetyRef(athlete), safety({ secondaryContact: null }));
    equal((await admin.doc(`athletes/${athlete.uid}/private/safety`).get()).data().secondaryContact, null, 'secondary removed');
    await deleteDoc(safetyRef(athlete));
    equal((await admin.doc(`athletes/${athlete.uid}/private/safety`).get()).exists, false, 'deleted');
  });
}

// Practice sessions and WBGT readings: the coach records, the team reads, the rules check the zone.
{
  const { addDoc, serverTimestamp, updateDoc: update } = await import('firebase/firestore');
  const teamId = invite.teamId;
  const sessions = (user) => collection(user.db, 'teams', teamId, 'sessions');
  const newSession = (user, extra = {}) => addDoc(sessions(user), {
    venue: 'Memorial Stadium', uilClass: 3, recheckMinutes: 30, policy: 'uil-wbgt@2025-26',
    startedBy: user.uid, startedAt: serverTimestamp(), endedAt: null, ...extra,
  });
  const reading = (user, extra = {}) => ({
    wbgtF: 84, enteredValue: 84, enteredUnit: 'F', source: 'handheld', measuredAt: new Date(), zone: 'yellow', uilClass: 3,
    recordedBy: user.uid, recordedAt: serverTimestamp(), acknowledgedBy: null, acknowledgedAt: null, ...extra,
  });
  let session;

  await test('only the coach can start a practice session, with valid settings', async () => {
    await rejects(newSession(athlete), 'permission-denied', 'athlete starting a session');
    await rejects(newSession(stranger), 'permission-denied', 'stranger starting a session');
    await rejects(newSession(coach, { uilClass: 4 }), 'permission-denied', 'unknown UIL class');
    await rejects(newSession(coach, { recheckMinutes: 2 }), 'permission-denied', 'recheck too frequent');
    session = await newSession(coach);
  });
  const readings = (user) => collection(user.db, 'teams', teamId, 'sessions', session.id, 'readings');

  await test('the rules recompute the UIL zone: 84 °F is Yellow in Class 3, never Orange', async () => {
    await rejects(addDoc(readings(coach), reading(coach, { zone: 'orange' })), 'permission-denied', '84 °F stored as Orange');
    const saved = await addDoc(readings(coach), reading(coach));
    equal((await admin.doc(saved.path).get()).data().zone, 'yellow', 'stored zone');
  });
  await test('boundary readings must carry the published zone', async () => {
    await addDoc(readings(coach), reading(coach, { wbgtF: 87.0, enteredValue: 87.0, zone: 'orange' }));
    await addDoc(readings(coach), reading(coach, { wbgtF: 92.1, enteredValue: 92.1, zone: 'black' }));
    await rejects(addDoc(readings(coach), reading(coach, { wbgtF: 86.9, enteredValue: 86.9, zone: 'orange' })), 'permission-denied', '86.9 as Orange');
  });
  await test('impossible, future-dated or forged readings are rejected', async () => {
    await rejects(addDoc(readings(coach), reading(coach, { wbgtF: 840, zone: 'black' })), 'permission-denied', 'typo 840');
    await rejects(addDoc(readings(coach), reading(coach, { measuredAt: new Date(Date.now() + 3_600_000) })), 'permission-denied', 'future reading');
    await rejects(addDoc(readings(coach), reading(coach, { recordedBy: athlete.uid })), 'permission-denied', 'forged recorder');
    await rejects(addDoc(readings(coach), reading(coach, { uilClass: 2 })), 'permission-denied', 'class differs from session');
    await rejects(addDoc(readings(athlete), reading(athlete)), 'permission-denied', 'athlete recording');
  });
  await test('readings are append-only; the coach may acknowledge once', async () => {
    const [first] = (await getDocs(query(readings(coach), where('wbgtF', '==', 84)))).docs;
    await rejects(update(first.ref, { wbgtF: 80, zone: 'green' }), 'permission-denied', 'editing a reading');
    await update(first.ref, { acknowledgedBy: coach.uid, acknowledgedAt: serverTimestamp() });
    await rejects(update(first.ref, { acknowledgedBy: coach.uid, acknowledgedAt: serverTimestamp() }), 'permission-denied', 'second acknowledgment');
  });
  await test('the approved athlete can follow along; a stranger cannot', async () => {
    equal((await getDocs(readings(athlete))).size, 3, 'athlete sees readings');
    await rejects(getDocs(readings(stranger)), 'permission-denied', 'stranger reading');
  });
  await test('ending a session is final, and an ended session takes no readings', async () => {
    await update(session, { endedAt: serverTimestamp() });
    await rejects(update(session, { endedAt: serverTimestamp() }), 'permission-denied', 'ending twice');
    await rejects(addDoc(readings(coach), reading(coach)), 'permission-denied', 'reading after end');
  });
}

// Athletic trainers: join with the same code as staff, read the team's record, never write it.
const trainer = await signUp('trainer');
{
  const teamId = invite.teamId;
  const live = await coach.call('ensureTeamInvite', { details });
  const sessionRef = (await admin.collection(`teams/${teamId}/sessions`).limit(1).get()).docs[0];
  const sessions = (user) => collection(user.db, 'teams', teamId, 'sessions');
  const readings = (user) => collection(user.db, 'teams', teamId, 'sessions', sessionRef.id, 'readings');
  const { addDoc, serverTimestamp } = await import('firebase/firestore');

  await test('a trainer asks to join as staff; an unknown role is rejected', async () => {
    await rejects(trainer.call('requestToJoinTeam', { code: live.code, role: 'principal' }), 'functions/invalid-argument', 'unknown role');
    equal((await trainer.call('requestToJoinTeam', { code: live.code, role: 'trainer' })).status, 'pending', 'request status');
    equal((await admin.doc(`teamMembers/${teamId}_${trainer.uid}`).get()).data().role, 'trainer', 'stored role');
  });
  await test('a pending trainer cannot read the practice record', async () => {
    await rejects(getDocs(readings(trainer)), 'permission-denied', 'pending trainer reading');
  });
  await test('the coach approves the trainer', async () => {
    equal((await coach.call('respondToJoinRequest', { teamId, athleteUid: trainer.uid, approve: true })).status, 'approved', 'approval');
  });
  await test('an approved trainer reads sessions, readings and the full roster', async () => {
    assert((await getDocs(sessions(trainer))).size >= 1, 'trainer sees sessions');
    assert((await getDocs(readings(trainer))).size >= 1, 'trainer sees readings');
    const roster = await getDocs(query(collection(trainer.db, 'teamMembers'), where('teamId', '==', teamId), where('role', 'in', ['athlete', 'trainer'])));
    assert(roster.docs.some((d) => d.data().userId === athlete.uid), 'trainer sees the athlete');
  });
  await test('a trainer cannot start sessions or record readings', async () => {
    await rejects(addDoc(sessions(trainer), { venue: 'Field', uilClass: 3, recheckMinutes: 30, policy: 'uil-wbgt@2025-26', startedBy: trainer.uid, startedAt: serverTimestamp(), endedAt: null }), 'permission-denied', 'trainer session');
    await rejects(addDoc(readings(trainer), { wbgtF: 84, enteredValue: 84, enteredUnit: 'F', source: 'handheld', measuredAt: new Date(), zone: 'yellow', uilClass: 3, recordedBy: trainer.uid, recordedAt: serverTimestamp(), acknowledgedBy: null, acknowledgedAt: null }), 'permission-denied', 'trainer reading');
  });
  await test('an athlete sees their trainer but not other athletes; a stranger sees neither', async () => {
    const staff = await getDocs(query(collection(athlete.db, 'teamMembers'), where('teamId', '==', teamId), where('role', '==', 'trainer'), where('status', '==', 'active')));
    equal(staff.size, 1, 'athlete sees one trainer');
    await rejects(getDocs(query(collection(athlete.db, 'teamMembers'), where('teamId', '==', teamId), where('role', '==', 'athlete'))), 'permission-denied', 'athlete listing athletes');
    await rejects(getDocs(query(collection(stranger.db, 'teamMembers'), where('teamId', '==', teamId), where('role', '==', 'trainer'), where('status', '==', 'active'))), 'permission-denied', 'stranger listing staff');
  });
}

console.log(`\n${passed} passed, ${failed} failed\n`);
await Promise.all([coach, athlete, stranger, trainer].map((u) => deleteApp(u.app)));
process.exit(failed ? 1 : 0);
