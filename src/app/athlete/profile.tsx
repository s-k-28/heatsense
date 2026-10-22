import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ATHLETE_ERROR } from '@/components/athlete-onboarding';
import { JerseyMark } from '@/components/onboarding-art';
import { ChoiceRows, StepField, StepScreen, Wheel } from '@/components/step-kit';
import { Entry } from '@/constants/entry-theme';
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
const STEPS = ['name', 'birthday', 'grade', 'sport', 'jersey'] as const;

const clean = (value: string) => value.replace(/\s+/g, ' ').trim();

type Team = { teamId: string; status: Membership['status']; preview: TeamPreview | null };

// ── Date of birth: typed as MM / DD / YYYY, digits only ──────────────────────
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
  return <Content />;
}

function Content() {
  const router = useRouter();
  const uid = getCurrentUserId();
  const saved = getAthleteDraft();
  const edited = useRef(saved !== null);

  const [draft, setDraft] = useState<AthleteDraft>(saved ?? { fullName: firebaseAuth?.currentUser?.displayName ?? '', birthDate: '', grade: null, sport: null, jersey: '' });
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [, setTouched] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [step, setStep] = useState<(typeof STEPS)[number]>('name');

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
  const touch = (field: keyof typeof errors) => setTouched((current) => ({ ...current, [field]: true }));



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

  // One question per screen. The save happens once, on the last step, exactly as before.
  const index = STEPS.indexOf(step);
  const stepValid = {
    name: !errors.fullName,
    birthday: !errors.birthDate,
    grade: !errors.grade,
    sport: !errors.sport,
    jersey: valid,
  }[step];
  const goBack = () => (index > 0 ? setStep(STEPS[index - 1]) : back());
  const goNext = () => {
    if (!stepValid) return;
    if (step === 'jersey') return void submit();
    setStep(STEPS[index + 1]);
  };
  const common = {
    next: { enabled: stepValid && !saving, label: step === 'jersey' ? 'Save' : 'Next', loading: saving, onPress: goNext },
    onBack: goBack,
    progress: 0.36 + index * 0.06,
  };
  const failure = saveError ? <Text accessibilityRole="alert" style={styles.saveError}>{saveError}</Text> : null;

  switch (step) {
    case 'name':
      return (
        <StepScreen {...common} icon={<JerseyMark size={96} />} title="What’s your name?">
          <StepField autoCapitalize="words" autoComplete="name" autoCorrect={false} autoFocus label="Full name" maxLength={80} onBlur={() => touch('fullName')} onChangeText={(fullName) => update({ fullName })} onSubmitEditing={goNext} placeholder="Your full name" returnKeyType="next" textContentType="name" value={draft.fullName} />
        </StepScreen>
      );
    case 'birthday':
      return (
        <StepScreen {...common} icon={<JerseyMark size={96} />} title="When’s your birthday?">
          <BirthdayWheels onChange={(birthDate) => update({ birthDate })} value={draft.birthDate} />
          {keepsSavedAge ? <Text style={styles.hint}>Already saved. Change it only if it’s wrong.</Text> : null}
        </StepScreen>
      );
    case 'grade':
      return (
        <StepScreen {...common} icon={<JerseyMark size={96} />} title="What grade are you in?" top="tight">
          <ChoiceRows label="Grade" onChange={(grade) => update({ grade })} options={GRADES.map((grade) => ({ value: grade, label: grade }))} value={draft.grade as Grade | null} />
        </StepScreen>
      );
    case 'sport':
      return (
        <StepScreen {...common} icon={<JerseyMark size={96} />} title="What do you play?" top={teamSport ? 'open' : 'tight'}>
          {teamSport && team?.preview ? (
            <TeamSportField sport={teamSport} teamName={team.preview.teamName} pending={team.status === 'pending'} />
          ) : (
            <ChoiceRows label="Sport" onChange={(value) => update({ sport: value })} options={SPORTS.map((value) => ({ value, label: value }))} value={draft.sport as (typeof SPORTS)[number] | null} />
          )}
        </StepScreen>
      );
    case 'jersey':
      return (
        <StepScreen {...common} icon={<JerseyMark size={96} />} title="Jersey number">
          <StepField autoFocus inputMode="numeric" keyboardType="number-pad" label="Jersey number" maxLength={3} onChangeText={(text) => update({ jersey: text.replace(/\D/g, '').slice(0, 3) })} onSubmitEditing={goNext} placeholder="12" returnKeyType="done" value={draft.jersey} />
          {failure}
        </StepScreen>
      );
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const THIS_YEAR = new Date().getFullYear();
// Middle and high school athletes, with room either side.
const YEARS = Array.from({ length: 16 }, (_, i) => THIS_YEAR - 22 + i);
const pad = (n: number) => String(n).padStart(2, '0');

/** Month · day · year wheels writing the same "MM / DD / YYYY" the typed field used. */
function BirthdayWheels({ value, onChange }: { value: string; onChange: (birthDate: string) => void }) {
  const digits = value.replace(/\D/g, '');
  const month = digits.length === 8 ? Number(digits.slice(0, 2)) : 1;
  const year = digits.length === 8 ? Number(digits.slice(4, 8)) : THIS_YEAR - 15;
  const days = new Date(year, month, 0).getDate();
  const day = digits.length === 8 ? Math.min(Number(digits.slice(2, 4)), days) : 1;
  const set = (m: number, d: number, y: number) => onChange(`${pad(m)} / ${pad(Math.min(d, new Date(y, m, 0).getDate()))} / ${y}`);
  // Write the default once so "Next" is enabled without the athlete having to scroll.
  useEffect(() => { if (digits.length !== 8) set(month, day, year); });
  return (
    <View style={styles.wheels}>
      <Wheel format={(m) => MONTHS[m - 1]} items={Array.from({ length: 12 }, (_, i) => i + 1)} label="Birth month" onChange={(m) => set(m, day, year)} value={month} width={92} />
      <Wheel items={Array.from({ length: days }, (_, i) => i + 1)} label="Birth day" onChange={(d) => set(month, d, year)} value={day} width={64} />
      <Wheel items={YEARS} label="Birth year" onChange={(y) => set(month, day, y)} value={year} width={92} />
    </View>
  );
}

// The team decides the sport, so it's shown, not editable. A pending request says so.
function TeamSportField({ sport, teamName, pending }: { sport: string; teamName: string; pending: boolean }) {
  return (
    <View>
      <Text style={[styles.label]}>Sport</Text>
      <View accessible accessibilityLabel={`Sport, ${sport}, set by ${teamName}`} style={styles.readOnly}>
        <Text numberOfLines={1} style={[styles.readOnlyText]}>{sport}</Text>
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
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  title: { flex: 1 },
  form: { gap: 16 },
  // Keep an open dropdown above the fields that follow it.
  select: { zIndex: 1 },
  label: { color: Entry.ink, fontWeight: '500', fontSize: 13.5, letterSpacing: -0.1, marginBottom: 8, marginLeft: 4 },
  // Set by the team: shown, not editable, so it reads as information rather than a field.
  readOnly: { height: 60, borderRadius: 16, borderWidth: 1, borderColor: Entry.line, backgroundColor: Entry.canvas, justifyContent: 'center', paddingHorizontal: 18 },
  readOnlyText: { color: Entry.ink, fontWeight: '500', fontSize: 16, letterSpacing: -0.1 },
  hint: { color: Entry.subtle, fontWeight: '400', fontSize: 12.5, lineHeight: 17, marginTop: 7, marginLeft: 6 },
  spacer: { flexGrow: 1, minHeight: 28 },
  actions: { gap: 12 },
  wheels: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  saveError: { color: ATHLETE_ERROR, fontWeight: '400', fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
