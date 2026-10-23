import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { firestore } from '@/services/firebase';
import { saveEmergencyPlan, watchEmergencyPlan, type EmergencyPlan } from '@/services/team-safety';
import { useStored } from '@/state/stored';

/**
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
