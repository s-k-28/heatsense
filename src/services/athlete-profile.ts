import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { firestore } from '@/services/firebase';

// The athlete's own profile: athletes/{uid}. The athlete writes it directly; the
// Firestore rules check every field (see firestore.rules). Health answers and
// emergency contacts will live in separate documents under athletes/{uid}/private,
// so saving this page never touches them.
//
// Birth date: the screen asks for it, but only the age band derived from it is
// stored. Nothing in HeatSense needs the exact date yet, and the band is enough to
// apply age-based consent rules once those are decided.

export const GRADES = ['6th', '7th', '8th', '9th', '10th', '11th', '12th', 'College', 'Other'] as const;
export type Grade = (typeof GRADES)[number];
export type AgeBand = 'under13' | '13to17' | '18plus';
/** The next onboarding page the athlete still has to finish. */
export type OnboardingStep = 'profile' | 'body' | 'safety' | 'done';
const STEP_ORDER: OnboardingStep[] = ['profile', 'body', 'safety', 'done'];

export type AthleteBasics = {
  fullName: string;
  ageBand: AgeBand;
  grade: Grade;
  sport: string;
  sportSource: 'team' | 'self';
  jersey: string | null;
  teamId: string | null;
};

export type AthleteProfile = AthleteBasics & { onboarding: { step: OnboardingStep } };

export function ageBandFor(birth: Date, today = new Date()): AgeBand {
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
  return age < 13 ? 'under13' : age < 18 ? '13to17' : '18plus';
}

export async function getAthleteProfile(uid: string): Promise<AthleteProfile | null> {
  if (!firestore) throw new Error('HeatSense isn’t connected to its server. Add the Firebase settings to .env.');
  const snapshot = await getDoc(doc(firestore, 'athletes', uid));
  return snapshot.exists() ? (snapshot.data() as AthleteProfile) : null;
}

const SAVE_TIMEOUT_MS = 15_000;

/**
 * Saves page 1 and marks it finished. `existing` is the profile loaded when the page
 * opened (null for a first save), so the onboarding step only ever moves forward:
 * an athlete who comes back to edit page 1 isn't sent back through later pages.
 */
export async function saveAthleteBasics(uid: string, basics: AthleteBasics, existing: AthleteProfile | null): Promise<void> {
  if (!firestore) throw new Error('HeatSense isn’t connected to its server. Add the Firebase settings to .env.');
  const current = existing?.onboarding?.step ?? 'profile';
  const step = STEP_ORDER.indexOf(current) > STEP_ORDER.indexOf('body') ? current : 'body';
  const write = setDoc(doc(firestore, 'athletes', uid), {
    ...basics,
    onboarding: { step, profileCompletedAt: serverTimestamp() },
    ...(existing ? {} : { createdAt: serverTimestamp() }),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  // Without a connection the write would wait silently; give up and let the athlete retry.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), SAVE_TIMEOUT_MS); });
  try {
    await Promise.race([write, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
