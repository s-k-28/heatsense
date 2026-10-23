import { getRandomValues } from 'expo-crypto';
import { FirebaseError } from 'firebase/app';
import { addDoc, collection, doc, getDoc, getDocs, limit, onSnapshot, query, serverTimestamp, setDoc, Timestamp, updateDoc, where } from 'firebase/firestore';

import { firebaseAuth, firestore } from '@/services/firebase';

// Team invites on the free Firebase plan: the app writes straight to Firestore and the security
// rules (firebase/firestore.rules) enforce everything a server used to: only a team's coach makes or
// revokes its code, a code joins only its own team and only while live, and joining creates a
// PENDING request that only the coach can approve.
//
// ponytail: no rate limit on code guesses (rules can't count attempts). Guessing a code gets a
// stranger nothing but a pending request the coach declines. Add App Check or a server lookup if
// the app moves to the Blaze plan.
//
//   teams/{teamId}                 name, school, sport, level, coachUid, activeCode
//   inviteCodes/{code}             teamId, team preview, expiresAt, revoked (get by exact code only)
//   teamMembers/{teamId}_{uid}     role (athlete | trainer), status (pending | active | declined)
export const INVITE_CODE_LENGTH = 6;
const INVITE_VALID_DAYS = 7;

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
const NOT_CONNECTED = 'HeatSense isn’t connected to its server. Add the Firebase settings to .env.';

function db() {
  if (!firestore) throw new Error(NOT_CONNECTED);
  return firestore;
}

function me() {
  const user = firebaseAuth?.currentUser;
  if (!user) throw new Error('Your session ended. Sign in again.');
  return user;
}

/** Runs a Firestore step, turning permission and network failures into one plain message. */
async function attempt<T>(label: string, work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (__DEV__) console.warn(`[team-invites] ${label} failed`, error);
    if (error instanceof Error && !(error instanceof FirebaseError)) throw error;
    throw new Error(NETWORK_ERROR);
  }
}

/** A random 6-digit code, leading zeros kept. */
function randomCode() {
  const [n] = getRandomValues(new Uint32Array(1));
  return String(n % 10 ** INVITE_CODE_LENGTH).padStart(INVITE_CODE_LENGTH, '0');
}

const preview = (team: { name: string; school: string; sport: string }): TeamPreview => ({ teamName: team.name, school: team.school, sport: team.sport });

/** Writes a fresh code for the team and points the team at it. Retries if a code is already taken. */
async function issueCode(teamId: string, team: TeamPreview): Promise<TeamInvite> {
  const expiresAt = Timestamp.fromMillis(Date.now() + INVITE_VALID_DAYS * 86_400_000);
  for (let tries = 0; tries < 8; tries++) {
    const code = randomCode();
    try {
      // The rules allow creating a code only if it doesn't exist; a taken code is refused, so try another.
      await setDoc(doc(db(), 'inviteCodes', code), { teamId, team, createdBy: me().uid, createdAt: serverTimestamp(), expiresAt, revoked: false });
    } catch (error) {
      if (error instanceof FirebaseError && error.code === 'permission-denied') continue;
      throw error;
    }
    await updateDoc(doc(db(), 'teams', teamId), { activeCode: code, updatedAt: serverTimestamp() });
    return { teamId, code, expiresAt: expiresAt.toDate().toISOString() };
  }
  throw new Error(NETWORK_ERROR);
}

async function myTeam() {
  const mine = await getDocs(query(collection(db(), 'teams'), where('coachUid', '==', me().uid), limit(1)));
  const snap = mine.docs[0];
  return snap ? { id: snap.id, data: snap.data() as { name: string; school: string; sport: string; level: string; activeCode: string | null } } : null;
}

async function liveInvite(teamId: string, code: string | null): Promise<TeamInvite | null> {
  if (!code) return null;
  const invite = (await getDoc(doc(db(), 'inviteCodes', code))).data();
  if (!invite || invite.revoked || invite.expiresAt.toMillis() <= Date.now()) return null;
  return { teamId, code, expiresAt: invite.expiresAt.toDate().toISOString() };
}

