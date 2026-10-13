import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';

import { ScreenIntro, SectionHeader, type DashboardRole } from '@/components/dashboard-shell';
import { HeatIcon } from '@/components/heat-icon';
import { HeatSenseMascot } from '@/components/heatsense-mascot';
import { DepthButton } from '@/components/ui/depth-button';
import { Fonts, Palette, Radius, Spacing } from '@/constants/theme';

type IconName = ComponentProps<typeof HeatIcon>['name'];

const icons = {
  alert: { ios: 'bell.badge.fill', android: 'notifications_active', web: 'notifications_active' },
  arrow: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  band: { ios: 'applewatch', android: 'watch', web: 'watch' },
  book: { ios: 'book.closed.fill', android: 'menu_book', web: 'menu_book' },
  check: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  clock: { ios: 'clock.fill', android: 'schedule', web: 'schedule' },
  droplet: { ios: 'drop.fill', android: 'water_drop', web: 'water_drop' },
  equipment: { ios: 'tshirt.fill', android: 'checkroom', web: 'checkroom' },
  heart: { ios: 'heart.fill', android: 'favorite', web: 'favorite' },
  location: { ios: 'location.fill', android: 'location_on', web: 'location_on' },
  movement: { ios: 'figure.run', android: 'directions_run', web: 'directions_run' },
  medical: { ios: 'cross.case.fill', android: 'medical_services', web: 'medical_services' },
  people: { ios: 'person.3.fill', android: 'groups', web: 'groups' },
  phone: { ios: 'phone.fill', android: 'call', web: 'call' },
  privacy: { ios: 'lock.shield.fill', android: 'privacy_tip', web: 'privacy_tip' },
  recovery: { ios: 'waveform.path.ecg', android: 'monitor_heart', web: 'monitor_heart' },
  school: { ios: 'building.2.fill', android: 'school', web: 'school' },
  sun: { ios: 'sun.max.fill', android: 'sunny', web: 'sunny' },
  thermometer: { ios: 'thermometer.medium', android: 'device_thermostat', web: 'device_thermostat' },
  warning: { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
} as const;

const roster = [
  { name: 'Maya Chen', detail: 'Recovery stalled · 6 min', status: 'Review', tone: Palette.warning },
  { name: 'Jordan Lee', detail: 'Hydration break acknowledged', status: 'Caution', tone: Palette.caution },
  { name: 'Avery Davis', detail: 'Signals within baseline', status: 'Normal', tone: Palette.safe },
  { name: 'Sofia Patel', detail: 'Break completed · 2 min ago', status: 'Normal', tone: Palette.safe },
  { name: 'Noah Williams', detail: 'No wristband · field plan only', status: 'Normal', tone: Palette.safe },
  { name: 'Eli Brooks', detail: 'Signals within baseline', status: 'Normal', tone: Palette.safe },
];

export function DashboardContent({ role, tab }: { role: DashboardRole; tab: string }) {
  if (role === 'coach') return <CoachContent tab={tab} />;
  if (role === 'trainer') return <TrainerContent tab={tab} />;
  return <AthleteContent tab={tab} />;
}

function CoachContent({ tab }: { tab: string }) {
  if (tab === 'plan') return <PracticePlanScreen />;
  if (tab === 'team') return <RosterScreen title="Team status" variant="coach" />;
  if (tab === 'alerts') return <AlertsScreen />;
  if (tab === 'profile') return <ProfileScreen role="Coach" />;
  return <CoachHome />;
}

function TrainerContent({ tab }: { tab: string }) {
  if (tab === 'monitor') return <MonitorScreen />;
  if (tab === 'athletes') return <RosterScreen title="Athletes to review" variant="trainer" />;
  if (tab === 'protocols') return <ProtocolsScreen />;
  if (tab === 'profile') return <ProfileScreen role="Athletic trainer" />;
  return <TrainerHome />;
}

function AthleteContent({ tab }: { tab: string }) {
  if (tab === 'status') return <AthleteStatusScreen />;
  if (tab === 'sessions') return <SessionsScreen />;
  if (tab === 'learn') return <LearnScreen />;
  if (tab === 'profile') return <ProfileScreen role="Athlete" />;
  return <AthleteHome />;
}

function CoachHome() {
  return (
    <>
      <ScreenIntro typed eyebrow="Today at practice" title="Practice is in the Orange zone." />
      <RiskHero mode="coach" />
      <SectionHeader action="Full plan" title="Today’s adjustments" />
      <View style={styles.ruleStrip}>
        <Rule icon={icons.clock} label="Work / rest" value="20 / 10 min" />
        <Rule icon={icons.droplet} label="Water" value="Every 10 min" />
        <Rule icon={icons.equipment} label="Equipment" value="Remove in breaks" />
      </View>
      <SectionHeader action="View team" title="Needs attention" />
      <View style={styles.listCard}>{roster.slice(0, 2).map((item) => <PersonRow key={item.name} {...item} />)}</View>
    </>
  );
}

function TrainerHome() {
  return (
    <>
      <ScreenIntro typed eyebrow="Review queue" title="Two athletes need review." />
      <View style={styles.triageCard}>
        <View style={styles.triageHeader}>
          <View style={styles.triageIcon}><HeatIcon name={icons.recovery} size={23} tintColor={Palette.surface} /></View>
          <View style={styles.flexOne}>
            <Text style={styles.triageLabel}>Current priority</Text>
            <Text style={styles.triageName}>Maya Chen</Text>
          </View>
          <StatusPill label="Warning" tone={Palette.warning} />
        </View>
        <Trend color={Palette.warning} variant="recovery" />
        <Text style={styles.triageSummary}>Heart rate remains elevated while movement is low during the water break.</Text>
        <View style={styles.triageMetrics}>
          <MiniMetric label="HR recovery" value="+24 bpm" />
          <MiniMetric label="Resting" value="6 min" />
          <MiniMetric label="Skin trend" value="+0.8°F" />
        </View>
      </View>
      <SectionHeader action="Open monitor" title="Review queue" />
      <View style={styles.listCard}>{roster.map((item) => <PersonRow key={item.name} {...item} />)}</View>
    </>
  );
}

function AthleteHome() {
  return (
    <>
      <View style={styles.greetingRow}>
        <View style={styles.flexOne}>
          <ScreenIntro typed eyebrow="Good afternoon" title="Hi, Maya." />
          <Text style={styles.contextLine}>Tuesday · Varsity practice at 4:10 PM</Text>
        </View>
        <HeatSenseMascot height={104} reaction={null} />
      </View>
      <View style={styles.bentoGrid}>
        <View style={styles.bentoPrimary}>
          <View style={styles.bentoTopline}>
            <Text style={styles.bentoLabel}>Field WBGT</Text>
            <HeatIcon name={icons.sun} size={21} tintColor={Palette.warning} />
          </View>
          <Text style={styles.bentoNumber}>84</Text>
          <Text style={styles.bentoZone}>Orange zone</Text>
          <Text style={styles.bentoHint}>Practice plan adjusted</Text>
        </View>
        <View style={styles.bentoStack}>
          <MetricTile icon={icons.droplet} label="Hydration" tone={Palette.info} value="2 breaks" />
          <MetricTile icon={icons.recovery} label="Recovery" tone={Palette.safe} value="On baseline" />
        </View>
      </View>
      <View style={styles.weeklyCard}>
        <View style={styles.weeklyHeader}>
          <View>
            <Text style={styles.cardLabel}>This week</Text>
            <Text style={styles.weeklyTitle}>Heat exposure</Text>
          </View>
          <Text style={styles.weeklyStatus}>Steady</Text>
        </View>
        <View style={styles.weekBars}>
          {[42, 66, 52, 78, 36, 61, 73].map((height, index) => (
            <View key={index} style={styles.weekBarSlot}>
              <View style={[styles.weekBar, { height }, index === 1 && styles.weekBarToday]} />
              <Text style={styles.weekDay}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</Text>
            </View>
          ))}
        </View>
      </View>
      <SectionHeader action="All sessions" title="Recent practice" />
      <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/detail', params: { kind: 'session' } })} style={({ pressed }) => [styles.sessionFeature, pressed && styles.pressed]}>
        <View style={styles.sessionIcon}><HeatIcon name={icons.movement} size={24} tintColor={Palette.ink} /></View>
        <View style={styles.flexOne}>
          <Text style={styles.sessionTitle}>Varsity conditioning</Text>
          <Text style={styles.sessionMeta}>Monday · 4:10–5:22 PM</Text>
        </View>
        <HeatIcon name={icons.arrow} size={17} tintColor={Palette.inkMuted} />
      </Pressable>
    </>
  );
}

export function RiskHero({ mode }: { mode: 'coach' }) {
  return (
    <View style={styles.riskHero}>
      <View style={styles.riskTopline}>
        <View>
          <Text style={styles.riskLocation}>Memorial Stadium · 4:10 PM</Text>
          <Text style={styles.riskSource}>Field reading · updated 2 min ago</Text>
        </View>
        <View style={styles.sunBubble}><HeatIcon name={icons.sun} size={22} tintColor={Palette.warning} /></View>
      </View>
      <View style={styles.riskMain}>
        <Text style={styles.riskNumber}>84</Text>
        <View style={styles.riskMainCopy}>
          <Text style={styles.riskUnit}>°F WBGT</Text>
          <Text style={styles.riskZone}>Orange zone</Text>
        </View>
      </View>
      <Text style={styles.riskMessage}>Modify work and rest intervals before athletes take the field.</Text>
      <Trend color={Palette.ink} compact />
    </View>
  );
}

function PracticePlanScreen() {
  return (
    <>
      <ScreenIntro eyebrow="Practice plan" title="Today’s varsity soccer plan" />
      <RiskHero mode="coach" />
      <SectionHeader title="Practice timeline" />
      <View style={styles.timelineCard}>
        <TimelineRow detail="Water available before warm-up" index={0} time="4:00" title="Arrival and baseline check" tone={Palette.safe} />
        <TimelineRow detail="Helmets and heavy equipment monitored" index={1} time="4:10" title="20-minute work block" tone={Palette.warning} />
        <TimelineRow detail="Shade, water, and athlete check" index={2} last time="4:30" title="10-minute recovery" tone={Palette.coralDark} />
      </View>
    </>
  );
}

function RosterScreen({
  title,
  variant,
}: {
  title: string;
  variant: 'coach' | 'trainer';
}) {
  const [filter, setFilter] = useState<'all' | 'attention' | 'normal'>(variant === 'trainer' ? 'attention' : 'all');
  const visibleRoster = roster.filter((item) => {
    if (filter === 'attention') return item.status !== 'Normal';
    if (filter === 'normal') return item.status === 'Normal';
    return true;
  });

  return (
    <>
      <ScreenIntro eyebrow="Live roster" title={title} />
      <Animated.View entering={FadeIn.duration(320)} style={styles.teamOverview}>
        <View style={styles.teamOverviewHeader}>
          <View>
            <Text style={styles.teamOverviewValue}>{variant === 'coach' ? '3 need follow-up' : '2 active reviews'}</Text>
            <Text style={styles.teamOverviewDetail}>{variant === 'coach' ? '21 athletes are within today’s plan' : 'Prioritized by recovery and movement context'}</Text>
          </View>
          <View style={styles.teamLivePill}><View style={styles.teamLiveDot} /><Text style={styles.teamLiveText}>Live</Text></View>
        </View>
        <View style={styles.distributionTrack}>
          <View style={[styles.distributionSegment, { backgroundColor: Palette.safe, flex: 21 }]} />
          <View style={[styles.distributionSegment, { backgroundColor: Palette.caution, flex: 2 }]} />
          <View style={[styles.distributionSegment, { backgroundColor: Palette.warning, flex: 1 }]} />
        </View>
        <View style={styles.distributionLegend}>
          <DistributionLabel label="Normal" tone={Palette.safe} value="21" />
          <DistributionLabel label="Caution" tone={Palette.caution} value="2" />
          <DistributionLabel label="Review" tone={Palette.warning} value="1" />
        </View>
      </Animated.View>
      <SectionHeader action={`${visibleRoster.length} shown`} title={variant === 'coach' ? 'Live roster' : 'Review queue'} />
      <View style={styles.filterRow}>
        <FilterChip active={filter === 'all'} label="All" onPress={() => setFilter('all')} />
        <FilterChip active={filter === 'attention'} label="Needs attention" onPress={() => setFilter('attention')} />
        <FilterChip active={filter === 'normal'} label="Normal" onPress={() => setFilter('normal')} />
      </View>
      <View style={styles.listCard}>
        {visibleRoster.map((item, i) => <PersonRow index={i} key={item.name} {...item} />)}
        {filter === 'all' ? <Text style={styles.rosterFooter}>Showing 6 of 24 athletes · sorted by risk</Text> : null}
      </View>
      <Text style={styles.disclaimer}>Individual wristband signals appear only for athletes who have paired a device and shared session data.</Text>
    </>
  );
}

function AlertsScreen() {
  return (
    <>
      <ScreenIntro eyebrow="Needs a response" title="Alerts" />
      <View style={styles.emergencyCard}>
        <View style={styles.emergencyTopline}>
          <HeatIcon name={icons.warning} size={24} tintColor={Palette.emergency} />
          <Text style={styles.emergencyTime}>Now</Text>
        </View>
        <Text style={styles.emergencyTitle}>Maya needs a recovery check.</Text>
        <Text style={styles.emergencyBody}>Elevated heart rate and rising skin trend continued through a low-movement break.</Text>
        <View style={styles.emergencyAction}><DepthButton label="Acknowledge and locate" onPress={() => router.push({ pathname: '/detail', params: { kind: 'alert' } })} /></View>
      </View>
      <SectionHeader title="Earlier today" />
      <View style={styles.historyStack}>
        <AlertHistoryRow detail="Jordan Lee · acknowledged" index={0} time="3:52 PM" title="Hydration reminder" tone={Palette.caution} />
        <AlertHistoryRow detail="Practice plan updated" index={1} time="3:35 PM" title="WBGT entered Orange zone" tone={Palette.warning} />
      </View>
    </>
  );
}

function MonitorScreen() {
  return (
    <>
      <ScreenIntro eyebrow="Live monitor" title="Maya’s live signals" />
      <Text style={styles.contextLine}>Optional wristband · compared with Maya’s personal baseline</Text>
      <View style={styles.monitorCard}>
        <View style={styles.monitorHeader}>
          <View><Text style={styles.cardLabel}>Heart-rate recovery</Text><Text style={styles.monitorValue}>142 <Text style={styles.monitorUnit}>bpm</Text></Text></View>
          <StatusPill label="Review" tone={Palette.warning} />
        </View>
        <Trend color={Palette.emergency} large leftLabel="Break started" rightLabel="Now" variant="recovery" />
        <TrendDots active={0} color={Palette.emergency} />
        <Text style={styles.monitorInterpretation}>Elevated for 6 minutes while movement remains low.</Text>
      </View>
      <SectionHeader title="Supporting context" />
      <View style={styles.metricGrid}>
        <SignalCard icon={icons.thermometer} index={0} label="Skin trend" tone={Palette.warning} value="+0.8°F" />
        <SignalCard icon={icons.droplet} index={1} label="Sweat trend" tone={Palette.info} value="+11%" />
        <SignalCard icon={icons.movement} index={2} label="Movement" tone={Palette.safe} value="Low" />
        <SignalCard icon={icons.clock} index={3} label="Break time" tone={Palette.coralDark} value="6 min" />
      </View>
      <Text style={styles.disclaimer}>Signals are compared with Maya’s own baseline and require human evaluation. HeatSense does not diagnose heat illness.</Text>
    </>
  );
}

function ProtocolsScreen() {
  const [protocol, setProtocol] = useState<'immediate' | 'recovery'>('immediate');
  const immediate = protocol === 'immediate';

  return (
    <>
      <ScreenIntro eyebrow="Quick reference" title="Response protocols" />
      <View style={styles.protocolEmergency}>
        <View style={styles.protocolEmergencyIcon}><HeatIcon name={icons.medical} size={22} tintColor={Palette.emergency} /></View>
        <View style={styles.flexOne}>
          <Text style={styles.protocolEmergencyLabel}>Collapse, confusion, or loss of consciousness</Text>
          <Text style={styles.protocolEmergencyTitle}>Activate the emergency action plan now.</Text>
        </View>
      </View>
      <SegmentedControl
        appearance="dark"
        onValueChange={(value) => setProtocol(value === 'Recovery check' ? 'recovery' : 'immediate')}
        selectedIndex={immediate ? 0 : 1}
        style={styles.nativeSegmentedControl}
        values={['Immediate response', 'Recovery check']}
      />
      <View style={styles.protocolCard}>
        {immediate ? (
          <>
            <ProtocolStep index="1" title="Stop activity" body="Move the athlete to shade or a cooled area." tone={Palette.emergency} />
            <ProtocolStep index="2" title="Assess immediately" body="Check responsiveness and follow school emergency procedures." tone={Palette.warning} />
            <ProtocolStep index="3" title="Escalate when needed" body="Call emergency services for collapse or suspected heat stroke." tone={Palette.caution} last />
          </>
        ) : (
          <>
            <ProtocolStep index="1" title="Stay with the athlete" body="Continue supervision and do not allow a return to activity." tone={Palette.warning} />
            <ProtocolStep index="2" title="Track recovery" body="Document symptoms, cooling steps, and the athlete’s response." tone={Palette.caution} />
            <ProtocolStep index="3" title="Follow clearance policy" body="Use district and medical guidance before any return to play." tone={Palette.safe} last />
          </>
        )}
      </View>
      <View style={styles.eapAction}>
        <View style={styles.eapActionIcon}><HeatIcon name={icons.phone} size={19} tintColor={Palette.surface} /></View>
        <View style={styles.flexOne}><Text style={styles.eapActionTitle}>Emergency contacts</Text><Text style={styles.eapActionDetail}>911 · campus office · district EAP</Text></View>
        <HeatIcon name={icons.arrow} size={17} tintColor={Palette.inkMuted} />
      </View>
      <View style={styles.protocolNotice}>
        <HeatIcon name={icons.book} size={20} tintColor={Palette.ink} />
        <Text style={styles.protocolNoticeText}>This quick reference supports, but does not replace, district emergency action plans or clinical judgment.</Text>
      </View>
    </>
  );
}

function AthleteStatusScreen() {
  return (
    <>
      <ScreenIntro eyebrow="Your signals" title="My status" />
      <Text style={styles.contextLine}>Compared with your personal baseline</Text>
      <View style={styles.statusHero}>
        <HeatSenseMascot height={116} reaction={null} />
        <Text style={styles.statusHeroTitle}>Signals are within your usual range.</Text>
        <Text style={styles.statusHeroBody}>Keep following today’s Orange-zone practice plan and scheduled water breaks.</Text>
      </View>
      <SectionHeader title="Today’s signals" />
      <View style={styles.metricGrid}>
        <SignalCard icon={icons.heart} index={0} label="HR recovery" tone={Palette.emergency} value="Normal" />
        <SignalCard icon={icons.thermometer} index={1} label="Skin trend" tone={Palette.warning} value="+0.3°F" />
        <SignalCard icon={icons.droplet} index={2} label="Sweat trend" tone={Palette.info} value="+4%" />
        <SignalCard icon={icons.movement} index={3} label="Exertion" tone={Palette.safe} value="Moderate" />
      </View>
    </>
  );
}

function SessionsScreen() {
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  return (
    <>
      <ScreenIntro eyebrow="Your practice" title="Sessions" />
      <SegmentedControl
        appearance="dark"
        onValueChange={(value) => setPeriod(value === '4 weeks' ? 'month' : 'week')}
        selectedIndex={period === 'week' ? 0 : 1}
        style={styles.nativeSegmentedControl}
        values={['7 days', '4 weeks']}
      />
      <View style={styles.weeklyCard}>
        <View style={styles.weeklyHeader}><View><Text style={styles.cardLabel}>{period === 'week' ? 'Last 7 days' : 'Last 4 weeks'}</Text><Text style={styles.weeklyTitle}>Recovery pattern</Text></View><Text style={styles.weeklyStatus}>Stable</Text></View>
        <Trend color={Palette.coral} large leftLabel={period === 'week' ? 'Sep 9' : 'Aug 19'} rightLabel="Today" variant="stable" />
        <View style={styles.sessionStats}>
          <MiniMetric label="Sessions" value={period === 'week' ? '3' : '11'} />
          <MiniMetric label="Avg. recovery" value={period === 'week' ? '8 min' : '9 min'} />
          <MiniMetric label="Alerts" value={period === 'week' ? '0' : '1'} />
        </View>
      </View>
      <SectionHeader title="Recent" />
      <View style={styles.listCard}>
        <SessionRow date="Sep 15" detail="72 min · Orange zone" index={0} title="Varsity conditioning" />
        <SessionRow date="Sep 13" detail="58 min · Yellow zone" index={1} title="Technical practice" />
        <SessionRow date="Sep 11" detail="81 min · Orange zone" index={2} title="Scrimmage" />
      </View>
    </>
  );
}

function LearnScreen() {
  const [openGuide, setOpenGuide] = useState<string | null>('speak-up');
  const reducedMotion = useReducedMotion();

  return (
    <>
      <ScreenIntro eyebrow="Learn" title="Heat safety guide" />
      <View style={styles.learnAlert}>
        <HeatIcon name={icons.warning} size={24} tintColor={Palette.emergency} />
        <View style={styles.flexOne}><Text style={styles.learnAlertTitle}>Stop and tell an adult</Text><Text style={styles.learnAlertBody}>Dizziness, confusion, fainting, or unusual behavior should never wait.</Text></View>
      </View>
      <GuideCard
        body="How heat, humidity, wind, and sunlight shape the field-wide practice plan."
        detail="WBGT sets the team-wide safety plan. Follow the coach’s work, rest, water, and equipment instructions."
        expanded={openGuide === 'wbgt'}
        icon={icons.sun}
        onPress={() => setOpenGuide(openGuide === 'wbgt' ? null : 'wbgt')}
        order={0}
        reducedMotion={reducedMotion}
        title="What WBGT means"
        tone={Palette.warning}
      />
      <GuideCard
        body="Why scheduled breaks matter before you feel thirsty or overheated."
        detail="Use every scheduled break. Drink water, move to shade when available, and notice whether your heart rate is settling."
        expanded={openGuide === 'hydration'}
        icon={icons.droplet}
        onPress={() => setOpenGuide(openGuide === 'hydration' ? null : 'hydration')}
        order={1}
        reducedMotion={reducedMotion}
        title="Hydration and recovery"
        tone={Palette.info}
      />
      <GuideCard
        body="Tell an adult immediately about dizziness, confusion, nausea, weakness, or unusual behavior."
        detail="Do not try to push through symptoms. Stop activity, find a coach or trainer, and stay with a teammate who needs help."
        expanded={openGuide === 'speak-up'}
        icon={icons.warning}
        onPress={() => setOpenGuide(openGuide === 'speak-up' ? null : 'speak-up')}
        order={2}
        reducedMotion={reducedMotion}
        title="When to speak up"
        tone={Palette.emergency}
      />
    </>
  );
}

function ProfileScreen({ role }: { role: string }) {
  const isAthlete = role === 'Athlete';
  const isCoach = role === 'Coach';
  const name = isAthlete ? 'Maya Chen' : isCoach ? 'Coach Rivera' : 'Alex Thompson';
  const initials = isAthlete ? 'MC' : isCoach ? 'CR' : 'AT';

  return (
    <>
      <ScreenIntro eyebrow="Your account" title="Profile" />
      <View style={styles.profileIdentity}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
        <View style={styles.flexOne}><Text style={styles.profileName}>{name}</Text><Text style={styles.profileRole}>{role} · Liberty High School</Text></View>
        <View style={styles.profileEdit}><Text style={styles.profileEditText}>Edit</Text></View>
      </View>
      <View style={styles.profileMetrics}>
        <ProfileMetric label={isAthlete ? 'Sessions' : isCoach ? 'Athletes' : 'Reviews'} value={isAthlete ? '12' : isCoach ? '24' : '2'} />
        <ProfileMetric label={isAthlete ? 'This week' : 'Teams'} value={isAthlete ? '3' : '1'} />
        <ProfileMetric label="Status" value="Active" />
      </View>
      <View style={styles.profileConnection}>
        <HeatIcon name={isAthlete ? icons.band : icons.people} size={25} tintColor={isAthlete ? Palette.safe : Palette.coralDark} />
        <View style={styles.flexOne}>
          <Text style={styles.profileConnectionTitle}>{isAthlete ? 'HeatSense Band connected' : 'Individual signals enabled'}</Text>
          <Text style={styles.profileConnectionDetail}>{isAthlete ? 'Last synced 2 minutes ago' : '18 athletes have shared wristband data'}</Text>
        </View>
        <HeatIcon name={icons.arrow} size={17} tintColor={Palette.inkMuted} />
      </View>
      <SectionHeader title="Workspace" />
      <View style={styles.listCard}>
        <SettingRow detail="Liberty High School" icon={icons.school} index={0} label="School and team" value="Soccer" />
        <SettingRow detail="Warnings and emergencies" icon={icons.alert} index={1} label="Alert preferences" value="On" />
        <SettingRow detail={isAthlete ? 'Optional personal signals' : 'Athlete device access'} icon={icons.band} index={2} label="Wristband" value={isAthlete ? 'Paired' : 'Manage'} />
      </View>
      <SectionHeader title="Privacy and data" />
      <View style={styles.listCard}>
        <SettingRow detail={isAthlete ? 'Coach and athletic trainer' : 'Role-based team access'} icon={icons.privacy} index={3} label="Data permissions" value="Review" />
        <SettingRow detail="What HeatSense can and cannot tell you" icon={icons.book} index={4} label="Safety and limitations" value="Read" />
      </View>
    </>
  );
}

function Rule({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return <View style={styles.rule}><HeatIcon name={icon} size={18} tintColor={Palette.coralDark} /><Text style={styles.ruleLabel}>{label}</Text><Text style={styles.ruleValue}>{value}</Text></View>;
}

function PersonRow({ detail, index = 0, name, status, tone }: { detail: string; index?: number; name: string; status: string; tone: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View entering={reduceMotion ? undefined : FadeInUp.delay(index * 45).duration(260)}>
      <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/detail', params: { kind: 'athlete', name } })} style={({ pressed }) => [styles.personRow, pressed && styles.pressed]}><View style={[styles.personAvatar, { backgroundColor: `${tone}1A` }]}><Text style={[styles.personInitials, { color: tone }]}>{name.split(' ').map((part) => part[0]).join('')}</Text></View><View style={styles.flexOne}><Text style={styles.personName}>{name}</Text><Text style={styles.personDetail}>{detail}</Text></View><StatusPill label={status} tone={tone} /></Pressable>
    </Animated.View>
  );
}

function StatusPill({ label, tone }: { label: string; tone: string }) {
  return <View style={[styles.statusPill, { backgroundColor: `${tone}16` }]}><View style={[styles.statusDot, { backgroundColor: tone }]} /><Text style={[styles.statusText, { color: tone }]}>{label}</Text></View>;
}

function Trend({
  color,
  compact,
  large,
  leftLabel,
  rightLabel,
  variant = 'wbgt',
}: {
  color: string;
  compact?: boolean;
  large?: boolean;
  leftLabel?: string;
  rightLabel?: string;
  variant?: 'recovery' | 'stable' | 'wbgt';
}) {
  const height = compact ? 45 : large ? 112 : 82;
  const path = variant === 'recovery'
    ? 'M2 32 C28 28, 46 18, 67 29 S103 62, 126 51 S157 35, 178 46 S214 76, 239 61 S272 43, 294 51 S322 63, 338 58'
    : variant === 'stable'
      ? 'M2 57 C29 50, 50 55, 71 46 S107 40, 132 49 S166 61, 192 50 S224 43, 248 48 S278 58, 303 47 S327 43, 338 45'
      : 'M2 68 C24 66, 30 54, 51 59 S79 82, 98 56 S127 35, 144 50 S174 76, 192 42 S221 20, 240 39 S273 69, 291 43 S322 27, 338 31';
  const endY = variant === 'recovery' ? '58' : variant === 'stable' ? '45' : '31';
  const hasLabels = Boolean(leftLabel || rightLabel);
  const gradId = `trendFill-${variant}-${color.replace('#', '')}`;

  return (
    <View style={[styles.trend, { height }]}>
      <Svg height={hasLabels ? height - 18 : '100%'} viewBox="0 0 340 100" width="100%">
        <Defs>
          <SvgGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.14} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </SvgGradient>
        </Defs>
        <Path d={`${path} L338 100 L2 100 Z`} fill={`url(#${gradId})`} stroke="none" />
        <Path d={path} fill="none" stroke={color} strokeLinecap="round" strokeWidth="4" />
        <Circle cx="338" cy={endY} fill={Palette.surface} r="7" stroke={color} strokeWidth="4" />
      </Svg>
      {hasLabels ? <View style={styles.trendLabels}><Text style={styles.trendLabel}>{leftLabel}</Text><Text style={styles.trendLabel}>{rightLabel}</Text></View> : null}
    </View>
  );
}

/** Decorative pagination dots under a hero metric card, echoing the
 * swipeable single-metric card pattern from the reference screenshots --
 * this app doesn't actually swipe between metrics, but the dots sell the
 * "one focused reading" framing instead of a flat static card. */
function TrendDots({ active = 0, color, count = 3 }: { active?: number; color: string; count?: number }) {
  return (
    <View style={styles.trendDots}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.trendDot, i === active && { backgroundColor: color, width: 16 }]} />
      ))}
    </View>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) { return <View style={styles.miniMetric}><Text style={styles.miniMetricValue}>{value}</Text><Text style={styles.miniMetricLabel}>{label}</Text></View>; }

