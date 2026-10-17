import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AthleteHeader,
  AthletePillButton,
  AthleteSectionLabel,
  AthleteTextLink,
  ATHLETE_ERROR,
  ATHLETE_SCREEN,
  MultiChoice,
  SingleChoice,
  useAthleteEntrance,
} from '@/components/athlete-onboarding';
import { entryStyles } from '@/components/entry-ui';
import { HeatMark } from '@/components/onboarding-art';
import { MobileViewport } from '@/components/mobile-viewport';
import { Entry } from '@/constants/entry-theme';
import { OnboardingTextField } from '@/components/onboarding-fields';
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
const digits = (text: string, max: number) => text.replace(/\D/g, '').slice(0, max);

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
  return <MobileViewport><View style={[styles.fill, { backgroundColor: ATHLETE_SCREEN }]}><Content /></View></MobileViewport>;
}

function Content() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const { rise, fade } = useAthleteEntrance();
  const uid = getCurrentUserId();
  const saved = getBodyDraft();
  const edited = useRef(saved !== null);

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [draft, setDraft] = useState<BodyDraft>(saved ?? EMPTY);
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [storedHealth, setStoredHealth] = useState(false);
  const [touched, setTouched] = useState({ height: false, weight: false });
  const [busy, setBusy] = useState<'continue' | 'skip' | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const compact = size.height > 0 && size.height < 760;
  const revealed = (enter: boolean) => (reducedMotion ? undefined : enter ? FadeIn.duration(220) : FadeOut.duration(160));

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
      setTouched({ height: true, weight: true });
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
  const showHeightError = touched.height ? errors.height : null;
  const showWeightError = touched.weight ? errors.weight : null;

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined} onLayout={(event: LayoutChangeEvent) => setSize(event.nativeEvent.layout)}>
      <StatusBar style="light" />
      <ScrollView
        bounces={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + 12, 26), paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
        <Animated.View entering={fade(200)}>
          <AthleteHeader onBack={back} step="02 / 03" />
        </Animated.View>

        <Animated.View entering={rise(350)} style={[styles.titleRow, { marginTop: compact ? 22 : 30 }]}>
          <Text accessibilityRole="header" style={[entryStyles.formHeadline, compact && entryStyles.formHeadlineCompact, styles.title]}>{'Know your\nbody.'}</Text>
          <HeatMark size={compact ? 72 : 88} />
        </Animated.View>
        <Animated.View entering={fade(550)}>
          <Text style={entryStyles.description}>Help us understand your heat-related needs.</Text>
          <Text style={[styles.privacy]}>These questions are optional. You can update your answers anytime.</Text>
        </Animated.View>

        <Animated.View entering={rise(700)} style={styles.section}>
          <AthleteSectionLabel>Physical metrics</AthleteSectionLabel>
          <View>
            <Text style={[styles.label]}>Height (optional)</Text>
            <View style={styles.pair}>
              <View style={styles.half}>
                <OnboardingTextField
                  hideLabel
                  label="Height, feet"
                  placeholder="Feet"
                  value={draft.feet}
                  onChangeText={(text) => update({ feet: digits(text, 1) })}
                  onBlur={() => setTouched((current) => ({ ...current, height: true }))}
                  invalid={!!showHeightError}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  maxLength={1}
                />
              </View>
              <View style={styles.half}>
                <OnboardingTextField
                  hideLabel
                  label="Height, inches"
                  placeholder="Inches"
                  value={draft.inches}
                  onChangeText={(text) => update({ inches: digits(text, 2) })}
                  onBlur={() => setTouched((current) => ({ ...current, height: true }))}
                  invalid={!!showHeightError}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  maxLength={2}
                />
              </View>
            </View>
            {showHeightError && <Text role="alert" style={[styles.fieldError]}>{showHeightError}</Text>}
          </View>
          <OnboardingTextField
            label="Weight (optional)"
            placeholder="Weight in lbs"
            value={draft.pounds}
            onChangeText={(text) => update({ pounds: digits(text, 3) })}
            onBlur={() => setTouched((current) => ({ ...current, weight: true }))}
            error={showWeightError}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={3}
          />
        </Animated.View>

        <Animated.View entering={rise(800)} style={styles.section}>
          <AthleteSectionLabel>Heat history</AthleteSectionLabel>
          <SingleChoice
            question="Have you experienced a heat-related illness before?"
            choices={HEAT_ILLNESS}
            value={draft.previousHeatIllness}
            // Moving off "Yes" drops the follow-up so an irrelevant disclosure isn't kept.
            onChange={(code) => update({ previousHeatIllness: code, ...(code === 'yes' ? {} : { previousHeatIllnessType: null }) })}
          />
          {draft.previousHeatIllness === 'yes' && (
            <Animated.View entering={revealed(true)} exiting={revealed(false)}>
              <SingleChoice
                question="What type of heat illness? (optional)"
                choices={HEAT_ILLNESS_TYPES}
                value={draft.previousHeatIllnessType}
                onChange={(code) => update({ previousHeatIllnessType: code })}
              />
            </Animated.View>
          )}
        </Animated.View>

        <Animated.View entering={rise(900)} style={styles.section}>
          <AthleteSectionLabel>Heat-related concerns</AthleteSectionLabel>
          <MultiChoice
            question="Do you have any concerns about exercising in hot weather?"
            choices={HEAT_CONCERNS}
            exclusive={EXCLUSIVE_CONCERNS}
            value={draft.heatConcerns}
            onChange={(codes) => update({ heatConcerns: codes, ...(codes.includes('other') ? {} : { otherConcern: '' }) })}
          />
          {draft.heatConcerns.includes('other') && (
            <Animated.View entering={revealed(true)} exiting={revealed(false)}>
              <OnboardingTextField
                label="Other concern (optional)"
                placeholder="A few words"
                value={draft.otherConcern}
                onChangeText={(otherConcern) => update({ otherConcern })}
                maxLength={OTHER_CONCERN_MAX}
                autoCapitalize="sentences"
              />
              <Text style={[styles.note]}>No need to include medical details, diagnoses, or medication names.</Text>
            </Animated.View>
          )}
        </Animated.View>

        <Animated.View entering={rise(1000)} style={styles.section}>
          <AthleteSectionLabel>Heat acclimatization</AthleteSectionLabel>
          <SingleChoice
            question="How accustomed are you to training in hot weather?"
            choices={ACCLIMATIZATION}
            value={draft.heatAcclimatization}
            onChange={(code) => update({ heatAcclimatization: code })}
          />
          <Text style={[styles.note]}>Your heat tolerance can change after time away from training.</Text>
        </Animated.View>

        <Animated.View entering={rise(1100)} style={styles.actions}>
          <AthletePillButton label="Continue" enabled={valid && busy === null} loading={busy === 'continue'} onPress={() => void finish('continue')} />
          <AthleteTextLink label="Skip for now" disabled={busy !== null} onPress={() => void finish('skip')} />
          {saveError && <Text accessibilityRole="alert" style={[styles.saveError]}>{saveError}</Text>}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 26 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  title: { flex: 1 },
  privacy: { color: Entry.subtle, fontFamily: Entry.body, fontSize: 12.5, lineHeight: 18, marginTop: 8, maxWidth: 340 },
  section: { marginTop: 34, gap: 16 },
  label: { color: Entry.ink, fontFamily: Entry.medium, fontSize: 13.5, letterSpacing: -0.1, marginBottom: 8, marginLeft: 4 },
  pair: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  fieldError: { color: ATHLETE_ERROR, fontFamily: Entry.body, fontSize: 12.5, lineHeight: 17, marginTop: 7, marginLeft: 6 },
  note: { color: Entry.subtle, fontFamily: Entry.body, fontSize: 12.5, lineHeight: 17, marginTop: 8, marginLeft: 6 },
  actions: { marginTop: 36, gap: 14 },
  saveError: { color: ATHLETE_ERROR, fontFamily: Entry.body, fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
