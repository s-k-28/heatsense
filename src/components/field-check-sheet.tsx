import { Text, TextInput } from '@/components/ui/text';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Group, Row, TextLink } from '@/components/ui/list';
import { shareMessage } from '@/components/ui/share-message';
import { ActionButton } from '@/components/ui/action-button';
import { Face, Palette, Spacing, Type } from '@/constants/theme';
import { ZONES } from '@/lib/practice';
import { UIL_GUIDANCE, UIL_SOURCE_URL, UIL_VERSION, type UilClass } from '@/lib/uil-wbgt';
import { firestore } from '@/services/firebase';
import { useAuthSession } from '@/state/auth-session';
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
import { askForHeatAlerts } from '@/services/heat-alerts';
import { useTeamDraft } from '@/state/onboarding';
import { endPractice, startPractice, usePreferences, useTemperature } from '@/state/preferences';

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
type FieldCheckProps = { onClose: () => void; visible: boolean; trainerTeamId?: string | null };

export function FieldCheckSheet(props: FieldCheckProps) {
  const { user, ready } = useAuthSession();
  // Never reuse a previous account's team lookup, form or subscription result.
  return <FieldCheckContent {...props} authReady={ready} key={`${user?.uid ?? 'signed-out'}:${props.trainerTeamId === undefined ? 'coach' : props.trainerTeamId ?? 'trainer-no-team'}`} uid={user?.uid ?? null} />;
}

