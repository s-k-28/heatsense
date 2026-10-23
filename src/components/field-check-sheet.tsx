import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { Group, Row, TextLink } from '@/components/ui/list';
import { Palette, Radius, Spacing, Type } from '@/constants/theme';
import { ZONES } from '@/lib/practice';
import { UIL_GUIDANCE, UIL_SOURCE_URL, UIL_VERSION, zoneRange, type UilClass } from '@/lib/uil-wbgt';
import { getMyTeamInvite } from '@/services/team-invites';
import {
  SOURCE_LABEL,
  acknowledgeReading,
  addReading,
  endSession,
  recheckStatus,
  sessionReport,
  startSession,
  watchActiveSession,
  watchReadings,
  type FieldReading,
  type PracticeSession,
  type ReadingSource,
} from '@/services/practice-sessions';
import { useTeamDraft } from '@/state/onboarding';
import { endPractice, startPractice, useTemperature } from '@/state/preferences';

const RECHECK_CHOICES = [15, 30, 45, 60] as const;
const MEASURED_CHOICES = [0, 5, 10, 15] as const;

function clock(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const time = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/**
 * The practice record: start a session, enter field WBGT readings, see the UIL guidance for each,
 * acknowledge it, and recheck on time. Everything is saved to the team in Firestore, so the clock
 * and history survive a restart and assistant coaches see the same record.
 */
export function FieldCheckSheet({ onClose, visible, trainerTeamId }: { onClose: () => void; visible: boolean; trainerTeamId?: string | null }) {
  // An athletic trainer works on the team they belong to; the coach on the team they made.
  const trainer = trainerTeamId !== undefined;
  const [coachTeamId, setTeamId] = useState<string | null | undefined>(undefined);
  const teamId = trainer ? trainerTeamId : coachTeamId;
  const [session, setSession] = useState<PracticeSession | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (trainer) return;
    let live = true;
    getMyTeamInvite()
      .then((mine) => { if (live) setTeamId(mine?.invite.teamId ?? null); })
      .catch(() => { if (live) setTeamId(null); });
    return () => { live = false; };
  }, [trainer]);

  useEffect(() => {
    if (!teamId) return;
    return watchActiveSession(teamId, (next) => {
      setSession(next);
      setFailed(false);
      // The dashboard clock and Dynamic Island follow the saved session, so a restart picks it back up.
      if (next) startPractice(next.startedAt.getTime());
      else endPractice();
    }, () => setFailed(true));
  }, [teamId]);

  let body;
  if (teamId === undefined || (teamId && session === undefined && !failed)) body = <ActivityIndicator color={Palette.inkMuted} style={styles.loading} />;
  else if (!teamId) body = <Notice text={trainer ? 'Join your team first. Your coach approves your request.' : 'Create your team first. Practice records are saved to the team so every coach sees the same readings.'} />;
  else if (failed) body = <Notice text="Couldn’t load practice records. Check your connection and try again." />;
  else if (!session) body = trainer ? <Notice text="Practice hasn’t started yet. Once the head coach starts it, you can log readings and confirm guidance here." /> : <StartForm teamId={teamId} />;
  else body = <SessionView canEnd={!trainer} session={session} />;

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible={visible}>
      <KeyboardAvoidingView behavior="padding" style={styles.sheet}>
        <View style={styles.bar}>
          <Text style={styles.title}>{session ? 'Practice' : 'Field conditions'}</Text>
          <TextLink label="Done" onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{body}</ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Notice({ text }: { text: string }) {
  return <Text style={styles.note}>{text}</Text>;
}

