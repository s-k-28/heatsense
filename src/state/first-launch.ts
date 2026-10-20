import AsyncStorage from '@react-native-async-storage/async-storage';

// Remembers, on this device, that the welcome intro animation has already played, so it only runs
// the first time someone opens the app. Reinstalling the app clears it, which counts as a first launch.
const STORAGE_KEY = 'heatsense.introSeen.v1';

let seen: boolean | null = null;
let loading: Promise<boolean> | null = null;

/** Reads the saved flag once. If storage can't be read, the intro is treated as seen rather than replayed every launch. */
export function loadIntroSeen(): Promise<boolean> {
  if (seen !== null) return Promise.resolve(seen);
  loading ??= AsyncStorage.getItem(STORAGE_KEY)
    .then((value) => value === 'true')
    .catch(() => true)
    .then((value) => {
      seen = value;
      return value;
    });
  return loading;
}

/** The value if it has already been read, otherwise null. */
export function introSeenNow(): boolean | null {
  return seen;
}

/** Records that the intro has started playing, so later launches (and later visits this session) skip it. */
export function markIntroSeen() {
  seen = true;
  AsyncStorage.setItem(STORAGE_KEY, 'true').catch(() => {});
}

/** For testing: makes the next launch count as a first launch again. */
export function resetIntroSeen() {
  seen = false;
  loading = null;
  AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}
