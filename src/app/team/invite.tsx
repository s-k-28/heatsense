import { AnimatedText, Text } from '@/components/ui/text';
import * as Clipboard from 'expo-clipboard';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Share, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EntryButton, EntryHeader, EntryHeading, entryStyles } from '@/components/entry-ui';
import { ActionButton } from '@/components/ui/action-button';
import { surfaceStyles } from '@/components/ui/surface';
import { MobileViewport } from '@/components/mobile-viewport';
import { OnboardingBackground } from '@/components/onboarding-background';
import { Entry, ONBOARDING_STEPS } from '@/constants/entry-theme';
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

// Entry design language: the code large and alone on the page, two quiet pill actions
// to share it, and the peach primary button.
const MUTED = Entry.muted;
const ease = Easing.out(Easing.cubic);

const inviteMessage = (code: string) => `Join my team on HeatSense! Use code ${code} to get started.`;

export default function InviteTeamScreen() {
  const draft = useTeamDraft();
  // Without a finished draft (a page refresh, or a coach coming back later) the
  // screen loads the coach's existing team from the server instead.
  const complete = Boolean(draft.school.trim() && draft.teamName.trim() && draft.sport && draft.level);
  return <MobileViewport><Content draft={complete ? draft : null} /></MobileViewport>;
}

function Content({ draft }: { draft: TeamDraft | null }) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
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

  const rise = (delay: number) => (reducedMotion ? undefined : FadeInUp.delay(delay).duration(480));
  const fade = (delay: number) => (reducedMotion ? undefined : FadeIn.delay(delay).duration(420));

  const back = () => (router.canGoBack() ? router.back() : router.replace('/team/create'));
  const next = () => { if (invite) router.push('/ready?role=Coach'); };

  // No draft and no team on the server yet: start at Create Your Team.
  if (noTeam) return <Redirect href="/team/create" />;

  return (
    <View style={styles.fill} onLayout={(event: LayoutChangeEvent) => setSize(event.nativeEvent.layout)}>
      <StatusBar style="light" />
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + 12, 26), paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        {size.height > 0 && <OnboardingBackground variant="team" height={size.height} />}
        <Animated.View entering={fade(0)}>
          <EntryHeader onBack={back} progress={{ step: 3, total: ONBOARDING_STEPS.coach }} />
        </Animated.View>

        <EntryHeading accent="together." compact={compact} delay={200} lead="Bring your team" style={{ marginTop: compact ? 26 : 36 }} />
        <AnimatedText entering={rise(350)} style={[entryStyles.description, styles.noShrink]}>Share this code so your athletes can join.</AnimatedText>

        <View style={[styles.codePanel, { marginTop: compact ? 20 : 28 }]}>
        <View style={styles.codeStage}>
        <Animated.View entering={rise(500)} style={styles.identity}>
          <Text style={[styles.teamName]}>{team?.teamName ?? teamName}</Text>
          <Text style={[styles.teamMeta]}>{[team?.sport ?? sport, team?.level ?? level].filter(Boolean).join(' · ')}</Text>
        </Animated.View>

        <CodeTiles invite={invite} compact={compact} width={size.width} firstDelay={reducedMotion ? 0 : 650} />
        </View>
        <View style={styles.status}>
          {loadError ? (
            <Animated.View entering={fade(0)} style={styles.errorRow}>
              <Text style={[styles.errorText]}>{loadError}</Text>
              <Pressable accessibilityRole="button" onPress={() => { setLoadError(null); setAttempt((n) => n + 1); }} hitSlop={8}>
                <Text style={[styles.retry]}>Try again</Text>
              </Pressable>
            </Animated.View>
          ) : invite ? (
            <AnimatedText key={invite.code} entering={fade(invite ? 150 : 0)} style={[styles.expiry]}>
              Expires {new Date(invite.expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </AnimatedText>
          ) : (
            <ActivityIndicator size="small" color={MUTED} accessibilityLabel="Creating your invitation code" />
          )}
        </View>
        </View>

        <View style={[styles.shareRow, { marginTop: compact ? 14 : 20 }]}>
          <Animated.View entering={rise(1100)} style={styles.shareItem}><CopyButton code={invite?.code ?? null} /></Animated.View>
          <Animated.View entering={rise(1180)} style={styles.shareItem}><ShareButton code={invite?.code ?? null} /></Animated.View>
        </View>

        <Animated.View entering={fade(1260)}>
          <RegenerateControl invite={invite} onRegenerated={setInvite} />
        </Animated.View>

        {invite && <JoinRequests teamId={invite.teamId} />}

        <Animated.View entering={rise(1350)} style={{ marginTop: compact ? 18 : 24 }}>
          <EntryButton label="Continue" disabled={invite === null} onPress={next} />
        </Animated.View>
      </ScrollView>
    </View>
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
    <Animated.View style={[{ width, minHeight: height }, frame]}>
      <View style={[styles.tile, { width, minHeight: height, paddingVertical: 8 }]}>
        <AnimatedText style={[styles.digit, { fontSize: Math.round(width * 0.58), lineHeight: Math.round(width * 0.72) }, text]}>{digit ?? ''}</AnimatedText>
      </View>
    </Animated.View>
  );
}

