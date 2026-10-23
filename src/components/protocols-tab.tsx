import { useEffect, useState } from 'react';
import { Alert, Keyboard, Linking, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { ListRow, Rows } from '@/components/whoop-ui';
import { Face, Palette } from '@/constants/theme';
import { enter, settle } from '@/lib/motion';
import { ZONES, type Zone } from '@/lib/practice';
import { UIL_GUIDANCE, zoneRange } from '@/lib/uil-wbgt';
import { useStored } from '@/state/stored';
import { useCoachData } from '@/state/team-session';

// Protocols as tools for the sideline, in three parts:
// Respond: pick what you're seeing, work the steps (each stamped with the time), call 911, run the
//   cold-water immersion clock, and save the response to an incident log you can share.
// Prepare: today's readiness checks (they reset each day) and the venue's emergency action plan.
// Tools: a sweat-rate calculator and the UIL zones.
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

const READINESS = [
  { id: 'tub', label: 'Cold-water tub filled and iced' },
  { id: 'thermo', label: 'Rectal thermometer at the tub' },
  { id: 'aed', label: 'AED checked and on the sideline' },
  { id: 'water', label: 'Water and ice stocked' },
  { id: 'shade', label: 'Shaded cooling zone set up' },
  { id: 'plan', label: 'Emergency plan reviewed with staff' },
];

const EAP_FIELDS = [
  { id: 'venue', label: 'Venue address', placeholder: '1200 Stadium Dr' },
  { id: 'hospital', label: 'Nearest hospital', placeholder: 'Name and distance' },
  { id: 'access', label: 'EMS entrance', placeholder: 'Gate or road ambulances use' },
  { id: 'aed', label: 'AED location', placeholder: 'Where it’s kept' },
  { id: 'tub', label: 'Cooling tub', placeholder: 'Where it’s set up' },
  { id: 'caller', label: 'Calls 911', placeholder: 'Who makes the call' },
];

type Incident = { id: string; kind: Situation; at: number; steps: number; total: number; coolingSec: number | null };

const ORDER: Zone[] = ['green', 'yellow', 'orange', 'red', 'black'];
const COOL_GOAL_MS = 30 * 60_000;
const CHECK_EVERY_MS = 5 * 60_000;
const clock = (ms: number) => `${Math.floor(ms / 60_000)}:${String(Math.floor((ms % 60_000) / 1000)).padStart(2, '0')}`;
const time = (d: Date | number) => new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const day = (d: number) => new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' });
/** The moment something was done, for checklists and logs. */
const stamp = () => Date.now();
const zoneTone = (zone: Zone) => (zone === 'black' ? '#8E8E93' : ZONES[zone].color);

function callEms() {
  Alert.alert('Call 911?', 'Your phone will start the call.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Call 911', style: 'destructive', onPress: () => Linking.openURL('tel:911') },
  ]);
}

function Check({ on, tone = Palette.safe }: { on: boolean; tone?: string }) {
  return (
    <View style={[styles.check, on && { backgroundColor: tone, borderColor: tone }]}>
      {on ? <Svg fill="none" height={14} stroke="#101416" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} viewBox="0 0 24 24" width={14}><Path d="m5 12 5 5L20 7" /></Svg> : null}
    </View>
  );
}

