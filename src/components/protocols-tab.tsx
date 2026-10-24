import { Text, TextInput } from '@/components/ui/text';
import { useAthletePalette, useAthleteStyles } from '@/components/athlete-appearance';
import { useEffect, useRef, useState } from 'react';
import { Alert, Keyboard, Linking, Pressable, Share, StyleSheet, View } from 'react-native';
import Animated, { ZoomIn, useReducedMotion } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { PressScale } from '@/components/motion/press-scale';
import { Fill } from '@/components/motion/fill';
import { Segmented } from '@/components/motion/segmented';
import { ActionButton } from '@/components/ui/action-button';
import { ListRow, Rows } from '@/components/whoop-ui';
import { Face, Palette } from '@/constants/theme';
import { enter, settle } from '@/lib/motion';
import { ZONES, type Zone } from '@/lib/practice';
import { UIL_GUIDANCE, zoneRange } from '@/lib/uil-wbgt';
import type { EmergencyPlan, Incident } from '@/services/team-safety';
import { useAuthSession } from '@/state/auth-session';
import { useEmergencyPlan, useIncidents, useReadiness } from '@/state/emergency-plan';
import { useCoachData } from '@/state/team-session';

// Protocols as tools for the sideline, in three parts:
// Respond: pick what you're seeing, work the steps (each stamped with the time), call 911, run the
//   cold-water immersion clock, and save the response to the team's incident record (staff only).
// Prepare: today's readiness checks (shared by staff, fresh each day) and the team's emergency
//   action plan, shared with every coach, trainer and athlete on the team.
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

const EAP_FIELDS: { id: keyof EmergencyPlan; label: string; placeholder: string }[] = [
  { id: 'venue', label: 'Venue address', placeholder: '1200 Stadium Dr' },
  { id: 'hospital', label: 'Nearest hospital', placeholder: 'Name and distance' },
  { id: 'access', label: 'EMS entrance', placeholder: 'Gate or road ambulances use' },
  { id: 'aed', label: 'AED location', placeholder: 'Where it’s kept' },
  { id: 'tub', label: 'Cooling tub', placeholder: 'Where it’s set up' },
  { id: 'caller', label: 'Calls 911', placeholder: 'Who makes the call' },
];


const ORDER: Zone[] = ['green', 'yellow', 'orange', 'red', 'black'];
const COOL_GOAL_MS = 30 * 60_000;
const CHECK_EVERY_MS = 5 * 60_000;
const clock = (ms: number) => `${Math.floor(ms / 60_000)}:${String(Math.floor((ms % 60_000) / 1000)).padStart(2, '0')}`;
const time = (d: Date | number) => new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const day = (d: number) => new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' });
/** The moment something was done, for checklists and logs. */
const stamp = () => Date.now();
const zoneTone = (zone: Zone) => (zone === 'black' ? '#8E8E93' : ZONES[zone].color);

async function shareSafetyRecord(message: string) {
  try {
    await Share.share({ message });
  } catch {
    Alert.alert('Couldn’t share the record', 'Your record is unchanged. Try sharing it again.');
  }
}

function callEms() {
  Alert.alert('Call 911?', 'Your phone will start the call.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Call 911', style: 'destructive', onPress: () => Linking.openURL('tel:911') },
  ]);
}

function Check({ on, tone = Palette.safe }: { on: boolean; tone?: string }) {
  const styles = useAthleteStyles(baseStyles);
  const reduced = useReducedMotion();
  return (
    <View style={[styles.check, on && { backgroundColor: tone, borderColor: tone }]}>
      {on ? <Animated.View entering={reduced ? undefined : ZoomIn.duration(140).withInitialValues({ transform: [{ scale: 0.9 }] })}><Svg fill="none" height={14} stroke="#101416" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} viewBox="0 0 24 24" width={14}><Path d="m5 12 5 5L20 7" /></Svg></Animated.View> : null}
    </View>
  );
}

function Heading({ children, action }: { children: string; action?: { label: string; onPress: () => void; disabled?: boolean } }) {
  const styles = useAthleteStyles(baseStyles);
  return (
    <View style={styles.headingRow}>
      <Text accessibilityRole="header" style={styles.heading}>{children}</Text>
      {action ? <ActionButton disabled={action.disabled} label={action.label} onPress={action.onPress} variant="text" /> : null}
    </View>
  );
}

