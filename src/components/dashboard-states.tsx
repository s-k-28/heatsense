import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, View } from 'react-native';

import { FieldCard, shareTeamCode } from '@/components/dashboard-content';
import { LargeTitle, SectionHeader } from '@/components/dashboard-shell';
import { HeatIcon } from '@/components/heat-icon';
import { Button, Card, CardHeader, Group, Row } from '@/components/ui/list';
import { Palette, Spacing, Type } from '@/constants/theme';
import { useTeamDraft } from '@/state/onboarding';
import { setPreference, useTemperature } from '@/state/preferences';

type IconName = ComponentProps<typeof HeatIcon>['name'];

const icons = {
  offline: { ios: 'wifi.exclamationmark', android: 'wifi_off', web: 'wifi_off' },
  check: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  open: { ios: 'circle', android: 'radio_button_unchecked', web: 'radio_button_unchecked' },
  band: { ios: 'applewatch', android: 'watch', web: 'watch' },
} as const satisfies Record<string, IconName>;

export type DashboardReviewState = 'weather-stale' | 'empty-team' | 'pairing' | 'no-band' | 'alert-acknowledged';

export function DashboardState({ state }: { state: DashboardReviewState }) {
  if (state === 'weather-stale') return <WeatherStale />;
  if (state === 'empty-team') return <EmptyTeam />;
  if (state === 'pairing') return <Pairing />;
  if (state === 'no-band') return <NoBand />;
  return <AlertAcknowledged />;
}

/** Runs a timer that is cleaned up if the screen goes away first. */
function useDelayed() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return (callback: () => void, ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(callback, ms);
  };
}

function WeatherStale() {
  const temp = useTemperature();
  const later = useDelayed();
  const [checking, setChecking] = useState(false);
  const [failed, setFailed] = useState(false);

  const retry = () => {
    if (checking) return;
    setChecking(true);
    setFailed(false);
    // The sample sensor stays offline, so a retry reports that honestly instead of pretending to recover.
    later(() => { setChecking(false); setFailed(true); }, 1400);
  };

  return (
    <>
      <LargeTitle title="Today" />
      <Card style={styles.first}>
        <CardHeader icon={icons.offline} label="Weather is out of date" tone={Palette.warning} trailing="28 min ago" />
        <View style={styles.valueRow}>
          <Text style={styles.value}>{temp.value(84)}</Text>
          <Text style={styles.unit}>{temp.unit}</Text>
        </View>
        <Text style={styles.muted}>Last WBGT reading, not current guidance. HeatSense won’t set a new practice zone until it can reach the field sensor.</Text>
        <Text style={styles.instruction}>Use the school’s backup measurement process before practice.</Text>
        <View style={styles.action}>
          {checking ? <View style={styles.checking}><ActivityIndicator color={Palette.inkMuted} /><Text style={styles.muted}>Checking the field sensor…</Text></View> : <Button label="Try again" onPress={retry} />}
        </View>
        {failed ? <Text accessibilityLiveRegion="polite" style={styles.error}>Still can’t reach the field sensor.</Text> : null}
      </Card>
      <Text style={styles.footnote}>If conditions stay unavailable, follow district procedures and record a local WBGT measurement.</Text>
    </>
  );
}

function EmptyTeam() {
  const draft = useTeamDraft();
  return (
    <>
      <LargeTitle title="Team" />
      <View style={styles.first}>
        <Text style={styles.headline}>No athletes yet</Text>
        <Text style={styles.muted}>The field plan already works. Add athletes when you’re ready to share schedules and review optional band alerts.</Text>
      </View>

      <SectionHeader title="To do" />
      <Group inset={56}>
        <ChecklistRow done label="Confirm the team schedule" />
        <ChecklistRow label="Add coaching and training staff" />
        <ChecklistRow label="Invite athletes" />
      </Group>
      <View style={styles.action}><Button label="Share team code" onPress={() => shareTeamCode(draft)} /></View>
    </>
  );
}

