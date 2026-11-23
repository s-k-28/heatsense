import type { Zone } from './uil-wbgt';

export const PRACTICE_DECISION_LABELS = {
  adjusted_timing: 'Adjusted duration or breaks',
  moved_indoors: 'Moved indoors',
  delayed_outdoors: 'Delayed outdoor practice',
  stopped_outdoors: 'Stopped outdoor practice',
} as const;

export type PracticeDecisionKind = keyof typeof PRACTICE_DECISION_LABELS;

export function isPracticeDecisionKind(value: unknown): value is PracticeDecisionKind {
  return typeof value === 'string' && Object.hasOwn(PRACTICE_DECISION_LABELS, value);
}

export function practiceDecisionOptions(zone: Zone): PracticeDecisionKind[] {
  return (Object.keys(PRACTICE_DECISION_LABELS) as PracticeDecisionKind[])
    .filter((kind) => zone !== 'black' || kind !== 'adjusted_timing');
}
