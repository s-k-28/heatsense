import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { FieldCheckSheet } from '@/components/field-check-sheet';
import { SampleTag } from '@/components/whoop-ui';
import { Palette } from '@/constants/theme';
import { enter, leave, settle } from '@/lib/motion';
import { ZONES, type Zone } from '@/lib/practice';
import { recheckStatus } from '@/services/practice-sessions';
import { useDemoTeam } from '@/state/demo-team';
import { useTemperature } from '@/state/preferences';
import { useCoachData, useNow, useRoster } from '@/state/team-session';

// Alerts are derived from what actually happened in today's practice: a late recheck, guidance not
// yet applied, the field changing zones, athletes waiting to join. Nothing here is invented, so an
// empty list means the practice record is in order.

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

export function AlertsTab({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const data = useCoachData();
  const roster = useRoster(data?.teamId ?? null);
  const temp = useTemperature();
  const now = useNow();
  const [sheet, setSheet] = useState(false);
  const reduced = useReducedMotion();
  const openSheet = { label: 'Open practice', onPress: () => setSheet(true) };

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
  const demo = useDemoTeam(latest?.zone ?? 'yellow');
  demo.members.filter((m) => m.status === 'watch').forEach((m) => {
    items.push({ id: `vitals-${m.athlete.id}`, tone: Palette.warning, open: true, at: null, title: `${m.athlete.name}: slow recovery`, detail: `Heart rate ${m.vitals.heartRate} bpm and staying high through this break. Simulated band data.`, action: { label: 'View vitals', onPress: () => router.push({ pathname: '/athlete-vitals', params: { id: m.athlete.id } }) } });
  });
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
      {data?.sample ? <SampleTag /> : null}
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
    <View accessible={!item.action} style={styles.card}>
      <View style={styles.cardCopy}>
        <View style={styles.cardTop}>
          <View style={[styles.dot, { backgroundColor: item.tone }, !item.open && styles.dotDone]} />
          <Text style={styles.cardTitle}>{item.title}</Text>
          {item.at ? <Text style={styles.cardTime}>{time(item.at)}</Text> : null}
        </View>
        <Text style={styles.cardBody}>{item.detail}</Text>
        {item.action ? (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={item.action.onPress} style={({ pressed }) => pressed && { opacity: 0.7 }}>
            <Text style={[styles.cardAction, { color: item.tone }]}>{item.action.label}</Text>
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
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { backgroundColor: Palette.card, borderRadius: 20, flexDirection: 'row', paddingVertical: 18 },
  stat: { alignItems: 'center', flex: 1, gap: 4 },
  statValue: { color: Palette.ink, fontSize: 26, fontVariant: ['tabular-nums'], fontWeight: '700' },
  statLabel: { color: Palette.inkMuted, fontSize: 14, fontWeight: '500' },
  clear: { alignItems: 'center', gap: 8, paddingVertical: 40 },
  clearMark: { alignItems: 'center', borderColor: Palette.safe, borderRadius: 36, borderWidth: 2, height: 72, justifyContent: 'center', width: 72 },
  clearCheck: { color: Palette.safe, fontSize: 32, fontWeight: '700' },
  clearTitle: { color: Palette.ink, fontSize: 24, fontWeight: '700', marginTop: 6 },
  clearBody: { color: Palette.inkMuted, fontSize: 16, lineHeight: 22, maxWidth: 300, textAlign: 'center' },
  section: { color: Palette.ink, fontSize: 22, fontWeight: '700', letterSpacing: -0.3, marginBottom: 12, marginTop: 30 },
  list: { gap: 12, marginTop: 16 },
  card: { backgroundColor: Palette.surface, borderRadius: 16 },
  dot: { borderRadius: 5, height: 10, marginTop: 7, width: 10 },
  dotDone: { opacity: 0.4 },
  cardCopy: { flex: 1, gap: 6, padding: 16 },
  cardTop: { alignItems: 'flex-start', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  cardTitle: { color: Palette.ink, flex: 1, fontSize: 18, fontWeight: '600' },
  cardTime: { color: Palette.inkMuted, fontSize: 14, fontVariant: ['tabular-nums'] },
  cardBody: { color: Palette.inkMuted, fontSize: 15, lineHeight: 21 },
  cardAction: { fontSize: 16, fontWeight: '600', marginTop: 6 },
});
