import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { ATHLETE_ERROR } from '@/components/athlete-onboarding';
import { ShieldMark } from '@/components/onboarding-art';
import { ChoiceRows, StepField, StepLink, StepScreen, caps } from '@/components/step-kit';
import { Entry } from '@/constants/entry-theme';
import { getAthleteProfile } from '@/services/athlete-profile';
import {
  canStoreSafety,
  completeOnboarding,
  CONTACT_NAME_MAX,
  displayPhone,
  formatPhoneInput,
  getAthleteSafety,
  normalizePhone,
  relationshipCode,
  relationshipLabel,
  RELATIONSHIPS,
  saveAthleteSafety,
  SAFETY_NOTES_MAX,
  type AthleteSafety,
  type EmergencyContact,
} from '@/services/athlete-safety';
import { firebaseAuth } from '@/services/firebase';
import { NETWORK_ERROR } from '@/services/team-invites';
import { getCurrentUserId, getSafetyDraft, setSafetyDraft, type ContactDraft, type SafetyDraft } from '@/state/onboarding';

// Athlete onboarding, page 3 of 3: "Safety comes first." Emergency contacts and notes,
// all optional. Nothing here contacts anyone, and only the athlete can read it (see
// services/athlete-safety.ts for where, and whether, it's stored).
// Next: pair the HeatSense Band (skippable), then notifications, then done.
const NEXT_STEP = '/pair-band?onboarding=1';
const STEPS = ['contact', 'notes', 'consent'] as const;
const RELATIONSHIP_LABELS = RELATIONSHIPS.map((item) => item.label);

const EMPTY_CONTACT: ContactDraft = { name: '', relationship: null, phone: '' };
const EMPTY: SafetyDraft = { primary: EMPTY_CONTACT, secondary: null, notes: '' };
const clean = (value: string) => value.replace(/\s+/g, ' ').trim();
const isBlankContact = (contact: ContactDraft | null) => !contact || (!clean(contact.name) && !contact.relationship && !contact.phone.trim());

type ContactErrors = { name: string | null; relationship: string | null; phone: string | null };

/** A contact left completely empty is fine; one that's started must be complete. */
function contactErrors(contact: ContactDraft | null): ContactErrors {
  if (isBlankContact(contact)) return { name: null, relationship: null, phone: null };
  const name = clean(contact!.name);
  return {
    name: name.length < 2 ? 'Enter the contact’s full name.' : null,
    relationship: contact!.relationship ? null : 'Choose how they’re related to you.',
    phone: !contact!.phone.trim() ? 'Enter their phone number.' : normalizePhone(contact!.phone) ? null : 'Check the number. For numbers outside the US, start with + and the country code.',
  };
}

function toContact(contact: ContactDraft | null): EmergencyContact | null {
  if (isBlankContact(contact)) return null;
  return { name: clean(contact!.name), relationship: relationshipCode(contact!.relationship!)!, phoneNumber: normalizePhone(contact!.phone)! };
}

function fromContact(contact: EmergencyContact | null): ContactDraft | null {
  return contact ? { name: contact.name, relationship: relationshipLabel(contact.relationship), phone: displayPhone(contact.phoneNumber) } : null;
}

export default function AthleteSafetyScreen() {
  return <Content />;
}

