import { practiceDaysSince } from '@/lib/acclimatization';
import type { RosterMember } from '@/services/team-roster';
import { useDemoTeam } from '@/state/demo-team';
import { usePastSessions } from '@/state/past-sessions';
import { useCoachData, useNow, useRoster, useTeamVitals, vitalsHistory, type SessionRole } from '@/state/team-session';

// One list of athletes for the trainer and coach screens, whatever the source: the simulated demo
// team in sample mode, or the real roster joined with each athlete's latest band sample.

const STALE_MS = 2 * 60_000;

export type AthleteLive = {
  heartRate: number;
  skinTempF: number | null;
  sweat: number | null;
  /** Recent heart rate, oldest first: the simulator's history, or the samples this phone has seen. */
  history: number[];
  status: 'usual' | 'watch';
  phase: 'work' | 'rest' | null;
  updatedAt: Date | null;
  stale: boolean;
};

export type AthleteView = {
  id: string;
  name: string;
  position: string | null;
  restingHr: number | null;
  acclimatizationDay: number;
  live: AthleteLive | null;
  simulated: boolean;
  joinedAt: Date | null;
};

export function useAthletes(role: SessionRole = 'trainer'): { athletes: AthleteView[]; pending: RosterMember[]; sample: boolean; loading: boolean } {
  const data = useCoachData(role);
  const zone = data?.readings.at(-1)?.zone ?? 'yellow';
  const demo = useDemoTeam(zone);
  // Only staff read the roster and the team's band samples; an athlete's phone asks for neither.
  const staff = role !== 'athlete';
  const roster = useRoster(staff ? data?.teamId ?? null : null);
  const live = useTeamVitals(staff ? data?.session ?? null : null);
  const past = usePastSessions(staff ? data?.teamId ?? null : null, false, 40);
  const now = useNow(15_000);

  if (demo.enabled) {
    return {
      sample: true,
      loading: false,
      pending: [],
      athletes: demo.members.map((m) => ({
        id: m.athlete.id,
        name: m.athlete.name,
        position: m.athlete.position,
        restingHr: m.athlete.restingHr,
        acclimatizationDay: m.athlete.acclimatizationDay,
        simulated: true,
        joinedAt: null,
        live: { heartRate: m.vitals.heartRate, skinTempF: m.vitals.skinTempF, sweat: m.vitals.sweat, history: m.history.slice(-20).map((v) => v.heartRate), status: m.status, phase: m.vitals.phase, updatedAt: new Date(), stale: false },
      })),
    };
  }

  const starts = (past ?? []).map((p) => p.session.startedAt);
  if (data?.session) starts.push(data.session.startedAt);
  const athletes = (roster ?? []).filter((m) => m.status === 'active' && m.role === 'athlete').map((m): AthleteView => {
    const r = live.find((v) => v.athleteUid === m.userId);
    return {
      id: m.userId,
      name: m.displayName ?? 'Athlete',
      position: null,
      restingHr: null,
      acclimatizationDay: practiceDaysSince(m.joinedAt, starts),
      simulated: r?.source === 'simulated',
      joinedAt: m.joinedAt,
      live: r ? {
        heartRate: r.heartRate,
        skinTempF: r.skinTempF,
        sweat: r.sweat,
        history: data?.session ? vitalsHistory(data.session.id, m.userId).slice(-20).map((v) => v.heartRate) : [r.heartRate],
        status: r.recovery === 'watch' ? 'watch' : 'usual',
        phase: null,
        updatedAt: r.updatedAt,
        stale: !r.updatedAt || now - r.updatedAt.getTime() > STALE_MS,
      } : null,
    };
  });
  return { athletes, pending: (roster ?? []).filter((m) => m.status === 'pending'), sample: false, loading: roster === null && Boolean(data?.teamId) };
}

/** Share of an estimated maximum heart rate for a high-school athlete (220 − 16). */
export const HR_MAX = 204;
export const hrPercent = (hr: number) => Math.round((hr / HR_MAX) * 100);