function MetricTile({ icon, label, tone, value }: { icon: IconName; label: string; tone: string; value: string }) { return <View style={styles.metricTile}><HeatIcon name={icon} size={19} tintColor={tone} /><Text style={styles.metricTileLabel}>{label}</Text><Text style={styles.metricTileValue}>{value}</Text></View>; }

// A handful of distinct wave shapes so a 2x2 grid of cards doesn't read as
// four copies of the same sparkline -- picked by index, not tone, so it
// stays stable regardless of which metric lands in which slot.
const SIGNAL_WAVES = [
  'M0 28 C 10 10, 20 10, 28 20 S 44 38, 54 22 S 70 6, 84 18 L 84 46 L 0 46 Z',
  'M0 24 C 14 34, 22 34, 30 18 S 46 4, 56 16 S 72 32, 84 24 L 84 46 L 0 46 Z',
  'M0 20 C 12 8, 26 8, 34 24 S 50 40, 60 26 S 74 10, 84 20 L 84 46 L 0 46 Z',
  'M0 30 C 10 18, 18 6, 30 12 S 48 30, 58 20 S 76 4, 84 14 L 84 46 L 0 46 Z',
];
const SIGNAL_WAVE_STROKES = [
  'M0 28 C 10 10, 20 10, 28 20 S 44 38, 54 22 S 70 6, 84 18',
  'M0 24 C 14 34, 22 34, 30 18 S 46 4, 56 16 S 72 32, 84 24',
  'M0 20 C 12 8, 26 8, 34 24 S 50 40, 60 26 S 74 10, 84 20',
  'M0 30 C 10 18, 18 6, 30 12 S 48 30, 58 20 S 76 4, 84 14',
];