function Content() {
  const router = useRouter();
  const uid = getCurrentUserId();
  const saved = getSafetyDraft();
  const edited = useRef(saved !== null);

  const [draft, setDraft] = useState<SafetyDraft>(saved ?? EMPTY);
  const [storedSafety, setStoredSafety] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<'finish' | 'skip' | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [step, setStep] = useState<(typeof STEPS)[number]>('contact');
  const [agreed, setAgreed] = useState<string[]>([]);


  const update = (next: Partial<SafetyDraft>) => {
    edited.current = true;
    setSaveError(null);
    setDraft((current) => {
      const merged = { ...current, ...next };
      setSafetyDraft(merged);
      return merged;
    });
  };
  const updateContact = (which: 'primary' | 'secondary', next: Partial<ContactDraft>) =>
    update({ [which]: { ...(draft[which] ?? EMPTY_CONTACT), ...next } } as Partial<SafetyDraft>);

  // Page 1 creates the profile that onboarding progress lives on; send the athlete there first if needed.
  // Anything saved earlier comes back, unless the athlete already started editing.
  useEffect(() => {
    if (!uid) return;
    let active = true;
    getAthleteProfile(uid)
      .then((existing) => { if (active && !existing) router.replace('/athlete/profile'); })
      .catch(() => {});
    getAthleteSafety(uid)
      .then((safety) => {
        if (!active || !safety) return;
        setStoredSafety(true);
        if (edited.current) return;
        setDraft({ primary: fromContact(safety.primaryContact) ?? EMPTY_CONTACT, secondary: fromContact(safety.secondaryContact), notes: safety.safetyNotes ?? '' });
      })
      .catch(() => {});
    return () => { active = false; };
  }, [router, uid]);

  const primaryErrors = contactErrors(draft.primary);
  const secondaryErrors = contactErrors(draft.secondary);
  const valid = ![...Object.values(primaryErrors), ...Object.values(secondaryErrors)].some(Boolean);
  const shown = (which: 'primary' | 'secondary', field: keyof ContactErrors) =>
    touched[`${which}.${field}`] ? (which === 'primary' ? primaryErrors : secondaryErrors)[field] : null;
  const touch = (which: 'primary' | 'secondary', field: keyof ContactErrors) =>
    setTouched((current) => ({ ...current, [`${which}.${field}`]: true }));

  const finish = async (mode: 'finish' | 'skip') => {
    if (busy) return;
    if (mode === 'finish') {
      setTouched(Object.fromEntries(['primary', 'secondary'].flatMap((w) => ['name', 'relationship', 'phone'].map((f) => [`${w}.${f}`, true]))));
      if (!valid) return;
    }
    if (!uid || !firebaseAuth?.currentUser) {
      setSaveError('Your session ended. Sign in again to continue.');
      return;
    }
    setBusy(mode);
    setSaveError(null);
    try {
      let skipped = mode === 'skip';
      if (mode === 'finish') {
        // A second contact on its own moves up to primary.
        const contacts = [toContact(draft.primary), toContact(draft.secondary)].filter((contact): contact is EmergencyContact => contact !== null);
        const notes = clean(draft.notes) || null;
        const safety: AthleteSafety = { primaryContact: contacts[0] ?? null, secondaryContact: contacts[1] ?? null, safetyNotes: notes };
        const blank = !safety.primaryContact && !safety.safetyNotes;
        skipped = blank;
        // Nothing entered creates nothing; clearing what was saved before overwrites it.
        if (canStoreSafety && (!blank || storedSafety)) await saveAthleteSafety(uid, safety);
      }
      await completeOnboarding(uid, skipped);
      router.push(NEXT_STEP as never);
    } catch {
      setSaveError(NETWORK_ERROR);
    } finally {
      setBusy(null);
    }
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace('/athlete/body'));

  const contactFields = (which: 'primary' | 'secondary') => {
    const contact = draft[which] ?? EMPTY_CONTACT;
    return (
      <>
        <StepField autoCapitalize="words" autoComplete="off" error={shown(which, 'name')} label="Full name" maxLength={CONTACT_NAME_MAX} onBlur={() => touch(which, 'name')} onChangeText={(name) => updateContact(which, { name })} placeholder="Contact’s full name" value={contact.name} />
        <StepField autoComplete="off" error={shown(which, 'phone')} inputMode="tel" keyboardType="phone-pad" label="Phone number" maxLength={22} onBlur={() => touch(which, 'phone')} onChangeText={(text) => updateContact(which, { phone: formatPhoneInput(text) })} placeholder="(000) 000-0000" value={contact.phone} />
        <Text style={[caps, styles.fieldLabel]}>Relationship</Text>
        <ChoiceRows label="Relationship" onChange={(relationship) => { updateContact(which, { relationship }); touch(which, 'relationship'); }} options={RELATIONSHIP_LABELS.map((value) => ({ value, label: value }))} value={contact.relationship} />
        {shown(which, 'relationship') ? <Text style={styles.saveError}>{shown(which, 'relationship')}</Text> : null}
      </>
    );
  };

  const index = STEPS.indexOf(step);
  const goBack = () => (index > 0 ? setStep(STEPS[index - 1]) : back());
  const failure = saveError ? <Text accessibilityRole="alert" style={styles.saveError}>{saveError}</Text> : null;
  const skip = <StepLink label="Skip for now" onPress={() => void finish('skip')} />;
  const allAgreed = CONSENTS.every((item) => agreed.includes(item.id));

  switch (step) {
    case 'contact':
      return (
        <StepScreen icon={<ShieldMark size={96} />} next={{ enabled: valid, onPress: () => setStep('notes') }} onBack={goBack} progress={0.78} title="Emergency contact" top="tight">
          {contactFields('primary')}
          {draft.secondary ? (
            <>
              <Text style={[caps, styles.section]}>Second contact</Text>
              {contactFields('secondary')}
              <StepLink label="Remove second contact" onPress={() => update({ secondary: null })} />
            </>
          ) : (
            <StepLink label="+ Add a second contact" onPress={() => update({ secondary: EMPTY_CONTACT })} />
          )}
          {skip}
        </StepScreen>
      );
    case 'notes':
      return (
        <StepScreen icon={<ShieldMark size={96} />} next={{ enabled: true, onPress: () => setStep('consent') }} onBack={goBack} progress={0.83} title="Safety notes" top="tight">
          <StepField
            label={`Notes · ${draft.notes.length} / ${SAFETY_NOTES_MAX}`}
            maxLength={SAFETY_NOTES_MAX}
            multiline
            onChangeText={(notes) => update({ notes })}
            placeholder="e.g. I have asthma and carry an inhaler"
            style={styles.notes}
            textAlignVertical="top"
            value={draft.notes}
          />
          <View style={styles.privacyRow}>
            <LockIcon />
            <Text style={styles.privacy}>Only you can see this right now. It isn’t shared with coaches or teammates.</Text>
          </View>
        </StepScreen>
      );
    case 'consent':
      return (
        <StepScreen
          icon={<LockIcon size={56} />}
          next={{ enabled: allAgreed && busy === null, label: 'Agree', loading: busy === 'finish', onPress: () => void finish('finish') }}
          onBack={goBack}
          progress={0.88}
          title="Privacy and safety">
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: allAgreed }} onPress={() => setAgreed(allAgreed ? [] : CONSENTS.map((item) => item.id))} style={[styles.consent, styles.consentAll]}>
            <Box on={allAgreed} />
            <Text style={[caps, { color: Entry.ink }]}>Select and agree to all</Text>
          </Pressable>
          {CONSENTS.map((item) => {
            const on = agreed.includes(item.id);
            return (
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} key={item.id} onPress={() => setAgreed(on ? agreed.filter((id) => id !== item.id) : [...agreed, item.id])} style={styles.consent}>
                <Box on={on} />
                <Text style={styles.consentText}>{item.text}</Text>
              </Pressable>
            );
          })}
          {failure}
        </StepScreen>
      );
  }
}

