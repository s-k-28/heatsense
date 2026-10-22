import { addDoc, collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where, type Timestamp } from 'firebase/firestore';

import { firebaseAuth, firestore } from '@/services/firebase';
import { UIL_VERSION, celsiusToF, classifyWbgt, type UilClass, type Zone } from '@/lib/uil-wbgt';

// Practice sessions and their field readings, shared with the whole team through Firestore.
//   teams/{teamId}/sessions/{sessionId}                      one practice
//   teams/{teamId}/sessions/{sessionId}/readings/{readingId} append-only WBGT readings
// Firestore rules recompute the UIL zone from the reading, so a client can't store a wrong zone.

export type ReadingSource = 'handheld' | 'station' | 'other';

export const SOURCE_LABEL: Record<ReadingSource, string> = {
  handheld: 'Handheld WBGT meter',
  station: 'Weather station',
  other: 'Other',
};

export type PracticeSession = {
  id: string;
  teamId: string;
  venue: string;
  uilClass: UilClass;
  recheckMinutes: number;
  startedAt: Date;
  endedAt: Date | null;
};

export type FieldReading = {
  id: string;
  wbgtF: number;
  enteredValue: number;
  enteredUnit: 'F' | 'C';
  source: ReadingSource;
  measuredAt: Date;
  zone: Zone;
  recordedBy: string;
  acknowledgedAt: Date | null;
};

const toDate = (value: unknown) => (value && typeof (value as Timestamp).toDate === 'function' ? (value as Timestamp).toDate() : null);

function db() {
  if (!firestore) throw new Error('Firebase is not configured for this build.');
  return firestore;
}

function uid() {
  const user = firebaseAuth?.currentUser;
  if (!user) throw new Error('Sign in to record practice sessions.');
  return user.uid;
}

const sessions = (teamId: string) => collection(db(), 'teams', teamId, 'sessions');
const readings = (teamId: string, sessionId: string) => collection(db(), 'teams', teamId, 'sessions', sessionId, 'readings');

/** The team's open session (if any), live. */
export function watchActiveSession(teamId: string, onChange: (session: PracticeSession | null) => void, onError: () => void) {
  const open = query(sessions(teamId), where('endedAt', '==', null), orderBy('startedAt', 'desc'), limit(1));
  return onSnapshot(open, (snapshot) => {
    const docSnap = snapshot.docs[0];
    if (!docSnap) return onChange(null);
    const data = docSnap.data();
    onChange({
      id: docSnap.id,
      teamId,
      venue: data.venue,
      uilClass: data.uilClass,
      recheckMinutes: data.recheckMinutes,
      // serverTimestamp is null until the write lands; the local clock is close enough until then.
      startedAt: toDate(data.startedAt) ?? new Date(),
      endedAt: toDate(data.endedAt),
    });
  }, onError);
}

export async function startSession(teamId: string, input: { venue: string; uilClass: UilClass; recheckMinutes: number }) {
  const ref = await addDoc(sessions(teamId), {
    ...input,
    venue: input.venue.trim().slice(0, 80),
    policy: `uil-wbgt@${UIL_VERSION}`,
    startedBy: uid(),
    startedAt: serverTimestamp(),
    endedAt: null,
  });
  return ref.id;
}

export function endSession(session: PracticeSession) {
  return updateDoc(doc(sessions(session.teamId), session.id), { endedAt: serverTimestamp() });
}

/** Every reading in a session, oldest first, live. */
export function watchReadings(session: PracticeSession, onChange: (list: FieldReading[]) => void, onError: () => void) {
  const ordered = query(readings(session.teamId, session.id), orderBy('measuredAt', 'asc'));
  return onSnapshot(ordered, (snapshot) => {
    onChange(snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        wbgtF: data.wbgtF,
        enteredValue: data.enteredValue,
        enteredUnit: data.enteredUnit,
        source: data.source,
        measuredAt: toDate(data.measuredAt) ?? new Date(),
        zone: data.zone,
        recordedBy: data.recordedBy,
        acknowledgedAt: toDate(data.acknowledgedAt),
      };
    }));
  }, onError);
}

/** Validates and saves a reading. Returns an error message instead of saving anything wrong. */
export async function addReading(session: PracticeSession, input: { value: number; unit: 'F' | 'C'; source: ReadingSource; measuredAt: Date }) {
  const wbgtF = Math.round((input.unit === 'C' ? celsiusToF(input.value) : input.value) * 10) / 10;
  const zone = classifyWbgt(wbgtF, session.uilClass);
  if (!zone) return { error: 'That reading is outside what a WBGT meter reports. Check the number and unit.' } as const;
  if (input.measuredAt.getTime() > Date.now() + 60_000) return { error: 'The measurement time can’t be in the future.' } as const;
  await addDoc(readings(session.teamId, session.id), {
    wbgtF,
    enteredValue: input.value,
    enteredUnit: input.unit,
    source: input.source,
    measuredAt: input.measuredAt,
    zone,
    uilClass: session.uilClass,
    recordedBy: uid(),
    recordedAt: serverTimestamp(),
    acknowledgedBy: null,
    acknowledgedAt: null,
  });
  return { zone } as const;
}

/** The coach confirms they've read the guidance for this reading. Recorded once, never edited. */
export function acknowledgeReading(session: PracticeSession, reading: FieldReading) {
  return updateDoc(doc(readings(session.teamId, session.id), reading.id), { acknowledgedBy: uid(), acknowledgedAt: serverTimestamp() });
}

/** When the next reading is due, and whether it's late. Based on the last measurement, not on screen time. */
export function recheckStatus(session: PracticeSession, latest: FieldReading | null, now: number) {
  const from = latest ? latest.measuredAt.getTime() : session.startedAt.getTime();
  const dueAt = from + session.recheckMinutes * 60_000;
  return { dueAt, overdue: now > dueAt, msLeft: dueAt - now };
}

/** A plain-text record of the session for sharing with an athletic trainer or administrator. */
export function sessionReport(session: PracticeSession, list: FieldReading[]) {
  const time = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const lines = [
    `HeatSense practice record · ${session.venue}`,
    `${session.startedAt.toLocaleDateString()} · started ${time(session.startedAt)}${session.endedAt ? ` · ended ${time(session.endedAt)}` : ' · in progress'}`,
    `Policy: UIL WBGT activity guidelines ${UIL_VERSION}, Class ${session.uilClass}. Recheck every ${session.recheckMinutes} min.`,
    '',
  ];
  let previous: FieldReading | null = null;
  for (const r of list) {
    const gap = previous ? Math.round((r.measuredAt.getTime() - previous.measuredAt.getTime()) / 60_000) : null;
    const late = gap !== null && gap > session.recheckMinutes ? ` (late: ${gap} min after previous)` : '';
    lines.push(`${time(r.measuredAt)}  ${r.wbgtF.toFixed(1)} °F WBGT  ${r.zone.toUpperCase()}  ${SOURCE_LABEL[r.source]}${r.acknowledgedAt ? `  acknowledged ${time(r.acknowledgedAt)}` : '  NOT acknowledged'}${late}`);
    previous = r;
  }
  if (list.length === 0) lines.push('No readings recorded.');
  return lines.join('\n');
}
