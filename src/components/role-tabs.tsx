import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ZoneRules } from '@/components/coach-tabs';
import { CoachToday } from '@/components/coach-today';
import { CapsLabel, ListRow, Rows, SampleTag, SectionTitle } from '@/components/whoop-ui';
import { Palette } from '@/constants/theme';
import { ZONES, type Zone } from '@/lib/practice';
import { UIL_GUIDANCE, zoneRange } from '@/lib/uil-wbgt';
import { recentSessions, SOURCE_LABEL, type SessionSummary } from '@/services/practice-sessions';
import { usePreferences, useTemperature } from '@/state/preferences';
import { SimulatedTag, TeamVitalsRows, VitalsDetail } from '@/components/vitals';
import { useDemoTeam } from '@/state/demo-team';
import { useCoachData, useTrainers } from '@/state/team-session';

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
  const latest = data?.readings.at(-1) ?? null;
  return (
    <>
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
        {trainers.map((t) => <ListRow detail="Find them first if you feel unwell" key={t.userId} label={t.displayName ?? 'Athletic trainer'} />)}
      </Rows>
    </>
  );
}

function SpeakUp() {
  return (
    <View style={styles.speak}>
      <Text style={styles.speakTitle}>Feel off? Stop and tell a coach.</Text>
      <Text style={styles.speakBody}>Dizziness, nausea, a headache, cramps or confusion are reasons to stop right away. Don’t wait for a break.</Text>
    </View>
  );
}

/** The athlete's own band: their vitals in depth. The app centres on them, not the team. */
export function AthleteBand() {
  const { bandConnected } = usePreferences();
  const data = useCoachData('athlete');
  const demo = useDemoTeam(data?.readings.at(-1)?.zone ?? 'yellow');
  const me = demo.members[0];
  if (demo.enabled && me) {
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
        <Text style={styles.bandNote}>Personal signals (heart rate, skin temperature, movement) appear here once the band’s firmware ships. Field readings already guide every practice.</Text>
      </View>
      <Rows>
        <ListRow label="HeatSense Band" onPress={() => router.push('/pair-band')} value={bandConnected ? 'Connected' : 'Pair'} valueTone={bandConnected ? Palette.safe : Palette.coral} />
      </Rows>
    </>
  );
}

// Shown in sample mode only, under the SAMPLE DATA tag, so the history has something to show.
const SAMPLE_HISTORY: { daysAgo: number; venue: string; minutes: number; readingCount: number; wbgtF: number; zone: Zone }[] = [
  { daysAgo: 1, venue: 'Memorial Stadium', minutes: 95, readingCount: 5, wbgtF: 86.2, zone: 'yellow' },
  { daysAgo: 2, venue: 'Memorial Stadium', minutes: 60, readingCount: 4, wbgtF: 88.4, zone: 'orange' },
  { daysAgo: 4, venue: 'Practice field 2', minutes: 110, readingCount: 6, wbgtF: 80.9, zone: 'green' },
];

/** The team's finished practices: real ones from the team, sample ones in sample mode. */
function usePastSessions(teamId: string | null, sample: boolean) {
  const [past, setPast] = useState<SessionSummary[] | null>(null);
  useEffect(() => {
    if (!teamId || sample) return;
    let live = true;
    recentSessions(teamId).then((list) => { if (live) setPast(list); }).catch(() => { if (live) setPast([]); });
    return () => { live = false; };
  }, [sample, teamId]);
  if (!sample) return teamId ? past : [];
  const day = 86_400_000;
  return SAMPLE_HISTORY.map((h, i) => {
    const startedAt = new Date(new Date().setHours(16, 0, 0, 0) - h.daysAgo * day);
    return {
      session: { id: `sample-${i}`, teamId: 'sample', venue: h.venue, uilClass: 3 as const, recheckMinutes: 30, startedAt, endedAt: new Date(startedAt.getTime() + h.minutes * 60_000) },
      readingCount: h.readingCount,
      peak: { wbgtF: h.wbgtF, zone: h.zone },
    };
  });
}

const dayLabel = (d: Date) => d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