/** Coach: creates the team the first time (or updates its details) and returns its active invite. Safe to retry. */
export function ensureTeamInvite(details: TeamDetails): Promise<TeamInvite> {
  return attempt('ensureTeamInvite', async () => {
    const fields = { name: details.teamName.trim(), school: details.school.trim(), sport: details.sport, level: details.level };
    const existing = await myTeam();
    if (existing) {
      await updateDoc(doc(db(), 'teams', existing.id), { ...fields, updatedAt: serverTimestamp() });
      return (await liveInvite(existing.id, existing.data.activeCode)) ?? issueCode(existing.id, preview(fields));
    }
    const uid = me().uid;
    const created = await addDoc(collection(db(), 'teams'), { ...fields, coachUid: uid, createdBy: uid, status: 'active', activeCode: null, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return issueCode(created.id, preview(fields));
  });
}

/** Coach: the signed-in coach's team and active invite, or null if they haven't created one. A lapsed code is replaced. */
export function getMyTeamInvite(): Promise<{ team: TeamSummary; invite: TeamInvite } | null> {
  return attempt('getMyTeamInvite', async () => {
    if (!firebaseAuth?.currentUser || !firestore) return null;
    const existing = await myTeam();
    if (!existing) return null;
    const team = { teamName: existing.data.name, school: existing.data.school, sport: existing.data.sport, level: existing.data.level };
    const invite = (await liveInvite(existing.id, existing.data.activeCode)) ?? (await issueCode(existing.id, preview(existing.data)));
    return { team, invite };
  });
}

/** Coach: revokes the team's current code and issues a new one. */
export function regenerateInvite(teamId: string): Promise<TeamInvite> {
  return attempt('regenerateInvite', async () => {
    const team = (await getDoc(doc(db(), 'teams', teamId))).data() as { name: string; school: string; sport: string; activeCode: string | null } | undefined;
    if (!team) throw new Error('That team no longer exists.');
    if (team.activeCode) await updateDoc(doc(db(), 'inviteCodes', team.activeCode), { revoked: true });
    return issueCode(teamId, preview(team));
  });
}

/** Coach: approves or declines a pending request. Approval is the only way anyone joins a team. */
export function respondToJoinRequest(teamId: string, athleteUid: string, approve: boolean): Promise<{ status: 'approved' | 'declined' }> {
  return attempt('respondToJoinRequest', async () => {
    await updateDoc(doc(db(), 'teamMembers', `${teamId}_${athleteUid}`), {
      status: approve ? 'active' : 'declined',
      joinedAt: approve ? serverTimestamp() : null,
      respondedAt: serverTimestamp(),
      respondedBy: me().uid,
    });
    return { status: approve ? 'approved' : 'declined' };
  });
}

/** Athlete or trainer: checks a code and returns only the public team summary, and only for a valid code. */
export function lookupInvite(code: string): Promise<InviteLookup> {
  return attempt('lookupInvite', async () => {
    if (!new RegExp(`^\\d{${INVITE_CODE_LENGTH}}$`).test(code)) return { status: 'not-found' };
    const invite = (await getDoc(doc(db(), 'inviteCodes', code))).data();
    if (!invite) return { status: 'not-found' };
    if (invite.revoked || invite.expiresAt.toMillis() <= Date.now()) return { status: 'expired' };
    return { status: 'valid', teamId: invite.teamId, team: invite.team };
  });
}

/** Athlete or trainer: asks to join the team behind a still-valid code, as the signed-in account. */
export function requestToJoinTeam(code: string, role: MemberRole = 'athlete'): Promise<JoinRequest> {
  return attempt('requestToJoinTeam', async () => {
    const found = await lookupInvite(code);
    if (found.status === 'expired') throw new Error('This code has expired.');
    if (found.status !== 'valid') throw new Error('Code not found. Try again.');
    const user = me();
    const ref = doc(db(), 'teamMembers', `${found.teamId}_${user.uid}`);
    const existing = (await getDoc(ref)).data();
    if (existing?.status === 'active') return { teamId: found.teamId, status: 'member' };
    if (existing?.status === 'pending') return { teamId: found.teamId, status: 'pending' };
    const request = { role, status: 'pending', inviteCode: code, team: found.team, requestedAt: serverTimestamp() };
    if (existing) {
      // Declined before: ask again with the current code.
      await updateDoc(ref, request);
    } else {
      await setDoc(ref, {
        ...request,
        teamId: found.teamId,
        userId: user.uid,
        displayName: user.displayName ?? null,
        email: user.email ?? null,
        joinedAt: null,
      });
    }
    return { teamId: found.teamId, status: 'pending' };
  });
}

/** Coach: live list of people waiting for approval. Returns the unsubscribe function. */
export function watchPendingAthletes(teamId: string, onChange: (athletes: PendingAthlete[]) => void, onError: () => void): () => void {
  if (!firestore) return () => {};
  const pending = query(collection(firestore, 'teamMembers'), where('teamId', '==', teamId), where('role', 'in', ['athlete', 'trainer']), where('status', '==', 'pending'));
  return onSnapshot(pending, (snapshot) => {
    const athletes = snapshot.docs.map((entry) => {
      const data = entry.data();
      return { userId: data.userId as string, displayName: data.displayName ?? null, email: data.email ?? null, requestedAt: data.requestedAt?.toDate?.() ?? null };
    });
    athletes.sort((a, b) => (a.requestedAt?.getTime() ?? Infinity) - (b.requestedAt?.getTime() ?? Infinity));
    onChange(athletes);
  }, onError);
}

/** Athlete or trainer: live view of the signed-in person's team membership (active wins over pending). */
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
