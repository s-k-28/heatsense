import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';

import { firebaseAuth, firestore } from '@/services/firebase';
import type { PracticeSession } from '@/services/practice-sessions';

// The HeatSense Band's data in Firestore (free plan, rules-only; see firebase/firestore.rules):
//   athletes/{uid}/band/current                          the paired band, private to the athlete
//   teams/{teamId}/sessions/{sessionId}/vitals/{uid}     the athlete's latest sample during practice,
//                                                        read by the coach and approved trainers
// `source` says whether a sample came from a real band or the simulator, so every screen can label it.

export type VitalsSource = 'band' | 'simulated';
export type VitalsSample = {
  heartRate: number;
  skinTempF: number | null;
  sweat: number | null;
  movement: number;
  recovery: 'usual' | 'watch' | 'unknown';
  source: VitalsSource;
  serial: string | null;
  sampledAt: Date;
};
export type VitalsRecord = VitalsSample & { athleteUid: string; updatedAt: Date | null };

function db() {
  if (!firestore) throw new Error('HeatSense isn’t connected to its server.');
  return firestore;
}

function me() {
  const uid = firebaseAuth?.currentUser?.uid;
  if (!uid) throw new Error('Sign in to pair a band.');
  return uid;
}

/** Saves the band the athlete just paired. */
export function savePairing(serial: string, firmware: string | null = null) {
  return setDoc(doc(db(), 'athletes', me(), 'band', 'current'), { serial, firmware, pairedAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export function forgetPairing() {
  return deleteDoc(doc(db(), 'athletes', me(), 'band', 'current'));
}

/** Overwrites the athlete's latest sample for this practice. The rules allow one write every 10 seconds. */
export function publishVitals(session: PracticeSession, sample: VitalsSample) {
  return setDoc(doc(db(), 'teams', session.teamId, 'sessions', session.id, 'vitals', me()), {
    ...sample,
    heartRate: Math.round(sample.heartRate),
    sampledAt: Timestamp.fromDate(sample.sampledAt),
    updatedAt: serverTimestamp(),
  });
}

/** Coach and trainers: every athlete's latest sample in this practice, live. */
export function watchTeamVitals(session: PracticeSession, onChange: (records: VitalsRecord[]) => void, onError: () => void) {
  return onSnapshot(collection(db(), 'teams', session.teamId, 'sessions', session.id, 'vitals'), (snapshot) => {
    onChange(snapshot.docs.map((d) => {
      const data = d.data();
      return {
        athleteUid: d.id,
        heartRate: data.heartRate,
        skinTempF: data.skinTempF ?? null,
        sweat: data.sweat ?? null,
        movement: data.movement,
        recovery: data.recovery,
        source: data.source,
        serial: data.serial ?? null,
        sampledAt: data.sampledAt?.toDate?.() ?? new Date(),
        updatedAt: data.updatedAt?.toDate?.() ?? null,
      };
    }));
  }, onError);
}
