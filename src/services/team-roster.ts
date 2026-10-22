import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';

import { firestore } from '@/services/firebase';

// The coach's roster: everyone who asked to join or was approved, live from teamMembers, plus the
// basics each approved athlete saved on their profile. Security rules decide what a coach can read:
// teamMembers for their own team, and athletes/{uid} only once that athlete is approved. Health and
// emergency answers live under athletes/{uid}/private and are never readable here.

export type RosterMember = {
  userId: string;
  role: 'athlete' | 'trainer';
  status: 'pending' | 'active';
  displayName: string | null;
  email: string | null;
  requestedAt: Date | null;
  joinedAt: Date | null;
};

export type AthleteCard = { fullName: string; grade: string | null; sport: string | null; jersey: string | null };

export function watchRoster(teamId: string, onChange: (members: RosterMember[]) => void, onError: () => void): () => void {
  if (!firestore) return () => {};
  const members = query(collection(firestore, 'teamMembers'), where('teamId', '==', teamId), where('role', 'in', ['athlete', 'trainer']));
  return onSnapshot(members, (snapshot) => {
    const list: RosterMember[] = [];
    snapshot.docs.forEach((entry) => {
      const data = entry.data();
      if (data.status !== 'pending' && data.status !== 'active') return; // declined requests stay hidden
      list.push({
        userId: data.userId as string,
        role: data.role,
        status: data.status,
        displayName: data.displayName ?? null,
        email: data.email ?? null,
        requestedAt: data.requestedAt?.toDate?.() ?? null,
        joinedAt: data.joinedAt?.toDate?.() ?? null,
      });
    });
    onChange(list);
  }, onError);
}

/** For athletes: the team's approved athletic trainers, live. The rules allow nothing more. */
export function watchTrainers(teamId: string, onChange: (trainers: { userId: string; displayName: string | null }[]) => void, onError: () => void): () => void {
  if (!firestore) return () => {};
  const trainers = query(collection(firestore, 'teamMembers'), where('teamId', '==', teamId), where('role', '==', 'trainer'), where('status', '==', 'active'));
  return onSnapshot(trainers, (snapshot) => onChange(snapshot.docs.map((entry) => ({ userId: entry.data().userId as string, displayName: entry.data().displayName ?? null }))), onError);
}

/** An approved athlete's profile basics, or null if they haven't finished their profile yet. */
export async function getAthleteCard(uid: string): Promise<AthleteCard | null> {
  if (!firestore) return null;
  const data = (await getDoc(doc(firestore, 'athletes', uid))).data();
  if (!data?.fullName) return null;
  return { fullName: data.fullName, grade: data.grade ?? null, sport: data.sport ?? null, jersey: data.jersey ?? null };
}
