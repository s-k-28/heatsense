import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, randomInt } from 'node:crypto';

import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, Timestamp, type DocumentReference, type Transaction } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall, type CallableOptions, type CallableRequest } from 'firebase-functions/v2/https';

// HeatSense team invites. The app never writes these collections directly
// (see firebase/firestore.rules); every change goes through the callables below, which
// run with admin access and therefore check auth, role and ownership themselves.
//
//   teams/{teamId}                   name, school, sport, level, coachUid, createdBy, status, activeInviteId
//   teamInvites/{inviteId}           teamId, codeHash, codeCipher, status, createdBy, createdAt, expiresAt, revokedAt, usageCount
//   teamMembers/{teamId}_{uid}       teamId, userId, role, status (pending | active | declined), requestedAt, joinedAt, inviteId
//   inviteCodeIndex/{codeHash}       inviteId, teamId, expiresAt: the uniqueness lock for active codes
//   coachTeams/{uid}                 teamId: makes team creation idempotent per coach
//   rateLimits/{key}                 recent wrong codes and lockout per account (and per IP)
//
// Codes are never stored in plain text. Lookups use an HMAC keyed with
// INVITE_CODE_SECRET (so the 1,000,000 possible codes can't be precomputed from
// the database), and the coach's own code is kept AES-GCM encrypted with a key
// derived from the same secret so it can be shown again without rotating it.

initializeApp();
const db = getFirestore();
const inviteSecret = defineSecret('INVITE_CODE_SECRET');

const INVITE_CODE_LENGTH = 6;
const INVITE_VALID_DAYS = 7;
const CODE_PATTERN = new RegExp(`^\\d{${INVITE_CODE_LENGTH}}$`);
// A 6-digit code is 1,000,000 combinations: cap wrong guesses per account and per
// IP, lengthen the lockout each time, and never let a code grant access on its own
// (joining always needs coach approval).
const ACCOUNT_MAX_MISSES = 5;
const IP_MAX_MISSES = 20;
const MISS_WINDOW_MS = 10 * 60_000;
const BASE_LOCKOUT_MS = 10 * 60_000;
const MAX_LOCKOUT_MS = 24 * 60 * 60_000;

// App Check is an extra layer on top of sign-in and rate limits. Turn this on once
// the app registers an App Check provider (reCAPTCHA Enterprise / App Attest).
const ENFORCE_APP_CHECK = false;
const options: CallableOptions = { cors: true, enforceAppCheck: ENFORCE_APP_CHECK, secrets: [inviteSecret] };

type TeamDoc = {
  name: string; school: string; sport: string; level: string;
  coachUid: string; createdBy: string; status: 'active'; activeInviteId: string | null;
};
type InviteDoc = {
  teamId: string; codeHash: string; codeCipher: string; status: 'active' | 'revoked';
  createdBy: string; createdAt: Timestamp; expiresAt: Timestamp; revokedAt: Timestamp | null; usageCount: number;
};
type IndexDoc = { inviteId: string; teamId: string; expiresAt: Timestamp };
type MemberDoc = { teamId: string; userId: string; role: 'coach' | 'athlete'; status: 'pending' | 'active' | 'declined'; inviteId?: string };

// ── Helpers ────────────────────────────────────────────────────────────────

let keys: { hmac: Buffer; cipher: Buffer } | null = null;
function codeKeys() {
  if (!keys) {
    const secret = inviteSecret.value();
    if (!secret || secret.length < 32) throw new HttpsError('internal', 'Invitations are not configured.');
    const derive = (info: string) => Buffer.from(hkdfSync('sha256', secret, 'heatsense-invites', info, 32));
    keys = { hmac: derive('code-hmac'), cipher: derive('code-cipher') };
  }
  return keys;
}

const hashCode = (code: string) => createHmac('sha256', codeKeys().hmac).update(code).digest('hex');

