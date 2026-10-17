import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import {
  AthleteHeader,
  AthletePillButton,
  AthleteSectionLabel,
  AthleteTextLink,
  ATHLETE_ERROR,
  ATHLETE_MUTED,
  ATHLETE_SCREEN,
  athleteFont as fontFamily,
  useAthleteEntrance,
} from '@/components/athlete-onboarding';
import { MobileViewport } from '@/components/mobile-viewport';
import { OnboardingSelectField, OnboardingTextField } from '@/components/onboarding-fields';
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
const NEXT_STEP = '/athlete/done';
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
  return <MobileViewport><View style={[styles.fill, { backgroundColor: ATHLETE_SCREEN }]}><Content /></View></MobileViewport>;
}

function Content() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const { rise, fade } = useAthleteEntrance();
  const uid = getCurrentUserId();
  const saved = getSafetyDraft();
  const edited = useRef(saved !== null);

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [draft, setDraft] = useState<SafetyDraft>(saved ?? EMPTY);
  const [storedSafety, setStoredSafety] = useState(false);
  const [openSelect, setOpenSelect] = useState<'primary' | 'secondary' | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [notesFocused, setNotesFocused] = useState(false);
  const [busy, setBusy] = useState<'finish' | 'skip' | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const compact = size.height > 0 && size.height < 760;
  const headlineSize = Math.max(40, Math.min(48, Math.floor((size.width || 390) * 0.118)));
  const revealed = (enter: boolean) => (reducedMotion ? undefined : enter ? FadeIn.duration(220) : FadeOut.duration(160));

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
      <View style={styles.fields}>
        <OnboardingTextField
          surface="flat"
          label="Full name"
          placeholder="Contact’s full name"
          value={contact.name}
          onChangeText={(name) => updateContact(which, { name })}
          onBlur={() => touch(which, 'name')}
          error={shown(which, 'name')}
          autoCapitalize="words"
          autoComplete="off"
          maxLength={CONTACT_NAME_MAX}
        />
        <View style={styles.select}>
          <OnboardingSelectField
            surface="flat"
            label="Relationship"
            placeholder="Select relationship"
            options={RELATIONSHIP_LABELS}
            value={contact.relationship}
            onChange={(relationship) => { updateContact(which, { relationship }); touch(which, 'relationship'); setOpenSelect(null); }}
            open={openSelect === which}
            onOpenChange={(open) => { setOpenSelect(open ? which : null); if (!open && !isBlankContact(contact)) touch(which, 'relationship'); }}
            error={shown(which, 'relationship')}
            maxVisibleRows={4}
          />
        </View>
        <OnboardingTextField
          surface="flat"
          label="Phone number"
          placeholder="(000) 000-0000"
          value={contact.phone}
          onChangeText={(text) => updateContact(which, { phone: formatPhoneInput(text) })}
          onBlur={() => touch(which, 'phone')}
          error={shown(which, 'phone')}
          keyboardType="phone-pad"
          inputMode="tel"
          autoComplete="off"
          maxLength={22}
        />
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined} onLayout={(event: LayoutChangeEvent) => setSize(event.nativeEvent.layout)}>
      <StatusBar style="light" />
      <ScrollView
        bounces={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + 8, compact ? 36 : 56), paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
        <Animated.View entering={fade(200)}>
          <AthleteHeader onBack={back} step="03 / 03" />
        </Animated.View>

        <Animated.Text
          entering={rise(350)}
          accessibilityRole="header"
          style={[styles.headline, { fontFamily, fontSize: headlineSize, lineHeight: Math.round(headlineSize * 1.08), marginTop: compact ? 26 : 32 }]}>
          {'Safety comes\nfirst.'}
        </Animated.Text>
        {/* HeatSense doesn't send emergency notifications, so the page never says it will reach anyone. */}
        <Animated.Text entering={fade(550)} style={[styles.description, { fontFamily }]}>Keep important contact information available to authorized safety staff.</Animated.Text>

        <Animated.View entering={rise(700)} style={styles.section}>
          <AthleteSectionLabel>Primary emergency contact</AthleteSectionLabel>
          {contactFields('primary')}
        </Animated.View>

        <Animated.View entering={rise(800)} style={styles.secondaryWrap}>
          {draft.secondary ? (
            <Animated.View entering={revealed(true)} exiting={revealed(false)} style={styles.section}>
              <View style={styles.sectionRow}>
                <AthleteSectionLabel>Secondary emergency contact</AthleteSectionLabel>
                <Pressable accessibilityRole="button" accessibilityLabel="Remove secondary contact" hitSlop={10} onPress={() => { update({ secondary: null }); if (openSelect === 'secondary') setOpenSelect(null); }}>
                  {({ hovered }: { hovered?: boolean }) => <Text style={[styles.remove, { fontFamily }, hovered && styles.underline]}>Remove contact</Text>}
                </Pressable>
              </View>
              {contactFields('secondary')}
            </Animated.View>
          ) : (
            <Pressable accessibilityRole="button" accessibilityLabel="Add another contact" hitSlop={10} onPress={() => update({ secondary: EMPTY_CONTACT })} style={styles.addWrap}>
              {({ hovered }: { hovered?: boolean }) => <Text style={[styles.add, { fontFamily }, hovered && styles.underline]}>+ Add another contact</Text>}
            </Pressable>
          )}
        </Animated.View>

        <Animated.View entering={rise(900)} style={styles.section}>
          <View>
            <AthleteSectionLabel>Additional safety notes (optional)</AthleteSectionLabel>
            <Text style={[styles.hint, { fontFamily }]}>Share anything important authorized safety staff should know. No medical records, medication lists, or insurance details.</Text>
          </View>
          <TextInput
            accessibilityLabel="Additional safety notes, optional"
            value={draft.notes}
            onChangeText={(notes) => update({ notes })}
            onFocus={() => setNotesFocused(true)}
            onBlur={() => setNotesFocused(false)}
            placeholder="Add any additional information here..."
            placeholderTextColor="#8A8A8A"
            selectionColor="#FFFFFF"
            cursorColor="#FFFFFF"
            keyboardAppearance="dark"
            multiline
            textAlignVertical="top"
            maxLength={SAFETY_NOTES_MAX}
            style={[styles.notes, notesFocused && styles.notesFocused, { fontFamily }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
          />
          <Text style={[styles.counter, { fontFamily }]}>{draft.notes.length} / {SAFETY_NOTES_MAX}</Text>
        </Animated.View>

        <Animated.View entering={fade(1000)} style={styles.privacyRow}>
          <LockIcon />
          <Text style={[styles.privacy, { fontFamily }]}>Only you can see this information right now. It isn’t shared with coaches or teammates, and HeatSense never contacts anyone automatically.</Text>
        </Animated.View>

        <Animated.View entering={rise(1100)} style={styles.actions}>
          <AthletePillButton label="Finish setup →" enabled={busy === null} loading={busy === 'finish'} onPress={() => void finish('finish')} />
          <AthleteTextLink label="Skip for now" disabled={busy !== null} onPress={() => void finish('skip')} />
          {saveError && <Text accessibilityRole="alert" style={[styles.saveError, { fontFamily }]}>{saveError}</Text>}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function LockIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#8E8E8E" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2 }}>
      <Rect x={4} y={11} width={16} height={10} rx={2} /><Path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 22 },
  headline: { color: '#FFFFFF', fontWeight: '400', letterSpacing: -0.6 },
  description: { color: ATHLETE_MUTED, fontSize: 16, lineHeight: 23, fontWeight: '400', marginTop: 12, maxWidth: 340 },
  section: { marginTop: 30, gap: 16 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  fields: { gap: 16 },
  // Keep an open dropdown above the field that follows it.
  select: { zIndex: 1 },
  secondaryWrap: { marginTop: 4 },
  addWrap: { alignSelf: 'flex-start', marginTop: 18, paddingVertical: 4 },
  add: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '500' },
  remove: { color: ATHLETE_MUTED, fontSize: 13.5 },
  underline: { textDecorationLine: 'underline' },
  hint: { color: '#8E8E8E', fontSize: 13, lineHeight: 18, marginTop: 6 },
  notes: { minHeight: 120, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.85)', backgroundColor: '#101010', color: '#FFFFFF', fontSize: 16, lineHeight: 22, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  notesFocused: { borderColor: '#FFFFFF', backgroundColor: '#141414' },
  counter: { color: '#8E8E8E', fontSize: 12, textAlign: 'right', marginTop: -8, marginRight: 6 },
  privacyRow: { flexDirection: 'row', gap: 8, marginTop: 24, paddingRight: 8 },
  privacy: { flex: 1, color: '#8E8E8E', fontSize: 12.5, lineHeight: 18 },
  actions: { marginTop: 28, gap: 14 },
  saveError: { color: ATHLETE_ERROR, fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
