import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { AsYouType, parsePhoneNumberFromString } from 'libphonenumber-js';

import { firestore } from '@/services/firebase';

// Athlete onboarding page 3 ("Safety comes first."): emergency contacts and notes.
//
// Stored apart from the profile, at athletes/{uid}/private/safety, which only the
// athlete can read or write (firestore.rules). No coach or safety-staff role can
// read it yet: that access has to be designed and enforced on the server first.
// HeatSense never calls, texts or alerts these contacts.
//
// STORAGE IS OFF IN PRODUCTION until it's approved, for the same reasons as the
// health answers (no parent/guardian consent flow or privacy notice yet). Answers
// stay in memory for this session; against the local emulators they're stored so
// the rules can be tested. Flip SAFETY_STORAGE_APPROVED once that's in place.
export const SAFETY_STORAGE_APPROVED = false;
export const canStoreSafety = SAFETY_STORAGE_APPROVED || process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS === '1';

export const RELATIONSHIPS = [
  { code: 'parent', label: 'Parent' },
  { code: 'guardian', label: 'Guardian' },
  { code: 'family', label: 'Family member' },
  { code: 'other', label: 'Other' },
] as const;
export const relationshipLabel = (code: string | null) => RELATIONSHIPS.find((item) => item.code === code)?.label ?? null;
export const relationshipCode = (label: string) => RELATIONSHIPS.find((item) => item.label === label)?.code ?? null;

export const SAFETY_NOTES_MAX = 500;
export const CONTACT_NAME_MAX = 80;

/** Phone numbers are stored in E.164 ("+12145550182"). */
export type EmergencyContact = { name: string; relationship: string; phoneNumber: string };
export type AthleteSafety = { primaryContact: EmergencyContact | null; secondaryContact: EmergencyContact | null; safetyNotes: string | null };

// US numbers can be typed as-is; anything else starts with + and its country code.
const DEFAULT_COUNTRY = 'US';

/** Formats a phone number as it's typed: "(214) 555-0182", or international ("+44 20 7946 0958"). */
export function formatPhoneInput(text: string) {
  const cleaned = text.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '').slice(0, 17);
  return cleaned ? new AsYouType(DEFAULT_COUNTRY).input(cleaned) : '';
}

/** E.164 form of a valid number, or null. */
export function normalizePhone(text: string): string | null {
  const parsed = parsePhoneNumberFromString(text, DEFAULT_COUNTRY);
  return parsed?.isValid() ? parsed.number : null;
}

/** How a stored number is shown again. */
export function displayPhone(e164: string) {
  const parsed = parsePhoneNumberFromString(e164);
  if (!parsed) return e164;
  return parsed.country === DEFAULT_COUNTRY ? parsed.formatNational() : parsed.formatInternational();
}

export async function getAthleteSafety(uid: string): Promise<AthleteSafety | null> {
  if (!canStoreSafety || !firestore) return null;
  const snapshot = await getDoc(doc(firestore, 'athletes', uid, 'private', 'safety'));
  return snapshot.exists() ? (snapshot.data() as AthleteSafety) : null;
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

/** Replaces the athlete's emergency information. Only called when storage is allowed. */
export async function saveAthleteSafety(uid: string, safety: AthleteSafety): Promise<void> {
  if (!canStoreSafety) throw new Error('Emergency information can’t be stored yet.');
  if (!firestore) throw new Error('HeatSense isn’t connected to its server. Add the Firebase settings to .env.');
  await withTimeout(setDoc(doc(firestore, 'athletes', uid, 'private', 'safety'), { ...safety, updatedAt: serverTimestamp() }));
}

/** Finishes onboarding on the athlete profile, recording whether this optional step was skipped. */
export async function completeOnboarding(uid: string, skippedSafety: boolean): Promise<void> {
  if (!firestore) throw new Error('HeatSense isn’t connected to its server. Add the Firebase settings to .env.');
  await withTimeout(updateDoc(doc(firestore, 'athletes', uid), {
    'onboarding.step': 'done',
    'onboarding.safetySkipped': skippedSafety,
    'onboarding.completedAt': serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
}
