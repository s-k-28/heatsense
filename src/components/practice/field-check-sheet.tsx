import { Text, TextInput } from '@/components/ui/text';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Group, Row, TextLink } from '@/components/ui/list';
import { OutdoorStartPanel } from '@/components/practice/outdoor-start-panel';
import { shareMessage } from '@/components/ui/share-message';
import { ActionButton } from '@/components/ui/action-button';
import { Face, Palette, Spacing, Type } from '@/constants/theme';
import { checkOutdoorStart, MAX_RECHECK_MINUTES, outdoorStartTime } from '@/lib/outdoor-start';
import { PRACTICE_DECISION_LABELS, practiceDecisionOptions, type PracticeDecisionKind } from '@/lib/practice-decision';
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
  recordOutdoorStart,
  recordPracticeDecision,
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

const RECHECK_CHOICES = [15, MAX_RECHECK_MINUTES] as const;
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
      const outdoorStart = next && outdoorStartTime(next);
      if (outdoorStart) startPractice(outdoorStart.getTime());
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
  else if (!session) body = trainer ? <Notice text="Once the head coach opens a practice record, you can log field readings here." /> : <StartForm key={teamId} teamId={teamId} />;
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

function Chips<T extends string | number>({ label, onSelect, options, selected, format, disabled = false }: { label: string; onSelect: (v: T) => void; options: readonly T[]; selected: T | null; format: (v: T) => string; disabled?: boolean }) {
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
    } catch {
      setError('Couldn’t open the practice record. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Text style={styles.help}>Open the team record, then log an on-site WBGT reading before outdoor practice.</Text>
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
      <ActionButton busy={busy} busyLabel="Opening…" disabled={!uilClass || !venue.trim()} label="Open practice record" onPress={start} />
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
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const startingRef = useRef(false);
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
  const began = outdoorStartTime(session);
  const startCheck = listenError ? 'unavailable' : checkOutdoorStart(latest, now);
  const recheck = recheckStatus(session, latest, now);
  const decision = latest?.decision?.kind;
  const outdoorExit = decision === 'moved_indoors' || decision === 'stopped_outdoors';
  const closeAction = canEnd ? (
    <>
      <ActionButton busy={ending} busyLabel="Closing…" label={began ? 'End practice' : 'Close record'} onPress={async () => {
        setEnding(true);
        setEndError(false);
        try { await endSession(session); }
        catch { setEndError(true); }
        finally { setEnding(false); }
      }} variant="danger" />
      {endError ? <Text accessibilityLiveRegion="assertive" style={styles.error}>Couldn’t close the practice record. Check your connection and try again.</Text> : null}
    </>
  ) : null;

  return (
    <>
      <Text style={styles.meta}>{session.venue} · UIL Class {session.uilClass} · {began ? `Started ${time(began)}` : `Record opened ${time(session.startedAt)}`}</Text>

      {began ? <View style={styles.recheck}>
        <Text style={styles.recheckLabel}>{!latest ? 'First reading' : 'Next reading'}</Text>
        <Text style={[styles.recheckValue, recheck.overdue && { color: Palette.emergency }]}>
          {!latest || recheck.msLeft === 0 ? 'Due now' : recheck.overdue ? `${clock(-recheck.msLeft)} overdue` : `in ${clock(recheck.msLeft)}`}
        </Text>
      </View> : <OutdoorStartPanel
        measurement={latest ? `${temp.precise(latest.wbgtF).toFixed(1)}${temp.unit} WBGT · ${ZONES[latest.zone].label} · ${time(latest.measuredAt)}` : undefined}
        status={startCheck}>
        {latest && (startCheck === 'ready' || startCheck === 'stop') ? <LatestReading key={latest.id} latest={latest} session={session} /> : null}
        {canEnd ? <ActionButton
          busy={starting}
          busyLabel="Verifying reading…"
          disabled={startCheck !== 'ready'}
          label="Record outdoor start"
          onPress={async () => {
            if (!latest || startCheck !== 'ready' || startingRef.current) return;
            startingRef.current = true;
            setStarting(true);
            setStartError(null);
            try {
              if (await recordOutdoorStart(session, latest.id)) void askForHeatAlerts().catch(() => {});
              else setStartError('The latest reading changed or expired. Review the current reading and try again.');
            } catch {
              setStartError('Couldn’t save outdoor start. Check your connection and the current field reading.');
            } finally {
              startingRef.current = false;
              setStarting(false);
            }
          }} /> : <Text style={styles.help}>The head coach records outdoor start.</Text>}
        {startError ? <Text accessibilityLiveRegion="assertive" style={styles.error}>{startError}</Text> : null}
      </OutdoorStartPanel>}

      {began && latest ? <LatestReading key={latest.id} latest={latest} session={session} /> : null}
      {latest && !listenError ? <DecisionCard key={latest.id} reading={latest} session={session} /> : null}
      {outdoorExit ? closeAction : null}

      <ReadingForm session={session} />

      {listenError ? <><Text accessibilityLiveRegion="assertive" style={styles.error}>Readings may be out of date. Check your connection.</Text><ActionButton label="Reload readings" onPress={retryReadings} variant="secondary" /></> : null}
      {readings.length > 0 ? <History readings={readings} session={session} temp={temp} canRecord={!listenError} /> : null}

      <ActionButton busy={sharing} busyLabel="Opening sharing…" label={copied ? 'Copied' : 'Share practice record'} onPress={async () => {
        if (sharingRef.current) return;
        sharingRef.current = true;
        setSharing(true); setShareError(false); setCopiedReport(null);
        try { setCopiedReport(await shareMessage(report) === 'copied' ? report : null); }
        catch { setShareError(true); }
        finally { sharingRef.current = false; setSharing(false); }
      }} variant="text" />
      {shareError ? <Text accessibilityLiveRegion="assertive" style={styles.error}>Couldn’t share the record. Try again; the saved record is unchanged.</Text> : null}
      {outdoorExit ? null : closeAction}
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
          <Text style={styles.help}>{latest.acknowledgedAt ? `Acknowledged at ${time(latest.acknowledgedAt)}` : 'Review the guidance for this reading'}</Text>
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
          label="Acknowledge guidance"
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
      <Chips<ReadingSource> disabled={busy} format={(s) => SOURCE_LABEL[s]} label="Where the reading came from" onSelect={setSource} options={['handheld', 'station', 'other']} selected={source} />
      <Chips disabled={busy} format={(m) => (m === 0 ? 'Measured now' : `${m} min ago`)} label="When it was measured" onSelect={setMinutesAgo} options={MEASURED_CHOICES} selected={minutesAgo as (typeof MEASURED_CHOICES)[number]} />
      {error ? <Text accessibilityLiveRegion="assertive" style={styles.error}>{error}</Text> : null}
      <ActionButton busy={busy} busyLabel="Saving…" label="Save reading" onPress={() => { Keyboard.dismiss(); save(); }} />
    </View>
  );
}

function DecisionCard({ reading, session, expanded = false }: { reading: FieldReading; session: PracticeSession; expanded?: boolean }) {
  const temp = useTemperature();
  const [showChoices, setShowChoices] = useState(expanded);
  const [kind, setKind] = useState<PracticeDecisionKind | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const pending = useRef(false);

  return (
    <View style={[styles.decision, reading.zone === 'black' && styles.decisionStop]}>
      <View style={styles.decisionHeading}>
        <Text accessibilityRole="header" style={styles.fieldLabel}>Staff decision</Text>
        <Text style={styles.meta}>{temp.precise(reading.wbgtF).toFixed(1)}{temp.unit} WBGT · {time(reading.measuredAt)}</Text>
      </View>
      {reading.decision ? (
        <Text accessibilityLiveRegion="polite" style={styles.help}>
          {PRACTICE_DECISION_LABELS[reading.decision.kind]} · Recorded {time(reading.decision.at)}
        </Text>
      ) : showChoices ? (
        <>
          <Text style={styles.help}>Select the action staff took for this reading. You can save one decision per reading.</Text>
          <Chips disabled={busy} format={(option) => PRACTICE_DECISION_LABELS[option]} label="Staff action" onSelect={setKind} options={practiceDecisionOptions(reading.zone)} selected={kind} />
          <ActionButton busy={busy} busyLabel="Saving…" disabled={!kind} label="Save decision" onPress={async () => {
            if (!kind || pending.current) return;
            pending.current = true;
            setBusy(true);
            setError(false);
            try { await recordPracticeDecision(session, reading, kind); }
            catch { setError(true); }
            finally { pending.current = false; setBusy(false); }
          }} />
          {error ? <Text accessibilityLiveRegion="assertive" style={styles.error}>Couldn’t save the decision. Check the connection and confirm this record is still open.</Text> : null}
        </>
      ) : (
        <ActionButton label="Log staff decision" onPress={() => setShowChoices(true)} variant={reading.zone === 'black' ? 'primary' : 'secondary'} />
      )}
    </View>
  );
}

/** Newest first, with a way to record a missed decision while the session is still open. */
function History({ readings, temp, session, canRecord }: { readings: FieldReading[]; temp: Temp; session: PracticeSession; canRecord: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const rows = readings.map((reading, index) => ({ reading, previous: readings[index - 1] ?? null })).reverse();
  return (
    <View>
      <Text style={styles.planTitle}>Today’s readings</Text>
      <Group>
        {rows.map(({ reading, previous }, index) => {
          const zone = ZONES[reading.zone].label.replace(' zone', '');
          const zones = previous && previous.zone !== reading.zone ? `${ZONES[previous.zone].label.replace(' zone', '')} → ${zone}` : zone;
          const canAdd = canRecord && index > 0 && !reading.decision;
          return (
            <View key={reading.id}>
              <Row
                detail={[reading.decision ? PRACTICE_DECISION_LABELS[reading.decision.kind] : canAdd ? 'Log a decision' : '', !reading.acknowledgedAt ? 'Guidance pending' : ''].filter(Boolean).join(' · ') || undefined}
                onPress={canAdd ? () => setSelected(selected === reading.id ? null : reading.id) : undefined}
                title={`${temp.precise(reading.wbgtF).toFixed(1)}${temp.unit} · ${zones}`}
                value={time(reading.measuredAt)}
              />
              {canAdd && selected === reading.id ? <DecisionCard expanded reading={reading} session={session} /> : null}
            </View>
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
  decision: { backgroundColor: Palette.surface, borderColor: Palette.border, borderRadius: 16, borderWidth: 1, gap: Spacing.three, padding: Spacing.four },
  decisionHeading: { gap: Spacing.one },
  decisionStop: { borderColor: Palette.emergency },
  guidanceToggle: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 48 },
  guidanceCopy: { flex: 1, gap: 4 },
  guidanceTitle: { color: Palette.ink, ...Type.headline },
  planTitle: { color: Palette.ink, ...Type.headline, marginBottom: Spacing.two, marginTop: Spacing.three },
  recheck: { alignItems: 'baseline', flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  recheckLabel: { color: Palette.inkMuted, ...Type.label, fontSize: 16 },
  recheckValue: { color: Palette.ink, fontFamily: Face.figure, fontSize: 30, lineHeight: 36 },
  note: { color: Palette.inkMuted, ...Type.callout, marginTop: Spacing.three },
});