function SignalCard({ icon, index = 0, label, tone, value }: { icon: IconName; index?: number; label: string; tone: string; value: string }) {
  const reduceMotion = useReducedMotion();
  const w = index % SIGNAL_WAVES.length;
  return (
    <Animated.View entering={reduceMotion ? undefined : FadeInUp.delay(index * 60).duration(260)} style={styles.signalCard}>
      <View style={styles.signalTop}><HeatIcon name={icon} size={16} tintColor={tone} /><Text style={styles.signalLabel}>{label}</Text></View>
      <Text style={styles.signalValue}>{value}</Text>
      <Svg height={46} style={styles.signalWave} viewBox="0 0 84 46" width="100%">
        <Path d={SIGNAL_WAVES[w]} fill={tone} fillOpacity={0.14} />
        <Path d={SIGNAL_WAVE_STROKES[w]} fill="none" stroke={tone} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
      </Svg>
    </Animated.View>
  );
}

function DistributionLabel({ label, tone, value }: { label: string; tone: string; value: string }) { return <View style={styles.distributionLabel}><View style={[styles.distributionDot, { backgroundColor: tone }]} /><Text style={styles.distributionText}>{label}</Text><Text style={styles.distributionValue}>{value}</Text></View>; }

function FilterChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.filterChip, active && styles.filterChipActive, pressed && styles.pressed]}>
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function TimelineRow({ detail, index = 0, last, time, title, tone }: { detail: string; index?: number; last?: boolean; time: string; title: string; tone: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View entering={reduceMotion ? undefined : FadeInUp.delay(index * 70).duration(260)} style={styles.timelineRow}>
      <Text style={styles.timelineTime}>{time}</Text>
      <View style={styles.timelineTrack}>
        <View style={[styles.timelineDot, { backgroundColor: tone }]} />
        {!last ? <View style={styles.timelineLine} /> : null}
      </View>
      <View style={styles.timelineCopy}>
        <Text style={styles.timelineTitle}>{title}</Text>
        <Text style={styles.timelineDetail}>{detail}</Text>
      </View>
    </Animated.View>
  );
}

