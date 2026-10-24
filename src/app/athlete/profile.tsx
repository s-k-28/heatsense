import { Text } from '@/components/ui/text';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AthleteHeader,
  AthletePillButton,
  ATHLETE_ERROR,
  ATHLETE_SCREEN,
  useAthleteEntrance,
} from '@/components/onboarding/athlete-onboarding';
import { EntryHeading } from '@/components/onboarding/entry-ui';
import { OnboardingBackground } from '@/components/onboarding/onboarding-background';
import { MobileViewport } from '@/components/layout/mobile-viewport';
import { Entry } from '@/constants/entry-theme';
import { OnboardingSelectField, OnboardingTextField } from '@/components/onboarding/onboarding-fields';
import { SPORTS } from '@/constants/sports';
import { ageBandFor, getAthleteProfile, GRADES, saveAthleteBasics, type AthleteProfile, type Grade } from '@/services/athlete-profile';
import { firebaseAuth } from '@/services/firebase';
import { getTeamPreview, NETWORK_ERROR, watchMyMembership, type Membership, type TeamPreview } from '@/services/team-invites';
import { getAthleteDraft, getCurrentUserId, setAthleteDraft, type AthleteDraft } from '@/state/onboarding';

// Athlete onboarding, page 1 of 3: "Make it yours." Basic identity and sport.
// Visual source of truth is the sign-in screen; shared pieces live in athlete-onboarding.tsx.
//
// Next: page 2, "Know your body."
const NEXT_STEP = '/athlete/body';

const clean = (value: string) => value.replace(/\s+/g, ' ').trim();

type Team = { teamId: string; status: Membership['status']; preview: TeamPreview | null };

// ── Date of birth: typed as MM / DD / YYYY, digits only ──────────────────────
function formatBirthDate(digits: string) {
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
  return parts.join(' / ');
}

function parseBirthDate(value: string): { date: Date | null; error: string | null } {
  const digits = value.replace(/\D/g, '');
  if (!digits) return { date: null, error: 'Enter your date of birth.' };
  if (digits.length < 8) return { date: null, error: 'Use the format MM / DD / YYYY.' };
  const month = Number(digits.slice(0, 2));
  const day = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));
  const date = new Date(year, month - 1, day);
  if (month < 1 || month > 12 || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return { date: null, error: 'That date doesn’t exist. Check the month and day.' };
  }
  const today = new Date();
  if (date > today) return { date: null, error: 'Date of birth can’t be in the future.' };
  const years = today.getFullYear() - year;
  if (years < 5 || years > 100) return { date: null, error: 'Check the year.' };
  return { date, error: null };
}

export default function AthleteProfileScreen() {
  return <MobileViewport><View style={[styles.fill, { backgroundColor: ATHLETE_SCREEN }]}><Content /></View></MobileViewport>;
}

