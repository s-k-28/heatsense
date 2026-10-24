import { AnimatedText, Text, TextInput } from '@/components/ui/text';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ui/action-button';
import { BandSpot } from '@/components/band/band-journey';
import { AthleteHeader, AthletePillButton as JoinButton } from '@/components/onboarding/athlete-onboarding';
import { EntryButton, EntryHeading, entryStyles } from '@/components/onboarding/entry-ui';
import { OnboardingBackground } from '@/components/onboarding/onboarding-background';
import { Entry } from '@/constants/entry-theme';
import { MobileViewport } from '@/components/layout/mobile-viewport';
import { INVITE_CODE_LENGTH, lookupInvite, NETWORK_ERROR, requestToJoinTeam, type MemberRole, watchMyMembership, type InviteLookup } from '@/services/team-invites';
import { getCurrentUserId, setAthleteTeam } from '@/state/onboarding';

// Athlete onboarding, step 1: join a team with the coach's invitation code.
// A focused, centered page: the two-tone headline, the six code boxes in the middle of
// the screen (peach edge on the active box, all six warm to peach once the team is
// found), then the peach pill. The curves frame it from above and below, never behind it.
const SCREEN = Entry.canvas;
const MUTED = Entry.muted;
const ERROR = Entry.error;

const T = {
  surface: Entry.surface,
  outline: Entry.lineStrong,
  outlineIdle: Entry.line,
  outlineStrong: Entry.peach,
  outlineError: Entry.error,
} as const;

const easeOut = Easing.out(Easing.cubic);
// Next: athlete onboarding page 1, "Make it yours." (whether or not they joined a team).
// Athletes go on to their profile; trainers have no profile steps and land on What to expect.
const NEXT_STEP: Record<MemberRole, string> = { athlete: '/athlete/profile', trainer: '/ready?role=Athletic%20trainer' };

type Check =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'result'; lookup: InviteLookup }
  | { state: 'network-error' };

function useMs() {
  const reducedMotion = useReducedMotion();
  return useCallback((value: number) => (reducedMotion ? 0 : value), [reducedMotion]);
}

function CodeBox({ digit, active, error, found, width, height }: { digit: string; active: boolean; error: boolean; found: boolean; width: number; height: number }) {
  const ms = useMs();
  const focus = useSharedValue(active ? 1 : 0);
  const success = useSharedValue(found ? 1 : 0);
  useEffect(() => { focus.set(withTiming(active ? 1 : 0, { duration: ms(180), easing: easeOut })); }, [active, focus, ms]);
  useEffect(() => { success.set(withTiming(found ? 1 : 0, { duration: ms(250), easing: easeOut })); }, [found, ms, success]);
  const idle = error ? T.outlineError : digit ? T.outline : T.outlineIdle;
  // The active box lifts 2 px; a found code warms every box to a peach edge and tint.
  const frame = useAnimatedStyle(() => ({
    borderColor: interpolateColor(Math.max(focus.value, success.value), [0, 1], [idle, T.outlineStrong]),
    backgroundColor: interpolateColor(success.value, [0, 1], [T.surface, Entry.peachTint]),
    transform: [{ translateY: -2 * focus.value }],
  }));
  return (
    <Animated.View style={[styles.box, { width, minHeight: height, paddingVertical: 8 }, frame]}>
      {digit ? <AnimatedText key={digit} entering={ms(1) ? FadeIn.duration(160) : undefined} style={styles.digit}>{digit}</AnimatedText> : null}
    </Animated.View>
  );
}

function lookupMessage(lookup: InviteLookup) {
  switch (lookup.status) {
    case 'not-found': return 'Code not found. Try again.';
    case 'expired': return 'This code has expired.';
    case 'rate-limited': return `Too many attempts. Try again in ${Math.max(1, Math.ceil(lookup.retryAfterSeconds / 60))} min.`;
    default: return null;
  }
}

export default function AthleteJoinTeamScreen() {
  return <JoinTeamScreen role="athlete" />;
}

/** Join a team with the coach's code, as an athlete or an athletic trainer. */
export function JoinTeamScreen({ role }: { role: MemberRole }) {
  return <MobileViewport><View style={[styles.fill, { backgroundColor: SCREEN }]}><Content role={role} /></View></MobileViewport>;
}