// Quiet outlined pill: charcoal with a neutral edge, so the peach Continue stays the one primary action.
function ActionPill({ label, onPress, disabled, prominent, accessibilityLabel, busy = false }: { label: string; onPress: () => void; disabled?: boolean; prominent?: boolean; accessibilityLabel?: string; busy?: boolean }) {
  return <ActionButton accessibilityLabel={accessibilityLabel} busy={busy} disabled={disabled} label={label} onPress={onPress} style={prominent ? styles.shareAction : undefined} variant="secondary" />;
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

function CopyButton({ code }: { code: string | null }) {
  const [flash, setFlash] = useFlash();
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const copy = async () => {
    if (!code || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await Clipboard.setStringAsync(code);
      setFlash('Copied');
    } catch {
      setFlash("Couldn't copy");
    } finally { busyRef.current = false; setBusy(false); }
  };
  return (
    <ActionPill
      busy={busy}
      label={busy ? 'Copying…' : flash ?? 'Copy code'}
      accessibilityLabel={flash ?? 'Copy code'}
      disabled={!code}
      onPress={copy}
    />
  );
}

function ShareButton({ code }: { code: string | null }) {
  const [flash, setFlash] = useFlash(2200);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const share = async () => {
    if (!code || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
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
    } finally { busyRef.current = false; setBusy(false); }
  };
  return (
    <ActionPill
      prominent
      busy={busy}
      label={busy ? 'Sharing…' : flash ?? 'Share'}
      accessibilityLabel={flash ?? 'Share invitation'}
      disabled={!code}
      onPress={share}
    />
  );
}

// "Generate a new code" asks first, inline, since the old code stops working.
function RegenerateControl({ invite, onRegenerated }: { invite: TeamInvite | null; onRegenerated: (invite: TeamInvite) => void }) {
  const reducedMotion = useReducedMotion();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const regenerate = async () => {
    if (!invite || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      onRegenerated(await regenerateInvite(invite.teamId));
      setConfirming(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : NETWORK_ERROR);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  if (!confirming) {
    return (
      <Pressable accessibilityRole="button" disabled={!invite} onPress={() => setConfirming(true)} hitSlop={8} style={({ pressed }) => [styles.textAction, pressed && { opacity: 0.75 }]}>
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
                <Text style={[styles.requestName]}>{athlete.displayName ?? athlete.email ?? 'Athlete'}</Text>
                {athlete.displayName && athlete.email ? <Text style={[styles.requestMeta]}>{athlete.email}</Text> : null}
              </View>
              <SmallPill accessibilityLabel={`Decline request from ${athlete.displayName ?? athlete.email ?? 'athlete'}`} label="Decline" onPress={() => void respond(athlete, false)} disabled={busy !== null} />
              <SmallPill accessibilityLabel={`Approve request from ${athlete.displayName ?? athlete.email ?? 'athlete'}`} label={busy === athlete.userId ? 'Working…' : 'Approve'} onPress={() => void respond(athlete, true)} disabled={busy !== null} strong />
            </View>
            {error?.userId === athlete.userId && <Text style={[styles.errorText]}>{error.message}</Text>}
          </Animated.View>
        ))
      )}
    </View>
  );
}

function SmallPill({ label, onPress, disabled, strong, accessibilityLabel }: { label: string; onPress: () => void; disabled?: boolean; strong?: boolean; accessibilityLabel?: string }) {
  return <ActionButton accessibilityLabel={accessibilityLabel} disabled={disabled} label={label} onPress={onPress} style={styles.smallAction} variant={strong ? 'secondary' : 'text'} />;
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
  tile: { alignItems: 'center', justifyContent: 'center', borderRadius: 18, borderWidth: 1, borderColor: Entry.lineStrong, backgroundColor: Entry.surface },
  digit: { color: Entry.ink, fontFamily: Entry.heading, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  status: { minHeight: 22, marginTop: 12, alignItems: 'center', justifyContent: 'center' },
  expiry: { color: Entry.subtle, fontFamily: Entry.body, fontSize: 13 },
  errorRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, justifyContent: 'center' },
  errorText: { color: Entry.error, fontFamily: Entry.body, fontSize: 14, lineHeight: 20 },
  retry: { color: Entry.ink, fontFamily: Entry.medium, fontSize: 14, textDecorationLine: 'underline' },
  shareRow: { flexDirection: 'row', gap: 10 },
  shareItem: { flex: 1 },
  shareAction: { borderColor: Entry.lineStrong },
  smallAction: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 8 },
  textAction: { alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 14, paddingVertical: 6, paddingHorizontal: 10 },
  textActionLabel: { color: MUTED, fontFamily: Entry.medium, fontSize: 14 },
  confirm: { marginTop: 14, gap: 12, alignItems: 'center' },
  confirmText: { color: MUTED, fontFamily: Entry.body, fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 310 },
  confirmRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  // Neutral, so Continue stays the one peach action on the page.
  requests: { marginTop: 30, gap: 10 },
  requestsLabel: { color: Entry.ink, fontFamily: Entry.strong, fontSize: 14 },
  requestsEmpty: { color: Entry.subtle, fontFamily: Entry.body, fontSize: 14, lineHeight: 20 },
  request: { ...surfaceStyles.card, borderRadius: 22, gap: 8, padding: 16 },
  requestRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  requestCopy: { flex: 1, gap: 4, minWidth: 120 },
  requestName: { color: Entry.ink, fontFamily: Entry.medium, fontSize: 15.5 },
  requestMeta: { color: MUTED, fontFamily: Entry.body, fontSize: 13 },
});
