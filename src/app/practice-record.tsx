import { Text } from '@/components/ui/text';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { AthleteAppearanceProvider, useAthleteStyles } from '@/components/athlete-appearance';
import { ListRow, Rows, SampleTag, SectionTitle } from '@/components/whoop-ui';
import { shareMessage } from '@/components/ui/share-message';
import { ActionButton } from '@/components/ui/action-button';
import { Face, MaxContentWidth, Palette } from '@/constants/theme';
import { ZONES } from '@/lib/practice';
import { practiceRecordReport, savedPolicyLabel, watchPracticeRecord, type PracticeRecord } from '@/services/practice-record';
import { SOURCE_LABEL, watchReadings, type FieldReading, type SessionSummary } from '@/services/practice-sessions';
import { useAuthSession } from '@/state/auth-session';
import { usePastSessions } from '@/state/past-sessions';
import { useTemperature } from '@/state/preferences';

type RecordState = { key: string; status: 'ready'; record: PracticeRecord | null } | { key: string; status: 'error' };
type ReadingsState = { key: string; readings: FieldReading[]; error: boolean };
const time = (date: Date) => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const recordTime = (date: Date, start: Date) => date.toDateString() === start.toDateString() ? time(date) : `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${time(date)}`;

/** A saved practice, opened from Sessions. The sample history has aggregates only, never invented measurements. */
export default function PracticeRecordScreen() {
  const { role } = useLocalSearchParams<{ role?: string }>();
  return <AthleteAppearanceProvider enabled={role === 'athlete'}><PracticeRecordContent /></AthleteAppearanceProvider>;
}

