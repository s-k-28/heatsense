// Checks a practice plan's timings against a zone's UIL rules (pass UIL_GUIDANCE[zone]) and proposes
// timings that meet them. Free of app imports so `node scripts/check-plan-check.ts` can test it.
import type { UilGuidance } from './uil-wbgt';

export type PlanTimings = { workMinutes: number; restMinutes: number; lengthMinutes: number };
export type PlanCheckRow = { label: string; plan: string; rule: string; ok: boolean };

export function checkPlan(plan: PlanTimings, g: UilGuidance): { ok: boolean; rows: PlanCheckRow[]; fix: Partial<PlanTimings> | null } {
  const perHour = 60 / (plan.workMinutes + plan.restMinutes);
  const rows: PlanCheckRow[] = [];
  if (!g.outdoorAllowed) rows.push({ label: 'Outdoor practice', plan: 'Planned', rule: 'Not allowed', ok: false });
  if (g.breaksPerHour) rows.push({ label: 'Breaks per hour', plan: String(Math.round(perHour * 10) / 10), rule: `${g.breaksPerHour}+`, ok: perHour >= g.breaksPerHour });
  if (g.breakMinutes) rows.push({ label: 'Break length', plan: `${plan.restMinutes} min`, rule: `${g.breakMinutes}+ min`, ok: plan.restMinutes >= g.breakMinutes });
  if (g.restMinutesPerHour) rows.push({ label: 'Rest per hour', plan: `${Math.round(plan.restMinutes * perHour)} min`, rule: `${g.restMinutesPerHour}+ min`, ok: plan.restMinutes * perHour >= g.restMinutesPerHour });
  if (g.maxPracticeMinutes) rows.push({ label: 'Practice length', plan: `${plan.lengthMinutes} min`, rule: `${g.maxPracticeMinutes} min max`, ok: plan.lengthMinutes <= g.maxPracticeMinutes });
  const ok = rows.every((r) => r.ok);
  if (ok || !g.outdoorAllowed) return { ok, rows, fix: null };
  // A break count and length: space them evenly through the hour.
  const even = g.breaksPerHour && g.breakMinutes ? { workMinutes: Math.floor((60 - g.breaksPerHour * g.breakMinutes) / g.breaksPerHour), restMinutes: g.breakMinutes } : null;
  return {
    ok,
    rows,
    fix: {
      ...(even ?? {}),
      // Red gives total rest, spread through the hour: two breaks of half that each.
      ...(g.restMinutesPerHour ? { workMinutes: 30 - g.restMinutesPerHour / 2, restMinutes: g.restMinutesPerHour / 2 } : {}),
      ...(g.maxPracticeMinutes && plan.lengthMinutes > g.maxPracticeMinutes ? { lengthMinutes: g.maxPracticeMinutes } : {}),
    },
  };
}