/** Safety data has an explicit loading/error state; an empty record is different. */
export function SafetyStatus({ label, status, retry }: { label: string; status: 'loading' | 'ready' | 'error' | 'unavailable'; retry: () => void }) {
  const styles = useAthleteStyles(baseStyles);
  if (status === 'ready') return null;
  return (
    <View accessibilityLiveRegion="polite" style={styles.safetyStatus}>
      <Text style={styles.hint}>{status === 'loading' ? `Loading ${label}…` : status === 'error' ? `Couldn’t load ${label}. Check your connection and try again.` : `Join a team to use shared ${label}.`}</Text>
      {status === 'error' ? <ActionButton label="Try again" onPress={retry} style={styles.retry} variant="secondary" /> : null}
    </View>
  );
}

/* ───────────────────────────── Respond ───────────────────────────── */

function Respond({ active }: { active: boolean }) {
  const data = useCoachData('trainer');
  const { user } = useAuthSession();
  const teamId = data?.sample ? null : data?.teamId ?? null;
  const uid = user?.uid ?? 'signed-out';
  const scope = data?.sample ? 'sample' : teamId ?? 'no-team';
  const [lastResolved, setLastResolved] = useState<{ uid: string; scope: string } | null>(null);
  // A transient subscription outage is not a team switch. Retain the current clock while
  // data is unavailable, but useIncidents(null) still blocks writes until the team resolves.
  if (data && (lastResolved?.uid !== uid || lastResolved.scope !== scope)) setLastResolved({ uid, scope });
  const owner = `${uid}:${data ? scope : lastResolved?.uid === uid ? lastResolved.scope : 'no-team'}`;
  // A response belongs to one account/team. React remounts this session at that boundary,
  // cancelling its interval rather than attaching old steps or cooling time to another team.
  return <ResponseSession active={active} key={owner} teamId={teamId} />;
}

