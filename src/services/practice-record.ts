import { doc, onSnapshot, type Timestamp } from 'firebase/firestore';

import { firestore } from '@/services/firebase';
import { sessionReport, type FieldReading, type PracticeSession } from '@/services/practice-sessions';

export type PracticeRecord = PracticeSession & { policy: string | null };

const date = (value: unknown): Date | null => {
  if (!value || typeof (value as Timestamp).toDate !== 'function') return null;
  const result = (value as Timestamp).toDate();
  return Number.isFinite(result.getTime()) ? result : null;
};

/** Uses the same coach/approved-member read permissions as the history list. No client access bypass. */
export function watchPracticeRecord(teamId: string, id: string, onChange: (record: PracticeRecord | null) => void, onError: () => void) {
  if (!firestore || !teamId || !id || teamId.includes('/') || id.includes('/')) {
    onError();
    return () => {};
  }
  return onSnapshot(doc(firestore, 'teams', teamId, 'sessions', id), (snapshot) => {
    if (!snapshot.exists()) { onChange(null); return; }
    const data = snapshot.data();
    const startedAt = date(data.startedAt);
    const endedAt = date(data.endedAt);
    if (!startedAt || (data.endedAt != null && !endedAt) || typeof data.venue !== 'string'
      || (data.uilClass !== 2 && data.uilClass !== 3) || !Number.isFinite(data.recheckMinutes)) {
      onError();
      return;
    }
    onChange({
      id, teamId, startedAt, endedAt,
      venue: data.venue,
      uilClass: data.uilClass,
      recheckMinutes: data.recheckMinutes,
      policy: typeof data.policy === 'string' ? data.policy : null,
    });
  }, onError);
}

export function savedPolicyLabel(record: PracticeRecord) {
  return record.policy?.startsWith('uil-wbgt@') ? `UIL WBGT ${record.policy.slice('uil-wbgt@'.length)}` : record.policy ?? 'Not recorded';
}

/** Historical records keep their saved policy version instead of silently claiming today's version. */
export function practiceRecordReport(record: PracticeRecord, readings: FieldReading[]) {
  return sessionReport(record, readings).replace(/^Policy:.*$/m,
    `Saved policy: ${savedPolicyLabel(record)}, Class ${record.uilClass}. Recheck every ${record.recheckMinutes} min.`);
}
