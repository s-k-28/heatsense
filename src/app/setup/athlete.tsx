import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from 'react-native';
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
import Svg, { Path } from 'react-native-svg';

import { RosterMark } from '@/components/onboarding-art';
import { StepLink, StepScreen } from '@/components/step-kit';
import { Entry } from '@/constants/entry-theme';
import { INVITE_CODE_LENGTH, lookupInvite, NETWORK_ERROR, requestToJoinTeam, type MemberRole, watchMyMembership, type InviteLookup } from '@/services/team-invites';
import { getCurrentUserId, setAthleteTeam } from '@/state/onboarding';

// Athlete onboarding, step 1: join a team with the coach's invitation code.
// Entry design language (welcome / sign-in / role): a medium Fieldline scene, a
// display headline, neutral code boxes with a light-blue active edge, and the peach
// primary action.
const MUTED = Entry.muted;
const ERROR = Entry.error;

const T = {
  surface: Entry.surface,
  outline: Entry.lineStrong,
  outlineIdle: Entry.line,
  outlineStrong: Entry.blue,
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

function CheckIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Entry.blue} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21.8 10A10 10 0 1 1 17 3.34" /><Path d="m9 11 3 3L22 4" />
    </Svg>
  );
}

function useMs() {
  const reducedMotion = useReducedMotion();
  return useCallback((value: number) => (reducedMotion ? 0 : value), [reducedMotion]);
}

function CodeBox({ digit, active, error, width, height }: { digit: string; active: boolean; error: boolean; width: number; height: number }) {
  const ms = useMs();
  const focus = useSharedValue(active ? 1 : 0);
  useEffect(() => { focus.set(withTiming(active ? 1 : 0, { duration: ms(180), easing: easeOut })); }, [active, focus, ms]);
  const idle = error ? T.outlineError : digit ? T.outline : T.outlineIdle;
  const frame = useAnimatedStyle(() => ({ borderColor: interpolateColor(focus.value, [0, 1], [idle, T.outlineStrong]) }));
  return (
    <Animated.View style={[styles.box, { width, height }, frame]}>
      <Text style={[styles.digit]}>{digit}</Text>
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
  return <Content role={role} />;
}

function Content({ role }: { role: MemberRole }) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const inputRef = useRef<TextInput>(null);
  const checkId = useRef(0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
  const [check, setCheck] = useState<Check>({ state: 'idle' });
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [pending, setPending] = useState<'pending' | 'member' | null>(null);

  // Live membership: picks up a request sent earlier (after a refresh) and the
  // coach's approval or decline without the athlete reloading anything.
  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) return;
    return watchMyMembership(userId, (membership) => {
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
    }, () => {});
  }, []);

  const compact = size.height > 0 && size.height < 760;
  const contentWidth = Math.max(0, size.width || 340);
  const gap = 8;
  const boxWidth = Math.min(62, Math.floor((contentWidth - gap * (INVITE_CODE_LENGTH - 1)) / INVITE_CODE_LENGTH));
  const boxHeight = compact ? 62 : 66;

  const rise = (delay: number) => (reducedMotion ? undefined : FadeInUp.delay(delay).duration(520).easing(easeOut));
  const fade = (delay: number) => (reducedMotion ? undefined : FadeIn.delay(delay).duration(450).easing(easeOut));

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
    <StepScreen
      icon={<RosterMark size={96} />}
      next={pending
        ? { enabled: true, label: 'Continue', onPress: () => router.push(NEXT_STEP[role] as never) }
        : { enabled: valid !== null && !joining, label: 'Join team', loading: joining, onPress: () => void join() }}
      onBack={back}
      progress={0.3}
      title="Enter your team code">
      {/* One real input drives every box: typing, pasting, deleting and the numeric keyboard all come from it. */}
      <View onLayout={(event: LayoutChangeEvent) => setSize(event.nativeEvent.layout)} style={styles.codeWrap}>
        <View style={[styles.codeRow, { gap }]}>
          {Array.from({ length: INVITE_CODE_LENGTH }, (_, index) => (
            <Animated.View key={index} entering={rise(150 + index * 50)}>
              <CodeBox digit={code[index] ?? ''} active={index === activeIndex} error={codeError !== null} width={boxWidth} height={boxHeight} />
            </Animated.View>
          ))}
        </View>
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={onChangeCode}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          editable={!pending}
          autoFocus
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
              <Pressable accessibilityRole="button" onPress={() => void verify(code)} hitSlop={8}>
                <Text style={[styles.retry]}>Try again</Text>
              </Pressable>
            )}
          </Animated.View>
        )}
        {valid && (
          <Animated.View entering={fade(0)} style={styles.preview}>
            <CheckIcon />
            <View style={styles.previewCopy}>
              <Text numberOfLines={1} style={[styles.teamName]}>{valid.team.teamName}</Text>
              <Text numberOfLines={1} style={[styles.teamMeta]}>{[valid.team.school, valid.team.sport].filter(Boolean).join(' · ')}</Text>
            </View>
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
        {joinError && <Text accessibilityRole="alert" style={[styles.errorText, styles.joinError]}>{joinError}</Text>}
      </View>

      {!pending && <StepLink label="I don’t have a code" onPress={skip} />}
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 26 },
  codeWrap: { alignSelf: 'center' },
  codeRow: { flexDirection: 'row', justifyContent: 'center' },
  box: { borderRadius: 14, borderWidth: 1.5, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  digit: { color: Entry.ink, fontWeight: '600', fontSize: 26 },
  hiddenInput: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.01, color: 'transparent', fontSize: 16 },
  status: { minHeight: 56, marginTop: 20, alignItems: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 8 },
  statusText: { color: MUTED, fontWeight: '400', fontSize: 14, lineHeight: 20 },
  pendingWrap: { alignItems: 'center', marginTop: 14, gap: 4 },
  pendingTitle: { color: Entry.ink, fontWeight: '600', fontSize: 16, lineHeight: 22, textAlign: 'center' },
  pendingText: { textAlign: 'center' },
  errorText: { color: ERROR, fontWeight: '400', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  joinError: { marginTop: 12 },
  retry: { color: Entry.ink, fontWeight: '500', fontSize: 14, lineHeight: 20, textDecorationLine: 'underline' },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch', paddingTop: 16, borderTopWidth: 1, borderTopColor: Entry.line },
  previewCopy: { flex: 1, gap: 2 },
  teamName: { color: Entry.ink, fontWeight: '600', fontSize: 17, lineHeight: 23, letterSpacing: -0.2 },
  teamMeta: { color: MUTED, fontWeight: '400', fontSize: 14, lineHeight: 20 },
  spacer: { flexGrow: 1, minHeight: 24 },
  noCodeWrap: { alignItems: 'center', marginTop: 16 },
  noCode: { color: MUTED, fontWeight: '500', fontSize: 14, lineHeight: 20 },
  underline: { textDecorationLine: 'underline' },
});
