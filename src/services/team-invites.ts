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