function ResponseSession({ active, teamId }: { active: boolean; teamId: string | null }) {
  const Palette = useAthletePalette();
  const styles = useAthleteStyles(baseStyles);
  const reduced = useReducedMotion();
  const [situation, setSituation] = useState<Situation | null>(null);
  const [done, setDone] = useState<Record<number, number>>({});
  const [coolStart, setCoolStart] = useState<number | null>(null);
  const [coolStop, setCoolStop] = useState<number | null>(null);
  const [timerOpen, setTimerOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  // The team's record when there is a team (staff only), otherwise this phone's.
  const [log, addIncident, logState] = useIncidents(teamId);
  useEffect(() => {
    if (coolStart === null || coolStop !== null) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [coolStart, coolStop]);

  const plan = situation ? SITUATIONS[situation] : null;
  const count = Object.keys(done).length;
  const elapsed = coolStart === null ? 0 : Math.max(0, (coolStop ?? now) - coolStart);
  const reset = () => { setSituation(null); setDone({}); setCoolStart(null); setCoolStop(null); setTimerOpen(false); };
  const startNew = () => {
    if (!count && coolStart === null) { reset(); return; }
    Alert.alert('Start a new response?', 'This clears unsaved steps and the cooling timer. Save to the incident log first if you need this record.', [
      { text: 'Keep response', style: 'cancel' },
      { text: 'Start new', style: 'destructive', onPress: reset },
    ]);
  };
  const pick = (next: Situation) => {
    setSituation(next);
    setDone({});
    if (next === 'stroke') setTimerOpen(true);
  };
  const toggle = (i: number) => setDone((prev) => {
    const copy = { ...prev };
    if (copy[i]) delete copy[i]; else copy[i] = Date.now();
    return copy;
  });
  const save = async () => {
    if (!situation || logState.saving) return;
    const first = Math.min(...Object.values(done), coolStart ?? Infinity);
    const saved = await addIncident({ kind: situation, at: Number.isFinite(first) ? first : Date.now(), steps: count, total: SITUATIONS[situation].steps.length, coolingSec: coolStart ? Math.round(elapsed / 1000) : null });
    if (saved) reset();
  };
  const share = (i: Incident) => shareSafetyRecord([
      `HeatSense incident · ${day(i.at)} ${time(i.at)}`,
      SITUATIONS[i.kind].heading,
      `Steps completed: ${i.steps} of ${i.total}`,
      i.coolingSec !== null ? `Cold-water immersion: ${clock(i.coolingSec * 1000)}` : null,
      'Recorded with HeatSense. Follow your district’s reporting requirements.',
    ].filter(Boolean).join('\n'));

  // Keep the response timestamps while another Protocols subtab is open. Hidden UI is
  // unmounted (including animated fills and accessibility targets); the functional clock stays.
  if (!active) return null;

  return (
    <>
      {plan ? (
        <Heading action={{ label: 'Change situation', disabled: logState.saving, onPress: () => { setSituation(null); setDone({}); } }}>Response</Heading>
      ) : (
        <>
          <Heading>What are you seeing?</Heading>
          <Rows>
            {(Object.keys(SITUATIONS) as Situation[]).map((key) => (
              <ListRow key={key} label={SITUATIONS[key].chip} onPress={() => pick(key)} />
            ))}
          </Rows>
        </>
      )}

      {plan ? (
        <Animated.View entering={enter(0, reduced)} key={situation} layout={settle(reduced)} style={styles.plan}>
          <View style={styles.planHead}>
            <View style={[styles.planBar, { backgroundColor: plan.tone }]} />
            <Text style={styles.planTitle}>{plan.heading}</Text>
            <Text style={styles.planCount}>{count}/{plan.steps.length}</Text>
          </View>
          {situation === 'stroke' ? (
            <PressScale accessibilityRole="button" onPress={callEms} style={styles.sos}>
              <Text style={styles.sosText}>Call 911</Text>
            </PressScale>
          ) : null}
          {plan.steps.map((step, i) => (
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: Boolean(done[i]) }} disabled={logState.saving} key={step} onPress={() => toggle(i)} style={({ pressed }) => [styles.step, pressed && styles.pressed]} aria-checked={Boolean(done[i])}>
              <Check on={Boolean(done[i])} tone={plan.tone} />
              <View style={styles.stepCopy}>
                <Text style={[styles.stepText, done[i] ? styles.stepDone : null]}>{step}</Text>
                {done[i] ? <Text style={styles.stepTime}>{time(done[i])}</Text> : null}
              </View>
            </Pressable>
          ))}
          <View style={styles.planFoot}>
            <ActionButton busy={logState.saving} busyLabel="Saving response…" disabled={logState.status !== 'ready' || (!count && coolStart === null)} label="Save to incident log" onPress={save} style={styles.grow} variant="secondary" />
            <ActionButton disabled={logState.saving} label="New response" onPress={startNew} variant="text" />
          </View>
        </Animated.View>
      ) : null}

      {situation !== 'cramps' || coolStart !== null ? (
        <View style={styles.timer}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: timerOpen }} onPress={() => setTimerOpen(!timerOpen)} style={styles.timerHead} aria-expanded={timerOpen}>
            <Text style={styles.cardTitle}>Cold-water immersion</Text>
            <Text style={styles.link}>{timerOpen ? 'Hide' : coolStart !== null ? clock(elapsed) : 'Open timer'}</Text>
          </Pressable>
          {timerOpen ? <>
          {coolStart !== null ? <Text style={styles.timerSince}>Started {time(coolStart)}</Text> : null}
          <Text accessibilityLabel={`${Math.floor(elapsed / 60_000)} minutes ${Math.floor((elapsed % 60_000) / 1000)} seconds in the tub`} style={styles.timerValue}>{clock(elapsed)}</Text>
          <Fill color={Palette.inkMuted} height={6} progress={Math.min(1, elapsed / COOL_GOAL_MS)} radius={3} />
          <Text style={styles.timerNote}>
            {coolStart === null ? 'Start when they go in the tub. Goal: cooled within 30 min.' : coolStop !== null ? `Stopped at ${clock(elapsed)}.` : `Check temperature in ${clock(CHECK_EVERY_MS - (elapsed % CHECK_EVERY_MS))}`}
          </Text>
          <ActionButton
            label={coolStart === null ? 'Start timer' : coolStop === null ? 'Stop' : 'Restart'}
            onPress={() => {
              setNow(Date.now());
              if (coolStart === null || coolStop !== null) { setCoolStart(Date.now()); setCoolStop(null); } else setCoolStop(Date.now());
            }}
            style={styles.timerButton}
            variant={coolStart !== null && coolStop === null ? 'secondary' : 'primary'} />
          </> : null}
        </View>
      ) : null}

      <Heading>Incident log</Heading>
      {logState.status !== 'ready' ? <SafetyStatus label="incident log" retry={logState.retry} status={logState.status} /> : log.length ? (
        <View style={styles.list}>
          {log.map((i, n) => (
            <View key={i.id}>
              {n > 0 ? <View style={styles.divider} /> : null}
              <Pressable accessibilityHint="Shares this incident" accessibilityRole="button" onPress={() => share(i)} style={({ pressed }) => [styles.logRow, pressed && styles.pressed]}>
                <View style={[styles.logDot, { backgroundColor: SITUATIONS[i.kind].tone }]} />
                <View style={styles.logCopy}>
                  <Text style={styles.logTitle}>{SITUATIONS[i.kind].chip}</Text>
                  <Text style={styles.logMeta}>{i.coolingSec !== null ? `${clock(i.coolingSec * 1000)} · ` : ''}{day(i.at)} {time(i.at)}</Text>
                </View>
                <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.logShare}>Share</Text>
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
  const Palette = useAthletePalette();
  const styles = useAthleteStyles(baseStyles);
  const data = useCoachData('trainer');
  const { user } = useAuthSession();
  const owner = data?.sample ? 'sample' : `${user?.uid ?? ''}:${data?.teamId ?? ''}`;
  // Today's checks, shared by the team's staff so nobody re-checks the tub someone already filled.
  const [done, setDone, readinessState] = useReadiness(data?.sample ? null : data?.teamId ?? null);
  // Shared with the whole team when there is one; athletes read it on Learn.
  const [eap, setEap, planState] = useEmergencyPlan(data?.sample ? null : data?.teamId ?? null);
  const [editingOwner, setEditingOwner] = useState<string | null>(null);
  const editing = editingOwner === owner;
  const [draft, setDraft] = useState<EmergencyPlan>({});
  const fields = useRef<(TextInput | null)[]>([]);
  const count = READINESS.filter((r) => done[r.id]).length;
  const toggle = (id: string) => {
    if (readinessState.saving || readinessState.status !== 'ready') return;
    const next = { ...done };
    if (next[id]) delete next[id]; else next[id] = stamp();
    setDone(next);
  };
  const filled = EAP_FIELDS.filter((f) => eap[f.id]?.trim()).length;
  const sharePlan = () => shareSafetyRecord(['Emergency action plan', ...EAP_FIELDS.map((f) => `${f.label}: ${eap[f.id]?.trim() || '—'}`)].join('\n'));

  return (
    <>
      <Heading>Before practice</Heading>
      {readinessState.status !== 'ready' ? <SafetyStatus label="readiness checks" retry={readinessState.retry} status={readinessState.status} /> : <View style={styles.readiness}>
        <View style={styles.readyHead}>
          <Text style={styles.cardTitle}>{count === READINESS.length ? 'Ready for practice' : 'Readiness'}</Text>
          <Text style={[styles.readyCount, count === READINESS.length && { color: Palette.safe }]}>{count}/{READINESS.length}</Text>
        </View>
        <View style={styles.readyBar}>
          {READINESS.map((r, i) => <Fill color={Palette.safe} delay={i * 40} height={8} key={r.id} progress={done[r.id] ? 1 : 0} radius={3} style={styles.readyStep} track="rgba(235,235,245,0.1)" />)}
        </View>
        <Rows>{READINESS.map((r) => (
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: Boolean(done[r.id]) }} disabled={readinessState.saving} key={r.id} onPress={() => toggle(r.id)} style={({ pressed }) => [styles.readyRow, pressed && styles.pressed]} aria-checked={Boolean(done[r.id])}>
            <Check on={Boolean(done[r.id])} />
            <View style={styles.stepCopy}>
              <Text style={[styles.stepText, done[r.id] ? styles.readyDone : null]}>{r.label}</Text>
              {done[r.id] ? <Text style={styles.stepTime}>{time(done[r.id])}</Text> : null}
            </View>
          </Pressable>
        ))}</Rows>
        <Text accessibilityLiveRegion="polite" style={styles.cardNote}>{readinessState.saving ? 'Saving checks…' : 'Shared with your staff. Starts fresh each morning.'}</Text>
      </View>}

      <Heading action={editing || planState.status !== 'ready' ? undefined : { label: filled ? 'Edit' : 'Set up', onPress: () => { setDraft(eap); setEditingOwner(owner); } }}>Emergency action plan</Heading>
      {planState.status !== 'ready' ? <SafetyStatus label="emergency plan" retry={planState.retry} status={planState.status} /> : editing ? (
        <View style={styles.editor}>
          {EAP_FIELDS.map((f, i) => (
            <View key={f.id} style={styles.field}>
              <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.fieldLabel}>{f.label}</Text>
              <TextInput
                accessibilityLabel={f.label}
                editable={!planState.saving}
                onChangeText={(text) => setDraft({ ...draft, [f.id]: text })}
                onSubmitEditing={() => fields.current[i + 1]?.focus()}
                placeholder={f.placeholder}
                placeholderTextColor={Palette.inkFaint}
                ref={(el) => { fields.current[i] = el; }}
                returnKeyType={i === EAP_FIELDS.length - 1 ? 'done' : 'next'}
                style={styles.input}
                submitBehavior={i === EAP_FIELDS.length - 1 ? 'blurAndSubmit' : 'submit'}
                value={draft[f.id] ?? ''}
              />
            </View>
          ))}
          <View style={styles.formActions}>
            <ActionButton busy={planState.saving} busyLabel="Saving plan…" label="Save plan" onPress={async () => { if (await setEap(draft)) setEditingOwner(current => current === owner ? null : current); }} variant="primary" />
            <ActionButton disabled={planState.saving} label="Cancel" onPress={() => setEditingOwner(null)} variant="text" />
          </View>
        </View>
      ) : (
        <>
          <Rows>
            {EAP_FIELDS.map((f) => <ListRow key={f.id} label={f.label} value={eap[f.id]?.trim() || 'Not set'} valueTone={eap[f.id]?.trim() ? undefined : Palette.inkFaint} />)}
          </Rows>
          {filled ? (
            <ActionButton label="Share with staff" onPress={sharePlan} style={styles.shareButton} variant="secondary" />
          ) : null}
        </>
      )}
    </>
  );
}