function encryptCode(code: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', codeKeys().cipher, iv);
  const body = Buffer.concat([cipher.update(code, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map((part) => part.toString('base64')).join('.');
}

function decryptCode(stored: string): string {
  const [iv, tag, body] = stored.split('.').map((part) => Buffer.from(part, 'base64'));
  const decipher = createDecipheriv('aes-256-gcm', codeKeys().cipher, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8');
}

// randomInt is a CSPRNG with no modulo bias; padStart keeps leading zeros ("004821").
const newCode = () => String(randomInt(0, 10 ** INVITE_CODE_LENGTH)).padStart(INVITE_CODE_LENGTH, '0');

function requireUid(request: CallableRequest): string {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to continue.');
  return uid;
}

function text(value: unknown, field: string, max = 80): string {
  if (typeof value !== 'string' || !value.trim()) throw new HttpsError('invalid-argument', `${field} is required.`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw new HttpsError('invalid-argument', `${field} is too long.`);
  return trimmed;
}

const memberRef = (teamId: string, uid: string) => db.collection('teamMembers').doc(`${teamId}_${uid}`);
const isLive = (invite: InviteDoc | undefined): invite is InviteDoc => Boolean(invite && invite.status === 'active' && invite.expiresAt.toMillis() > Date.now());
const inviteResult = (teamId: string, invite: InviteDoc) => ({ teamId, code: decryptCode(invite.codeCipher), expiresAt: invite.expiresAt.toDate().toISOString() });
const teamSummary = (team: TeamDoc) => ({ teamName: team.name, school: team.school, sport: team.sport, level: team.level });

async function requireCoach(tx: Transaction | null, teamId: string, uid: string): Promise<{ ref: DocumentReference; team: TeamDoc }> {
  const ref = db.collection('teams').doc(teamId);
  const snap = tx ? await tx.get(ref) : await ref.get();
  const team = snap.data() as TeamDoc | undefined;
  if (!team) throw new HttpsError('not-found', 'Team not found.');
  if (team.coachUid !== uid) {
    logger.warn('Coach-only action refused', { uid, teamId });
    throw new HttpsError('permission-denied', 'Only the team’s coach can do that.');
  }
  return { ref, team };
}

// ── Issuing codes ──────────────────────────────────────────────────────────

/**
 * Gives the team an active invite. With `keepActive`, an existing live invite is
 * returned unchanged (page reloads never rotate the code); otherwise the current
 * invite is revoked and replaced. Each attempt is one transaction over the team,
 * its current invite and the candidate code's index entry, so two concurrent
 * calls can neither hand out the same code nor leave the team with two invites.
 */
async function issueInvite(teamId: string, uid: string, keepActive: boolean) {
  const teamRef = db.collection('teams').doc(teamId);
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = newCode();
    const codeHash = hashCode(code);
    const outcome = await db.runTransaction(async (tx) => {
      const team = (await tx.get(teamRef)).data() as TeamDoc | undefined;
      if (!team) throw new HttpsError('not-found', 'Team not found.');
      const oldRef = team.activeInviteId ? db.collection('teamInvites').doc(team.activeInviteId) : null;
      const old = oldRef ? ((await tx.get(oldRef)).data() as InviteDoc | undefined) : undefined;
      if (keepActive && isLive(old)) return { result: inviteResult(teamId, old) };

      const indexRef = db.collection('inviteCodeIndex').doc(codeHash);
      const taken = (await tx.get(indexRef)).data() as IndexDoc | undefined;
      if (taken && taken.expiresAt.toMillis() > Date.now()) return { collision: true };
      const oldIndexRef = old ? db.collection('inviteCodeIndex').doc(old.codeHash) : null;
      const oldIndex = oldIndexRef ? ((await tx.get(oldIndexRef)).data() as IndexDoc | undefined) : undefined;

      const inviteRef = db.collection('teamInvites').doc();
      const expiresAt = Timestamp.fromMillis(Date.now() + INVITE_VALID_DAYS * 86_400_000);
      const invite: InviteDoc = {
        teamId, codeHash, codeCipher: encryptCode(code), status: 'active', createdBy: uid,
        createdAt: FieldValue.serverTimestamp() as unknown as Timestamp, expiresAt, revokedAt: null, usageCount: 0,
      };
      tx.set(inviteRef, invite);
      tx.set(indexRef, { inviteId: inviteRef.id, teamId, expiresAt });
      tx.update(teamRef, { activeInviteId: inviteRef.id, updatedAt: FieldValue.serverTimestamp() });
      if (oldRef && old?.status === 'active') tx.update(oldRef, { status: 'revoked', revokedAt: FieldValue.serverTimestamp() });
      if (oldIndexRef && oldIndex?.inviteId === oldRef?.id) tx.delete(oldIndexRef);
      return { result: { teamId, code, expiresAt: expiresAt.toDate().toISOString() } };
    });
    if ('result' in outcome && outcome.result) return outcome.result;
    logger.info('Invite code collision, retrying', { teamId, attempt });
  }
  logger.error('Could not allocate a free invite code', { teamId });
  throw new HttpsError('resource-exhausted', 'No invitation codes are available right now. Try again shortly.');
}

/** Coach: creates their team the first time (or updates its details) and returns its active invite. Safe to retry. */
export const ensureTeamInvite = onCall(options, async (request) => {
  const uid = requireUid(request);
  const raw = ((request.data ?? {}) as Record<string, unknown>).details as Record<string, unknown> | undefined ?? {};
  const details = {
    name: text(raw.teamName, 'Team name'),
    school: text(raw.school, 'School'),
    sport: text(raw.sport, 'Sport', 40),
    level: text(raw.level, 'Level', 40),
  };

  // One team per coach: the coachTeams/{uid} pointer is read and written in the same
  // transaction as the team, so retries and parallel requests can't create a second one.
  const pointerRef = db.collection('coachTeams').doc(uid);
  const teamId = await db.runTransaction(async (tx) => {
    const pointer = (await tx.get(pointerRef)).data() as { teamId?: string } | undefined;
    if (pointer?.teamId) {
      const { ref } = await requireCoach(tx, pointer.teamId, uid);
      tx.update(ref, { ...details, updatedAt: FieldValue.serverTimestamp() });
      return pointer.teamId;
    }
    // Only an account that isn't already an athlete on a team may start one.
    const athleteOf = await tx.get(db.collection('teamMembers').where('userId', '==', uid).where('role', '==', 'athlete').where('status', '==', 'active').limit(1));
    if (!athleteOf.empty) throw new HttpsError('permission-denied', 'This account is an athlete on a team, so it can’t create one.');
    const ref = db.collection('teams').doc();
    tx.set(ref, {
      ...details, coachUid: uid, createdBy: uid, status: 'active', activeInviteId: null,
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(memberRef(ref.id, uid), {
      teamId: ref.id, userId: uid, role: 'coach', status: 'active',
      requestedAt: FieldValue.serverTimestamp(), joinedAt: FieldValue.serverTimestamp(),
    });
    tx.set(pointerRef, { teamId: ref.id, createdAt: FieldValue.serverTimestamp() });
    logger.info('Team created', { uid, teamId: ref.id });
    return ref.id;
  });
  return issueInvite(teamId, uid, true);
});

/** Coach: returns their team and its active invite (issuing one if the last expired), or null if they have no team yet. */
export const getMyTeamInvite = onCall(options, async (request) => {
  const uid = requireUid(request);
  const pointer = (await db.collection('coachTeams').doc(uid).get()).data() as { teamId?: string } | undefined;
  if (!pointer?.teamId) return null;
  const { team } = await requireCoach(null, pointer.teamId, uid);
  return { team: teamSummary(team), invite: await issueInvite(pointer.teamId, uid, true) };
});

/** Coach: revokes the current code and issues a new one. */
export const regenerateInvite = onCall(options, async (request) => {
  const uid = requireUid(request);
  const teamId = text((request.data as Record<string, unknown> | undefined)?.teamId, 'Team', 128);
  await requireCoach(null, teamId, uid);
  logger.info('Invite regenerated', { uid, teamId });
  return issueInvite(teamId, uid, false);
});

// ── Redeeming codes ────────────────────────────────────────────────────────

type Lookup =
  | { status: 'valid'; teamId: string; inviteId: string; team: { teamName: string; school: string; sport: string } }
  | { status: 'not-found' }
  | { status: 'expired' }
  | { status: 'rate-limited'; retryAfterSeconds: number };

type LimitDoc = { misses?: number[]; lockedUntil?: number; lockouts?: number };

function limitKeys(request: CallableRequest, uid: string) {
  const ip = request.rawRequest?.ip;
  // Hash the IP so raw addresses aren't stored.
  return { account: `uid_${uid}`, ip: ip ? `ip_${createHash('sha256').update(ip).digest('hex').slice(0, 32)}` : null };
}

async function lockedFor(key: string | null): Promise<number> {
  if (!key) return 0;
  const limit = (await db.collection('rateLimits').doc(key).get()).data() as LimitDoc | undefined;
  return Math.max(0, (limit?.lockedUntil ?? 0) - Date.now());
}

async function recordMiss(key: string | null, maxMisses: number, uid: string) {
  if (!key) return;
  const ref = db.collection('rateLimits').doc(key);
  await db.runTransaction(async (tx) => {
    const now = Date.now();
    const current = ((await tx.get(ref)).data() ?? {}) as LimitDoc;
    const misses = (current.misses ?? []).filter((time) => now - time < MISS_WINDOW_MS);
    misses.push(now);
    if (misses.length < maxMisses) {
      tx.set(ref, { misses, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return;
    }
    // Each lockout doubles the next one (10 min, 20, 40 … up to a day).
    const lockouts = (current.lockouts ?? 0) + 1;
    const lockMs = Math.min(MAX_LOCKOUT_MS, BASE_LOCKOUT_MS * 2 ** (lockouts - 1));
    tx.set(ref, { misses: [], lockedUntil: now + lockMs, lockouts, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    logger.warn('Invite code lockout', { key, uid, lockouts, lockMinutes: lockMs / 60_000 });
  });
}

/** Checks a code. Only a valid code reveals anything, and only the team's public summary. */
async function lookup(request: CallableRequest, uid: string, rawCode: unknown): Promise<Lookup> {
  const limits = limitKeys(request, uid);
  const locked = Math.max(await lockedFor(limits.account), await lockedFor(limits.ip));
  if (locked > 0) return { status: 'rate-limited', retryAfterSeconds: Math.ceil(locked / 1000) };

  const miss = async (reason: string) => {
    logger.info('Invite code miss', { uid, reason });
    await Promise.all([recordMiss(limits.account, ACCOUNT_MAX_MISSES, uid), recordMiss(limits.ip, IP_MAX_MISSES, uid)]);
  };
  // Normalize: keep digits only, so "482 913" and "482-913" both work, but leading zeros stay.
  const code = typeof rawCode === 'string' ? rawCode.replace(/\D/g, '') : '';
  if (!CODE_PATTERN.test(code)) {
    await miss('format');
    return { status: 'not-found' };
  }
  const index = (await db.collection('inviteCodeIndex').doc(hashCode(code)).get()).data() as IndexDoc | undefined;
  const invite = index ? ((await db.collection('teamInvites').doc(index.inviteId).get()).data() as InviteDoc | undefined) : undefined;
  const team = invite ? ((await db.collection('teams').doc(invite.teamId).get()).data() as TeamDoc | undefined) : undefined;
  // Revoked codes lose their index entry, so they read as not found.
  if (!index || !invite || !team || invite.status !== 'active' || team.activeInviteId !== index.inviteId) {
    await miss('unknown');
    return { status: 'not-found' };
  }
  if (invite.expiresAt.toMillis() <= Date.now()) {
    await miss('expired');
    return { status: 'expired' };
  }
  return { status: 'valid', teamId: invite.teamId, inviteId: index.inviteId, team: { teamName: team.name, school: team.school, sport: team.sport } };
}

/** Athlete: validates a code and returns the team preview. */
export const lookupInvite = onCall(options, async (request) => {
  const uid = requireUid(request);
  const result = await lookup(request, uid, (request.data as Record<string, unknown> | undefined)?.code);
  if (result.status !== 'valid') return result;
  return { status: result.status, teamId: result.teamId, team: result.team };
});

/** Athlete: asks to join. Creates one PENDING membership per athlete per team; never grants access. */
export const requestToJoinTeam = onCall(options, async (request) => {
  const uid = requireUid(request);
  const result = await lookup(request, uid, (request.data as Record<string, unknown> | undefined)?.code);
  if (result.status === 'expired') throw new HttpsError('failed-precondition', 'This code has expired.');
  if (result.status === 'rate-limited') throw new HttpsError('resource-exhausted', 'Too many attempts. Try again in a few minutes.');
  if (result.status !== 'valid') throw new HttpsError('not-found', 'Code not found. Try again.');

  const teamRef = db.collection('teams').doc(result.teamId);
  const inviteRef = db.collection('teamInvites').doc(result.inviteId);
  const ref = memberRef(result.teamId, uid);
  return db.runTransaction(async (tx) => {
    const team = (await tx.get(teamRef)).data() as TeamDoc | undefined;
    const invite = (await tx.get(inviteRef)).data() as InviteDoc | undefined;
    const existing = (await tx.get(ref)).data() as MemberDoc | undefined;
    // Re-check inside the transaction: the coach may have regenerated the code since the lookup.
    if (!team || !isLive(invite) || team.activeInviteId !== result.inviteId) throw new HttpsError('not-found', 'Code not found. Try again.');
    if (team.coachUid === uid) throw new HttpsError('failed-precondition', 'You’re already this team’s coach.');
    if (existing?.status === 'active') return { teamId: result.teamId, status: 'member' as const };
    if (existing?.status === 'pending') return { teamId: result.teamId, status: 'pending' as const };
    tx.set(ref, {
      teamId: result.teamId, userId: uid, role: 'athlete', status: 'pending', inviteId: result.inviteId,
      // The athlete can read their own membership but not the team until approved; this is what they asked to join.
      team: { teamName: team.name, school: team.school, sport: team.sport },
      displayName: request.auth?.token.name ?? null, email: request.auth?.token.email ?? null,
      requestedAt: FieldValue.serverTimestamp(), joinedAt: null,
    });
    tx.update(inviteRef, { usageCount: FieldValue.increment(1) });
    return { teamId: result.teamId, status: 'pending' as const };
  });
});

/** Coach: approves or declines a pending request. Approval is the only way an athlete becomes a member. */
export const respondToJoinRequest = onCall(options, async (request) => {
  const uid = requireUid(request);
  const data = (request.data ?? {}) as Record<string, unknown>;
  const teamId = text(data.teamId, 'Team', 128);
  const athleteUid = text(data.athleteUid, 'Athlete', 128);
  const approve = data.approve === true;

  const ref = memberRef(teamId, athleteUid);
  await db.runTransaction(async (tx) => {
    await requireCoach(tx, teamId, uid);
    const pending = (await tx.get(ref)).data() as MemberDoc | undefined;
    if (pending?.role !== 'athlete' || pending.status !== 'pending') throw new HttpsError('failed-precondition', 'That request is no longer pending.');
    tx.update(ref, {
      status: approve ? 'active' : 'declined',
      joinedAt: approve ? FieldValue.serverTimestamp() : null,
      respondedAt: FieldValue.serverTimestamp(),
      respondedBy: uid,
    });
  });
  logger.info('Join request answered', { uid, teamId, athleteUid, approve });
  return { status: approve ? 'approved' : 'declined' };
});
