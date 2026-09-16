import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { ScreenIntro, SectionHeader, type DashboardRole } from '@/components/dashboard-shell';
import { HeatIcon } from '@/components/heat-icon';
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
      <ScreenIntro title="Practice is in the Orange zone." />
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
      <ScreenIntro title="Two athletes need review." />
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
      <ScreenIntro title="Hi, Maya." />
      <Text style={styles.contextLine}>Tuesday · Varsity practice at 4:10 PM</Text>
      <View style={styles.bentoGrid}>
        <LinearGradient colors={['#F49778', '#F7C3A8', '#FFF6E7']} style={styles.bentoPrimary}>
          <View style={styles.bentoTopline}>
            <Text style={styles.bentoLabel}>Field WBGT</Text>
            <HeatIcon name={icons.sun} size={21} tintColor={Palette.ink} />
          </View>
          <Text style={styles.bentoNumber}>84</Text>
          <Text style={styles.bentoZone}>Orange zone</Text>
          <Text style={styles.bentoHint}>Practice plan adjusted</Text>
        </LinearGradient>
        <View style={styles.bentoStack}>
          <MetricTile icon={icons.droplet} label="Hydration" tone="#547A8C" value="2 breaks" />
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
              <View style={[styles.weekBar, { height }]} />
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

function RiskHero({ mode }: { mode: 'coach' }) {
  return (
    <LinearGradient colors={['#F28A69', '#F7B78D', '#FFF2D9']} end={{ x: 0.9, y: 1 }} start={{ x: 0, y: 0 }} style={styles.riskHero}>
      <View style={styles.riskTopline}>
        <View>
          <Text style={styles.riskLocation}>Memorial Stadium · 4:10 PM</Text>
          <Text style={styles.riskSource}>Field reading · updated 2 min ago</Text>
        </View>
        <View style={styles.sunBubble}><HeatIcon name={icons.sun} size={22} tintColor={Palette.ink} /></View>
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
    </LinearGradient>
  );
}

function PracticePlanScreen() {
  return (
    <>
      <ScreenIntro title="Today’s varsity soccer plan" />
      <RiskHero mode="coach" />
      <SectionHeader title="Practice timeline" />
      <View style={styles.timelineCard}>
        <TimelineRow time="4:00" title="Arrival and baseline check" detail="Water available before warm-up" tone={Palette.safe} />
        <TimelineRow time="4:10" title="20-minute work block" detail="Helmets and heavy equipment monitored" tone={Palette.warning} />
        <TimelineRow time="4:30" title="10-minute recovery" detail="Shade, water, and athlete check" tone={Palette.coralDark} last />
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
      <ScreenIntro title={title} />
      <View style={styles.teamOverview}>
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
      </View>
      <SectionHeader action={`${visibleRoster.length} shown`} title={variant === 'coach' ? 'Live roster' : 'Review queue'} />
      <View style={styles.filterRow}>
        <FilterChip active={filter === 'all'} label="All" onPress={() => setFilter('all')} />
        <FilterChip active={filter === 'attention'} label="Needs attention" onPress={() => setFilter('attention')} />
        <FilterChip active={filter === 'normal'} label="Normal" onPress={() => setFilter('normal')} />
      </View>
      <View style={styles.listCard}>
        {visibleRoster.map((item) => <PersonRow key={item.name} {...item} />)}
        {filter === 'all' ? <Text style={styles.rosterFooter}>Showing 6 of 24 athletes · sorted by risk</Text> : null}
      </View>
      <Text style={styles.disclaimer}>Individual wristband signals appear only for athletes who have paired a device and shared session data.</Text>
    </>
  );
}

function AlertsScreen() {
  return (
    <>
      <ScreenIntro title="Alerts" />
      <LinearGradient colors={['#C94A37', '#E66A50']} style={styles.emergencyCard}>
        <View style={styles.emergencyTopline}>
          <HeatIcon name={icons.warning} size={24} tintColor={Palette.surface} />
          <Text style={styles.emergencyTime}>Now</Text>
        </View>
        <Text style={styles.emergencyTitle}>Maya needs a recovery check.</Text>
        <Text style={styles.emergencyBody}>Elevated heart rate and rising skin trend continued through a low-movement break.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/detail', params: { kind: 'alert' } })} style={({ pressed }) => [styles.emergencyAction, pressed && styles.pressed]}><Text style={styles.emergencyActionText}>Acknowledge and locate</Text></Pressable>
      </LinearGradient>
      <SectionHeader title="Earlier today" />
      <View style={styles.listCard}>
        <AlertHistoryRow time="3:52 PM" title="Hydration reminder" detail="Jordan Lee · acknowledged" tone={Palette.caution} />
        <AlertHistoryRow time="3:35 PM" title="WBGT entered Orange zone" detail="Practice plan updated" tone={Palette.warning} />
      </View>
    </>
  );
}