export function AthleteSessions() {
  const data = useCoachData('athlete');
  const temp = useTemperature();
  const readings = [...(data?.readings ?? [])].reverse();
  const past = usePastSessions(data?.teamId ?? null, Boolean(data?.sample));
  return (
    <>
      {data?.sample ? <SampleTag /> : null}
      <CapsLabel>{data?.session ? `Today · ${data.session.venue}` : 'Today'}</CapsLabel>
      {readings.length ? (
        <Rows>
          {readings.map((r) => (
            <ListRow detail={`${time(r.measuredAt)} · ${SOURCE_LABEL[r.source]}`} key={r.id} label={ZONES[r.zone].label} trailing={<View style={[styles.dot, { backgroundColor: dot(r.zone) }]} />} value={`${temp.value(r.wbgtF)}${temp.unit}`} />
          ))}
        </Rows>
      ) : (
        <Text style={styles.empty}>No practice readings yet today. Your coach’s field readings show up here as they’re taken.</Text>
      )}

      <SectionTitle title="Earlier" />
      {past === null ? (
        <Text style={styles.empty}>Loading past practices…</Text>
      ) : past.length ? (
        <Rows>
          {past.map(({ session, readingCount, peak }) => {
            const minutes = session.endedAt ? Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 60_000) : null;
            return (
              <ListRow
                detail={[session.venue, minutes !== null ? `${minutes} min` : null, `${readingCount} reading${readingCount === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
                key={session.id}
                label={dayLabel(session.startedAt)}
                trailing={peak ? <View style={[styles.dot, { backgroundColor: dot(peak.zone) }]} /> : undefined}
                value={peak ? `Peak ${temp.value(peak.wbgtF)}${temp.unit}` : 'No readings'}
              />
            );
          })}
        </Rows>
      ) : (
        <Text style={styles.empty}>Finished practices show up here with their hottest reading.</Text>
      )}
    </>
  );
}

export function LearnTab() {
  return (
    <>
      <CapsLabel>What the zones mean (UIL Class 3)</CapsLabel>
      <Rows>
        {ZONE_ORDER.map((zone) => (
          <ListRow detail={UIL_GUIDANCE[zone].summary} key={zone} label={ZONES[zone].label} trailing={<View style={[styles.dot, { backgroundColor: dot(zone) }]} />} value={zoneRange(zone, 3).replace(' °F', '°')} />
        ))}
      </Rows>
      <SectionTitle title="Warning signs" />
      <Rows>
        <ListRow detail="Heavy sweating, dizziness, headache, nausea, muscle cramps, feeling weak." label="Heat exhaustion" />
        <ListRow detail="Confusion, slurred speech, collapse or not acting like yourself. This is an emergency." label="Heat stroke" />
      </Rows>
      <SectionTitle title="What to do" />
      <Rows>
        <ListRow detail="Tell a coach or trainer right away. Get to shade and drink water." label="Feeling off" />
        <ListRow detail="Call 911. Cool the athlete immediately, ideally in a cold-water tub, while help comes." label="Someone collapses" />
      </Rows>
    </>
  );
}

/* ─────────────────────────────── Athletic trainer ─────────────────────────────── */

export function TrainerHome() {
  return <CoachToday readOnly role="trainer" />;
}

export function TrainerMonitor() {
  const data = useCoachData('trainer');
  const demo = useDemoTeam(data?.readings.at(-1)?.zone ?? 'yellow');
  if (demo.enabled) {
    return (
      <>
        <SimulatedTag />
        <TeamVitalsRows members={demo.members} role="trainer" />
      </>
    );
  }
  return (
    <View style={styles.bandHero}>
      <Image accessibilityIgnoresInvertColors contentFit="contain" source={BAND} style={styles.band} />
      <Text style={styles.bandState}>No band signals yet</Text>
      <Text style={styles.bandNote}>When athletes pair a HeatSense Band and choose to share, their heart-rate recovery and skin-temperature trends appear here during practice.</Text>
    </View>
  );
}

export function ProtocolsTab() {
  return (
    <>
      <SectionTitle title="Emergency" />
      <Rows>
        <ListRow detail="Activate the emergency action plan and call 911." label="Collapse or confusion" valueTone={Palette.emergency} />
        <ListRow detail="Cold-water immersion on site, then transport. Keep the tub ready in Yellow and above." label="Cool first, transport second" />
        <ListRow detail="Stop activity, move to shade, remove equipment, give fluids, and monitor." label="Heat exhaustion" />
      </Rows>
      <SectionTitle title="UIL zones (Class 3)" />
      <Rows>
        {ZONE_ORDER.map((zone) => (
          <ListRow detail={UIL_GUIDANCE[zone].summary} key={zone} label={ZONES[zone].label} trailing={<View style={[styles.dot, { backgroundColor: dot(zone) }]} />} value={zoneRange(zone, 3).replace(' °F', '°')} />
        ))}
      </Rows>
    </>
  );
}

const styles = StyleSheet.create({
  speak: { backgroundColor: Palette.card, borderColor: Palette.coral, borderRadius: 18, borderWidth: 1, gap: 6, marginTop: 28, padding: 18 },
  speakTitle: { color: Palette.ink, fontSize: 18, fontWeight: '700' },
  speakBody: { color: Palette.inkMuted, fontSize: 15, lineHeight: 21 },
  bandHero: { alignItems: 'center', gap: 10, marginBottom: 24, marginTop: 8 },
  band: { height: 220, width: 220 },
  bandState: { color: Palette.ink, fontSize: 24, fontWeight: '700' },
  bandNote: { color: Palette.inkMuted, fontSize: 16, lineHeight: 22, maxWidth: 330, textAlign: 'center' },
  dot: { borderRadius: 6, height: 12, width: 12 },
  empty: { color: Palette.inkMuted, fontSize: 16, lineHeight: 22 },
});