function Content() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { rise, fade } = useAthleteEntrance();
  const uid = getCurrentUserId();
  const saved = getAthleteDraft();
  const edited = useRef(saved !== null);

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [draft, setDraft] = useState<AthleteDraft>(saved ?? { fullName: firebaseAuth?.currentUser?.displayName ?? '', birthDate: '', grade: null, sport: null, jersey: '' });
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [openSelect, setOpenSelect] = useState<'grade' | 'sport' | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const compact = size.height > 0 && size.height < 760;

  const update = (next: Partial<AthleteDraft>) => {
    edited.current = true;
    setSaveError(null);
    setDraft((current) => {
      const merged = { ...current, ...next };
      setAthleteDraft(merged);
      return merged;
    });
  };

  // Anything saved earlier fills the form, unless the athlete already started typing.
  useEffect(() => {
    if (!uid) return;
    let active = true;
    getAthleteProfile(uid)
      .then((existing) => {
        if (!active || !existing) return;
        setProfile(existing);
        if (edited.current) return;
        setDraft((current) => ({
          ...current,
          fullName: existing.fullName ?? current.fullName,
          grade: existing.grade ?? current.grade,
          sport: existing.sportSource === 'self' ? existing.sport : current.sport,
          jersey: existing.jersey ?? current.jersey,
        }));
      })
      .catch(() => {}); // Saving reports any real connection problem.
    return () => { active = false; };
  }, [uid]);

  // The athlete's real team status. A pending request carries the team it was sent
  // to, so the sport can be shown, but it never counts as membership.
  useEffect(() => {
    if (!uid) return;
    let active = true;
    const stop = watchMyMembership(uid, (membership) => {
      if (!membership || membership.status === 'declined') { setTeam(null); return; }
      setTeam({ teamId: membership.teamId, status: membership.status, preview: membership.team });
      if (!membership.team && membership.status === 'active') {
        getTeamPreview(membership.teamId)
          .then((preview) => { if (active && preview) setTeam({ teamId: membership.teamId, status: membership.status, preview }); })
          .catch(() => {});
      }
    }, () => {});
    return () => { active = false; stop(); };
  }, [uid]);

  const teamSport = team?.preview && (SPORTS as readonly string[]).includes(team.preview.sport) ? team.preview.sport : null;
  const sport = teamSport ?? draft.sport;

  // An age band saved earlier stands in for the birth date (which is never stored);
  // entering a date again replaces it.
  const keepsSavedAge = Boolean(profile?.ageBand) && !draft.birthDate;
  const birth = keepsSavedAge ? { date: null, error: null } : parseBirthDate(draft.birthDate);
  const name = clean(draft.fullName);
  const errors = {
    fullName: name.length < 2 ? 'Enter your full name.' : name.length > 60 ? 'Keep your name under 60 characters.' : null,
    birthDate: birth.error,
    grade: draft.grade ? null : 'Choose your grade.',
    sport: sport ? null : 'Choose your sport.',
  };
  const valid = !Object.values(errors).some(Boolean);
  const shown = (field: keyof typeof errors) => (touched[field] ? errors[field] : null);
  const touch = (field: keyof typeof errors) => setTouched((current) => ({ ...current, [field]: true }));

  const onBirthDateChange = (text: string) => {
    let digits = text.replace(/\D/g, '').slice(0, 8);
    // Backspacing over a " / " removes the digit before it.
    if (text.length < draft.birthDate.length && digits === draft.birthDate.replace(/\D/g, '')) digits = digits.slice(0, -1);
    update({ birthDate: formatBirthDate(digits) });
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace('/setup/athlete'));

  const submit = async () => {
    setTouched({ fullName: true, birthDate: true, grade: true, sport: true });
    if (!valid || saving) return;
    if (!uid || !firebaseAuth?.currentUser) {
      setSaveError('Your session ended. Sign in again to continue.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await saveAthleteBasics(uid, {
        fullName: name,
        ageBand: birth.date ? ageBandFor(birth.date) : profile!.ageBand,
        grade: draft.grade as Grade,
        sport: sport!,
        sportSource: teamSport ? 'team' : 'self',
        jersey: draft.jersey || null,
        teamId: team?.teamId ?? null,
      }, profile);
      router.push(NEXT_STEP as never);
    } catch {
      setSaveError(NETWORK_ERROR);
    } finally {
      setSaving(false);
    }
  };

  const fieldDelay = (index: number) => 700 + index * 80;

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined} onLayout={(event: LayoutChangeEvent) => setSize(event.nativeEvent.layout)}>
      <StatusBar style="light" />
      <ScrollView
        style={{ marginTop: insets.top }}
        bounces={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(12, 26 - insets.top), paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        {size.height > 0 && <OnboardingBackground variant="form" height={size.height} />}
        <Animated.View entering={fade(200)}>
          <AthleteHeader onBack={back} step={2} />
        </Animated.View>

        <EntryHeading accent="yours." compact={compact} delay={300} lead="Make it" style={{ marginTop: compact ? 26 : 36 }} />

        <View style={[styles.form, { marginTop: compact ? 22 : 28 }]}>
          <Animated.View entering={rise(fieldDelay(0))}>
            <OnboardingTextField
              label="Full name"
              placeholder="Your full name"
              value={draft.fullName}
              onChangeText={(fullName) => update({ fullName })}
              onBlur={() => touch('fullName')}
              error={shown('fullName')}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              autoCorrect={false}
              maxLength={80}
              returnKeyType="next"
            />
          </Animated.View>

          <Animated.View entering={rise(fieldDelay(1))}>
            <OnboardingTextField
              label="Date of birth"
              placeholder="MM / DD / YYYY"
              value={draft.birthDate}
              onChangeText={onBirthDateChange}
              onBlur={() => touch('birthDate')}
              error={shown('birthDate')}
              keyboardType="number-pad"
              inputMode="numeric"
              autoComplete="birthdate-full"
              accessibilityHint="Month, day, and year, as eight digits"
              maxLength={14}
              returnKeyType="done"
            />
            {keepsSavedAge && <Text style={[styles.hint]}>Already saved. Enter it again only to change it.</Text>}
          </Animated.View>

          <Animated.View entering={rise(fieldDelay(2))} style={styles.select}>
            <OnboardingSelectField
              label="Grade level"
              placeholder="Select your grade"
              options={GRADES}
              value={draft.grade}
              onChange={(grade) => { update({ grade }); touch('grade'); setOpenSelect(null); }}
              open={openSelect === 'grade'}
              onOpenChange={(open) => { setOpenSelect(open ? 'grade' : null); if (!open) touch('grade'); }}
              error={shown('grade')}
            />
          </Animated.View>

          <Animated.View entering={rise(fieldDelay(3))} style={styles.select}>
            {teamSport && team?.preview ? (
              <TeamSportField sport={teamSport} teamName={team.preview.teamName} pending={team.status === 'pending'} />
            ) : (
              <OnboardingSelectField
                label="Sport"
                placeholder="Select your sport"
                options={SPORTS}
                value={draft.sport}
                onChange={(value) => { update({ sport: value }); touch('sport'); setOpenSelect(null); }}
                open={openSelect === 'sport'}
                onOpenChange={(open) => { setOpenSelect(open ? 'sport' : null); if (!open) touch('sport'); }}
                error={shown('sport')}
              />
            )}
          </Animated.View>

          <Animated.View entering={rise(fieldDelay(4))}>
            <OnboardingTextField
              label="Jersey number (optional)"
              placeholder="e.g. 12"
              value={draft.jersey}
              onChangeText={(text) => update({ jersey: text.replace(/\D/g, '').slice(0, 3) })}
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={3}
              returnKeyType="done"
              onSubmitEditing={() => void submit()}
            />
          </Animated.View>
        </View>

        <View style={styles.spacer} />

        <Animated.View entering={rise(1150)} style={styles.actions}>
          <AthletePillButton label="Continue" enabled={valid && !saving} loading={saving} onPress={() => void submit()} />
          {saveError && <Text accessibilityRole="alert" style={[styles.saveError]}>{saveError}</Text>}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// The team decides the sport, so it's shown, not editable. A pending request says so.
function TeamSportField({ sport, teamName, pending }: { sport: string; teamName: string; pending: boolean }) {
  return (
    <View>
      <Text style={[styles.label]}>Sport</Text>
      <View accessible accessibilityLabel={`Sport, ${sport}, set by ${teamName}`} style={styles.readOnly}>
        <Text style={[styles.readOnlyText]}>{sport}</Text>
      </View>
      <Text style={[styles.hint]}>
        {pending ? `From ${teamName}. Your request to join is waiting for your coach.` : `From your team, ${teamName}.`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 26 },
  form: { gap: 16 },
  // Keep an open dropdown above the fields that follow it.
  select: { zIndex: 1 },
  label: { color: Entry.ink, fontFamily: Entry.medium, fontSize: 14, letterSpacing: -0.1, marginBottom: 8, marginLeft: 4 },
  // Set by the team: shown, not editable, so it reads as information rather than a field.
  readOnly: { minHeight: 60, paddingVertical: 14, borderRadius: 22, borderWidth: 1, borderColor: Entry.line, backgroundColor: Entry.canvas, justifyContent: 'center', paddingHorizontal: 18 },
  readOnlyText: { color: Entry.ink, fontFamily: Entry.medium, fontSize: 16, letterSpacing: -0.1 },
  hint: { color: Entry.subtle, fontFamily: Entry.body, fontSize: 14, lineHeight: 20, marginTop: 7, marginLeft: 6 },
  spacer: { flexGrow: 1, minHeight: 28 },
  actions: { gap: 12 },
  saveError: { color: ATHLETE_ERROR, fontFamily: Entry.body, fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
