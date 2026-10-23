import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedProps, useReducedMotion } from 'react-native-reanimated';
import Svg, { Polyline } from 'react-native-svg';

import { Segmented } from '@/components/motion/segmented';
import { ActionButton } from '@/components/ui/action-button';
import { SimulatedTag } from '@/components/vitals';
import { ListRow, Rows, StatRow } from '@/components/whoop-ui';
import { Face, Palette } from '@/constants/theme';
import { enter, leave, settle } from '@/lib/motion';
import { seg, useOneShotClock } from '@/lib/motion-engine';
import { ZONES } from '@/lib/practice';
import { hrPercent, useAthletes, type AthleteView } from '@/state/athletes';
import { useCoachDataState, useNow } from '@/state/team-session';

// One team overview, exceptions, then the live roster. Values stay still as samples arrive;
// trends trace once and check-ins use the same restrained press feedback as other actions.
const time = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const SPARK = { width: 64, height: 24, drawMs: 280 };
const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);
type AttentionKind = 'signal' | 'recovery' | 'effort' | 'practice-days';
type CheckIn = { scope: string; kind: AttentionKind; at: Date };

function attention(a: AthleteView): { kind: AttentionKind; message: string } | null {
  if (!a.live) return null;
  if (a.live.stale) return { kind: 'signal', message: 'No current band signal' };
  if (a.live.status === 'watch') return { kind: 'recovery', message: `${a.live.heartRate} bpm and staying high through rest` };
  if (hrPercent(a.live.heartRate) >= 90) return { kind: 'effort', message: `${a.live.heartRate} bpm, ${hrPercent(a.live.heartRate)}% of estimated max` };
  if (a.practiceDaysKnown && a.acclimatizationDay < 6 && a.live.phase === 'work' && hrPercent(a.live.heartRate) >= 80) return { kind: 'practice-days', message: `${a.acclimatizationDay} recorded practice days; working hard` };
  return null;
}

/** A check-in acknowledges this cue, not a different condition that arrives afterward. */
function checkInCurrent(check: CheckIn | undefined, scope: string, kind: AttentionKind, now: number) {
  return Boolean(check && check.scope === scope && check.kind === kind && now - check.at.getTime() < 10 * 60_000);
}

function Spark({ values, color }: { values: number[]; color: string }) {
  const ready = values.length > 1;
  const reduced = useReducedMotion();
  const clock = useOneShotClock(SPARK.drawMs, ready, reduced);
  const min = ready ? Math.min(...values) - 3 : 0;
  const max = ready ? Math.max(...values) + 3 : 1;
  const points = values.map((value, index) => ({ x: (index / Math.max(1, values.length - 1)) * SPARK.width, y: SPARK.height - ((value - min) / (max - min)) * SPARK.height }));
  const length = points.reduce((sum, point, index) => index ? sum + Math.hypot(point.x - points[index - 1].x, point.y - points[index - 1].y) : sum, 0) || 1;
  const trace = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - seg(clock.value, 0, SPARK.drawMs)) }));
  if (!ready) return <View style={styles.spark} />;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.spark}>
      <Svg height={SPARK.height} width={SPARK.width} viewBox={`0 0 ${SPARK.width} ${SPARK.height}`}>
        <AnimatedPolyline animatedProps={trace} fill="none" points={points.map((point) => `${point.x},${point.y}`).join(' ')} stroke={color} strokeDasharray={[length, length]} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} />
      </Svg>
    </View>
  );
}

function LiveRow({ a, role }: { a: AthleteView; role: 'trainer' | 'coach' }) {
  const live = a.live!;
  const pct = hrPercent(live.heartRate);
  const tone = live.stale ? Palette.inkMuted : live.status === 'watch' ? Palette.warning : Palette.ink;
  return (
    <Pressable
      accessibilityLabel={`${a.name}, ${live.stale ? 'no recent signal' : `${live.heartRate} beats per minute, ${pct} percent of estimated max`}${!live.stale && live.status === 'watch' ? ', slow recovery' : !live.stale && live.status === 'unknown' ? ', recovery unavailable' : ''}${a.simulated ? ', simulated' : ''}${!live.stale && live.phase ? `, ${live.phase}` : ''}`}
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/athlete-vitals', params: { id: a.id, role } })}
      style={({ pressed }) => [styles.liveRow, pressed && styles.pressed]}>
      <View style={styles.liveCopy}>
        <Text style={styles.liveName}>{a.name}</Text>
        <Text style={[styles.liveMeta, (live.stale || live.status === 'watch') && { color: tone }]}>
          {live.stale ? 'Signal lost' : live.status === 'watch' ? 'Slow recovery' : live.status === 'unknown' ? `${pct}% of estimated max · recovery unavailable` : `${pct}% of estimated max`}{!live.stale && live.phase ? ` · ${live.phase === 'work' ? 'Work' : 'Rest'}` : ''}
        </Text>
      </View>
      <View style={styles.liveSignal}>
        {live.stale ? <View style={styles.spark} /> : <Spark color={live.status === 'watch' ? Palette.warning : Palette.inkMuted} values={live.history} />}
        <Text style={[styles.heartRate, { color: tone }]}>{live.stale ? '—' : live.heartRate}<Text style={styles.unit}> bpm</Text></Text>
      </View>
    </Pressable>
  );
}

