import { FirebaseError } from 'firebase/app';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import { cloudFunctions, firestore } from '@/services/firebase';

// Team invites are served by the Cloud Functions in /functions. Codes are made,
// checked, rate-limited and revoked only on the server; the app calls them and
// listens to the teamMembers documents the security rules let it read.
export const INVITE_CODE_LENGTH = 6;

export type TeamDetails = { school: string; teamName: string; sport: string; level: string };
export type TeamSummary = TeamDetails;
export type TeamInvite = { teamId: string; code: string; expiresAt: string };

export type InviteLookup =
  | { status: 'valid'; teamId: string; team: { teamName: string; school: string; sport: string } }
  | { status: 'not-found' }
  | { status: 'expired' }
  | { status: 'rate-limited'; retryAfterSeconds: number };

export type JoinRequest = { teamId: string; status: 'pending' | 'member' };

/** What a join request saved about the team, so a still-pending athlete can see which team they asked to join. */
export type TeamPreview = { teamName: string; school: string; sport: string };
export type MemberRole = 'athlete' | 'trainer';
export type Membership = { teamId: string; role: MemberRole; status: 'pending' | 'active' | 'declined'; team: TeamPreview | null };
export type PendingAthlete = { userId: string; displayName: string | null; email: string | null; requestedAt: Date | null };

export const NETWORK_ERROR = 'Something went wrong. Please try again.';

async function call<Request, Response>(name: string, data: Request): Promise<Response> {
  if (!cloudFunctions) throw new Error('HeatSense isn’t connected to its server. Add the Firebase settings to .env.');
  try {
    const result = await httpsCallable<Request, Response>(cloudFunctions, name)(data);
    return result.data;
  } catch (error) {
    if (__DEV__) console.warn(`[team-invites] ${name} failed`, error);
    // Callable errors carry the server's user-facing message; anything else is a connection problem.
    if (error instanceof FirebaseError && error.code !== 'functions/internal' && error.code !== 'functions/unavailable') throw new Error(error.message);
    throw new Error(NETWORK_ERROR);
  }
}

/** Coach: creates the team the first time (or updates its details) and returns its active invite. Safe to retry. */
export function ensureTeamInvite(details: TeamDetails): Promise<TeamInvite> {
  return call('ensureTeamInvite', { details });
}

/** Coach: the signed-in coach's team and active invite, or null if they haven't created one. Never rotates a live code. */
export function getMyTeamInvite(): Promise<{ team: TeamSummary; invite: TeamInvite } | null> {
  return call('getMyTeamInvite', {});
}

/** Coach: revokes the team's current code and issues a new one. */
export function regenerateInvite(teamId: string): Promise<TeamInvite> {
  return call('regenerateInvite', { teamId });
}

/** Coach: approves or declines an athlete's pending request. */
export function respondToJoinRequest(teamId: string, athleteUid: string, approve: boolean): Promise<{ status: 'approved' | 'declined' }> {
  return call('respondToJoinRequest', { teamId, athleteUid, approve });
}

/** Athlete: checks a code and returns only the public team summary, and only for a valid code. */
export function lookupInvite(code: string): Promise<InviteLookup> {
  return call('lookupInvite', { code });
}

/** Athlete or trainer: asks to join the team behind a still-valid code, as the signed-in account. */
export function requestToJoinTeam(code: string, role: MemberRole = 'athlete'): Promise<JoinRequest> {
  return call('requestToJoinTeam', { code, role });
}

/** Coach: live list of athletes waiting for approval. Returns the unsubscribe function. */
export function watchPendingAthletes(teamId: string, onChange: (athletes: PendingAthlete[]) => void, onError: () => void): () => void {
  if (!firestore) return () => {};
  const pending = query(collection(firestore, 'teamMembers'), where('teamId', '==', teamId), where('role', '==', 'athlete'), where('status', '==', 'pending'));
  return onSnapshot(pending, (snapshot) => {
    const athletes = snapshot.docs.map((doc) => {
      const data = doc.data();
      return { userId: data.userId as string, displayName: data.displayName ?? null, email: data.email ?? null, requestedAt: data.requestedAt?.toDate?.() ?? null };
    });
    athletes.sort((a, b) => (a.requestedAt?.getTime() ?? Infinity) - (b.requestedAt?.getTime() ?? Infinity));
    onChange(athletes);
  }, onError);
}

/** Athlete: live view of the signed-in athlete's team membership (active wins over pending). Returns the unsubscribe function. */
export function watchMyMembership(userId: string, onChange: (membership: Membership | null) => void, onError: () => void): () => void {
  if (!firestore) return () => {};
  const mine = query(collection(firestore, 'teamMembers'), where('userId', '==', userId), where('role', 'in', ['athlete', 'trainer']));
  const rank = { active: 0, pending: 1, declined: 2 } as const;
  return onSnapshot(mine, (snapshot) => {
    const memberships = snapshot.docs.map((member) => {
      const data = member.data();
      return { teamId: data.teamId as string, role: data.role as MemberRole, status: data.status as Membership['status'], team: (data.team as TeamPreview | undefined) ?? null };
    });
    memberships.sort((a, b) => rank[a.status] - rank[b.status]);
    onChange(memberships[0] ?? null);
  }, onError);
}

/** An approved member's team summary, read from the team itself (the rules only allow this once approved). */
export async function getTeamPreview(teamId: string): Promise<TeamPreview | null> {
  if (!firestore) return null;
  const team = (await getDoc(doc(firestore, 'teams', teamId))).data();
  return team ? { teamName: team.name, school: team.school, sport: team.sport } : null;
}