function MonitorScreen() {
  return (
    <>
      <ScreenIntro title="Maya’s live signals" />
      <Text style={styles.contextLine}>Optional wristband · compared with Maya’s personal baseline</Text>
      <View style={styles.monitorCard}>
        <View style={styles.monitorHeader}>
          <View><Text style={styles.cardLabel}>Heart-rate recovery</Text><Text style={styles.monitorValue}>142 <Text style={styles.monitorUnit}>bpm</Text></Text></View>
          <StatusPill label="Review" tone={Palette.warning} />
        </View>
        <Trend color={Palette.coral} large leftLabel="Break started" rightLabel="Now" variant="recovery" />
        <Text style={styles.monitorInterpretation}>Elevated for 6 minutes while movement remains low.</Text>
      </View>
      <SectionHeader title="Supporting context" />
      <View style={styles.metricGrid}>
        <SignalCard icon={icons.thermometer} label="Skin trend" tone={Palette.warning} value="+0.8°F" />
        <SignalCard icon={icons.droplet} label="Sweat trend" tone="#547A8C" value="+11%" />
        <SignalCard icon={icons.movement} label="Movement" tone={Palette.safe} value="Low" />
        <SignalCard icon={icons.clock} label="Break time" tone={Palette.coralDark} value="6 min" />
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
      <ScreenIntro title="Response protocols" />
      <LinearGradient colors={['#B42318', '#D95749']} style={styles.protocolEmergency}>
        <View style={styles.protocolEmergencyIcon}><HeatIcon name={icons.medical} size={22} tintColor={Palette.emergency} /></View>
        <View style={styles.flexOne}>
          <Text style={styles.protocolEmergencyLabel}>Collapse, confusion, or loss of consciousness</Text>
          <Text style={styles.protocolEmergencyTitle}>Activate the emergency action plan now.</Text>
        </View>
      </LinearGradient>
      <SegmentedControl
        appearance="light"
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
      <ScreenIntro title="My status" />
      <Text style={styles.contextLine}>Compared with your personal baseline</Text>
      <View style={styles.statusHero}>
        <View style={styles.statusRing}><HeatIcon name={icons.check} size={42} tintColor={Palette.safe} /></View>
        <Text style={styles.statusHeroTitle}>Signals are within your usual range.</Text>
        <Text style={styles.statusHeroBody}>Keep following today’s Orange-zone practice plan and scheduled water breaks.</Text>
      </View>
      <SectionHeader title="Today’s signals" />
      <View style={styles.metricGrid}>
        <SignalCard icon={icons.heart} label="HR recovery" tone={Palette.coral} value="Normal" />
        <SignalCard icon={icons.thermometer} label="Skin trend" tone={Palette.warning} value="+0.3°F" />
        <SignalCard icon={icons.droplet} label="Sweat trend" tone="#547A8C" value="+4%" />
        <SignalCard icon={icons.movement} label="Exertion" tone={Palette.safe} value="Moderate" />
      </View>
    </>
  );
}

function SessionsScreen() {
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  return (
    <>
      <ScreenIntro title="Sessions" />
      <SegmentedControl
        appearance="light"
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
        <SessionRow date="Sep 15" title="Varsity conditioning" detail="72 min · Orange zone" />
        <SessionRow date="Sep 13" title="Technical practice" detail="58 min · Yellow zone" />
        <SessionRow date="Sep 11" title="Scrimmage" detail="81 min · Orange zone" />
      </View>
    </>
  );
}