function Content({ role }: { role: MemberRole }) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const checkId = useRef(0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
  const [check, setCheck] = useState<Check>({ state: 'idle' });
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [pending, setPending] = useState<'pending' | 'member' | null>(null);
  const [membershipError, setMembershipError] = useState(false);
  const [membershipAttempt, setMembershipAttempt] = useState(0);

  // Live membership: picks up a request sent earlier (after a refresh) and the
  // coach's approval or decline without the athlete reloading anything.
  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) return;
    return watchMyMembership(userId, (membership) => {
      setMembershipError(false);
      if (membership?.status === 'active' || membership?.status === 'pending') {
        const status = membership.status === 'active' ? 'member' : 'pending';
        setPending(status);
        setAthleteTeam({ status, teamId: membership.teamId });
        return;
      }
      setPending((current) => {
        if (current && membership?.status === 'declined') setJoinError('Your coach declined this request. Check the code with your coach.');
        return null;
      });
      setAthleteTeam({ status: 'unassigned', teamId: null });
    }, () => setMembershipError(true));
  }, [membershipAttempt]);

  const compact = size.height > 0 && size.height < 760;
  const contentWidth = Math.max(0, size.width - 52);
  const gap = 8;
  const boxWidth = Math.min(62, Math.floor((contentWidth - gap * (INVITE_CODE_LENGTH - 1)) / INVITE_CODE_LENGTH));
  const boxHeight = compact ? 62 : 66;

  const rise = (delay: number) => (reducedMotion ? undefined : FadeInUp.delay(Math.min(delay, 60)).duration(240).easing(easeOut));
  const fade = (delay: number) => (reducedMotion ? undefined : FadeIn.delay(Math.min(delay, 60)).duration(240).easing(easeOut));

  const verify = useCallback(async (value: string) => {
    const id = ++checkId.current;
    setCheck({ state: 'checking' });
    try {
      const lookup = await lookupInvite(value);
      if (id === checkId.current) setCheck({ state: 'result', lookup });
    } catch {
      if (id === checkId.current) setCheck({ state: 'network-error' });
    }
  }, []);

  const onChangeCode = (text: string) => {
    if (pending) return;
    // Digits only; a pasted code ("12 34", "Code: 1234") collapses to its digits.
    const next = text.replace(/\D/g, '').slice(0, INVITE_CODE_LENGTH);
    setCode(next);
    setJoinError(null);
    if (next.length === INVITE_CODE_LENGTH) {
      Keyboard.dismiss();
      void verify(next);
    } else {
      checkId.current++;
      setCheck({ state: 'idle' });
    }
  };

  const valid = check.state === 'result' && check.lookup.status === 'valid' ? check.lookup : null;
  const codeError = check.state === 'result' ? lookupMessage(check.lookup) : check.state === 'network-error' ? NETWORK_ERROR : null;

  const join = async () => {
    if (!valid || joining || pending) return;
    const userId = getCurrentUserId();
    if (!userId) {
      setJoinError('Your session ended. Sign in again to join a team.');
      return;
    }
    setJoining(true);
    setJoinError(null);
    try {
      const request = await requestToJoinTeam(code, role);
      setAthleteTeam({ status: request.status, teamId: request.teamId });
      setPending(request.status);
    } catch (reason) {
      setJoinError(reason instanceof Error ? reason.message : NETWORK_ERROR);
    } finally {
      setJoining(false);
    }
  };

  const skip = () => {
    setAthleteTeam({ status: 'unassigned', teamId: null });
    router.push(NEXT_STEP[role] as never);
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace('/role'));
  const activeIndex = focused && !pending ? Math.min(code.length, INVITE_CODE_LENGTH - 1) : -1;

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined} onLayout={(event: LayoutChangeEvent) => setSize(event.nativeEvent.layout)}>
      <StatusBar style="light" />
      <OnboardingBackground drawIn={250} variant="code" />
      <ScrollView
        bounces={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={{ marginTop: insets.top }}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(12, 26 - insets.top), paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <Animated.View entering={fade(200)}>
          <AthleteHeader bandDock={false} onBack={back} step={role === 'athlete' ? 1 : undefined} />
        </Animated.View>

        <View style={[styles.above, styles.bandRoom]}><BandSpot height={compact ? 100 : 130} id={`join-${role}`} /></View>
        <EntryHeading accent="awaits." align="center" compact={compact} delay={300} lead="Your team" />
        <AnimatedText entering={fade(600)} style={[entryStyles.description, styles.centered]}>Enter the six-digit code from your coach.</AnimatedText>

        {/* One real input drives every box: typing, pasting, deleting and the numeric keyboard all come from it. */}
        <View style={[styles.codeWrap, { marginTop: compact ? 24 : 30 }]}>
          <Pressable accessible={false} onPress={() => inputRef.current?.focus()} style={[styles.codeRow, { gap }]}>
            {Array.from({ length: INVITE_CODE_LENGTH }, (_, index) => (
              <Animated.View key={index} entering={rise(750 + index * 60)}>
                <CodeBox digit={code[index] ?? ''} active={index === activeIndex} error={codeError !== null} found={valid !== null || pending !== null} width={boxWidth} height={boxHeight} />
              </Animated.View>
            ))}
          </Pressable>
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={onChangeCode}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            editable={!pending}
            keyboardType="number-pad"
            inputMode="numeric"
            autoComplete="off"
            autoCorrect={false}
            caretHidden
            returnKeyType="done"
            onSubmitEditing={() => { if (code.length === INVITE_CODE_LENGTH) void verify(code); }}
            accessibilityLabel={`Team code, ${INVITE_CODE_LENGTH} digits`}
            accessibilityHint="Enter the code from your coach"
            style={styles.hiddenInput}
          />
        </View>

        <View style={styles.status} aria-live="polite">
          {check.state === 'checking' && (
            <Animated.View entering={fade(0)} style={styles.statusRow}>
              <ActivityIndicator size="small" color={MUTED} />
              <Text style={[styles.statusText]}>Checking code…</Text>
            </Animated.View>
          )}
          {codeError && (
            <Animated.View entering={fade(0)} style={styles.statusRow}>
              <Text accessibilityRole="alert" style={[styles.errorText]}>{codeError}</Text>
              {check.state === 'network-error' && (
                <ActionButton label="Try again" onPress={() => { void verify(code); }} variant="text" />
              )}
            </Animated.View>
          )}
          {valid && (
            <Animated.View entering={rise(0)} accessibilityLiveRegion="polite" style={styles.preview}>
              <Text style={styles.found}>Team found</Text>
              <Text style={[styles.teamName]}>{valid.team.teamName}</Text>
              <Text style={[styles.teamMeta]}>{[valid.team.school, valid.team.sport].filter(Boolean).join(' · ')}</Text>
            </Animated.View>
          )}
          {pending && (
            <Animated.View key={pending} entering={fade(0)} style={styles.pendingWrap}>
              <Text style={[styles.pendingTitle]}>{pending === 'member' ? 'You’re on the team.' : 'Request sent.'}</Text>
              <Text style={[styles.statusText, styles.pendingText]}>
                {pending === 'member' ? 'Your coach approved your request.' : 'Your coach will approve your request to join the team.'}
              </Text>
            </Animated.View>
          )}
          {membershipError ? <View style={styles.membershipNotice}>
            <Text accessibilityRole="alert" style={styles.errorText}>Couldn’t refresh your team status.</Text>
            <ActionButton label="Retry team status" onPress={() => { setMembershipError(false); setMembershipAttempt((value) => value + 1); }} variant="text" />
          </View> : null}
          {joinError && <Text accessibilityRole="alert" style={[styles.errorText, styles.joinError]}>{joinError}</Text>}
        </View>

        <View style={styles.spacer} />

        <Animated.View entering={rise(1000)}>
          {pending
            ? <JoinButton label="Continue" enabled loading={false} onPress={() => router.push(NEXT_STEP[role] as never)} />
            : <EntryButton label="Join team" disabled={!valid || joining} loading={joining} loadingLabel="Sending request…" onPress={() => void join()} />}
        </Animated.View>

        {!pending && (
          <Animated.View entering={fade(1150)} style={styles.noCodeWrap}>
            <ActionButton label="I don’t have a code" onPress={skip} variant="text" />
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 26 },
  // Equal open space above the headline and below the status centers the code on the page.
  above: { flexGrow: 1, minHeight: 20 },
  bandRoom: { alignItems: 'center', justifyContent: 'center' },
  centered: { alignSelf: 'center', textAlign: 'center' },
  codeWrap: { alignSelf: 'center' },
  codeRow: { flexDirection: 'row', justifyContent: 'center' },
  box: { borderRadius: 22, borderWidth: 1.5, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  digit: { color: Entry.ink, fontFamily: Entry.heading, fontSize: 27, letterSpacing: -0.5 },
  // iOS ignores taps on views at 1% opacity or less, so the input stays just above that.
  hiddenInput: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.02, color: 'transparent', fontSize: 16 },
  status: { minHeight: 56, marginTop: 20, alignItems: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 8 },
  statusText: { color: MUTED, fontFamily: Entry.body, fontSize: 14, lineHeight: 20 },
  membershipNotice: { alignItems: 'center', gap: 4, marginTop: 12 },
  pendingWrap: { alignItems: 'center', marginTop: 14, gap: 4 },
  pendingTitle: { color: Entry.ink, fontFamily: Entry.strong, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  pendingText: { textAlign: 'center' },
  errorText: { color: ERROR, fontFamily: Entry.body, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  joinError: { marginTop: 12 },
  preview: { alignItems: 'center', alignSelf: 'stretch', gap: 3, paddingVertical: 16, paddingHorizontal: 20, borderRadius: 22, backgroundColor: Entry.peachTint },
  found: { color: Entry.peach, fontFamily: Entry.medium, fontSize: 14, lineHeight: 20 },
  teamName: { color: Entry.ink, fontFamily: Entry.heading, fontSize: 20, lineHeight: 26, letterSpacing: -0.5 },
  teamMeta: { color: MUTED, fontFamily: Entry.body, fontSize: 14, lineHeight: 20 },
  spacer: { flexGrow: 1, minHeight: 24 },
  noCodeWrap: { alignItems: 'center', marginTop: 16 },
});
