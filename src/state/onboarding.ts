import { useSyncExternalStore } from 'react';

// In-memory onboarding state shared across screens, so a choice survives
// navigating back and forward. It does not survive an app restart.
//
// The selected role is a preference for which experience to show, NOT verified
// authorization. Coach access must be confirmed later through
// organization/team setup.
export type OnboardingRole = 'coach' | 'athlete';

export type TeamChoice = 'create' | 'join';

let state: { role: OnboardingRole | null; teamChoice: TeamChoice | null } = { role: null, teamChoice: null };
const listeners = new Set<() => void>();

export function setOnboardingRole(role: OnboardingRole | null) {
  state = { ...state, role };
  listeners.forEach((listener) => listener());
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
  listeners.forEach((listener) => listener());
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
  listeners.forEach((listener) => listener());
}

export function useTeamDraft() {
  return useSyncExternalStore(subscribe, () => teamDraft, () => teamDraft);
}

// The id of the team created from the draft, so returning to the Invite screen
// reuses the same team (and its active code) instead of creating another.
let teamId: string | null = null;

export function setTeamId(id: string) {
  teamId = id;
  listeners.forEach((listener) => listener());
}

export function getTeamId() {
  return teamId;
}
