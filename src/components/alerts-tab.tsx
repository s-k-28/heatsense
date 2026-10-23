import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { FieldCheckSheet } from '@/components/field-check-sheet';
import { Palette } from '@/constants/theme';
import { enter, leave, settle } from '@/lib/motion';
import { ZONES, type Zone } from '@/lib/practice';
import { UIL_GUIDANCE, zoneThresholds } from '@/lib/uil-wbgt';
import { recheckStatus } from '@/services/practice-sessions';
import { useDemoTeam } from '@/state/demo-team';
import { buildSchedule, usePracticePlans } from '@/state/practice-plans';
import { useTemperature } from '@/state/preferences';
import { useCoachData, useNow, useRoster } from '@/state/team-session';

// Alerts are derived from what actually happened in today's practice: a late recheck, guidance not
// yet applied, the field nearing or changing zones, the next water break, athletes waiting to join.
// With the Demo team switched on, simulated band alerts join them, each marked Simulated.

type Item = {
  id: string;
  tone: string;
  title: string;
  detail: string;
  at: Date | null;
  open: boolean;
  action?: { label: string; onPress: () => void };
};

const zoneColor = (zone: Zone) => (zone === 'black' ? '#8E8E93' : ZONES[zone].color);
const time = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const ORDER: Zone[] = ['green', 'yellow', 'orange', 'red', 'black'];

export function AlertsTab({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const data = useCoachData();
  const roster = useRoster(data?.teamId ?? null);
  const temp = useTemperature();
  const now = useNow();
  const [sheet, setSheet] = useState(false);
  const reduced = useReducedMotion();
  const openSheet = { label: 'Open practice', onPress: () => setSheet(true) };
  const { active: plan } = usePracticePlans();

  const items: Item[] = [];
  const readings = data?.readings ?? [];
  const latest = readings.at(-1) ?? null;
  const session = data?.session ?? null;

  if (session) {
    const recheck = recheckStatus(session, latest, now);
    if (recheck.overdue) {
      items.push({ id: 'overdue', tone: Palette.emergency, open: true, at: new Date(recheck.dueAt), title: 'Field reading overdue', detail: `${Math.round(-recheck.msLeft / 60_000)} min late. Your plan rechecks every ${session.recheckMinutes} min.`, action: { label: 'Add a reading', onPress: () => setSheet(true) } });
    }
  }
  if (latest && !latest.acknowledgedAt) {
    items.push({ id: `ack-${latest.id}`, tone: Palette.warning, open: true, at: latest.measuredAt, title: 'Guidance not applied yet', detail: `${temp.value(latest.wbgtF)}${temp.unit} · ${ZONES[latest.zone].label}. Confirm you’ve made the UIL changes.`, action: openSheet });
  }
  // Close to the next zone: say what changes when it gets there.
  if (latest && latest.zone !== 'black') {
    const next = ORDER[ORDER.indexOf(latest.zone) + 1] as Exclude<Zone, 'green'>;
    const headroom = zoneThresholds(session?.uilClass ?? 3)[next] - latest.wbgtF;
    if (headroom <= 3) {
      items.push({ id: `near-${latest.id}`, tone: zoneColor(next), open: true, at: latest.measuredAt, title: `${headroom.toFixed(1).replace(/\.0$/, '')}° from ${ZONES[next].label}`, detail: `At ${ZONES[next].label}: ${UIL_GUIDANCE[next].summary}`, action: { label: 'View rules', onPress: () => onNavigate('plan') } });
    }
  }
  // The plan's next water break, when it's close.
  const clock = new Date(now);
  const nowMinutes = clock.getHours() * 60 + clock.getMinutes();
  const nextBreak = session ? buildSchedule(plan).find((b) => b.kind === 'rest' && b.start >= nowMinutes) : undefined;
  if (nextBreak && nextBreak.start - nowMinutes <= 15) {
    const at = new Date(clock);
    at.setHours(Math.floor(nextBreak.start / 60), nextBreak.start % 60, 0, 0);
    items.push({ id: `break-${nextBreak.start}`, tone: Palette.info, open: true, at, title: `${nextBreak.title} in ${nextBreak.start - nowMinutes} min`, detail: `Shade and water for ${nextBreak.minutes} min${plan.equipment === 'on' ? '' : ', gear off'}.` });
  }
  const demo = useDemoTeam(latest?.zone ?? 'yellow');
  demo.members.filter((m) => m.status === 'watch').forEach((m) => {
    items.push({ id: `vitals-${m.athlete.id}`, tone: Palette.warning, open: true, at: null, title: `${m.athlete.name}: slow recovery`, detail: `Heart rate ${m.vitals.heartRate} bpm and staying high through this break. Simulated band data.`, action: { label: 'View vitals', onPress: () => router.push({ pathname: '/athlete-vitals', params: { id: m.athlete.id } }) } });
  });
  // Simulated band alerts for the demo team, so the feed shows what a practice with bands looks like.
  if (demo.enabled && demo.members.length >= 4) {
    const [a, b, c, d] = demo.members;
    const ago = (minutes: number) => new Date(now - minutes * 60_000);
    items.push({ id: 'sim-offline', tone: Palette.warning, open: true, at: ago(4), title: `${d.athlete.name}: band offline`, detail: 'No data for 4 min. Check the band is on and in range. Simulated.', action: { label: 'View vitals', onPress: () => router.push({ pathname: '/athlete-vitals', params: { id: d.athlete.id } }) } });
    items.push({ id: 'sim-recovered', tone: Palette.safe, open: false, at: ago(38), title: `${a.athlete.name} back to resting rate`, detail: 'Heart rate 92 bpm after 6 min in the cooling zone. Simulated.' });
    items.push({ id: 'sim-break', tone: Palette.info, open: false, at: ago(55), title: 'Water break completed', detail: `All ${demo.members.length} athletes checked in at the water station. Simulated.` });
    items.push({ id: 'sim-peak', tone: Palette.emergency, open: false, at: ago(72), title: `${b.athlete.name} peaked at 191 bpm`, detail: `Pulled for 8 min and cleared by the athletic trainer. ${c.athlete.name} covered the drill. Simulated.` });
  }
  const waiting = roster?.filter((m) => m.status === 'pending') ?? [];
  if (waiting.length) {
    items.push({ id: 'join', tone: Palette.info, open: true, at: waiting[0].requestedAt, title: `${waiting.length} ${waiting.length === 1 ? 'athlete is' : 'athletes are'} waiting to join`, detail: 'Approve them so they see the field zone and practice plan.', action: { label: 'Review', onPress: () => onNavigate('team') } });
  }
  readings.forEach((reading, i) => {
    const before = readings[i - 1];
    if (!before || before.zone === reading.zone) return;
    items.push({ id: `zone-${reading.id}`, tone: zoneColor(reading.zone), open: false, at: reading.measuredAt, title: `Field moved into ${ZONES[reading.zone].label}`, detail: `${temp.value(before.wbgtF)} → ${temp.value(reading.wbgtF)}${temp.unit} WBGT` });
  });

  const open = items.filter((i) => i.open);
  const history = items.filter((i) => !i.open).sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0));

  return (
    <>
      {data?.sample ? <Text style={styles.sample}>SAMPLE DATA</Text> : null}
      <View style={styles.summary}>
        <Stat label="Open" tone={open.length ? Palette.emergency : Palette.safe} value={String(open.length)} />
        <Stat label="Readings" value={String(readings.length)} />
        <Stat label="Last reading" value={latest ? time(latest.measuredAt) : '--'} />
      </View>

      {open.length === 0 ? (
        <View style={styles.clear}>
          <View style={styles.clearMark}><Text style={styles.clearCheck}>✓</Text></View>
          <Text style={styles.clearTitle}>All clear</Text>
          <Text style={styles.clearBody}>{session ? 'Readings are on time and every change has been applied.' : 'No practice running. Alerts show up here once you start one.'}</Text>
        </View>
      ) : (
        <View style={styles.list}>{open.map((item, i) => <Animated.View entering={enter(i, reduced)} exiting={leave(reduced)} key={item.id} layout={settle(reduced)}><AlertCard item={item} /></Animated.View>)}</View>
      )}

      {history.length ? (
        <>
          <Text accessibilityRole="header" style={styles.section}>Earlier today</Text>
          <View style={styles.list}>{history.map((item, i) => <Animated.View entering={enter(i + open.length, reduced)} key={item.id} layout={settle(reduced)}><AlertCard item={item} /></Animated.View>)}</View>
        </>
      ) : null}

      <FieldCheckSheet onClose={() => setSheet(false)} visible={sheet} />
    </>
  );
}