function LearnScreen() {
  const [openGuide, setOpenGuide] = useState<string | null>('speak-up');
  const reducedMotion = useReducedMotion();

  return (
    <>
      <ScreenIntro title="Heat safety guide" />
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
        reducedMotion={reducedMotion}
        title="Hydration and recovery"
        tone="#547A8C"
      />
      <GuideCard
        body="Tell an adult immediately about dizziness, confusion, nausea, weakness, or unusual behavior."
        detail="Do not try to push through symptoms. Stop activity, find a coach or trainer, and stay with a teammate who needs help."
        expanded={openGuide === 'speak-up'}
        icon={icons.warning}
        onPress={() => setOpenGuide(openGuide === 'speak-up' ? null : 'speak-up')}
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
      <ScreenIntro title="Profile" />
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
      <LinearGradient colors={isAthlete ? ['#DDEBE1', '#F3EFE3'] : ['#FBE4DE', '#F3EFE3']} style={styles.profileConnection}>
        <HeatIcon name={isAthlete ? icons.band : icons.people} size={25} tintColor={isAthlete ? Palette.safe : Palette.coralDark} />
        <View style={styles.flexOne}>
          <Text style={styles.profileConnectionTitle}>{isAthlete ? 'HeatSense Band connected' : 'Individual signals enabled'}</Text>
          <Text style={styles.profileConnectionDetail}>{isAthlete ? 'Last synced 2 minutes ago' : '18 athletes have shared wristband data'}</Text>
        </View>
        <HeatIcon name={icons.arrow} size={17} tintColor={Palette.inkMuted} />
      </LinearGradient>
      <SectionHeader title="Workspace" />
      <View style={styles.listCard}>
        <SettingRow detail="Liberty High School" icon={icons.school} label="School and team" value="Soccer" />
        <SettingRow detail="Warnings and emergencies" icon={icons.alert} label="Alert preferences" value="On" />
        <SettingRow detail={isAthlete ? 'Optional personal signals' : 'Athlete device access'} icon={icons.band} label="Wristband" value={isAthlete ? 'Paired' : 'Manage'} />
      </View>
      <SectionHeader title="Privacy and data" />
      <View style={styles.listCard}>
        <SettingRow detail={isAthlete ? 'Coach and athletic trainer' : 'Role-based team access'} icon={icons.privacy} label="Data permissions" value="Review" />
        <SettingRow detail="What HeatSense can and cannot tell you" icon={icons.book} label="Safety and limitations" value="Read" />
      </View>
    </>
  );
}

