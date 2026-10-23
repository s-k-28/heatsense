import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';

import { firebaseAuth, firestore } from '@/services/firebase';

// The team's emergency action plan (teams/{teamId}/safety/eap): the coach and approved trainers
// edit it, every approved member reads it. The rules cap each field at 160 characters.

export type EmergencyPlan = Partial<Record<'venue' | 'hospital' | 'access' | 'aed' | 'tub' | 'caller', string>>;
const FIELDS = ['venue', 'hospital', 'access', 'aed', 'tub', 'caller'] as const;

function ref(teamId: string) {
  if (!firestore) throw new Error('HeatSense isn’t connected to its server.');
  return doc(firestore, 'teams', teamId, 'safety', 'eap');
}

export function watchEmergencyPlan(teamId: string, onChange: (plan: EmergencyPlan) => void, onError: () => void) {
  return onSnapshot(ref(teamId), (snap) => {
    const data = snap.data() ?? {};
    onChange(Object.fromEntries(FIELDS.filter((k) => typeof data[k] === 'string').map((k) => [k, data[k] as string])));
  }, onError);
}

export function saveEmergencyPlan(teamId: string, plan: EmergencyPlan) {
  const uid = firebaseAuth?.currentUser?.uid;
  if (!uid) throw new Error('Sign in to save the plan.');
  const clean = Object.fromEntries(FIELDS.map((k) => [k, (plan[k] ?? '').trim().slice(0, 160)]));
  return setDoc(ref(teamId), { ...clean, updatedBy: uid, updatedAt: serverTimestamp() });
}
