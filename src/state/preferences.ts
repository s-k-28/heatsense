import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { firestore } from '@/services/firebase';

// Dashboard preferences. The two switches persist on the device; the unread count is session-only
// until notifications come from a server.
type Preferences = { demoTeam: boolean; compactRoster: boolean; celsius: boolean; bandConnected: boolean; practiceLiveActivity: boolean; unreadNotifications: number; refreshedAt: number | null; incidentAcknowledged: boolean; practiceStartedAt: number | null };

const STORAGE_KEY = 'heatsense.preferences.v1';
// The simulated demo team starts on in builds without Firebase (reviews, the simulator) and off otherwise.
let state: Preferences = { demoTeam: firestore === null, compactRoster: false, celsius: false, bandConnected: false, practiceLiveActivity: true, unreadNotifications: 0, refreshedAt: null, incidentAcknowledged: false, practiceStartedAt: null };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

AsyncStorage.getItem(STORAGE_KEY)
  .then((raw) => {
    if (!raw) return;
    const saved = JSON.parse(raw) as Partial<Preferences>;
    state = { ...state, demoTeam: saved.demoTeam ?? state.demoTeam, compactRoster: Boolean(saved.compactRoster), celsius: Boolean(saved.celsius), bandConnected: saved.bandConnected ?? false, practiceLiveActivity: saved.practiceLiveActivity ?? true };
    emit();
  })
  .catch(() => {});

export function setPreference(key: 'demoTeam' | 'compactRoster' | 'celsius' | 'bandConnected' | 'practiceLiveActivity', value: boolean) {
  state = { ...state, [key]: value };
  emit();
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ demoTeam: state.demoTeam, compactRoster: state.compactRoster, celsius: state.celsius, bandConnected: state.bandConnected, practiceLiveActivity: state.practiceLiveActivity })).catch(() => {});
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
  return useSyncExternalStore(subscribe, () => state, () => state);
}

/** Temperatures are stored in °F; this formats them in whichever unit the user picked. */
export function useTemperature() {
  const { celsius } = usePreferences();
  return {
    unit: celsius ? '°C' : '°F',
    /** An absolute reading, rounded to a whole degree. */
    value: (fahrenheit: number) => Math.round(celsius ? ((fahrenheit - 32) * 5) / 9 : fahrenheit),
    /** A change in temperature, with a sign and one decimal. */
    delta: (fahrenheit: number) => {
      const converted = celsius ? (fahrenheit * 5) / 9 : fahrenheit;
      return `${converted < 0 ? '−' : '+'}${Math.abs(converted).toFixed(1)}${celsius ? '°C' : '°F'}`;
    },
  };
}
