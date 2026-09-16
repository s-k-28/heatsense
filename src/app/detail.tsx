import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { HeatIcon } from '@/components/heat-icon';
import { Fonts, MaxContentWidth, Palette, Radius, Spacing } from '@/constants/theme';

const icons = {
  alert: { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
  arrow: { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' },
  check: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  clock: { ios: 'clock.fill', android: 'schedule', web: 'schedule' },
  droplet: { ios: 'drop.fill', android: 'water_drop', web: 'water_drop' },
  location: { ios: 'location.fill', android: 'location_on', web: 'location_on' },
  movement: { ios: 'figure.run', android: 'directions_run', web: 'directions_run' },
  phone: { ios: 'phone.fill', android: 'call', web: 'call' },
  sun: { ios: 'sun.max.fill', android: 'sunny', web: 'sunny' },
  thermometer: { ios: 'thermometer.medium', android: 'device_thermostat', web: 'device_thermostat' },
} as const;

type DetailKind = 'alert' | 'athlete' | 'session';
type IconName = ComponentProps<typeof HeatIcon>['name'];

export default function DetailScreen() {
  const params = useLocalSearchParams<{ kind?: string; name?: string; title?: string }>();
  const kind: DetailKind = params.kind === 'alert' || params.kind === 'session' ? params.kind : 'athlete';

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.shell}>
          <DetailHeader />
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {kind === 'alert' ? <AlertDetail /> : kind === 'session' ? <SessionDetail title={params.title} /> : <AthleteDetail name={params.name} />}
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

function DetailHeader() {
  return (
    <View style={styles.header}>
      <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
        <HeatIcon name={icons.arrow} size={19} tintColor={Palette.ink} />
      </Pressable>
      <Text style={styles.headerTitle}>HeatSense</Text>
      <View style={styles.headerSpacer} />
    </View>
  );
}

function AthleteDetail({ name = 'Maya Chen' }: { name?: string }) {
  return (
    <>
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.pageTitle}>{name}</Text>
          <Text style={styles.pageMeta}>Varsity soccer · Field 2</Text>
        </View>
        <Status label="Review" tone={Palette.warning} />
      </View>

      <View style={styles.signalPanel}>
        <View style={styles.panelHeader}>
          <View><Text style={styles.metricLabel}>Heart-rate recovery</Text><Text style={styles.metricValue}>142 <Text style={styles.metricUnit}>bpm</Text></Text></View>
          <Text style={styles.elapsed}>6 min into break</Text>
        </View>
        <SignalChart color={Palette.coral} />
        <View style={styles.chartLabels}><Text style={styles.chartLabel}>Break started</Text><Text style={styles.chartLabel}>Now</Text></View>
        <Text style={styles.interpretation}>Recovery is slower than Maya’s usual range while movement remains low.</Text>
      </View>

      <SectionTitle title="Signal context" />
      <View style={styles.flatMetrics}>
        <MetricRow icon={icons.thermometer} label="Skin trend" tone={Palette.warning} value="+0.8°F / 5m" />
        <MetricRow icon={icons.droplet} label="Sweat trend" tone="#547A8C" value="+11%" />
        <MetricRow icon={icons.movement} label="Movement" tone={Palette.safe} value="Low" />
      </View>

      <SectionTitle title="Recent checkpoints" />
      <TimelineRow detail="Entered scheduled recovery break" label="Break started" time="2:08 PM" tone={Palette.safe} />
      <TimelineRow detail="Heart rate remained above personal range" label="Review triggered" time="2:14 PM" tone={Palette.warning} />
      <PrimaryAction icon={icons.location} label="Locate and check on Maya" />
      <Text style={styles.disclaimer}>Personal signals support a coach or athletic trainer’s evaluation. They do not diagnose heat illness.</Text>
    </>
  );
}

function AlertDetail() {
  return (
    <>
      <LinearGradient colors={['#C84433', '#E56B52']} style={styles.alertHero}>
        <View style={styles.alertTopline}>
          <HeatIcon name={icons.alert} size={25} tintColor={Palette.surface} />
          <Text style={styles.alertTime}>Sent 2:14 PM</Text>
        </View>
        <Text style={styles.alertTitle}>Recovery check needed</Text>
        <Text style={styles.alertName}>Maya Chen · Field 2</Text>
        <Text style={styles.alertBody}>Heart rate did not recover during a low-movement break while skin temperature continued to rise.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/dashboard?role=coach&tab=alerts&state=alert-acknowledged')} style={({ pressed }) => [styles.alertAction, pressed && styles.pressed]}>
          <HeatIcon name={icons.location} size={18} tintColor={Palette.emergency} />
          <Text style={styles.alertActionText}>Acknowledge and locate</Text>
        </Pressable>
      </LinearGradient>

      <SectionTitle title="Why HeatSense flagged this" />
      <View style={styles.reasonList}>
        <ReasonRow label="HR recovery" value="142 bpm after 6 min" />
        <ReasonRow label="Skin trend" value="Rising +0.8°F / 5m" />
        <ReasonRow label="Movement" value="Low during break" />
      </View>

      <SectionTitle title="Response" />
      <ResponseStep index="1" title="Find and assess the athlete" body="Use direct observation and follow the school emergency action plan." />
      <ResponseStep index="2" title="Move to shade and cool" body="Stop activity. Provide water only when appropriate and the athlete is alert." />
      <ResponseStep index="3" title="Escalate urgent symptoms" body="Collapse, confusion, or suspected heat stroke requires immediate emergency response." last />
      <View style={styles.contactRow}><HeatIcon name={icons.phone} size={19} tintColor={Palette.emergency} /><Text style={styles.contactText}>Emergency contacts and district EAP</Text></View>
    </>
  );
}

function SessionDetail({ title = 'Varsity conditioning' }: { title?: string }) {
  return (
    <>
      <Text style={styles.pageTitle}>{title}</Text>
      <Text style={styles.pageMeta}>September 15 · 4:10–5:22 PM · Memorial Stadium</Text>

      <LinearGradient colors={['#F29A72', '#F8C596', '#FFF2D9']} style={styles.sessionHero}>
        <View style={styles.sessionTopline}><Text style={styles.sessionHeroLabel}>Peak field condition</Text><HeatIcon name={icons.sun} size={21} tintColor={Palette.ink} /></View>
        <View style={styles.sessionMetric}><Text style={styles.sessionValue}>84</Text><Text style={styles.sessionUnit}>°F WBGT</Text></View>
        <Text style={styles.sessionZone}>Orange zone · 38 minutes</Text>
        <View style={styles.sessionRule} />
        <Text style={styles.sessionGuidance}>The practice used 20-minute work blocks with 10-minute recovery breaks.</Text>
      </LinearGradient>

      <SectionTitle title="Recovery pattern" />
      <View style={styles.recoverySection}>
        <View style={styles.recoveryTopline}><Text style={styles.recoveryValue}>8 min</Text><Status label="Within baseline" tone={Palette.safe} /></View>
        <SignalChart color={Palette.coral} stable />
        <View style={styles.chartLabels}><Text style={styles.chartLabel}>First break</Text><Text style={styles.chartLabel}>Final break</Text></View>
      </View>

      <View style={styles.sessionSummary}>
        <SummaryMetric label="Duration" value="72 min" />
        <SummaryMetric label="Water breaks" value="6" />
        <SummaryMetric label="Alerts" value="0" />
      </View>

      <SectionTitle title="Condition changes" />
      <TimelineRow detail="Practice plan began in Yellow" label="Session started" time="4:10 PM" tone={Palette.caution} />
      <TimelineRow detail="Work and rest schedule adjusted" label="Orange zone" time="4:34 PM" tone={Palette.warning} />
      <TimelineRow detail="All scheduled recovery checks complete" label="Session ended" time="5:22 PM" tone={Palette.safe} />
    </>
  );
}

function SignalChart({ color, stable }: { color: string; stable?: boolean }) {
  const path = stable
    ? 'M3 55 C33 47, 57 53, 82 44 S124 38, 153 48 S191 60, 218 50 S257 42, 284 49 S317 53, 337 45'
    : 'M3 28 C35 22, 57 17, 82 31 S119 61, 146 48 S182 35, 207 52 S244 73, 270 59 S308 45, 337 55';
  return <View style={styles.chart}><Svg height="100%" viewBox="0 0 340 90" width="100%"><Path d={path} fill="none" stroke={color} strokeLinecap="round" strokeWidth="4" /><Circle cx="337" cy={stable ? '45' : '55'} fill={Palette.surface} r="7" stroke={color} strokeWidth="4" /></Svg></View>;
}

function SectionTitle({ title }: { title: string }) { return <Text style={styles.sectionTitle}>{title}</Text>; }

function Status({ label, tone }: { label: string; tone: string }) { return <View style={[styles.status, { backgroundColor: `${tone}16` }]}><View style={[styles.statusDot, { backgroundColor: tone }]} /><Text style={[styles.statusText, { color: tone }]}>{label}</Text></View>; }

function MetricRow({ icon, label, tone, value }: { icon: IconName; label: string; tone: string; value: string }) { return <View style={styles.metricRow}><HeatIcon name={icon} size={19} tintColor={tone} /><Text style={styles.metricRowLabel}>{label}</Text><Text style={styles.metricRowValue}>{value}</Text></View>; }

function TimelineRow({ detail, label, time, tone }: { detail: string; label: string; time: string; tone: string }) { return <View style={styles.timelineRow}><View style={[styles.timelineDot, { backgroundColor: tone }]} /><View style={styles.flexOne}><Text style={styles.timelineLabel}>{label}</Text><Text style={styles.timelineDetail}>{detail}</Text></View><Text style={styles.timelineTime}>{time}</Text></View>; }

function PrimaryAction({ icon, label }: { icon: typeof icons.location; label: string }) { return <Pressable accessibilityRole="button" style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}><Text style={styles.primaryActionText}>{label}</Text><HeatIcon name={icon} size={18} tintColor={Palette.surface} /></Pressable>; }

