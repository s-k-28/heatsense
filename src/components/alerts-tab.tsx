import { surfaceStyles } from '@/components/ui/surface';
import { Text } from '@/components/ui/text';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { ActionButton } from '@/components/ui/action-button';
import { FieldCheckSheet } from '@/components/field-check-sheet';
import { SlidingTabs } from '@/components/sliding-tabs';
import { SampleTag } from '@/components/whoop-ui';
import { Face, Palette } from '@/constants/theme';
import { CoachPalette, CoachRadius, CoachType } from '@/constants/coach-theme';
import { enter, leave, settle } from '@/lib/motion';
import { ZONES, type Zone } from '@/lib/practice';
import { checkPlan } from '@/lib/plan-check';
import { UIL_GUIDANCE } from '@/lib/uil-wbgt';
import { recheckStatus } from '@/services/practice-sessions';
import { useAuthSession } from '@/state/auth-session';
import { useDemoTeam } from '@/state/demo-team';
import { usePracticePlans } from '@/state/practice-plans';
import { useTemperature } from '@/state/preferences';
import { useCoachData, useRoster, useTeamVitals } from '@/state/team-session';

// Alerts as an inbox that moves: a live status bar with the recheck countdown, open alerts you act
// on or resolve, and a resolved list with the day's zone changes. Everything is derived from the
// practice record and band vitals; resolving a band or roster alert is remembered for this session.

type Item = {
  id: string;
  tone: string;
  title: string;
  detail: string;
  sourceLabel?: string;
  at: Date | null;
  /** Open alerts need someone; closed ones are the record. */
  open: boolean;
  /** Whether "Resolve" can clear it here, or only the action (like applying guidance) can. */
  resolvable: boolean;
  action?: { label: string; onPress: () => void };
};

const zoneColor = (zone: Zone) => (zone === 'black' ? '#8E8E93' : ZONES[zone].color);
const time = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const clock = (ms: number) => `${Math.floor(ms / 60_000)}:${String(Math.floor((ms % 60_000) / 1000)).padStart(2, '0')}`;
function ago(d: Date, now: number) {
  const min = Math.max(0, Math.round((now - d.getTime()) / 60_000));
  return min < 1 ? 'Just now' : min < 60 ? `${min} min ago` : time(d);
}

function useSecond() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);
  return now;
}

