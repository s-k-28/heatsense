import * as Clipboard from 'expo-clipboard';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, Share, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';

import { RosterMark } from '@/components/onboarding-art';
import { StepScreen } from '@/components/step-kit';
import { Entry } from '@/constants/entry-theme';
import {
  ensureTeamInvite,
  getMyTeamInvite,
  INVITE_CODE_LENGTH,
  NETWORK_ERROR,
  regenerateInvite,
  respondToJoinRequest,
  watchPendingAthletes,
  type PendingAthlete,
  type TeamInvite,
  type TeamSummary,
} from '@/services/team-invites';
import { setTeamId, useTeamDraft, type TeamDraft } from '@/state/onboarding';

// Entry design language: display headline, the code in the display face over field
// lines, quiet outlined secondary actions, and the peach primary button.
const MUTED = Entry.muted;
const FOCUS_RING = { outlineColor: Entry.blue, outlineStyle: 'solid', outlineWidth: 2, outlineOffset: 3 } as const;
const isKeyboardFocus = (event: { target?: unknown }) => Platform.OS !== 'web' || Boolean((event.target as Element | null)?.matches?.(':focus-visible'));
const ease = Easing.out(Easing.cubic);

const inviteMessage = (code: string) => `Join my team on HeatSense! Use code ${code} to get started.`;

export default function InviteTeamScreen() {
  const draft = useTeamDraft();
  // Without a finished draft (a page refresh, or a coach coming back later) the
  // screen loads the coach's existing team from the server instead.
  const complete = Boolean(draft.school.trim() && draft.teamName.trim() && draft.sport && draft.level);
  return <Content draft={complete ? draft : null} />;
}

