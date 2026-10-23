import { useAthletePalette, useAthleteStyles } from '@/components/athlete-appearance';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ZoneRules } from '@/components/coach-tabs';
import { FieldHero } from '@/components/field-hero';
import { PracticeCard, TodaysReadings } from '@/components/coach-home';
import { CoachToday } from '@/components/coach-today';
import { TrainerHomeOverview } from '@/components/trainer-home-overview';
import { Card, ListRow, Rows, SampleTag, SectionTitle } from '@/components/whoop-ui';
import { ActionButton } from '@/components/ui/action-button';
import { Palette } from '@/constants/theme';
import { ZONES, type Zone } from '@/lib/practice';
import { UIL_GUIDANCE } from '@/lib/uil-wbgt';
import { usePreferences, useTemperature } from '@/state/preferences';
import { BodyStrip } from '@/components/body-strip';
import { BandSpot } from '@/components/band-journey';
import { BandViewer, type BandPreviewPhase } from '@/components/band-viewer';
import { useDashboardScroll } from '@/components/dashboard-scroll';
import type { BandSignal } from '@/components/vital-cards';
import { PressScale } from '@/components/motion/press-scale';
import { HeatHistory } from '@/components/heat-calendar';
import { SimulatedTag, VitalsDetail } from '@/components/vitals';
import { useDemoTeam, useOwnBand } from '@/state/demo-team';
import { usePastSessionsState } from '@/state/past-sessions';
import { useCoachData, useCoachDataState, useMembership, useTrainers } from '@/state/team-session';

// Athlete tabs (Home, Band, Sessions) and the trainer's Home. Athletes see their team's real field
// reading (Firestore lets approved members read it) and their own band, simulated until the
// firmware ships and labelled that way.

const dot = (zone: Zone) => (zone === 'black' ? '#8E8E93' : ZONES[zone].color);

/* ─────────────────────────────── Athlete ─────────────────────────────── */

/** The athlete's band signals: the demo athlete in sample mode, otherwise their own paired band. */
function useMyBand() {
  const { bandConnected } = usePreferences();
  const data = useCoachData('athlete');
  const zone = data?.readings.at(-1)?.zone ?? 'yellow';
  const demo = useDemoTeam(zone);
  const own = useOwnBand(!demo.enabled && bandConnected, zone);
  return demo.members[0] ?? own;
}

export function AthleteHome({ onOpenBand }: { onOpenBand: () => void }) {
  const styles = useAthleteStyles(baseStyles);
  const team = useCoachDataState('athlete');
  const data = team.data;
  const membership = useMembership();
  const band = useMyBand();
  const latest = data?.readings.at(-1) ?? null;
  const guidance = latest ? UIL_GUIDANCE[latest.zone] : null;
  const [rulesOpen, setRulesOpen] = useState(false);
  // Until the coach approves them, an athlete can't see the team's practice, so say why.
  const waiting = !data?.sample && membership?.status === 'pending';
  const noTeam = !data?.sample && team.status === 'no-team' && (membership === null || membership?.status === 'declined');
  return (
    <>
      {waiting ? (
        <Card message={`Your request to join ${membership.team?.teamName ?? 'the team'} is with your coach. Practice readings show up here once they approve you.`} title="Waiting for approval" />
      ) : noTeam ? (
        <Card message={membership?.status === 'declined' ? 'Your coach declined the request. Check the code with them and try again.' : 'Enter the six-digit code from your coach.'} onPress={() => router.push('/setup/athlete')} title="Join your team" />
      ) : null}
      {!waiting && !noTeam ? team.status === 'error' ? (
        <Card title="Practice data unavailable"><ActionButton label="Try again" onPress={team.retry} variant="secondary" /></Card>
      ) : <>
        <FieldHero data={data} onAction={() => setRulesOpen(true)} readOnly />
        <PracticeCard data={data} onOpenPlan={() => setRulesOpen(true)} readOnly />
        <TodaysReadings data={data} />
      </> : null}
      <Modal animationType="slide" onRequestClose={() => setRulesOpen(false)} presentationStyle="pageSheet" visible={rulesOpen}>
        <View style={styles.guidanceSheet}>
          <View style={styles.homeModuleHead}>
            <Text accessibilityRole="header" style={styles.homeModuleTitle}>Practice guidance</Text>
            <ActionButton label="Done" onPress={() => setRulesOpen(false)} variant="secondary" />
          </View>
          <ScrollView contentContainerStyle={styles.guidanceSheetContent}>
            {latest && guidance ? <>
              <Text style={styles.homeGuidanceSummary}>{guidance.summary}</Text>
              <ZoneRules hideSummary latest={latest} uilClass={data?.session?.uilClass ?? 3} />
            </> : <Text style={styles.homeGuidanceRule}>Your coach’s field readings and current zone guidance will appear when practice starts.</Text>}
          </ScrollView>
        </View>
      </Modal>
      <View style={styles.homeBandPanel}>
        <View style={styles.homeModuleHead}>
          <PressScale accessibilityLabel="View your band" accessibilityHint="Opens your individual band signals and charts" accessibilityRole="button" onPress={onOpenBand} style={styles.homeBandLink}>
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><BandSpot height={84} id="athlete-home" quiet travel={false} /></View>
            <View style={styles.homeBandCopy}><Text style={styles.homeModuleTitle}>Your band</Text><Text style={styles.homeDisclosureText}>View band ›</Text></View>
          </PressScale>
          {band ? <SimulatedTag compact /> : null}
        </View>
        {band ? (
          <BodyStrip member={band} />
        ) : <>
          <Text style={styles.homeGuidanceRule}>Pair a HeatSense Band to view your personal signals. Field readings still guide practice.</Text>
          <ActionButton label="Pair your band" onPress={() => router.push('/pair-band')} style={styles.gapTop} variant="secondary" />
        </>}
      </View>
      <YourTrainer teamId={data?.teamId ?? null} />
      <SpeakUp />
    </>
  );
}