function Segments<T extends string>({ value, options, onChange }: { value: T; options: { key: T; label: string }[]; onChange: (next: T) => void }) {
  return (
    <View accessibilityRole="tablist" style={styles.segments}>
      {options.map((o) => (
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: value === o.key }} key={o.key} onPress={() => onChange(o.key)} style={[styles.segment, value === o.key && styles.segmentOn]}>
          <Text style={[styles.segmentText, value === o.key && styles.segmentTextOn]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Heading({ children, action }: { children: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={styles.headingRow}>
      <Text accessibilityRole="header" style={styles.heading}>{children}</Text>
      {action ? <Pressable accessibilityRole="button" hitSlop={10} onPress={action.onPress}><Text style={styles.headingAction}>{action.label}</Text></Pressable> : null}
    </View>
  );
}

/* ───────────────────────────── Respond ───────────────────────────── */

function Respond() {
  const reduced = useReducedMotion();
  const [situation, setSituation] = useState<Situation | null>(null);
  const [done, setDone] = useState<Record<number, number>>({});
  const [coolStart, setCoolStart] = useState<number | null>(null);
  const [coolStop, setCoolStop] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [log, setLog] = useStored<Incident[]>('incidents', []);
  useEffect(() => {
    if (coolStart === null || coolStop !== null) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [coolStart, coolStop]);

  const plan = situation ? SITUATIONS[situation] : null;
  const count = Object.keys(done).length;
  const elapsed = coolStart === null ? 0 : Math.max(0, (coolStop ?? now) - coolStart);
  const reset = () => { setSituation(null); setDone({}); setCoolStart(null); setCoolStop(null); };
  const pick = (next: Situation) => { setSituation(next === situation ? null : next); setDone({}); };
  const toggle = (i: number) => setDone((prev) => {
    const copy = { ...prev };
    if (copy[i]) delete copy[i]; else copy[i] = Date.now();
    return copy;
  });
  const save = () => {
    if (!situation) return;
    const first = Math.min(...Object.values(done), coolStart ?? Infinity);
    setLog([{ id: String(Date.now()), kind: situation, at: Number.isFinite(first) ? first : Date.now(), steps: count, total: SITUATIONS[situation].steps.length, coolingSec: coolStart ? Math.round(elapsed / 1000) : null }, ...log].slice(0, 30));
    reset();
  };
  const share = (i: Incident) => Share.share({
    message: [
      `HeatSense incident · ${day(i.at)} ${time(i.at)}`,
      SITUATIONS[i.kind].heading,
      `Steps completed: ${i.steps} of ${i.total}`,
      i.coolingSec !== null ? `Cold-water immersion: ${clock(i.coolingSec * 1000)}` : null,
      'Recorded with HeatSense. Follow your district’s reporting requirements.',
    ].filter(Boolean).join('\n'),
  }).catch(() => {});

  return (
    <>
      <Heading>What are you seeing?</Heading>
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
              <Text style={[styles.stepText, done[i] ? styles.stepDone : null]}>{step}</Text>
              {done[i] ? <Text style={styles.stepTime}>{time(done[i])}</Text> : null}
            </Pressable>
          ))}
          <View style={styles.planFoot}>
            <Pressable accessibilityRole="button" disabled={!count && coolStart === null} onPress={save} style={({ pressed }) => [styles.saveButton, !count && coolStart === null && styles.disabled, pressed && styles.pressed]}>
              <Text style={styles.saveText}>Save to incident log</Text>
            </Pressable>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={reset}><Text style={styles.link}>Clear</Text></Pressable>
          </View>
        </Animated.View>
      ) : (
        <Text style={styles.hint}>Pick one to get the steps. Tap each step as you do it.</Text>
      )}

      {situation !== 'cramps' ? (
        <View style={styles.timer}>
          <View style={styles.timerHead}>
            <Text style={styles.cardTitle}>Cold-water immersion</Text>
            {coolStart !== null ? <Text style={styles.timerSince}>Started {time(coolStart)}</Text> : null}
          </View>
          <Text accessibilityLabel={`${Math.floor(elapsed / 60_000)} minutes ${Math.floor((elapsed % 60_000) / 1000)} seconds in the tub`} style={styles.timerValue}>{clock(elapsed)}</Text>
          <View style={styles.track}><View style={[styles.trackFill, { width: `${Math.min(100, (elapsed / COOL_GOAL_MS) * 100)}%` }]} /></View>
          <Text style={styles.timerNote}>
            {coolStart === null ? 'Start when they go in the tub. Goal: cooled within 30 min.' : coolStop !== null ? `Stopped at ${clock(elapsed)}.` : `Check temperature in ${clock(CHECK_EVERY_MS - (elapsed % CHECK_EVERY_MS))}`}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setNow(Date.now());
              if (coolStart === null || coolStop !== null) { setCoolStart(Date.now()); setCoolStop(null); } else setCoolStop(Date.now());
            }}
            style={({ pressed }) => [styles.timerButton, coolStart !== null && coolStop === null && styles.timerStop, pressed && styles.pressed]}>
            <Text style={[styles.timerButtonText, coolStart !== null && coolStop === null && { color: Palette.ink }]}>{coolStart === null ? 'Start timer' : coolStop === null ? 'Stop' : 'Restart'}</Text>
          </Pressable>
        </View>
      ) : null}

      <Heading>Incident log</Heading>
      {log.length ? (
        <View style={styles.list}>
          {log.map((i, n) => (
            <View key={i.id}>
              {n > 0 ? <View style={styles.divider} /> : null}
              <Pressable accessibilityHint="Shares this incident" accessibilityRole="button" onPress={() => share(i)} style={({ pressed }) => [styles.logRow, pressed && styles.pressed]}>
                <View style={[styles.logDot, { backgroundColor: SITUATIONS[i.kind].tone }]} />
                <Text numberOfLines={1} style={styles.logTitle}>{SITUATIONS[i.kind].chip}</Text>
                <Text style={styles.logMeta}>{i.coolingSec !== null ? `${clock(i.coolingSec * 1000)} · ` : ''}{day(i.at)} {time(i.at)}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.hint}>Saved responses show up here with their times. Tap one to share it.</Text>
      )}
    </>
  );
}