function Rule({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return <View style={styles.rule}><HeatIcon name={icon} size={18} tintColor={Palette.coralDark} /><Text style={styles.ruleLabel}>{label}</Text><Text style={styles.ruleValue}>{value}</Text></View>;
}

function PersonRow({ detail, name, status, tone }: { detail: string; name: string; status: string; tone: string }) {
  return <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/detail', params: { kind: 'athlete', name } })} style={({ pressed }) => [styles.personRow, pressed && styles.pressed]}><View style={[styles.personAvatar, { backgroundColor: `${tone}1A` }]}><Text style={[styles.personInitials, { color: tone }]}>{name.split(' ').map((part) => part[0]).join('')}</Text></View><View style={styles.flexOne}><Text style={styles.personName}>{name}</Text><Text style={styles.personDetail}>{detail}</Text></View><StatusPill label={status} tone={tone} /></Pressable>;
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
  const hasLabels = Boolean(leftLabel || rightLabel);

  return (
    <View style={[styles.trend, { height }]}>
      <Svg height={hasLabels ? height - 18 : '100%'} viewBox="0 0 340 100" width="100%">
        <Path d={path} fill="none" stroke={color} strokeLinecap="round" strokeWidth="4" />
        <Circle cx="338" cy={variant === 'recovery' ? '58' : variant === 'stable' ? '45' : '31'} fill={Palette.surface} r="7" stroke={color} strokeWidth="4" />
      </Svg>
      {hasLabels ? <View style={styles.trendLabels}><Text style={styles.trendLabel}>{leftLabel}</Text><Text style={styles.trendLabel}>{rightLabel}</Text></View> : null}
    </View>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) { return <View style={styles.miniMetric}><Text style={styles.miniMetricValue}>{value}</Text><Text style={styles.miniMetricLabel}>{label}</Text></View>; }

function MetricTile({ icon, label, tone, value }: { icon: IconName; label: string; tone: string; value: string }) { return <View style={styles.metricTile}><HeatIcon name={icon} size={19} tintColor={tone} /><Text style={styles.metricTileLabel}>{label}</Text><Text style={styles.metricTileValue}>{value}</Text></View>; }

function SignalCard({ icon, label, tone, value }: { icon: IconName; label: string; tone: string; value: string }) { return <View style={styles.signalCard}><View style={styles.signalTop}><HeatIcon name={icon} size={18} tintColor={tone} /><Text style={styles.signalLabel}>{label}</Text></View><Text style={styles.signalValue}>{value}</Text><View style={styles.tinyBars}>{[13, 23, 17, 31, 22, 36].map((height, index) => <View key={index} style={[styles.tinyBar, { backgroundColor: tone, height }]} />)}</View></View>; }

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

function TimelineRow({ detail, last, time, title, tone }: { detail: string; last?: boolean; time: string; title: string; tone: string }) { return <View style={styles.timelineRow}><Text style={styles.timelineTime}>{time}</Text><View style={styles.timelineTrack}><View style={[styles.timelineDot, { backgroundColor: tone }]} />{!last ? <View style={styles.timelineLine} /> : null}</View><View style={styles.timelineCopy}><Text style={styles.timelineTitle}>{title}</Text><Text style={styles.timelineDetail}>{detail}</Text></View></View>; }

function AlertHistoryRow({ detail, time, title, tone }: { detail: string; time: string; title: string; tone: string }) { return <View style={styles.historyRow}><View style={[styles.historyIcon, { backgroundColor: `${tone}18` }]}><HeatIcon name={icons.alert} size={18} tintColor={tone} /></View><View style={styles.flexOne}><Text style={styles.personName}>{title}</Text><Text style={styles.personDetail}>{detail}</Text></View><Text style={styles.historyTime}>{time}</Text></View>; }

function ProtocolStep({ body, index, last, title, tone }: { body: string; index: string; last?: boolean; title: string; tone: string }) { return <View style={styles.protocolRow}><View style={[styles.protocolIndex, { backgroundColor: tone }]}><Text style={styles.protocolIndexText}>{index}</Text></View><View style={styles.flexOne}><Text style={styles.protocolTitle}>{title}</Text><Text style={styles.protocolBody}>{body}</Text>{!last ? <View style={styles.protocolDivider} /> : null}</View></View>; }

function SessionRow({ date, detail, title }: { date: string; detail: string; title: string }) { return <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/detail', params: { kind: 'session', title } })} style={({ pressed }) => [styles.sessionRow, pressed && styles.pressed]}><View style={styles.sessionDate}><Text style={styles.sessionDateText}>{date}</Text></View><View style={styles.flexOne}><Text style={styles.personName}>{title}</Text><Text style={styles.personDetail}>{detail}</Text></View><HeatIcon name={icons.arrow} size={17} tintColor={Palette.inkMuted} /></Pressable>; }

function GuideCard({
  body,
  detail,
  expanded,
  icon,
  onPress,
  reducedMotion,
  title,
  tone,
}: {
  body: string;
  detail: string;
  expanded: boolean;
  icon: IconName;
  onPress: () => void;
  reducedMotion: boolean;
  title: string;
  tone: string;
}) {
  return (
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
  );
}

function ProfileMetric({ label, value }: { label: string; value: string }) { return <View style={styles.profileMetric}><Text style={styles.profileMetricValue}>{value}</Text><Text style={styles.profileMetricLabel}>{label}</Text></View>; }

function SettingRow({ detail, icon, label, value }: { detail: string; icon: IconName; label: string; value: string }) {
  return (
    <View style={styles.settingRow}>
      <HeatIcon name={icon} size={19} tintColor={Palette.ink} />
      <View style={styles.flexOne}><Text style={styles.settingLabel}>{label}</Text><Text style={styles.settingDetail}>{detail}</Text></View>
      <Text style={styles.settingValue}>{value}</Text>
      <HeatIcon name={icons.arrow} size={16} tintColor={Palette.inkMuted} />
    </View>
  );
}

const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  contextLine: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 11, lineHeight: 16, marginTop: Spacing.two },
  riskHero: { borderRadius: Radius.large, marginTop: Spacing.five, minHeight: 278, overflow: 'hidden', padding: Spacing.five },
  riskTopline: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  riskLocation: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 13 },
  riskSource: { color: 'rgba(27,28,25,0.63)', fontFamily: Fonts.medium, fontSize: 10, marginTop: 2 },
  sunBubble: { alignItems: 'center', backgroundColor: 'rgba(255,253,248,0.58)', borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  riskMain: { alignItems: 'flex-end', flexDirection: 'row', marginTop: Spacing.six },
  riskNumber: { color: Palette.ink, fontFamily: Fonts.extrabold, fontSize: 74, letterSpacing: -4, lineHeight: 75 },
  riskMainCopy: { marginLeft: Spacing.two, paddingBottom: 10 },
  riskUnit: { color: Palette.ink, fontFamily: Fonts.semibold, fontSize: 12 },
  riskZone: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 17, marginTop: 3 },
  riskMessage: { color: 'rgba(27,28,25,0.76)', fontFamily: Fonts.medium, fontSize: 12, lineHeight: 17, marginTop: Spacing.three, maxWidth: 290 },
  trend: { justifyContent: 'center', marginTop: Spacing.two, overflow: 'hidden', width: '100%' },
  trendLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  trendLabel: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 9 },
  ruleStrip: { backgroundColor: Palette.surface, borderColor: Palette.border, borderRadius: Radius.large, borderWidth: 1, flexDirection: 'row', overflow: 'hidden' },
  rule: { alignItems: 'flex-start', borderRightColor: Palette.border, borderRightWidth: StyleSheet.hairlineWidth, flex: 1, minHeight: 112, padding: Spacing.three },
  ruleLabel: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 9, marginTop: Spacing.two },
  ruleValue: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 11, lineHeight: 15, marginTop: 3 },
  listCard: { backgroundColor: Palette.surface, borderColor: Palette.border, borderRadius: Radius.large, borderWidth: 1, overflow: 'hidden' },
  personRow: { alignItems: 'center', borderBottomColor: Palette.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: Spacing.three, minHeight: 72, paddingHorizontal: Spacing.four },
  personAvatar: { alignItems: 'center', borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  personInitials: { fontFamily: Fonts.bold, fontSize: 12 },
  personName: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 13 },
  personDetail: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 10, lineHeight: 14, marginTop: 2 },
  statusPill: { alignItems: 'center', borderRadius: Radius.pill, flexDirection: 'row', gap: 5, paddingHorizontal: 9, paddingVertical: 6 },
  statusDot: { borderRadius: 4, height: 6, width: 6 },
  statusText: { fontFamily: Fonts.bold, fontSize: 9 },
  teamOverview: { backgroundColor: Palette.surface, borderColor: Palette.border, borderRadius: Radius.large, borderWidth: 1, marginTop: Spacing.five, padding: Spacing.four },
  teamOverviewHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  teamOverviewValue: { color: Palette.ink, fontFamily: Fonts.extrabold, fontSize: 20, letterSpacing: -0.4 },
  teamOverviewDetail: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 10, lineHeight: 15, marginTop: 3 },
  teamLivePill: { alignItems: 'center', backgroundColor: '#E7EFE9', borderRadius: Radius.pill, flexDirection: 'row', gap: 5, paddingHorizontal: 9, paddingVertical: 6 },
  teamLiveDot: { backgroundColor: Palette.safe, borderRadius: 4, height: 7, width: 7 },
  teamLiveText: { color: Palette.safe, fontFamily: Fonts.bold, fontSize: 9 },
  distributionTrack: { flexDirection: 'row', gap: 3, height: 10, marginTop: Spacing.four, overflow: 'hidden' },
  distributionSegment: { borderRadius: Radius.pill, minWidth: 8 },
  distributionLegend: { flexDirection: 'row', gap: Spacing.four, marginTop: Spacing.three },
  distributionLabel: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  distributionDot: { borderRadius: 4, height: 7, width: 7 },
  distributionText: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 9 },
  distributionValue: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 9 },
  filterRow: { flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.three },
  filterChip: { alignItems: 'center', borderColor: Palette.border, borderRadius: Radius.pill, borderWidth: 1, justifyContent: 'center', minHeight: 35, paddingHorizontal: Spacing.three },
  filterChipActive: { backgroundColor: Palette.ink, borderColor: Palette.ink },
  filterChipText: { color: Palette.inkMuted, fontFamily: Fonts.semibold, fontSize: 10 },
  filterChipTextActive: { color: Palette.surface, fontFamily: Fonts.bold },
  rosterFooter: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 9, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, textAlign: 'center' },
  triageCard: { backgroundColor: Palette.surface, borderColor: Palette.border, borderRadius: Radius.large, borderWidth: 1, marginTop: Spacing.five, padding: Spacing.five },
  triageHeader: { alignItems: 'center', flexDirection: 'row', gap: Spacing.three },
  triageIcon: { alignItems: 'center', backgroundColor: Palette.warning, borderRadius: 20, height: 42, justifyContent: 'center', width: 42 },
  triageLabel: { color: Palette.inkMuted, fontFamily: Fonts.semibold, fontSize: 10 },
  triageName: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 16, marginTop: 2 },
  triageSummary: { color: Palette.ink, fontFamily: Fonts.medium, fontSize: 12, lineHeight: 18 },
  triageMetrics: { borderTopColor: Palette.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', marginTop: Spacing.four, paddingTop: Spacing.four },
  miniMetric: { flex: 1 },
  miniMetricValue: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 14 },
  miniMetricLabel: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 9, marginTop: 2 },
  bentoGrid: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.five },
  bentoPrimary: { borderRadius: Radius.large, flex: 1.35, minHeight: 236, overflow: 'hidden', padding: Spacing.four },
  bentoTopline: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  bentoLabel: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 12 },
  bentoNumber: { color: Palette.ink, fontFamily: Fonts.extrabold, fontSize: 62, letterSpacing: -3, lineHeight: 66, marginTop: Spacing.six },
  bentoZone: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 16 },
  bentoHint: { color: 'rgba(27,28,25,0.64)', fontFamily: Fonts.medium, fontSize: 10, marginTop: 3 },
  bentoStack: { flex: 1, gap: Spacing.three },
  metricTile: { backgroundColor: Palette.surface, borderColor: Palette.border, borderRadius: Radius.medium, borderWidth: 1, flex: 1, justifyContent: 'center', padding: Spacing.three },
  metricTileLabel: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 9, marginTop: Spacing.two },
  metricTileValue: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 13, marginTop: 2 },
  weeklyCard: { backgroundColor: Palette.surface, borderColor: Palette.border, borderRadius: Radius.large, borderWidth: 1, marginTop: Spacing.four, padding: Spacing.four },
  weeklyHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  cardLabel: { color: Palette.inkMuted, fontFamily: Fonts.semibold, fontSize: 10 },
  weeklyTitle: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 16, marginTop: 2 },
  weeklyStatus: { color: Palette.safe, fontFamily: Fonts.bold, fontSize: 11 },
  weekBars: { alignItems: 'flex-end', flexDirection: 'row', gap: 9, height: 104, marginTop: Spacing.four },
  weekBarSlot: { alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end' },
  weekBar: { backgroundColor: Palette.coral, borderRadius: Radius.pill, maxHeight: 78, minHeight: 20, width: 17 },
  weekDay: { color: Palette.inkMuted, fontFamily: Fonts.semibold, fontSize: 9, marginTop: 6 },
  sessionFeature: { alignItems: 'center', backgroundColor: '#E8EBE5', borderRadius: Radius.large, flexDirection: 'row', gap: Spacing.three, minHeight: 88, padding: Spacing.four },
  sessionIcon: { alignItems: 'center', backgroundColor: Palette.surface, borderRadius: 22, height: 46, justifyContent: 'center', width: 46 },
  sessionTitle: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 14 },
  sessionMeta: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 10, marginTop: 3 },
  timelineCard: { backgroundColor: Palette.surface, borderColor: Palette.border, borderRadius: Radius.large, borderWidth: 1, padding: Spacing.four },
  timelineRow: { flexDirection: 'row', minHeight: 84 },
  timelineTime: { color: Palette.inkMuted, fontFamily: Fonts.bold, fontSize: 11, width: 42 },
  timelineTrack: { alignItems: 'center', width: 24 },
  timelineDot: { borderRadius: 6, height: 11, width: 11 },
  timelineLine: { backgroundColor: Palette.border, flex: 1, marginVertical: 4, width: 2 },
  timelineCopy: { flex: 1, paddingBottom: Spacing.four, paddingLeft: Spacing.two },
  timelineTitle: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 13 },
  timelineDetail: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 10, lineHeight: 15, marginTop: 3 },
  summaryRow: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.five },
  summaryBlock: { backgroundColor: Palette.surface, borderColor: Palette.border, borderRadius: Radius.medium, borderWidth: 1, flex: 1, padding: Spacing.four },
  summaryValue: { fontFamily: Fonts.extrabold, fontSize: 28 },
  summaryLabel: { color: Palette.inkMuted, fontFamily: Fonts.semibold, fontSize: 10, marginTop: 2 },
  disclaimer: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 10, lineHeight: 15, marginHorizontal: Spacing.two, marginTop: Spacing.four },
  emergencyCard: { borderRadius: Radius.large, marginTop: Spacing.five, padding: Spacing.five },
  emergencyTopline: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  emergencyTime: { color: Palette.surface, fontFamily: Fonts.semibold, fontSize: 11 },
  emergencyTitle: { color: Palette.surface, fontFamily: Fonts.extrabold, fontSize: 25, letterSpacing: -0.5, lineHeight: 30, marginTop: Spacing.six },
  emergencyBody: { color: 'rgba(255,253,248,0.82)', fontFamily: Fonts.medium, fontSize: 12, lineHeight: 18, marginTop: Spacing.three },
  emergencyAction: { alignItems: 'center', backgroundColor: Palette.surface, borderRadius: Radius.pill, height: 48, justifyContent: 'center', marginTop: Spacing.five },
  emergencyActionText: { color: Palette.emergency, fontFamily: Fonts.bold, fontSize: 13 },
  historyRow: { alignItems: 'center', borderBottomColor: Palette.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: Spacing.three, minHeight: 74, paddingHorizontal: Spacing.four },
  historyIcon: { alignItems: 'center', borderRadius: 18, height: 38, justifyContent: 'center', width: 38 },
  historyTime: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 9 },
  monitorCard: { backgroundColor: Palette.surface, borderColor: Palette.border, borderRadius: Radius.large, borderWidth: 1, marginTop: Spacing.five, padding: Spacing.five },
  monitorHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  monitorValue: { color: Palette.ink, fontFamily: Fonts.extrabold, fontSize: 34, letterSpacing: -1, marginTop: 4 },
  monitorUnit: { color: Palette.inkMuted, fontFamily: Fonts.semibold, fontSize: 12 },
  monitorInterpretation: { color: Palette.ink, fontFamily: Fonts.medium, fontSize: 12, lineHeight: 18 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  signalCard: { backgroundColor: Palette.surface, borderColor: Palette.border, borderRadius: Radius.medium, borderWidth: 1, minHeight: 150, padding: Spacing.four, width: '48%' },
  signalTop: { alignItems: 'center', flexDirection: 'row', gap: Spacing.two },
  signalLabel: { color: Palette.inkMuted, fontFamily: Fonts.semibold, fontSize: 10 },
  signalValue: { color: Palette.ink, fontFamily: Fonts.extrabold, fontSize: 24, marginTop: Spacing.four },
  tinyBars: { alignItems: 'flex-end', flexDirection: 'row', gap: 5, height: 38, marginTop: Spacing.three },
  tinyBar: { borderRadius: Radius.pill, flex: 1, opacity: 0.9 },
  protocolEmergency: { alignItems: 'center', borderRadius: Radius.large, flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.five, padding: Spacing.four },
  protocolEmergencyIcon: { alignItems: 'center', backgroundColor: Palette.surface, borderRadius: 21, height: 44, justifyContent: 'center', width: 44 },
  protocolEmergencyLabel: { color: 'rgba(255,253,248,0.78)', fontFamily: Fonts.semibold, fontSize: 9, lineHeight: 13 },
  protocolEmergencyTitle: { color: Palette.surface, fontFamily: Fonts.bold, fontSize: 15, lineHeight: 19, marginTop: 3 },
  nativeSegmentedControl: { height: 40, marginTop: Spacing.four, width: '100%' },
  protocolCard: { backgroundColor: Palette.surface, borderColor: Palette.border, borderRadius: Radius.large, borderWidth: 1, marginTop: Spacing.three, padding: Spacing.four },
  protocolRow: { alignItems: 'flex-start', flexDirection: 'row', gap: Spacing.three },
  protocolIndex: { alignItems: 'center', borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  protocolIndexText: { color: Palette.surface, fontFamily: Fonts.bold, fontSize: 13 },
  protocolTitle: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 14 },
  protocolBody: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 11, lineHeight: 17, marginTop: 4 },
  protocolDivider: { backgroundColor: Palette.border, height: StyleSheet.hairlineWidth, marginVertical: Spacing.four },
  eapAction: { alignItems: 'center', backgroundColor: Palette.surface, borderColor: Palette.border, borderRadius: Radius.medium, borderWidth: 1, flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.three, padding: Spacing.three },
  eapActionIcon: { alignItems: 'center', backgroundColor: Palette.emergency, borderRadius: 18, height: 38, justifyContent: 'center', width: 38 },
  eapActionTitle: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 12 },
  eapActionDetail: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 9, marginTop: 2 },
  protocolNotice: { alignItems: 'flex-start', backgroundColor: Palette.surfaceMuted, borderRadius: Radius.medium, flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.four, padding: Spacing.four },
  protocolNoticeText: { color: Palette.inkMuted, flex: 1, fontFamily: Fonts.medium, fontSize: 10, lineHeight: 15 },
  statusHero: { alignItems: 'center', backgroundColor: '#E7EFE9', borderRadius: Radius.large, marginTop: Spacing.five, padding: Spacing.six },
  statusRing: { alignItems: 'center', backgroundColor: Palette.surface, borderRadius: 38, height: 76, justifyContent: 'center', width: 76 },
  statusHeroTitle: { color: Palette.ink, fontFamily: Fonts.extrabold, fontSize: 23, letterSpacing: -0.5, lineHeight: 28, marginTop: Spacing.four, textAlign: 'center' },
  statusHeroBody: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 11, lineHeight: 17, marginTop: Spacing.two, textAlign: 'center' },
  sessionRow: { alignItems: 'center', borderBottomColor: Palette.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: Spacing.three, minHeight: 76, paddingHorizontal: Spacing.four },
  sessionDate: { alignItems: 'center', backgroundColor: Palette.surfaceMuted, borderRadius: 14, height: 42, justifyContent: 'center', width: 50 },
  sessionDateText: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 9 },
  sessionStats: { borderTopColor: Palette.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', marginTop: Spacing.three, paddingTop: Spacing.four },
  learnAlert: { alignItems: 'flex-start', backgroundColor: '#FBE4DE', borderRadius: Radius.medium, flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.five, padding: Spacing.four },
  learnAlertTitle: { color: Palette.emergency, fontFamily: Fonts.bold, fontSize: 13 },
  learnAlertBody: { color: Palette.ink, fontFamily: Fonts.medium, fontSize: 10, lineHeight: 15, marginTop: 3 },
  guideCard: { backgroundColor: Palette.surface, borderColor: Palette.border, borderRadius: Radius.large, borderWidth: 1, marginTop: Spacing.three, minHeight: 112, padding: Spacing.four },
  guideCardExpanded: { borderColor: '#CFC7B8' },
  guideTopline: { alignItems: 'center', flexDirection: 'row', gap: Spacing.three },
  guideIcon: { alignItems: 'center', borderRadius: 22, height: 46, justifyContent: 'center', width: 46 },
  guideTitle: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 14 },
  guideBody: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 10, lineHeight: 15, marginTop: 4 },
  guideDisclosure: { transform: [{ rotate: '0deg' }] },
  guideDisclosureExpanded: { transform: [{ rotate: '90deg' }] },
  guideDetail: { flexDirection: 'row', gap: Spacing.three, marginLeft: 58, marginTop: Spacing.three, paddingTop: Spacing.three },
  guideDetailRule: { borderRadius: Radius.pill, width: 3 },
  guideDetailText: { color: Palette.ink, flex: 1, fontFamily: Fonts.medium, fontSize: 10, lineHeight: 16 },
  profileIdentity: { alignItems: 'center', flexDirection: 'row', gap: Spacing.four, marginTop: Spacing.five, paddingHorizontal: Spacing.two },
  avatar: { alignItems: 'center', backgroundColor: Palette.coral, borderRadius: 28, height: 56, justifyContent: 'center', width: 56 },
  avatarText: { color: Palette.surface, fontFamily: Fonts.extrabold, fontSize: 17 },
  profileName: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 17 },
  profileRole: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 11, marginTop: 3 },
  profileEdit: { alignItems: 'center', borderColor: Palette.ink, borderRadius: Radius.pill, borderWidth: 1, justifyContent: 'center', minHeight: 34, paddingHorizontal: Spacing.three },
  profileEditText: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 10 },
  profileMetrics: { backgroundColor: Palette.surface, borderColor: Palette.border, borderRadius: Radius.medium, borderWidth: 1, flexDirection: 'row', marginTop: Spacing.five, overflow: 'hidden' },
  profileMetric: { alignItems: 'center', borderRightColor: Palette.border, borderRightWidth: StyleSheet.hairlineWidth, flex: 1, justifyContent: 'center', minHeight: 78 },
  profileMetricValue: { color: Palette.ink, fontFamily: Fonts.extrabold, fontSize: 20 },
  profileMetricLabel: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 9, marginTop: 3 },
  profileConnection: { alignItems: 'center', borderRadius: Radius.medium, flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.three, padding: Spacing.four },
  profileConnectionTitle: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 12 },
  profileConnectionDetail: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 9, marginTop: 3 },
  settingRow: { alignItems: 'center', borderBottomColor: Palette.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: Spacing.three, minHeight: 72, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three },
  settingLabel: { color: Palette.ink, fontFamily: Fonts.semibold, fontSize: 12 },
  settingDetail: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 9, lineHeight: 13, marginTop: 2 },
  settingValue: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 10 },
  pressed: { opacity: 0.68 },
});