function AlertHistoryRow({
  detail,
  index = 0,
  time,
  title,
  tone,
}: {
  detail: string;
  index?: number;
  time: string;
  title: string;
  tone: string;
}) {
  const reduceMotion = useReducedMotion();
  const bob = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    // Same phase for every row (no per-index delay) so the whole stack
    // hovers together instead of rippling; a small +/-1.5px range keeps it
    // a minimal, ambient float rather than a bounce. reverse:true plays
    // 0->1->-1 then back -1->1->0 before repeating, landing exactly on the
    // start value each cycle -- reverse:false was snapping from -1 back to
    // 0 every loop, which read as choppy/stuttering.
    bob.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(-1, { duration: 1500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, [bob, reduceMotion]);

  const hoverStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value * 1.5 }] }));

  return (
    <Animated.View entering={reduceMotion ? undefined : FadeInUp.delay(index * 70).duration(260)}>
    <Animated.View style={[styles.historyPill, hoverStyle]}>
      <View style={[styles.historyIcon, { backgroundColor: `${tone}18` }]}>
        <HeatIcon name={icons.alert} size={18} tintColor={tone} />
      </View>
      <View style={styles.flexOne}>
        <Text style={styles.personName}>{title}</Text>
        <Text style={styles.personDetail}>{detail}</Text>
      </View>
      <Text style={styles.historyTime}>{time}</Text>
    </Animated.View>
    </Animated.View>
  );
}

