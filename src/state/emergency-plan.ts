import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { firestore } from '@/services/firebase';
import { dayKey, saveEmergencyPlan, saveIncident, saveReadiness, watchEmergencyPlan, watchIncidents, watchReadiness, type EmergencyPlan, type Incident, type Readiness } from '@/services/team-safety';
import { useAuthSession } from '@/state/auth-session';
import { useStored } from '@/state/stored';
import { useNow } from '@/state/team-session';

export type SafetyRecordState = { status: 'loading' | 'ready' | 'error' | 'unavailable'; saving: boolean; retry: () => void };
type Watch<T> = (update: (value: T) => void, fail: () => void) => (() => void) | undefined;

/** Bind every callback and displayed value to its account/team/day, including the first render after a switch. */
function useSharedRecord<T>(key: string | null, initial: T, watch: Watch<T>) {
  const [record, setRecord] = useState<{ key: string; value: T; error: boolean } | null>(null);
  const [attempt, retry] = useState(0);
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => {
    if (!key) return;
    let current = true;
    const stop = watch(
      value => { if (current) setRecord({ key, value, error: false }); },
      () => { if (current) setRecord({ key, value: initial, error: true }); },
    );
    return () => { current = false; stop?.(); };
    // initial is only the empty error fallback; it must not restart a listener on each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, key, watch]);
  const matching = record?.key === key ? record : null;
  const meta: SafetyRecordState = {
    status: !key ? 'unavailable' : !matching ? 'loading' : matching.error ? 'error' : 'ready',
    saving: Boolean(key && pending === key),
    retry: () => { setRecord(null); retry(value => value + 1); },
  };
  const save = async (write: () => Promise<unknown>, label: string) => {
    if (!key || meta.status !== 'ready' || pending === key) return false;
    setPending(key);
    try { await write(); return true; }
    catch { Alert.alert(`Couldn’t save ${label}`, 'Check your connection and try again.'); return false; }
    finally { setPending(previous => previous === key ? null : previous); }
  };
  return { value: matching && !matching.error ? matching.value : initial, meta, save };
}

/** Local storage is a sample-only fallback; a loading or absent real team never exposes sample safety records. */
export function useEmergencyPlan(teamId: string | null): [EmergencyPlan, (next: EmergencyPlan) => Promise<boolean>, SafetyRecordState] {
  const { user } = useAuthSession();
  const [local, setLocal, loaded] = useStored<EmergencyPlan>('eap', {});
  const key = firestore && user && teamId ? `${user.uid}:${teamId}:eap` : null;
  const watch = useCallback<Watch<EmergencyPlan>>((update, fail) => teamId ? watchEmergencyPlan(teamId, update, fail) : undefined, [teamId]);
  const remote = useSharedRecord(key, {}, watch);
  if (!firestore) return [local, async next => { setLocal(next); return true; }, { status: loaded ? 'ready' : 'loading', saving: false, retry: () => {} }];
  return [remote.value, next => remote.save(() => saveEmergencyPlan(teamId!, next), 'the plan'), remote.meta];
}

/** Latest team responses; loading, failed and empty are distinct states. */
export function useIncidents(teamId: string | null): [Incident[], (incident: Omit<Incident, 'id'>) => Promise<boolean>, SafetyRecordState] {
  const { user } = useAuthSession();
  const [local, setLocal, loaded] = useStored<Incident[]>('incidents', []);
  const key = firestore && user && teamId ? `${user.uid}:${teamId}:incidents` : null;
  const watch = useCallback<Watch<Incident[]>>((update, fail) => teamId ? watchIncidents(teamId, update, fail) : undefined, [teamId]);
  const remote = useSharedRecord<Incident[]>(key, [], watch);
  if (!firestore) return [local, async incident => { setLocal([{ ...incident, id: String(incident.at) }, ...local].slice(0, 30)); return true; }, { status: loaded ? 'ready' : 'loading', saving: false, retry: () => {} }];
  return [remote.value, incident => remote.save(() => saveIncident(teamId!, incident), 'the incident'), remote.meta];
}

/** Day and account are part of the key, so yesterday's readiness cannot appear as today's. */
export function useReadiness(teamId: string | null): [Readiness, (done: Readiness) => Promise<boolean>, SafetyRecordState] {
  const { user } = useAuthSession();
  const now = useNow(60_000);
  const day = dayKey(new Date(now));
  const [local, setLocal, loaded] = useStored<{ date: string; done: Readiness }>('readiness', { date: day, done: {} });
  const key = firestore && user && teamId ? `${user.uid}:${teamId}:readiness:${day}` : null;
  const watch = useCallback<Watch<Readiness>>((update, fail) => teamId ? watchReadiness(teamId, day, update, fail) : undefined, [day, teamId]);
  const remote = useSharedRecord<Readiness>(key, {}, watch);
  if (!firestore) return [local.date === day ? local.done : {}, async done => { setLocal({ date: day, done }); return true; }, { status: loaded ? 'ready' : 'loading', saving: false, retry: () => {} }];
  return [remote.value, done => remote.save(() => saveReadiness(teamId!, day, done), 'the check'), remote.meta];
}
