import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ZoneRules } from '@/components/coach-tabs';
import { CoachToday } from '@/components/coach-today';
import { Card, ListRow, Rows, SampleTag, SectionTitle, StatRow } from '@/components/whoop-ui';
import { Palette } from '@/constants/theme';
import { ACCLIMATIZATION_DAYS } from '@/lib/acclimatization';
import { ZONES, type Zone } from '@/lib/practice';
import { usePreferences, useTemperature } from '@/state/preferences';
import { AcclimatizationCard } from '@/components/acclimatization-card';
import { BodyStrip } from '@/components/body-strip';
import { HeatHistory } from '@/components/heat-calendar';
import { VitalsDetail } from '@/components/vitals';
import { useDemoTeam, useOwnBand } from '@/state/demo-team';
import { usePastSessions } from '@/state/past-sessions';
import { useCoachData, useMembership, useTrainers } from '@/state/team-session';

// Athlete tabs (Home, Band, Sessions) and the trainer's Home. Athletes see their team's real field
// reading (Firestore lets approved members read it) and their own band, simulated until the
// firmware ships and labelled that way.

const BAND = require('@/assets/images/heatsense-band-refined.png');
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
  const data = useCoachData('athlete');
  const membership = useMembership();
  const band = useMyBand();
  const past = usePastSessions(data?.teamId ?? null, Boolean(data?.sample), 20);
  const latest = data?.readings.at(-1) ?? null;
  // Sample mode follows the demo athlete; a real athlete counts the team's practice days so far.
  // ponytail: counts days before they joined too; use the membership's join date once athletes can read it.
  const practiceDays = new Set([...(past ?? []).map((p) => p.session.startedAt.toDateString()), ...(data?.session ? [data.session.startedAt.toDateString()] : [])]).size;
  const acclimatization = data?.sample && band ? band.athlete.acclimatizationDay : Math.min(ACCLIMATIZATION_DAYS, practiceDays);
  // Until the coach approves them, an athlete can't see the team's practice, so say why.
  const waiting = !data?.sample && membership?.status === 'pending';
  const noTeam = !data?.sample && (membership === null || membership?.status === 'declined');
  return (
    <>
      {waiting ? (
        <Card message={`Your request to join ${membership.team?.teamName ?? 'the team'} is with your coach. Practice readings show up here once they approve you.`} title="Waiting for approval" />
      ) : noTeam ? (
        <Card message={membership?.status === 'declined' ? 'Your coach declined the request. Check the code with them and try again.' : 'Enter the six-digit code from your coach.'} onPress={() => router.push('/setup/athlete')} title="Join your team" />
      ) : null}
      <CoachToday readOnly role="athlete" />
      {band ? (
        <>
          <SectionTitle title="Your body" />
          <BodyStrip member={band} onPress={onOpenBand} />
        </>
      ) : null}
      {data?.teamId || data?.sample ? <View style={styles.gapTop}><AcclimatizationCard day={acclimatization} title="Your heat acclimatization" /></View> : null}
      {latest ? (
        <>
          <SectionTitle title="What changes today" />
          <ZoneRules latest={latest} uilClass={data?.session?.uilClass ?? 3} />
        </>
      ) : null}
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
  return (
    <View style={styles.speak}>
      <Card message="Dizziness, nausea, a headache, cramps or confusion are reasons to stop right away. Don’t wait for a break." title="Feel off? Stop and tell a coach." />
    </View>
  );
}

/** The athlete's own band: their vitals in depth. The app centres on them, not the team. */
export function AthleteBand() {
  const { bandConnected } = usePreferences();
  // Sample athletes on: the demo athlete stands in. Otherwise a paired band shows the athlete's own signals.
  const me = useMyBand();
  if (me) {
    return (
      <>
        <VitalsDetail member={{ ...me, athlete: { ...me.athlete, name: 'You', position: 'Your band' } }} />
        <Rows>
          <ListRow label="HeatSense Band" onPress={() => router.push('/pair-band')} value={bandConnected ? 'Connected' : 'Pair'} valueTone={bandConnected ? Palette.safe : Palette.coral} />
        </Rows>
      </>
    );
  }
  return (
    <>
      <View style={styles.bandHero}>
        <Image accessibilityIgnoresInvertColors contentFit="contain" source={BAND} style={styles.band} />
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
  const data = useCoachData('athlete');
  const temp = useTemperature();
  const past = usePastSessions(data?.teamId ?? null, Boolean(data?.sample), 40);
  // Today's practice counts toward the history the moment it has a reading; the readings live on Home.
  const todayPeak = (data?.readings ?? []).reduce<{ wbgtF: number; zone: Zone } | null>((hot, r) => (!hot || r.wbgtF > hot.wbgtF ? { wbgtF: r.wbgtF, zone: r.zone } : hot), null);
  return (
    <>
      {data?.sample ? <SampleTag /> : null}
      <HeatHistory past={past ?? []} temp={temp} today={todayPeak} />

      <SectionTitle title="Earlier" />
      {past === null ? (
        <Text style={styles.empty}>Loading past practices…</Text>
      ) : past.length ? (
        <View style={styles.cards}>
          {past.slice(0, 5).map(({ session, readingCount, peak }) => {
            const minutes = session.endedAt ? Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 60_000) : null;
            return (
              <Card key={session.id} title={`${dayLabel(session.startedAt)} · ${session.venue}`}>
                <StatRow stats={[
                  { label: 'Peak WBGT', value: peak ? `${temp.value(peak.wbgtF)}` : '--', unit: peak ? temp.unit : undefined, tone: peak ? dot(peak.zone) : undefined },
                  { label: 'Length', value: minutes !== null ? String(minutes) : '--', unit: minutes !== null ? ' min' : undefined },
                  { label: 'Readings', value: String(readingCount) },
                ]} />
              </Card>
            );
          })}
        </View>
      ) : (
        <Text style={styles.empty}>Finished practices show up here with their hottest reading.</Text>
      )}
    </>
  );
}

/* ─────────────────────────────── Athletic trainer ─────────────────────────────── */

export function TrainerHome() {
  return <CoachToday readOnly role="trainer" />;
}

const styles = StyleSheet.create({
  speak: { marginTop: 28 },
  bandHero: { alignItems: 'center', gap: 10, marginBottom: 24, marginTop: 8 },
  band: { height: 220, width: 220 },
  bandState: { color: Palette.ink, fontSize: 24, fontWeight: '700' },
  bandNote: { color: Palette.inkMuted, fontSize: 16, lineHeight: 22, maxWidth: 330, textAlign: 'center' },
  dot: { borderRadius: 6, height: 12, width: 12 },
  gapTop: { marginTop: 12 },
  cards: { gap: 12 },
  empty: { color: Palette.inkMuted, fontSize: 16, lineHeight: 22 },
});
