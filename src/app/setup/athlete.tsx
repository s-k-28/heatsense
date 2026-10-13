import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { HeatSenseLogo } from '@/components/heatsense-logo';
import { MobileViewport } from '@/components/mobile-viewport';
import { INVITE_CODE_LENGTH, lookupInvite, requestToJoinTeam, type InviteLookup } from '@/services/team-invites';
import { getCurrentUserId, setAthleteTeam } from '@/state/onboarding';

// Athlete onboarding, step 1: join a team with the coach's invitation code.
// Visual source of truth is the sign-in screen ("Built for the heat."): same
// background, type, padding, header and white-outlined pill controls.
const SCREEN = '#090909';
const MUTED = '#B8B8B8';
const ERROR = '#FFB9A7';
const fontFamily = Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif', default: '"Helvetica Neue", Helvetica, Arial, sans-serif' });

const T = {
  surface: '#101010',
  surfaceHover: '#161616',
  outline: 'rgba(255,255,255,0.85)',
  outlineIdle: 'rgba(255,255,255,0.5)',
  outlineStrong: '#FFFFFF',
  outlineDisabled: 'rgba(255,255,255,0.22)',
  outlineError: 'rgba(255,185,167,0.75)',
} as const;

const easeOut = Easing.out(Easing.cubic);
const FOCUS_RING = { outlineColor: '#FFFFFF', outlineStyle: 'solid', outlineWidth: 2, outlineOffset: 3 } as const;
// The next athlete onboarding step isn't built yet; this is where the athlete flow lands today.
const NEXT_STEP = '/dashboard?role=athlete';

type Check =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'result'; lookup: InviteLookup }
  | { state: 'network-error' };

function BackChevron() {
  return <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="m15 5-7 7 7 7" /></Svg>;
}

function CheckIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
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
      <Text style={[styles.digit, { fontFamily }]}>{digit}</Text>
    </Animated.View>
  );
}