function ReasonRow({ label, value }: { label: string; value: string }) { return <View style={styles.reasonRow}><Text style={styles.reasonLabel}>{label}</Text><Text style={styles.reasonValue}>{value}</Text></View>; }

function ResponseStep({ body, index, last, title }: { body: string; index: string; last?: boolean; title: string }) { return <View style={styles.responseRow}><Text style={styles.responseIndex}>{index}</Text><View style={[styles.flexOne, !last && styles.responseCopy]}><Text style={styles.responseTitle}>{title}</Text><Text style={styles.responseBody}>{body}</Text></View></View>; }

function SummaryMetric({ label, value }: { label: string; value: string }) { return <View style={styles.summaryMetric}><Text style={styles.summaryValue}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View>; }

const styles = StyleSheet.create({
  screen: { backgroundColor: Palette.canvas, flex: 1 },
  safeArea: { flex: 1 },
  shell: { alignSelf: 'center', flex: 1, maxWidth: MaxContentWidth, paddingHorizontal: Spacing.five, width: '100%' },
  scrollContent: { paddingBottom: Spacing.eight, paddingTop: Spacing.three },
  flexOne: { flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 58 },
  backButton: { alignItems: 'center', backgroundColor: Palette.surface, borderColor: Palette.border, borderRadius: 22, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  headerTitle: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 14 },
  headerSpacer: { width: 44 },
  titleRow: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between' },
  pageTitle: { color: Palette.ink, fontFamily: Fonts.extrabold, fontSize: 31, letterSpacing: -1, lineHeight: 37 },
  pageMeta: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 10, lineHeight: 15, marginTop: 4 },
  status: { alignItems: 'center', borderRadius: Radius.pill, flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingVertical: 7 },
  statusDot: { borderRadius: 4, height: 7, width: 7 },
  statusText: { fontFamily: Fonts.bold, fontSize: 9 },
  signalPanel: { backgroundColor: Palette.surface, borderColor: Palette.border, borderRadius: Radius.large, borderWidth: 1, marginTop: Spacing.five, padding: Spacing.five },
  panelHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  metricLabel: { color: Palette.inkMuted, fontFamily: Fonts.semibold, fontSize: 11 },
  metricValue: { color: Palette.ink, fontFamily: Fonts.extrabold, fontSize: 38, letterSpacing: -1.5, marginTop: 4 },
  metricUnit: { color: Palette.inkMuted, fontFamily: Fonts.bold, fontSize: 11 },
  elapsed: { color: Palette.warning, fontFamily: Fonts.bold, fontSize: 9 },
  chart: { height: 120, marginTop: Spacing.two },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  chartLabel: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 9 },
  interpretation: { borderTopColor: Palette.border, borderTopWidth: StyleSheet.hairlineWidth, color: Palette.ink, fontFamily: Fonts.medium, fontSize: 11, lineHeight: 17, marginTop: Spacing.four, paddingTop: Spacing.four },
  sectionTitle: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 18, marginBottom: Spacing.three, marginTop: Spacing.six },
  flatMetrics: { borderBottomColor: Palette.border, borderBottomWidth: 1, borderTopColor: Palette.border, borderTopWidth: 1 },
  metricRow: { alignItems: 'center', borderBottomColor: Palette.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: Spacing.three, minHeight: 62 },
  metricRowLabel: { color: Palette.inkMuted, flex: 1, fontFamily: Fonts.semibold, fontSize: 11 },
  metricRowValue: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 12 },
  timelineRow: { alignItems: 'center', borderBottomColor: Palette.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: Spacing.three, minHeight: 72 },
  timelineDot: { borderRadius: 5, height: 10, width: 10 },
  timelineLabel: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 12 },
  timelineDetail: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 9, lineHeight: 13, marginTop: 2 },
  timelineTime: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 9 },
  primaryAction: { alignItems: 'center', backgroundColor: Palette.ink, borderRadius: Radius.pill, flexDirection: 'row', gap: Spacing.two, justifyContent: 'center', marginTop: Spacing.five, minHeight: 52 },
  primaryActionText: { color: Palette.surface, fontFamily: Fonts.bold, fontSize: 13 },
  disclaimer: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 9, lineHeight: 14, marginTop: Spacing.three, textAlign: 'center' },
  alertHero: { borderRadius: Radius.large, padding: Spacing.five },
  alertTopline: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  alertTime: { color: 'rgba(255,253,248,0.82)', fontFamily: Fonts.semibold, fontSize: 10 },
  alertTitle: { color: Palette.surface, fontFamily: Fonts.extrabold, fontSize: 29, letterSpacing: -0.8, lineHeight: 34, marginTop: Spacing.six },
  alertName: { color: Palette.surface, fontFamily: Fonts.bold, fontSize: 14, marginTop: Spacing.three },
  alertBody: { color: 'rgba(255,253,248,0.84)', fontFamily: Fonts.medium, fontSize: 11, lineHeight: 17, marginTop: Spacing.two },
  alertAction: { alignItems: 'center', backgroundColor: Palette.surface, borderRadius: Radius.pill, flexDirection: 'row', gap: Spacing.two, justifyContent: 'center', marginTop: Spacing.five, minHeight: 50 },
  alertActionText: { color: Palette.emergency, fontFamily: Fonts.bold, fontSize: 13 },
  reasonList: { borderBottomColor: Palette.border, borderBottomWidth: 1, borderTopColor: Palette.border, borderTopWidth: 1 },
  reasonRow: { alignItems: 'center', borderBottomColor: Palette.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', minHeight: 57 },
  reasonLabel: { color: Palette.inkMuted, fontFamily: Fonts.semibold, fontSize: 11 },
  reasonValue: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 11 },
  responseRow: { alignItems: 'flex-start', flexDirection: 'row', gap: Spacing.three },
  responseIndex: { color: Palette.emergency, fontFamily: Fonts.extrabold, fontSize: 19, textAlign: 'center', width: 24 },
  responseCopy: { borderBottomColor: Palette.border, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: Spacing.four, paddingBottom: Spacing.four },
  responseTitle: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 13 },
  responseBody: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 10, lineHeight: 15, marginTop: 3 },
  contactRow: { alignItems: 'center', backgroundColor: '#FBE4DE', borderRadius: Radius.medium, flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.five, padding: Spacing.four },
  contactText: { color: Palette.emergency, fontFamily: Fonts.bold, fontSize: 11 },
  sessionHero: { borderRadius: Radius.large, marginTop: Spacing.five, minHeight: 285, padding: Spacing.five },
  sessionTopline: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sessionHeroLabel: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 11 },
  sessionMetric: { alignItems: 'baseline', flexDirection: 'row', marginTop: Spacing.five },
  sessionValue: { color: Palette.ink, fontFamily: Fonts.extrabold, fontSize: 70, letterSpacing: -4 },
  sessionUnit: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 12, marginLeft: 7 },
  sessionZone: { color: Palette.ink, fontFamily: Fonts.extrabold, fontSize: 19, marginTop: 'auto' },
  sessionRule: { backgroundColor: 'rgba(27,28,25,0.15)', height: 1, marginTop: Spacing.three },
  sessionGuidance: { color: 'rgba(27,28,25,0.74)', fontFamily: Fonts.medium, fontSize: 10, lineHeight: 15, marginTop: Spacing.three },
  recoverySection: { borderBottomColor: Palette.border, borderBottomWidth: 1, paddingBottom: Spacing.four },
  recoveryTopline: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  recoveryValue: { color: Palette.ink, fontFamily: Fonts.extrabold, fontSize: 30 },
  sessionSummary: { borderBottomColor: Palette.border, borderBottomWidth: 1, borderTopColor: Palette.border, borderTopWidth: 1, flexDirection: 'row', marginTop: Spacing.five },
  summaryMetric: { flex: 1, paddingVertical: Spacing.four },
  summaryValue: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 15 },
  summaryLabel: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 9, marginTop: 2 },
  pressed: { opacity: 0.68 },
});
