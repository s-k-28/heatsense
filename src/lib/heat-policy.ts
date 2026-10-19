import { SAMPLE_PLAN, ZONES, type Zone } from '@/lib/practice';

// Heat policies: the rules that turn a WBGT reading into practice changes. HeatSense never invents
// these. A school configures its governing plan (for Texas schools, the school's UIL heat plan), and
// every adjustment, interval, and timeline on the Plan tab is traced back to it.
//
// No policy is configured in this build, so the Plan tab shows what's missing instead of guessing.
// SAMPLE_POLICY exists only for design review (`?sample=1`). It holds nothing but the app's existing,
// unreviewed sample values, has no thresholds, and is labeled as a sample everywhere it appears.

export const ZONE_ORDER: Zone[] = ['green', 'yellow', 'orange', 'red', 'black'];

/** What a policy says for one zone. Every field is optional: show only what the policy states. */
export type ZoneGuidance = {
  /** One short instruction for the coach. */
  summary: string;
  workMinutes?: number;
  restMinutes?: number;
  /** Interval between water breaks, in minutes. Never a volume. */
  hydrationEveryMinutes?: number;
  equipment?: string;
  maxPracticeMinutes?: number;
};

export type HeatPolicy = {
  id: string;
  name: string;
  /** Who publishes it, or where the values came from. */
  source: string;
  version: string | null;
  effectiveDate: string | null;
  /** True for the built-in demo policy. Screens must say "sample" wherever its values show. */
  sample: boolean;
  zones: { zone: Zone; range: string | null; guidance: ZoneGuidance | null }[];
};

/** The school's governing heat policy. Null until a school configures one. */
export const CONFIGURED_POLICY: HeatPolicy | null = null;

export const SAMPLE_POLICY: HeatPolicy = {
  id: 'heatsense-sample',
  name: 'Sample policy',
  source: 'HeatSense demo values. Not reviewed, not from any governing body, and not for real practices.',
  version: null,
  effectiveDate: null,
  sample: true,
  zones: ZONE_ORDER.map((zone) => ({
    zone,
    range: null,
    guidance:
      zone === SAMPLE_PLAN.zone
        ? {
            summary: 'Modify work and rest intervals before athletes take the field.',
            workMinutes: SAMPLE_PLAN.workMinutes,
            restMinutes: SAMPLE_PLAN.restMinutes,
            hydrationEveryMinutes: SAMPLE_PLAN.waterEveryMinutes,
            equipment: SAMPLE_PLAN.equipment,
          }
        : null,
  })),
};

export function zoneEntry(policy: HeatPolicy | null, zone: Zone) {
  return policy?.zones.find((entry) => entry.zone === zone) ?? null;
}

export const zoneName = (zone: Zone) => ZONES[zone].label.replace(' zone', '');

/* ─────────────────────────────── Timeline ─────────────────────────────── */

export type Block = { kind: 'work' | 'rest'; startMinute: number; endMinute: number };

/** What a timeline needs, and which of those pieces are missing. */
export type TimelineResult =
  | { status: 'ready'; blocks: Block[]; hydrationMarks: number[] }
  | { status: 'missing'; missing: ('reading' | 'policy' | 'intervals' | 'schedule')[] };

/**
 * Lays out a practice as alternating work and rest, using only the intervals the policy states.
 * Minutes are counted from the practice start. A final work block is cut short at the end of practice;
 * practice never ends on a rest block that runs past it.
 */
export function buildTimeline(input: { hasReading: boolean; policy: HeatPolicy | null; guidance: ZoneGuidance | null; durationMinutes: number | null }): TimelineResult {
  const missing: ('reading' | 'policy' | 'intervals' | 'schedule')[] = [];
  if (!input.hasReading) missing.push('reading');
  if (!input.policy) missing.push('policy');
  else if (input.hasReading && !(input.guidance?.workMinutes && input.guidance.restMinutes)) missing.push('intervals');
  if (!input.durationMinutes) missing.push('schedule');
  if (missing.length > 0 || !input.guidance?.workMinutes || !input.guidance.restMinutes || !input.durationMinutes) {
    return { status: 'missing', missing };
  }

  const { workMinutes: work, restMinutes: rest } = input.guidance;
  const total = Math.min(input.durationMinutes, input.guidance.maxPracticeMinutes ?? Infinity);
  const blocks: Block[] = [];
  let at = 0;
  while (at < total) {
    const workEnd = Math.min(at + work, total);
    blocks.push({ kind: 'work', startMinute: at, endMinute: workEnd });
    at = workEnd;
    if (at >= total) break;
    const restEnd = Math.min(at + rest, total);
    blocks.push({ kind: 'rest', startMinute: at, endMinute: restEnd });
    at = restEnd;
  }

  // Water breaks inside work blocks, at the policy's interval, counted from the start of each block.
  const every = input.guidance.hydrationEveryMinutes;
  const hydrationMarks: number[] = [];
  if (every) {
    for (const block of blocks) {
      if (block.kind !== 'work') continue;
      for (let minute = block.startMinute + every; minute < block.endMinute; minute += every) hydrationMarks.push(minute);
    }
  }
  return { status: 'ready', blocks, hydrationMarks };
}
