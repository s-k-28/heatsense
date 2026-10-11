import { CoachColors as C } from '@/constants/coach-theme';
export { recheckState } from './recheck-clock';

// These are existing prototype fixtures, not a WBGT classification engine.
// A live integration must supply the school/class-specific tier and plan.
export const tiers = [
  { name: 'Green', color: C.green },
  { name: 'Yellow', color: C.yellow },
  { name: 'Orange', color: C.orange },
  { name: 'Red', color: C.red },
  { name: 'Black', color: C.black },
] as const;
export type TierName = (typeof tiers)[number]['name'];
export const sampleReading = { value: 84, tier: 'Orange' as TierName, location: 'Memorial Stadium' };

export const coachProfile = { firstName: 'Saatvik' };
// Sample Orange-zone adjustments shown on Home; the Plan tab lists the same rules.
export const practice = { workRest: '20 / 10', hydration: 'Every 10 min', equipment: 'Remove at breaks' };

export const coachRoster = [
  { name: 'Maya Chen', detail: 'Recovery stalled · 6 min', status: 'Review', color: C.orange },
  { name: 'Jordan Lee', detail: 'Hydration break acknowledged', status: 'Caution', color: C.yellow },
  { name: 'Avery Davis', detail: 'Signals within baseline', status: 'Normal', color: C.green },
  { name: 'Sofia Patel', detail: 'Break completed · 2 min ago', status: 'Normal', color: C.green },
  { name: 'Noah Williams', detail: 'No wristband · field plan only', status: 'Normal', color: C.green },
  { name: 'Eli Brooks', detail: 'Signals within baseline', status: 'Normal', color: C.green },
] as const;
export type CoachAthlete = (typeof coachRoster)[number];

export function arcPath(start: number, end: number) {
  const point = (angle: number) => ({ x: 160 + 144 * Math.cos(angle), y: 159 + 144 * Math.sin(angle) });
  const a = point(Math.PI + start * Math.PI);
  const b = point(Math.PI + end * Math.PI);
  return `M ${a.x} ${a.y} A 144 144 0 0 1 ${b.x} ${b.y}`;
}
