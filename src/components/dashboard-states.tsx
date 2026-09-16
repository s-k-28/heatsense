import { LinearGradient } from 'expo-linear-gradient';
import { type ComponentProps, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { ScreenIntro, SectionHeader } from '@/components/dashboard-shell';
import { HeatIcon } from '@/components/heat-icon';
import { Fonts, Palette, Radius, Spacing } from '@/constants/theme';

const icons = {
  alert: { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
  arrow: { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' },
  band: { ios: 'applewatch', android: 'watch', web: 'watch' },
  check: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  cloud: { ios: 'wifi.exclamationmark', android: 'wifi_off', web: 'wifi_off' },
  people: { ios: 'person.3.fill', android: 'groups', web: 'groups' },
  plus: { ios: 'plus', android: 'add', web: 'add' },
  shield: { ios: 'lock.shield.fill', android: 'privacy_tip', web: 'privacy_tip' },
} as const;

export type DashboardReviewState = 'weather-stale' | 'empty-team' | 'pairing' | 'no-band' | 'alert-acknowledged';

export function DashboardState({ state }: { state: DashboardReviewState }) {
  if (state === 'weather-stale') return <WeatherStaleState />;
  if (state === 'empty-team') return <EmptyTeamState />;
  if (state === 'pairing') return <PairingState />;
  if (state === 'no-band') return <NoBandState />;
  return <AlertAcknowledgedState />;
}

function WeatherStaleState() {
  return (
    <>
      <ScreenIntro title="Weather data needs a refresh." />
      <Text style={styles.introBody}>HeatSense will not calculate a new practice zone until the latest field conditions are available.</Text>
      <LinearGradient colors={['#ECE5D6', '#F8F3E8']} style={styles.weatherPanel}>
        <View style={styles.panelTopline}>
          <View style={styles.stalePill}><HeatIcon name={icons.cloud} size={15} tintColor={Palette.warning} /><Text style={styles.staleText}>Last update 28 min ago</Text></View>
          <Text style={styles.mutedLabel}>Frisco, Texas</Text>
        </View>
        <Text style={styles.weatherValue}>84</Text>
        <Text style={styles.weatherUnit}>Last WBGT reading · not current guidance</Text>
        <View style={styles.weatherRule} />
        <Text style={styles.weatherInstruction}>Use the school’s backup measurement process before practice.</Text>
      </LinearGradient>
      <PrimaryAction icon={icons.arrow} label="Try weather update again" />
      <Text style={styles.supportText}>If data remains unavailable, follow district procedures and record a local WBGT measurement.</Text>
    </>
  );
}

function EmptyTeamState() {
  return (
    <>
      <ScreenIntro title="Build your team roster." />
      <Text style={styles.introBody}>The field plan works now. Add athletes when you are ready to share schedules and review optional wristband alerts.</Text>
      <View style={styles.invitePanel}>
        <View style={styles.panelTopline}><Text style={styles.mutedLabel}>Liberty varsity soccer</Text><HeatIcon name={icons.people} size={22} tintColor={Palette.coralDark} /></View>
        <Text style={styles.inviteLabel}>Team invite code</Text>
        <Text style={styles.inviteCode}>HEAT 284</Text>
        <Text style={styles.inviteDetail}>Share this code with athletes and approved staff.</Text>
      </View>
      <SectionHeader title="Roster checklist" />
      <View style={styles.flatList}>
        <ChecklistRow label="Confirm the team schedule" complete />
        <ChecklistRow label="Add coaching and training staff" />
        <ChecklistRow label="Invite athletes" />
      </View>
      <PrimaryAction icon={icons.plus} label="Add the first athlete" />
    </>
  );
}

function PairingState() {
  const progress = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    progress.value = reduceMotion ? 0.55 : withRepeat(withTiming(1, { duration: 1500 }), -1, false);
  }, [progress, reduceMotion]);

  const outerRing = useAnimatedStyle(() => ({ opacity: 0.32 - progress.value * 0.24, transform: [{ scale: 0.82 + progress.value * 0.38 }] }));
  const innerRing = useAnimatedStyle(() => ({ opacity: 0.42 - progress.value * 0.2, transform: [{ scale: 0.92 + progress.value * 0.2 }] }));

  return (
    <>
      <ScreenIntro title="Pair a HeatSense Band." />
      <Text style={styles.introBody}>Keep the band close to this phone. Pairing adds personal trends; the team’s WBGT plan works without it.</Text>
      <View style={styles.pairingStage}>
        <Animated.View style={[styles.pairingRingOuter, outerRing]} />
        <Animated.View style={[styles.pairingRingInner, innerRing]} />
        <View style={styles.watchCore}><HeatIcon name={icons.band} size={58} tintColor={Palette.safe} /></View>
        <Text style={styles.scanningLabel}>Searching nearby</Text>
      </View>
      <View style={styles.deviceRow}>
        <HeatIcon name={icons.band} size={24} tintColor={Palette.ink} />
        <View style={styles.flexOne}><Text style={styles.deviceTitle}>HeatSense Band 02A7</Text><Text style={styles.deviceDetail}>Nearby · ready to pair</Text></View>
        <View style={styles.nearbyDot} />
      </View>
      <View style={styles.privacyRow}><HeatIcon name={icons.shield} size={19} tintColor={Palette.safe} /><Text style={styles.privacyText}>Pairing does not make the band a medical device. Sharing stays under your control.</Text></View>
      <PrimaryAction icon={icons.band} label="Pair this band" />
    </>
  );
}

function NoBandState() {
  return (
    <>
      <ScreenIntro title="Your practice plan is ready." />
      <Text style={styles.introBody}>No wristband is connected. You still receive the complete team-wide WBGT plan.</Text>
      <LinearGradient colors={['#F5A052', '#FFD28A', '#FFF7E8']} style={styles.noBandHero}>
        <Text style={styles.mutedLabel}>Today’s field condition</Text>
        <View style={styles.noBandMetric}><Text style={styles.noBandValue}>84</Text><Text style={styles.noBandUnit}>°F WBGT</Text></View>
        <Text style={styles.noBandZone}>Orange zone</Text>
        <Text style={styles.noBandGuidance}>Follow today’s scheduled work, rest, water, and equipment adjustments.</Text>
      </LinearGradient>
      <View style={styles.optionalBandRow}>
        <HeatIcon name={icons.band} size={25} tintColor={Palette.inkMuted} />
        <View style={styles.flexOne}><Text style={styles.deviceTitle}>Personal signals are off</Text><Text style={styles.deviceDetail}>Pair later to add recovery, skin, sweat, and movement trends.</Text></View>
      </View>
      <PrimaryAction icon={icons.band} label="Pair a band later" secondary />
    </>
  );
}

function AlertAcknowledgedState() {
  return (
    <>
      <ScreenIntro title="Alert acknowledged." />
      <View style={styles.ackBanner}>
        <HeatIcon name={icons.check} size={30} tintColor={Palette.safe} />
        <View style={styles.flexOne}>
          <Text style={styles.ackTitle}>Coach Rivera is responding</Text>
          <Text style={styles.ackBody}>Acknowledged at 2:15 PM. The alert stays open until follow-up is recorded.</Text>
        </View>
      </View>
      <View style={styles.incidentSummary}>
        <View>
          <Text style={styles.incidentName}>Maya Chen</Text>
          <Text style={styles.deviceDetail}>Varsity soccer · Field 2</Text>
        </View>
        <View style={styles.warningStatus}><Text style={styles.warningStatusText}>Warning</Text></View>
      </View>
      <SectionHeader title="Response timeline" />
      <View style={styles.flatList}>
        <TimelineRow detail="Recovery stalled while movement stayed low" label="Warning sent" time="2:14 PM" />
        <TimelineRow detail="Coach Rivera opened the alert" label="Acknowledged" time="2:15 PM" />
        <TimelineRow detail="Record hydration, cooling, and disposition" label="Follow-up pending" time="Now" pending />
      </View>
      <PrimaryAction icon={icons.check} label="Document follow-up" />
    </>
  );
}

function PrimaryAction({ icon, label, secondary }: { icon: ComponentProps<typeof HeatIcon>['name']; label: string; secondary?: boolean }) {
  return (
    <Pressable accessibilityRole="button" style={({ pressed }) => [styles.primaryAction, secondary && styles.primaryActionSecondary, pressed && styles.pressed]}>
      <Text style={[styles.primaryActionText, secondary && styles.primaryActionTextSecondary]}>{label}</Text>
      <HeatIcon name={icon} size={18} tintColor={secondary ? Palette.ink : Palette.surface} />
    </Pressable>
  );
}

function ChecklistRow({ complete, label }: { complete?: boolean; label: string }) {
  return <View style={styles.checklistRow}><View style={[styles.checkCircle, complete && styles.checkCircleComplete]}>{complete ? <HeatIcon name={icons.check} size={14} tintColor={Palette.surface} /> : null}</View><Text style={styles.checklistLabel}>{label}</Text></View>;
}

function TimelineRow({ detail, label, pending, time }: { detail: string; label: string; pending?: boolean; time: string }) {
  return <View style={styles.timelineRow}><View style={[styles.timelineMarker, pending && styles.timelineMarkerPending]} /><View style={styles.flexOne}><Text style={styles.deviceTitle}>{label}</Text><Text style={styles.deviceDetail}>{detail}</Text></View><Text style={styles.timelineTime}>{time}</Text></View>;
}

const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  introBody: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 12, lineHeight: 18, marginTop: Spacing.three, maxWidth: 380 },
  weatherPanel: { borderRadius: Radius.large, marginTop: Spacing.five, minHeight: 300, padding: Spacing.five },
  panelTopline: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  stalePill: { alignItems: 'center', backgroundColor: 'rgba(255,253,248,0.7)', borderRadius: Radius.pill, flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingVertical: 7 },
  staleText: { color: Palette.warning, fontFamily: Fonts.bold, fontSize: 9 },
  mutedLabel: { color: 'rgba(27,28,25,0.66)', fontFamily: Fonts.semibold, fontSize: 10 },
  weatherValue: { color: Palette.inkMuted, fontFamily: Fonts.extrabold, fontSize: 80, letterSpacing: -5, lineHeight: 86, marginTop: Spacing.five },
  weatherUnit: { color: Palette.inkMuted, fontFamily: Fonts.semibold, fontSize: 11 },
  weatherRule: { backgroundColor: 'rgba(27,28,25,0.16)', height: 1, marginTop: 'auto' },
  weatherInstruction: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 13, lineHeight: 18, marginTop: Spacing.four, maxWidth: 300 },
  supportText: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 10, lineHeight: 15, marginTop: Spacing.three, paddingHorizontal: Spacing.two, textAlign: 'center' },
  invitePanel: { backgroundColor: Palette.surface, borderColor: Palette.border, borderRadius: Radius.large, borderWidth: 1, marginTop: Spacing.five, padding: Spacing.five },
  inviteLabel: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 10, marginTop: Spacing.five },
  inviteCode: { color: Palette.ink, fontFamily: Fonts.extrabold, fontSize: 35, letterSpacing: 2, marginTop: 3 },
  inviteDetail: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 10, marginTop: 3 },
  flatList: { borderBottomColor: Palette.border, borderBottomWidth: 1, borderTopColor: Palette.border, borderTopWidth: 1 },
  checklistRow: { alignItems: 'center', borderBottomColor: Palette.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: Spacing.three, minHeight: 62 },
  checkCircle: { borderColor: Palette.border, borderRadius: 10, borderWidth: 1, height: 20, width: 20 },
  checkCircleComplete: { alignItems: 'center', backgroundColor: Palette.safe, borderColor: Palette.safe, justifyContent: 'center' },
  checklistLabel: { color: Palette.ink, fontFamily: Fonts.semibold, fontSize: 12 },
  pairingStage: { alignItems: 'center', height: 260, justifyContent: 'center', marginTop: Spacing.four },
  pairingRingOuter: { borderColor: '#9CCDB7', borderRadius: 100, borderWidth: 1, height: 200, position: 'absolute', width: 200 },
  pairingRingInner: { borderColor: '#75B99C', borderRadius: 75, borderWidth: 1, height: 150, position: 'absolute', width: 150 },
  watchCore: { alignItems: 'center', backgroundColor: '#E5F0E9', borderRadius: 55, height: 110, justifyContent: 'center', width: 110 },
  scanningLabel: { bottom: 5, color: Palette.inkMuted, fontFamily: Fonts.semibold, fontSize: 10, position: 'absolute' },
  deviceRow: { alignItems: 'center', backgroundColor: Palette.surface, borderColor: Palette.border, borderRadius: Radius.medium, borderWidth: 1, flexDirection: 'row', gap: Spacing.three, minHeight: 76, paddingHorizontal: Spacing.four },
  deviceTitle: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 12 },
  deviceDetail: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 9, lineHeight: 13, marginTop: 3 },
  nearbyDot: { backgroundColor: Palette.safe, borderRadius: 5, height: 10, width: 10 },
  privacyRow: { alignItems: 'flex-start', flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.four, paddingHorizontal: Spacing.two },
  privacyText: { color: Palette.inkMuted, flex: 1, fontFamily: Fonts.medium, fontSize: 10, lineHeight: 15 },
  noBandHero: { borderRadius: Radius.large, marginTop: Spacing.five, minHeight: 300, padding: Spacing.five },
  noBandMetric: { alignItems: 'baseline', flexDirection: 'row', marginTop: Spacing.five },
  noBandValue: { color: Palette.ink, fontFamily: Fonts.extrabold, fontSize: 76, letterSpacing: -4 },
  noBandUnit: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 12, marginLeft: 7 },
  noBandZone: { color: Palette.ink, fontFamily: Fonts.extrabold, fontSize: 24, marginTop: 'auto' },
  noBandGuidance: { color: 'rgba(27,28,25,0.76)', fontFamily: Fonts.medium, fontSize: 11, lineHeight: 16, marginTop: Spacing.two, maxWidth: 300 },
  optionalBandRow: { alignItems: 'center', borderBottomColor: Palette.border, borderBottomWidth: 1, borderTopColor: Palette.border, borderTopWidth: 1, flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.five, minHeight: 78, paddingHorizontal: Spacing.two },
  ackBanner: { alignItems: 'flex-start', backgroundColor: '#E4EFE8', borderRadius: Radius.medium, flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.five, padding: Spacing.four },
  ackTitle: { color: Palette.ink, fontFamily: Fonts.extrabold, fontSize: 15 },
  ackBody: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 10, lineHeight: 15, marginTop: 3 },
  incidentSummary: { alignItems: 'center', borderBottomColor: Palette.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.five, paddingBottom: Spacing.four, paddingHorizontal: Spacing.two },
  incidentName: { color: Palette.ink, fontFamily: Fonts.extrabold, fontSize: 16 },
  warningStatus: { backgroundColor: '#FFF0DE', borderRadius: Radius.pill, paddingHorizontal: 11, paddingVertical: 6 },
  warningStatusText: { color: Palette.warning, fontFamily: Fonts.bold, fontSize: 9 },
  timelineRow: { alignItems: 'center', borderBottomColor: Palette.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: Spacing.three, minHeight: 72 },
  timelineMarker: { backgroundColor: Palette.safe, borderRadius: 5, height: 10, width: 10 },
  timelineMarkerPending: { backgroundColor: Palette.caution },
  timelineTime: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 9 },
  primaryAction: { alignItems: 'center', backgroundColor: Palette.ink, borderRadius: Radius.pill, flexDirection: 'row', gap: Spacing.two, justifyContent: 'center', marginTop: Spacing.five, minHeight: 52 },
  primaryActionSecondary: { backgroundColor: Palette.surface, borderColor: Palette.border, borderWidth: 1 },
  primaryActionText: { color: Palette.surface, fontFamily: Fonts.bold, fontSize: 13 },
  primaryActionTextSecondary: { color: Palette.ink },
  pressed: { opacity: 0.7 },
});
