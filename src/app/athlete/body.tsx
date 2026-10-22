import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ATHLETE_ERROR, MultiChoice } from '@/components/athlete-onboarding';
import { HeatMark } from '@/components/onboarding-art';
import { ChoiceRows, StepField, StepLink, StepScreen, Wheel } from '@/components/step-kit';
import { Entry } from '@/constants/entry-theme';
import {
  ACCLIMATIZATION,
  canStoreHealth,
  completeBodyStep,
  EXCLUSIVE_CONCERNS,
  fromHeightCm,
  fromWeightKg,
  getAthleteHealth,
  HEAT_CONCERNS,
  HEAT_ILLNESS,
  HEAT_ILLNESS_TYPES,
  OTHER_CONCERN_MAX,
  saveAthleteHealth,
  toHeightCm,
  toWeightKg,
  type AthleteHealth,
} from '@/services/athlete-health';
import { getAthleteProfile, type AthleteProfile } from '@/services/athlete-profile';
import { firebaseAuth } from '@/services/firebase';
import { NETWORK_ERROR } from '@/services/team-invites';
import { getBodyDraft, getCurrentUserId, setBodyDraft, type BodyDraft } from '@/state/onboarding';

// Athlete onboarding, page 2 of 3: "Know your body." Every question is optional.
// Answers are never shared with coaches and never feed a risk score; see
// services/athlete-health.ts for where (and whether) they're stored.
//
// Next: page 3, "Safety comes first."
const NEXT_STEP = '/athlete/safety';

const EMPTY: BodyDraft = { feet: '', inches: '', pounds: '', previousHeatIllness: null, previousHeatIllnessType: null, heatConcerns: [], otherConcern: '', heatAcclimatization: null };

function draftFrom(health: AthleteHealth): BodyDraft {
  const height = health.heightCm ? fromHeightCm(health.heightCm) : null;
  return {
    feet: height ? String(height.feet) : '',
    inches: height ? String(height.inches) : '',
    pounds: health.weightKg ? String(fromWeightKg(health.weightKg)) : '',
    previousHeatIllness: health.previousHeatIllness,
    previousHeatIllnessType: health.previousHeatIllnessType,
    heatConcerns: health.heatConcerns ?? [],
    otherConcern: health.otherConcern ?? '',
    heatAcclimatization: health.heatAcclimatization,
  };
}

function validate(draft: BodyDraft) {
  let height: string | null = null;
  if (draft.feet || draft.inches) {
    const feet = Number(draft.feet);
    const inches = Number(draft.inches);
    const total = feet * 12 + inches;
    if (!draft.feet || !draft.inches) height = 'Enter both feet and inches, or leave both blank.';
    else if (inches > 11) height = 'Inches should be 0 to 11.';
    else if (total < 36 || total > 96) height = 'Check your height.';
  }
  let weight: string | null = null;
  if (draft.pounds) {
    const pounds = Number(draft.pounds);
    if (pounds < 40 || pounds > 600) weight = 'Check your weight.';
  }
  return { height, weight };
}

function toHealth(draft: BodyDraft): AthleteHealth {
  const other = draft.otherConcern.replace(/\s+/g, ' ').trim();
  return {
    heightCm: draft.feet && draft.inches ? toHeightCm(Number(draft.feet), Number(draft.inches)) : null,
    weightKg: draft.pounds ? toWeightKg(Number(draft.pounds)) : null,
    previousHeatIllness: draft.previousHeatIllness,
    previousHeatIllnessType: draft.previousHeatIllness === 'yes' ? draft.previousHeatIllnessType : null,
    heatConcerns: draft.heatConcerns,
    otherConcern: draft.heatConcerns.includes('other') && other ? other : null,
    heatAcclimatization: draft.heatAcclimatization,
  };
}

const isBlank = (health: AthleteHealth) =>
  health.heightCm === null && health.weightKg === null && !health.previousHeatIllness && health.heatConcerns.length === 0 && !health.heatAcclimatization;

export default function AthleteBodyScreen() {
  return <Content />;
}

