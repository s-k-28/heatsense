import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { FieldCheckSheet } from '@/components/field-check-sheet';
import { HeatHistory } from '@/components/heat-calendar';
import { ReadingsTimeline } from '@/components/readings-timeline';
import { SampleTag, StatRow } from '@/components/whoop-ui';
import { Face, Palette } from '@/constants/theme';
import { CoachPalette, CoachRadius, CoachType } from '@/constants/coach-theme';
import { enter, swap } from '@/lib/motion';
import { ZONES, type Zone } from '@/lib/practice';
import { recheckStatus } from '@/services/practice-sessions';
import { useTemperature } from '@/state/preferences';
import { usePastSessions } from '@/state/past-sessions';
import { useCoachData, useNow, type SessionRole } from '@/state/team-session';

// Coach Home: the latest field reading as a plain number on UIL's zone scale, the practice loop as
// three figures (next recheck, readings, applied), then "Get started" cards and today's record.
// Everything comes from the team's practice session in Firestore. A build without Firebase shows the
// sample reading instead, tagged SAMPLE wherever it appears.

export function CoachToday({ onInvite, readOnly = false, role = 'coach' }: { onInvite?: () => void; readOnly?: boolean; role?: SessionRole }) {
  const data = useCoachData(role);
  const temp = useTemperature();
  const now = useNow();
  const [sheet, setSheet] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const reduced = useReducedMotion();

  const latest = data?.readings.at(-1) ?? null;
  const zone: Zone | null = latest?.zone ?? null;
  const session = data?.session ?? null;
  const recheck = session ? recheckStatus(session, latest, now) : null;
  const acked = data?.readings.filter((r) => r.acknowledgedAt).length ?? 0;
  const total = data?.readings.length ?? 0;
  const past = usePastSessions(role !== 'athlete' ? data?.teamId ?? null : null, Boolean(data?.sample), 40);
  const todayPeak = (data?.readings ?? []).reduce<{ wbgtF: number; zone: Zone } | null>((hot, r) => (!hot || r.wbgtF > hot.wbgtF ? { wbgtF: r.wbgtF, zone: r.zone } : hot), null);
  const minutesAgo = latest ? Math.max(0, Math.round((now - latest.measuredAt.getTime()) / 60_000)) : 0;

  const action = !session ? 'Start practice' : latest ? 'Add a reading' : 'Take first reading';
  // Trainers log readings once the coach has started practice; athletes only watch.
  const trainerRecords = role === 'trainer' && Boolean(session) && !data?.sample;
  const canRecord = !readOnly || trainerRecords;

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
                <Text style={styles.coachHeroTitle}>Ready when you are.</Text>
                <Text style={styles.coachHeroMeta}>{session ? 'Take the first field reading.' : 'Start practice and check field conditions.'}</Text>
              </>
            )}
            {canRecord ? (
              <Pressable accessibilityRole="button" onPress={() => setSheet(true)} style={({ pressed }) => [styles.coachCta, pressed && styles.coachPressed]}>
                <Text style={styles.coachCtaText}>{action}</Text>
              </Pressable>
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
            <Text style={styles.coachQuickValue}>{total ? `${acked}/${total} applied` : 'No readings'}</Text>
          </View>
        </Animated.View>

        <Text accessibilityRole="header" style={styles.coachSection}>Today’s practice</Text>
        <Animated.View entering={enter(2, reduced)} style={styles.coachSurface}>
          <View style={styles.coachPracticeRow}>
            <View>
              <Text style={styles.coachCardTitle}>{session ? 'Practice in progress' : 'No active practice'}</Text>
              <Text style={styles.coachBody}>{latest ? `${ZONES[latest.zone].label} guidance is based on the latest field reading.` : 'Field guidance appears after a real WBGT reading.'}</Text>
            </View>
            {latest ? <ZoneScale zone={zone} /> : null}
          </View>
        </Animated.View>

        <Text accessibilityRole="header" style={styles.coachSection}>Team</Text>
        <Animated.View entering={enter(3, reduced)} style={styles.coachSurface}>
          <Text style={styles.coachCardTitle}>Keep everyone connected</Text>
          <Text style={styles.coachBody}>Share the team code so athletes can join your roster.</Text>
          <Pressable accessibilityRole="button" onPress={() => onInvite?.()} style={({ pressed }) => [styles.coachSecondary, pressed && styles.coachPressed]}>
            <Text style={styles.coachSecondaryText}>Share team code</Text>
          </Pressable>
        </Animated.View>

        {recheck?.overdue || (latest && !latest.acknowledgedAt) ? (
          <>
            <Text accessibilityRole="header" style={styles.coachSection}>Important alert</Text>
            <View style={styles.coachAlert}>
              <View style={[styles.coachAlertEdge, { backgroundColor: recheck?.overdue ? Palette.emergency : Palette.warning }]} />
              <View style={styles.coachAlertCopy}>
                <Text style={styles.coachCardTitle}>{recheck?.overdue ? 'Field reading overdue' : 'Guidance needs confirmation'}</Text>
                <Text style={styles.coachBody}>{recheck?.overdue ? `This practice rechecks every ${session?.recheckMinutes ?? '—'} minutes.` : 'Apply the current UIL adjustments to today’s practice.'}</Text>
                <Pressable accessibilityRole="button" onPress={() => setSheet(true)} style={({ pressed }) => [styles.coachSecondary, pressed && styles.coachPressed]}><Text style={styles.coachSecondaryText}>Open practice</Text></Pressable>
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
        <HeatHistory past={past ?? []} temp={temp} today={todayPeak} />
        <FieldCheckSheet onClose={() => setSheet(false)} visible={sheet} />
      </>
    );
  }

  return (
    <>
      {data?.sample ? <SampleTag /> : null}
      {latest ? (
        <Animated.View entering={swap(reduced)} key={latest.id} style={styles.reading}>
          <Text style={styles.value}>{temp.value(latest.wbgtF)}<Text style={styles.unit}>{temp.unit}</Text></Text>
          <Text style={[styles.zone, { color: ZONES[latest.zone].text }]}>{ZONES[latest.zone].label}</Text>
        </Animated.View>
      ) : (
        <View style={styles.reading}>
          <Text style={[styles.value, styles.muted]}>--</Text>
          <Text style={[styles.zone, styles.muted]}>{session ? 'No reading yet' : 'No practice today'}</Text>
        </View>
      )}
      <ZoneScale zone={zone} />
      {latest ? <Text style={styles.measured}>WBGT measured {minutesAgo === 0 ? 'just now' : `${minutesAgo} min ago`}</Text> : null}
      {canRecord ? (
        <Pressable accessibilityRole="button" onPress={() => setSheet(true)} style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
          <Text style={styles.ctaText}>{action}</Text>
        </Pressable>
      ) : null}

      <Animated.View entering={enter(2, reduced)} style={styles.stats}>
        <StatRow stats={[
          recheck
            ? { label: 'Next reading', value: recheck.overdue ? 'Late' : String(Math.ceil(recheck.msLeft / 60_000)), unit: recheck.overdue ? undefined : ' min', tone: recheck.overdue ? Palette.emergency : undefined }
            : { label: 'Next reading', value: '--' },
          { label: 'Readings', value: String(total) },
          { label: 'Applied', value: total ? `${acked}/${total}` : '--' },
        ]} />
      </Animated.View>

      {readOnly ? null : <>
      <Text accessibilityRole="header" style={styles.section}>Get started</Text>
      <Animated.View entering={enter(4, reduced)} style={styles.cards}>
        {!latest && !dismissed.includes('reading') ? (
          <StartCard accent action="Check field conditions" body="Enter the WBGT from your meter." onAction={() => setSheet(true)} onDismiss={() => setDismissed([...dismissed, 'reading'])} title="Take a field reading" />
        ) : null}
        {!dismissed.includes('invite') ? (
          <StartCard action="Share team code" body="You approve each athlete who joins." onAction={() => onInvite?.()} onDismiss={() => setDismissed([...dismissed, 'invite'])} title="Invite your athletes" />
        ) : null}
      </Animated.View>
      </>}

      {total > 0 && session ? (
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
          <HeatHistory past={past ?? []} temp={temp} today={todayPeak} />
        </>
      ) : null}

      {canRecord ? <FieldCheckSheet onClose={() => setSheet(false)} trainerTeamId={role === 'trainer' ? data?.teamId ?? null : undefined} visible={sheet} /> : null}
    </>
  );
}

const SCALE: Zone[] = ['green', 'yellow', 'orange', 'red', 'black'];

/** Where the reading sits on UIL's five zones: the current one lit, the rest dim. */
function ZoneScale({ zone }: { zone: Zone | null }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.scale}>
      {SCALE.map((z) => (
        <View key={z} style={[styles.scaleStep, { backgroundColor: z === 'black' ? '#8E8E93' : ZONES[z].color, opacity: z === zone ? 1 : 0.2 }]} />
      ))}
    </View>
  );
}

