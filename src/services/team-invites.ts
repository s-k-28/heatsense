import { getRandomValues, randomUUID } from 'expo-crypto';

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL STAND-IN — NOT A BACKEND.
//
// HeatSense has no server yet. Everything below runs on the coach's device and
// lives in memory: no team is created anywhere else, codes are unique only on
// this device, and a reload or app restart starts over. Athletes cannot join
// with these codes. It exists so the Invite screen can be built and tested
// against the same calls a real backend will answer.
//
// Replace the bodies of `ensureTeamInvite` and `regenerateInvite` with server
// calls. The server must own all of this, never the app:
//   • Create the team once per coach (idempotent; revisiting must not duplicate it).
//   • Generate the code with a CSPRNG, unique among ACTIVE codes (DB unique index).
//   • Expire codes (INVITE_VALID_DAYS) and revoke the old code on regenerate.
//   • Redeeming a code: validate server-side, rate-limit attempts per device/IP
//     and per code, lock out after repeated misses, and create a PENDING join
//     request the coach approves. A 4-digit code is 10,000 combinations, so it
//     must never grant team access on its own.
//   • Check that the caller is the team's coach before regenerating or approving.
// ─────────────────────────────────────────────────────────────────────────────

export const IS_LOCAL_STAND_IN = true;
export const INVITE_VALID_DAYS = 7;
export const INVITE_CODE_LENGTH = 4;

export type TeamDetails = { school: string; teamName: string; sport: string; level: string };
export type TeamInvite = { teamId: string; code: string; expiresAt: string };

type StoredTeam = TeamDetails & { id: string; inviteCode: string | null };
const teams = new Map<string, StoredTeam>();
const activeInvites = new Map<string, TeamInvite>(); // keyed by code

let didWarnAboutLocalStandIn = false;
function warnAboutLocalStandIn() {
  if (__DEV__ && IS_LOCAL_STAND_IN && !didWarnAboutLocalStandIn) {
    console.warn('[team-invites] Using the local stand-in: invite codes are not saved to a server and cannot be redeemed.');
    didWarnAboutLocalStandIn = true;
  }
}

// Uniform 4-digit code from a cryptographically secure source. Rejection sampling
// (keep values below 60,000, a multiple of 10,000) avoids modulo bias.
function secureCode(): string {
  const buffer = new Uint16Array(1);
  for (;;) {
    getRandomValues(buffer);
    if (buffer[0] < 60000) return String(buffer[0] % 10 ** INVITE_CODE_LENGTH).padStart(INVITE_CODE_LENGTH, '0');
  }
}

function isActive(invite: TeamInvite) {
  return new Date(invite.expiresAt).getTime() > Date.now();
}

function issueInvite(team: StoredTeam): TeamInvite {
  if (team.inviteCode) activeInvites.delete(team.inviteCode); // revoke the previous code
  for (const [code, invite] of activeInvites) if (!isActive(invite)) activeInvites.delete(code);
  if (activeInvites.size >= 10 ** INVITE_CODE_LENGTH) throw new Error('No invitation codes are available right now.');
  let code = secureCode();
  while (activeInvites.has(code)) code = secureCode();
  const invite = { teamId: team.id, code, expiresAt: new Date(Date.now() + INVITE_VALID_DAYS * 86_400_000).toISOString() };
  activeInvites.set(code, invite);
  team.inviteCode = code;
  return invite;
}

/** Creates the team the first time (or updates its details), and returns its active invite, issuing one only if needed. */
export async function ensureTeamInvite(details: TeamDetails, teamId: string | null): Promise<TeamInvite> {
  warnAboutLocalStandIn();
  let team = teamId ? teams.get(teamId) : undefined;
  if (team) Object.assign(team, details);
  else {
    team = { ...details, id: teamId ?? randomUUID(), inviteCode: null };
    teams.set(team.id, team);
  }
  const current = team.inviteCode ? activeInvites.get(team.inviteCode) : undefined;
  return current && isActive(current) ? current : issueInvite(team);
}

/** Revokes the team's current code and issues a new one. */
export async function regenerateInvite(teamId: string): Promise<TeamInvite> {
  warnAboutLocalStandIn();
  const team = teams.get(teamId);
  if (!team) throw new Error('Team not found.');
  return issueInvite(team);
}

// ── Athlete side: redeeming a code ──────────────────────────────────────────
// Same LOCAL STAND-IN as above: it checks the codes issued on this device, so it
// only finds a team created earlier in the same app session. The server must
// replace these bodies and own every rule here (lookup, expiry, rate limits,
// duplicate prevention, coach approval). A code never grants access on its own:
// joining always creates a PENDING request.

export type InviteLookup =
  | { status: 'valid'; teamId: string; team: { teamName: string; school: string; sport: string } }
  | { status: 'not-found' }
  | { status: 'expired' }
  | { status: 'rate-limited'; retryAfterSeconds: number };

export type JoinRequest = { teamId: string; status: 'pending' };

const MAX_MISSES = 5;
const MISS_WINDOW_MS = 10 * 60_000;
const LOCKOUT_MS = 10 * 60_000;
let misses: number[] = [];
let lockedUntil = 0;
const joinRequests = new Map<string, JoinRequest>(); // keyed by `${teamId}:${userId}`

function rateLimited(): InviteLookup | null {
  const now = Date.now();
  if (now < lockedUntil) return { status: 'rate-limited', retryAfterSeconds: Math.ceil((lockedUntil - now) / 1000) };
  return null;
}

function recordMiss() {
  const now = Date.now();
  misses = misses.filter((time) => now - time < MISS_WINDOW_MS);
  misses.push(now);
  if (misses.length >= MAX_MISSES) {
    lockedUntil = now + LOCKOUT_MS;
    misses = [];
  }
}

/** Checks a code and returns only the public team summary, and only for a valid code. */
export async function lookupInvite(code: string): Promise<InviteLookup> {
  warnAboutLocalStandIn();
  const limited = rateLimited();
  if (limited) return limited;
  if (!new RegExp(`^\\d{${INVITE_CODE_LENGTH}}$`).test(code)) {
    recordMiss();
    return { status: 'not-found' };
  }
  const invite = activeInvites.get(code);
  const team = invite ? teams.get(invite.teamId) : undefined;
  if (!invite || !team) {
    recordMiss();
    return { status: 'not-found' };
  }
  if (!isActive(invite)) return { status: 'expired' };
  return { status: 'valid', teamId: team.id, team: { teamName: team.teamName, school: team.school, sport: team.sport } };
}

/** Asks to join the team behind a still-valid code. Idempotent: a repeat request returns the existing one. */
export async function requestToJoinTeam(code: string, userId: string): Promise<JoinRequest> {
  const lookup = await lookupInvite(code);
  if (lookup.status === 'expired') throw new Error('This code has expired. Ask your coach for a new one.');
  if (lookup.status === 'rate-limited') throw new Error('Too many attempts. Try again in a few minutes.');
  if (lookup.status !== 'valid') throw new Error("That code wasn't found. Check it and try again.");
  const key = `${lookup.teamId}:${userId}`;
  const existing = joinRequests.get(key);
  if (existing) return existing;
  const request: JoinRequest = { teamId: lookup.teamId, status: 'pending' };
  joinRequests.set(key, request);
  return request;
}
