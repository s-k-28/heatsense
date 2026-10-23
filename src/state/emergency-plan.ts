import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { firestore } from '@/services/firebase';
import { dayKey, saveEmergencyPlan, saveIncident, saveReadiness, watchEmergencyPlan, watchIncidents, watchReadiness, type EmergencyPlan, type Incident, type Readiness } from '@/services/team-safety';
import { useStored } from '@/state/stored';

/**
 * Team safety records with a phone-only fallback for sample mode (no team).
 *
 * The emergency action plan: the team's shared one when there is a team, otherwise (sample mode)
 * one kept on this phone. Returns the plan and a save function.
 */
export function useEmergencyPlan(teamId: string | null): [EmergencyPlan, (next: EmergencyPlan) => void] {
  const [local, setLocal] = useStored<EmergencyPlan>('eap', {});
  const [shared, setShared] = useState<EmergencyPlan>({});
  const team = teamId && firestore ? teamId : null;
  useEffect(() => {
    if (!team) return;
    return watchEmergencyPlan(team, setShared, () => setShared({}));
  }, [team]);
  if (!team) return [local, setLocal];
  return [shared, (next) => {
    setShared(next);
    saveEmergencyPlan(team, next).catch(() => Alert.alert('Couldn’t save the plan', 'Check your connection and try again.'));
  }];
}

const failed = (what: string) => () => Alert.alert(`Couldn’t save the ${what}`, 'Check your connection and try again.');

/** Saved heat-illness responses: the team's when there is one, otherwise this phone's. */
export function useIncidents(teamId: string | null): [Incident[], (incident: Omit<Incident, 'id'>) => void] {
  const [local, setLocal] = useStored<Incident[]>('incidents', []);
  const [shared, setShared] = useState<Incident[]>([]);
  const team = teamId && firestore ? teamId : null;
  useEffect(() => {
    if (!team) return;
    return watchIncidents(team, setShared, () => setShared([]));
  }, [team]);
  if (!team) return [local, (incident) => setLocal([{ ...incident, id: String(incident.at) }, ...local].slice(0, 30))];
  return [shared, (incident) => { saveIncident(team, incident).catch(failed('incident')); }];
}

/** Today's readiness checks: shared by the team's staff, or kept on this phone. */
export function useReadiness(teamId: string | null): [Readiness, (done: Readiness) => void] {
  const [day] = useState(() => dayKey(new Date()));
  const [local, setLocal] = useStored<{ date: string; done: Readiness }>('readiness', { date: day, done: {} });
  const [shared, setShared] = useState<Readiness>({});
  const team = teamId && firestore ? teamId : null;
  useEffect(() => {
    if (!team) return;
    return watchReadiness(team, day, setShared, () => setShared({}));
  }, [day, team]);
  if (!team) return [local.date === day ? local.done : {}, (done) => setLocal({ date: day, done })];
  return [shared, (done) => { setShared(done); saveReadiness(team, day, done).catch(failed('check')); }];
}