function FieldCheckContent({ onClose, visible, trainerTeamId, uid, authReady }: FieldCheckProps & { uid: string | null; authReady: boolean }) {
  const trainer = trainerTeamId !== undefined;
  const [lookup, setLookup] = useState<{ teamId: string | null; failed: boolean } | null>(null);
  const [lookupAttempt, setLookupAttempt] = useState(0);
  const teamId = trainer ? trainerTeamId : lookup?.teamId;
  const [record, setRecord] = useState<{ teamId: string; session: PracticeSession | null } | null>(null);
  const [failedTeam, setFailedTeam] = useState<string | null>(null);
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const session = record?.teamId === teamId ? record?.session : undefined;
  const failed = Boolean(teamId && failedTeam === teamId);
  const retryLookup = () => { setLookup(null); setLookupAttempt(value => value + 1); };
  const retrySession = () => { setRecord(null); setFailedTeam(null); setSessionAttempt(value => value + 1); };

  useEffect(() => {
    if (trainer || !authReady || !uid || !firestore) return;
    let live = true;
    getMyTeamInvite()
      .then(mine => { if (live) setLookup({ teamId: mine?.invite.teamId ?? null, failed: false }); })
      .catch(() => { if (live) setLookup({ teamId: null, failed: true }); });
    return () => { live = false; };
  }, [authReady, lookupAttempt, trainer, uid]);

  useEffect(() => {
    if (!teamId || !firestore || !uid || !authReady) return;
    let live = true;
    const stop = watchActiveSession(teamId, next => {
      if (!live) return;
      setRecord({ teamId, session: next });
      setFailedTeam(null);
      if (next) startPractice(next.startedAt.getTime());
      else endPractice();
    }, () => { if (live) setFailedTeam(teamId); });
    return () => { live = false; stop(); };
  }, [authReady, sessionAttempt, teamId, uid]);

  let body;
  if (!authReady) body = <ActivityIndicator accessibilityLabel="Loading account" color={Palette.inkMuted} style={styles.loading} />;
  else if (!firestore) body = <SamplePractice onClose={onClose} />;
  else if (!uid) body = <><Notice text="Sign in to view and save your team’s practice records." /><ActionButton label="Sign in" onPress={() => { onClose(); router.push('/sign-in'); }} /></>;
  else if (!trainer && lookup?.failed) body = <><Notice text="Couldn’t find your team. Check your connection and try again." /><ActionButton label="Try again" onPress={retryLookup} variant="secondary" /></>;
  else if (teamId === undefined || (teamId && session === undefined && !failed)) body = <ActivityIndicator accessibilityLabel="Loading practice records" color={Palette.inkMuted} style={styles.loading} />;
  else if (!teamId) body = trainer ? <Notice text="Join your team first. Your coach approves your request." /> : (
    <>
      <Notice text="Create your team first. Practice records are saved to the team so every coach sees the same readings." />
      <ActionButton label="Create your team" onPress={() => { onClose(); router.push('/team/create'); }} />
    </>
  );
  else if (failed) body = <><Notice text="Couldn’t load practice records. Check your connection and try again." /><ActionButton label="Try again" onPress={retrySession} variant="secondary" /></>;
  else if (!session) body = trainer ? <Notice text="Practice hasn’t started yet. Once the head coach starts it, you can log readings and confirm guidance here." /> : <StartForm key={teamId} teamId={teamId} />;
  else body = <SessionView canEnd={!trainer} key={`${session.teamId}:${session.id}`} session={session} />;

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible={visible}>
      <KeyboardAvoidingView behavior="padding" style={styles.sheet}>
        <View style={styles.bar}>
          <Text accessibilityRole="header" style={styles.title}>{session ? 'Practice' : 'Field conditions'}</Text>
          <TextLink label="Done" onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardDismissMode="interactive" keyboardShouldPersistTaps="always">{body}</ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Sample mode has no team record to save to, so a practice here only runs the clock on this device. */
function SamplePractice({ onClose }: { onClose: () => void }) {
  const { practiceStartedAt } = usePreferences();
  if (practiceStartedAt === null) {
    return (
      <>
        <Notice text="Sample mode: nothing is saved to a team. Starting a sample practice runs the practice clock and the Dynamic Island on this device." />
        <ActionButton label="Start sample practice" onPress={() => { startPractice(Date.now()); onClose(); }} />
      </>
    );
  }
  return (
    <>
      <Notice text={`Sample practice running since ${time(new Date(practiceStartedAt))}.`} />
      <ActionButton label="End sample practice" onPress={() => { endPractice(); onClose(); }} variant="secondary" />
    </>
  );
}

function Notice({ text }: { text: string }) {
  return <Text style={styles.note}>{text}</Text>;
}

function Chips<T extends string | number>({ label, onSelect, options, selected, format, disabled = false }: { label: string; onSelect: (v: T) => void; options: readonly T[]; selected: T; format: (v: T) => string; disabled?: boolean }) {
  return (
    <View accessibilityLabel={label} accessibilityRole="radiogroup" style={styles.chips}>
      {options.map((option) => (
        <Pressable accessibilityRole="radio" accessibilityState={{ checked: option === selected, disabled }} disabled={disabled} key={String(option)} onPress={() => onSelect(option)} style={[styles.chip, option === selected && styles.chipOn, disabled && styles.disabled]} aria-checked={option === selected}>
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
    if (busy || !uilClass || !venue.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await startSession(teamId, { venue, uilClass, recheckMinutes: recheck });
      // Starting practice is when recheck reminders start to matter.
      askForHeatAlerts().catch(() => {});
    } catch {
      setError('Couldn’t start the session. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Field label="Where is practice?">
        <TextInput editable={!busy} accessibilityLabel="Practice location" maxLength={80} onChangeText={setVenue} placeholderTextColor={Palette.inkFaint} style={styles.input} value={venue} />
      </Field>
      <Field label="Your school’s UIL heat class">
        <Chips<UilClass> disabled={busy} format={(c) => `Class ${c}`} label="UIL heat class" onSelect={setUilClass} options={[2, 3]} selected={uilClass ?? (0 as UilClass)} />
        <Text style={styles.help}>UIL assigns each region a class. Zone thresholds differ between them, so pick the one your athletic department uses.</Text>
        <TextLink label="View the UIL WBGT chart" onPress={() => Linking.openURL(UIL_SOURCE_URL).catch(() => setError('Couldn’t open the UIL chart. Try again.'))} />
      </Field>
      <Field label="Recheck WBGT every">
        <Chips disabled={busy} format={(m) => `${m} min`} label="Recheck interval" onSelect={setRecheck} options={RECHECK_CHOICES} selected={recheck as (typeof RECHECK_CHOICES)[number]} />
        <Text style={styles.help}>Use the interval in your school’s heat plan. HeatSense tells you when a reading is due.</Text>
      </Field>
      {error ? <Text accessibilityLiveRegion="assertive" style={styles.error}>{error}</Text> : null}
      <ActionButton busy={busy} busyLabel="Starting…" disabled={!uilClass || !venue.trim()} label="Start practice session" onPress={start} />
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
  const temp = useTemperature();
  const [readings, setReadings] = useState<FieldReading[] | null>(null);
  const [listenError, setListenError] = useState(false);
  const [listenAttempt, setListenAttempt] = useState(0);
  const [shareError, setShareError] = useState(false);
  const [sharing, setSharing] = useState(false);
  const sharingRef = useRef(false);
  const [copiedReport, setCopiedReport] = useState<string | null>(null);
  const retryReadings = () => { setReadings(null); setListenError(false); setListenAttempt(value => value + 1); };
  const [ending, setEnding] = useState(false);
  const [endError, setEndError] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let live = true;
    const stop = watchReadings(session, next => { if (live) { setReadings(next); setListenError(false); } }, () => { if (live) setListenError(true); });
    return () => { live = false; stop(); };
  }, [listenAttempt, session]);
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  if (readings === null) return listenError
    ? <><Notice text="Couldn’t load readings. Check your connection." /><ActionButton label="Try again" onPress={retryReadings} variant="secondary" /></>
    : <ActivityIndicator accessibilityLabel="Loading readings" color={Palette.inkMuted} />;

  const report = sessionReport(session, readings);
  const copied = copiedReport === report;
  const latest = readings.at(-1) ?? null;
  const recheck = recheckStatus(session, latest, now);

  return (
    <>
      <Text style={styles.meta}>{session.venue} · UIL Class {session.uilClass} · started {time(session.startedAt)}</Text>

      <View style={styles.recheck}>
        <Text style={styles.recheckLabel}>{!latest ? 'First reading' : 'Next reading'}</Text>
        <Text style={[styles.recheckValue, recheck.overdue && { color: Palette.emergency }]}>
          {!latest || recheck.msLeft === 0 ? 'Due now' : recheck.overdue ? `${clock(-recheck.msLeft)} overdue` : `in ${clock(recheck.msLeft)}`}
        </Text>
      </View>
      {!latest ? <Text style={styles.help}>Take a WBGT reading on the field before athletes start.</Text> : null}

      {latest ? <LatestReading key={latest.id} latest={latest} session={session} /> : null}

      <ReadingForm session={session} />

      {listenError ? <><Text accessibilityLiveRegion="assertive" style={styles.error}>Readings may be out of date. Check your connection.</Text><ActionButton label="Reload readings" onPress={retryReadings} variant="secondary" /></> : null}
      {readings.length > 0 ? <History readings={readings} temp={temp} /> : null}

      <ActionButton busy={sharing} busyLabel="Opening sharing…" label={copied ? 'Copied' : 'Share practice record'} onPress={async () => {
        if (sharingRef.current) return;
        sharingRef.current = true;
        setSharing(true); setShareError(false); setCopiedReport(null);
        try { setCopiedReport(await shareMessage(report) === 'copied' ? report : null); }
        catch { setShareError(true); }
        finally { sharingRef.current = false; setSharing(false); }
      }} variant="text" />
      {shareError ? <Text accessibilityLiveRegion="assertive" style={styles.error}>Couldn’t share the record. Try again; the saved record is unchanged.</Text> : null}
      {canEnd ? (
        <ActionButton busy={ending} busyLabel="Ending…" label="End practice" onPress={async () => {
          setEnding(true);
          setEndError(false);
          try { await endSession(session); }
          catch { setEndError(true); }
          finally { setEnding(false); }
        }} variant="danger" />
      ) : null}
      {endError ? <Text accessibilityLiveRegion="assertive" style={styles.error}>Couldn’t end practice. Check your connection and try again.</Text> : null}
    </>
  );
}

type Temp = ReturnType<typeof useTemperature>;

function LatestReading({ latest, session }: { latest: FieldReading; session: PracticeSession }) {
  const zone = ZONES[latest.zone];
  const guidance = UIL_GUIDANCE[latest.zone];
  const [acking, setAcking] = useState(false);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(!latest.acknowledgedAt);

  return (
    <View style={styles.reading}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={styles.guidanceToggle} aria-expanded={expanded}>
        <View style={styles.guidanceCopy}>
          <Text style={[styles.guidanceTitle, { color: zone.text }]}>{zone.label} guidance</Text>
          <Text style={styles.help}>{latest.acknowledgedAt ? `Applied at ${time(latest.acknowledgedAt)}` : 'Review and confirm for the latest reading'}</Text>
        </View>
        <Text style={styles.help}>{expanded ? 'Hide' : 'View'}</Text>
      </Pressable>
      {expanded ? <>
      <Group>
        <Row title={guidance.summary} />
        {guidance.breaksPerHour ? <Row title="Rest breaks" value={`${guidance.breaksPerHour}+ per hour, ${guidance.breakMinutes}+ min each`} /> : null}
        {guidance.restMinutesPerHour ? <Row title="Rest" value={`${guidance.restMinutesPerHour} min per hour`} /> : null}
        {guidance.maxPracticeMinutes ? <Row title="Max practice" value={`${guidance.maxPracticeMinutes / 60} hr`} /> : null}
        {guidance.football ? <Row title={`Football: ${guidance.football}`} /> : null}
        {guidance.coolingZoneRequired ? <Row title="Rapid cooling zone on site (tub or tarp)" value="Required" /> : null}
      </Group>
      <Text style={styles.help}>Source: UIL WBGT activity guidelines {UIL_VERSION}, Class {session.uilClass}. Your school’s plan may be stricter.</Text>

      {!latest.acknowledgedAt ? (
        <ActionButton
          accessibilityHint="Records that you've read the guidance for this reading"
          busy={acking}
          busyLabel="Saving…"
          label="I’ve applied this guidance"
          onPress={async () => {
            setAcking(true);
            setError(false);
            try { await acknowledgeReading(session, latest); }
            catch { setError(true); }
            finally { setAcking(false); }
          }}
          variant="secondary" />
      ) : null}
      {error ? <Text accessibilityLiveRegion="assertive" style={styles.error}>Couldn’t confirm guidance. Check your connection and try again.</Text> : null}
      </> : null}
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
    if (busy) return;
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
      <Text accessibilityRole="header" style={styles.planTitle}>Log WBGT</Text>
      <View style={styles.inputRow}>
        <TextInput editable={!busy} accessibilityLabel={`WBGT in degrees ${unit === 'F' ? 'Fahrenheit' : 'Celsius'}`} inputMode="decimal" keyboardType="decimal-pad" maxLength={5} onChangeText={setValue} onSubmitEditing={save} placeholder="WBGT" placeholderTextColor={Palette.inkFaint} style={[styles.input, styles.inputGrow]} value={value} />
        <Chips<'F' | 'C'> disabled={busy} format={(u) => `°${u}`} label="Unit" onSelect={setUnit} options={['F', 'C']} selected={unit} />
      </View>
      {/* Save sits right under the number, above where the number pad opens (the pad has no return key). */}
      {error ? <Text accessibilityLiveRegion="assertive" style={styles.error}>{error}</Text> : null}
      <ActionButton busy={busy} busyLabel="Saving…" label="Save reading" onPress={() => { Keyboard.dismiss(); save(); }} />
      <Chips<ReadingSource> disabled={busy} format={(s) => SOURCE_LABEL[s]} label="Where the reading came from" onSelect={setSource} options={['handheld', 'station', 'other']} selected={source} />
      <Chips disabled={busy} format={(m) => (m === 0 ? 'Measured now' : `${m} min ago`)} label="When it was measured" onSelect={setMinutesAgo} options={MEASURED_CHOICES} selected={minutesAgo as (typeof MEASURED_CHOICES)[number]} />
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
          // One line: the reading and its zone (with the change when the zone moved), then the time.
          const zone = ZONES[reading.zone].label.replace(' zone', '');
          const zones = previous && previous.zone !== reading.zone ? `${ZONES[previous.zone].label.replace(' zone', '')} → ${zone}` : zone;
          return (
            <Row
              key={reading.id}
              title={`${temp.value(reading.wbgtF)}${temp.unit} · ${zones}`}
              value={`${time(reading.measuredAt)}${reading.acknowledgedAt ? '' : ' · pending'}`}
            />
          );
        })}
      </Group>
    </View>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.45 },
  loading: { marginTop: Spacing.eight },
  sheet: { backgroundColor: Palette.canvas, flex: 1 },
  bar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingBottom: Spacing.three, paddingHorizontal: Spacing.five, paddingTop: Spacing.five },
  title: { flex: 1, color: Palette.ink, ...Type.title2 },
  content: { gap: Spacing.five, paddingBottom: Spacing.eight, paddingHorizontal: Spacing.five, paddingTop: Spacing.two },
  meta: { color: Palette.inkMuted, ...Type.footnote },
  field: { gap: Spacing.two },
  fieldLabel: { color: Palette.ink, ...Type.label },
  help: { color: Palette.inkMuted, ...Type.subhead },
  error: { color: Palette.emergency, ...Type.footnote },
  input: { backgroundColor: Palette.surfaceMuted, borderColor: 'transparent', borderRadius: 22, color: Palette.ink, ...Type.body, minHeight: 56, paddingHorizontal: 18 },
  inputRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  inputGrow: { flexGrow: 1, flexBasis: 140, fontSize: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { backgroundColor: Palette.surfaceMuted, borderRadius: 22, minHeight: 48, minWidth: 48, justifyContent: 'center', paddingHorizontal: 12 },
  chipOn: { backgroundColor: Palette.interactive, borderColor: Palette.inkMuted, borderWidth: 1 },
  chipText: { color: Palette.ink, ...Type.label, fontSize: 14 },
  chipTextOn: { color: Palette.ink },
  form: { gap: Spacing.three },
  reading: { borderBottomColor: Palette.border, borderBottomWidth: StyleSheet.hairlineWidth, gap: Spacing.two, paddingBottom: Spacing.four },
  guidanceToggle: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 48 },
  guidanceCopy: { flex: 1, gap: 4 },
  guidanceTitle: { color: Palette.ink, ...Type.headline },
  planTitle: { color: Palette.ink, ...Type.headline, marginBottom: Spacing.two, marginTop: Spacing.three },
  recheck: { alignItems: 'baseline', flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  recheckLabel: { color: Palette.inkMuted, ...Type.label, fontSize: 16 },
  recheckValue: { color: Palette.ink, fontFamily: Face.figure, fontSize: 30, lineHeight: 36 },
  note: { color: Palette.inkMuted, ...Type.callout, marginTop: Spacing.three },
});
