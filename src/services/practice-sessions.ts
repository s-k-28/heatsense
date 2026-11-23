import { addDoc, collection, doc, getDocs, getDocsFromServer, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, updateDoc, where, type QueryDocumentSnapshot, type Timestamp } from 'firebase/firestore';

import { firebaseAuth, firestore } from '@/services/firebase';
import { UIL_VERSION, celsiusToF, classifyWbgt, type UilClass, type Zone } from '@/lib/uil-wbgt';
import { checkOutdoorStart, MAX_RECHECK_MINUTES } from '@/lib/outdoor-start';
import { isPracticeDecisionKind, PRACTICE_DECISION_LABELS, practiceDecisionOptions, type PracticeDecisionKind } from '@/lib/practice-decision';

export { recheckStatus } from '@/lib/recheck';

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
  outdoorStart?: { at: Date; readingId: string } | null;
  latestReadingId?: string | null;
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
  decision?: { kind: PracticeDecisionKind; at: Date } | null;
};

const toDate = (value: unknown) => (value && typeof (value as Timestamp).toDate === 'function' ? (value as Timestamp).toDate() : null);

function readPracticeDecision(value: unknown): FieldReading['decision'] {
  if (!value || typeof value !== 'object' || !('at' in value) || !('kind' in value)) return null;
  const at = toDate(value.at);
  return at && isPracticeDecisionKind(value.kind) ? { kind: value.kind, at } : null;
}

export function readOutdoorStart(value: unknown): PracticeSession['outdoorStart'] {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || !('at' in value) || !('readingId' in value)) return null;
  const at = toDate(value.at);
  return at && Number.isFinite(at.getTime()) && typeof value.readingId === 'string' ? { at, readingId: value.readingId } : null;
}

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
      outdoorStart: readOutdoorStart(data.outdoorStart),
      latestReadingId: data.latestReading === undefined ? undefined : data.latestReading?.id ?? null,
    });
  }, onError);
}

/** A finished practice: how many readings were taken and the hottest one. */
export type SessionSummary = { session: PracticeSession; readingCount: number; peak: { wbgtF: number; zone: Zone } | null };

const recentSessionQuery = (teamId: string, count: number) => query(sessions(teamId), orderBy('startedAt', 'desc'), limit(count + 1));

function finishedSessions(docs: QueryDocumentSnapshot[], teamId: string, count: number): PracticeSession[] {
  return docs.flatMap((docSnap) => {
      const data = docSnap.data();
      const startedAt = toDate(data.startedAt);
      const endedAt = toDate(data.endedAt);
      // Pending server timestamps aren't finished records yet. Wait for the committed dates.
      return startedAt && endedAt ? [{ id: docSnap.id, teamId, venue: data.venue, uilClass: data.uilClass, recheckMinutes: data.recheckMinutes, startedAt, endedAt, outdoorStart: readOutdoorStart(data.outdoorStart) }] : [];
    })
    .slice(0, count);
}

async function summarizeSession(session: PracticeSession): Promise<SessionSummary> {
  const list = (await getDocs(readings(session.teamId, session.id))).docs.map((docSnap) => docSnap.data() as { wbgtF: number; zone: Zone });
  const peak = list.reduce<SessionSummary['peak']>((hottest, r) => (!hottest || r.wbgtF > hottest.wbgtF ? { wbgtF: r.wbgtF, zone: r.zone } : hottest), null);
  return { session, readingCount: list.length, peak };
}

/** One-time compatibility read; UI history uses watchRecentSessions so ending practice refreshes it. */
export async function recentSessions(teamId: string, count = 10): Promise<SessionSummary[]> {
  const snapshot = await getDocs(recentSessionQuery(teamId, count));
  return Promise.all(finishedSessions(snapshot.docs, teamId, count).map(summarizeSession));
}

