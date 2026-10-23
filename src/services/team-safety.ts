import { addDoc, collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';

import { firebaseAuth, firestore } from '@/services/firebase';

// Team safety records, kept by the coach and approved trainers:
// - the emergency action plan (teams/{teamId}/safety/eap), which every approved member reads;
// - heat-illness responses saved from Protocols (incidents), staff only, never edited;
// - each day's readiness checks (readiness/{yyyy-mm-dd}), staff only.

export type EmergencyPlan = Partial<Record<'venue' | 'hospital' | 'access' | 'aed' | 'tub' | 'caller', string>>;
const FIELDS = ['venue', 'hospital', 'access', 'aed', 'tub', 'caller'] as const;

function db() {
  if (!firestore) throw new Error('HeatSense isn’t connected to its server.');
  return firestore;
}

const ref = (teamId: string) => doc(db(), 'teams', teamId, 'safety', 'eap');

function me() {
  const uid = firebaseAuth?.currentUser?.uid;
  if (!uid) throw new Error('Sign in first.');
  return uid;
}

export function watchEmergencyPlan(teamId: string, onChange: (plan: EmergencyPlan) => void, onError: () => void) {
  return onSnapshot(ref(teamId), (snap) => {
    const data = snap.data() ?? {};
    onChange(Object.fromEntries(FIELDS.filter((k) => typeof data[k] === 'string').map((k) => [k, data[k] as string])));
  }, onError);
}

export function saveEmergencyPlan(teamId: string, plan: EmergencyPlan) {
  const uid = me();
  const clean = Object.fromEntries(FIELDS.map((k) => [k, (plan[k] ?? '').trim().slice(0, 160)]));
  return setDoc(ref(teamId), { ...clean, updatedBy: uid, updatedAt: serverTimestamp() });
}

export type IncidentKind = 'stroke' | 'exhaustion' | 'cramps';
export type Incident = { id: string; kind: IncidentKind; at: number; steps: number; total: number; coolingSec: number | null };

/** The team's latest 30 saved responses, newest first. */
export function watchIncidents(teamId: string, onChange: (list: Incident[]) => void, onError: () => void) {
  return onSnapshot(query(collection(db(), 'teams', teamId, 'incidents'), orderBy('at', 'desc'), limit(30)), (snap) => {
    onChange(snap.docs.map((d) => {
      const x = d.data();
      return { id: d.id, kind: x.kind, at: x.at?.toMillis?.() ?? Date.now(), steps: x.steps, total: x.total, coolingSec: x.coolingSec ?? null };
    }));
  }, onError);
}

export function saveIncident(teamId: string, incident: Omit<Incident, 'id'>) {
  return addDoc(collection(db(), 'teams', teamId, 'incidents'), { ...incident, at: Timestamp.fromMillis(incident.at), recordedBy: me(), createdAt: serverTimestamp() });
}

/** One day's readiness checks: check id → when it was ticked (ms). */
export type Readiness = Record<string, number>;
export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function watchReadiness(teamId: string, day: string, onChange: (done: Readiness) => void, onError: () => void) {
  return onSnapshot(doc(db(), 'teams', teamId, 'readiness', day), (snap) => {
    const done = (snap.data()?.done ?? {}) as Record<string, Timestamp>;
    onChange(Object.fromEntries(Object.entries(done).map(([k, v]) => [k, v?.toMillis?.() ?? Date.now()])));
  }, onError);
}

export function saveReadiness(teamId: string, day: string, done: Readiness) {
  return setDoc(doc(db(), 'teams', teamId, 'readiness', day), { done: Object.fromEntries(Object.entries(done).map(([k, v]) => [k, Timestamp.fromMillis(v)])), updatedBy: me(), updatedAt: serverTimestamp() });
}
