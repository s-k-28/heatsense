import * as Clipboard from 'expo-clipboard';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  FadeOut,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { GlassSurface } from '@/components/glass-surface';
import { HeatSenseLogo } from '@/components/heatsense-logo';
import { MobileViewport } from '@/components/mobile-viewport';
import { OnboardingContinueButton, onboardingFont as fontFamily, OnboardingTokens } from '@/components/onboarding-controls';
import { ensureTeamInvite, regenerateInvite, type TeamInvite } from '@/services/team-invites';
import { getTeamId, setTeamId, useTeamDraft } from '@/state/onboarding';

const MUTED = '#B8B8B8';
const FOCUS_RING = { outlineColor: '#FFFFFF', outlineStyle: 'solid', outlineWidth: 2, outlineOffset: 3 } as const;
const ease = Easing.out(Easing.cubic);

const inviteMessage = (code: string) => `Join my team on HeatSense! Use code ${code} to get started.`;

export default function InviteTeamScreen() {
  const draft = useTeamDraft();
  // Reached without finishing Create Your Team (e.g. a direct link): send the coach back to it.
  if (!draft.school.trim() || !draft.teamName.trim() || !draft.sport || !draft.level) return <Redirect href="/team/create" />;
  return <MobileViewport><Content /></MobileViewport>;
}

