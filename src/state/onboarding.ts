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