export function AlertsTab({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const data = useCoachData();
  const roster = useRoster(data?.teamId ?? null);
  const live = useTeamVitals(data?.session ?? null);
  const temp = useTemperature();
  const now = useSecond();
  const reduced = useReducedMotion();
  const [sheet, setSheet] = useState(false);
  const [view, setView] = useState<'open' | 'resolved'>('open');
  const { user } = useAuthSession();
  const [resolution, setResolution] = useState<{ scope: string; dates: Record<string, Date> } | null>(null);
  const openSheet = { label: 'Open practice', onPress: () => setSheet(true) };

  const items: Item[] = [];
  const readings = data?.readings ?? [];
  const latest = readings.at(-1) ?? null;
  const session = data?.session ?? null;
  const resolutionScope = JSON.stringify([user?.uid ?? null, data?.sample ? 'sample' : data?.teamId ?? null, session?.id ?? null]);
  const resolved = resolution?.scope === resolutionScope ? resolution.dates : {};
  const recheck = session ? recheckStatus(session, latest, now) : null;

  if (recheck?.overdue) {
    items.push({ id: 'overdue', tone: Palette.emergency, open: true, resolvable: false, at: new Date(recheck.dueAt), title: 'Field reading overdue', detail: `Your plan rechecks every ${session!.recheckMinutes} min.`, action: { label: 'Add a reading', onPress: () => setSheet(true) } });
  }
  if (latest && !latest.acknowledgedAt) {
    items.push({ id: `ack-${latest.id}`, tone: Palette.warning, open: true, resolvable: false, at: latest.measuredAt, title: 'Guidance not applied yet', detail: `${temp.value(latest.wbgtF)}${temp.unit} · ${ZONES[latest.zone].label}. Confirm the UIL changes.`, action: openSheet });
  }
  // The field got hotter than today's plan allows: say which rules it breaks and open the plan.
  const { active: plan } = usePracticePlans();
  const planCheck = latest && session ? checkPlan(plan, UIL_GUIDANCE[latest.zone]) : null;
  if (planCheck && !planCheck.ok && latest) {
    const broken = planCheck.rows.filter((r) => !r.ok).map((r) => `${r.label.toLowerCase()} ${r.plan} (needs ${r.rule})`).join(', ');
    items.push({ id: `plan-${latest.id}-${plan.id}`, tone: Palette.warning, open: true, resolvable: false, at: latest.measuredAt, title: `${plan.name} doesn’t meet ${ZONES[latest.zone].label} rules`, detail: `${broken.charAt(0).toUpperCase()}${broken.slice(1)}.`, action: { label: 'Adjust plan', onPress: () => router.push({ pathname: '/plan-editor', params: { id: plan.id } }) } });
  }
  const demo = useDemoTeam(latest?.zone ?? 'yellow');
  demo.members.filter((m) => m.status === 'watch').forEach((m) => {
    items.push({ id: `vitals-${m.athlete.id}`, tone: Palette.warning, open: true, resolvable: true, sourceLabel: 'Simulated', at: null, title: `${m.athlete.name}: slow recovery`, detail: `${m.vitals.heartRate} bpm and staying high through this break.`, action: { label: 'View vitals', onPress: () => router.push({ pathname: '/athlete-vitals', params: { id: m.athlete.id } }) } });
  });
  live.filter((r) => r.recovery === 'watch').forEach((r) => {
    const name = roster?.find((m) => m.userId === r.athleteUid)?.displayName ?? 'Athlete';
    items.push({ id: `live-${r.athleteUid}`, tone: Palette.warning, open: true, resolvable: true, sourceLabel: r.source === 'simulated' ? 'Simulated' : 'Band', at: r.sampledAt, title: `${name}: slow recovery`, detail: `${r.heartRate} bpm and staying high through this break.`, action: { label: 'View vitals', onPress: () => router.push({ pathname: '/athlete-vitals', params: { id: r.athleteUid } }) } });
  });
  const waiting = roster?.filter((m) => m.status === 'pending') ?? [];
  if (waiting.length) {
    items.push({ id: `join-${waiting.length}`, tone: Palette.info, open: true, resolvable: true, at: waiting[0].requestedAt, title: `${waiting.length} ${waiting.length === 1 ? 'athlete wants' : 'athletes want'} to join`, detail: 'Approve them so they see the zone and plan.', action: { label: 'Review', onPress: () => onNavigate('team') } });
  }
  readings.forEach((reading, i) => {
    const before = readings[i - 1];
    if (!before || before.zone === reading.zone) return;
    items.push({ id: `zone-${reading.id}`, tone: zoneColor(reading.zone), open: false, resolvable: false, at: reading.measuredAt, title: `Field moved into ${ZONES[reading.zone].label}`, detail: `${temp.value(before.wbgtF)} → ${temp.value(reading.wbgtF)}${temp.unit} WBGT` });
  });

  const open = items.filter((i) => i.open && !resolved[i.id]);
  const closed = items
    .filter((i) => !i.open || resolved[i.id])
    .sort((a, b) => ((resolved[b.id] ?? b.at)?.getTime() ?? 0) - ((resolved[a.id] ?? a.at)?.getTime() ?? 0));
  const list = view === 'open' ? open : closed;

  if (!data) return (
    <View style={styles.clear}>
      <Text style={styles.clearTitle}>Practice data unavailable</Text>
      <Text style={styles.clearBody}>Alerts appear when practice data is available. Check your connection if this continues.</Text>
    </View>
  );

  return (
    <>
      {data?.sample ? <SampleTag /> : null}
      <StatusBar latest={latest} now={now} overdue={Boolean(recheck?.overdue)} msLeft={recheck?.msLeft ?? null} unit={temp.unit} value={latest ? temp.value(latest.wbgtF) : null} />

      <View style={styles.segmentWrap}><SlidingTabs label="Alert status" onChange={(index) => setView(index === 0 ? 'open' : 'resolved')} options={[`Open ${open.length}`, `Resolved ${closed.length}`]} selected={view === 'open' ? 0 : 1} variant="coach" /></View>

      {list.length === 0 ? (
        <View style={styles.clear}>
          <Text style={styles.clearTitle}>{view === 'open' ? 'No open alerts' : 'No resolved alerts'}</Text>
          <Text style={styles.clearBody}>{view === 'open' ? (session ? 'New practice and team alerts will appear here.' : 'Start a practice and alerts show up here.') : 'Resolved alerts and zone changes collect here.'}</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {list.map((item, i) => (
            <Animated.View entering={enter(i, reduced)} exiting={leave(reduced)} key={item.id} layout={settle(reduced)}>
              <AlertCard
                item={item}
                now={now}
                onResolve={item.resolvable && !resolved[item.id] ? () => setResolution(current => ({ scope: resolutionScope, dates: { ...(current?.scope === resolutionScope ? current.dates : {}), [item.id]: new Date() } })) : undefined}
                resolvedAt={resolved[item.id] ?? null}
              />
            </Animated.View>
          ))}
        </View>
      )}

      <FieldCheckSheet onClose={() => setSheet(false)} visible={sheet} />
    </>
  );
}

/** The field right now: zone, reading, and a live countdown to the next recheck. */
function StatusBar({ latest, now, overdue, msLeft, unit, value }: { latest: { zone: Zone; measuredAt: Date } | null; now: number; overdue: boolean; msLeft: number | null; unit: string; value: number | string | null }) {
  const tone = latest ? zoneColor(latest.zone) : Palette.inkFaint;
  return (
    <View accessible accessibilityLabel={latest ? `${ZONES[latest.zone].label}, ${value}${unit}. ${msLeft === null ? '' : overdue ? 'Reading overdue' : `Next reading in ${Math.ceil(msLeft / 60_000)} minutes`}` : 'No reading yet'} style={styles.status}>
      <View style={[styles.statusEdge, { backgroundColor: tone }]} />
      <View style={styles.statusCopy}>
        <Text style={[styles.statusZone, latest && { color: ZONES[latest.zone].text }]}>{latest ? ZONES[latest.zone].label : 'No reading yet'}</Text>
        <Text style={styles.statusMeta}>{latest ? `${value}${unit} · ${ago(latest.measuredAt, now)}` : 'Alerts start with the first reading'}</Text>
      </View>
      {msLeft !== null ? (
        <View style={styles.countdown}>
          <Text style={[styles.countdownValue, overdue && { color: Palette.emergency }]}>{overdue ? `+${clock(-msLeft)}` : clock(msLeft)}</Text>
          <Text style={styles.countdownLabel}>{overdue ? 'Late' : 'Next reading'}</Text>
        </View>
      ) : null}
    </View>
  );
}

function AlertCard({ item, now, onResolve, resolvedAt }: { item: Item; now: number; onResolve?: () => void; resolvedAt: Date | null }) {
  const done = !item.open || resolvedAt;
  return (
    <View style={[styles.card, done && styles.cardDone]}>
      <View style={[styles.edge, { backgroundColor: item.tone }, done && styles.edgeDone]} />
      <View style={styles.cardCopy}>
        <View accessible style={styles.cardTop}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardTime}>{item.sourceLabel ? `${item.sourceLabel} · ` : ''}{resolvedAt ? `Resolved ${time(resolvedAt)}` : item.at ? ago(item.at, now) : 'Now'}</Text>
        </View>
        <Text style={styles.cardBody}>{item.detail}</Text>
        {!done && (item.action || onResolve) ? (
          <View style={styles.actions}>
            {item.action ? (
              <ActionButton label={item.action.label} onPress={item.action.onPress} style={styles.primary} variant="secondary" />
            ) : null}
            {onResolve ? (
              <ActionButton label="Resolve" onPress={onResolve} style={styles.secondary} variant="text" />
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  status: { ...surfaceStyles.card, alignItems: 'center', flexDirection: 'row', gap: 14, minHeight: 104, overflow: 'hidden', paddingRight: 20 },
  statusEdge: { alignSelf: 'stretch', width: 6 },
  statusCopy: {  gap: 2, paddingVertical: 16, flex: 1, minWidth: 100 },
  statusZone: { color: CoachPalette.text, ...CoachType.card },
  statusMeta: { color: CoachPalette.muted, fontSize: 15, fontWeight: '600' },
  countdown: { alignItems: 'flex-end', flexShrink: 1 },
  countdownValue: { color: CoachPalette.text, fontFamily: Face.figure, fontSize: 36, lineHeight: 40 },
  countdownLabel: { color: CoachPalette.muted, ...CoachType.label },
  segmentsGap: { marginTop: 20 },
  badge: { alignItems: 'center', backgroundColor: 'rgba(235,235,245,0.18)', borderRadius: 10, height: 20, justifyContent: 'center',  paddingHorizontal: 6, minWidth: 20 },
  badgeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  clear: { ...surfaceStyles.card, alignItems: 'center', gap: 7, marginTop: 14, paddingHorizontal: 28, paddingVertical: 44 },
  clearTitle: { color: CoachPalette.text, ...CoachType.card },
  clearBody: { color: CoachPalette.muted, ...CoachType.body,   maxWidth: 300, textAlign: 'center' },
  list: { gap: 12, marginTop: 14 },
  card: { ...surfaceStyles.card, flexDirection: 'row', overflow: 'hidden' },
  cardDone: { backgroundColor: CoachPalette.surfaceAlt },
  edge: { width: 4 },
  edgeDone: { opacity: 0.4 },
  cardCopy: {  gap: 6, padding: 20, flex: 1 },
  cardTop: { alignItems: 'flex-start', flexDirection: 'column', gap: 4 },
  cardTitle: { color: CoachPalette.text, ...CoachType.card, flexShrink: 1 },
  cardTime: { color: CoachPalette.muted, fontSize: 13, fontVariant: ['tabular-nums'], fontWeight: '600' },
  cardBody: { color: CoachPalette.textSecondary, ...CoachType.body },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10, flexWrap: 'wrap' },
  primary: { alignSelf: 'flex-start' },
  primaryText: { color: '#101416', fontSize: 15, fontWeight: '700' },
  secondary: { alignSelf: 'flex-start' },
  secondaryText: { color: CoachPalette.text, fontSize: 15, fontWeight: '700' },
  segmentWrap: { marginTop: 18 },
  segments: { backgroundColor: CoachPalette.surface, borderRadius: CoachRadius.pill, flexDirection: 'row', gap: 4, marginTop: 18, padding: 5 },
  segment: { alignItems: 'center', borderRadius: CoachRadius.pill, flex: 1, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 46 },
  segmentOn: { backgroundColor: CoachPalette.interactive },
  segmentText: { color: CoachPalette.muted, fontSize: 16, fontWeight: '700' },
  segmentTextOn: { color: CoachPalette.text },
});