function Content() {
  const router = useRouter();
  const uid = getCurrentUserId();
  const saved = getBodyDraft();
  const edited = useRef(saved !== null);

  const [draft, setDraft] = useState<BodyDraft>(saved ?? EMPTY);
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [storedHealth, setStoredHealth] = useState(false);
  const [busy, setBusy] = useState<'continue' | 'skip' | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [step, setStep] = useState<(typeof STEPS)[number]>('size');


  const update = (next: Partial<BodyDraft>) => {
    edited.current = true;
    setSaveError(null);
    setDraft((current) => {
      const merged = { ...current, ...next };
      setBodyDraft(merged);
      return merged;
    });
  };

  // Page 1 must be saved first (it creates the profile this page's progress is kept on).
  // Answers saved earlier come back, unless the athlete already started editing.
  useEffect(() => {
    if (!uid) return;
    let active = true;
    getAthleteProfile(uid)
      .then((existing) => {
        if (!active) return;
        if (!existing) { router.replace('/athlete/profile'); return; }
        setProfile(existing);
      })
      .catch(() => {});
    getAthleteHealth(uid)
      .then((health) => {
        if (!active || !health) return;
        setStoredHealth(true);
        if (!edited.current) setDraft(draftFrom(health));
      })
      .catch(() => {});
    return () => { active = false; };
  }, [router, uid]);

  const errors = validate(draft);
  const valid = !errors.height && !errors.weight;

  const finish = async (mode: 'continue' | 'skip') => {
    if (busy) return;
    if (mode === 'continue') {
      if (!valid) return;
    }
    if (!uid || !firebaseAuth?.currentUser) {
      setSaveError('Your session ended. Sign in again to continue.');
      return;
    }
    setBusy(mode);
    setSaveError(null);
    try {
      if (mode === 'continue' && canStoreHealth) {
        const health = toHealth(draft);
        // An all-blank form creates nothing; clearing answers that were saved before overwrites them.
        if (!isBlank(health) || storedHealth) await saveAthleteHealth(uid, health);
      }
      await completeBodyStep(uid, profile?.onboarding?.step);
      router.push(NEXT_STEP as never);
    } catch {
      setSaveError(NETWORK_ERROR);
    } finally {
      setBusy(null);
    }
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace('/athlete/profile'));
  const index = STEPS.indexOf(step);
  const last = index === STEPS.length - 1;
  const goBack = () => (index > 0 ? setStep(STEPS[index - 1]) : back());
  const goNext = () => (last ? void finish('continue') : setStep(STEPS[index + 1]));
  const common = {
    next: { enabled: valid && busy === null, label: last ? 'Save' : 'Next', loading: busy === 'continue', onPress: goNext },
    onBack: goBack,
    progress: 0.62 + index * 0.04,
    top: 'tight' as const,
  };
  const skip = <StepLink label="Skip these questions" onPress={() => void finish('skip')} />;
  const failure = saveError ? <Text accessibilityRole="alert" style={styles.saveError}>{saveError}</Text> : null;
  const rows = (choices: readonly { code: string; label: string }[]) => choices.map((choice) => ({ value: choice.code, label: choice.label }));

  switch (step) {
    case 'size': {
      const set = draft.feet !== '' && draft.pounds !== '';
      return (
        <StepScreen {...common} icon={<HeatMark size={96} />} title="Height and weight" top="open">
          <View style={styles.wheels}>
            <Wheel format={(f) => `${f} ft`} items={FEET} label="Height, feet" onChange={(feet) => update({ feet: String(feet), inches: draft.inches || '0' })} value={Number(draft.feet || 5)} width={84} />
            <Wheel format={(i) => `${i} in`} items={INCHES} label="Height, inches" onChange={(inches) => update({ inches: String(inches), feet: draft.feet || '5' })} value={Number(draft.inches || 6)} width={84} />
            <Wheel format={(lb) => `${lb} lb`} items={POUNDS} label="Weight, pounds" onChange={(pounds) => update({ pounds: String(pounds) })} value={Number(draft.pounds || 140)} width={104} />
          </View>
          <Text style={styles.note}>{set ? `${draft.feet} ft ${draft.inches} in · ${draft.pounds} lb` : 'Not set. Scroll to set it, or leave it blank.'}</Text>
          {set ? <StepLink label="Clear" onPress={() => update({ feet: '', inches: '', pounds: '' })} /> : skip}
        </StepScreen>
      );
    }
    case 'history':
      return (
        <StepScreen {...common} icon={<HeatMark size={96} />} title="Have you had a heat-related illness before?">
          <ChoiceRows label="Previous heat illness" onChange={(code) => update({ previousHeatIllness: code === draft.previousHeatIllness ? null : code, ...(code === 'yes' ? {} : { previousHeatIllnessType: null }) })} options={rows(HEAT_ILLNESS)} value={draft.previousHeatIllness} />
          {draft.previousHeatIllness === 'yes' ? (
            <ChoiceRows label="Type of heat illness" onChange={(code) => update({ previousHeatIllnessType: code === draft.previousHeatIllnessType ? null : code })} options={rows(HEAT_ILLNESS_TYPES)} value={draft.previousHeatIllnessType} />
          ) : null}
          {skip}
        </StepScreen>
      );
    case 'concerns':
      return (
        <StepScreen {...common} icon={<HeatMark size={96} />} title="Anything that worries you about training in heat?">
          <MultiChoice choices={HEAT_CONCERNS} exclusive={EXCLUSIVE_CONCERNS} onChange={(codes) => update({ heatConcerns: codes, ...(codes.includes('other') ? {} : { otherConcern: '' }) })} question="Concerns" value={draft.heatConcerns} />
          {draft.heatConcerns.includes('other') ? (
            <StepField autoCapitalize="sentences" label="Other concern" maxLength={OTHER_CONCERN_MAX} onChangeText={(otherConcern) => update({ otherConcern })} placeholder="A few words, no medical details" value={draft.otherConcern} />
          ) : null}
          {skip}
        </StepScreen>
      );
    case 'acclimatization':
      return (
        <StepScreen {...common} icon={<HeatMark size={96} />} title="How used to the heat are you?">
          <ChoiceRows label="Heat acclimatization" onChange={(code) => update({ heatAcclimatization: code === draft.heatAcclimatization ? null : code })} options={rows(ACCLIMATIZATION)} value={draft.heatAcclimatization} />
          {skip}
          {failure}
        </StepScreen>
      );
  }
}

const STEPS = ['size', 'history', 'concerns', 'acclimatization'] as const;
const FEET = [3, 4, 5, 6, 7] as const;
const INCHES = Array.from({ length: 12 }, (_, i) => i);
const POUNDS = Array.from({ length: 291 }, (_, i) => 60 + i);

const styles = StyleSheet.create({
  wheels: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  note: { color: Entry.subtle, fontFamily: Entry.body, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  saveError: { color: ATHLETE_ERROR, fontFamily: Entry.body, fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
