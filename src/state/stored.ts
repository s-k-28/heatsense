import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

// A value kept on this phone across launches: the trainer's emergency plan, today's readiness
// checks, the incident log, the profile photo. Not shared with the team.
// ponytail: device-only; move to the team's Firestore doc if staff need to share them.

export function useStored<T>(key: string, initial: T): [T, (next: T) => void, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(`heatsense.${key}`)
      .then((raw) => { if (live && raw) setValue(JSON.parse(raw) as T); })
      .catch(() => {})
      .finally(() => { if (live) setLoaded(true); });
    return () => { live = false; };
  }, [key]);
  const save = useCallback((next: T) => {
    setValue(next);
    AsyncStorage.setItem(`heatsense.${key}`, JSON.stringify(next)).catch(() => {});
  }, [key]);
  return [value, save, loaded];
}
