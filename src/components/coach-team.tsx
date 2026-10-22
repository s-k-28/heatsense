import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Share, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition, useReducedMotion } from 'react-native-reanimated';

import { Avatar, AvatarStack, Glyph, OutlinePill, PageHeader, SecondaryButton, Sheet, Tap, TextAction } from '@/components/ds';
import { Color, Motion, Radius, Space, TOUCH, Type } from '@/constants/design-system';
import { useCoachTeam } from '@/hooks/use-coach-team';
import { NETWORK_ERROR, respondToJoinRequest } from '@/services/team-invites';
import { useAthleteCards, useRoster } from '@/hooks/use-roster';
import { type AthleteCard, type RosterMember } from '@/services/team-roster';
import { useAuthSession } from '@/state/auth-session';
import { usePreferences } from '@/state/preferences';

// Coach Team: people first. Counts and faces up top, the code that brings athletes in, anyone waiting
// for approval, then the roster. All live from Firestore; nothing here is sample data.

const formatCode = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`;
const inviteMessage = (code: string) => `Join my team on HeatSense! Use code ${code} to get started.`;
const nameOf = (member: RosterMember, card?: AthleteCard | null) => card?.fullName ?? member.displayName ?? member.email ?? 'Athlete';

function CodeStrip({ code, expiresAt }: { code: string; expiresAt: string }) {
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 1800);
    return () => clearTimeout(id);
  }, [notice]);
  const expires = new Date(expiresAt);
  const copy = async () => {
    try { await Clipboard.setStringAsync(code); setNotice('Code copied.'); } catch { setNotice('Couldn’t copy the code.'); }
  };
  const share = async () => {
    const message = inviteMessage(code);
    try {
      if (Platform.OS !== 'web') { await Share.share({ message }); return; }
      if (typeof navigator !== 'undefined' && navigator.share) { await navigator.share({ text: message }); return; }
      await Clipboard.setStringAsync(message);
      setNotice('Invitation copied.');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      try { await Clipboard.setStringAsync(message); setNotice('Invitation copied.'); } catch { setNotice('Couldn’t share the code.'); }
    }
  };
  return (
    <View style={styles.codeStrip}>
      <View style={styles.codeTop}>
        <View style={styles.flex}>
          <Text style={[Type.meta, styles.muted]}>Team code</Text>
          <Text accessibilityLabel={`Team code ${code.split('').join(' ')}`} selectable style={styles.code}>{formatCode(code)}</Text>
          {!Number.isNaN(expires.getTime()) ? <Text style={[Type.meta, styles.subtle]}>Expires {expires.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text> : null}
        </View>
        <Tap accessibilityLabel={notice === 'Code copied.' ? 'Code copied' : 'Copy code'} onPress={copy} radius={Radius.pill} style={styles.iconButton}>
          <Glyph name={notice === 'Code copied.' ? 'check' : 'copy'} size={19} />
        </Tap>
      </View>
      <View style={styles.codeActions}>
        <SecondaryButton label="Share code" onPress={share} style={styles.shareButton} />
        <TextAction hint="Opens the invite screen, where you can make a new code" label="Manage" onPress={() => router.push('/team/invite')} />
      </View>
      {notice ? <Text accessibilityLiveRegion="polite" style={[Type.meta, styles.notice]}>{notice}</Text> : null}
    </View>
  );
}

function RequestRow({ member, teamId }: { member: RosterMember; teamId: string }) {
  const [busy, setBusy] = useState<'approve' | 'decline' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const name = nameOf(member);
  const respond = async (approve: boolean) => {
    if (busy) return;
    setBusy(approve ? 'approve' : 'decline');
    setError(null);
    try { await respondToJoinRequest(teamId, member.userId, approve); } catch (reason) { setError(reason instanceof Error ? reason.message : NETWORK_ERROR); setBusy(null); }
  };
  return (
    <View style={styles.requestRow}>
      <View style={styles.personRow}>
        <Avatar muted name={name} />
        <View style={styles.flex}>
          <Text numberOfLines={1} style={[Type.bodyStrong, styles.ink]}>{name}</Text>
          {member.email && member.email !== name ? <Text numberOfLines={1} style={[Type.meta, styles.muted]}>{member.email}</Text> : null}
        </View>
      </View>
      <View style={styles.requestActions}>
        <Tap accessibilityLabel={`Decline ${name}`} disabled={busy !== null} onPress={() => respond(false)} radius={Radius.pill} style={[styles.choice, styles.choiceDecline]}>
          <Text style={[styles.choiceText, styles.ink]}>{busy === 'decline' ? 'Declining…' : 'Decline'}</Text>
        </Tap>
        <Tap accessibilityLabel={`Approve ${name}`} disabled={busy !== null} onPress={() => respond(true)} radius={Radius.pill} style={[styles.choice, styles.choiceApprove]}>
          <Text style={[styles.choiceText, styles.accent]}>{busy === 'approve' ? 'Approving…' : 'Approve'}</Text>
        </Tap>
      </View>
      {error ? <Text style={[Type.meta, styles.error]}>{error}</Text> : null}
    </View>
  );
}

function AthleteSheet({ card, member, onClose }: { card: AthleteCard | null | undefined; member: RosterMember | null; onClose: () => void }) {
  return (
    <Sheet onClose={onClose} title={member ? nameOf(member, card) : ''} visible={member !== null}>
      {member ? (
        <>
          {card ? (
            <View style={styles.facts}>
              <Fact label="Grade" value={card.grade} />
              <Fact label="Jersey" value={card.jersey ? `#${card.jersey}` : null} />
              <Fact label="Sport" value={card.sport} />
            </View>
          ) : (
            <Text style={[Type.support, styles.muted, styles.gapS]}>Profile not finished yet.</Text>
          )}
          {member.joinedAt ? <Text style={[Type.support, styles.muted, styles.gapL]}>Joined {member.joinedAt.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</Text> : null}
          {member.email ? <Text selectable style={[Type.support, styles.muted, styles.gapXs]}>{member.email}</Text> : null}
          <View style={styles.privacy}>
            <Glyph color={Color.inkSubtle} name="lock" size={16} />
            <Text style={[Type.meta, styles.muted, styles.flex]}>Health and emergency details stay private to the athlete.</Text>
          </View>
        </>
      ) : null}
    </Sheet>
  );
}