export function TrainerMonitor({ role = 'trainer' }: { role?: 'trainer' | 'coach' }) {
  const team = useCoachDataState(role);
  const data = team.data;
  const { athletes, sample, loading, status, vitalsStatus, retry } = useAthletes(role);
  const now = useNow(5_000);
  const reduced = useReducedMotion();
  const [sort, setSort] = useState<'effort' | 'name'>('effort');
  const [checked, setChecked] = useState<Record<string, CheckIn>>({});
  const [showCheckIns, setShowCheckIns] = useState(false);

  const onBand = athletes.filter((a) => a.live);
  const failed = !sample && (team.status === 'error' || status === 'error' || vitalsStatus === 'error');
  const waiting = !sample && (loading || team.status === 'loading' || vitalsStatus === 'loading');
  if (!onBand.length) {
    return (
      <View style={styles.empty}>
        <Text accessibilityLiveRegion="polite" style={styles.emptyTitle}>{failed ? 'Band data unavailable' : waiting ? 'Loading band data…' : data && !data.teamId && !data.sample ? 'No team connected' : !data?.session ? 'No practice in progress' : 'No band samples yet'}</Text>
        <Text style={styles.emptyBody}>{failed ? 'Couldn’t load your team’s current signals. Try connecting again.' : waiting ? 'Looking for your team’s band signals.' : data && !data.teamId && !data.sample ? 'Join your team and wait for coach approval to view its athletes.' : 'Band signals appear during practice. Field readings are on Home.'}</Text>
        {failed ? <ActionButton label="Try again" onPress={() => { team.retry(); retry(); }} variant="secondary" /> : null}
      </View>
    );
  }

  const latest = data?.readings.at(-1) ?? null;
  const scope = `${role}:${sample ? 'sample' : data?.teamId ?? 'none'}:${data?.session?.id ?? 'none'}`;
  const currentChecks = Object.entries(checked).filter(([, check]) => check.scope === scope);
  // A different cue (for example a lost signal after a recovery check-in) must still appear.
  const flagged = onBand.flatMap((a) => {
    const cue = attention(a);
    return cue && !checkInCurrent(checked[a.id], scope, cue.kind, now) ? [{ a, cue }] : [];
  });
  // Bucket effort so a tiny change in heart rate doesn't shuffle the list on every sample.
  const band = (a: AthleteView) => Math.floor(hrPercent(a.live!.heartRate) / 10);
  const sorted = [...onBand].sort((x, y) => (sort === 'name' ? x.name.localeCompare(y.name) : Number(x.live!.stale) - Number(y.live!.stale) || band(y) - band(x) || x.name.localeCompare(y.name)));
  const hrs = onBand.filter((a) => !a.live!.stale).map((a) => a.live!.heartRate);
  // The simulator has its own rhythm, separate from the coach's selected plan. Read the
  // actual signal's phase rather than calculating a competing work/rest countdown here.
  const simulatedPhase = sample ? onBand.find((a) => a.simulated && !a.live!.stale)?.live?.phase : null;

  return (
    <>
      {sample || onBand.some((a) => a.simulated) ? <SimulatedTag /> : null}
      <View style={styles.overview}>
        <View accessible accessibilityLabel={`${hrs.length} of ${athletes.length} athletes reporting band signals`} style={styles.liveCount}>
          <Text style={styles.count}>{hrs.length}<Text style={styles.countUnit}>/{athletes.length}</Text></Text>
          <Text style={styles.countLabel}>athletes reporting</Text>
        </View>
        <View style={styles.practice}>
          <Text style={[styles.practiceZone, latest && { color: ZONES[latest.zone].text }]}>{latest ? ZONES[latest.zone].label : 'No field reading'}</Text>
          {simulatedPhase ? <Text style={styles.practiceMeta}>Simulated {simulatedPhase === 'work' ? 'work' : 'rest'} block</Text> : data?.session ? <Text style={styles.practiceMeta}>Practice {Math.max(0, Math.round((now - data.session.startedAt.getTime()) / 60_000))} min in</Text> : null}
        </View>
      </View>

      {flagged.length ? (
        <>
          <Text accessibilityRole="header" style={styles.section}>Needs a check · {flagged.length}</Text>
          <View style={styles.flags}>
            {flagged.map(({ a, cue }) => (
              <Animated.View entering={enter(0, reduced)} exiting={leave(reduced)} key={a.id} layout={settle(reduced)} style={styles.flag}>
                <Pressable accessibilityRole="button" accessibilityHint="Opens athlete vitals" onPress={() => router.push({ pathname: '/athlete-vitals', params: { id: a.id, role } })} style={({ pressed }) => [styles.flagCopy, pressed && styles.pressed]}>
                  <Text style={styles.flagName}>{a.name}</Text>
                  <Text style={styles.flagWhy}>{cue.message}</Text>
                </Pressable>
                <ActionButton accessibilityLabel={`Mark ${a.name} checked in`} label="Mark checked in" onPress={() => setChecked((previous) => ({ ...previous, [a.id]: { scope, kind: cue.kind, at: new Date() } }))} style={styles.checkIn} variant="text" />
              </Animated.View>
            ))}
          </View>
        </>
      ) : null}
      {currentChecks.length ? (
        <View style={styles.checked}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: showCheckIns }} onPress={() => setShowCheckIns(!showCheckIns)} style={({ pressed }) => [styles.checkedToggle, pressed && styles.pressed]}>
            <Text style={styles.checkedLabel}>{currentChecks.length} checked in</Text>
            <Text style={styles.checkedLabel}>{showCheckIns ? 'Hide' : 'View'}</Text>
          </Pressable>
          {showCheckIns ? <Animated.View entering={enter(0, reduced)} exiting={leave(reduced)}>
            <Rows>{currentChecks.map(([id, { at }]) => <ListRow key={id} label={athletes.find((athlete) => athlete.id === id)?.name ?? 'Athlete'} value={time(at)} />)}</Rows>
          </Animated.View> : null}
        </View>
      ) : null}

      <View style={styles.listHead}>
        <Text accessibilityRole="header" style={styles.sectionInline}>Band signals</Text>
        {onBand.length > 1 ? <Segmented itemWidth={64} onChange={setSort} options={[{ key: 'effort', label: 'Effort' }, { key: 'name', label: 'A–Z' }]} size="sm" value={sort} /> : null}
      </View>
      <Rows>{sorted.map((a) => <LiveRow a={a} key={a.id} role={role} />)}</Rows>

      <View style={styles.team}>
        <StatRow stats={[
          { label: 'Average heart rate', value: hrs.length ? String(Math.round(hrs.reduce((s, v) => s + v, 0) / hrs.length)) : '—', unit: ' bpm' },
          { label: 'Highest', value: hrs.length ? String(Math.max(...hrs)) : '—', unit: ' bpm' },
        ]} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  empty: { gap: 10, marginTop: 28 },
  emptyTitle: { color: Palette.ink, fontSize: 24, fontWeight: '700' },
  emptyBody: { color: Palette.inkMuted, fontSize: 17, lineHeight: 24 },
  overview: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16, marginBottom: 2, marginTop: 8 },
  liveCount: { alignItems: 'baseline', flexBasis: 180, flexGrow: 1, flexDirection: 'row', flexWrap: 'wrap', columnGap: 10 },
  count: { color: Palette.ink, fontFamily: Face.figure, fontSize: 60, lineHeight: 66 },
  countUnit: { color: Palette.inkMuted, fontFamily: Face.label, fontSize: 30 },
  countLabel: { color: Palette.inkMuted, fontSize: 16 },
  practice: { alignItems: 'flex-end', flexBasis: 130, flexGrow: 1, flexShrink: 1, gap: 4 },
  practiceZone: { color: Palette.inkMuted, fontSize: 16, fontWeight: '600' },
  practiceMeta: { color: Palette.inkMuted, fontSize: 14, textAlign: 'right' },
  section: { color: Palette.ink, fontSize: 20, fontWeight: '700', marginBottom: 8, marginTop: 26 },
  flags: { borderLeftColor: Palette.warning, borderLeftWidth: 3, paddingLeft: 14 },
  flag: { alignItems: 'stretch', borderBottomColor: Palette.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 10 },
  flagCopy: { flexBasis: 160, flexGrow: 1, gap: 4, minHeight: 48, justifyContent: 'center' },
  flagName: { color: Palette.ink, fontSize: 17, fontWeight: '600' },
  flagWhy: { color: Palette.inkMuted, fontSize: 15, lineHeight: 20 },
  checkIn: { alignSelf: 'flex-start', flexShrink: 1, maxWidth: '100%' },
  checked: { marginTop: 10 },
  checkedToggle: { alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'space-between', minHeight: 48 },
  checkedLabel: { color: Palette.inkMuted, fontSize: 15, fontWeight: '500' },
  listHead: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, marginBottom: 12, marginTop: 28 },
  sectionInline: { color: Palette.ink, flexShrink: 1, fontSize: 20, fontWeight: '700' },
  liveRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 12, minHeight: 84, paddingHorizontal: 16, paddingVertical: 12 },
  liveCopy: { flexBasis: 140, flexGrow: 1, flexShrink: 1, gap: 4, minWidth: 0 },
  liveSignal: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginLeft: 'auto', maxWidth: '100%' },
  liveName: { color: Palette.ink, fontSize: 17, fontWeight: '600' },
  liveMeta: { color: Palette.inkMuted, fontSize: 13 },
  spark: { width: SPARK.width, height: SPARK.height },
  heartRate: { color: Palette.ink, fontFamily: Face.figure, fontSize: 32, minWidth: 72, textAlign: 'right' },
  unit: { color: Palette.inkMuted, fontFamily: Face.label, fontSize: 16 },
  team: { borderTopColor: Palette.border, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 24, paddingTop: 18 },
});