function Chips<T extends string | number>({ label, onSelect, options, selected, format }: { label: string; onSelect: (v: T) => void; options: readonly T[]; selected: T; format: (v: T) => string }) {
  return (
    <View accessibilityLabel={label} accessibilityRole="radiogroup" style={styles.chips}>
      {options.map((option) => (
        <Pressable accessibilityRole="radio" accessibilityState={{ checked: option === selected }} key={String(option)} onPress={() => onSelect(option)} style={[styles.chip, option === selected && styles.chipOn]}>
          <Text style={[styles.chipText, option === selected && styles.chipTextOn]}>{format(option)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function StartForm({ teamId }: { teamId: string }) {
  const [venue, setVenue] = useState('Practice field');
  // Pre-filled from team setup when the coach chose a class there.
  const [uilClass, setUilClass] = useState<UilClass | null>(useTeamDraft().uilClass);
  const [recheck, setRecheck] = useState<number>(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    if (!uilClass || !venue.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await startSession(teamId, { venue, uilClass, recheckMinutes: recheck });
    } catch {
      setError('Couldn’t start the session. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Field label="Where is practice?">
        <TextInput accessibilityLabel="Practice location" maxLength={80} onChangeText={setVenue} placeholderTextColor={Palette.inkFaint} style={styles.input} value={venue} />
      </Field>
      <Field label="Your school’s UIL heat class">
        <Chips<UilClass> format={(c) => `Class ${c}`} label="UIL heat class" onSelect={setUilClass} options={[2, 3]} selected={uilClass ?? (0 as UilClass)} />
        <Text style={styles.help}>UIL assigns each region a class. Zone thresholds differ between them, so pick the one your athletic department uses.</Text>
        <TextLink label="View the UIL WBGT chart" onPress={() => Linking.openURL(UIL_SOURCE_URL)} />
      </Field>
      <Field label="Recheck WBGT every">
        <Chips format={(m) => `${m} min`} label="Recheck interval" onSelect={setRecheck} options={RECHECK_CHOICES} selected={recheck as (typeof RECHECK_CHOICES)[number]} />
        <Text style={styles.help}>Use the interval in your school’s heat plan. HeatSense tells you when a reading is due.</Text>
      </Field>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: !uilClass || busy }} disabled={!uilClass || busy} onPress={start} style={({ pressed }) => [styles.primary, (!uilClass || busy) && styles.disabled, pressed && styles.pressed]}>
        <Text style={styles.primaryText}>{busy ? 'Starting…' : 'Start practice session'}</Text>
      </Pressable>
    </>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function SessionView({ session, canEnd = true }: { session: PracticeSession; canEnd?: boolean }) {
  const reduced = useReducedMotion();
  const temp = useTemperature();
  const [readings, setReadings] = useState<FieldReading[]>([]);
  const [listenError, setListenError] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => watchReadings(session, (next) => { setReadings(next); setListenError(false); }, () => setListenError(true)), [session]);
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  const latest = readings.at(-1) ?? null;
  const recheck = recheckStatus(session, latest, now);
  const rise = (delay: number) => (reduced ? undefined : FadeInDown.delay(delay).duration(320));

  return (
    <>
      <Text style={styles.meta}>{session.venue} · UIL Class {session.uilClass} · started {time(session.startedAt)}</Text>

      {latest ? <LatestReading latest={latest} now={now} session={session} temp={temp} /> : (
        <Text style={styles.note}>No reading yet. Take a WBGT reading on the field before athletes start.</Text>
      )}

      <View accessibilityLiveRegion="polite" style={[styles.recheck, recheck.overdue && styles.recheckLate]}>
        <Text style={styles.recheckLabel}>{recheck.overdue ? 'Reading overdue' : latest ? 'Next reading due' : 'First reading due'}</Text>
        <Text style={[styles.recheckValue, recheck.overdue && { color: Palette.emergency }]}>
          {recheck.overdue ? `${clock(-recheck.msLeft)} late` : `in ${clock(recheck.msLeft)}`}
        </Text>
        <Text style={styles.help}>at {time(new Date(recheck.dueAt))} · every {session.recheckMinutes} min</Text>
      </View>

      <Animated.View entering={rise(0)}>
        <ReadingForm session={session} />
      </Animated.View>

      {listenError ? <Text style={styles.error}>Couldn’t load readings. Check your connection.</Text> : null}
      {readings.length > 0 ? <History readings={readings} temp={temp} /> : null}

      <Pressable accessibilityRole="button" onPress={() => Share.share({ message: sessionReport(session, readings) })} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
        <Text style={styles.secondaryText}>Share practice record</Text>
      </Pressable>
      {canEnd ? (
        <Pressable accessibilityRole="button" onPress={() => endSession(session).catch(() => {})} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
          <Text style={[styles.secondaryText, { color: Palette.emergency }]}>End practice</Text>
        </Pressable>
      ) : null}
    </>
  );
}

type Temp = ReturnType<typeof useTemperature>;

function LatestReading({ latest, now, session, temp }: { latest: FieldReading; now: number; session: PracticeSession; temp: Temp }) {
  const zone = ZONES[latest.zone];
  const guidance = UIL_GUIDANCE[latest.zone];
  const [acking, setAcking] = useState(false);
  const minutesAgo = Math.max(0, Math.round((now - latest.measuredAt.getTime()) / 60_000));

  return (
    <View style={styles.reading}>
      <Text style={styles.eyebrow}>Measured {minutesAgo === 0 ? 'just now' : `${minutesAgo} min ago`} · {SOURCE_LABEL[latest.source]}</Text>
      <View style={styles.readingRow}>
        <Text style={styles.readingValue}>{temp.value(latest.wbgtF)}</Text>
        <Text style={styles.readingUnit}>{temp.unit} WBGT</Text>
      </View>
      <View style={[styles.zoneChip, { borderColor: zone.color }]}>
        <View style={[styles.liveDot, { backgroundColor: zone.color }]} />
        <Text style={[styles.zoneChipText, { color: zone.text }]}>{zone.label} · {zoneRange(latest.zone, session.uilClass)}</Text>
      </View>

      <Text style={styles.planTitle}>What UIL requires</Text>
      <Group>
        <Row title={guidance.summary} />
        {guidance.breaksPerHour ? <Row title="Rest breaks" value={`${guidance.breaksPerHour}+ per hour, ${guidance.breakMinutes}+ min each`} /> : null}
        {guidance.restMinutesPerHour ? <Row title="Rest" value={`${guidance.restMinutesPerHour} min per hour`} /> : null}
        {guidance.maxPracticeMinutes ? <Row title="Max practice" value={`${guidance.maxPracticeMinutes / 60} hr`} /> : null}
        {guidance.football ? <Row title={`Football: ${guidance.football}`} /> : null}
        {guidance.coolingZoneRequired ? <Row title="Rapid cooling zone on site (tub or tarp)" value="Required" /> : null}
      </Group>
      <Text style={styles.help}>Source: UIL WBGT activity guidelines {UIL_VERSION}, Class {session.uilClass}. Your school’s plan may be stricter.</Text>

      {latest.acknowledgedAt ? (
        <Text style={styles.acked}>✓ Acknowledged at {time(latest.acknowledgedAt)}</Text>
      ) : (
        <Pressable
          accessibilityHint="Records that you've read the guidance for this reading"
          accessibilityRole="button"
          disabled={acking}
          onPress={() => { setAcking(true); acknowledgeReading(session, latest).catch(() => {}).finally(() => setAcking(false)); }}
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
          <Text style={styles.primaryText}>{acking ? 'Saving…' : 'I’ve applied this guidance'}</Text>
        </Pressable>
      )}
    </View>
  );
}

function ReadingForm({ session }: { session: PracticeSession }) {
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState<'F' | 'C'>('F');
  const [source, setSource] = useState<ReadingSource>('handheld');
  const [minutesAgo, setMinutesAgo] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const number = Number(value.replace(',', '.'));
    if (!value.trim() || !Number.isFinite(number)) return setError('Enter the WBGT number from your meter.');
    setBusy(true);
    setError(null);
    try {
      const result = await addReading(session, { value: number, unit, source, measuredAt: new Date(Date.now() - minutesAgo * 60_000) });
      if ('error' in result) setError(result.error ?? null);
      else { setValue(''); setMinutesAgo(0); }
    } catch {
      setError('Couldn’t save the reading. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.form}>
      <Text style={styles.planTitle}>Add a field reading</Text>
      <View style={styles.inputRow}>
        <TextInput accessibilityLabel={`WBGT in degrees ${unit === 'F' ? 'Fahrenheit' : 'Celsius'}`} inputMode="decimal" keyboardType="decimal-pad" maxLength={5} onChangeText={setValue} onSubmitEditing={save} placeholder="WBGT" placeholderTextColor={Palette.inkFaint} style={[styles.input, styles.inputGrow]} value={value} />
        <Chips<'F' | 'C'> format={(u) => `°${u}`} label="Unit" onSelect={setUnit} options={['F', 'C']} selected={unit} />
      </View>
      <Chips<ReadingSource> format={(s) => SOURCE_LABEL[s]} label="Where the reading came from" onSelect={setSource} options={['handheld', 'station', 'other']} selected={source} />
      <Chips format={(m) => (m === 0 ? 'Measured now' : `${m} min ago`)} label="When it was measured" onSelect={setMinutesAgo} options={MEASURED_CHOICES} selected={minutesAgo as (typeof MEASURED_CHOICES)[number]} />
      {error ? <Text accessibilityLiveRegion="assertive" style={styles.error}>{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={busy} onPress={save} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
        <Text style={styles.secondaryText}>{busy ? 'Saving…' : 'Save reading'}</Text>
      </Pressable>
    </View>
  );
}

/** Newest first. Each row says what changed since the reading before it; nothing is ever overwritten. */
function History({ readings, temp }: { readings: FieldReading[]; temp: Temp }) {
  const rows = readings.map((reading, index) => ({ reading, previous: readings[index - 1] ?? null })).reverse();
  return (
    <View>
      <Text style={styles.planTitle}>Today’s readings</Text>
      <Group>
        {rows.map(({ reading, previous }) => {
          const delta = previous ? reading.wbgtF - previous.wbgtF : null;
          const zoneChange = previous && previous.zone !== reading.zone ? ` · ${ZONES[previous.zone].label.replace(' zone', '')} → ${ZONES[reading.zone].label.replace(' zone', '')}` : '';
          const change = delta === null ? 'First reading' : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} °F${zoneChange}`;
          return (
            <Row
              key={reading.id}
              title={`${time(reading.measuredAt)} · ${temp.value(reading.wbgtF)}${temp.unit} · ${ZONES[reading.zone].label}`}
              value={`${change}${reading.acknowledgedAt ? '' : ' · not acknowledged'}`}
            />
          );
        })}
      </Group>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.4 },
  loading: { marginTop: Spacing.eight },
  sheet: { backgroundColor: '#101214', flex: 1 },
  bar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingBottom: Spacing.three, paddingHorizontal: Spacing.five, paddingTop: Spacing.five },
  title: { color: Palette.ink, ...Type.title2, fontWeight: '700' },
  content: { gap: Spacing.five, paddingBottom: Spacing.eight, paddingHorizontal: Spacing.five, paddingTop: Spacing.two },
  meta: { color: Palette.inkMuted, ...Type.footnote },
  field: { gap: Spacing.two },
  fieldLabel: { color: Palette.ink, ...Type.headline },
  help: { color: Palette.inkMuted, ...Type.footnote },
  error: { color: Palette.emergency, ...Type.footnote },
  input: { backgroundColor: Palette.card, borderColor: Palette.cardEdge, borderCurve: 'continuous', borderRadius: Radius.medium, borderWidth: StyleSheet.hairlineWidth, color: Palette.ink, ...Type.callout, minHeight: 48, paddingHorizontal: Spacing.four },
  inputRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.three },
  inputGrow: { flex: 1, fontSize: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { backgroundColor: Palette.fill, borderRadius: 10, minHeight: 40, justifyContent: 'center', paddingHorizontal: 12 },
  chipOn: { backgroundColor: Palette.coral },
  chipText: { color: Palette.ink, ...Type.label, fontSize: 14 },
  chipTextOn: { color: '#1A0E07' },
  form: { gap: Spacing.three },
  reading: { gap: Spacing.two },
  eyebrow: { color: Palette.inkMuted, ...Type.label, fontSize: 13 },
  readingRow: { alignItems: 'baseline', flexDirection: 'row', gap: 6 },
  readingValue: { color: Palette.ink, ...Type.figure, fontSize: 84, lineHeight: 86 },
  readingUnit: { color: Palette.inkMuted, ...Type.label, fontSize: 18 },
  zoneChip: { alignItems: 'center', alignSelf: 'flex-start', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingVertical: 5 },
  zoneChipText: { ...Type.label, fontSize: 14 },
  liveDot: { borderRadius: 4, height: 8, width: 8 },
  planTitle: { color: Palette.ink, ...Type.headline, marginBottom: Spacing.two, marginTop: Spacing.three },
  acked: { color: Palette.safe, ...Type.headline, marginTop: Spacing.two },
  recheck: { backgroundColor: Palette.card, borderColor: Palette.cardEdge, borderCurve: 'continuous', borderRadius: Radius.medium, borderWidth: StyleSheet.hairlineWidth, gap: 2, padding: Spacing.four },
  recheckLate: { borderColor: Palette.emergency, borderWidth: 1 },
  recheckLabel: { color: Palette.inkMuted, ...Type.label, fontSize: 13 },
  recheckValue: { color: Palette.ink, ...Type.figure, fontSize: 34, lineHeight: 38 },
  primary: { alignItems: 'center', backgroundColor: Palette.coral, borderCurve: 'continuous', borderRadius: 14, justifyContent: 'center', marginTop: Spacing.three, minHeight: 54 },
  primaryText: { color: '#1A0E07', ...Type.label, fontSize: 17 },
  note: { color: Palette.inkMuted, ...Type.callout, marginTop: Spacing.three },
  secondary: { alignItems: 'center', backgroundColor: Palette.fill, borderCurve: 'continuous', borderRadius: 14, justifyContent: 'center', minHeight: 50 },
  secondaryText: { color: Palette.ink, ...Type.headline },
});