/** The athlete's link to their athletic trainer: who's looking after them at practice. */
function YourTrainer({ teamId }: { teamId: string | null }) {
  const trainers = useTrainers(teamId);
  if (!trainers.length) return null;
  return (
    <>
      <SectionTitle title="Your athletic trainer" />
      <Rows>
        {trainers.map((t) => <ListRow key={t.userId} label={t.displayName ?? 'Athletic trainer'} />)}
      </Rows>
    </>
  );
}

function SpeakUp() {
  const styles = useAthleteStyles(baseStyles);
  return (
    <View style={styles.speak}>
      <Text style={styles.speakTitle}>Feel off? Stop and tell a coach.</Text>
      <Text style={styles.empty}>Dizziness, nausea, a headache, cramps or confusion are reasons to stop right away. Don’t wait for a break.</Text>
    </View>
  );
}

/** The athlete's own band: their vitals in depth. The app centres on them, not the team. */
export function AthleteBand() {
  const Palette = useAthletePalette();
  const styles = useAthleteStyles(baseStyles);
  const { bandConnected } = usePreferences();
  const [signal, setSignal] = useState<BandSignal>('heart');
  const [preview, setPreview] = useState<BandPreviewPhase>('idle');
  const signalsRef = useRef<View>(null);
  const reveal = useDashboardScroll();
  // Sample athletes on: the demo athlete stands in. Otherwise a paired band shows the athlete's own signals.
  const me = useMyBand();
  if (me) {
    return (
      <>
        <BandViewer onPreviewPhase={setPreview} onExploreHeartRate={() => { setSignal('heart'); reveal(signalsRef.current); }} />
        <View ref={signalsRef} collapsable={false}>
          <VitalsDetail selectedSignal={signal} onSignalChange={setSignal} previewHeartRate={preview === 'press' || preview === 'reveal'} member={{ ...me, athlete: { ...me.athlete, name: 'You', position: 'Your band' } }} />
        </View>
        <Rows>
          <ListRow label="HeatSense Band" onPress={() => router.push('/pair-band')} value={bandConnected ? 'Connected' : 'Pair'} valueTone={bandConnected ? Palette.safe : Palette.coral} />
        </Rows>
      </>
    );
  }
  return (
    <>
      <View style={styles.bandHero}>
        <BandSpot height={180} id="athlete-band" quiet travel={false} />
        <Text style={styles.bandState}>{bandConnected ? 'Band connected' : 'No band paired'}</Text>
        <Text style={styles.bandNote}>Pair your band to see heart rate, skin temperature, sweat and movement here. Field readings already guide every practice.</Text>
      </View>
      <Rows>
        <ListRow label="HeatSense Band" onPress={() => router.push('/pair-band')} value={bandConnected ? 'Connected' : 'Pair'} valueTone={bandConnected ? Palette.safe : Palette.coral} />
      </Rows>
    </>
  );
}

const dayLabel = (d: Date) => d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