function AlertCard({ item }: { item: Item }) {
  return (
    <View accessible={!item.action} style={[styles.card, item.open && { borderColor: item.tone }]}>
      <View style={[styles.bar, { backgroundColor: item.tone }]} />
      <View style={styles.cardCopy}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          {item.at ? <Text style={styles.cardTime}>{time(item.at)}</Text> : null}
        </View>
        <Text style={styles.cardBody}>{item.detail}</Text>
        {item.action ? (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={item.action.onPress} style={({ pressed }) => pressed && { opacity: 0.7 }}>
            <Text style={[styles.cardAction, { color: item.tone }]}>{item.action.label.toUpperCase()}  →</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function Stat({ label, tone, value }: { label: string; tone?: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, tone ? { color: tone } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sample: { color: Palette.inkMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.6, marginBottom: 10, textAlign: 'center' },
  summary: { backgroundColor: Palette.card, borderRadius: 20, flexDirection: 'row', paddingVertical: 18 },
  stat: { alignItems: 'center', flex: 1, gap: 4 },
  statValue: { color: Palette.ink, fontSize: 26, fontVariant: ['tabular-nums'], fontWeight: '700' },
  statLabel: { color: Palette.inkMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1.3 },
  clear: { alignItems: 'center', gap: 8, paddingVertical: 40 },
  clearMark: { alignItems: 'center', borderColor: Palette.safe, borderRadius: 36, borderWidth: 2, height: 72, justifyContent: 'center', width: 72 },
  clearCheck: { color: Palette.safe, fontSize: 32, fontWeight: '700' },
  clearTitle: { color: Palette.ink, fontSize: 24, fontWeight: '700', marginTop: 6 },
  clearBody: { color: Palette.inkMuted, fontSize: 16, lineHeight: 22, maxWidth: 300, textAlign: 'center' },
  section: { color: Palette.ink, fontSize: 24, fontWeight: '700', letterSpacing: -0.4, marginBottom: 12, marginTop: 30 },
  list: { gap: 12, marginTop: 16 },
  card: { backgroundColor: Palette.card, borderColor: Palette.cardEdge, borderRadius: 18, borderWidth: 1, flexDirection: 'row', overflow: 'hidden' },
  bar: { width: 5 },
  cardCopy: { flex: 1, gap: 6, padding: 16 },
  cardTop: { alignItems: 'baseline', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  cardTitle: { color: Palette.ink, flex: 1, fontSize: 18, fontWeight: '700' },
  cardTime: { color: Palette.inkMuted, fontSize: 14, fontVariant: ['tabular-nums'] },
  cardBody: { color: Palette.inkMuted, fontSize: 15, lineHeight: 21 },
  cardAction: { fontSize: 13, fontWeight: '800', letterSpacing: 1.3, marginTop: 4 },
});
