import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ZoneRules } from '@/components/coach-tabs';
import { CoachToday } from '@/components/coach-today';
import { CapsLabel, ListRow, Rows, SampleTag, SectionTitle } from '@/components/whoop-ui';
import { Palette } from '@/constants/theme';
import { ZONES, type Zone } from '@/lib/practice';
import { UIL_GUIDANCE, zoneRange } from '@/lib/uil-wbgt';
import { SOURCE_LABEL } from '@/services/practice-sessions';
import { usePreferences, useTemperature } from '@/state/preferences';
import { LiveBandVitals, SimulatedTag, TeamVitalsRows, VitalsDetail } from '@/components/vitals';
import { useBand } from '@/state/band-ble';
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
  const band = useBand();
  const data = useCoachData('athlete');
  const demo = useDemoTeam(data?.readings.at(-1)?.zone ?? 'yellow');
  const me = demo.members[0];
  // A real band paired on this phone comes first: its live data replaces the simulated stream.
  if (band.device && (band.status === 'connected' || band.reading)) return <LiveBandVitals />;
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

export function AthleteSessions() {
  const data = useCoachData('athlete');
  const temp = useTemperature();
  const readings = [...(data?.readings ?? [])].reverse();
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