function Content() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const draft = useTeamDraft();
  const [invite, setInvite] = useState<TeamInvite | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [height, setHeight] = useState(0);
  const compact = height > 0 && height < 720;
  const headlineSize = compact ? 38 : 44;

  const { school, teamName, sport, level } = draft;
  useEffect(() => {
    let cancelled = false;
    ensureTeamInvite({ school, teamName, sport: sport ?? '', level: level ?? '' }, getTeamId())
      .then((result) => { if (cancelled) return; setTeamId(result.teamId); setInvite(result); setLoadError(null); })
      .catch(() => { if (!cancelled) setLoadError("We couldn't create your invitation code."); });
    return () => { cancelled = true; };
  }, [school, teamName, sport, level, attempt]);

  const rise = (delay: number) => (reducedMotion ? undefined : FadeInUp.delay(delay).duration(480));
  const fade = (delay: number) => (reducedMotion ? undefined : FadeIn.delay(delay).duration(420));

  const back = () => (router.canGoBack() ? router.back() : router.replace('/team/create'));
  const next = () => { if (invite) router.push('/team/practice-location'); };

  return (
    <View style={styles.fill} onLayout={(event: LayoutChangeEvent) => setHeight(event.nativeEvent.layout.height)}>
      <StatusBar style="light" />
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + 8, compact ? 40 : 56), paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <Animated.View entering={fade(0)} style={styles.topRow}>
          <BackButton onPress={back} />
          <HeatSenseLogo height={30} />
        </Animated.View>

        <Animated.Text entering={rise(200)} accessibilityRole="header" style={[styles.headline, { fontFamily, fontSize: headlineSize, lineHeight: Math.round(headlineSize * 1.08), marginTop: compact ? 26 : 36 }]}>
          {'Bring your\nteam together.'}
        </Animated.Text>
        <Animated.Text entering={rise(350)} style={[styles.description, { fontFamily, marginTop: compact ? 10 : 14 }]}>Share this code with your athletes so they can join your team.</Animated.Text>

        <Animated.View entering={rise(500)} style={[styles.identity, { marginTop: compact ? 24 : 34 }]}>
          <Text numberOfLines={1} style={[styles.teamName, { fontFamily }]}>{teamName}</Text>
          <Text numberOfLines={1} style={[styles.teamMeta, { fontFamily }]}>{sport} · {level}</Text>
        </Animated.View>

        <CodeTiles invite={invite} compact={compact} firstDelay={reducedMotion ? 0 : 650} />
        <View style={styles.status}>
          {loadError ? (
            <Animated.View entering={fade(0)} style={styles.errorRow}>
              <Text style={[styles.errorText, { fontFamily }]}>{loadError}</Text>
              <Pressable accessibilityRole="button" onPress={() => { setLoadError(null); setAttempt((n) => n + 1); }} hitSlop={8}>
                <Text style={[styles.retry, { fontFamily }]}>Try again</Text>
              </Pressable>
            </Animated.View>
          ) : invite ? (
            <Animated.Text key={invite.code} entering={fade(invite ? 150 : 0)} style={[styles.expiry, { fontFamily }]}>
              Expires {new Date(invite.expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </Animated.Text>
          ) : (
            <ActivityIndicator size="small" color={MUTED} accessibilityLabel="Creating your invitation code" />
          )}
        </View>

        <View style={{ gap: compact ? 10 : 12, marginTop: compact ? 18 : 24 }}>
          <Animated.View entering={rise(1100)}><CopyButton code={invite?.code ?? null} /></Animated.View>
          <Animated.View entering={rise(1180)}><ShareButton code={invite?.code ?? null} /></Animated.View>
        </View>

        <Animated.View entering={fade(1260)}>
          <RegenerateControl invite={invite} onRegenerated={setInvite} />
        </Animated.View>

        <Animated.View entering={rise(1350)} style={{ marginTop: compact ? 18 : 24 }}>
          <OnboardingContinueButton enabled={invite !== null} onPress={next} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// Display-only code tiles. Each tile fades and scales up (0.96 → 1) in turn; a new
// code (after regenerating) replays the same reveal.
function CodeTiles({ invite, compact, firstDelay }: { invite: TeamInvite | null; compact: boolean; firstDelay: number }) {
  const digits = invite ? invite.code.split('') : [null, null, null, null];
  // The first code waits for the page entrance; a regenerated code reveals right away.
  const [firstCode, setFirstCode] = useState<string | null>(null);
  if (invite && firstCode === null) setFirstCode(invite.code);
  const delay = !invite || invite.code === firstCode ? firstDelay : 0;
  const size = compact ? { width: 62, height: 72, gap: 12 } : { width: 68, height: 80, gap: 14 };
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
      <GlassSurface radius={20} style={[styles.tile, { width, height }]}>
        <Animated.Text style={[styles.digit, { fontFamily }, text]}>{digit ?? ''}</Animated.Text>
      </GlassSurface>
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
    borderColor: interpolateColor(hover.value, [0, 1], [prominent ? '#FFFFFF' : OnboardingTokens.outline, '#FFFFFF']),
    backgroundColor: interpolateColor(hover.value, [0, 1], ['rgba(255,255,255,0)', 'rgba(255,255,255,0.06)']),
    transform: [{ scale: 1 - press.value * 0.015 }],
  }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onHoverIn={() => { hover.set(withTiming(1, { duration: ms(200), easing: ease })); }}
      onHoverOut={() => { hover.set(withTiming(0, { duration: ms(200), easing: ease })); }}
      onPressIn={() => { press.set(withTiming(1, { duration: ms(110), easing: ease })); }}
      onPressOut={() => { press.set(withTiming(0, { duration: ms(200), easing: ease })); }}
      style={[{ borderRadius: 9999 }, focused && FOCUS_RING]}>
      <Animated.View style={[styles.pill, { height: prominent ? 56 : 52, borderWidth: prominent ? 2 : 1.5 }, disabled && styles.pillDisabled, frame]}>
        {icon}
        <Text style={[styles.pillText, { fontFamily }]}>{label}</Text>
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
    } catch {
      setError("Couldn't generate a new code. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!confirming) {
    return (
      <Pressable accessibilityRole="button" disabled={!invite} onPress={() => setConfirming(true)} hitSlop={8} style={({ hovered, pressed }) => [styles.textAction, (hovered || pressed) && { opacity: 0.75 }]}>
        <RefreshIcon />
        <Text style={[styles.textActionLabel, { fontFamily }]}>Generate a new code</Text>
      </Pressable>
    );
  }
  return (
    <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(200)} accessibilityLiveRegion="polite" style={styles.confirm}>
      <Text style={[styles.confirmText, { fontFamily }]}>Your current code will stop working. Athletes who haven&apos;t joined yet will need the new one.</Text>
      {error && <Text style={[styles.errorText, { fontFamily, textAlign: 'center' }]}>{error}</Text>}
      <View style={styles.confirmRow}>
        <SmallPill label="Cancel" onPress={() => { setConfirming(false); setError(null); }} disabled={busy} />
        <SmallPill label={busy ? 'Generating…' : 'Generate new code'} onPress={regenerate} disabled={busy} strong />
      </View>
    </Animated.View>
  );
}