// Matches "Continue with Google": full-width 60px pill, white outline, dark interior, white text.
function JoinButton({ label, enabled, loading, onPress }: { label: string; enabled: boolean; loading: boolean; onPress: () => void }) {
  const ms = useMs();
  const [focused, setFocused] = useState(false);
  const hover = useSharedValue(0);
  const press = useSharedValue(0);
  const frame = useAnimatedStyle(() => ({
    borderColor: interpolateColor(hover.value, [0, 1], [T.outline, T.outlineStrong]),
    backgroundColor: interpolateColor(hover.value, [0, 1], [SCREEN, T.surfaceHover]),
    transform: [{ scale: 1 - press.value * 0.015 }],
  }));

  if (!enabled) {
    return (
      <View accessible accessibilityRole="button" accessibilityLabel={label} aria-disabled aria-busy={loading} style={[styles.join, styles.joinDisabled]}>
        {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={[styles.joinText, styles.joinTextDisabled, { fontFamily }]}>{label}</Text>}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onHoverIn={() => { hover.set(withTiming(1, { duration: ms(200), easing: easeOut })); }}
      onHoverOut={() => { hover.set(withTiming(0, { duration: ms(200), easing: easeOut })); }}
      onPressIn={() => { press.set(withTiming(1, { duration: ms(110), easing: easeOut })); }}
      onPressOut={() => { press.set(withTiming(0, { duration: ms(200), easing: easeOut })); }}
      style={[{ borderRadius: 9999 }, focused && FOCUS_RING]}>
      <Animated.View style={[styles.join, frame]}>
        <Text style={[styles.joinText, { fontFamily }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

function lookupMessage(lookup: InviteLookup) {
  switch (lookup.status) {
    case 'not-found': return "That code wasn't found. Check it and try again.";
    case 'expired': return 'This code has expired. Ask your coach for a new one.';
    case 'rate-limited': return `Too many attempts. Try again in ${Math.max(1, Math.ceil(lookup.retryAfterSeconds / 60))} min.`;
    default: return null;
  }
}

export default function AthleteJoinTeamScreen() {
  return <MobileViewport><View style={[styles.fill, { backgroundColor: SCREEN }]}><Content /></View></MobileViewport>;
}

function Content() {
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
  const [pending, setPending] = useState(false);
  const [noCodeHover, setNoCodeHover] = useState(false);

  const compact = size.height > 0 && size.height < 760;
  const headlineSize = Math.max(38, Math.min(46, Math.floor((size.width - 44) * 0.14)));
  const contentWidth = Math.max(0, size.width - 44);
  const gap = 12;
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
  const codeError = check.state === 'result' ? lookupMessage(check.lookup) : check.state === 'network-error' ? "We couldn't check that code. Check your connection and try again." : null;

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
      const request = await requestToJoinTeam(code, userId);
      setAthleteTeam({ status: 'pending', teamId: request.teamId });
      setPending(true);
    } catch (reason) {
      setJoinError(reason instanceof Error ? reason.message : "We couldn't send your request. Try again.");
    } finally {
      setJoining(false);
    }
  };

  const skip = () => {
    setAthleteTeam({ status: 'unassigned', teamId: null });
    router.push(NEXT_STEP as never);
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace('/role'));
  const activeIndex = focused && !pending ? Math.min(code.length, INVITE_CODE_LENGTH - 1) : -1;

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined} onLayout={(event: LayoutChangeEvent) => setSize(event.nativeEvent.layout)}>
      <StatusBar style="light" />
      <ScrollView
        bounces={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + 8, compact ? 36 : 56), paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <Animated.View entering={fade(200)} style={styles.topRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} hitSlop={8} style={({ pressed }) => [styles.circle, pressed && styles.pressed]}>
            <BackChevron />
          </Pressable>
          <View style={styles.logoPlate}><HeatSenseLogo height={24} /></View>
        </Animated.View>

        <Animated.Text
          entering={rise(350)}
          accessibilityRole="header"
          style={[styles.headline, { fontFamily, fontSize: headlineSize, lineHeight: Math.round(headlineSize * 1.15), marginTop: compact ? 22 : 40 }]}>
          {'Your team\nawaits.'}
        </Animated.Text>
        <Animated.Text entering={rise(550)} style={[styles.description, { fontFamily }]}>Enter the code shared by your coach to get connected.</Animated.Text>

        {/* One real input drives every box: typing, pasting, deleting and the numeric keyboard all come from it. */}
        <View style={[styles.codeWrap, { marginTop: compact ? 28 : 44 }]}>
          <View style={[styles.codeRow, { gap }]}>
            {Array.from({ length: INVITE_CODE_LENGTH }, (_, index) => (
              <Animated.View key={index} entering={rise(750 + index * 60)}>
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
              <Text style={[styles.statusText, { fontFamily }]}>Checking code…</Text>
            </Animated.View>
          )}
          {codeError && (
            <Animated.View entering={fade(0)} style={styles.statusRow}>
              <Text accessibilityRole="alert" style={[styles.errorText, { fontFamily }]}>{codeError}</Text>
              {check.state === 'network-error' && (
                <Pressable accessibilityRole="button" onPress={() => void verify(code)} hitSlop={8}>
                  <Text style={[styles.retry, { fontFamily }]}>Try again</Text>
                </Pressable>
              )}
            </Animated.View>
          )}
          {valid && (
            <Animated.View entering={fade(0)} style={styles.preview}>
              <CheckIcon />
              <View style={styles.previewCopy}>
                <Text numberOfLines={1} style={[styles.teamName, { fontFamily }]}>{valid.team.teamName}</Text>
                <Text numberOfLines={1} style={[styles.teamMeta, { fontFamily }]}>{[valid.team.school, valid.team.sport].filter(Boolean).join(' · ')}</Text>
              </View>
            </Animated.View>
          )}
          {pending && (
            <Animated.Text entering={fade(0)} style={[styles.statusText, styles.pendingText, { fontFamily }]}>
              Request sent. You’ll be added once your coach approves it.
            </Animated.Text>
          )}
          {joinError && <Text accessibilityRole="alert" style={[styles.errorText, styles.joinError, { fontFamily }]}>{joinError}</Text>}
        </View>

        <View style={styles.spacer} />

        <Animated.View entering={rise(1000)}>
          {pending
            ? <JoinButton label="Continue →" enabled loading={false} onPress={() => router.push(NEXT_STEP as never)} />
            : <JoinButton label="Join team →" enabled={valid !== null && !joining} loading={joining} onPress={() => void join()} />}
        </Animated.View>

        {!pending && (
          <Animated.View entering={fade(1150)} style={styles.noCodeWrap}>
            <Pressable
              accessibilityRole="button"
              onPress={skip}
              onHoverIn={() => setNoCodeHover(true)}
              onHoverOut={() => setNoCodeHover(false)}
              onFocus={() => setNoCodeHover(true)}
              onBlur={() => setNoCodeHover(false)}
              hitSlop={10}>
              <Text style={[styles.noCode, { fontFamily }, noCodeHover && styles.underline]}>I don’t have a code</Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 22 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  circle: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: '#FFFFFF', backgroundColor: SCREEN, alignItems: 'center', justifyContent: 'center' },
  logoPlate: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(9,9,9,0.62)', alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  headline: { color: '#FFFFFF', fontWeight: '400', letterSpacing: -0.6 },
  description: { color: MUTED, fontSize: 16, lineHeight: 23, fontWeight: '400', marginTop: 10, maxWidth: 340 },
  codeWrap: { alignSelf: 'center' },
  codeRow: { flexDirection: 'row', justifyContent: 'center' },
  box: { borderRadius: 16, borderWidth: 1.5, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  digit: { color: '#FFFFFF', fontSize: 27, fontWeight: '500' },
  hiddenInput: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.01, color: 'transparent', fontSize: 16 },
  status: { minHeight: 56, marginTop: 22, alignItems: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 8 },
  statusText: { color: MUTED, fontSize: 14.5, lineHeight: 20 },
  pendingText: { textAlign: 'center', marginTop: 14 },
  errorText: { color: ERROR, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  joinError: { marginTop: 12 },
  retry: { color: '#FFFFFF', fontSize: 14, lineHeight: 20, textDecorationLine: 'underline' },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch', paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.18)' },
  previewCopy: { flex: 1, gap: 2 },
  teamName: { color: '#FFFFFF', fontSize: 18, lineHeight: 23, fontWeight: '500', letterSpacing: -0.2 },
  teamMeta: { color: MUTED, fontSize: 14.5, lineHeight: 20 },
  spacer: { flexGrow: 1, minHeight: 24 },
  join: { height: 60, borderRadius: 9999, borderWidth: 1.5, borderColor: T.outline, backgroundColor: SCREEN, alignItems: 'center', justifyContent: 'center' },
  joinDisabled: { borderColor: T.outlineDisabled },
  joinText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', letterSpacing: -0.1 },
  joinTextDisabled: { opacity: 0.4 },
  noCodeWrap: { alignItems: 'center', marginTop: 18 },
  noCode: { color: MUTED, fontSize: 14, lineHeight: 20 },
  underline: { textDecorationLine: 'underline' },
});
