import { practiceDaysSince } from '@/lib/acclimatization';
import type { RosterMember } from '@/services/team-roster';
import { useDemoTeam } from '@/state/demo-team';
import { usePastSessionsState } from '@/state/past-sessions';
import { useCoachDataState, useNow, useRosterState, useTeamVitalsState, vitalsHistory, type LiveStatus, type SessionRole } from '@/state/team-session';

// One list of athletes for the trainer and coach screens, whatever the source: the simulated demo
// team in sample mode, or the real roster joined with each athlete's latest band sample.

const STALE_MS = 2 * 60_000;

export type AthleteLive = {
  heartRate: number;
  skinTempF: number | null;
  sweat: number | null;
  /** Recent heart rate, oldest first: the simulator's history, or the samples this phone has seen. */
  history: number[];
  status: 'usual' | 'watch' | 'unknown';
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
  /** Available practice history and a known join date; not verified attendance/completion. */
  practiceDaysKnown: boolean;
  live: AthleteLive | null;
  simulated: boolean;
  joinedAt: Date | null;
};

export function useAthletes(role: SessionRole = 'trainer'): { athletes: AthleteView[]; pending: RosterMember[]; sample: boolean; loading: boolean; status: LiveStatus; vitalsStatus: LiveStatus; historyStatus: LiveStatus; retry: () => void } {
  const team = useCoachDataState(role);
  const data = team.data;
  const zone = data?.readings.at(-1)?.zone ?? 'yellow';
  const demo = useDemoTeam(zone);
  // Only staff read the roster and the team's band samples; an athlete's phone asks for neither.
  const staff = role !== 'athlete';
  const rosterState = useRosterState(staff ? data?.teamId ?? null : null);
  const roster = rosterState.data;
  const liveState = useTeamVitalsState(staff ? data?.session ?? null : null);
  const live = liveState.data ?? [];
  const historyState = usePastSessionsState(staff ? data?.teamId ?? null : null, false, 40);
  const past = historyState.data;
  const retry = () => {
    if (team.status === 'error') team.retry();
    if (rosterState.status === 'error') rosterState.retry();
    if (liveState.status === 'error') liveState.retry();
    if (historyState.status === 'error') historyState.retry();
  };
  const now = useNow(15_000);

  if (demo.enabled) {
    return {
      sample: true,
      loading: false,
      status: 'ready',
      vitalsStatus: 'ready',
      historyStatus: 'ready',
      retry,
      pending: [],
      athletes: demo.members.map((m) => ({
        id: m.athlete.id,
        name: m.athlete.name,
        position: m.athlete.position,
        restingHr: m.athlete.restingHr,
        acclimatizationDay: m.athlete.acclimatizationDay,
        practiceDaysKnown: true,
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
      practiceDaysKnown: historyState.status === 'ready' && m.joinedAt !== null,
      simulated: r?.source === 'simulated',
      joinedAt: m.joinedAt,
      live: r ? {
        heartRate: r.heartRate,
        skinTempF: r.skinTempF,
        sweat: r.sweat,
        history: data?.session ? vitalsHistory(data.session.id, m.userId, data.session.teamId).slice(-20).map((v) => v.heartRate) : [r.heartRate],
        status: r.recovery === 'usual' || r.recovery === 'watch' ? r.recovery : 'unknown',
        phase: null,
        updatedAt: r.updatedAt,
        stale: !r.updatedAt || now - r.updatedAt.getTime() > STALE_MS,
      } : null,
    };
  });
  const status: LiveStatus = team.status === 'error' || rosterState.status === 'error' ? 'error'
    : team.status === 'loading' || rosterState.status === 'loading' ? 'loading'
      : data?.teamId && staff ? 'ready' : 'idle';
  return { athletes, pending: (roster ?? []).filter((m) => m.status === 'pending'), sample: false, loading: status === 'loading', status, vitalsStatus: liveState.status, historyStatus: historyState.status, retry };
}

/** Share of an estimated maximum heart rate for a high-school athlete (220 − 16). */
export const HR_MAX = 204;
export const hrPercent = (hr: number) => Math.round((hr / HR_MAX) * 100);
