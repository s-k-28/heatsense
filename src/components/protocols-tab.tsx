import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { ListRow, Rows, SectionTitle } from '@/components/whoop-ui';
import { Face, Palette } from '@/constants/theme';
import { enter, settle } from '@/lib/motion';
import { ZONES, type Zone } from '@/lib/practice';
import { UIL_GUIDANCE, zoneRange } from '@/lib/uil-wbgt';
import { useCoachData } from '@/state/team-session';

// Protocols as tools, not reading: pick what you're seeing and work the steps (each one stamped
// with the time you did it), run the cold-water immersion clock, and flip through the UIL zones.
// Steps follow the Korey Stringer Institute / NATA guidance on exertional heat illness.

type Situation = 'stroke' | 'exhaustion' | 'cramps';

const SITUATIONS: Record<Situation, { chip: string; heading: string; tone: string; steps: string[] }> = {
  stroke: {
    chip: 'Collapsed or confused',
    heading: 'Treat as exertional heat stroke',
    tone: Palette.emergency,
    steps: [
      'Call 911 and start your emergency action plan',
      'Cold-water immersion now: cool first, transport second',
      'Remove equipment and extra clothing',
      'Keep the head above water and stir; watch breathing',
      'Cool to 102°F (rectal) or until EMS takes over',
    ],
  },
  exhaustion: {
    chip: 'Dizzy or exhausted',
    heading: 'Heat exhaustion',
    tone: Palette.warning,
    steps: [
      'Stop activity and move to shade or air conditioning',
      'Remove equipment and loosen clothing',
      'Give cool water or a sports drink if they’re alert',
      'Ice towels on the neck, armpits and groin',
      'Watch them 15–30 min; confusion means heat stroke',
      'No return to practice today',
    ],
  },
  cramps: {
    chip: 'Cramping',
    heading: 'Heat cramps',
    tone: '#FFD60A',
    steps: [
      'Stop and gently stretch the muscle',
      'Give a sports drink or salted water',
      'Massage and rest in the shade',
      'Return once the cramp is gone and they feel normal',
    ],
  },
};

const ORDER: Zone[] = ['green', 'yellow', 'orange', 'red', 'black'];
const COOL_GOAL_MS = 30 * 60_000;
const CHECK_EVERY_MS = 5 * 60_000;
const clock = (ms: number) => `${Math.floor(ms / 60_000)}:${String(Math.floor((ms % 60_000) / 1000)).padStart(2, '0')}`;
const time = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const zoneTone = (zone: Zone) => (zone === 'black' ? '#8E8E93' : ZONES[zone].color);

function callEms() {
  Alert.alert('Call 911?', 'Your phone will start the call.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Call 911', style: 'destructive', onPress: () => Linking.openURL('tel:911') },
  ]);
}

function Check({ on, tone }: { on: boolean; tone: string }) {
  return (
    <View style={[styles.check, on && { backgroundColor: tone, borderColor: tone }]}>
      {on ? <Svg fill="none" height={14} stroke="#101416" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} viewBox="0 0 24 24" width={14}><Path d="m5 12 5 5L20 7" /></Svg> : null}
    </View>
  );
}

/** The cold-water immersion clock: time in the tub, the 30-minute goal, and the next temperature check. */
function CoolingTimer() {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startedAt === null) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [startedAt]);
  const elapsed = startedAt === null ? 0 : Math.max(0, now - startedAt);
  const nextCheck = CHECK_EVERY_MS - (elapsed % CHECK_EVERY_MS);
  return (
    <View style={styles.timer}>
      <Text style={styles.timerTitle}>Cold-water immersion</Text>
      <Text accessibilityLabel={`${Math.floor(elapsed / 60_000)} minutes ${Math.floor((elapsed % 60_000) / 1000)} seconds in the tub`} style={styles.timerValue}>{clock(elapsed)}</Text>
      <View style={styles.timerTrack}><View style={[styles.timerFill, { width: `${Math.min(100, (elapsed / COOL_GOAL_MS) * 100)}%` }]} /></View>
      <Text style={styles.timerNote}>{startedAt === null ? 'Start when they go in the tub. Goal: cooled within 30 min.' : `Check temperature in ${clock(nextCheck)}`}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => { setNow(Date.now()); setStartedAt(startedAt === null ? Date.now() : null); }}
        style={({ pressed }) => [styles.timerButton, startedAt !== null && styles.timerStop, pressed && styles.pressed]}>
        <Text style={[styles.timerButtonText, startedAt !== null && { color: Palette.ink }]}>{startedAt === null ? 'Start timer' : 'Stop'}</Text>
      </Pressable>
    </View>
  );
}

