import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

import { firestore } from '@/services/firebase';

// Athlete onboarding page 2 ("Know your body."): optional heat-related health answers.
//
// Stored apart from the profile, at athletes/{uid}/private/health, which only the
// athlete can read or write (firestore.rules). Nothing here is shared with coaches.
//
// STORAGE IS OFF IN PRODUCTION until it's approved. HeatSense doesn't yet have a
// parent/guardian consent flow or a published privacy notice, and athletes may be
// minors, so answers stay in memory for this session only. Against the local
// emulators the storage and its rules run normally so they can be tested. Flip
// HEALTH_STORAGE_APPROVED once consent and the privacy notice are in place.
export const HEALTH_STORAGE_APPROVED = false;
export const canStoreHealth = HEALTH_STORAGE_APPROVED || process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS === '1';

export const HEAT_ILLNESS = [
  { code: 'yes', label: 'Yes' },
  { code: 'no', label: 'No' },
  { code: 'notSure', label: 'Not sure' },
  { code: 'preferNot', label: 'Prefer not to answer' },
] as const;

export const HEAT_ILLNESS_TYPES = [
  { code: 'heatExhaustion', label: 'Heat exhaustion' },
  { code: 'heatstroke', label: 'Heatstroke' },
  { code: 'otherUnsure', label: 'Other / Unsure' },
  { code: 'preferNot', label: 'Prefer not to answer' },
] as const;

export const HEAT_CONCERNS = [
  { code: 'heatIntolerance', label: 'Difficulty tolerating heat' },
  { code: 'dizzinessFainting', label: 'Frequent dizziness or fainting' },
  { code: 'symptomsDuringExercise', label: 'Previous heat-related symptoms during exercise' },
  { code: 'medicalCondition', label: 'A medical condition that may affect heat tolerance' },
  { code: 'medicationConcern', label: 'Medication-related heat concerns' },
  { code: 'other', label: 'Other concern' },
  { code: 'none', label: 'None' },
  { code: 'preferNot', label: 'Prefer not to answer' },
] as const;
/** Answers that can't be combined with anything else. */
export const EXCLUSIVE_CONCERNS: readonly string[] = ['none', 'preferNot'];

export const ACCLIMATIZATION = [
  { code: 'very', label: 'Very accustomed' },
  { code: 'somewhat', label: 'Somewhat accustomed' },
  { code: 'not', label: 'Not accustomed' },
  { code: 'notSure', label: 'Not sure' },
  { code: 'preferNot', label: 'Prefer not to answer' },
] as const;

export const OTHER_CONCERN_MAX = 120;

/** Stored form: metric units, fixed answer codes, nothing derived from them. */
export type AthleteHealth = {
  heightCm: number | null;
  weightKg: number | null;
  previousHeatIllness: string | null;
  previousHeatIllnessType: string | null;
  heatConcerns: string[];
  otherConcern: string | null;
  heatAcclimatization: string | null;
};

const CM_PER_INCH = 2.54;
const KG_PER_LB = 0.45359237;
const oneDecimal = (value: number) => Math.round(value * 10) / 10;

export const toHeightCm = (feet: number, inches: number) => oneDecimal((feet * 12 + inches) * CM_PER_INCH);
export const toWeightKg = (pounds: number) => oneDecimal(pounds * KG_PER_LB);
export function fromHeightCm(cm: number) {
  const total = Math.round(cm / CM_PER_INCH);
  return { feet: Math.floor(total / 12), inches: total % 12 };
}
export const fromWeightKg = (kg: number) => Math.round(kg / KG_PER_LB);

export async function getAthleteHealth(uid: string): Promise<AthleteHealth | null> {
  if (!canStoreHealth || !firestore) return null;
  const snapshot = await getDoc(doc(firestore, 'athletes', uid, 'private', 'health'));
  return snapshot.exists() ? (snapshot.data() as AthleteHealth) : null;
}

const SAVE_TIMEOUT_MS = 15_000;

async function withTimeout(write: Promise<unknown>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), SAVE_TIMEOUT_MS); });
  try {
    await Promise.race([write, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** Replaces the athlete's health answers. Only called when storage is allowed. */
export async function saveAthleteHealth(uid: string, health: AthleteHealth): Promise<void> {
  if (!canStoreHealth) throw new Error('Health answers can’t be stored yet.');
  if (!firestore) throw new Error('HeatSense isn’t connected to its server. Add the Firebase settings to .env.');
  await withTimeout(setDoc(doc(firestore, 'athletes', uid, 'private', 'health'), { ...health, updatedAt: serverTimestamp() }));
}

/**
 * Marks page 2 done (answered or skipped) on the athlete profile. The step only moves
 * forward, so coming back to edit page 2 doesn't undo later progress. No health data
 * goes into the profile document.
 */
export async function completeBodyStep(uid: string, currentStep: string | undefined): Promise<void> {
  if (!firestore) throw new Error('HeatSense isn’t connected to its server. Add the Firebase settings to .env.');
  const step = currentStep === 'done' ? 'done' : 'safety';
  await withTimeout(updateDoc(doc(firestore, 'athletes', uid), {
    'onboarding.step': step,
    'onboarding.bodyCompletedAt': serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
}