function PracticeRecordContent() {
  const styles = useAthleteStyles(baseStyles);
  const { user, ready: authReady } = useAuthSession();
  const uid = user?.uid ?? null;
  const params = useLocalSearchParams<{ teamId?: string; id?: string; sample?: string; role?: string }>();
  const teamId = typeof params.teamId === 'string' ? params.teamId : '';
  const id = typeof params.id === 'string' ? params.id : '';
  const sample = params.sample === '1' && teamId === 'sample';
  const insets = useSafeAreaInsets();
  const temp = useTemperature();
  const samples = usePastSessions(null, sample, 40);
  const sampleRecord = sample ? samples?.find((entry) => entry.session.id === id) ?? null : null;
  const [state, setState] = useState<RecordState | null>(null);
  const [readingState, setReadingState] = useState<ReadingsState | null>(null);
  const [attempt, setAttempt] = useState(0);
  const key = `${sample ? 'sample' : uid ?? 'signed-out'}:${authReady ? 'ready' : 'pending'}:${teamId}:${id}:${attempt}`;
  const [sharing, setSharing] = useState(false);
  const [copiedSnapshot, setCopiedSnapshot] = useState<{ key: string; message: string } | null>(null);
  const sharingRef = useRef(false);
  const selected = state?.key === key ? state : null;
  const record = selected?.status === 'ready' ? selected.record : null;

  useEffect(() => {
    if (sample || !authReady || !uid) return;
    return watchPracticeRecord(teamId, id,
      (next) => setState({ key, status: 'ready', record: next }),
      () => setState({ key, status: 'error' }));
  }, [attempt, authReady, id, key, sample, teamId, uid]);

  useEffect(() => {
    if (!record || sample || !authReady || !uid) return;
    return watchReadings(record,
      (readings) => setReadingState({ key, readings, error: false }),
      () => setReadingState({ key, readings: [], error: true }));
  }, [attempt, authReady, key, record, sample, uid]);

  const readingResult = readingState?.key === key ? readingState : null;
  const readings = readingResult?.readings ?? [];
  const session = sampleRecord?.session ?? record;
  const peak = sampleRecord?.peak ?? readings.reduce<SessionSummary['peak']>((hot, reading) =>
    !hot || reading.wbgtF > hot.wbgtF ? { wbgtF: reading.wbgtF, zone: reading.zone } : hot, null);
  const minutes = session?.endedAt ? Math.max(0, Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 60_000)) : null;
  const canShare = Boolean(session && (sampleRecord || (record && readingResult && !readingResult.error)));
  const message = !session || !canShare ? null : sampleRecord
      ? `HeatSense sample practice summary\n${session.venue}\n${session.startedAt.toLocaleDateString()} · ${time(session.startedAt)}${session.endedAt ? `–${time(session.endedAt)}` : ''}\n${minutes ?? '—'} min · ${sampleRecord.readingCount} readings\nPeak WBGT: ${peak ? `${temp.value(peak.wbgtF)}${temp.unit}, ${ZONES[peak.zone].label}` : 'Not available'}\nSample summary only. Individual measurements and guidance confirmations are not available.`
      : practiceRecordReport(record!, readings);
  const copied = Boolean(message && copiedSnapshot?.key === key && copiedSnapshot.message === message);
  const originRole = params.role === 'coach' || params.role === 'trainer' ? params.role : 'athlete';
  const close = () => router.canGoBack() ? router.back() : router.replace({ pathname: '/dashboard', params: { role: originRole, tab: originRole === 'athlete' ? 'sessions' : 'home' } });
  const share = async () => {
    if (sharingRef.current || !canShare || !session || message === null) return;
    sharingRef.current = true;
    setSharing(true);
    setCopiedSnapshot(null);

    try { if (await shareMessage(message) === 'copied') setCopiedSnapshot({ key, message }); }
    catch { Alert.alert('Couldn’t share this record', 'Try again.'); }
    finally { sharingRef.current = false; setSharing(false); }
  };

  let body;
  if (!teamId || !id || teamId.includes('/') || id.includes('/')) body = <Text style={styles.message}>This practice link is incomplete.</Text>;
  else if (!sample && authReady && !uid) body = (
    <View style={styles.state}>
      <Text style={styles.message}>Sign in to view this team’s practice record.</Text>
      <ActionButton label="Sign in" onPress={() => router.replace('/welcome')} style={styles.retry} variant="secondary" />
    </View>
  );
  else if (!sample && selected?.status === 'error') body = (
    <View style={styles.state}>
      <Text style={styles.message}>Couldn’t load this practice. Check your connection and that you still belong to this team.</Text>
      <ActionButton label="Try again" onPress={() => setAttempt((value) => value + 1)} style={styles.retry} variant="secondary" />
    </View>
  );
  else if (!sample && !selected) body = <ActivityIndicator accessible accessibilityRole="progressbar" accessibilityState={{ busy: true }} accessibilityLabel="Loading practice" color={Palette.inkMuted} style={styles.state} aria-busy={true} />;
  else if (!session) body = <Text style={styles.message}>This practice could not be found.</Text>;
  else body = (
    <>
      {sample ? <SampleTag /> : null}
      <Text style={styles.date}>{session.startedAt.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</Text>
      <Text accessibilityRole="header" style={styles.title}>{session.venue}</Text>
      <Text style={styles.date}>{time(session.startedAt)}{session.endedAt ? `–${recordTime(session.endedAt, session.startedAt)}` : ' · In progress'}</Text>
      <View style={styles.summary}>
        <Rows>
          <ListRow label="Duration" value={minutes !== null ? `${minutes} min` : 'In progress'} />
          <ListRow label="Peak WBGT" value={peak ? `${temp.value(peak.wbgtF)}${temp.unit} · ${ZONES[peak.zone].label.replace(' zone', '')}` : readingResult?.error ? 'Unavailable' : sample ? 'Not available' : readingResult ? 'No readings' : 'Loading…'} valueTone={peak ? ZONES[peak.zone].text : undefined} />
          <ListRow label="Readings" value={sampleRecord ? String(sampleRecord.readingCount) : readingResult && !readingResult.error ? String(readings.length) : '—'} />
          <ListRow label="UIL heat class" value={`Class ${session.uilClass}`} />
          <ListRow label="Recheck interval" value={`${session.recheckMinutes} min`} />
          {record ? <ListRow label="Saved policy" value={savedPolicyLabel(record)} /> : null}
        </Rows>
      </View>
      <SectionTitle title="Field readings" />
      {sample ? <Text style={styles.message}>This sample includes a practice summary only. Individual measurements and guidance confirmations aren’t available.</Text>
        : readingResult?.error ? <View style={styles.state}>
          <Text style={styles.message}>Couldn’t load the saved readings. No readings have been changed.</Text>
          <ActionButton label="Try again" onPress={() => setAttempt((value) => value + 1)} style={styles.retry} variant="secondary" />
        </View>
          : !readingResult ? <ActivityIndicator accessible accessibilityRole="progressbar" accessibilityState={{ busy: true }} accessibilityLabel="Loading readings" color={Palette.inkMuted} aria-busy={true} />
            : !readings.length ? <Text style={styles.message}>No field readings were recorded in this practice.</Text>
              : <Rows>{readings.map((reading) => (
                <View accessible accessibilityLabel={`${recordTime(reading.measuredAt, session.startedAt)}, ${reading.enteredValue} degrees ${reading.enteredUnit === 'C' ? 'Celsius' : 'Fahrenheit'} WBGT, ${ZONES[reading.zone].label}. ${SOURCE_LABEL[reading.source]}. ${reading.acknowledgedAt ? `Guidance applied at ${recordTime(reading.acknowledgedAt, session.startedAt)}` : 'Guidance not confirmed'}`} key={reading.id} style={styles.reading}>
                  <View style={styles.readingHead}>
                    <Text style={styles.readingTime}>{recordTime(reading.measuredAt, session.startedAt)}</Text>
                    <Text style={[styles.readingValue, { color: ZONES[reading.zone].text }]}>{reading.enteredValue}<Text style={styles.readingUnit}>°{reading.enteredUnit} WBGT</Text></Text>
                  </View>
                  <Text style={styles.readingSource}>{ZONES[reading.zone].label} · {SOURCE_LABEL[reading.source]}</Text>
                  <Text style={styles.readingSource}>{reading.acknowledgedAt ? `Guidance applied at ${recordTime(reading.acknowledgedAt, session.startedAt)}` : 'Guidance not confirmed'}</Text>
                </View>
              ))}</Rows>}
    </>
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
        <Pressable accessibilityLabel="Back" accessibilityRole="button" onPress={close} style={styles.back}>
          <Svg fill="none" height={24} stroke={Palette.ink} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" width={24}><Path d="m15 5-7 7 7 7" /></Svg>
        </Pressable>
        <Text accessibilityRole="header" style={styles.barTitle}>Practice record</Text>
        <ActionButton accessibilityLabel={copied ? sample ? 'Copied sample summary' : 'Copied practice record' : sample ? 'Share sample summary' : 'Share practice record'} busy={sharing} busyLabel="Share" disabled={!canShare} label={copied ? 'Copied' : 'Share'} onPress={share} style={styles.shareAction} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.column}>{body}</View>
      </ScrollView>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  screen: { backgroundColor: Palette.canvas, flex: 1 },
  bar: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingHorizontal: 16 },
  back: { alignItems: 'center', justifyContent: 'center', minHeight: 48, minWidth: 48 },
  barTitle: { color: Palette.ink, flex: 1, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  shareAction: { flexShrink: 0, width: 132, paddingHorizontal: 12, paddingVertical: 8 },
  content: { alignItems: 'center', paddingTop: 24 },
  column: { maxWidth: MaxContentWidth, paddingHorizontal: 16, width: '100%' },
  date: { color: Palette.inkMuted, fontSize: 16, lineHeight: 24 },
  title: { color: Palette.ink, fontSize: 28, fontWeight: '700', lineHeight: 34, marginVertical: 6 },
  summary: { marginTop: 24 },
  message: { color: Palette.inkMuted, fontSize: 17, lineHeight: 24 },
  state: { gap: 12, marginVertical: 12 },
  retry: { alignSelf: 'flex-start' },
  reading: { gap: 8, paddingHorizontal: 20, paddingVertical: 20 },
  readingHead: { alignItems: 'baseline', flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  readingTime: { color: Palette.ink, fontSize: 17, fontWeight: '500' },
  readingValue: { fontFamily: Face.figure, fontSize: 28, lineHeight: 32 },
  readingUnit: { fontFamily: Face.label, fontSize: 18 },
  readingSource: { color: Palette.inkMuted, fontSize: 15, lineHeight: 21 },
});