function Fact({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factValue}>{value ?? '–'}</Text>
      <Text style={[Type.meta, styles.muted]}>{label}</Text>
    </View>
  );
}

export function CoachTeam() {
  const { user } = useAuthSession();
  const { state: team, retry } = useCoachTeam(user?.uid ?? null);
  const teamId = team.status === 'ready' ? team.invite.teamId : null;
  const roster = useRoster(teamId);
  const { compactRoster } = usePreferences();
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState<RosterMember | null>(null);

  const members = Array.isArray(roster) ? roster : [];
  const active = members.filter((m) => m.status === 'active');
  const pending = members.filter((m) => m.status === 'pending').sort((a, b) => (a.requestedAt?.getTime() ?? 0) - (b.requestedAt?.getTime() ?? 0));
  const cards = useAthleteCards(active.map((m) => m.userId));
  const sorted = [...active].sort((a, b) => nameOf(a, cards[a.userId]).localeCompare(nameOf(b, cards[b.userId])));
  const rowMotion = reducedMotion ? undefined : LinearTransition.duration(Motion.state);

  if (team.status === 'loading') {
    return <><PageHeader title="Team" /><View style={styles.placeholder} /></>;
  }
  if (team.status === 'error') {
    return (
      <>
        <PageHeader title="Team" />
        <Text style={[Type.bodyStrong, styles.ink]}>Couldn’t load your team.</Text>
        <TextAction label="Try again" onPress={retry} />
      </>
    );
  }
  if (team.status === 'none' || !teamId) {
    return (
      <>
        <PageHeader title="Team" />
        <Text style={[Type.bodyStrong, styles.ink]}>No team yet.</Text>
        <TextAction label="Create team" onPress={() => router.push('/team/create')} />
      </>
    );
  }

  return (
    <View>
      <PageHeader label={team.team.teamName} title="Team" />

      <View accessibilityLabel={`${active.length} athletes on the roster, ${pending.length} waiting to join.`} accessible style={styles.stats}>
        <View>
          <Text style={styles.statValue}>{roster === 'loading' ? '–' : active.length}</Text>
          <Text style={[Type.support, styles.muted]}>{active.length === 1 ? 'Athlete' : 'Athletes'}</Text>
        </View>
        <View>
          <Text style={[styles.statValue, pending.length > 0 && styles.accent]}>{roster === 'loading' ? '–' : pending.length}</Text>
          <Text style={[Type.support, styles.muted]}>Waiting</Text>
        </View>
        {active.length > 0 ? <View style={styles.statStack}><AvatarStack names={sorted.map((m) => nameOf(m, cards[m.userId]))} size={34} /></View> : null}
      </View>

      <CodeStrip code={team.invite.code} expiresAt={team.invite.expiresAt} />

      {roster === 'error' ? (
        <Text style={[Type.support, styles.muted, styles.section]}>The roster didn’t load. Check your connection.</Text>
      ) : null}

      {pending.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text accessibilityRole="header" style={[Type.section, styles.ink]}>Waiting to join</Text>
            <OutlinePill label={String(pending.length)} tone={Color.accent} />
          </View>
          {pending.map((member) => (
            <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(Motion.state)} exiting={reducedMotion ? undefined : FadeOut.duration(Motion.press)} key={member.userId} layout={rowMotion}>
              <RequestRow member={member} teamId={teamId} />
            </Animated.View>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text accessibilityRole="header" style={[Type.section, styles.ink, styles.sectionHeadPlain]}>Roster</Text>
        {roster === 'loading' ? (
          <View style={styles.placeholder} />
        ) : sorted.length === 0 ? (
          <Text style={[Type.support, styles.muted]}>No athletes yet. Share the team code to invite them.</Text>
        ) : (
          sorted.map((member) => {
            const card = cards[member.userId];
            const name = nameOf(member, card);
            const detail = card ? [card.grade && `Grade ${card.grade.replace(/th|st|nd|rd/, '')}`, card.sport].filter(Boolean).join(' · ') : card === null ? 'Profile not finished' : '';
            return (
              <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(Motion.state)} key={member.userId} layout={rowMotion}>
                <Tap accessibilityHint="Shows athlete details" accessibilityLabel={`${name}${detail ? `. ${detail}` : ''}`} onPress={() => setOpen(member)} radius={Radius.control} style={styles.rosterRow}>
                  <Avatar name={name} />
                  <View style={styles.flex}>
                    <Text numberOfLines={1} style={[Type.bodyStrong, styles.ink]}>{name}</Text>
                    {!compactRoster && detail ? <Text numberOfLines={1} style={[Type.support, card === null ? styles.subtle : styles.muted]}>{detail}</Text> : null}
                  </View>
                  {card?.jersey ? <Text style={styles.jersey}>{card.jersey}</Text> : null}
                  <Glyph color={Color.inkSubtle} name="chevron" size={18} />
                </Tap>
              </Animated.View>
            );
          })
        )}
      </View>

      <AthleteSheet card={open ? cards[open.userId] : undefined} member={open} onClose={() => setOpen(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  ink: { color: Color.ink },
  muted: { color: Color.inkMuted },
  subtle: { color: Color.inkSubtle },
  accent: { color: Color.accent },
  error: { color: Color.error, marginTop: Space.xs },
  flex: { flex: 1, minWidth: 0 },
  gapXs: { marginTop: Space.xs },
  gapS: { marginTop: Space.s },
  gapL: { marginTop: Space.l },
  placeholder: { backgroundColor: Color.surface, borderRadius: Radius.surface, height: 120, opacity: 0.6 },

  stats: { alignItems: 'flex-end', flexDirection: 'row', gap: Space.xxl, marginBottom: Space.xl },
  statValue: { color: Color.ink, fontWeight: Type.data.fontWeight, fontSize: 52, lineHeight: 54 },
  statStack: { flex: 1, alignItems: 'flex-end', paddingBottom: Space.s },

  codeStrip: { backgroundColor: Color.surface, borderCurve: 'continuous', borderRadius: Radius.surface, padding: Space.l + 4 },
  codeTop: { alignItems: 'flex-start', flexDirection: 'row', gap: Space.m },
  code: { color: Color.ink, fontWeight: Type.data.fontWeight, fontSize: 40, letterSpacing: 5, lineHeight: 44 },
  codeActions: { alignItems: 'center', flexDirection: 'row', gap: Space.l, marginTop: Space.l },
  shareButton: { minHeight: 46 },
  iconButton: { alignItems: 'center', backgroundColor: Color.control, height: TOUCH + 2, justifyContent: 'center', width: TOUCH + 2 },
  notice: { color: Color.support, marginTop: Space.s },

  section: { marginTop: Space.section },
  sectionHead: { alignItems: 'center', flexDirection: 'row', gap: Space.m, marginBottom: Space.s },
  sectionHeadPlain: { marginBottom: Space.s },

  requestRow: { paddingVertical: Space.m },
  personRow: { alignItems: 'center', flexDirection: 'row', gap: Space.m },
  requestActions: { flexDirection: 'row', gap: Space.s, marginLeft: 56, marginTop: Space.m },
  choice: { alignItems: 'center', borderWidth: 1.5, justifyContent: 'center', minHeight: TOUCH, paddingHorizontal: Space.xl },
  choiceDecline: { borderColor: Color.outline },
  choiceApprove: { borderColor: Color.accent },
  choiceText: { ...Type.button, fontSize: 15 },

  rosterRow: { alignItems: 'center', flexDirection: 'row', gap: Space.m, marginHorizontal: -Space.s, minHeight: 64, paddingHorizontal: Space.s, paddingVertical: Space.s },
  jersey: { color: Color.inkMuted, fontWeight: Type.data.fontWeight, fontSize: 24, lineHeight: 26 },

  facts: { flexDirection: 'row', gap: Space.xl, marginTop: Space.l },
  fact: { minWidth: 64 },
  factValue: { color: Color.ink, fontWeight: Type.data.fontWeight, fontSize: 30, lineHeight: 32 },
  privacy: { alignItems: 'center', flexDirection: 'row', gap: Space.s, marginTop: Space.xl },
});