function StartCard({ action, art, body, onAction, onDismiss, title }: { accent?: boolean; action: string; art?: ReactNode; body: string; onAction: () => void; onDismiss: () => void; title: string }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardCopy}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardBody}>{body}</Text>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={onAction} style={({ pressed }) => pressed && styles.pressed}>
          <Text style={styles.cardAction}>{action}</Text>
        </Pressable>
      </View>
      {art ? <View style={styles.cardArt}>{art}</View> : null}
      <Pressable accessibilityLabel={`Dismiss ${title}`} accessibilityRole="button" hitSlop={10} onPress={onDismiss} style={styles.close}>
        <Text style={styles.closeText}>×</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  reading: { marginTop: 12 },
  value: { color: Palette.ink, fontFamily: Face.figure, fontSize: 120, lineHeight: 124 },
  unit: { color: Palette.inkMuted, fontFamily: Face.label, fontSize: 36 },
  zone: { fontSize: 22, fontWeight: '700', marginTop: -4 },
  muted: { color: Palette.inkMuted },
  scale: { flexDirection: 'row', gap: 4, marginTop: 20 },
  scaleStep: { borderRadius: 3, flex: 1, height: 6 },
  measured: { color: Palette.inkMuted, fontSize: 15, marginTop: 12 },
  cta: { alignItems: 'center', backgroundColor: Palette.coral, borderRadius: 14, justifyContent: 'center', marginTop: 24, minHeight: 54 },
  ctaText: { color: '#1A0E07', fontSize: 17, fontWeight: '600' },
  stats: { borderTopColor: 'rgba(255,255,255,0.08)', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 28, paddingTop: 20 },
  panel: { backgroundColor: Palette.surface, borderRadius: 16, padding: 16 },
  section: { color: Palette.ink, fontSize: 22, fontWeight: '700', letterSpacing: -0.3, marginBottom: 12, marginTop: 34 },
  cards: { gap: 12 },
  card: { backgroundColor: Palette.surface, borderRadius: 16, flexDirection: 'row', gap: 12, padding: 18 },
  cardCopy: { flex: 1, gap: 6 },
  cardTitle: { color: Palette.ink, fontSize: 18, fontWeight: '600', paddingRight: 24 },
  cardBody: { color: Palette.inkMuted, fontSize: 15, lineHeight: 21 },
  cardAction: { color: Palette.coral, fontSize: 16, fontWeight: '600', marginTop: 8 },
  cardArt: { alignItems: 'center', justifyContent: 'center', width: 84 },
  close: { position: 'absolute', right: 14, top: 10 },
  closeText: { color: Palette.inkMuted, fontSize: 22 },
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
});