function ProtocolStep({ body, index, last, title, tone }: { body: string; index: string; last?: boolean; title: string; tone: string }) {
  const reduceMotion = useReducedMotion();
  const order = Math.max(0, Number(index) - 1);
  return (
    <Animated.View entering={reduceMotion ? undefined : FadeInUp.delay(order * 70).duration(260)} style={styles.protocolRow}>
      <View style={[styles.protocolIndex, { backgroundColor: tone }]}><Text style={styles.protocolIndexText}>{index}</Text></View>
      <View style={styles.flexOne}>
        <Text style={styles.protocolTitle}>{title}</Text>
        <Text style={styles.protocolBody}>{body}</Text>
        {!last ? <View style={styles.protocolDivider} /> : null}
      </View>
    </Animated.View>
  );
}

function SessionRow({ date, detail, index = 0, title }: { date: string; detail: string; index?: number; title: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View entering={reduceMotion ? undefined : FadeInUp.delay(index * 70).duration(260)}>
      <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/detail', params: { kind: 'session', title } })} style={({ pressed }) => [styles.sessionRow, pressed && styles.pressed]}><View style={styles.sessionDate}><Text style={styles.sessionDateText}>{date}</Text></View><View style={styles.flexOne}><Text style={styles.personName}>{title}</Text><Text style={styles.personDetail}>{detail}</Text></View><HeatIcon name={icons.arrow} size={17} tintColor={Palette.inkMuted} /></Pressable>
    </Animated.View>
  );
}

