import { Text } from '@/components/ui/text';
import { useAthletePalette, useAthleteStyles } from '@/components/athlete-appearance';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { CoachPalette, CoachRadius, CoachType } from '@/constants/coach-theme';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { FieldCheckSheet } from '@/components/field-check-sheet';
import { HeatHistory } from '@/components/heat-calendar';
import { HeatOrb, HomeRing } from '@/components/heat-orb';
import { ReadingsTimeline } from '@/components/readings-timeline';
import { ActionButton } from '@/components/ui/action-button';
import { SampleTag } from '@/components/whoop-ui';
import { Face, Palette } from '@/constants/theme';
import { enter, swap } from '@/lib/motion';
import { ZONES, type Zone } from '@/lib/practice';
import { recheckStatus } from '@/services/practice-sessions';
import { useTemperature } from '@/state/preferences';
import { usePastSessionsState } from '@/state/past-sessions';
import { useCoachDataState, useNow, type SessionRole } from '@/state/team-session';

// Home owns the full field reading. Staff get the next action and today's record;
// athletes get the reading here, then their guidance and band in AthleteHome.

export function CoachToday({ onInvite, readOnly = false, role = 'coach', teamPracticeDays, children }: { onInvite?: () => void; readOnly?: boolean; role?: SessionRole; teamPracticeDays?: number; children?: ReactNode }) {
  const Palette = useAthletePalette();
  const styles = useAthleteStyles(baseStyles);
  const team = useCoachDataState(role);
  const data = team.data;
  const temp = useTemperature();
  const { fontScale, width } = useWindowDimensions();
  const largeText = fontScale > 1.3;
  const ringSize = largeText ? 160 : 88;
  const now = useNow();
  const [sheet, setSheet] = useState(false);
  const reduced = useReducedMotion();

  const latest = data?.readings.at(-1) ?? null;
  const zone = latest?.zone ?? null;
  const session = data?.session ?? null;
  const recheck = session ? recheckStatus(session, latest, now) : null;
  const acked = data?.readings.filter((r) => r.acknowledgedAt).length ?? 0;
  const total = data?.readings.length ?? 0;
  const [detail, setDetail] = useState<'recheck' | 'readings' | 'guidance' | null>(null);
  const orbColor = zone ? (zone === 'black' ? '#8E8E93' : ZONES[zone].color) : '#6B7A82';
  const history = usePastSessionsState(role !== 'athlete' ? data?.teamId ?? null : null, role !== 'athlete' && Boolean(data?.sample), 40);
  const past = history.data;
  const todayPeak = (data?.readings ?? []).filter((r) => r.measuredAt.toDateString() === new Date(now).toDateString()).reduce<{ wbgtF: number; zone: Zone } | null>((hot, r) => (!hot || r.wbgtF > hot.wbgtF ? { wbgtF: r.wbgtF, zone: r.zone } : hot), null);
  const minutesAgo = latest ? Math.max(0, Math.round((now - latest.measuredAt.getTime()) / 60_000)) : 0;

  const action = !data ? 'Loading practice…' : !session ? 'Start practice' : latest && !latest.acknowledgedAt ? 'Review guidance' : latest ? 'Add a reading' : 'Take first reading';
  // Trainers log readings once the coach has started practice; athletes only watch.
  const trainerRecords = role === 'trainer' && Boolean(session) && !data?.sample;
  const canRecord = !readOnly || trainerRecords;
  const checkLabel = !data ? 'Loading practice' : !session ? 'No practice' : !latest ? 'First reading due now' : recheck?.overdue ? 'A fresh reading is due' : `Next reading in ${Math.max(0, Math.ceil((recheck?.msLeft ?? 0) / 60_000))} min`;

  if (team.status === 'error') {
    return <>
      <View style={styles.detail}>
        <Text accessibilityLiveRegion="polite" accessibilityRole="header" style={styles.insightTitle}>Practice data unavailable</Text>
        <Text style={styles.detailCopy}>Couldn’t load your team’s practice. Try connecting again.</Text>
        <ActionButton label="Try again" onPress={team.retry} style={styles.orbCta} variant="secondary" />
      </View>
      {children}
    </>;
  }

  if (role === 'coach') {
    return (
      <>
        <Text accessibilityRole="header" style={styles.coachPageTitle}>Today</Text>
        {data?.sample ? <SampleTag /> : null}
        <Animated.View entering={enter(0, reduced)} style={styles.coachHero}>
          <Image accessibilityIgnoresInvertColors contentFit="cover" source={require('@/assets/images/sign-in-on-field.jpg')} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={['rgba(5,7,8,0.16)', 'rgba(5,7,8,0.54)', 'rgba(5,7,8,0.96)']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
          <View style={styles.coachHeroCopy}>
            <Text style={styles.coachEyebrow}>{session ? 'TODAY’S PRACTICE' : 'COACH DASHBOARD'}</Text>
            {latest ? (
              <>
                <Text style={styles.coachHeroValue}>{temp.value(latest.wbgtF)}<Text style={styles.coachHeroUnit}>{temp.unit}</Text></Text>
                <Text style={[styles.coachHeroZone, { color: ZONES[latest.zone].text }]}>{ZONES[latest.zone].label}</Text>
                <Text style={styles.coachHeroMeta}>WBGT measured {minutesAgo === 0 ? 'just now' : `${minutesAgo} min ago`}</Text>
              </>
            ) : (
              <>
                <Text style={styles.coachHeroTitle}>{data ? 'Ready when you are.' : 'Loading practice…'}</Text>
                <Text style={styles.coachHeroMeta}>{!data ? 'Loading your team’s practice…' : session ? 'Take the first field reading.' : 'Start practice and check field conditions.'}</Text>
              </>
            )}
            {canRecord ? (
              <ActionButton disabled={!data} label={action} onPress={() => setSheet(true)} style={styles.coachCta} />
            ) : null}
          </View>
        </Animated.View>

        <Animated.View entering={enter(1, reduced)} style={styles.coachQuickGrid}>
          <View style={styles.coachQuickCard}>
            <Text style={styles.coachQuickLabel}>NEXT READING</Text>
            <Text style={[styles.coachQuickValue, recheck?.overdue && { color: Palette.emergency }]}>{recheck ? (recheck.overdue ? 'Late' : `${Math.ceil(recheck.msLeft / 60_000)} min`) : '—'}</Text>
          </View>
          <View style={styles.coachQuickCard}>
            <Text style={styles.coachQuickLabel}>TEAM STATUS</Text>
            <Text style={styles.coachQuickValue}>{!data ? 'Loading…' : total ? `${acked}/${total} applied` : 'No readings'}</Text>
          </View>
        </Animated.View>

        <Text accessibilityRole="header" style={styles.coachSection}>Today’s practice</Text>
        <Animated.View entering={enter(2, reduced)} style={styles.coachSurface}>
          <View style={styles.coachPracticeRow}>
            <View>
              <Text style={styles.coachCardTitle}>{!data ? 'Loading practice…' : session ? 'Practice in progress' : 'No active practice'}</Text>
              <Text style={styles.coachBody}>{!data ? 'Looking for your team’s latest reading.' : latest ? `${ZONES[latest.zone].label} guidance is based on the latest field reading.` : 'Field guidance appears after a real WBGT reading.'}</Text>
            </View>
            {latest ? <View accessibilityElementsHidden style={styles.coachScale}>{(['green', 'yellow', 'orange', 'red', 'black'] as Zone[]).map((key) => <View key={key} style={[styles.coachScaleStep, { backgroundColor: key === 'black' ? '#8E8E93' : ZONES[key].color, opacity: zone === key ? 1 : 0.25 }]} />)}</View> : null}
          </View>
        </Animated.View>

        {onInvite ? <>
        <Text accessibilityRole="header" style={styles.coachSection}>Team</Text>
        <Animated.View entering={enter(3, reduced)} style={styles.coachSurface}>
          <Text style={styles.coachCardTitle}>Keep everyone connected</Text>
          <Text style={styles.coachBody}>Share the team code so athletes can join your roster.</Text>
<ActionButton disabled={!data} label="Share team code" onPress={onInvite} style={styles.coachSecondary} variant="secondary" />
        </Animated.View>

        </> : null}

        {recheck?.overdue || (latest && !latest.acknowledgedAt) ? (
          <>
            <Text accessibilityRole="header" style={styles.coachSection}>Important alert</Text>
            <View style={styles.coachAlert}>
              <View style={[styles.coachAlertEdge, { backgroundColor: recheck?.overdue ? Palette.emergency : Palette.warning }]} />
              <View style={styles.coachAlertCopy}>
                <Text style={styles.coachCardTitle}>{recheck?.overdue ? 'Field reading overdue' : 'Guidance needs confirmation'}</Text>
                <Text style={styles.coachBody}>{recheck?.overdue ? `This practice rechecks every ${session?.recheckMinutes ?? '—'} minutes.` : 'Apply the current UIL adjustments to today’s practice.'}</Text>
                <ActionButton label="Open practice" onPress={() => setSheet(true)} style={styles.coachSecondary} variant="secondary" />
              </View>
            </View>
          </>
        ) : null}

        {total > 0 && session ? (
          <>
            <Text accessibilityRole="header" style={styles.coachSection}>Today’s readings</Text>
            <View style={styles.coachSurface}>
              <ReadingsTimeline now={now} readings={data?.readings ?? []} startedAt={session.startedAt} temp={temp} uilClass={session.uilClass} />
            </View>
          </>
        ) : null}

        <Text accessibilityRole="header" style={styles.coachSection}>Heat history</Text>
          {history.status === 'error' ? <>
            <Text accessibilityLiveRegion="polite" style={styles.detailCopy}>Practice history couldn’t load.</Text>
            <ActionButton label="Retry history" onPress={history.retry} variant="text" />
          </> : team.status === 'loading' || history.status === 'loading' || past === null ? <Text style={styles.detailCopy}>Loading practice history…</Text> : <HeatHistory onOpenSession={({ session }) => router.push({ pathname: '/practice-record', params: { role, teamId: session.teamId, id: session.id, ...(data?.sample ? { sample: '1' } : {}) } })} past={past} temp={temp} today={todayPeak} />}
        {children}
        {canRecord ? <FieldCheckSheet onClose={() => setSheet(false)} visible={sheet} /> : null}
      </>
    );
  }

  return (
    <>
      <View style={styles.hero}>
        {data?.sample ? <SampleTag /> : null}
        <HeatOrb color={orbColor} size={largeText ? Math.min(320, width - 32) : 232} still={!latest}>
          {latest ? (
            <Animated.View entering={swap(reduced)} key={latest.id} style={styles.orbCopy}>
              <Text style={[styles.orbValue, largeText && { fontSize: 64, lineHeight: 72 }]}>{temp.value(latest.wbgtF)}<Text style={styles.orbUnit}>{temp.unit}</Text></Text>
              <Text style={[styles.orbZone, { color: ZONES[latest.zone].text }]}>{ZONES[latest.zone].label}</Text>
            </Animated.View>
          ) : (
            <>
              <Text style={styles.orbEmpty}>--</Text>
              <Text style={styles.orbMeta}>{!data ? 'Loading practice…' : session ? 'No reading yet' : 'No practice today'}</Text>
            </>
          )}
        </HeatOrb>
        {latest ? <Text style={styles.measured}>WBGT measured {minutesAgo === 0 ? 'just now' : `${minutesAgo} min ago`}</Text> : null}
      </View>
      <View style={[styles.rings, largeText && styles.ringsLarge]}>
        <Metric largeText={largeText} label={role === 'athlete' ? "Next check" : "Recheck"} onPress={() => setDetail(detail === 'recheck' ? null : 'recheck')} selected={detail === 'recheck'} value={checkLabel}>
          <HomeRing max={1} segments={[{ color: recheck?.overdue ? Palette.emergency : Palette.coral, value: recheck ? Math.min(1, 1 - Math.max(0, recheck.msLeft) / (session!.recheckMinutes * 60_000)) : 0 }]} size={ringSize} stroke={7} summary={!data ? 'Practice loading' : !latest && session ? 'First reading due now' : recheck ? recheck.overdue ? 'Reading overdue' : `Next reading in ${Math.ceil(recheck.msLeft / 60_000)} minutes` : 'No practice session'}>
            <Text style={[styles.ringValue, recheck?.overdue && { color: Palette.emergency }]}>{!latest && session ? 'Now' : recheck ? recheck.overdue ? 'Late' : `${Math.ceil(recheck.msLeft / 60_000)}m` : '--'}</Text>
          </HomeRing>
        </Metric>
        <Metric largeText={largeText} label="Readings" onPress={() => setDetail(detail === 'readings' ? null : 'readings')} selected={detail === 'readings'} value={data ? `${total} field readings` : 'Readings loading'}>
          <HomeRing max={Math.max(total, 1)} segments={(data?.readings ?? []).map((reading) => ({ color: reading.zone === 'black' ? '#8E8E93' : ZONES[reading.zone].color, value: 1 }))} size={ringSize} stroke={7} summary={data ? `${total} readings this practice` : 'Readings loading'}>
            <Text style={styles.ringValue}>{data ? total : '--'}</Text>
          </HomeRing>
        </Metric>
        <Metric largeText={largeText} label={role === 'athlete' ? "Team days" : "Applied"} onPress={() => setDetail(detail === 'guidance' ? null : 'guidance')} selected={detail === 'guidance'} value={role === 'athlete' ? teamPracticeDays === undefined ? 'Team practice history loading' : `${teamPracticeDays} available team practice days` : !data ? 'Acknowledgements loading' : `${acked} of ${total} readings acknowledged`}>
          <HomeRing max={role === 'athlete' ? Math.max(teamPracticeDays ?? 0, 1) : Math.max(total, 1)} segments={[{ color: Palette.safe, value: role === 'athlete' ? teamPracticeDays ?? 0 : acked }]} size={ringSize} stroke={7} summary={role === 'athlete' ? teamPracticeDays === undefined ? 'Team practice history loading' : `${teamPracticeDays} available team practice days` : !data ? 'Acknowledgements loading' : `${acked} of ${total} readings acknowledged`}>
            <Text style={styles.ringValue}>{role === 'athlete' ? `${teamPracticeDays ?? '--'}` : total ? `${acked}/${total}` : '--'}</Text>
          </HomeRing>
        </Metric>
      </View>
      {detail ? (
        <View style={styles.detail}>
          <Text style={styles.insightTitle}>{detail === 'recheck' ? checkLabel : detail === 'readings' ? 'This practice' : role === 'athlete' ? 'Available team practice days' : 'Guidance acknowledgements'}</Text>
          {detail === 'readings' || (detail === 'guidance' && role !== 'athlete') ? total ? [...(data?.readings ?? [])].reverse().map((reading) => (
            <View key={reading.id} style={styles.detailRow}>
              <View style={styles.detailReading}>
                <Text style={styles.detailValue}>{temp.value(reading.wbgtF)}{temp.unit}</Text>
                <Text style={styles.detailCopy}>{ZONES[reading.zone].label}</Text>
              </View>
              <View style={styles.detailEnd}>
                <Text style={styles.detailValue}>{reading.measuredAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
                {detail === 'guidance' ? <Text style={[styles.detailCopy, reading.acknowledgedAt && { color: Palette.safe }]}>{reading.acknowledgedAt ? 'Acknowledged' : 'Pending'}</Text> : null}
              </View>
            </View>
          )) : <Text style={styles.detailCopy}>{data ? 'No readings recorded yet.' : 'Loading readings…'}</Text> : <Text style={styles.detailCopy}>{detail === 'recheck' ? session ? `Readings are due every ${session.recheckMinutes} minutes after the last measurement. ${role === 'athlete' ? 'Your coach or trainer records the next check.' : 'Use a handheld WBGT meter for the next check.'}` : 'A recheck schedule begins when your coach starts practice.' : 'Counts available team practice dates, including dates before you joined, from up to 20 recent practices. This does not verify attendance or completion of an acclimatization protocol.'}</Text>}

        </View>
      ) : null}
      {canRecord ? <ActionButton disabled={!data} label={action} onPress={() => setSheet(true)} style={styles.orbCta} /> : data && !session ? <Text style={styles.emptyContext}>Your coach starts the next practice.</Text> : null}
      {children}

      {!readOnly && onInvite && !session ? (
        <Pressable accessibilityRole="button" onPress={onInvite} style={({ pressed }) => [styles.teamLink, pressed && styles.pressed]}>
          <Text style={styles.statusText}>{data?.teamId ? 'Share team code' : 'Invite your team'}</Text>
          <Text style={styles.record}>›</Text>
        </Pressable>
      ) : null}

      {role !== 'athlete' && total > 0 && session ? (
        <>
          <Text accessibilityRole="header" style={styles.section}>Today’s readings</Text>
          <View style={styles.panel}>
            <ReadingsTimeline now={now} readings={data?.readings ?? []} startedAt={session.startedAt} temp={temp} uilClass={session.uilClass} />
          </View>
        </>
      ) : null}

      {role !== 'athlete' ? (
        <>
          <Text accessibilityRole="header" style={styles.section}>Heat history</Text>
          {history.status === 'error' ? <>
            <Text accessibilityLiveRegion="polite" style={styles.detailCopy}>Practice history couldn’t load.</Text>
            <ActionButton label="Retry history" onPress={history.retry} variant="text" />
          </> : team.status === 'loading' || history.status === 'loading' || past === null ? <Text style={styles.detailCopy}>Loading practice history…</Text> : <HeatHistory onOpenSession={({ session }) => router.push({ pathname: '/practice-record', params: { role, teamId: session.teamId, id: session.id, ...(data?.sample ? { sample: '1' } : {}) } })} past={past} temp={temp} today={todayPeak} />}
        </>
      ) : null}

      {canRecord ? <FieldCheckSheet onClose={() => setSheet(false)} trainerTeamId={role === 'trainer' ? data?.teamId ?? null : undefined} visible={sheet} /> : null}
    </>
  );
}

function Metric({ children, label, onPress, selected, value, largeText }: { children: ReactNode; label: string; onPress: () => void; selected: boolean; value: string; largeText: boolean }) {
  const Palette = useAthletePalette();
  const styles = useAthleteStyles(baseStyles);
  return <Pressable accessibilityRole="button" accessibilityValue={{ text: value }} accessibilityLabel={`${label}, ${selected ? 'hide' : 'show'} details`} accessibilityState={{ expanded: selected }} onPress={onPress} style={({ pressed }) => [styles.metric, largeText && styles.metricLarge, pressed && styles.pressed]} aria-expanded={selected}>{children}<Text style={[styles.metricLabel, largeText && styles.metricLabelLarge, selected && { color: Palette.coral }]}>{label} <Text style={styles.disclosure}>{selected ? '⌃' : '›'}</Text></Text></Pressable>;
}

const baseStyles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  hero: { alignItems: 'center', marginTop: 0 },
  orbCopy: { alignItems: 'center' },
  orbValue: { color: Palette.ink, fontFamily: Face.figure, fontSize: 84, lineHeight: 88 },
  orbUnit: { color: Palette.inkMuted, fontSize: 22, fontWeight: '600' },
  orbZone: { fontSize: 17, fontWeight: '600', marginTop: 2 },
  orbMeta: { color: Palette.inkMuted, fontSize: 16, marginTop: 6 },
  orbEmpty: { color: Palette.inkMuted, fontSize: 52, fontWeight: '600' },
  orbCta: { borderRadius: 999, marginTop: 26 },
  rings: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, paddingHorizontal: 0 },
  ringsLarge: { flexDirection: 'column', gap: 20 },
  metricLarge: { flexDirection: 'row', gap: 18, width: '100%' },
  metricLabelLarge: { flex: 1, flexShrink: 1, fontSize: 16 },
  metric: { alignItems: 'center', gap: 4, width: '32%' },
  ringValue: { color: Palette.ink, fontFamily: Face.figure, fontSize: 28, lineHeight: 32 },
  metricLabel: { color: Palette.ink, fontSize: 13, fontWeight: '600', marginTop: 6 },
  disclosure: { color: Palette.inkMuted, fontSize: 16 },
  emptyContext: { color: Palette.inkMuted, fontSize: 16, lineHeight: 22, marginTop: 24, textAlign: 'center' },
  detailRow: { alignItems: 'center', borderBottomColor: Palette.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 12, justifyContent: 'space-between', paddingVertical: 12 },
  detailReading: { flex: 1 },
  detailEnd: { alignItems: 'flex-end', flex: 1 },
  detailValue: { color: Palette.ink, fontSize: 16, fontWeight: '500' },
  insightTitle: { color: Palette.ink, fontSize: 18, fontWeight: '600', lineHeight: 24 },
  detailCopy: { color: Palette.inkMuted, fontSize: 15, lineHeight: 21, marginTop: 6 },
  detail: { borderBottomColor: Palette.border, borderBottomWidth: StyleSheet.hairlineWidth, marginTop: 18, paddingBottom: 18 },
  measured: { color: Palette.inkMuted, fontSize: 15, marginTop: 12 },
  statusText: { color: Palette.ink, fontSize: 16, fontWeight: '500' },
  record: { color: Palette.inkMuted, fontSize: 15 },
  teamLink: { alignItems: 'center', borderBottomColor: Palette.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, minHeight: 52 },
  panel: { backgroundColor: Palette.surface, borderRadius: 16, padding: 16 },
  section: { color: Palette.ink, fontSize: 22, fontWeight: '700', letterSpacing: -0.3, marginBottom: 12, marginTop: 34 },
  coachHero: { borderRadius: CoachRadius.card, minHeight: 430, overflow: 'hidden', position: 'relative' },
  coachPageTitle: { color: CoachPalette.text, ...CoachType.page, marginBottom: 18, marginTop: 8 },
  coachHeroCopy: { flex: 1, justifyContent: 'flex-end', padding: 24 },
  coachEyebrow: { color: CoachPalette.textSecondary, fontSize: 13, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10 },
  coachHeroValue: { color: CoachPalette.text, fontFamily: Face.figure, fontSize: 92, lineHeight: 94 },
  coachHeroUnit: { color: CoachPalette.muted, fontFamily: Face.label, fontSize: 29 },
  coachHeroZone: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  coachHeroTitle: { color: CoachPalette.text, fontSize: 38, fontWeight: '800', letterSpacing: -1.2, lineHeight: 41, maxWidth: 300 },
  coachHeroMeta: { color: CoachPalette.textSecondary, ...CoachType.body, marginTop: 4 },
  coachCta: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: CoachPalette.peach, borderRadius: CoachRadius.pill, justifyContent: 'center', marginTop: 22, minHeight: 54, paddingHorizontal: 24 },
  coachCtaText: { color: CoachPalette.peachInk, fontSize: 16, fontWeight: '800' },
  coachPressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  coachQuickGrid: { flexDirection: 'row', gap: 10, marginTop: 12 },
  coachQuickCard: { backgroundColor: CoachPalette.surface, borderRadius: CoachRadius.panel, flex: 1, minHeight: 112, padding: 18 },
  coachQuickLabel: { color: CoachPalette.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  coachQuickValue: { color: CoachPalette.text, fontFamily: Face.figure, fontSize: 28, lineHeight: 32, marginTop: 12 },
  coachSection: { color: CoachPalette.text, ...CoachType.section, marginBottom: 12, marginTop: 32 },
  coachSurface: { backgroundColor: CoachPalette.surface, borderRadius: CoachRadius.card, padding: 22 },
  coachPracticeRow: { gap: 16 },
  coachCardTitle: { color: CoachPalette.text, ...CoachType.card },
  coachBody: { color: CoachPalette.muted, ...CoachType.body, marginTop: 6 },
  coachSecondary: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: CoachPalette.interactive, borderRadius: CoachRadius.pill, justifyContent: 'center', marginTop: 18, minHeight: 46, paddingHorizontal: 20 },
  coachSecondaryText: { color: CoachPalette.text, fontSize: 15, fontWeight: '700' },
  coachAlert: { backgroundColor: CoachPalette.surface, borderRadius: CoachRadius.card, flexDirection: 'row', overflow: 'hidden' },
  coachAlertEdge: { width: 5 },
  coachAlertCopy: { flex: 1, padding: 22 },
  coachScale: { flexDirection: 'row', gap: 4 },
  coachScaleStep: { flex: 1, height: 6, borderRadius: 3 },
});
