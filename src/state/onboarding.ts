import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

// The selected role is a preference for which experience to show, NOT verified
// authorization. Coach access must be confirmed later through
// organization/team setup.
export type OnboardingRole = 'coach' | 'athlete';

export type TeamChoice = 'create' | 'join';

let state: { role: OnboardingRole | null; teamChoice: TeamChoice | null } = { role: null, teamChoice: null };
const listeners = new Set<() => void>();
let currentUserId: string | null = null;
let hydrationVersion = 0;

function notify() {
  listeners.forEach((listener) => listener());
}

function roleKey(userId: string) {
  return `heatsense:onboarding-role:${userId}`;
}

export async function hydrateOnboardingRole(userId: string | null) {
  const version = ++hydrationVersion;
  currentUserId = userId;
  state = { role: null, teamChoice: null };
  teamDraft = { school: '', teamName: '', sport: null, level: null };
  teamId = null;
  athleteTeam = { status: 'unassigned', teamId: null };
  notify();
  if (!userId) return;

  try {
    const saved = await AsyncStorage.getItem(roleKey(userId));
    if (version !== hydrationVersion) return;
    if (saved === 'coach' || saved === 'athlete') {
      state = { ...state, role: saved };
      notify();
    }
  } catch (error) {
    console.warn('Could not restore the selected HeatSense role.', error);
  }
}

export function setOnboardingRole(role: OnboardingRole | null) {
  state = { ...state, role };
  notify();
  if (currentUserId) {
    const key = roleKey(currentUserId);
    void (role ? AsyncStorage.setItem(key, role) : AsyncStorage.removeItem(key)).catch((error) => {
      console.warn('Could not save the selected HeatSense role.', error);
    });
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useOnboardingRole() {
  return useSyncExternalStore(subscribe, () => state.role, () => state.role);
}

// Coach team setup: create a new team or join an existing one.
export function setTeamChoice(teamChoice: TeamChoice | null) {
  state = { ...state, teamChoice };
  notify();
}

export function useTeamChoice() {
  return useSyncExternalStore(subscribe, () => state.teamChoice, () => state.teamChoice);
}

// Create-a-team details. This is a local draft only: no team exists on a server
// until a backend accepts it. Dropdowns stay null until the coach picks a value.
export type TeamDraft = { school: string; teamName: string; sport: string | null; level: string | null };

let teamDraft: TeamDraft = { school: '', teamName: '', sport: null, level: null };

export function setTeamDraft(update: Partial<TeamDraft>) {
  teamDraft = { ...teamDraft, ...update };
  notify();
}

export function useTeamDraft() {
  return useSyncExternalStore(subscribe, () => teamDraft, () => teamDraft);
}

// The id of the team created from the draft, so returning to the Invite screen
// reuses the same team (and its active code) instead of creating another.
let teamId: string | null = null;

export function setTeamId(id: string) {
  teamId = id;
  notify();
}

export function getTeamId() {
  return teamId;
}

export function getCurrentUserId() {
  return currentUserId;
}

// Athlete team membership as this device knows it. 'pending' means a join
// request is waiting for the coach; it is never treated as team access.
export type AthleteTeam = { status: 'unassigned' | 'pending'; teamId: string | null };

let athleteTeam: AthleteTeam = { status: 'unassigned', teamId: null };

export function setAthleteTeam(next: AthleteTeam) {
  athleteTeam = next;
  notify();
}

export function useAthleteTeam() {
  return useSyncExternalStore(subscribe, () => athleteTeam, () => athleteTeam);
}