/* ───────────────────────────── Prepare ───────────────────────────── */

function Prepare() {
  const [today] = useState(() => new Date().toDateString());
  const [ready, setReady] = useStored<{ date: string; done: Record<string, number> }>('readiness', { date: today, done: {} });
  const [eap, setEap] = useStored<Record<string, string>>('eap', {});
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const done = ready.date === today ? ready.done : {};
  const count = READINESS.filter((r) => done[r.id]).length;
  const toggle = (id: string) => {
    const next = { ...done };
    if (next[id]) delete next[id]; else next[id] = stamp();
    setReady({ date: today, done: next });
  };
  const filled = EAP_FIELDS.filter((f) => eap[f.id]?.trim()).length;
  const sharePlan = () => Share.share({ message: ['Emergency action plan', ...EAP_FIELDS.map((f) => `${f.label}: ${eap[f.id]?.trim() || '—'}`)].join('\n') }).catch(() => {});

  return (
    <>
      <Heading>Before practice</Heading>
      <View style={styles.card}>
        <View style={styles.readyHead}>
          <Text style={styles.cardTitle}>{count === READINESS.length ? 'Ready for practice' : 'Readiness'}</Text>
          <Text style={[styles.readyCount, count === READINESS.length && { color: Palette.safe }]}>{count}/{READINESS.length}</Text>
        </View>
        <View style={styles.readyBar}>
          {READINESS.map((r) => <View key={r.id} style={[styles.readyStep, done[r.id] ? styles.readyStepOn : null]} />)}
        </View>
        {READINESS.map((r) => (
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: Boolean(done[r.id]) }} key={r.id} onPress={() => toggle(r.id)} style={({ pressed }) => [styles.readyRow, pressed && styles.pressed]}>
            <Check on={Boolean(done[r.id])} />
            <Text style={[styles.stepText, done[r.id] ? styles.readyDone : null]}>{r.label}</Text>
            {done[r.id] ? <Text style={styles.stepTime}>{time(done[r.id])}</Text> : null}
          </Pressable>
        ))}
        <Text style={styles.cardNote}>Resets each morning.</Text>
      </View>

      <Heading action={editing ? undefined : { label: filled ? 'Edit' : 'Set up', onPress: () => { setDraft(eap); setEditing(true); } }}>Emergency action plan</Heading>
      {editing ? (
        <View style={styles.card}>
          {EAP_FIELDS.map((f) => (
            <View key={f.id} style={styles.field}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <TextInput
                accessibilityLabel={f.label}
                onChangeText={(text) => setDraft({ ...draft, [f.id]: text })}
                placeholder={f.placeholder}
                placeholderTextColor={Palette.inkFaint}
                style={styles.input}
                value={draft[f.id] ?? ''}
              />
            </View>
          ))}
          <View style={styles.formActions}>
            <Pressable accessibilityRole="button" onPress={() => { setEap(draft); setEditing(false); }} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}>
              <Text style={styles.saveText}>Save plan</Text>
            </Pressable>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setEditing(false)}><Text style={styles.link}>Cancel</Text></Pressable>
          </View>
        </View>
      ) : (
        <>
          <Rows>
            {EAP_FIELDS.map((f) => <ListRow key={f.id} label={f.label} value={eap[f.id]?.trim() || 'Not set'} valueTone={eap[f.id]?.trim() ? undefined : Palette.inkFaint} />)}
          </Rows>
          {filled ? (
            <Pressable accessibilityRole="button" onPress={sharePlan} style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}>
              <Text style={styles.shareText}>Share with staff</Text>
            </Pressable>
          ) : null}
        </>
      )}
    </>
  );
}