function Pairing() {
  const later = useDelayed();
  const [paired, setPaired] = useState(false);
  const [pairing, setPairing] = useState(false);

  const pair = () => {
    if (pairing) return;
    setPairing(true);
    later(() => { setPairing(false); setPaired(true); setPreference('bandConnected', true); }, 1600);
  };

  return (
    <>
      <LargeTitle title={paired ? 'Band paired' : 'Pair your band'} />
      <Text style={styles.contextLine}>
        {paired ? 'Personal trends will show up after your next session.' : 'Keep the band close to this phone. The team’s WBGT plan works without it.'}
      </Text>

      {!paired ? (
        <View style={styles.searching}>
          <ActivityIndicator color={Palette.inkMuted} />
          <Text style={styles.muted}>{pairing ? 'Pairing…' : 'Searching nearby…'}</Text>
        </View>
      ) : null}

      <Group inset={56} style={paired ? styles.afterIntro : undefined}>
        <Row
          detail={paired ? 'Connected' : 'Nearby · ready to pair'}
          leading={<HeatIcon name={paired ? icons.check : icons.band} size={24} tintColor={paired ? Palette.safe : Palette.ink} />}
          title="HeatSense Band 02A7"
        />
      </Group>
      <View style={styles.action}>
        {paired
          ? <Button label="Done" onPress={() => router.replace('/dashboard?role=athlete')} />
          : <Button label={pairing ? 'Pairing…' : 'Pair this band'} onPress={pair} />}
      </View>
      <Text style={styles.footnote}>Pairing adds recovery, skin, sweat and movement trends. The band isn’t a medical device, and you choose what to share.</Text>
    </>
  );
}

function NoBand() {
  return (
    <>
      <LargeTitle title="Today" />
      <View style={styles.first}><FieldCard /></View>
      <SectionHeader title="Personal signals" />
      <Group>
        <Row detail="Pair a band to add recovery, skin, sweat and movement trends." title="Band not connected" value="Off" />
      </Group>
      <View style={styles.action}><Button label="Pair a band" onPress={() => router.replace('/dashboard?role=athlete&state=pairing')} /></View>
    </>
  );
}

function AlertAcknowledged() {
  const [followUp, setFollowUp] = useState<string | null>(null);

  const document = () => {
    const save = (note?: string) => setFollowUp(note?.trim() ? note.trim() : 'Recorded with no notes');
    if (Platform.OS === 'ios') {
      Alert.prompt('Document follow-up', 'Hydration, cooling steps and what happened.', [
        { style: 'cancel', text: 'Cancel' },
        { onPress: save, text: 'Save' },
      ]);
    } else {
      save();
    }
  };

  return (
    <>
      <LargeTitle title="Alert" />
      <Card style={styles.first}>
        <CardHeader icon={icons.check} label="Acknowledged" tone={Palette.safe} trailing="2:15 PM" />
        <Text style={styles.headline}>Coach Rivera is responding</Text>
        <Text style={styles.muted}>{followUp ? 'Follow-up recorded. This alert is closed.' : 'The alert stays open until follow-up is recorded.'}</Text>
      </Card>

      <SectionHeader title="Athlete" />
      <Group>
        <Row detail="Varsity soccer · Field 2" title="Maya Chen" value="Review" valueTone={Palette.warning} />
      </Group>

      <SectionHeader title="Timeline" />
      <Group>
        <Row detail="Recovery stalled while movement stayed low" title="Warning sent" value="2:14 PM" />
        <Row detail="Coach Rivera opened the alert" title="Acknowledged" value="2:15 PM" />
        {followUp
          ? <Row detail={followUp} title="Follow-up recorded" value="Now" />
          : <Row detail="Record hydration, cooling and what happened" title="Follow-up pending" value="Now" valueTone={Palette.warning} />}
      </Group>
      {followUp ? null : <View style={styles.action}><Button label="Document follow-up" onPress={document} /></View>}
    </>
  );
}

function ChecklistRow({ done, label }: { done?: boolean; label: string }) {
  return (
    <Row
      leading={<HeatIcon name={done ? icons.check : icons.open} size={24} tintColor={done ? Palette.safe : Palette.inkFaint} />}
      title={label}
    />
  );
}

const styles = StyleSheet.create({
  first: { marginTop: Spacing.three },
  action: { marginTop: Spacing.five },
  contextLine: { color: Palette.inkMuted, ...Type.subhead, marginTop: 2 },
  valueRow: { alignItems: 'baseline', flexDirection: 'row', gap: 4, marginTop: Spacing.two },
  value: { color: Palette.ink, ...Type.display },
  unit: { color: Palette.inkMuted, ...Type.body, fontWeight: '500' },
  muted: { color: Palette.inkMuted, ...Type.subhead, marginTop: 2 },
  headline: { color: Palette.ink, ...Type.title2 },
  instruction: { color: Palette.ink, ...Type.callout, fontWeight: '600', marginTop: Spacing.three },
  error: { color: Palette.emergency, ...Type.footnote, marginTop: Spacing.three },
  checking: { alignItems: 'center', flexDirection: 'row', gap: Spacing.three, minHeight: 50 },
  footnote: { color: Palette.inkMuted, ...Type.footnote, marginHorizontal: Spacing.four, marginTop: Spacing.three },
  afterIntro: { marginTop: Spacing.five },
  searching: { alignItems: 'center', flexDirection: 'row', gap: Spacing.three, marginVertical: Spacing.five, minHeight: 24 },
});