/* ───────────────────────────── Tools ───────────────────────────── */

function num(text: string) {
  const normalized = text.trim().replace(',', '.');
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return null;
  const v = Number.parseFloat(normalized);
  return Number.isFinite(v) ? v : null;
}

/** Input feedback only; the established clinical formula and thresholds below are unchanged. */
function sweatInputIssue(pre: string, post: string, drank: string, minutes: string): string | null {
  const fields = [
    { label: 'Weight before', raw: pre, positive: true },
    { label: 'Weight after', raw: post, positive: true },
    { label: 'Drank during', raw: drank, positive: false },
    { label: 'Practice length', raw: minutes, positive: true },
  ];
  for (const field of fields) {
    if (!field.raw.trim()) continue;
    const value = num(field.raw);
    if (value === null) return `${field.label}: enter a number using digits and one decimal separator.`;
    if (field.positive && value <= 0) return `${field.label} must be greater than zero.`;
  }
  const a = num(pre), b = num(post), d = num(drank) ?? 0;
  if (a !== null && b !== null && a - b <= -5) return 'Check the before and after weights. This combination cannot be calculated.';
  if (a !== null && b !== null && (a - b) * 16 + d < 0) return 'Check the weights and fluids. They produce a negative sweat amount.';
  return null;
}

/** Sweat rate from body weight before and after practice (NATA fluid-replacement guidance). */
function SweatRate() {
  const Palette = useAthletePalette();
  const styles = useAthleteStyles(baseStyles);
  const [pre, setPre] = useState('');
  const [post, setPost] = useState('');
  const [drank, setDrank] = useState('');
  const [minutes, setMinutes] = useState('');
  const [editing, setEditing] = useState(false);
  const a = num(pre), b = num(post), d = num(drank) ?? 0, m = num(minutes);
  const inputIssue = sweatInputIssue(pre, post, drank, minutes);
  const valid = inputIssue === null && a !== null && b !== null && m !== null && a > 0 && b > 0 && m > 0 && a - b > -5;
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
    <View style={styles.calculator}>
      <View style={styles.calcHead}>
        <Text style={styles.cardTitle}>Sweat rate</Text>
        {editing ? <ActionButton label="Done" onPress={Keyboard.dismiss} variant="text" /> : null}
      </View>
      <View style={styles.calcGrid}>
        {fields.map((f) => (
          <View key={f.label} style={styles.calcField}>
            <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.fieldLabel}>{f.label}</Text>
            <View style={styles.calcInputRow}>
              <TextInput accessibilityLabel={`${f.label} in ${f.unit}`} keyboardType="decimal-pad" onBlur={() => setEditing(false)} onFocus={() => setEditing(true)} onChangeText={f.set} placeholder="–" placeholderTextColor={Palette.inkFaint} style={styles.calcInput} value={f.value} />
              <Text style={styles.calcUnit}>{f.unit}</Text>
            </View>
          </View>
        ))}
      </View>
      {inputIssue ? <Text accessibilityLiveRegion="polite" style={styles.inputIssue}>{inputIssue}</Text> : null}
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
  const styles = useAthleteStyles(baseStyles);
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
          <Pressable accessibilityLabel={`${ZONES[z].label}${z === latestZone && data?.readings.length ? ', latest field reading' : ''}`} accessibilityRole="button" accessibilityState={{ selected: z === shown }} key={z} onPress={() => setZone(z)} style={({ pressed }) => [styles.zone, z === shown && styles.zoneSelected, pressed && styles.pressed]} aria-selected={z === shown}>
            <View style={[styles.zoneDot, { backgroundColor: zoneTone(z) }]} />
            <Text style={styles.zoneLabel}>{ZONES[z].label}</Text>
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
      <Segmented onChange={setSection} options={[{ key: 'respond', label: 'Respond' }, { key: 'prepare', label: 'Prepare' }, { key: 'tools', label: 'Tools' }]} value={section} />
      <Respond active={section === 'respond'} />
      {section === 'prepare' ? <Prepare /> : section === 'tools' ? (
        <>
          <Heading>Hydration</Heading>
          <SweatRate />
          <ZonePicker />
        </>
      ) : null}
    </>
  );
}