export function ProtocolsTab() {
  const data = useCoachData('trainer');
  const reduced = useReducedMotion();
  const [situation, setSituation] = useState<Situation | null>(null);
  const [done, setDone] = useState<Record<number, Date>>({});
  const latestZone = data?.readings.at(-1)?.zone ?? 'green';
  const [zone, setZone] = useState<Zone | null>(null);
  const shown = zone ?? latestZone;
  const uilClass = data?.session?.uilClass ?? 3;
  const guidance = UIL_GUIDANCE[shown];
  const plan = situation ? SITUATIONS[situation] : null;
  const count = Object.keys(done).length;

  const pick = (next: Situation) => { setSituation(next === situation ? null : next); setDone({}); };
  const toggle = (i: number) => setDone((prev) => {
    const copy = { ...prev };
    if (copy[i]) delete copy[i]; else copy[i] = new Date();
    return copy;
  });

  return (
    <>
      <SectionTitle title="What are you seeing?" />
      <View style={styles.chips}>
        {(Object.keys(SITUATIONS) as Situation[]).map((key) => {
          const on = key === situation;
          return (
            <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} key={key} onPress={() => pick(key)} style={({ pressed }) => [styles.chip, on && { backgroundColor: SITUATIONS[key].tone, borderColor: SITUATIONS[key].tone }, pressed && styles.pressed]}>
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{SITUATIONS[key].chip}</Text>
            </Pressable>
          );
        })}
      </View>

      {plan ? (
        <Animated.View entering={enter(0, reduced)} key={situation} layout={settle(reduced)} style={styles.plan}>
          <View style={styles.planHead}>
            <View style={[styles.planBar, { backgroundColor: plan.tone }]} />
            <Text style={styles.planTitle}>{plan.heading}</Text>
            <Text style={styles.planCount}>{count}/{plan.steps.length}</Text>
          </View>
          {situation === 'stroke' ? (
            <Pressable accessibilityRole="button" onPress={callEms} style={({ pressed }) => [styles.sos, pressed && styles.pressed]}>
              <Text style={styles.sosText}>Call 911</Text>
            </Pressable>
          ) : null}
          {plan.steps.map((step, i) => (
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: Boolean(done[i]) }} key={step} onPress={() => toggle(i)} style={({ pressed }) => [styles.step, pressed && styles.pressed]}>
              <Check on={Boolean(done[i])} tone={plan.tone} />
              <Text style={[styles.stepText, done[i] && styles.stepDone]}>{step}</Text>
              {done[i] ? <Text style={styles.stepTime}>{time(done[i])}</Text> : null}
            </Pressable>
          ))}
          {count ? (
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setDone({})}>
              <Text style={styles.reset}>Clear steps</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      ) : (
        <Text style={styles.hint}>Pick one to get the steps. Tap each step as you do it.</Text>
      )}

      {situation !== 'cramps' ? <CoolingTimer /> : null}

      <SectionTitle title={`UIL zones · Class ${uilClass}`} />
      <View style={styles.zones}>
        {ORDER.map((z) => (
          <Pressable accessibilityLabel={ZONES[z].label} accessibilityRole="button" accessibilityState={{ selected: z === shown }} key={z} onPress={() => setZone(z)} style={[styles.zone, { backgroundColor: zoneTone(z), opacity: z === shown ? 1 : 0.28 }]}>
            {z === latestZone ? <View style={styles.zoneNow} /> : null}
          </Pressable>
        ))}
      </View>
      <View style={styles.zoneHead}>
        <Text style={[styles.zoneName, { color: ZONES[shown].text }]}>{ZONES[shown].label}</Text>
        <Text style={styles.zoneRange}>{zoneRange(shown, uilClass)}</Text>
      </View>
      <Text style={styles.zoneSummary}>{guidance.summary}{shown === latestZone && data?.readings.length ? ' The field is here now.' : ''}</Text>
      <Rows>
        <ListRow label="Rest breaks" value={guidance.breaksPerHour ? `${guidance.breaksPerHour}+ per hour` : guidance.restMinutesPerHour ? `${guidance.restMinutesPerHour} min per hour` : 'None outdoors'} />
        <ListRow label="Break length" value={guidance.breakMinutes ? `${guidance.breakMinutes}+ min` : '--'} />
        <ListRow label="Max practice" value={guidance.maxPracticeMinutes ? `${guidance.maxPracticeMinutes / 60} hr` : guidance.outdoorAllowed ? 'No limit' : 'None outdoors'} />
        <ListRow label="Cooling zone" value={guidance.coolingZoneRequired ? 'Required' : 'Optional'} />
      </Rows>
    </>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderColor: Palette.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10 },
  chipText: { color: Palette.ink, fontSize: 16, fontWeight: '600' },
  chipTextOn: { color: '#101416' },
  hint: { color: Palette.inkMuted, fontSize: 16, marginTop: 14 },
  plan: { backgroundColor: Palette.surface, borderRadius: 16, marginTop: 16, overflow: 'hidden', paddingBottom: 6 },
  planHead: { alignItems: 'center', flexDirection: 'row', gap: 12, padding: 18, paddingBottom: 10 },
  planBar: { borderRadius: 2, height: 22, width: 4 },
  planTitle: { color: Palette.ink, flex: 1, fontSize: 19, fontWeight: '700' },
  planCount: { color: Palette.inkMuted, fontFamily: Face.figure, fontSize: 20 },
  sos: { alignItems: 'center', backgroundColor: Palette.emergency, borderRadius: 14, justifyContent: 'center', marginBottom: 8, marginHorizontal: 18, minHeight: 54 },
  sosText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  step: { alignItems: 'center', flexDirection: 'row', gap: 14, minHeight: 56, paddingHorizontal: 18, paddingVertical: 10 },
  check: { alignItems: 'center', borderColor: 'rgba(235,235,245,0.35)', borderRadius: 13, borderWidth: 2, height: 26, justifyContent: 'center', width: 26 },
  stepText: { color: Palette.ink, flex: 1, fontSize: 16, lineHeight: 21 },
  stepDone: { color: Palette.inkMuted, textDecorationLine: 'line-through' },
  stepTime: { color: Palette.inkMuted, fontSize: 14, fontVariant: ['tabular-nums'] },
  reset: { color: Palette.coral, fontSize: 16, fontWeight: '600', padding: 18, paddingTop: 8 },
  timer: { backgroundColor: Palette.surface, borderRadius: 16, marginTop: 12, padding: 18 },
  timerTitle: { color: Palette.ink, fontSize: 18, fontWeight: '600' },
  timerValue: { color: Palette.ink, fontFamily: Face.figure, fontSize: 72, lineHeight: 78, marginTop: 4 },
  timerTrack: { backgroundColor: 'rgba(235,235,245,0.08)', borderRadius: 4, height: 8, overflow: 'hidden' },
  timerFill: { backgroundColor: '#64D2FF', borderRadius: 4, height: 8 },
  timerNote: { color: Palette.inkMuted, fontSize: 15, marginTop: 10 },
  timerButton: { alignItems: 'center', backgroundColor: '#64D2FF', borderRadius: 14, justifyContent: 'center', marginTop: 16, minHeight: 52 },
  timerStop: { backgroundColor: 'rgba(235,235,245,0.12)' },
  timerButtonText: { color: '#101416', fontSize: 17, fontWeight: '700' },
  zones: { flexDirection: 'row', gap: 6 },
  zone: { alignItems: 'center', borderRadius: 10, flex: 1, height: 44, justifyContent: 'center' },
  zoneNow: { backgroundColor: '#101416', borderRadius: 4, height: 8, width: 8 },
  zoneHead: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  zoneName: { fontSize: 22, fontWeight: '700' },
  zoneRange: { color: Palette.ink, fontFamily: Face.figure, fontSize: 20 },
  zoneSummary: { color: Palette.inkMuted, fontSize: 16, lineHeight: 22, marginBottom: 14, marginTop: 4 },
});
