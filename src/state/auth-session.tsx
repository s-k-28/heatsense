import { createContext, useContext } from 'react';
import type { User } from 'firebase/auth';

export type AuthSession = { user: User | null; ready: boolean };

export const AuthSessionContext = createContext<AuthSession>({ user: null, ready: false });

export function useAuthSession() {
  return useContext(AuthSessionContext);
}
