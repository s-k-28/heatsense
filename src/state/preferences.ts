import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { firebaseAuth, firestore } from '@/services/firebase';
import { useAuthSession } from '@/state/auth-session';

// Dashboard preferences: switches, notification choices, the profile photo and name persist on the
// device; the unread count is session-only until notifications come from a server.
type Preferences = { demoTeam: boolean; compactRoster: boolean; celsius: boolean; bandConnected: boolean; practiceLiveActivity: boolean; alertRecheck: boolean; alertZone: boolean; alertBand: boolean; photoUri: string | null; profileName: string | null; unreadNotifications: number; refreshedAt: number | null; incidentAcknowledged: boolean; practiceStartedAt: number | null };

const STORAGE_KEY = 'heatsense.preferences.v1';
const PROFILE_STORAGE_KEY = 'heatsense.profiles.v1';
type ProfileIdentity = { photoUri: string | null; profileName: string | null };
const profiles = new Map<string, ProfileIdentity>();
const editedProfiles = new Map<string, Set<keyof ProfileIdentity>>();
// Old identity fields have no reliable account owner. Retain them in the legacy payload, but
// never display or assign them to whichever person happens to sign in next.
let unassignedLegacyProfile: ProfileIdentity = { photoUri: null, profileName: null };
const profileSnapshots = new Map<string, { preferences: Preferences; identity: ProfileIdentity; value: Preferences }>();
const activeProfileOwner = () => firebaseAuth?.currentUser?.uid ?? (firebaseAuth ? null : 'local-demo');
// The simulated demo team starts on in builds without Firebase (reviews, the simulator) and off otherwise.
let state: Preferences = { demoTeam: firestore === null, compactRoster: false, celsius: false, bandConnected: false, practiceLiveActivity: true, alertRecheck: true, alertZone: true, alertBand: true, photoUri: null, profileName: null, unreadNotifications: 0, refreshedAt: null, incidentAcknowledged: false, practiceStartedAt: null };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

AsyncStorage.getItem(STORAGE_KEY)
  .then((raw) => {
    if (!raw) return;
    const saved = JSON.parse(raw) as Partial<Preferences>;
    unassignedLegacyProfile = { photoUri: typeof saved.photoUri === 'string' ? saved.photoUri : null, profileName: typeof saved.profileName === 'string' ? saved.profileName : null };
    state = { ...state, demoTeam: saved.demoTeam ?? state.demoTeam, compactRoster: Boolean(saved.compactRoster), celsius: Boolean(saved.celsius), bandConnected: saved.bandConnected ?? false, practiceLiveActivity: saved.practiceLiveActivity ?? true, alertRecheck: saved.alertRecheck ?? true, alertZone: saved.alertZone ?? true, alertBand: saved.alertBand ?? true, photoUri: null, profileName: null };
    emit();
  })
  .catch(() => {});

// Identity hydration merges around edits made while storage is loading. Queued writes wait for
// this read, preserving other accounts instead of overwriting them with a partial early map.
const profilesReady = AsyncStorage.getItem(PROFILE_STORAGE_KEY).then((raw) => {
  if (!raw) return;
  const saved = JSON.parse(raw) as unknown;
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return;
  for (const [owner, value] of Object.entries(saved)) {
    if (!value || typeof value !== 'object') continue;
    const entry = value as Partial<ProfileIdentity>;
    const edited = editedProfiles.get(owner);
    const previous = profiles.get(owner);
    profiles.set(owner, {
      photoUri: edited?.has('photoUri') ? previous?.photoUri ?? null : typeof entry.photoUri === 'string' ? entry.photoUri : null,
      profileName: edited?.has('profileName') ? previous?.profileName ?? null : typeof entry.profileName === 'string' ? entry.profileName : null,
    });
  }
  emit();
}).catch(() => {});
let profileWrites = Promise.resolve();

function persistProfiles() {
  profileWrites = profileWrites.catch(() => {}).then(async () => {
    await profilesReady;
    await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(Object.fromEntries(profiles)));
  });
  // Keep storage failure from becoming an unhandled promise rejection; in-memory identity remains.
  void profileWrites.catch(() => {});
}