/* ───────────────────────────── Tools ───────────────────────────── */

function num(text: string) {
  const v = Number.parseFloat(text.replace(',', '.'));
  return Number.isFinite(v) ? v : null;
}

/** Sweat rate from body weight before and after practice (NATA fluid-replacement guidance). */
function SweatRate() {
  const [pre, setPre] = useState('');
  const [post, setPost] = useState('');
  const [drank, setDrank] = useState('');
  const [minutes, setMinutes] = useState('');
  const [editing, setEditing] = useState(false);
  const a = num(pre), b = num(post), d = num(drank) ?? 0, m = num(minutes);
  const valid = a !== null && b !== null && m !== null && a > 0 && b > 0 && m > 0 && a - b > -5;
  const lostLb = valid ? a! - b! : 0;
  const lossPct = valid ? (lostLb / a!) * 100 : 0;
  const sweatOz = valid ? lostLb * 16 + d : 0;
  const ratePerHr = valid ? sweatOz / (m! / 60) : 0;
  const replace = valid ? [Math.max(0, lostLb) * 20, Math.max(0, lostLb) * 24] : [0, 0];
  const tone = lossPct >= 3 ? Palette.emergency : lossPct >= 2 ? Palette.warning : Palette.safe;
  const fields: { label: string; unit: string; value: string; set: (t: string) => void }[] = [
    { label: 'Weight before', unit: 'lb', value: pre, set: setPre },
    { label: 'Weight after', unit: 'lb', value: post, set: setPost },
    { label: 'Drank during', unit: 'oz', value: drank, set: setDrank },
    { label: 'Practice length', unit: 'min', value: minutes, set: setMinutes },
  ];
  return (
    <View style={styles.card}>
      <View style={styles.calcHead}>
        <Text style={styles.cardTitle}>Sweat rate</Text>
        {editing ? <Pressable accessibilityRole="button" hitSlop={12} onPress={Keyboard.dismiss}><Text style={styles.doneText}>Done</Text></Pressable> : null}
      </View>
      <View style={styles.calcGrid}>
        {fields.map((f) => (
          <View key={f.label} style={styles.calcField}>
            <Text style={styles.fieldLabel}>{f.label}</Text>
            <View style={styles.calcInputRow}>
              <TextInput accessibilityLabel={`${f.label} in ${f.unit}`} keyboardType="decimal-pad" onBlur={() => setEditing(false)} onFocus={() => setEditing(true)} onChangeText={f.set} placeholder="–" placeholderTextColor={Palette.inkFaint} style={styles.calcInput} value={f.value} />
              <Text style={styles.calcUnit}>{f.unit}</Text>
            </View>
          </View>
        ))}
      </View>
      {valid ? (
        <View accessible style={styles.result}>
          <View style={styles.resultRow}>
            <View style={styles.resultItem}>
              <Text style={[styles.resultValue, { color: tone }]}>{lossPct.toFixed(1)}<Text style={styles.resultUnit}>%</Text></Text>
              <Text style={styles.resultLabel}>Body weight lost</Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultValue}>{Math.round(ratePerHr)}<Text style={styles.resultUnit}> oz/hr</Text></Text>
              <Text style={styles.resultLabel}>Sweat rate</Text>
            </View>
          </View>
          <Text style={styles.resultAdvice}>
            {lostLb > 0 ? `Drink ${Math.round(replace[0])}–${Math.round(replace[1])} oz before the next practice.` : 'No weight lost: fluids kept up with sweat.'}
            {lossPct >= 2 ? ' Over 2% lost hurts performance and raises heat-illness risk; plan more water breaks.' : ''}
          </Text>
        </View>
      ) : (
        <Text style={styles.cardNote}>Weigh in before and after practice, in the same clothes.</Text>
      )}
    </View>
  );
}