function GuideCard({
  body,
  detail,
  expanded,
  icon,
  onPress,
  order = 0,
  reducedMotion,
  title,
  tone,
}: {
  body: string;
  detail: string;
  expanded: boolean;
  icon: IconName;
  onPress: () => void;
  order?: number;
  reducedMotion: boolean;
  title: string;
  tone: string;
}) {
  return (
    <Animated.View entering={reducedMotion ? undefined : FadeInUp.delay(order * 70).duration(260)}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onPress}
        style={({ pressed }) => [styles.guideCard, expanded && styles.guideCardExpanded, pressed && styles.pressed]}>
        <View style={styles.guideTopline}>
          <View style={[styles.guideIcon, { backgroundColor: `${tone}18` }]}><HeatIcon name={icon} size={22} tintColor={tone} /></View>
          <View style={styles.flexOne}><Text style={styles.guideTitle}>{title}</Text><Text style={styles.guideBody}>{body}</Text></View>
          <View style={[styles.guideDisclosure, expanded && styles.guideDisclosureExpanded]}><HeatIcon name={icons.arrow} size={17} tintColor={Palette.inkMuted} /></View>
        </View>
        {expanded ? (
          <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(180)} style={styles.guideDetail}>
            <View style={[styles.guideDetailRule, { backgroundColor: tone }]} />
            <Text style={styles.guideDetailText}>{detail}</Text>
          </Animated.View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

function ProfileMetric({ label, value }: { label: string; value: string }) { return <View style={styles.profileMetric}><Text style={styles.profileMetricValue}>{value}</Text><Text style={styles.profileMetricLabel}>{label}</Text></View>; }

function SettingRow({ detail, icon, index = 0, label, value }: { detail: string; icon: IconName; index?: number; label: string; value: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View entering={reduceMotion ? undefined : FadeInUp.delay(index * 60).duration(260)} style={styles.settingRow}>
      <HeatIcon name={icon} size={19} tintColor={Palette.ink} />
      <View style={styles.flexOne}><Text style={styles.settingLabel}>{label}</Text><Text style={styles.settingDetail}>{detail}</Text></View>
      <Text style={styles.settingValue}>{value}</Text>
      <HeatIcon name={icons.arrow} size={16} tintColor={Palette.inkMuted} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  greetingRow: { alignItems: 'center', flexDirection: 'row' },
  contextLine: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20, marginTop: Spacing.three },
  riskHero: { borderColor: Palette.outline, borderRadius: Radius.large, borderWidth: 1.5, marginTop: Spacing.six, minHeight: 278, overflow: 'hidden', padding: Spacing.six },
  riskTopline: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  riskLocation: { color: Palette.ink, fontFamily: Fonts.medium, fontSize: 15, letterSpacing: -0.2 },
  riskSource: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 13, marginTop: 3 },
  sunBubble: { alignItems: 'center', borderColor: Palette.border, borderRadius: 22, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  riskMain: { alignItems: 'flex-end', flexDirection: 'row', marginTop: Spacing.six },
  riskNumber: { color: Palette.ink, fontFamily: Fonts.light, fontSize: 88, letterSpacing: -3, lineHeight: 90 },
  riskMainCopy: { marginLeft: Spacing.three, paddingBottom: 14 },
  riskUnit: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 14 },
  riskZone: { color: Palette.warning, fontFamily: Fonts.medium, fontSize: 21, letterSpacing: -0.4, marginTop: 3 },
  riskMessage: { color: 'rgba(255,255,255,0.82)', fontFamily: Fonts.regular, fontSize: 15, lineHeight: 21, marginTop: Spacing.three, maxWidth: 300 },
  trend: { justifyContent: 'center', marginTop: Spacing.two, overflow: 'hidden', width: '100%' },
  trendLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  trendLabel: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 12 },
  trendDots: { flexDirection: 'row', gap: 5, justifyContent: 'center', marginTop: Spacing.three },
  trendDot: { backgroundColor: Palette.border, borderRadius: 3, height: 6, width: 6 },
  ruleStrip: { backgroundColor: Palette.surface, borderColor: Palette.border, borderRadius: Radius.large, borderWidth: 1.5, flexDirection: 'row', overflow: 'hidden' },
  rule: { alignItems: 'flex-start', borderRightColor: Palette.border, borderRightWidth: StyleSheet.hairlineWidth, flex: 1, justifyContent: 'center', minHeight: 112, padding: Spacing.three },
  ruleLabel: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 12, marginTop: Spacing.two },
  ruleValue: { color: Palette.ink, fontFamily: Fonts.medium, fontSize: 14, lineHeight: 18, marginTop: 3 },
  listCard: { backgroundColor: Palette.surface, borderColor: Palette.border, borderRadius: Radius.large, borderWidth: 1.5, overflow: 'hidden' },
  personRow: { alignItems: 'center', borderBottomColor: Palette.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: Spacing.three, minHeight: 78, paddingHorizontal: Spacing.five },
  personAvatar: { alignItems: 'center', borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  personInitials: { fontFamily: Fonts.medium, fontSize: 12 },
  personName: { color: Palette.ink, fontFamily: Fonts.medium, fontSize: 16, letterSpacing: -0.2 },
  personDetail: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 13, lineHeight: 17, marginTop: 2 },
  statusPill: { alignItems: 'center', borderRadius: Radius.pill, flexDirection: 'row', gap: 5, paddingHorizontal: 9, paddingVertical: 6 },
  statusDot: { borderRadius: 4, height: 6, width: 6 },
  statusText: { fontFamily: Fonts.medium, fontSize: 12 },
  teamOverview: { borderColor: Palette.outline, borderRadius: Radius.large, borderWidth: 1.5, marginTop: Spacing.six, padding: Spacing.five },
  teamOverviewHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  teamOverviewValue: { color: Palette.ink, fontFamily: Fonts.medium, fontSize: 24, letterSpacing: -0.6 },
  teamOverviewDetail: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 14, lineHeight: 19, marginTop: 4 },
  teamLivePill: { alignItems: 'center', backgroundColor: 'rgba(76,155,118,0.16)', borderRadius: Radius.pill, flexDirection: 'row', gap: 5, paddingHorizontal: 9, paddingVertical: 6 },
  teamLiveDot: { backgroundColor: Palette.safe, borderRadius: 4, height: 7, width: 7 },
  teamLiveText: { color: Palette.safe, fontFamily: Fonts.medium, fontSize: 12 },
  distributionTrack: { flexDirection: 'row', gap: 3, height: 10, marginTop: Spacing.four, overflow: 'hidden' },
  distributionSegment: { borderRadius: Radius.pill, minWidth: 8 },
  distributionLegend: { flexDirection: 'row', gap: Spacing.four, marginTop: Spacing.three },
  distributionLabel: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  distributionDot: { borderRadius: 4, height: 7, width: 7 },
  distributionText: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 12 },
  distributionValue: { color: Palette.ink, fontFamily: Fonts.medium, fontSize: 12 },
  filterRow: { flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.three },
  filterChip: { alignItems: 'center', borderColor: Palette.border, borderRadius: Radius.pill, borderWidth: 1.5, justifyContent: 'center', minHeight: 40, paddingHorizontal: Spacing.four },
  filterChipActive: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: Palette.ink },
  filterChipText: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 14 },
  filterChipTextActive: { color: Palette.ink, fontFamily: Fonts.medium },
  rosterFooter: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 12, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, textAlign: 'center' },
  triageCard: { borderColor: Palette.outline, borderRadius: Radius.large, borderWidth: 1.5, marginTop: Spacing.six, padding: Spacing.five },
  triageHeader: { alignItems: 'center', flexDirection: 'row', gap: Spacing.three },
  triageIcon: { alignItems: 'center', backgroundColor: Palette.warning, borderRadius: 20, height: 42, justifyContent: 'center', width: 42 },
  triageLabel: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 13 },
  triageName: { color: Palette.ink, fontFamily: Fonts.medium, fontSize: 21, letterSpacing: -0.4, marginTop: 2 },
  triageSummary: { color: Palette.ink, fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },
  triageMetrics: { borderTopColor: Palette.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', marginTop: Spacing.four, paddingTop: Spacing.four },
  miniMetric: { flex: 1 },
  miniMetricValue: { color: Palette.ink, fontFamily: Fonts.medium, fontSize: 17, letterSpacing: -0.2 },
  miniMetricLabel: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 12, marginTop: 2 },
  bentoGrid: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.five },
  bentoPrimary: { borderColor: Palette.outline, borderRadius: Radius.large, borderWidth: 1.5, flex: 1.35, minHeight: 236, overflow: 'hidden', padding: Spacing.five },
  bentoTopline: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  bentoLabel: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 13 },
  bentoNumber: { color: Palette.ink, fontFamily: Fonts.light, fontSize: 68, letterSpacing: -2, lineHeight: 72, marginTop: Spacing.six },
  bentoZone: { color: Palette.warning, fontFamily: Fonts.medium, fontSize: 18, letterSpacing: -0.3 },
  bentoHint: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 13, marginTop: 3 },
  bentoStack: { flex: 1, gap: Spacing.three },
  metricTile: { borderColor: Palette.border, borderRadius: Radius.medium, borderWidth: 1.5, flex: 1, justifyContent: 'center', padding: Spacing.four },
  metricTileLabel: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 12, marginTop: Spacing.two },
  metricTileValue: { color: Palette.ink, fontFamily: Fonts.medium, fontSize: 16, letterSpacing: -0.2, marginTop: 2 },
  weeklyCard: { borderColor: Palette.border, borderRadius: Radius.large, borderWidth: 1.5, marginTop: Spacing.three, padding: Spacing.five },
  weeklyHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  cardLabel: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 13 },
  weeklyTitle: { color: Palette.ink, fontFamily: Fonts.medium, fontSize: 21, letterSpacing: -0.4, marginTop: 2 },
  weeklyStatus: { color: Palette.safe, fontFamily: Fonts.medium, fontSize: 12 },
  weekBars: { alignItems: 'flex-end', flexDirection: 'row', gap: 9, height: 104, marginTop: Spacing.four },
  weekBarSlot: { alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end' },
  weekBar: { backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: Radius.pill, maxHeight: 78, minHeight: 20, width: 17 },
  weekBarToday: { backgroundColor: Palette.coral },
  weekDay: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 12, marginTop: 6 },
  sessionFeature: { alignItems: 'center', borderColor: Palette.outline, borderRadius: 9999, borderWidth: 1.5, flexDirection: 'row', gap: Spacing.four, minHeight: 92, paddingHorizontal: Spacing.five },
  sessionIcon: { alignItems: 'center', borderColor: Palette.border, borderRadius: 23, borderWidth: 1, height: 46, justifyContent: 'center', width: 46 },
  sessionTitle: { color: Palette.ink, fontFamily: Fonts.medium, fontSize: 17, letterSpacing: -0.3 },
  sessionMeta: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 13, marginTop: 3 },
  timelineCard: { borderColor: Palette.border, borderRadius: Radius.large, borderWidth: 1.5, padding: Spacing.five },
  timelineRow: { flexDirection: 'row', minHeight: 84 },
  timelineTime: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 12, width: 44 },
  timelineTrack: { alignItems: 'center', width: 24 },
  timelineDot: { borderRadius: 6, height: 11, width: 11 },
  timelineLine: { backgroundColor: Palette.border, flex: 1, marginVertical: 4, width: 2 },
  timelineCopy: { flex: 1, paddingBottom: Spacing.four, paddingLeft: Spacing.two },
  timelineTitle: { color: Palette.ink, fontFamily: Fonts.medium, fontSize: 16, letterSpacing: -0.2 },
  timelineDetail: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 13, lineHeight: 17, marginTop: 3 },
  summaryRow: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.five },
  summaryBlock: { backgroundColor: Palette.surface, borderColor: Palette.border, borderRadius: Radius.medium, borderWidth: 1, flex: 1, padding: Spacing.four },
  summaryValue: { fontFamily: Fonts.extrabold, fontSize: 28 },
  summaryLabel: { color: Palette.inkMuted, fontFamily: Fonts.semibold, fontSize: 12, marginTop: 2 },
  disclaimer: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 12.5, lineHeight: 17, marginHorizontal: Spacing.two, marginTop: Spacing.five },
  emergencyCard: { borderColor: Palette.emergency, borderRadius: Radius.large, borderWidth: 1.5, marginTop: Spacing.six, padding: Spacing.six },
  emergencyTopline: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  emergencyTime: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 12 },
  emergencyTitle: { color: Palette.ink, fontFamily: Fonts.medium, fontSize: 28, letterSpacing: -0.8, lineHeight: 31, marginTop: Spacing.six },
  emergencyBody: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 15, lineHeight: 21, marginTop: Spacing.three },
  emergencyAction: { marginTop: Spacing.six },
  historyStack: { gap: Spacing.three },
  historyPill: { alignItems: 'center', borderColor: Palette.border, borderRadius: Radius.large, borderWidth: 1.5, flexDirection: 'row', gap: Spacing.three, minHeight: 78, paddingHorizontal: Spacing.five },
  historyIcon: { alignItems: 'center', borderRadius: 18, height: 38, justifyContent: 'center', width: 38 },
  historyTime: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 12 },
  monitorCard: { borderColor: Palette.outline, borderRadius: Radius.large, borderWidth: 1.5, marginTop: Spacing.six, padding: Spacing.six },
  monitorHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  monitorValue: { color: Palette.ink, fontFamily: Fonts.light, fontSize: 52, letterSpacing: -1.5, marginTop: 4 },
  monitorUnit: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 15 },
  monitorInterpretation: { color: Palette.ink, fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  signalCard: { borderColor: Palette.border, borderRadius: Radius.medium, borderWidth: 1.5, minHeight: 158, padding: Spacing.five, width: '48%' },
  signalTop: { alignItems: 'center', flexDirection: 'row', gap: Spacing.two },
  signalLabel: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 12.5 },
  signalValue: { color: Palette.ink, fontFamily: Fonts.light, fontSize: 32, letterSpacing: -1, marginTop: Spacing.three },
  signalWave: { marginTop: Spacing.three },
  protocolEmergency: { alignItems: 'center', borderColor: Palette.emergency, borderRadius: Radius.large, borderWidth: 1.5, flexDirection: 'row', gap: Spacing.four, marginTop: Spacing.six, padding: Spacing.five },
  protocolEmergencyIcon: { alignItems: 'center', borderColor: Palette.emergency, borderRadius: 22, borderWidth: 1.5, height: 44, justifyContent: 'center', width: 44 },
  protocolEmergencyLabel: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 12, lineHeight: 16 },
  protocolEmergencyTitle: { color: Palette.ink, fontFamily: Fonts.medium, fontSize: 18, letterSpacing: -0.3, lineHeight: 22, marginTop: 4 },
  nativeSegmentedControl: { height: 40, marginTop: Spacing.four, width: '100%' },
  protocolCard: { borderColor: Palette.border, borderRadius: Radius.large, borderWidth: 1.5, marginTop: Spacing.three, padding: Spacing.five },
  protocolRow: { alignItems: 'flex-start', flexDirection: 'row', gap: Spacing.three },
  protocolIndex: { alignItems: 'center', borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  protocolIndexText: { color: Palette.surface, fontFamily: Fonts.bold, fontSize: 13 },
  protocolTitle: { color: Palette.ink, fontFamily: Fonts.medium, fontSize: 16, letterSpacing: -0.2 },
  protocolBody: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 13, lineHeight: 18, marginTop: 4 },
  protocolDivider: { backgroundColor: Palette.border, height: StyleSheet.hairlineWidth, marginVertical: Spacing.four },
  eapAction: { alignItems: 'center', borderColor: Palette.border, borderRadius: Radius.medium, borderWidth: 1.5, flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.three, padding: Spacing.four },
  eapActionIcon: { alignItems: 'center', backgroundColor: Palette.emergency, borderRadius: 18, height: 38, justifyContent: 'center', width: 38 },
  eapActionTitle: { color: Palette.ink, fontFamily: Fonts.medium, fontSize: 15 },
  eapActionDetail: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 12.5, marginTop: 2 },
  protocolNotice: { alignItems: 'flex-start', borderColor: Palette.border, borderRadius: Radius.medium, borderWidth: 1, flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.four, padding: Spacing.four },
  protocolNoticeText: { color: Palette.inkMuted, flex: 1, fontFamily: Fonts.regular, fontSize: 13, lineHeight: 18 },
  statusHero: { alignItems: 'center', borderColor: Palette.outline, borderRadius: Radius.large, borderWidth: 1.5, marginTop: Spacing.six, padding: Spacing.six },
  statusRing: { alignItems: 'center', backgroundColor: Palette.surface, borderRadius: 38, height: 76, justifyContent: 'center', width: 76 },
  statusHeroTitle: { color: Palette.ink, fontFamily: Fonts.medium, fontSize: 26, letterSpacing: -0.6, lineHeight: 30, marginTop: Spacing.four, textAlign: 'center' },
  statusHeroBody: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20, marginTop: Spacing.three, textAlign: 'center' },
  sessionRow: { alignItems: 'center', borderBottomColor: Palette.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: Spacing.three, minHeight: 80, paddingHorizontal: Spacing.five },
  sessionDate: { alignItems: 'center', borderColor: Palette.border, borderRadius: 14, borderWidth: 1, height: 42, justifyContent: 'center', width: 52 },
  sessionDateText: { color: Palette.ink, fontFamily: Fonts.medium, fontSize: 12 },
  sessionStats: { borderTopColor: Palette.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', marginTop: Spacing.three, paddingTop: Spacing.four },
  learnAlert: { alignItems: 'flex-start', borderColor: Palette.emergency, borderRadius: Radius.medium, borderWidth: 1.5, flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.six, padding: Spacing.five },
  learnAlertTitle: { color: Palette.emergency, fontFamily: Fonts.medium, fontSize: 16 },
  learnAlertBody: { color: Palette.ink, fontFamily: Fonts.regular, fontSize: 14, lineHeight: 19, marginTop: 4 },
  guideCard: { borderColor: Palette.border, borderRadius: Radius.large, borderWidth: 1.5, marginTop: Spacing.three, minHeight: 112, padding: Spacing.five },
  guideCardExpanded: { borderColor: Palette.ink },
  guideTopline: { alignItems: 'center', flexDirection: 'row', gap: Spacing.three },
  guideIcon: { alignItems: 'center', borderRadius: 22, height: 46, justifyContent: 'center', width: 46 },
  guideTitle: { color: Palette.ink, fontFamily: Fonts.medium, fontSize: 17, letterSpacing: -0.3 },
  guideBody: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 13, lineHeight: 18, marginTop: 4 },
  guideDisclosure: { transform: [{ rotate: '0deg' }] },
  guideDisclosureExpanded: { transform: [{ rotate: '90deg' }] },
  guideDetail: { flexDirection: 'row', gap: Spacing.three, marginLeft: 58, marginTop: Spacing.three, paddingTop: Spacing.three },
  guideDetailRule: { borderRadius: Radius.pill, width: 3 },
  guideDetailText: { color: Palette.ink, flex: 1, fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },
  profileIdentity: { alignItems: 'center', flexDirection: 'row', gap: Spacing.four, marginTop: Spacing.six, paddingHorizontal: Spacing.two },
  avatar: { alignItems: 'center', borderColor: Palette.ink, borderRadius: 28, borderWidth: 1.5, height: 56, justifyContent: 'center', width: 56 },
  avatarText: { color: Palette.ink, fontFamily: Fonts.medium, fontSize: 17 },
  profileName: { color: Palette.ink, fontFamily: Fonts.medium, fontSize: 21, letterSpacing: -0.4 },
  profileRole: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 13, marginTop: 3 },
  profileEdit: { alignItems: 'center', borderColor: Palette.ink, borderRadius: Radius.pill, borderWidth: 1.5, justifyContent: 'center', minHeight: 38, paddingHorizontal: Spacing.four },
  profileEditText: { color: Palette.ink, fontFamily: Fonts.medium, fontSize: 14 },
  profileMetrics: { borderColor: Palette.border, borderRadius: Radius.medium, borderWidth: 1.5, flexDirection: 'row', marginTop: Spacing.six, overflow: 'hidden' },
  profileMetric: { alignItems: 'center', borderRightColor: Palette.border, borderRightWidth: StyleSheet.hairlineWidth, flex: 1, justifyContent: 'center', minHeight: 78 },
  profileMetricValue: { color: Palette.ink, fontFamily: Fonts.medium, fontSize: 22, letterSpacing: -0.4 },
  profileMetricLabel: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 12, marginTop: 3 },
  profileConnection: { alignItems: 'center', borderColor: Palette.border, borderRadius: Radius.medium, borderWidth: 1.5, flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.three, padding: Spacing.five },
  profileConnectionTitle: { color: Palette.ink, fontFamily: Fonts.medium, fontSize: 15 },
  profileConnectionDetail: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 13, marginTop: 3 },
  settingRow: { alignItems: 'center', borderBottomColor: Palette.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: Spacing.three, minHeight: 76, paddingHorizontal: Spacing.five, paddingVertical: Spacing.three },
  settingLabel: { color: Palette.ink, fontFamily: Fonts.medium, fontSize: 16, letterSpacing: -0.2 },
  settingDetail: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 13, lineHeight: 17, marginTop: 2 },
  settingValue: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 14 },
  pressed: { opacity: 0.68 },
});
