import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ZoneRules } from '@/components/coach-tabs';
import { CoachToday } from '@/components/coach-today';
import { Card, Facts, ListRow, Rows, SampleTag, SectionTitle, StatRow } from '@/components/whoop-ui';
import { Face, Palette } from '@/constants/theme';
import { ZONES, type Zone } from '@/lib/practice';
import { UIL_GUIDANCE, zoneRange } from '@/lib/uil-wbgt';
import { usePreferences, useTemperature } from '@/state/preferences';
import { VitalsDetail } from '@/components/vitals';
import { useDemoTeam, useOwnBand } from '@/state/demo-team';
import { usePastSessions } from '@/state/past-sessions';
import { useCoachData, useMembership, useTrainers } from '@/state/team-session';

// Athlete and athletic-trainer tabs on the same WHOOP-style kit as the coach's. Athletes see their
// team's real field reading (Firestore lets approved members read it). Band signals don't exist yet,
// so the screens that would show them say so instead of showing sample people.

const BAND = require('@/assets/images/heatsense-band-refined.png');
const ZONE_ORDER: Zone[] = ['green', 'yellow', 'orange', 'red', 'black'];
const dot = (zone: Zone) => (zone === 'black' ? '#8E8E93' : ZONES[zone].color);
const time = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/* ─────────────────────────────── Athlete ─────────────────────────────── */