function SmallPill({ label, onPress, disabled, strong }: { label: string; onPress: () => void; disabled?: boolean; strong?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      style={({ hovered, pressed }) => [styles.smallPill, strong && styles.smallPillStrong, (hovered || pressed) && styles.smallPillActive, pressed && { transform: [{ scale: 0.985 }] }, disabled && { opacity: 0.6 }]}>
      <Text style={[styles.smallPillText, { fontFamily }]}>{label}</Text>
    </Pressable>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  const reducedMotion = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const press = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.value * 0.06 }], opacity: 1 - press.value * 0.15 }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPressIn={() => { press.set(withTiming(1, { duration: reducedMotion ? 0 : 110 })); }}
      onPressOut={() => { press.set(withTiming(0, { duration: reducedMotion ? 0 : 200 })); }}
      hitSlop={8}
      style={[styles.backWrap, focused && FOCUS_RING]}>
      <Animated.View style={style}>
        <GlassSurface radius={22} style={styles.back}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="m15 5-7 7 7 7" /></Svg>
        </GlassSurface>
      </Animated.View>
    </Pressable>
  );
}

// Lucide icons: copy, check, share, refresh-cw.
function CopyIcon() {
  return <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Rect x={8} y={8} width={14} height={14} rx={2} /><Path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></Svg>;
}
function CheckIcon() {
  return <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><Path d="M20 6 9 17l-5-5" /></Svg>;
}
function ShareIcon() {
  return <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M12 2v13" /><Path d="m16 6-4-4-4 4" /><Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /></Svg>;
}
function RefreshIcon() {
  return <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><Path d="M21 3v5h-5" /><Path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><Path d="M8 16H3v5" /></Svg>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 22 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backWrap: { borderRadius: 22 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.85)' },
  // flexShrink 0: on web, text would otherwise shrink when the confirmation makes the page taller than the screen.
  headline: { flexShrink: 0, color: '#FFFFFF', fontWeight: '500', letterSpacing: -0.9 },
  description: { flexShrink: 0, color: MUTED, fontSize: 15.5, lineHeight: 23, fontWeight: '400', maxWidth: 330 },
  identity: { alignItems: 'center', gap: 4 },
  teamName: { color: '#FFFFFF', fontSize: 19, fontWeight: '500', letterSpacing: -0.3 },
  teamMeta: { color: MUTED, fontSize: 14.5, fontWeight: '400' },
  tiles: { flexDirection: 'row', justifyContent: 'center' },
  tile: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.85)', boxShadow: '0 6px 16px rgba(0,0,0,0.18)' },
  digit: { color: '#FFFFFF', fontSize: 32, fontWeight: '500', fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  status: { minHeight: 22, marginTop: 12, alignItems: 'center', justifyContent: 'center' },
  expiry: { color: '#8E8E8E', fontSize: 13, fontWeight: '400' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  errorText: { color: '#FF8E8E', fontSize: 13, lineHeight: 18 },
  retry: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
  pill: { borderRadius: 9999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  pillDisabled: { opacity: 0.45 },
  pillText: { color: '#FFFFFF', fontSize: 16.5, fontWeight: '600', letterSpacing: -0.2 },
  textAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, alignSelf: 'center', marginTop: 16, paddingVertical: 6, paddingHorizontal: 10 },
  textActionLabel: { color: MUTED, fontSize: 14, fontWeight: '500' },
  confirm: { marginTop: 14, gap: 12, alignItems: 'center' },
  confirmText: { color: MUTED, fontSize: 13.5, lineHeight: 19, textAlign: 'center', maxWidth: 310 },
  confirmRow: { flexDirection: 'row', gap: 10 },
  smallPill: { height: 40, paddingHorizontal: 18, borderRadius: 9999, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.45)', alignItems: 'center', justifyContent: 'center' },
  smallPillStrong: { borderColor: 'rgba(255,255,255,0.85)' },
  smallPillActive: { borderColor: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.06)' },
  smallPillText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
