import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LargeTitle, SectionHeader } from '@/components/dashboard-shell';
import { BarChart, LineChart } from '@/components/ui/charts';
import { Button, Card, CardHeader, Group, Row } from '@/components/ui/list';
import { MaxContentWidth, Palette, Spacing, Type } from '@/constants/theme';
import { useTemperature } from '@/state/preferences';

const icons = {
  alert: { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
  heart: { ios: 'heart.fill', android: 'favorite', web: 'favorite' },
  sun: { ios: 'sun.max.fill', android: 'sunny', web: 'sunny' },
} as const;

type DetailKind = 'alert' | 'athlete' | 'session';

const RECOVERY_BPM = [158, 154, 151, 149, 147, 145, 144, 143, 142];

export default function DetailScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ kind?: string; name?: string; title?: string }>();
  const kind: DetailKind = params.kind === 'alert' || params.kind === 'session' ? params.kind : 'athlete';

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Stack.Screen
        options={{
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          headerShown: true,
          headerStyle: { backgroundColor: Palette.canvas },
          headerTintColor: Palette.coral,
          title: '',
        }}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.eight }]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}>
        <View style={styles.column}>
          {kind === 'alert' ? <AlertDetail /> : kind === 'session' ? <SessionDetail title={params.title} /> : <AthleteDetail name={params.name} />}
          <Text style={styles.sample}>Sample data for design review.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function AthleteDetail({ name = 'Maya Chen' }: { name?: string }) {
  const temp = useTemperature();
  return (
    <>
      <LargeTitle title={name} />
      <Text style={styles.subtitle}>Varsity soccer · Field 2</Text>

      <Card style={styles.first}>
        <CardHeader icon={icons.heart} label="Heart-rate recovery" tone={Palette.emergency} trailing="6 min into break" />
        <View style={styles.valueRow}>
          <Text style={styles.value}>142</Text>
          <Text style={styles.unit}>BPM</Text>
        </View>
        <LineChart labels={['Break started', 'Now']} summary="Heart rate during the break, still elevated at 142 beats per minute" tone={Palette.emergency} values={RECOVERY_BPM} />
        <Text style={styles.body}>Recovery is slower than {name.split(' ')[0]}’s usual range while movement stays low.</Text>
      </Card>

      <SectionHeader title="Signals" />
      <Group>
        <Row title="Skin trend" value={`${temp.delta(0.8)} / 5 min`} valueTone={Palette.warning} />
        <Row title="Sweat trend" value="+11%" />
        <Row title="Movement" value="Low" valueTone={Palette.warning} />
      </Group>

      <SectionHeader title="Recent" />
      <Group>
        <Row detail="Entered the scheduled recovery break" title="Break started" value="2:08 PM" />
        <Row detail="Heart rate stayed above her personal range" title="Review triggered" value="2:14 PM" />
      </Group>

      <View style={styles.action}><Button label={`Respond to ${name.split(' ')[0]}’s alert`} onPress={() => router.push({ pathname: '/detail', params: { kind: 'alert' } })} /></View>
      <Text style={styles.footnote}>Personal signals support a coach or athletic trainer’s evaluation. They don’t diagnose heat illness.</Text>
    </>
  );
}