export function AthleteHome() {
  const data = useCoachData('athlete');
  const membership = useMembership();
  const latest = data?.readings.at(-1) ?? null;
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
  const data = useCoachData('athlete');
  const demo = useDemoTeam(data?.readings.at(-1)?.zone ?? 'yellow');
  // Sample athletes on: the demo athlete stands in. Otherwise a paired band shows the athlete's own signals.
  const own = useOwnBand(!demo.enabled && bandConnected, data?.readings.at(-1)?.zone ?? 'yellow');
  const me = demo.members[0] ?? own;
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

/** Strava-style week: one bar per day, as tall as that day's peak WBGT and coloured by its zone. */
function WeekChart({ days, temp }: { days: { date: Date; peak: { wbgtF: number; zone: Zone } | null }[]; temp: { value: (f: number) => number | string } }) {
  const MIN = 70, MAX = 95, H = 120;
  return (
    <View accessibilityLabel={`This week's peak WBGT: ${days.map((d) => (d.peak ? `${d.date.toLocaleDateString([], { weekday: 'long' })} ${temp.value(d.peak.wbgtF)}` : null)).filter(Boolean).join(', ') || 'no practices yet'}`} accessible style={styles.week}>
      {days.map((d) => {
        const h = d.peak ? Math.max(14, ((Math.min(MAX, Math.max(MIN, d.peak.wbgtF)) - MIN) / (MAX - MIN)) * H) : 6;
        return (
          <View key={d.date.toDateString()} style={styles.weekCol}>
            <Text style={styles.weekValue}>{d.peak ? temp.value(d.peak.wbgtF) : ''}</Text>
            <View style={[styles.weekBar, { backgroundColor: d.peak ? dot(d.peak.zone) : Palette.surfaceMuted, height: h }]} />
            <Text style={styles.weekDay}>{d.date.toLocaleDateString([], { weekday: 'narrow' })}</Text>
          </View>
        );
      })}
    </View>
  );
}

const dayLabel = (d: Date) => d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

export function AthleteSessions() {
  const data = useCoachData('athlete');
  const temp = useTemperature();
  const readings = [...(data?.readings ?? [])].reverse();
  const latest = readings[0] ?? null;
  const past = usePastSessions(data?.teamId ?? null, Boolean(data?.sample));
  // The last seven days, today last: the hottest reading of each day's practices.
  const todayPeak = readings.reduce<{ wbgtF: number; zone: Zone } | null>((hot, r) => (!hot || r.wbgtF > hot.wbgtF ? { wbgtF: r.wbgtF, zone: r.zone } : hot), null);
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() - (6 - i));
    const dayPeaks = (past ?? []).filter((p) => p.peak && p.session.startedAt.toDateString() === date.toDateString()).map((p) => p.peak!);
    if (i === 6 && todayPeak) dayPeaks.push(todayPeak);
    const peak = dayPeaks.reduce<{ wbgtF: number; zone: Zone } | null>((hot, p) => (!hot || p.wbgtF > hot.wbgtF ? p : hot), null);
    return { date, peak };
  });
  return (
    <>
      {data?.sample ? <SampleTag /> : null}
      <Card title="This week">
        <WeekChart days={week} temp={temp} />
      </Card>
      <View style={styles.gapTop} />
      {data?.session ? (
        <Card title={`Today · ${data.session.venue}`}>
          <StatRow stats={[
            { label: 'Latest WBGT', value: latest ? `${temp.value(latest.wbgtF)}` : '--', unit: latest ? temp.unit : undefined },
            { label: 'Zone', value: latest ? ZONES[latest.zone].label.replace(' zone', '') : '--', tone: latest ? dot(latest.zone) : undefined },
            { label: 'Readings', value: String(readings.length) },
          ]} />
        </Card>
      ) : (
        <Card message="No practice today. Your coach’s field readings show up here as they’re taken." title="Today" />
      )}
      {readings.length ? (
        <View style={styles.gapTop}>
          <Rows>
            {readings.map((r) => (
              <ListRow key={r.id} label={time(r.measuredAt)} trailing={<View style={[styles.dot, { backgroundColor: dot(r.zone) }]} />} value={`${temp.value(r.wbgtF)}${temp.unit}`} />
            ))}
          </Rows>
        </View>
      ) : null}

      <SectionTitle title="Earlier" />
      {past === null ? (
        <Text style={styles.empty}>Loading past practices…</Text>
      ) : past.length ? (
        <View style={styles.cards}>
          {past.slice(0, 5).map(({ session, readingCount, peak }) => {
            const minutes = session.endedAt ? Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 60_000) : null;
            return (
              <Card key={session.id} title={dayLabel(session.startedAt)}>
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

const zoneFacts = () => ZONE_ORDER.map((zone) => ({ title: `${ZONES[zone].label}, ${zoneRange(zone, 3).replace(' °F', '°F')}`, body: UIL_GUIDANCE[zone].summary, tone: dot(zone) }));

export function LearnTab() {
  return (
    <>
      <SectionTitle title="What the zones mean" />
      <Facts items={zoneFacts()} />
      <SectionTitle title="Warning signs" />
      <Facts items={[
        { title: 'Heat exhaustion', body: 'Heavy sweating, dizziness, headache, nausea, muscle cramps, feeling weak.' },
        { title: 'Heat stroke', body: 'Confusion, slurred speech, collapse or not acting like yourself. This is an emergency.', tone: Palette.emergency },
      ]} />
      <SectionTitle title="What to do" />
      <Facts items={[
        { title: 'Feeling off', body: 'Tell a coach or trainer right away. Get to shade and drink water.' },
        { title: 'Someone collapses', body: 'Call 911. Cool them immediately, ideally in a cold-water tub, while help comes.', tone: Palette.emergency },
      ]} />
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
  week: { alignItems: 'flex-end', flexDirection: 'row', gap: 8, height: 170 },
  weekCol: { alignItems: 'center', flex: 1, gap: 6, justifyContent: 'flex-end' },
  weekBar: { borderRadius: 6, width: '100%' },
  weekValue: { color: Palette.ink, fontFamily: Face.figure, fontSize: 18 },
  weekDay: { color: Palette.inkMuted, fontSize: 14, fontWeight: '500' },
  cards: { gap: 12 },
  empty: { color: Palette.inkMuted, fontSize: 16, lineHeight: 22 },
});