function preferencesFor(owner: string | null): Preferences {
  const identity = owner ? profiles.get(owner) : undefined;
  if (!identity || !owner) return state;
  const cached = profileSnapshots.get(owner);
  if (cached?.preferences === state && cached.identity === identity) return cached.value;
  const value = { ...state, ...identity };
  profileSnapshots.set(owner, { preferences: state, identity, value });
  return value;
}

type Saved = Pick<Preferences, 'demoTeam' | 'compactRoster' | 'celsius' | 'bandConnected' | 'practiceLiveActivity' | 'alertRecheck' | 'alertZone' | 'alertBand' | 'photoUri' | 'profileName'>;

function persist() {
  const { demoTeam, compactRoster, celsius, bandConnected, practiceLiveActivity, alertRecheck, alertZone, alertBand } = state;
  const saved: Saved = { demoTeam, compactRoster, celsius, bandConnected, practiceLiveActivity, alertRecheck, alertZone, alertBand, ...unassignedLegacyProfile };
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(saved)).catch(() => {});
}

export function setPreference(key: 'demoTeam' | 'compactRoster' | 'celsius' | 'bandConnected' | 'practiceLiveActivity' | 'alertRecheck' | 'alertZone' | 'alertBand', value: boolean) {
  state = { ...state, [key]: value };
  emit();
  persist();
}

/** Local name/photo belong to one account; pass the captured owner for an asynchronous picker. */
export function setProfile(change: { photoUri?: string | null; profileName?: string | null }, owner = activeProfileOwner()) {
  if (!owner) return;
  const previous = profiles.get(owner) ?? { photoUri: null, profileName: null };
  profiles.set(owner, {
    photoUri: change.photoUri !== undefined ? change.photoUri : previous.photoUri,
    profileName: change.profileName !== undefined ? change.profileName : previous.profileName,
  });
  const edited = editedProfiles.get(owner) ?? new Set<keyof ProfileIdentity>();
  if (change.photoUri !== undefined) edited.add('photoUri');
  if (change.profileName !== undefined) edited.add('profileName');
  editedProfiles.set(owner, edited);
  emit();
  persistProfiles();
}

/** For code outside React (notifications) that needs the current settings. */
export function getPreferences() {
  return preferencesFor(activeProfileOwner());
}

/** The coach has acknowledged the open incident, so the Dynamic Island goes back to normal. */
export function acknowledgeIncident() {
  state = { ...state, incidentAcknowledged: true };
  emit();
}

/**
 * The coach started practice after checking the field. The clock starts now, and the session begins
 * clean: the sample incident belongs to the practice that was already running.
 */
export function startPractice(startedAt = Date.now()) {
  if (state.practiceStartedAt === startedAt) return;
  state = { ...state, incidentAcknowledged: true, practiceStartedAt: startedAt };
  emit();
}

export function endPractice() {
  state = { ...state, practiceStartedAt: null };
  emit();
}

/** Called when the user pulls to refresh, so readings can say they were just updated. */
export function markRefreshed() {
  state = { ...state, refreshedAt: Date.now() };
  emit();
}

export function markNotificationsRead() {
  if (state.unreadNotifications === 0) return;
  state = { ...state, unreadNotifications: 0 };
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePreferences() {
  const { user, ready } = useAuthSession();
  const owner = ready ? user?.uid ?? (firebaseAuth ? null : 'local-demo') : null;
  return useSyncExternalStore(subscribe, () => preferencesFor(owner), () => preferencesFor(owner));
}

/** Temperatures are stored in °F; this formats them in whichever unit the user picked. */
export function useTemperature() {
  const { celsius } = usePreferences();
  return {
    unit: celsius ? '°C' : '°F',
    /** An absolute reading, rounded to a whole degree. */
    value: (fahrenheit: number) => Math.round(celsius ? ((fahrenheit - 32) * 5) / 9 : fahrenheit),
    /** Unrounded conversion for signal charts and skin-temperature readings. */
    precise: (fahrenheit: number) => celsius ? ((fahrenheit - 32) * 5) / 9 : fahrenheit,
    /** A change in temperature, with a sign and one decimal. */
    delta: (fahrenheit: number) => {
      const converted = celsius ? (fahrenheit * 5) / 9 : fahrenheit;
      return `${converted < 0 ? '−' : '+'}${Math.abs(converted).toFixed(1)}${celsius ? '°C' : '°F'}`;
    },
  };
}