/** Watches session membership of the history; completed sessions' measurement values are immutable. */
export function watchRecentSessions(teamId: string, count: number, onChange: (list: SessionSummary[]) => void, onError: () => void) {
  let live = true;
  let version = 0;
  const summaries = new Map<string, Promise<SessionSummary>>();
  const stop = onSnapshot(recentSessionQuery(teamId, count), (snapshot) => {
    const current = ++version;
    const ended = finishedSessions(snapshot.docs, teamId, count);
    const ids = new Set(ended.map((session) => session.id));
    for (const id of summaries.keys()) if (!ids.has(id)) summaries.delete(id);
    const pending = ended.map((session) => {
      let summary = summaries.get(session.id);
      if (!summary) {
        summary = summarizeSession(session).catch((error: unknown) => { summaries.delete(session.id); throw error; });
        summaries.set(session.id, summary);
      }
      return summary;
    });
    Promise.all(pending).then((list) => {
      if (live && current === version) onChange(list);
    }).catch(() => { if (live && current === version) onError(); });
  }, () => {
    version++;
    summaries.clear();
    if (live) onError();
  });
  return () => { live = false; version++; summaries.clear(); stop(); };
}

export async function startSession(teamId: string, input: { venue: string; uilClass: UilClass; recheckMinutes: number }) {
  if (!Number.isInteger(input.recheckMinutes) || input.recheckMinutes < 5 || input.recheckMinutes > MAX_RECHECK_MINUTES) {
    throw new Error('Choose a recheck interval of 5–30 minutes.');
  }
  const ref = await addDoc(sessions(teamId), {
    ...input,
    venue: input.venue.trim().slice(0, 80),
    policy: `uil-wbgt@${UIL_VERSION}`,
    startedBy: uid(),
    startedAt: serverTimestamp(),
    endedAt: null,
    outdoorStart: null,
    latestReading: null,
  });
  return ref.id;
}

/** Tie outdoor start to the reading the coach saw, including during concurrent staff writes. */
export async function recordOutdoorStart(session: PracticeSession, readingId: string) {
  if (session.outdoorStart !== null || session.endedAt) return false;
  const start = { at: serverTimestamp(), by: uid(), readingId };
  const sessionRef = doc(sessions(session.teamId), session.id);
  if (session.latestReadingId !== undefined) {
    const readingRef = doc(readings(session.teamId, session.id), readingId);
    return runTransaction(db(), async (transaction) => {
      const current = (await transaction.get(sessionRef)).data();
      if (!current || current.endedAt || current.outdoorStart !== null || current.latestReading?.id !== readingId) return false;
      const reading = (await transaction.get(readingRef)).data();
      const measuredAt = toDate(reading?.measuredAt);
      if (!reading || !measuredAt || checkOutdoorStart({ measuredAt, zone: reading.zone }, Date.now()) !== 'ready') return false;
      transaction.update(sessionRef, { outdoorStart: start });
      return true;
    });
  }

  // Records opened before latest-reading tracking keep their existing schema.
  const snapshot = await getDocsFromServer(query(readings(session.teamId, session.id), orderBy('measuredAt', 'desc'), limit(1)));
  const latest = snapshot.docs[0];
  const data = latest?.data();
  const measuredAt = toDate(data?.measuredAt);
  if (!latest || latest.id !== readingId || !data || !measuredAt || latest.metadata.hasPendingWrites
    || checkOutdoorStart({ measuredAt, zone: data.zone }, Date.now()) !== 'ready') {
    return false;
  }
  await updateDoc(sessionRef, { outdoorStart: start });
  return true;
}

export function endSession(session: PracticeSession) {
  return updateDoc(doc(sessions(session.teamId), session.id), { endedAt: serverTimestamp() });
}

/** Every reading in a session, oldest first, live. */
export function watchReadings(session: PracticeSession, onChange: (list: FieldReading[]) => void, onError: () => void) {
  const ordered = query(readings(session.teamId, session.id), orderBy('measuredAt', 'asc'));
  return onSnapshot(ordered, (snapshot) => {
    const list = snapshot.docs.map((docSnap) => {
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
        decision: readPracticeDecision(data.decision),
      };
    });
    const headIndex = list.findIndex((reading) => reading.id === session.latestReadingId);
    // Measurements can have identical timestamps. The server tracks which arrived last.
    if (headIndex >= 0 && headIndex < list.length - 1
      && list[headIndex].measuredAt.getTime() === list.at(-1)?.measuredAt.getTime()) {
      list.push(...list.splice(headIndex, 1));
    }
    onChange(list);
  }, onError);
}