export function AthleteSessions() {
  const styles = useAthleteStyles(baseStyles);
  const team = useCoachDataState('athlete');
  const data = team.data;
  const temp = useTemperature();
  const history = usePastSessionsState(data?.teamId ?? null, Boolean(data?.sample), 40);
  const past = history.data;
  const [visible, setVisible] = useState(10);
  const today = new Date().toDateString();
  // Only measurements made today belong in today's calendar overlay.
  const todayPeak = (data?.readings ?? []).filter((reading) => reading.measuredAt.toDateString() === today).reduce<{ wbgtF: number; zone: Zone } | null>((hot, r) => (!hot || r.wbgtF > hot.wbgtF ? { wbgtF: r.wbgtF, zone: r.zone } : hot), null);
  const openSession = ({ session }: NonNullable<typeof past>[number]) => router.push({ pathname: '/practice-record', params: { role: 'athlete', teamId: session.teamId, id: session.id, ...(data?.sample ? { sample: '1' } : {}) } });
  if (team.status === 'loading') return <Text style={styles.empty}>Loading your team…</Text>;
  if (team.status === 'error') return <Card title="Couldn’t load your team"><ActionButton label="Try again" onPress={team.retry} variant="secondary" /></Card>;
  if (team.status === 'no-team') return <Card title="No team practice records yet" message="Your team’s saved practices appear here once your membership is approved." />;
  if (history.status === 'error') return <Card title="Couldn’t load past practices"><ActionButton label="Try again" onPress={history.retry} variant="secondary" /></Card>;
  return (
    <>
      {data?.sample ? <SampleTag /> : null}
      {past !== null ? <HeatHistory onOpenSession={openSession} past={past} temp={temp} today={todayPeak} /> : null}

      <SectionTitle title={past?.length ? `Recent practices · ${past.length}` : 'Recent practices'} />
      {past?.length === 40 ? <Text style={styles.empty}>Showing the latest 40 finished practices.</Text> : null}
      {past === null ? (
        <Text style={styles.empty}>Loading past practices…</Text>
      ) : past.length ? (
        <Rows>
          {past.slice(0, visible).map(({ session, readingCount, peak }) => {
            const minutes = session.endedAt ? Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 60_000) : null;
            return (
              <ListRow
                detail={`${session.venue}${minutes !== null ? ` · ${minutes} min` : ''} · ${readingCount} ${readingCount === 1 ? 'reading' : 'readings'}`}
                key={session.id}
                label={dayLabel(session.startedAt)}
                onPress={() => openSession({ session, readingCount, peak })}
                value={peak ? `${temp.value(peak.wbgtF)}${temp.unit} peak` : 'No reading'}
                valueTone={peak ? dot(peak.zone) : undefined}
              />
            );
          })}
        </Rows>
      ) : (
        <Text style={styles.empty}>Finished practices show up here with their hottest reading.</Text>
      )}
      {past && past.length > visible ? (
        <Rows><ListRow label={`Show ${Math.min(10, past.length - visible)} more practices`} onPress={() => setVisible((count) => count + 10)} /></Rows>
      ) : null}
    </>
  );
}

/* ─────────────────────────────── Athletic trainer ─────────────────────────────── */

export function TrainerHome({ onOpenMonitor }: { onOpenMonitor: () => void }) {
  return <CoachToday readOnly role="trainer"><TrainerHomeOverview onOpenMonitor={onOpenMonitor} /></CoachToday>;
}

const baseStyles = StyleSheet.create({
  guidanceSheet: { backgroundColor: Palette.canvas, flex: 1, padding: 20 },
  guidanceSheetContent: { gap: 16, paddingBottom: 32, paddingTop: 20 },
  homeBandLink: { alignItems: 'center', flexDirection: 'row', gap: 16, minHeight: 84, flexShrink: 1 },
  homeBandCopy: { gap: 8, flexShrink: 1 },
  homePressed: { opacity: 0.7 },
  homeGuidance: { borderTopColor: Palette.border, borderTopWidth: StyleSheet.hairlineWidth, gap: 8, marginTop: 28, paddingTop: 16 },
  homeModuleHead: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  homeModuleTitle: { color: Palette.ink, flexShrink: 1, fontSize: 21, fontWeight: '700', letterSpacing: -0.3 },
  homeDisclosure: { alignItems: 'center', justifyContent: 'center', minHeight: 48, minWidth: 48, paddingHorizontal: 8 },
  homeDisclosureText: { color: Palette.coral, fontSize: 16, fontWeight: '600' },
  homeGuidanceSummary: { color: Palette.ink, fontSize: 18, fontWeight: '500', lineHeight: 25 },
  homeGuidanceRule: { color: Palette.inkMuted, fontSize: 16, lineHeight: 23 },
  homeBandPanel: { borderTopColor: Palette.border, borderTopWidth: StyleSheet.hairlineWidth, gap: 4, marginTop: 28, paddingTop: 16 },
  homeBandAction: { paddingHorizontal: 0, paddingVertical: 8 },
  speak: { borderTopColor: Palette.border, borderTopWidth: StyleSheet.hairlineWidth, gap: 8, marginTop: 28, paddingTop: 20 },
  speakTitle: { color: Palette.ink, fontSize: 17, fontWeight: '600' },
  bandHero: { alignItems: 'center', gap: 10, marginBottom: 24, marginTop: 8 },
  bandState: { color: Palette.ink, fontSize: 24, fontWeight: '700' },
  bandNote: { color: Palette.inkMuted, fontSize: 16, lineHeight: 22, maxWidth: 330, textAlign: 'center' },
  dot: { borderRadius: 6, height: 12, width: 12 },
  gapTop: { marginTop: 12 },
  empty: { color: Palette.inkMuted, fontSize: 16, lineHeight: 22 },
});