function AlertDetail() {
  const temp = useTemperature();
  return (
    <>
      <LargeTitle title="Recovery check needed" />
      <Text style={styles.subtitle}>Maya Chen · Field 2 · Sent 2:14 PM</Text>

      <Card style={styles.first}>
        <CardHeader icon={icons.alert} label="Needs a response" tone={Palette.emergency} />
        <Text style={styles.body}>Heart rate didn’t recover during a low-movement break, and skin temperature kept rising.</Text>
        <View style={styles.cardAction}>
          <Button label="Acknowledge and locate" onPress={() => router.replace('/dashboard?role=coach&tab=alerts&state=alert-acknowledged')} />
        </View>
      </Card>

      <SectionHeader title="Why it was flagged" />
      <Group>
        <Row title="Heart-rate recovery" value="142 bpm after 6 min" />
        <Row title="Skin trend" value={`${temp.delta(0.8)} / 5 min`} />
        <Row title="Movement" value="Low during break" />
      </Group>

      <SectionHeader title="What to do" />
      <Group>
        <Row detail="Use direct observation and follow the school’s emergency action plan." title="1. Find and assess the athlete" />
        <Row detail="Stop activity. Give water only if the athlete is alert and it’s appropriate." title="2. Move to shade and cool down" />
        <Row detail="Collapse, confusion or suspected heat stroke needs an emergency response right away." title="3. Escalate urgent symptoms" />
      </Group>
    </>
  );
}

function SessionDetail({ title = 'Varsity conditioning' }: { title?: string }) {
  const temp = useTemperature();
  return (
    <>
      <LargeTitle title={title} />
      <Text style={styles.subtitle}>September 15 · 4:10 – 5:22 PM · Memorial Stadium</Text>

      <Card style={styles.first}>
        <CardHeader icon={icons.sun} label="Peak WBGT" tone={Palette.warning} trailing="Orange zone, 38 min" />
        <View style={styles.valueRow}>
          <Text style={styles.value}>{temp.value(84)}</Text>
          <Text style={styles.unit}>{temp.unit}</Text>
        </View>
        <BarChart
          floor={56}
          highlight={5}
          labels={['4 PM', '5 PM']}
          summary={`WBGT during practice, peaking at ${temp.value(84)} degrees`}
          tone={Palette.warning}
          values={[70, 74, 78, 81, 83, 84, 83, 81]}
        />
        <Text style={styles.body}>Practice used 20-minute work blocks with 10-minute recovery breaks.</Text>
      </Card>

      <SectionHeader title="Recovery" />
      <Card>
        <CardHeader icon={icons.heart} label="Average recovery" trailing="Within baseline" />
        <View style={styles.valueRow}>
          <Text style={styles.value}>8</Text>
          <Text style={styles.unit}>min average</Text>
        </View>
        <LineChart labels={['First break', 'Final break']} max={12} min={0} summary="Recovery time across breaks, stable" tone={Palette.safe} values={[9, 8, 9, 8, 7, 8]} />
      </Card>

      <SectionHeader title="Summary" />
      <Group>
        <Row title="Duration" value="72 min" />
        <Row title="Water breaks" value="6" />
        <Row title="Alerts" value="0" />
      </Group>

      <SectionHeader title="Condition changes" />
      <Group>
        <Row detail="Practice plan began in the Yellow zone" title="Session started" value="4:10 PM" />
        <Row detail="Work and rest schedule adjusted" title="Orange zone" value="4:34 PM" />
        <Row detail="All scheduled recovery checks complete" title="Session ended" value="5:22 PM" />
      </Group>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: Palette.canvas, flex: 1 },
  content: { alignItems: 'center' },
  column: { maxWidth: MaxContentWidth, paddingHorizontal: Spacing.four, width: '100%' },
  first: { marginTop: Spacing.three },
  subtitle: { color: Palette.inkMuted, ...Type.subhead, marginTop: 2 },
  valueRow: { alignItems: 'baseline', flexDirection: 'row', gap: 4, marginTop: Spacing.two },
  value: { color: Palette.ink, ...Type.display },
  unit: { color: Palette.inkMuted, ...Type.body, fontWeight: '500' },
  body: { color: Palette.inkMuted, ...Type.subhead, marginTop: Spacing.three },
  cardAction: { marginTop: Spacing.four },
  action: { marginTop: Spacing.five },
  footnote: { color: Palette.inkMuted, ...Type.footnote, marginHorizontal: Spacing.four, marginTop: Spacing.three },
  sample: { color: Palette.inkFaint, ...Type.caption, marginTop: Spacing.six, textAlign: 'center' },
});