// ponytail: consent gates the flow but isn't stored yet; persist it with the athlete profile before a real pilot.
const CONSENTS = [
  { id: 'notMedical', text: 'I understand HeatSense is not a medical device. It doesn’t diagnose heat illness, and I’ll tell a coach right away if I feel unwell.' },
  { id: 'teamSees', text: 'My coach and athletic trainer can see my name, team, and whether my band is connected.' },
  { id: 'private', text: 'My health answers and emergency contacts stay private to me unless I choose to share them.' },
] as const;

function Box({ on }: { on: boolean }) {
  return (
    <View style={[styles.box, on && styles.boxOn]}>
      {on ? <Svg fill="none" height={14} stroke={Entry.canvas} strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} viewBox="0 0 24 24" width={14}><Path d="m5 12 4 4 10-10" /></Svg> : null}
    </View>
  );
}

function LockIcon({ size = 14 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={Entry.blue} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2 }}>
      <Rect x={4} y={11} width={16} height={10} rx={2} /><Path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  fieldLabel: { color: Entry.muted, fontSize: 10, marginBottom: -8 },
  section: { color: Entry.muted, marginTop: 8 },
  notes: { minHeight: 140, paddingTop: 14 },
  privacyRow: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  privacy: { color: Entry.subtle, flex: 1, fontWeight: '400', fontSize: 12.5, lineHeight: 18 },
  consent: { alignItems: 'flex-start', flexDirection: 'row', gap: 14, paddingVertical: 6 },
  consentAll: { alignItems: 'center', backgroundColor: Entry.raised, borderRadius: 12, padding: 14 },
  consentText: { color: Entry.ink, flex: 1, fontWeight: '400', fontSize: 14, lineHeight: 20 },
  box: { alignItems: 'center', borderColor: Entry.muted, borderRadius: 6, borderWidth: 1.5, height: 24, justifyContent: 'center', width: 24 },
  boxOn: { backgroundColor: Entry.ink, borderColor: Entry.ink },
  saveError: { color: ATHLETE_ERROR, fontWeight: '400', fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