const baseStyles = StyleSheet.create({
  safetyStatus: { gap: 12, paddingVertical: 12 },
  retry: { alignSelf: 'flex-start' },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  headingRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', marginBottom: 12, marginTop: 28 },
  heading: { color: Palette.ink, flexShrink: 1, fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  hint: { color: Palette.inkMuted, fontSize: 16, lineHeight: 22, marginTop: 4 },
  plan: { gap: 4 },
  planHead: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingBottom: 12 },
  planBar: { borderRadius: 2, height: 22, width: 4 },
  planTitle: { color: Palette.ink, flex: 1, fontSize: 19, fontWeight: '700' },
  planCount: { color: Palette.inkMuted, fontFamily: Face.figure, fontSize: 20 },
  sos: { alignItems: 'center', backgroundColor: Palette.emergency, borderRadius: 14, justifyContent: 'center', marginBottom: 8, minHeight: 54 },
  sosText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  step: { alignItems: 'center', borderBottomColor: Palette.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 14, minHeight: 64, paddingVertical: 14 },
  check: { alignItems: 'center', borderColor: 'rgba(235,235,245,0.35)', borderRadius: 13, borderWidth: 2, height: 26, justifyContent: 'center', width: 26 },
  stepCopy: { flex: 1, gap: 4 },
  stepText: { color: Palette.ink, flexShrink: 1, fontSize: 16, lineHeight: 21 },
  stepDone: { color: Palette.inkMuted, textDecorationLine: 'line-through' },
  stepTime: { color: Palette.inkMuted, fontSize: 14, fontVariant: ['tabular-nums'] },
  planFoot: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 12 },
  grow: { flexGrow: 1, flexBasis: 220 },
  link: { color: Palette.inkMuted, fontSize: 16, fontWeight: '600' },
  readiness: { gap: 4 },
  editor: { gap: 4 },
  calculator: { gap: 4 },
  cardTitle: { color: Palette.ink, flexShrink: 1, fontSize: 18, fontWeight: '600' },
  cardNote: { color: Palette.inkMuted, fontSize: 14, marginTop: 12 },
  timer: { borderBottomColor: Palette.border, borderBottomWidth: StyleSheet.hairlineWidth, borderTopColor: Palette.border, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 24, paddingBottom: 16 },
  timerHead: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', paddingVertical: 12, gap: 12, justifyContent: 'space-between', minHeight: 60 },
  timerSince: { color: Palette.inkMuted, fontSize: 14, marginTop: 2 },
  timerValue: { color: Palette.ink, fontFamily: Face.figure, fontSize: 72, lineHeight: 78, marginTop: 4 },
  timerNote: { color: Palette.inkMuted, fontSize: 15, marginTop: 10 },
  timerButton: { marginTop: 16 },
  list: { backgroundColor: Palette.surface, borderRadius: 16, overflow: 'hidden' },
  divider: { backgroundColor: 'rgba(255,255,255,0.07)', height: StyleSheet.hairlineWidth, marginLeft: 40 },
  logRow: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 56, paddingHorizontal: 16 },
  logDot: { borderRadius: 5, height: 10, width: 10 },
  logCopy: { flex: 1, gap: 4, paddingVertical: 14 },
  logTitle: { color: Palette.ink, fontSize: 16, fontWeight: '600', lineHeight: 22 },
  logShare: { color: Palette.inkMuted, fontSize: 14, fontWeight: '600' },
  logMeta: { color: Palette.inkMuted, fontSize: 14, fontVariant: ['tabular-nums'] },
  readyHead: { alignItems: 'baseline', flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  readyCount: { color: Palette.ink, fontFamily: Face.figure, fontSize: 26 },
  readyBar: { flexDirection: 'row', gap: 4, marginBottom: 6, marginTop: 12 },
  readyStep: { flex: 1 },
  readyRow: { alignItems: 'center', flexDirection: 'row', gap: 14, minHeight: 60, paddingHorizontal: 16, paddingVertical: 12 },
  readyDone: { color: Palette.inkMuted },
  inputIssue: { color: Palette.warning, fontSize: 15, lineHeight: 22, marginTop: 12 },
  field: { marginBottom: 12 },
  fieldLabel: { color: Palette.inkMuted, fontSize: 14, fontWeight: '500', marginBottom: 6 },
  input: { backgroundColor: 'rgba(235,235,245,0.07)', borderRadius: 10, color: Palette.ink, fontSize: 16, minHeight: 46, paddingHorizontal: 12 },
  formActions: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 18, marginTop: 4 },
  shareButton: { marginTop: 12 },
  calcGrid: { gap: 12, marginTop: 14 },
  calcField: { gap: 6 },
  calcInputRow: { alignItems: 'center', backgroundColor: Palette.surface, borderRadius: 10, flexDirection: 'row', paddingHorizontal: 12 },
  calcInput: { color: Palette.ink, flex: 1, fontFamily: Face.figure, fontSize: 22, minHeight: 46 },
  calcUnit: { color: Palette.inkMuted, fontFamily: Face.label, fontSize: 16 },
  result: { borderTopColor: 'rgba(255,255,255,0.08)', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 16, paddingTop: 14 },
  resultRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  resultItem: { flexGrow: 1, flexBasis: 150 },
  resultValue: { color: Palette.ink, fontFamily: Face.figure, fontSize: 36, lineHeight: 40 },
  resultUnit: { color: Palette.inkMuted, fontFamily: Face.label, fontSize: 18 },
  resultLabel: { color: Palette.inkMuted, fontSize: 14, fontWeight: '500' },
  resultAdvice: { color: Palette.ink, fontSize: 15, lineHeight: 21, marginTop: 12 },
  calcHead: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', minHeight: 24 },
  zones: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  zone: { alignItems: 'center', backgroundColor: Palette.surface, borderColor: 'transparent', borderRadius: 10, borderWidth: 1, flexBasis: '17%', flexGrow: 1, gap: 6, justifyContent: 'center', minHeight: 64, minWidth: 52, paddingHorizontal: 4, paddingVertical: 10 },
  zoneSelected: { borderColor: Palette.ink },
  zoneDot: { borderRadius: 6, height: 12, width: 12 },
  zoneLabel: { color: Palette.ink, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  zoneHead: { alignItems: 'baseline', flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', marginTop: 16 },
  zoneName: { fontSize: 22, fontWeight: '700' },
  zoneRange: { color: Palette.ink, fontFamily: Face.figure, fontSize: 20 },
  zoneSummary: { color: Palette.inkMuted, fontSize: 16, lineHeight: 22, marginBottom: 14, marginTop: 4 },
});