function Content({ draft }: { draft: TeamDraft | null }) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [team, setTeam] = useState<TeamSummary | null>(null);
  const [invite, setInvite] = useState<TeamInvite | null>(null);
  const [noTeam, setNoTeam] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const compact = size.height > 0 && size.height < 720;

  const school = draft?.school ?? '';
  const teamName = draft?.teamName ?? '';
  const sport = draft?.sport ?? '';
  const level = draft?.level ?? '';
  useEffect(() => {
    let cancelled = false;
    const details = { school, teamName, sport, level };
    // Both calls are idempotent on the server: they return the team's live code and only issue one if it has none.
    const load = teamName ? ensureTeamInvite(details).then((result) => ({ team: details, invite: result })) : getMyTeamInvite();
    load
      .then((result) => {
        if (cancelled) return;
        if (!result) { setNoTeam(true); return; }
        setTeamId(result.invite.teamId);
        setTeam(result.team);
        setInvite(result.invite);
        setLoadError(null);
      })
      .catch((reason) => { if (!cancelled) setLoadError(reason instanceof Error ? reason.message : NETWORK_ERROR); });
    return () => { cancelled = true; };
  }, [school, teamName, sport, level, attempt]);

  const fade = (delay: number) => (reducedMotion ? undefined : FadeIn.delay(delay).duration(420));

  const back = () => (router.canGoBack() ? router.back() : router.replace('/team/create'));
  const next = () => { if (invite) router.push('/ready?role=Coach'); };

  // No draft and no team on the server yet: start at Create Your Team.
  if (noTeam) return <Redirect href="/team/create" />;

  return (
    <StepScreen
      icon={<RosterMark size={96} />}
      next={{ enabled: invite !== null, label: 'Continue', onPress: next }}
      onBack={back}
      progress={0.8}
      title={`Invite athletes to ${team?.teamName || teamName || 'your team'}`}
      top="tight">
      <View onLayout={(event: LayoutChangeEvent) => setSize(event.nativeEvent.layout)}>
        <Text numberOfLines={1} style={styles.teamMeta}>{[team?.school ?? school, team?.sport ?? sport, team?.level ?? level].filter(Boolean).join(' · ')}</Text>
        <CodeTiles invite={invite} compact={compact} width={size.width + 44} firstDelay={reducedMotion ? 0 : 250} />
        <View style={styles.status}>
          {loadError ? (
            <Animated.View entering={fade(0)} style={styles.errorRow}>
              <Text style={[styles.errorText]}>{loadError}</Text>
              <Pressable accessibilityRole="button" onPress={() => { setLoadError(null); setAttempt((n) => n + 1); }} hitSlop={8}>
                <Text style={[styles.retry]}>Try again</Text>
              </Pressable>
            </Animated.View>
          ) : invite ? (
            <Animated.Text key={invite.code} entering={fade(150)} style={[styles.expiry]}>
              Expires {new Date(invite.expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </Animated.Text>
          ) : (
            <ActivityIndicator size="small" color={MUTED} accessibilityLabel="Creating your invitation code" />
          )}
        </View>
      </View>
      <View style={{ gap: 10 }}>
        <CopyButton code={invite?.code ?? null} />
        <ShareButton code={invite?.code ?? null} />
      </View>
      <RegenerateControl invite={invite} onRegenerated={setInvite} />
      {invite && <JoinRequests teamId={invite.teamId} />}
    </StepScreen>
  );
}

// Display-only code tiles. Each tile fades and scales up (0.96 → 1) in turn; a new
// code (after regenerating) replays the same reveal.
function CodeTiles({ invite, compact, width, firstDelay }: { invite: TeamInvite | null; compact: boolean; width: number; firstDelay: number }) {
  const digits: (string | null)[] = invite ? invite.code.split('') : Array.from({ length: INVITE_CODE_LENGTH }, () => null);
  // The first code waits for the page entrance; a regenerated code reveals right away.
  const [firstCode, setFirstCode] = useState<string | null>(null);
  if (invite && firstCode === null) setFirstCode(invite.code);
  const delay = !invite || invite.code === firstCode ? firstDelay : 0;
  // Six tiles share the row: as wide as the screen allows, up to 54pt.
  const gap = compact ? 8 : 10;
  const available = Math.max(0, (width || 390) - 44);
  const tileWidth = Math.min(54, Math.floor((available - gap * (INVITE_CODE_LENGTH - 1)) / INVITE_CODE_LENGTH));
  const size = { width: tileWidth, height: Math.round(tileWidth * (compact ? 1.2 : 1.28)), gap };
  return (
    <View
      accessible
      accessibilityLabel={invite ? `Invitation code ${digits.join(' ')}` : 'Invitation code loading'}
      style={[styles.tiles, { gap: size.gap, marginTop: compact ? 18 : 24 }]}>
      {digits.map((digit, index) => (
        <CodeTile key={index} digit={digit} code={invite?.code ?? null} delay={delay + index * 100} width={size.width} height={size.height} />
      ))}
    </View>
  );
}

function CodeTile({ digit, code, delay, width, height }: { digit: string | null; code: string | null; delay: number; width: number; height: number }) {
  const reducedMotion = useReducedMotion();
  const tile = useSharedValue(reducedMotion ? 1 : 0);
  const glyph = useSharedValue(reducedMotion || !digit ? 0 : 1);
  useEffect(() => {
    if (reducedMotion) { tile.set(1); glyph.set(digit ? 1 : 0); return; }
    tile.set(withDelay(delay, withTiming(1, { duration: 420, easing: ease })));
  }, [delay, reducedMotion, tile]); // eslint-disable-line react-hooks/exhaustive-deps -- the frame enters once
  useEffect(() => {
    if (!digit) return;
    if (reducedMotion) { glyph.set(1); return; }
    glyph.set(0);
    glyph.set(withDelay(delay + 120, withTiming(1, { duration: 360, easing: ease })));
  }, [code, delay, digit, glyph, reducedMotion]);
  const frame = useAnimatedStyle(() => ({ opacity: tile.value, transform: [{ scale: 0.96 + tile.value * 0.04 }] }));
  const text = useAnimatedStyle(() => ({ opacity: glyph.value, transform: [{ scale: 0.92 + glyph.value * 0.08 }] }));
  return (
    <Animated.View style={[{ width, height }, frame]}>
      <View style={[styles.tile, { width, height }]}>
        <Animated.Text style={[styles.digit, { fontSize: Math.round(width * 0.72), lineHeight: Math.round(width * 0.8) }, text]}>{digit ?? ''}</Animated.Text>
      </View>
    </Animated.View>
  );
}

// Outlined pill in the sign-in buttons' style: charcoal, white outline, bold white type.
function ActionPill({ label, icon, onPress, disabled, prominent, accessibilityLabel }: { label: string; icon: ReactNode; onPress: () => void; disabled?: boolean; prominent?: boolean; accessibilityLabel?: string }) {
  const reducedMotion = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const hover = useSharedValue(0);
  const press = useSharedValue(0);
  const ms = (value: number) => (reducedMotion ? 0 : value);
  const frame = useAnimatedStyle(() => ({
    borderColor: interpolateColor(hover.value, [0, 1], [prominent ? Entry.lineStrong : Entry.line, Entry.muted]),
    backgroundColor: interpolateColor(hover.value, [0, 1], [Entry.surface, Entry.raised]),
    transform: [{ scale: 1 - press.value * 0.015 }],
  }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      onFocus={(event) => setFocused(isKeyboardFocus(event))}
      onBlur={() => setFocused(false)}
      onHoverIn={() => { hover.set(withTiming(1, { duration: ms(200), easing: ease })); }}
      onHoverOut={() => { hover.set(withTiming(0, { duration: ms(200), easing: ease })); }}
      onPressIn={() => { press.set(withTiming(1, { duration: ms(110), easing: ease })); }}
      onPressOut={() => { press.set(withTiming(0, { duration: ms(200), easing: ease })); }}
      style={[{ borderRadius: 18 }, focused && FOCUS_RING]}>
      <Animated.View style={[styles.pill, disabled && styles.pillDisabled, frame]}>
        {icon}
        <Text style={[styles.pillText]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

function useFlash(duration = 1800) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const flash = useCallback((next: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(next);
    timer.current = setTimeout(() => setMessage(null), duration);
  }, [duration]);
  return [message, flash] as const;
}

function SwapIcon({ swapKey, children }: { swapKey: string; children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  return <Animated.View key={swapKey} entering={reducedMotion ? undefined : FadeIn.duration(180)} exiting={reducedMotion ? undefined : FadeOut.duration(120)}>{children}</Animated.View>;
}

function CopyButton({ code }: { code: string | null }) {
  const [flash, setFlash] = useFlash();
  const copy = async () => {
    if (!code) return;
    try {
      await Clipboard.setStringAsync(code);
      setFlash('Copied');
    } catch {
      setFlash("Couldn't copy");
    }
  };
  const copied = flash === 'Copied';
  return (
    <ActionPill
      label={flash ?? 'Copy code'}
      accessibilityLabel={flash ?? 'Copy code'}
      disabled={!code}
      onPress={copy}
      icon={<SwapIcon swapKey={copied ? 'check' : 'copy'}>{copied ? <CheckIcon /> : <CopyIcon />}</SwapIcon>}
    />
  );
}

function ShareButton({ code }: { code: string | null }) {
  const [flash, setFlash] = useFlash(2200);
  const share = async () => {
    if (!code) return;
    const message = inviteMessage(code);
    try {
      if (Platform.OS !== 'web') { await Share.share({ message }); return; }
      if (typeof navigator !== 'undefined' && navigator.share) { await navigator.share({ text: message }); return; }
      await Clipboard.setStringAsync(message);
      setFlash('Invitation copied');
    } catch (error) {
      // Closing the share sheet is not an error worth showing.
      if (error instanceof Error && error.name === 'AbortError') return;
      try { await Clipboard.setStringAsync(message); setFlash('Invitation copied'); } catch { setFlash("Couldn't share"); }
    }
  };
  const copied = flash === 'Invitation copied';
  return (
    <ActionPill
      prominent
      label={flash ?? 'Share invitation'}
      disabled={!code}
      onPress={share}
      icon={<SwapIcon swapKey={copied ? 'check' : 'share'}>{copied ? <CheckIcon /> : <ShareIcon />}</SwapIcon>}
    />
  );
}

// "Generate a new code" asks first, inline, since the old code stops working.
function RegenerateControl({ invite, onRegenerated }: { invite: TeamInvite | null; onRegenerated: (invite: TeamInvite) => void }) {
  const reducedMotion = useReducedMotion();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const regenerate = async () => {
    if (!invite || busy) return;
    setBusy(true);
    setError(null);
    try {
      onRegenerated(await regenerateInvite(invite.teamId));
      setConfirming(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  };

  if (!confirming) {
    return (
      <Pressable accessibilityRole="button" disabled={!invite} onPress={() => setConfirming(true)} hitSlop={8} style={({ pressed }) => [styles.textAction, pressed && { opacity: 0.75 }]}>
        <RefreshIcon />
        <Text style={[styles.textActionLabel]}>Generate a new code</Text>
      </Pressable>
    );
  }
  return (
    <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(200)} accessibilityLiveRegion="polite" style={styles.confirm}>
      <Text style={[styles.confirmText]}>Your current code will stop working. Athletes who haven&apos;t joined yet will need the new one.</Text>
      {error && <Text style={[styles.errorText, { textAlign: 'center' }]}>{error}</Text>}
      <View style={styles.confirmRow}>
        <SmallPill label="Cancel" onPress={() => { setConfirming(false); setError(null); }} disabled={busy} />
        <SmallPill label={busy ? 'Generating…' : 'Generate new code'} onPress={regenerate} disabled={busy} strong />
      </View>
    </Animated.View>
  );
}

// Live list of athletes waiting to join. Approving is the only way an athlete gets team access.
function JoinRequests({ teamId }: { teamId: string }) {
  const reducedMotion = useReducedMotion();
  const [athletes, setAthletes] = useState<PendingAthlete[] | null>(null);
  const [listenError, setListenError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ userId: string; message: string } | null>(null);

  useEffect(() => watchPendingAthletes(teamId, (next) => { setAthletes(next); setListenError(false); }, () => setListenError(true)), [teamId]);

  const respond = async (athlete: PendingAthlete, approve: boolean) => {
    if (busy) return;
    setBusy(athlete.userId);
    setError(null);
    try {
      await respondToJoinRequest(teamId, athlete.userId, approve);
    } catch (reason) {
      setError({ userId: athlete.userId, message: reason instanceof Error ? reason.message : NETWORK_ERROR });
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.requests} aria-live="polite">
      <Text style={[styles.requestsLabel]}>Join requests</Text>
      {listenError ? (
        <Text style={[styles.errorText]}>{NETWORK_ERROR}</Text>
      ) : athletes === null ? (
        <ActivityIndicator size="small" color={MUTED} accessibilityLabel="Loading join requests" />
      ) : athletes.length === 0 ? (
        <Text style={[styles.requestsEmpty]}>No requests yet. Athletes appear here after they enter your code.</Text>
      ) : (
        athletes.map((athlete) => (
          <Animated.View key={athlete.userId} entering={reducedMotion ? undefined : FadeIn.duration(220)} exiting={reducedMotion ? undefined : FadeOut.duration(160)} style={styles.request}>
            <View style={styles.requestRow}>
              <View style={styles.requestCopy}>
                <Text numberOfLines={1} style={[styles.requestName]}>{athlete.displayName ?? athlete.email ?? 'Athlete'}</Text>
                {athlete.displayName && athlete.email ? <Text numberOfLines={1} style={[styles.requestMeta]}>{athlete.email}</Text> : null}
              </View>
              <SmallPill label="Decline" onPress={() => void respond(athlete, false)} disabled={busy !== null} />
              <SmallPill label={busy === athlete.userId ? '…' : 'Approve'} onPress={() => void respond(athlete, true)} disabled={busy !== null} strong />
            </View>
            {error?.userId === athlete.userId && <Text style={[styles.errorText]}>{error.message}</Text>}
          </Animated.View>
        ))
      )}
    </View>
  );
}

function SmallPill({ label, onPress, disabled, strong }: { label: string; onPress: () => void; disabled?: boolean; strong?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.smallPill, strong && styles.smallPillStrong, pressed && styles.smallPillActive, pressed && { transform: [{ scale: 0.985 }] }, disabled && { opacity: 0.6 }]}>
      <Text style={[styles.smallPillText, strong && styles.smallPillTextStrong]}>{label}</Text>
    </Pressable>
  );
}

// Lucide icons: copy, check, share, refresh-cw.
function CopyIcon() {
  return <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={Entry.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Rect x={8} y={8} width={14} height={14} rx={2} /><Path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></Svg>;
}
function CheckIcon() {
  return <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={Entry.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><Path d="M20 6 9 17l-5-5" /></Svg>;
}
function ShareIcon() {
  return <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={Entry.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M12 2v13" /><Path d="m16 6-4-4-4 4" /><Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /></Svg>;
}
function RefreshIcon() {
  return <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><Path d="M21 3v5h-5" /><Path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><Path d="M8 16H3v5" /></Svg>;
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: Entry.canvas },
  content: { flexGrow: 1, paddingHorizontal: 26 },
  // flexShrink 0: on web, text would otherwise shrink when the confirmation makes the page taller than the screen.
  noShrink: { flexShrink: 0 },
  codePanel: { paddingVertical: 12, flexShrink: 0 },
  codeStage: { paddingBottom: 14 },
  identity: { alignItems: 'center', gap: 4 },
  teamName: { color: Entry.ink, fontFamily: Entry.strong, fontSize: 18, letterSpacing: -0.3 },
  teamMeta: { color: MUTED, fontFamily: Entry.body, fontSize: 14 },
  tiles: { flexDirection: 'row', justifyContent: 'center' },
  tile: { alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1.5, borderColor: Entry.lineStrong, backgroundColor: Entry.surface },
  digit: { color: Entry.ink, fontFamily: Entry.display, fontVariant: ['tabular-nums'] },
  status: { minHeight: 22, marginTop: 12, alignItems: 'center', justifyContent: 'center' },
  expiry: { color: Entry.subtle, fontFamily: Entry.body, fontSize: 13 },
  errorRow: { alignItems: 'flex-start', gap: 6, alignSelf: 'stretch' },
  errorText: { color: Entry.error, fontFamily: Entry.body, fontSize: 13, lineHeight: 18, flexShrink: 1 },
  retry: { color: Entry.ink, fontFamily: Entry.medium, fontSize: 13, textDecorationLine: 'underline' },
  pill: { minHeight: 54, borderRadius: 18, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  pillDisabled: { opacity: 0.45 },
  pillText: { color: Entry.ink, fontFamily: Entry.medium, fontSize: 15.5, letterSpacing: -0.1 },
  textAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, alignSelf: 'center', marginTop: 16, paddingVertical: 6, paddingHorizontal: 10 },
  textActionLabel: { color: MUTED, fontFamily: Entry.medium, fontSize: 14 },
  confirm: { marginTop: 14, gap: 12, alignItems: 'center' },
  confirmText: { color: MUTED, fontFamily: Entry.body, fontSize: 13.5, lineHeight: 19, textAlign: 'center', maxWidth: 310 },
  confirmRow: { flexDirection: 'row', gap: 10 },
  smallPill: { height: 40, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: Entry.lineStrong, backgroundColor: Entry.surface, alignItems: 'center', justifyContent: 'center' },
  smallPillStrong: { borderColor: Entry.peach, backgroundColor: Entry.peach },
  smallPillActive: { opacity: 0.85 },
  smallPillText: { color: Entry.ink, fontFamily: Entry.strong, fontSize: 14 },
  smallPillTextStrong: { color: Entry.canvas },
  requests: { marginTop: 24, gap: 10, paddingTop: 18, borderTopWidth: 1, borderTopColor: Entry.line },
  requestsLabel: { color: Entry.ink, fontFamily: Entry.strong, fontSize: 14 },
  requestsEmpty: { color: Entry.subtle, fontFamily: Entry.body, fontSize: 13.5, lineHeight: 19 },
  request: { gap: 6 },
  requestRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  requestCopy: { flex: 1, gap: 2 },
  requestName: { color: Entry.ink, fontFamily: Entry.medium, fontSize: 15.5 },
  requestMeta: { color: MUTED, fontFamily: Entry.body, fontSize: 13 },
});
