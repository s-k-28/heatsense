import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { Glyph, PageHeader, SecondaryButton, Sheet, Tap } from '@/components/ds';
import { Color, Radius, Space, TOUCH, Type } from '@/constants/design-system';
import { Palette } from '@/constants/theme';
import { useCoachTeam } from '@/hooks/use-coach-team';
import { useAuthSession } from '@/state/auth-session';

// Coach Alerts: safety first, nothing invented. There is no wristband alert feed yet, so the page is
// calm and short: no active alerts, and the emergency action that always applies. `?sample=1` shows
// the existing sample alerts, labeled as samples, to review the severity layout.

type Severity = 'urgent' | 'resolved';
type AlertItem = { id: string; athlete: string; summary: string; time: string; severity: Severity };

export const SAMPLE_ALERTS: AlertItem[] = [
  { id: 'maya', athlete: 'Maya Chen', summary: 'Recovery stalled for 6 min', time: 'Now', severity: 'urgent' },
  { id: 'jordan', athlete: 'Jordan Lee', summary: 'Hydration break acknowledged', time: '3:52 PM', severity: 'resolved' },
];

const URGENT = Palette.emergency;

function UrgentAlert({ alert }: { alert: AlertItem }) {
  return (
    <Tap
      accessibilityHint="Opens the alert"
      accessibilityLabel={`Needs a response. ${alert.athlete}: ${alert.summary}. ${alert.time}. Sample alert.`}
      onPress={() => router.push({ pathname: '/detail', params: { kind: 'alert' } })}
      radius={Radius.surface}
      style={styles.urgent}>
      <View style={styles.urgentHead}>
        <Glyph color={URGENT} name="warning" size={20} strokeWidth={2.2} />
        <Text style={styles.urgentLabel}>Needs a response</Text>
        <Text style={[Type.meta, styles.muted]}>{alert.time}</Text>
      </View>
      <Text style={styles.urgentName}>{alert.athlete}</Text>
      <Text style={[Type.body, styles.ink]}>{alert.summary}</Text>
      <View style={styles.urgentFoot}>
        <Text style={[Type.meta, styles.subtle]}>Sample alert</Text>
        <Text style={styles.review}>Review</Text>
        <Glyph color={Color.accent} name="arrow" size={16} strokeWidth={2} />
      </View>
    </Tap>
  );
}

function EarlierRow({ alert }: { alert: AlertItem }) {
  return (
    <View accessible accessibilityLabel={`${alert.athlete}: ${alert.summary}. ${alert.time}. Sample.`} style={styles.earlierRow}>
      <Glyph color={Color.inkSubtle} name="check" size={18} />
      <View style={styles.flex}>
        <Text style={[Type.bodyStrong, styles.ink]}>{alert.athlete}</Text>
        <Text style={[Type.support, styles.muted]}>{alert.summary} · sample</Text>
      </View>
      <Text style={[Type.meta, styles.muted]}>{alert.time}</Text>
    </View>
  );
}

export function CoachAlerts({ sample = false }: { sample?: boolean }) {
  const { user } = useAuthSession();
  const { state: team } = useCoachTeam(user?.uid ?? null);
  const [confirmCall, setConfirmCall] = useState(false);
  const alerts = sample ? SAMPLE_ALERTS : [];
  const urgent = alerts.filter((a) => a.severity === 'urgent');
  const earlier = alerts.filter((a) => a.severity !== 'urgent');

  return (
    <View>
      <PageHeader label={team.status === 'ready' ? team.team.teamName : null} title="Alerts" />

      {alerts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No active alerts.</Text>
          <Text style={[Type.support, styles.muted, styles.gapXs]}>Alerts appear here when an athlete’s wristband flags a concern.</Text>
        </View>
      ) : (
        <>
          {urgent.map((alert) => <UrgentAlert alert={alert} key={alert.id} />)}
          {earlier.length > 0 ? (
            <View style={styles.section}>
              <Text accessibilityRole="header" style={[Type.section, styles.ink, styles.sectionHead]}>Earlier today</Text>
              {earlier.map((alert) => <EarlierRow alert={alert} key={alert.id} />)}
            </View>
          ) : null}
        </>
      )}

      <View style={styles.section}>
        <Text accessibilityRole="header" style={[Type.section, styles.ink, styles.sectionHead]}>Emergency</Text>
        <Text style={[Type.bodyStrong, styles.ink]}>Collapse or suspected heat stroke: call 911 and start your school’s emergency action plan.</Text>
        <Tap accessibilityLabel="Call 911" onPress={() => setConfirmCall(true)} radius={Radius.pill} style={styles.call}>
          <Glyph color={URGENT} name="phone" size={18} strokeWidth={2} />
          <Text style={[Type.button, { color: URGENT }]}>Call 911</Text>
        </Tap>
      </View>

      <Sheet hideDone onClose={() => setConfirmCall(false)} title="Call 911?" visible={confirmCall}>
        <Text style={[Type.body, styles.muted, styles.gapS]}>This places a real phone call to emergency services.</Text>
        <Tap accessibilityLabel="Call 911 now" onPress={() => { setConfirmCall(false); Linking.openURL('tel:911').catch(() => {}); }} radius={Radius.pill} style={styles.callNow}>
          <Glyph color={Color.ink} name="phone" size={18} strokeWidth={2} />
          <Text style={[Type.button, styles.ink]}>Call 911 now</Text>
        </Tap>
        <SecondaryButton label="Cancel" onPress={() => setConfirmCall(false)} style={styles.cancel} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  ink: { color: Color.ink },
  muted: { color: Color.inkMuted },
  subtle: { color: Color.inkSubtle },
  flex: { flex: 1, minWidth: 0 },
  gapXs: { marginTop: Space.xs },
  gapS: { marginTop: Space.s },

  empty: { paddingVertical: Space.s },
  emptyTitle: { color: Color.ink, fontFamily: Type.section.fontFamily, fontSize: 30, lineHeight: 34 },

  urgent: { backgroundColor: Color.surface, borderColor: URGENT, borderCurve: 'continuous', borderWidth: 1.5, gap: Space.xs, overflow: 'hidden', padding: Space.l + 4 },
  urgentHead: { alignItems: 'center', flexDirection: 'row', gap: Space.s, marginBottom: Space.s },
  urgentLabel: { ...Type.bodyStrong, color: URGENT, flex: 1 },
  urgentName: { color: Color.ink, fontFamily: Type.section.fontFamily, fontSize: 30, lineHeight: 32 },
  urgentFoot: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: Space.m },
  review: { ...Type.button, color: Color.accent, fontSize: 15, marginLeft: 'auto' },

  section: { marginTop: Space.section },
  sectionHead: { marginBottom: Space.m },
  earlierRow: { alignItems: 'center', flexDirection: 'row', gap: Space.m, minHeight: 60, paddingVertical: Space.s },

  call: { alignItems: 'center', alignSelf: 'flex-start', borderColor: URGENT, borderWidth: 1.5, flexDirection: 'row', gap: Space.s, marginTop: Space.l, minHeight: TOUCH + 4, paddingHorizontal: Space.xl },
  callNow: { alignItems: 'center', backgroundColor: URGENT, flexDirection: 'row', gap: Space.s, justifyContent: 'center', marginTop: Space.xl, minHeight: 54 },
  cancel: { alignSelf: 'stretch', marginTop: Space.m },
});