/** Validates and saves a reading. Returns an error message instead of saving anything wrong. */
export async function addReading(session: PracticeSession, input: { value: number; unit: 'F' | 'C'; source: ReadingSource; measuredAt: Date }) {
  const wbgtF = Math.round((input.unit === 'C' ? celsiusToF(input.value) : input.value) * 10) / 10;
  const zone = classifyWbgt(wbgtF, session.uilClass);
  if (!zone) return { error: 'That reading is outside what a WBGT meter reports. Check the number and unit.' } as const;
  const measuredAt = input.measuredAt.getTime();
  if (!Number.isFinite(measuredAt) || measuredAt > Date.now() + 60_000) return { error: 'Check when the reading was measured.' } as const;
  const collectionRef = readings(session.teamId, session.id);
  const measurement = {
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
  };
  if (session.latestReadingId === undefined) {
    await addDoc(collectionRef, measurement);
  } else {
    const readingRef = doc(collectionRef);
    const sessionRef = doc(sessions(session.teamId), session.id);
    await runTransaction(db(), async (transaction) => {
      const current = (await transaction.get(sessionRef)).data();
      if (!current || current.endedAt) throw new Error('This practice record is closed.');
      const previous = toDate(current.latestReading?.measuredAt);
      transaction.set(readingRef, measurement);
      if (!previous || measuredAt >= previous.getTime()) {
        transaction.update(sessionRef, { latestReading: { id: readingRef.id, measuredAt: input.measuredAt } });
      }
    });
  }
  return { zone } as const;
}

/** The coach confirms they've read the guidance for this reading. Recorded once, never edited. */
export function acknowledgeReading(session: PracticeSession, reading: FieldReading) {
  return updateDoc(doc(readings(session.teamId, session.id), reading.id), { acknowledgedBy: uid(), acknowledgedAt: serverTimestamp() });
}

export function recordPracticeDecision(session: PracticeSession, reading: FieldReading, kind: PracticeDecisionKind) {
  if (session.endedAt || reading.decision || !practiceDecisionOptions(reading.zone).includes(kind)) {
    throw new Error('This decision is unavailable for the reading.');
  }
  return updateDoc(doc(readings(session.teamId, session.id), reading.id), {
    decision: { kind, by: uid(), at: serverTimestamp() },
  });
}

/** A plain-text record of the session for sharing with an athletic trainer or administrator. */
export function sessionReport(session: PracticeSession, list: FieldReading[]) {
  const time = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const lines = [
    `HeatSense practice record · ${session.venue}`,
    `${session.startedAt.toLocaleDateString()} · ${session.outdoorStart === undefined ? 'started' : 'record opened'} ${time(session.startedAt)}${session.endedAt ? ` · ${session.outdoorStart === undefined ? 'ended' : 'closed'} ${time(session.endedAt)}` : ' · open'}`,
    `Policy: UIL WBGT activity guidelines ${UIL_VERSION}, Class ${session.uilClass}. Recheck every ${session.recheckMinutes} min.`,
    '',
  ];
  if (session.outdoorStart !== undefined) {
    const openingReading = list.find((reading) => reading.id === session.outdoorStart?.readingId);
    lines.push(session.outdoorStart
      ? `Outdoor start recorded at ${time(session.outdoorStart.at)}${openingReading ? ` using the ${time(openingReading.measuredAt)} reading` : ''}.`
      : 'Outdoor start has not been recorded.', '');
  }
  const startAt = session.outdoorStart?.at;
  let previous: FieldReading | null = null;
  for (const r of list) {
    const gap = previous ? Math.round((r.measuredAt.getTime() - previous.measuredAt.getTime()) / 60_000) : null;
    const late = gap !== null && gap > session.recheckMinutes ? ` (late: ${gap} min after previous)` : '';
    lines.push(`${time(r.measuredAt)}  ${r.wbgtF.toFixed(1)} °F WBGT  ${r.zone.toUpperCase()}  ${SOURCE_LABEL[r.source]}${r.acknowledgedAt ? `  acknowledged ${time(r.acknowledgedAt)}` : '  NOT acknowledged'}${late}`);
    if (r.decision) lines.push(`  Staff decision at ${time(r.decision.at)}: ${PRACTICE_DECISION_LABELS[r.decision.kind]}`);
    if (session.outdoorStart === undefined || (startAt && (r.measuredAt >= startAt || r.id === session.outdoorStart?.readingId))) previous = r;
  }
  if (list.length === 0) lines.push('No readings recorded.');
  return lines.join('\n');
}
