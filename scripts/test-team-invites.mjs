// End-to-end test of the team backend against the Firebase Emulator Suite (free plan: no Cloud
// Functions). The app writes to Firestore directly and the security rules enforce every check.
//
//   npm run test:invites
//
// That starts the Auth and Firestore emulators and runs this file with real signed-in accounts
// (coach, athlete, a stranger, a trainer) and the real security rules. Each account's `call()` does
// exactly what src/services/team-invites.ts does. Admin access is used only to set up edge cases
// (an expired code) and to inspect what was stored.
import { initializeApp as initAdmin } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, Timestamp } from 'firebase-admin/firestore';
import { deleteApp, initializeApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, updateProfile } from 'firebase/auth';
import {
  addDoc, collection, connectFirestoreEmulator, doc, getDoc, getDocs, getFirestore, limit, onSnapshot, query,
  serverTimestamp, setDoc, Timestamp as ClientTimestamp, updateDoc, where,
} from 'firebase/firestore';

const projectId = process.env.GCLOUD_PROJECT ?? 'heatsense-aa3c8';
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

const DAY = 86_400_000;
const randomCode = () => String(Math.floor(Math.random() * 1e6)).padStart(6, '0');

/** The app's team-invite service (src/services/team-invites.ts), against one account's Firestore. */
function service(db, user) {
  const preview = (t) => ({ teamName: t.name, school: t.school, sport: t.sport });
  async function issueCode(teamId, team) {
    const expiresAt = ClientTimestamp.fromMillis(Date.now() + 7 * DAY);
    for (let tries = 0; tries < 8; tries++) {
      const code = randomCode();
      try {
        await setDoc(doc(db, 'inviteCodes', code), { teamId, team, createdBy: user.uid, createdAt: serverTimestamp(), expiresAt, revoked: false });
      } catch (error) {
        if (error.code === 'permission-denied') continue;
        throw error;
      }
      await updateDoc(doc(db, 'teams', teamId), { activeCode: code, updatedAt: serverTimestamp() });
      return { teamId, code, expiresAt: expiresAt.toDate().toISOString() };
    }
    throw new Error('no free code');
  }
  async function myTeam() {
    const snap = (await getDocs(query(collection(db, 'teams'), where('coachUid', '==', user.uid), limit(1)))).docs[0];
    return snap ? { id: snap.id, data: snap.data() } : null;
  }
  async function liveInvite(teamId, code) {
    if (!code) return null;
    const invite = (await getDoc(doc(db, 'inviteCodes', code))).data();
    if (!invite || invite.revoked || invite.expiresAt.toMillis() <= Date.now()) return null;
    return { teamId, code, expiresAt: invite.expiresAt.toDate().toISOString() };
  }
  async function lookupInvite({ code }) {
    if (!/^\d{6}$/.test(code)) return { status: 'not-found' };
    const invite = (await getDoc(doc(db, 'inviteCodes', code))).data();
    if (!invite) return { status: 'not-found' };
    if (invite.revoked || invite.expiresAt.toMillis() <= Date.now()) return { status: 'expired' };
    return { status: 'valid', teamId: invite.teamId, team: invite.team };
  }
  return {
    async ensureTeamInvite({ details }) {
      const fields = { name: details.teamName, school: details.school, sport: details.sport, level: details.level };
      const existing = await myTeam();
      if (existing) {
        await updateDoc(doc(db, 'teams', existing.id), { ...fields, updatedAt: serverTimestamp() });
        return (await liveInvite(existing.id, existing.data.activeCode)) ?? issueCode(existing.id, preview(fields));
      }
      const created = await addDoc(collection(db, 'teams'), { ...fields, coachUid: user.uid, createdBy: user.uid, status: 'active', activeCode: null, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      return issueCode(created.id, preview(fields));
    },
    async getMyTeamInvite() {
      const existing = await myTeam();
      if (!existing) return null;
      return { team: preview(existing.data), invite: (await liveInvite(existing.id, existing.data.activeCode)) ?? (await issueCode(existing.id, preview(existing.data))) };
    },
    async regenerateInvite({ teamId }) {
      const team = (await getDoc(doc(db, 'teams', teamId))).data();
      if (team.activeCode) await updateDoc(doc(db, 'inviteCodes', team.activeCode), { revoked: true });
      return issueCode(teamId, preview(team));
    },
    async respondToJoinRequest({ teamId, athleteUid, approve }) {
      await updateDoc(doc(db, 'teamMembers', `${teamId}_${athleteUid}`), { status: approve ? 'active' : 'declined', joinedAt: approve ? serverTimestamp() : null, respondedAt: serverTimestamp(), respondedBy: user.uid });
      return { status: approve ? 'approved' : 'declined' };
    },
    lookupInvite,
    async requestToJoinTeam({ code, role = 'athlete' }) {
      const found = await lookupInvite({ code });
      if (found.status !== 'valid') throw Object.assign(new Error(found.status), { code: found.status });
      const ref = doc(db, 'teamMembers', `${found.teamId}_${user.uid}`);
      const existing = (await getDoc(ref)).data();
      if (existing?.status === 'active') return { teamId: found.teamId, status: 'member' };
      if (existing?.status === 'pending') return { teamId: found.teamId, status: 'pending' };
      const request = { role, status: 'pending', inviteCode: code, team: found.team, requestedAt: serverTimestamp() };
      if (existing) await updateDoc(ref, request);
      else await setDoc(ref, { ...request, teamId: found.teamId, userId: user.uid, displayName: user.displayName ?? null, email: user.email ?? null, joinedAt: null });
      return { teamId: found.teamId, status: 'pending' };
    },
  };
}

let userCount = 0;
async function signUp(label) {
  const app = initializeApp({ apiKey: 'demo-key', projectId, authDomain: `${projectId}.firebaseapp.com` }, `${label}-${++userCount}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  const { user } = await createUserWithEmailAndPassword(auth, `${label}-${Date.now()}-${userCount}@example.com`, 'password123');
  await updateProfile(user, { displayName: label });
  await user.getIdToken(true);
  const api = service(db, user);
  const call = (name, data = {}) => api[name](data);
  return { app, auth, db, uid: user.uid, call };
}

const details = { school: 'McKinney High', teamName: 'Lions Varsity', sport: 'Football', level: 'Varsity' };

console.log('\nHeatSense team backend (emulators, free plan)\n');

const coach = await signUp('coach');
const athlete = await signUp('athlete');
const stranger = await signUp('stranger');
let invite;

console.log('Coach creates a team');
await test('creates the team and a live 6-digit code', async () => {
  invite = await coach.call('ensureTeamInvite', { details });
  assert(/^\d{6}$/.test(invite.code), `code ${invite.code}`);
  const team = (await admin.doc(`teams/${invite.teamId}`).get()).data();
  equal(team.coachUid, coach.uid, 'coachUid');
  equal(team.activeCode, invite.code, 'activeCode');
  equal((await admin.doc(`inviteCodes/${invite.code}`).get()).data().teamId, invite.teamId, 'code points at the team');
});
await test('retrying returns the same team and code', async () => {
  const again = await coach.call('ensureTeamInvite', { details });
  equal(again.teamId, invite.teamId, 'teamId');
  equal(again.code, invite.code, 'code');
});
await test('bad team details and impersonated coaches are refused', async () => {
  const base = { name: 'X', school: 'Y', sport: 'Soccer', level: 'JV', coachUid: stranger.uid, createdBy: stranger.uid, status: 'active', activeCode: null, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  await rejects(addDoc(collection(stranger.db, 'teams'), { ...base, name: '' }), 'permission-denied', 'blank name');
  await rejects(addDoc(collection(stranger.db, 'teams'), { ...base, coachUid: coach.uid }), 'permission-denied', 'someone else as coach');
  await rejects(addDoc(collection(stranger.db, 'teams'), { ...base, activeCode: '123456' }), 'permission-denied', 'pre-set code');
  await rejects(updateDoc(doc(stranger.db, 'teams', invite.teamId), { name: 'Hijacked', updatedAt: serverTimestamp() }), 'permission-denied', 'stranger editing the team');
});
await test('only the team’s coach can make its codes, and only short-lived ones', async () => {
  const team = { teamName: details.teamName, school: details.school, sport: details.sport };
  const soon = ClientTimestamp.fromMillis(Date.now() + DAY);
  await rejects(setDoc(doc(stranger.db, 'inviteCodes', randomCode()), { teamId: invite.teamId, team, createdBy: stranger.uid, createdAt: serverTimestamp(), expiresAt: soon, revoked: false }), 'permission-denied', 'stranger code');
  await rejects(setDoc(doc(coach.db, 'inviteCodes', randomCode()), { teamId: invite.teamId, team, createdBy: coach.uid, createdAt: serverTimestamp(), expiresAt: ClientTimestamp.fromMillis(Date.now() + 30 * DAY), revoked: false }), 'permission-denied', '30-day code');
  await rejects(setDoc(doc(coach.db, 'inviteCodes', randomCode()), { teamId: invite.teamId, team: { ...team, teamName: 'Fake' }, createdBy: coach.uid, createdAt: serverTimestamp(), expiresAt: soon, revoked: false }), 'permission-denied', 'false team preview');
  await rejects(setDoc(doc(coach.db, 'inviteCodes', 'abc123'), { teamId: invite.teamId, team, createdBy: coach.uid, createdAt: serverTimestamp(), expiresAt: soon, revoked: false }), 'permission-denied', 'non-digit code');
  await rejects(setDoc(doc(coach.db, 'inviteCodes', invite.code), { teamId: invite.teamId, team, createdBy: coach.uid, createdAt: serverTimestamp(), expiresAt: soon, revoked: false }), 'permission-denied', 'overwriting a live code');
});

console.log('Athlete joins with the code');
await test('a valid code shows only the team preview; codes cannot be listed', async () => {
  const found = await athlete.call('lookupInvite', { code: invite.code });
  equal(found.status, 'valid', 'status');
  equal(found.team.teamName, details.teamName, 'team name');
  equal((await athlete.call('lookupInvite', { code: '000000' === invite.code ? '111111' : '000000' })).status, 'not-found', 'unknown code');
  await rejects(getDocs(collection(stranger.db, 'inviteCodes')), 'permission-denied', 'listing codes');
});
await test('join creates one pending request; repeats are not duplicated', async () => {
  equal((await athlete.call('requestToJoinTeam', { code: invite.code })).status, 'pending', 'first request');
  equal((await athlete.call('requestToJoinTeam', { code: invite.code })).status, 'pending', 'repeat request');
  const member = (await admin.doc(`teamMembers/${invite.teamId}_${athlete.uid}`).get()).data();
  equal(member.status, 'pending', 'stored status');
  equal(member.role, 'athlete', 'stored role');
});
await test('forged join requests are refused', async () => {
  const id = `${invite.teamId}_${stranger.uid}`;
  const base = { teamId: invite.teamId, userId: stranger.uid, role: 'athlete', status: 'pending', inviteCode: invite.code, team: { teamName: details.teamName, school: details.school, sport: details.sport }, displayName: 'stranger', email: null, requestedAt: serverTimestamp(), joinedAt: null };
  const email = (await admin.collection('teamMembers').doc(`${invite.teamId}_${athlete.uid}`).get()).data().email;
  assert(email, 'athlete email stored');
  await rejects(setDoc(doc(stranger.db, 'teamMembers', id), { ...base, status: 'active' }), 'permission-denied', 'self-approved');
  await rejects(setDoc(doc(stranger.db, 'teamMembers', id), { ...base, role: 'coach' }), 'permission-denied', 'coach role');
  await rejects(setDoc(doc(stranger.db, 'teamMembers', id), { ...base, inviteCode: '999999' }), 'permission-denied', 'wrong code');
  await rejects(setDoc(doc(stranger.db, 'teamMembers', `${invite.teamId}_${athlete.uid}`), { ...base, userId: athlete.uid }), 'permission-denied', 'joining as someone else');
});
await test('the coach cannot join their own team', async () => {
  await rejects(coach.call('requestToJoinTeam', { code: invite.code }), 'permission-denied', 'coach joining own team');
});
await test('a pending athlete cannot read the team yet, but can read their own request', async () => {
  await rejects(getDoc(doc(athlete.db, 'teams', invite.teamId)), 'permission-denied', 'pending athlete reading team');
  equal((await getDoc(doc(athlete.db, 'teamMembers', `${invite.teamId}_${athlete.uid}`))).data().status, 'pending', 'own request');
});
await test('athletes and strangers cannot approve', async () => {
  await rejects(athlete.call('respondToJoinRequest', { teamId: invite.teamId, athleteUid: athlete.uid, approve: true }), 'permission-denied', 'athlete approving self');
  await rejects(stranger.call('respondToJoinRequest', { teamId: invite.teamId, athleteUid: athlete.uid, approve: true }), 'permission-denied', 'stranger approving');
});
await test('the coach sees the request live, approves it, and the athlete is updated live', async () => {
  const seen = new Promise((resolve) => {
    const stop = onSnapshot(query(collection(coach.db, 'teamMembers'), where('teamId', '==', invite.teamId), where('status', '==', 'pending')), (snap) => {
      if (snap.docs.some((d) => d.data().userId === athlete.uid)) { stop(); resolve(true); }
    });
  });
  assert(await seen, 'coach saw the request');
  const approved = new Promise((resolve) => {
    const stop = onSnapshot(doc(athlete.db, 'teamMembers', `${invite.teamId}_${athlete.uid}`), (snap) => {
      if (snap.data()?.status === 'active') { stop(); resolve(true); }
    });
  });
  equal((await coach.call('respondToJoinRequest', { teamId: invite.teamId, athleteUid: athlete.uid, approve: true })).status, 'approved', 'approval');
  assert(await approved, 'athlete saw the approval');
});
await test('the approved athlete can now read the team, and re-joining says "member"', async () => {
  equal((await getDoc(doc(athlete.db, 'teams', invite.teamId))).data().name, details.teamName, 'team name');
  equal((await athlete.call('requestToJoinTeam', { code: invite.code })).status, 'member', 're-join');
});

console.log('Codes change and expire');
await test('regenerating revokes the old code; only the coach can', async () => {
  const old = invite.code;
  await rejects(stranger.call('regenerateInvite', { teamId: invite.teamId }), 'permission-denied', 'stranger regenerating');
  invite = await coach.call('regenerateInvite', { teamId: invite.teamId });
  assert(invite.code !== old, 'new code differs');
  equal((await stranger.call('lookupInvite', { code: old })).status, 'expired', 'old code');
  const late = await signUp('late');
  await rejects(late.call('requestToJoinTeam', { code: old }), 'expired', 'joining with the old code');
  await rejects(setDoc(doc(late.db, 'teamMembers', `${invite.teamId}_${late.uid}`), { teamId: invite.teamId, userId: late.uid, role: 'athlete', status: 'pending', inviteCode: old, team: { teamName: details.teamName, school: details.school, sport: details.sport }, displayName: 'late', email: null, requestedAt: serverTimestamp(), joinedAt: null }), 'permission-denied', 'forcing a revoked code');
});
await test('an expired code says expired and cannot be used; the coach gets a fresh one on return', async () => {
  await admin.doc(`inviteCodes/${invite.code}`).update({ expiresAt: Timestamp.fromMillis(Date.now() - 1000) });
  equal((await stranger.call('lookupInvite', { code: invite.code })).status, 'expired', 'lookup');
  const fresh = await coach.call('getMyTeamInvite');
  assert(fresh.invite.code !== invite.code, 'fresh code issued');
  invite = fresh.invite;
});
await test('a declined athlete can ask again with a live code', async () => {
  const declined = await signUp('declined');
  await declined.call('requestToJoinTeam', { code: invite.code });
  await coach.call('respondToJoinRequest', { teamId: invite.teamId, athleteUid: declined.uid, approve: false });
  equal((await declined.call('requestToJoinTeam', { code: invite.code })).status, 'pending', 'asks again');
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

// Athletic trainers: join with the same code as staff, read the team's record, and log readings during a practice the coach started.
const trainer = await signUp('trainer');
{
  const teamId = invite.teamId;
  const live = await coach.call('ensureTeamInvite', { details });
  const sessionRef = (await admin.collection(`teams/${teamId}/sessions`).limit(1).get()).docs[0];
  const sessions = (user) => collection(user.db, 'teams', teamId, 'sessions');
  const readings = (user) => collection(user.db, 'teams', teamId, 'sessions', sessionRef.id, 'readings');
  const { addDoc, serverTimestamp } = await import('firebase/firestore');

  await test('a trainer asks to join as staff; an unknown role is rejected', async () => {
    await rejects(trainer.call('requestToJoinTeam', { code: live.code, role: 'principal' }), 'permission-denied', 'unknown role');
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
  const reading = (user, sessionId, extra = {}) => addDoc(collection(user.db, 'teams', teamId, 'sessions', sessionId, 'readings'), { wbgtF: 84, enteredValue: 84, enteredUnit: 'F', source: 'handheld', measuredAt: new Date(), zone: 'yellow', uilClass: 3, recordedBy: user.uid, recordedAt: serverTimestamp(), acknowledgedBy: null, acknowledgedAt: null, ...extra });
  await test('a trainer cannot start a session or write to an ended one', async () => {
    await rejects(addDoc(sessions(trainer), { venue: 'Field', uilClass: 3, recheckMinutes: 30, policy: 'uil-wbgt@2025-26', startedBy: trainer.uid, startedAt: serverTimestamp(), endedAt: null }), 'permission-denied', 'trainer session');
    await rejects(reading(trainer, sessionRef.id), 'permission-denied', 'trainer reading on an ended session');
  });
  await test('during a practice the coach started, a trainer logs readings and confirms guidance, but cannot end it', async () => {
    const { doc, updateDoc } = await import('firebase/firestore');
    const open = await addDoc(sessions(coach), { venue: 'Field', uilClass: 3, recheckMinutes: 30, policy: 'uil-wbgt@2025-26', startedBy: coach.uid, startedAt: serverTimestamp(), endedAt: null });
    await rejects(reading(trainer, open.id, { zone: 'green' }), 'permission-denied', 'trainer picking the wrong zone');
    await rejects(reading(trainer, open.id, { recordedBy: coach.uid }), 'permission-denied', 'trainer recording as the coach');
    const logged = await reading(trainer, open.id);
    equal((await admin.doc(logged.path).get()).data().zone, 'yellow', 'zone of the trainer reading');
    await updateDoc(doc(trainer.db, logged.path), { acknowledgedBy: trainer.uid, acknowledgedAt: serverTimestamp() });
    await rejects(updateDoc(doc(trainer.db, open.path), { endedAt: serverTimestamp() }), 'permission-denied', 'trainer ending practice');
    await rejects(reading(athlete, open.id), 'permission-denied', 'athlete logging a reading');
    await updateDoc(doc(coach.db, open.path), { endedAt: serverTimestamp() });
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
