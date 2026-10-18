import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

// Dashboard preferences. The two switches persist on the device; the unread count is session-only
// until notifications come from a server.
type Preferences = { compactRoster: boolean; celsius: boolean; bandConnected: boolean; practiceLiveActivity: boolean; unreadNotifications: number; refreshedAt: number | null };

const STORAGE_KEY = 'heatsense.preferences.v1';
let state: Preferences = { compactRoster: false, celsius: false, bandConnected: true, practiceLiveActivity: true, unreadNotifications: 3, refreshedAt: null };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

AsyncStorage.getItem(STORAGE_KEY)
  .then((raw) => {
    if (!raw) return;
    const saved = JSON.parse(raw) as Partial<Preferences>;
    state = { ...state, compactRoster: Boolean(saved.compactRoster), celsius: Boolean(saved.celsius), bandConnected: saved.bandConnected ?? true, practiceLiveActivity: saved.practiceLiveActivity ?? true };
    emit();
  })
  .catch(() => {});

export function setPreference(key: 'compactRoster' | 'celsius' | 'bandConnected' | 'practiceLiveActivity', value: boolean) {
  state = { ...state, [key]: value };
  emit();
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ compactRoster: state.compactRoster, celsius: state.celsius, bandConnected: state.bandConnected, practiceLiveActivity: state.practiceLiveActivity })).catch(() => {});
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