export function ZonePicker({ role = 'trainer' }: { role?: 'trainer' | 'athlete' }) {
  const data = useCoachData(role);
  const latestZone = data?.readings.at(-1)?.zone ?? 'green';
  const [zone, setZone] = useState<Zone | null>(null);
  const shown = zone ?? latestZone;
  const uilClass = data?.session?.uilClass ?? 3;
  const guidance = UIL_GUIDANCE[shown];
  return (
    <>
      <Heading>{`UIL zones · Class ${uilClass}`}</Heading>
      <View style={styles.zones}>
        {ORDER.map((z) => (
          <Pressable accessibilityLabel={ZONES[z].label} accessibilityRole="button" accessibilityState={{ selected: z === shown }} key={z} onPress={() => setZone(z)} style={[styles.zone, { backgroundColor: zoneTone(z), opacity: z === shown ? 1 : 0.28 }]}>
            {z === latestZone && data?.readings.length ? <View style={styles.zoneNow} /> : null}
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

export function ProtocolsTab() {
  const [section, setSection] = useState<'respond' | 'prepare' | 'tools'>('respond');
  return (
    <>
      <Segments onChange={setSection} options={[{ key: 'respond', label: 'Respond' }, { key: 'prepare', label: 'Prepare' }, { key: 'tools', label: 'Tools' }]} value={section} />
      {section === 'respond' ? <Respond /> : section === 'prepare' ? <Prepare /> : (
        <>
          <Heading>Hydration</Heading>
          <SweatRate />
          <ZonePicker />
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  segments: { backgroundColor: 'rgba(235,235,245,0.08)', borderRadius: 12, flexDirection: 'row', gap: 4, padding: 4 },
  segment: { alignItems: 'center', borderRadius: 9, flex: 1, justifyContent: 'center', minHeight: 38 },
  segmentOn: { backgroundColor: Palette.surface },
  segmentText: { color: Palette.inkMuted, fontSize: 16, fontWeight: '600' },
  segmentTextOn: { color: Palette.ink },
  headingRow: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, marginTop: 28 },
  heading: { color: Palette.ink, fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  headingAction: { color: Palette.coral, fontSize: 16, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderColor: Palette.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10 },
  chipText: { color: Palette.ink, fontSize: 16, fontWeight: '600' },
  chipTextOn: { color: '#101416' },
  hint: { color: Palette.inkMuted, fontSize: 16, lineHeight: 22, marginTop: 4 },
  plan: { backgroundColor: Palette.surface, borderRadius: 16, marginTop: 16, overflow: 'hidden' },
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
  planFoot: { alignItems: 'center', flexDirection: 'row', gap: 18, padding: 18, paddingTop: 8 },
  saveButton: { alignItems: 'center', backgroundColor: Palette.coral, borderRadius: 12, justifyContent: 'center', minHeight: 46, paddingHorizontal: 18 },
  saveText: { color: '#1A0E07', fontSize: 16, fontWeight: '700' },
  link: { color: Palette.inkMuted, fontSize: 16, fontWeight: '600' },
  card: { backgroundColor: Palette.surface, borderRadius: 16, padding: 18 },
  cardTitle: { color: Palette.ink, fontSize: 18, fontWeight: '600' },
  cardNote: { color: Palette.inkMuted, fontSize: 14, marginTop: 12 },
  timer: { backgroundColor: Palette.surface, borderRadius: 16, marginTop: 12, padding: 18 },
  timerHead: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between' },
  timerSince: { color: Palette.inkMuted, fontSize: 14 },
  timerValue: { color: Palette.ink, fontFamily: Face.figure, fontSize: 72, lineHeight: 78, marginTop: 4 },
  track: { backgroundColor: 'rgba(235,235,245,0.08)', borderRadius: 4, height: 8, overflow: 'hidden' },
  trackFill: { backgroundColor: '#64D2FF', borderRadius: 4, height: 8 },
  timerNote: { color: Palette.inkMuted, fontSize: 15, marginTop: 10 },
  timerButton: { alignItems: 'center', backgroundColor: '#64D2FF', borderRadius: 14, justifyContent: 'center', marginTop: 16, minHeight: 52 },
  timerStop: { backgroundColor: 'rgba(235,235,245,0.12)' },
  timerButtonText: { color: '#101416', fontSize: 17, fontWeight: '700' },
  list: { backgroundColor: Palette.surface, borderRadius: 16, overflow: 'hidden' },
  divider: { backgroundColor: 'rgba(255,255,255,0.07)', height: StyleSheet.hairlineWidth, marginLeft: 40 },
  logRow: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 56, paddingHorizontal: 16 },
  logDot: { borderRadius: 5, height: 10, width: 10 },
  logTitle: { color: Palette.ink, flex: 1, fontSize: 16, fontWeight: '600' },
  logMeta: { color: Palette.inkMuted, fontSize: 14, fontVariant: ['tabular-nums'] },
  readyHead: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between' },
  readyCount: { color: Palette.ink, fontFamily: Face.figure, fontSize: 26 },
  readyBar: { flexDirection: 'row', gap: 4, marginBottom: 6, marginTop: 12 },
  readyStep: { backgroundColor: 'rgba(235,235,245,0.1)', borderRadius: 3, flex: 1, height: 8 },
  readyStepOn: { backgroundColor: Palette.safe },
  readyRow: { alignItems: 'center', flexDirection: 'row', gap: 14, minHeight: 52 },
  readyDone: { color: Palette.inkMuted },
  field: { marginBottom: 12 },
  fieldLabel: { color: Palette.inkMuted, fontSize: 14, fontWeight: '500', marginBottom: 6 },
  input: { backgroundColor: 'rgba(235,235,245,0.07)', borderRadius: 10, color: Palette.ink, fontSize: 16, minHeight: 46, paddingHorizontal: 12 },
  formActions: { alignItems: 'center', flexDirection: 'row', gap: 18, marginTop: 4 },
  shareButton: { alignItems: 'center', borderColor: Palette.border, borderRadius: 12, borderWidth: 1, justifyContent: 'center', marginTop: 12, minHeight: 46 },
  shareText: { color: Palette.ink, fontSize: 16, fontWeight: '600' },
  calcGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 },
  calcField: { width: '47%' },
  calcInputRow: { alignItems: 'center', backgroundColor: 'rgba(235,235,245,0.07)', borderRadius: 10, flexDirection: 'row', paddingHorizontal: 12 },
  calcInput: { color: Palette.ink, flex: 1, fontFamily: Face.figure, fontSize: 22, minHeight: 46 },
  calcUnit: { color: Palette.inkMuted, fontFamily: Face.label, fontSize: 16 },
  result: { borderTopColor: 'rgba(255,255,255,0.08)', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 16, paddingTop: 14 },
  resultRow: { flexDirection: 'row', gap: 12 },
  resultItem: { flex: 1 },
  resultValue: { color: Palette.ink, fontFamily: Face.figure, fontSize: 36, lineHeight: 40 },
  resultUnit: { color: Palette.inkMuted, fontFamily: Face.label, fontSize: 18 },
  resultLabel: { color: Palette.inkMuted, fontSize: 14, fontWeight: '500' },
  resultAdvice: { color: Palette.ink, fontSize: 15, lineHeight: 21, marginTop: 12 },
  calcHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 24 },
  doneText: { color: Palette.coral, fontSize: 17, fontWeight: '600' },
  zones: { flexDirection: 'row', gap: 6 },
  zone: { alignItems: 'center', borderRadius: 10, flex: 1, height: 44, justifyContent: 'center' },
  zoneNow: { backgroundColor: '#101416', borderRadius: 4, height: 8, width: 8 },
  zoneHead: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  zoneName: { fontSize: 22, fontWeight: '700' },
  zoneRange: { color: Palette.ink, fontFamily: Face.figure, fontSize: 20 },
  zoneSummary: { color: Palette.inkMuted, fontSize: 16, lineHeight: 22, marginBottom: 14, marginTop: 4 },
});
