import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { createContext, useContext, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { LargeTitle, SectionHeader, type DashboardRole } from '@/components/dashboard-shell';
import { HeatIcon } from '@/components/heat-icon';
import { AlertsTab } from '@/components/alerts-tab';
import { PlanTab, ProfileTab, TeamTab } from '@/components/coach-tabs';
import { CoachToday } from '@/components/coach-today';
import { SlidingTabs } from '@/components/sliding-tabs';
import { BarChart, LineChart } from '@/components/ui/charts';
import { BaselineChart, DateTile, PhotoBanner, RingAvatar, Ring, Spark, StatStrip, Timeline } from '@/components/ui/visuals';
import { Card, CardHeader, Group, Row, TextLink, textStyles } from '@/components/ui/list';
import { Palette, Spacing, Type } from '@/constants/theme';
import { TODAY, ZONES } from '@/lib/practice';
import { ensureTeamInvite, getMyTeamInvite } from '@/services/team-invites';
import { useTeamDraft, type TeamDraft } from '@/state/onboarding';
import { usePreferences, useTemperature } from '@/state/preferences';

type IconName = ComponentProps<typeof HeatIcon>['name'];

const icons = {
  check: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  heart: { ios: 'heart.fill', android: 'favorite', web: 'favorite' },
  medical: { ios: 'cross.case.fill', android: 'medical_services', web: 'medical_services' },
  phone: { ios: 'phone.fill', android: 'call', web: 'call' },
  sun: { ios: 'sun.max.fill', android: 'sunny', web: 'sunny' },
  warning: { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
} as const satisfies Record<string, IconName>;

const roster = [
  { name: 'Maya Chen', detail: 'Recovery stalled for 6 min', status: 'Review', tone: Palette.warning },
  { name: 'Jordan Lee', detail: 'Hydration break acknowledged', status: 'Caution', tone: Palette.caution },
  { name: 'Avery Davis', detail: 'Within baseline', status: 'Normal', tone: Palette.safe },
  { name: 'Sofia Patel', detail: 'Break completed 2 min ago', status: 'Normal', tone: Palette.safe },
  { name: 'Noah Williams', detail: 'No band · field plan only', status: 'Normal', tone: Palette.safe },
  { name: 'Eli Brooks', detail: 'Within baseline', status: 'Normal', tone: Palette.safe },
];

// Hourly readings from 7 AM up to now (4:10 PM). There is no forecast, so the line stops at the latest reading.
const HOURLY_WBGT = [62, 64, 67, 71, 75, 79, 82, 84, 84];
const RECOVERY_BPM = [96, 112, 131, 148, 158, 156, 152, 147, 142];

/** Lets a section's "Show All" link switch tabs without threading props through every screen. */
const NavContext = createContext<(tab: string) => void>(() => {});

/** The team this coach set up during onboarding, with the sample school as a stand-in until they do. */
function useTeam() {
  const draft = useTeamDraft();
  return { draft, school: draft.school.trim() || 'Liberty High School', name: draft.teamName.trim() || 'Liberty Patriots' };
}

export async function shareTeamCode(draft: TeamDraft) {
  try {
    // A coach who already created a team shares that team's active code; otherwise use the setup draft.
    const existing = await getMyTeamInvite();
    const complete = Boolean(draft.school.trim() && draft.teamName.trim() && draft.sport && draft.level);
    if (!existing && !complete) {
      Alert.alert('No team code yet', 'Create your team during setup to get a code athletes can join with.');
      return;
    }
    const teamName = existing ? existing.team.teamName : draft.teamName;
    const invite = existing
      ? existing.invite
      : await ensureTeamInvite({ school: draft.school, teamName: draft.teamName, sport: draft.sport!, level: draft.level! });
    await Share.share({ message: `Join ${teamName} on HeatSense with the code ${invite.code}.` });
  } catch {
    Alert.alert('Couldn’t share the code', 'Check your connection and try again.');
  }
}

export function DashboardContent({ onNavigate, role, tab }: { onNavigate?: (tab: string) => void; role: DashboardRole; tab: string }) {
  const content = role === 'coach' ? <CoachContent tab={tab} /> : role === 'trainer' ? <TrainerContent tab={tab} /> : <AthleteContent tab={tab} />;
  return <NavContext.Provider value={onNavigate ?? (() => {})}>{content}</NavContext.Provider>;
}

function CoachContent({ tab }: { tab: string }) {
  const go = useContext(NavContext);
  if (tab === 'plan') return <><LargeTitle title="Plan" /><PlanTab /></>;
  if (tab === 'team') return <><LargeTitle title="Team" /><TeamTab /></>;
  if (tab === 'alerts') return <><LargeTitle title="Alerts" /><AlertsTab onNavigate={go} /></>;
  if (tab === 'profile') return <><LargeTitle title="Profile" /><ProfileTab role="Coach" /></>;
  return <CoachHome />;
}

function TrainerContent({ tab }: { tab: string }) {
  if (tab === 'monitor') return <MonitorScreen />;
  if (tab === 'athletes') return <RosterScreen title="Athletes" variant="trainer" />;
  if (tab === 'protocols') return <ProtocolsScreen />;
  if (tab === 'profile') return <><LargeTitle title="Profile" /><ProfileTab role="Athletic trainer" /></>;
  return <TrainerHome />;
}

function AthleteContent({ tab }: { tab: string }) {
  if (tab === 'status') return <StatusScreen />;
  if (tab === 'sessions') return <SessionsScreen />;
  if (tab === 'learn') return <LearnScreen />;
  if (tab === 'profile') return <><LargeTitle title="Profile" /><ProfileTab role="Athlete" /></>;
  return <AthleteHome />;
}

/* ─────────────────────────────── Home screens ─────────────────────────────── */


/** Coach Home: the WHOOP-style orb, practice rings, get-started cards and today's readings. */
function CoachHome() {
  const { draft } = useTeam();
  return (
    <>
      <LargeTitle title="Today" />
      <CoachToday onInvite={() => shareTeamCode(draft)} />
    </>
  );
}

function TrainerHome() {
  const go = useContext(NavContext);
  const temp = useTemperature();
  return (
    <>
      <LargeTitle title="Today" />
      <Card style={styles.firstBlock}>
        <CardHeader icon={icons.heart} label="Heart-rate recovery" onPress={() => go('monitor')} tone={Palette.emergency} trailing="6 min ago" />
        <Text style={styles.cardName}>Maya Chen</Text>
        <Text style={styles.cardBody}>Heart rate is still elevated and movement is low during the water break.</Text>
        <LineChart labels={['Break started', 'Now']} summary="Heart rate over the last break, still elevated" tone={Palette.emergency} values={RECOVERY_BPM} />
        <View style={styles.statRow}>
          <Stat label="Recovery" value="+24 bpm" />
          <Stat label="Resting" value="6 min" />
          <Stat label="Skin" value={temp.delta(0.8)} />
        </View>
      </Card>

      <SectionHeader action="Show All" onActionPress={() => go('athletes')} title="Review queue" />
      <Group inset={68}>
        {roster.slice(0, 3).map((item) => <PersonRow key={item.name} {...item} />)}
      </Group>
    </>
  );
}

function AthleteHome() {
  const go = useContext(NavContext);
  return (
    <>
      <LargeTitle title="Today" />
      <Text style={styles.contextLine}>Varsity practice at 4:10 PM</Text>
      <View style={styles.block}><FieldCard /></View>

      <View style={styles.block}>
        <Group>
          <Row title="Hydration" value="2 breaks so far" />
          <Row title="Recovery" value="On baseline" />
        </Group>
      </View>

      <SectionHeader title="This week" />
      <Card>
        <CardHeader icon={icons.sun} label="Heat exposure" trailing="Steady" />
        <BarChart highlight={1} labels={['M', 'T', 'W', 'T', 'F', 'S', 'S']} summary="Heat exposure this week. Tuesday is today." tone={Palette.warning} values={[42, 66, 52, 78, 36, 61, 73]} />
      </Card>

      <SectionHeader action="Show All" onActionPress={() => go('sessions')} title="Recent practice" />
      <Group>
        <SessionRow date="Mon" detail="4:10 – 5:22 PM" title="Varsity conditioning" />
      </Group>
    </>
  );
}

/** Today's field reading: the one card every role shares. The figure, how it got there, and what it means. */
export function FieldCard({ onPress, showZone = true }: { onPress?: () => void; showZone?: boolean }) {
  const temp = useTemperature();
  const { refreshedAt } = usePreferences();
  const latest = HOURLY_WBGT[HOURLY_WBGT.length - 1];
  // A change in whole degrees, in the user's unit: "+5°".
  const wholeDelta = (fahrenheit: number) => `${fahrenheit < 0 ? '−' : '+'}${Math.abs(Math.round(temp.value(32 + fahrenheit) - temp.value(32)))}°`;
  const threeHoursAgo = HOURLY_WBGT[HOURLY_WBGT.length - 4];
  return (
    <Card>
      <CardHeader icon={icons.sun} label="Field WBGT" onPress={onPress} tone={Palette.warning} trailing="Memorial Stadium" />
      <View style={styles.fieldTop}>
        <View style={styles.valueRow}>
          <Text style={styles.heroValue}>{temp.value(TODAY.wbgtF)}</Text>
          <Text style={styles.heroUnit}>{temp.unit}</Text>
        </View>
        <View style={styles.fieldTrend}>
          {showZone ? <Text style={[styles.zoneLine, { color: ZONES[TODAY.zone].text }]}>{ZONES[TODAY.zone].label}</Text> : null}
          <Text style={styles.fieldTrendText}>{wholeDelta(latest - HOURLY_WBGT[0])} since 7 AM</Text>
        </View>
      </View>
      <Text style={styles.cardBody}>Modify work and rest before athletes take the field.</Text>
      <LineChart
        format={(value) => `${temp.value(value)}°`}
        labels={['7 AM', '11 AM', 'Now']}
        max={88}
        min={60}
        summary={`Hourly WBGT today, rising from ${temp.value(HOURLY_WBGT[0])} to ${temp.value(latest)} degrees by 4 PM.`}
        tone={Palette.warning}
        values={HOURLY_WBGT}
      />
      <View style={styles.statRow}>
        <Stat label="Peak today" value={`${temp.value(Math.max(...HOURLY_WBGT))}°`} />
        <Stat label="Last 3 hours" value={wholeDelta(latest - threeHoursAgo)} />
        <Stat label="Updated" value={refreshedAt ? 'Now' : '2 min'} />
      </View>
    </Card>
  );
}

/** Kept for the coach workspace route, which still imports it. */
export function RiskHero(_props: { mode: 'coach' }) {
  return <FieldCard />;
}

/* ─────────────────────────────── Other screens ─────────────────────────────── */

const TEAM_PHOTO = require('@/assets/images/home/plan-hero.webp');

function RosterScreen({ title, variant }: { title: string; variant: 'coach' | 'trainer' }) {
  const { name: teamName } = useTeam();
  const [filter, setFilter] = useState<'all' | 'attention' | 'normal'>(variant === 'trainer' ? 'attention' : 'all');
  const visible = roster.filter((item) => {
    if (filter === 'attention') return item.status !== 'Normal';
    if (filter === 'normal') return item.status === 'Normal';
    return true;
  });
  const index = filter === 'all' ? 0 : filter === 'attention' ? 1 : 2;

  return (
    <>
      <LargeTitle title={title} />
      <View style={styles.firstBlock}>
        <PhotoBanner height={150} source={TEAM_PHOTO} subtitle="Varsity · 24 athletes" title={teamName} />
      </View>

      <Card style={styles.readiness}>
        <Ring segments={[{ color: Palette.safe, value: 21 }, { color: Palette.caution, value: 2 }, { color: Palette.warning, value: 1 }]} size={112} stroke={12} summary="21 of 24 athletes within plan, 2 on caution, 1 to review">
          <Text style={styles.ringNumber}>21</Text>
          <Text style={styles.ringOf}>of 24</Text>
        </Ring>
        <View style={styles.readinessCopy}>
          <Text style={styles.readinessTitle}>{variant === 'coach' ? 'Within plan' : '2 to review'}</Text>
          <Text style={styles.readinessSub}>{variant === 'coach' ? '3 need a follow-up today' : 'Sorted by recovery and movement'}</Text>
          <View style={styles.legendCol}>
            <Legend label="Normal" tone={Palette.safe} value="21" />
            <Legend label="Caution" tone={Palette.caution} value="2" />
            <Legend label="Review" tone={Palette.warning} value="1" />
          </View>
        </View>
      </Card>

      <View style={styles.block}>
        <SlidingTabs
          label="Filter athletes"
          onChange={(value) => setFilter(value === 1 ? 'attention' : value === 2 ? 'normal' : 'all')}
          options={['All', 'Needs attention', 'Normal']}
          selected={index}
        />
      </View>
      <View style={styles.block}>
        <Group inset={72}>
          {visible.map((item) => <PersonRow key={item.name} {...item} />)}
        </Group>
      </View>
      <Text style={styles.footnote}>Wristband signals appear only for athletes who have paired a band and shared session data.</Text>
    </>
  );
}



function MonitorScreen() {
  const temp = useTemperature();
  return (
    <>
      <LargeTitle title="Monitor" />
      <Text style={styles.contextLine}>Maya Chen · compared with her own baseline</Text>

      <LinearGradient colors={['#3A1614', '#1E1112']} style={[styles.block, styles.incidentHero]}>
        <View style={styles.incidentTop}>
          <RingAvatar color={Palette.emergency} name="Maya Chen" size={48} />
          <View style={styles.flexOne}>
            <Text style={styles.incidentName}>Heart-rate recovery</Text>
            <Text numberOfLines={1} style={styles.incidentMeta}>6 min into break</Text>
          </View>
          <View style={styles.needsPill}><Text style={styles.needsPillText}>Review</Text></View>
        </View>
        <View style={styles.incidentNumbers}>
          <Text style={styles.incidentBpm}>142</Text>
          <View>
            <Text style={styles.incidentUnit}>bpm</Text>
            <Text style={styles.incidentOver}>32 over her usual</Text>
          </View>
        </View>
        <BaselineChart band={[80, 110]} color={Palette.emergency} labels={['Break started', 'Now']} summary="Maya's heart rate during the break, still above her usual range" values={RECOVERY_BPM} />
      </LinearGradient>

      <SectionHeader title="Other signals" />
      <Group>
        <SignalRow label="Skin trend" spark={[1, 2, 2, 3, 3, 4, 5]} tone={Palette.warning} value={temp.delta(0.8)} />
        <SignalRow label="Sweat trend" spark={[2, 2, 3, 3, 4, 4, 5]} tone={Palette.info} value="+11%" />
        <SignalRow label="Movement" spark={[5, 4, 3, 2, 2, 1, 1]} tone={Palette.warning} value="Low" />
        <SignalRow label="Break time" spark={[1, 2, 3, 4, 5, 6, 7]} tone={Palette.inkMuted} value="6 min" />
      </Group>
      <Text style={styles.footnote}>Signals are compared with Maya’s own baseline and need a person’s judgment. HeatSense does not diagnose heat illness.</Text>
    </>
  );
}

function SignalRow({ label, spark, tone, value }: { label: string; spark: number[]; tone: string; value: string }) {
  return (
    <Row
      leading={<Spark color={tone} values={spark} width={56} />}
      metric
      title={label}
      value={value}
      valueTone={tone === Palette.inkMuted ? undefined : tone}
    />
  );
}

function ProtocolsScreen() {
  const [mode, setMode] = useState<'immediate' | 'recovery'>('immediate');
  const steps = mode === 'immediate'
    ? [
        ['Stop activity', 'Move the athlete to shade or a cooled area.', Palette.emergency],
        ['Assess right away', 'Check responsiveness and follow the school’s emergency procedures.', Palette.warning],
        ['Escalate when needed', 'Call emergency services for collapse or suspected heat stroke.', Palette.caution],
      ]
    : [
        ['Stay with the athlete', 'Keep supervising. Do not allow a return to activity.', Palette.warning],
        ['Track recovery', 'Record symptoms, cooling steps and how the athlete responds.', Palette.caution],
        ['Follow clearance policy', 'Use district and medical guidance before any return to play.', Palette.safe],
      ];
  const call911 = () =>
    Alert.alert('Call 911?', 'This places a real phone call.', [
      { style: 'cancel', text: 'Cancel' },
      { onPress: () => Linking.openURL('tel:911'), style: 'destructive', text: 'Call 911' },
    ]);

  return (
    <>
      <LargeTitle title="Protocols" />
      <LinearGradient colors={['#3A1614', '#1E1112']} style={[styles.firstBlock, styles.incidentHero]}>
        <View style={styles.categoryRow}>
          <HeatIcon name={icons.medical} size={16} tintColor={Palette.emergency} weight="semibold" />
          <Text style={[styles.categoryLabel, { color: Palette.emergency }]}>Emergency</Text>
        </View>
        <Text style={styles.sosTitle}>Collapse, confusion, or loss of consciousness</Text>
        <Text style={styles.sosBody}>Activate the emergency action plan now.</Text>
        <Pressable accessibilityLabel="Call 911" accessibilityRole="button" onPress={call911} style={({ pressed }) => [styles.sosButton, pressed && styles.pressed]}>
          <HeatIcon name={icons.phone} size={18} tintColor="#FFFFFF" weight="semibold" />
          <Text style={styles.sosButtonText}>Call 911</Text>
        </Pressable>
      </LinearGradient>

      <View style={styles.block}>
        <SegmentedControl
          appearance="dark"
          onValueChange={(value) => setMode(value === 'Recovery check' ? 'recovery' : 'immediate')}
          selectedIndex={mode === 'immediate' ? 0 : 1}
          style={styles.segmented}
          values={['Immediate response', 'Recovery check']}
        />
      </View>
      <View style={styles.block}>
        <Timeline items={steps.map(([title, detail, color], index) => ({ color, detail, mark: String(index + 1), time: `Step ${index + 1}`, title }))} />
      </View>
      <Text style={styles.footnote}>This quick reference supports, but does not replace, district emergency action plans or clinical judgment.</Text>
    </>
  );
}

function StatusScreen() {
  const temp = useTemperature();
  return (
    <>
      <LargeTitle title="My status" />
      <Text style={styles.contextLine}>Compared with your own baseline</Text>
      <View style={styles.statusHero}>
        <Ring segments={[{ color: Palette.safe, value: 1 }]} size={150} stroke={14} summary="Your signals are within your usual range">
          <HeatIcon name={icons.check} size={44} tintColor={Palette.safe} />
        </Ring>
        <Text style={styles.statusTitle}>Within your usual range</Text>
        <Text style={styles.statusBody}>Keep following today’s Orange-zone plan and take every scheduled water break.</Text>
      </View>

      <SectionHeader title="Today’s signals" />
      <Group>
        <SignalRow label="Heart-rate recovery" spark={[5, 4, 4, 3, 3, 3, 2]} tone={Palette.safe} value="Normal" />
        <SignalRow label="Skin trend" spark={[2, 2, 3, 2, 3, 3, 3]} tone={Palette.inkMuted} value={temp.delta(0.3)} />
        <SignalRow label="Sweat trend" spark={[2, 3, 3, 3, 4, 3, 4]} tone={Palette.inkMuted} value="+4%" />
        <SignalRow label="Exertion" spark={[1, 2, 3, 4, 4, 5, 5]} tone={Palette.inkMuted} value="Moderate" />
      </Group>

      <SectionHeader title="This week" />
      <Card>
        <CardHeader icon={icons.heart} label="Recovery time" trailing="8 min average" />
        <LineChart labels={['Mon', 'Today']} max={12} min={0} summary="Minutes to recover after breaks this week, steady at about 8" tone={Palette.safe} values={[9, 8, 9, 8, 7, 8, 8]} />
      </Card>
    </>
  );
}

const SESSIONS = [
  { day: '15', detail: '72 min · Orange zone', month: 'Sep', title: 'Varsity conditioning', zone: Palette.warning },
  { day: '13', detail: '58 min · Yellow zone', month: 'Sep', title: 'Technical practice', zone: Palette.caution },
  { day: '11', detail: '81 min · Orange zone', month: 'Sep', title: 'Scrimmage', zone: Palette.warning },
];

function SessionsScreen() {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  return (
    <>
      <LargeTitle title="Sessions" />
      <View style={styles.block}>
        <SegmentedControl
          appearance="dark"
          onValueChange={(value) => setPeriod(value === '4 weeks' ? 'month' : 'week')}
          selectedIndex={period === 'week' ? 0 : 1}
          style={styles.segmented}
          values={['7 days', '4 weeks']}
        />
      </View>
      <View style={styles.sessionsHero}>
        <Text style={styles.sessionsLabel}>Average recovery · {period === 'week' ? 'last 7 days' : 'last 4 weeks'}</Text>
        <View style={styles.valueRow}>
          <Text style={styles.heroValue}>{period === 'week' ? '8' : '9'}</Text>
          <Text style={styles.heroUnit}>min</Text>
        </View>
        <LineChart
          labels={period === 'week' ? ['Sep 9', 'Today'] : ['Aug 19', 'Today']}
          max={12}
          min={0}
          summary="Average recovery time, stable"
          tone={Palette.safe}
          values={period === 'week' ? [9, 8, 9, 8, 7, 8, 8] : [10, 9, 9, 10, 9, 8, 9, 9, 8]}
        />
        <View style={styles.planStats}>
          <StatStrip items={[{ label: 'Sessions', value: period === 'week' ? '3' : '11' }, { label: 'Alerts', value: period === 'week' ? '0' : '1' }, { label: 'Avg. length', value: '70 min' }]} />
        </View>
      </View>

      <SectionHeader title="Recent" />
      <Group inset={74}>
        {SESSIONS.map((item) => (
          <Row
            detail={item.detail}
            key={item.title}
            leading={<DateTile day={item.day} month={item.month} />}
            onPress={() => router.push({ pathname: '/detail', params: { kind: 'session', title: item.title } })}
            title={item.title}
            trailing={<View style={[styles.zoneDot, { backgroundColor: item.zone }]} />}
          />
        ))}
      </Group>
    </>
  );
}

const TOPICS = [
  { body: 'WBGT sets the team-wide safety plan, so everyone follows the same work, rest, water and equipment rules. Your coach adjusts them as conditions change.', icon: { ios: 'sun.max.fill', android: 'sunny', web: 'sunny' }, id: 'wbgt', title: 'What WBGT means' },
  { body: 'Use every scheduled break. Drink water, get into shade when you can, and notice whether your heart rate is settling.', icon: { ios: 'drop.fill', android: 'water_drop', web: 'water_drop' }, id: 'hydration', title: 'Hydration and recovery' },
  { body: 'Do not push through symptoms. Stop, find a coach or trainer, and stay with a teammate who needs help.', danger: true, icon: { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' }, id: 'speak', title: 'When to speak up' },
  { body: 'Headache, nausea, cramps, heavy sweating, dizziness or unusual tiredness are early warnings. Confusion, fainting or hot, dry skin is an emergency. Tell an adult right away.', danger: true, icon: { ios: 'thermometer.high', android: 'device_thermostat', web: 'device_thermostat' }, id: 'signs', title: 'Signs of heat illness' },
  { body: 'Light, loose, moisture-wicking clothes help. When your coach allows it, take off helmets and pads during breaks so you can cool down.', icon: { ios: 'tshirt.fill', android: 'checkroom', web: 'checkroom' }, id: 'dress', title: 'What to wear' },
  { body: 'Your body adapts to heat over roughly one to two weeks. Early-season practices are shorter and lighter on purpose, so don’t try to make up for it.', icon: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }, id: 'adapt', title: 'Getting used to the heat' },
] as const;

function LearnScreen() {
  const [open, setOpen] = useState<(typeof TOPICS)[number] | null>(null);
  return (
    <>
      <LargeTitle title="Learn" />
      <Text style={styles.contextLine}>Six things every athlete should know before the heat hits.</Text>
      <View style={styles.topicGrid}>
        {TOPICS.map((topic) => {
          const danger = 'danger' in topic && topic.danger;
          const tone = danger ? Palette.emergency : Palette.coral;
          return (
            <Pressable
              accessibilityLabel={topic.title}
              accessibilityRole="button"
              key={topic.id}
              onPress={() => setOpen(topic)}
              style={({ pressed }) => [styles.topic, danger && styles.topicDanger, pressed && styles.pressed]}>
              <View style={[styles.topicIcon, { backgroundColor: danger ? 'rgba(255,69,58,0.18)' : 'rgba(255,153,107,0.16)' }]}>
                <HeatIcon name={topic.icon} size={24} tintColor={tone} weight="semibold" />
              </View>
              <Text style={styles.topicTitle}>{topic.title}</Text>
            </Pressable>
          );
        })}
      </View>
      <Modal animationType="slide" onRequestClose={() => setOpen(null)} presentationStyle="pageSheet" visible={open !== null}>
        <View style={styles.sheet}>
          <View style={styles.sheetBar}>
            <Text style={styles.sheetTitle}>{open?.title}</Text>
            <TextLink label="Done" onPress={() => setOpen(null)} />
          </View>
          <ScrollView contentContainerStyle={styles.sheetContent}>
            <Text style={styles.sheetLead}>{open?.body}</Text>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

/* ─────────────────────────────── Building blocks ─────────────────────────────── */

function PersonRow({ detail, name, status, tone }: { detail: string; name: string; status: string; tone: string }) {
  const { compactRoster } = usePreferences();
  return (
    <Row
      accessibilityLabel={`${name}, ${status}. ${detail}`}
      detail={compactRoster ? undefined : detail}
      leading={<RingAvatar color={tone} name={name} size={44} />}
      onPress={() => router.push({ pathname: '/detail', params: { kind: 'athlete', name } })}
      title={name}
      value={status === 'Normal' ? undefined : status}
      valueTone={tone}
    />
  );
}

function SessionRow({ date, detail, title }: { date: string; detail: string; title: string }) {
  return (
    <Row
      detail={detail}
      onPress={() => router.push({ pathname: '/detail', params: { kind: 'session', title } })}
      title={title}
      value={date}
    />
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Legend({ label, tone, value }: { label: string; tone: string; value: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: tone }]} />
      <Text style={textStyles.footnote}>{label} {value}</Text>
    </View>
  );
}


const styles = StyleSheet.create({
  pressed: { opacity: 0.55 },
  categoryRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  categoryLabel: { ...Type.label },
  flexOne: { flex: 1 },
  planStats: { marginTop: Spacing.five },
  planName: { color: Palette.inkMuted, ...Type.label, fontSize: 13, marginBottom: Spacing.three, marginTop: -Spacing.one },
  todayTag: { backgroundColor: 'rgba(255,153,107,0.16)', borderRadius: 6, color: Palette.coral, overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 3, ...Type.labelSmall, fontSize: 11 },
  liveAlert: { backgroundColor: '#140E0F', borderColor: 'rgba(255,69,58,0.28)', borderCurve: 'continuous', borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', padding: Spacing.four, paddingTop: Spacing.three },
  liveHead: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: Spacing.four },
  liveDot: { backgroundColor: Palette.emergency, borderRadius: 4, height: 8, width: 8 },
  liveEyebrow: { color: Palette.emergency, ...Type.label, fontSize: 13 },
  liveTitle: { color: Palette.ink, ...Type.title2, fontWeight: '700', marginTop: Spacing.one },
  liveStats: { borderColor: 'rgba(255,255,255,0.08)', borderBottomWidth: StyleSheet.hairlineWidth, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', marginTop: Spacing.four, paddingVertical: Spacing.three },
  liveStat: { flex: 1, gap: 1 },
  liveStatValueRow: { alignItems: 'baseline', flexDirection: 'row', gap: 2 },
  liveStatValue: { color: Palette.ink, ...Type.figure, fontSize: 26, lineHeight: 29 },
  liveStatUnit: { color: Palette.inkMuted, ...Type.labelSmall, fontSize: 10 },
  liveStatLabel: { color: Palette.inkMuted, ...Type.labelSmall, fontSize: 11 },
  alertPrimary: { alignItems: 'center', backgroundColor: Palette.emergency, borderCurve: 'continuous', borderRadius: 14, flexDirection: 'row', gap: Spacing.two, justifyContent: 'center', marginTop: Spacing.four, minHeight: 52 },
  alertPrimaryText: { color: '#FFFFFF', ...Type.label, fontSize: 17 },
  alertSecondary: { alignItems: 'center', justifyContent: 'center', marginTop: Spacing.one, minHeight: 44 },
  alertSecondaryText: { color: Palette.ink, ...Type.subhead, fontWeight: '600' },
  allClear: { alignItems: 'center', flexDirection: 'row', gap: Spacing.four },
  allClearIcon: { alignItems: 'center', backgroundColor: 'rgba(48,209,88,0.14)', borderRadius: 26, height: 52, justifyContent: 'center', width: 52 },
  allClearTitle: { color: Palette.ink, ...Type.title3, fontWeight: '700' },
  alertSummary: { marginTop: Spacing.five },
  feedEnd: { alignItems: 'flex-end', gap: 2 },
  feedTime: { color: Palette.ink, ...Type.figure, fontSize: 17, lineHeight: 20 },
  feedStatus: { color: Palette.inkMuted, ...Type.labelSmall, fontSize: 11 },
  schedule: { backgroundColor: Palette.card, borderColor: Palette.cardEdge, borderCurve: 'continuous', borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  scheduleRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.three, minHeight: 72, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three },
  scheduleRowNow: { backgroundColor: 'rgba(255,153,107,0.08)' },
  scheduleDivider: { borderTopColor: 'rgba(255,255,255,0.08)', borderTopWidth: StyleSheet.hairlineWidth },
  scheduleTime: { color: Palette.inkMuted, ...Type.figure, fontSize: 19, lineHeight: 22, width: 40 },
  scheduleTrack: { alignItems: 'center', justifyContent: 'center', width: 6 },
  scheduleBar: { borderRadius: 3, width: 4 },
  scheduleCopy: { flex: 1, gap: 2 },
  scheduleHead: { alignItems: 'center', flexDirection: 'row', gap: Spacing.two },
  scheduleTitle: { ...Type.label, fontSize: 15 },
  scheduleNow: { backgroundColor: Palette.coral, borderRadius: 4, color: '#1A0E07', overflow: 'hidden', paddingHorizontal: 5, paddingVertical: 1, ...Type.labelSmall, fontSize: 10, lineHeight: 13 },
  scheduleDetail: { color: Palette.inkMuted, ...Type.footnote },
  scheduleLength: { alignItems: 'flex-end', minWidth: 30 },
  scheduleMinutes: { color: Palette.ink, ...Type.figure, fontSize: 22, lineHeight: 24 },
  scheduleUnit: { color: Palette.inkMuted, ...Type.labelSmall, fontSize: 10, lineHeight: 12 },
  planNote: { color: Palette.inkMuted, ...Type.footnote, marginTop: Spacing.three, textAlign: 'center' },
  readiness: { alignItems: 'center', flexDirection: 'row', gap: Spacing.five, marginTop: Spacing.three },
  readinessCopy: { flex: 1, gap: 2 },
  readinessTitle: { color: Palette.ink, ...Type.title3 },
  readinessSub: { color: Palette.inkMuted, ...Type.footnote },
  legendCol: { gap: 5, marginTop: Spacing.three },
  ringNumber: { color: Palette.ink, ...Type.figure, fontSize: 42, lineHeight: 44 },
  ringOf: { color: Palette.inkMuted, ...Type.labelSmall },
  sosTitle: { color: Palette.ink, ...Type.title2, marginTop: Spacing.three },
  sosBody: { color: Palette.inkMuted, ...Type.subhead, marginTop: 2 },
  sosButton: { alignItems: 'center', backgroundColor: Palette.emergency, borderCurve: 'continuous', borderRadius: 16, flexDirection: 'row', gap: Spacing.two, justifyContent: 'center', marginTop: Spacing.five, minHeight: 54 },
  sosButtonText: { color: '#FFFFFF', ...Type.label, fontSize: 18 },
  statusHero: { alignItems: 'center', marginTop: Spacing.five },
  statusTitle: { color: Palette.ink, ...Type.title2, marginTop: Spacing.four },
  statusBody: { color: Palette.inkMuted, ...Type.subhead, marginTop: Spacing.one, maxWidth: 300, textAlign: 'center' },
  sessionsHero: { marginTop: Spacing.five },
  sessionsLabel: { color: Palette.inkMuted, ...Type.label, fontSize: 13 },
  zoneDot: { borderRadius: 5, height: 10, width: 10 },
  topicGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three, marginTop: Spacing.five },
  topic: { backgroundColor: Palette.card, borderColor: Palette.cardEdge, borderCurve: 'continuous', borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, gap: Spacing.four, minHeight: 148, padding: Spacing.four, width: '48%' },
  topicDanger: { backgroundColor: 'rgba(255,69,58,0.12)' },
  topicIcon: { alignItems: 'center', borderRadius: 12, height: 48, justifyContent: 'center', width: 48 },
  topicTitle: { color: Palette.ink, ...Type.headline },
  incidentHero: { borderCurve: 'continuous', borderRadius: 16, padding: Spacing.five },
  incidentNumbers: { alignItems: 'flex-end', flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.two, marginTop: Spacing.four },
  incidentBpm: { color: Palette.ink, ...Type.figure, fontSize: 76, lineHeight: 76 },
  incidentUnit: { color: Palette.inkMuted, ...Type.label, fontSize: 18 },
  incidentOver: { color: Palette.emergency, ...Type.footnote, fontWeight: '600', marginBottom: 6 },
  incidentTop: { alignItems: 'center', flexDirection: 'row', gap: Spacing.three },
  incidentName: { color: Palette.ink, ...Type.title3 },
  incidentMeta: { color: Palette.inkMuted, ...Type.footnote },
  needsPill: { backgroundColor: 'rgba(255,69,58,0.2)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  needsPillText: { color: Palette.emergency, ...Type.labelSmall },
  identity: { alignItems: 'center', marginTop: Spacing.five },
  bigAvatar: { alignItems: 'center', borderRadius: 48, height: 96, justifyContent: 'center', width: 96 },
  bigAvatarText: { color: '#2A1206', fontWeight: '700', fontSize: 42, letterSpacing: 0.5 },
  identityName: { color: Palette.ink, ...Type.title2, marginTop: Spacing.three },
  identityMeta: { color: Palette.inkMuted, ...Type.subhead, marginTop: 2 },
  identityStats: { marginTop: Spacing.five },
  contextBelow: { marginTop: Spacing.four },
  firstBlock: { marginTop: Spacing.three },
  hero: { backgroundColor: Palette.surface, borderCurve: 'continuous', borderRadius: 18, justifyContent: 'flex-end', marginTop: Spacing.three, minHeight: 250, overflow: 'hidden' },
  zoneTag: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, flexDirection: 'row', gap: 6, left: Spacing.four, paddingHorizontal: 9, paddingVertical: 6, position: 'absolute', top: Spacing.four },
  zoneTagText: { color: '#FFFFFF', ...Type.labelSmall, fontSize: 13, lineHeight: 15 },
  heroCopy: { padding: Spacing.four },
  heroTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '600', letterSpacing: 0.3, lineHeight: 33 },
  heroButton: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', borderCurve: 'continuous', borderRadius: 18, flexDirection: 'row', gap: 6, marginTop: Spacing.three, minHeight: 40, paddingHorizontal: Spacing.four },
  heroButtonText: { color: '#FFFFFF', ...Type.subhead, fontWeight: '600' },
  todayBar: { gap: Spacing.one, marginTop: Spacing.three, paddingHorizontal: Spacing.two, paddingTop: Spacing.four, paddingBottom: Spacing.two },
  todayItem: { alignItems: 'center', flex: 1, gap: 2, paddingBottom: Spacing.three },
  todayRow: { flexDirection: 'row' },
  todayPlanLine: { borderTopColor: Palette.border, borderTopWidth: StyleSheet.hairlineWidth, marginHorizontal: Spacing.three, paddingBottom: Spacing.one, paddingTop: Spacing.three },
  todayPlanText: { color: Palette.inkMuted, ...Type.footnote },
  inviteRow: { marginTop: Spacing.three },
  todayNumber: { color: Palette.ink, ...Type.figure, fontSize: 26, lineHeight: 28 },
  todayNumberSmall: { fontSize: 19, lineHeight: 21 },
  todayLabelRow: { alignItems: 'center', flexDirection: 'row', gap: 4, marginTop: Spacing.two },
  todayValue: { color: Palette.inkMuted, ...Type.footnote },
  todayLabel: { color: Palette.ink, ...Type.label, fontSize: 14 },
  sheet: { backgroundColor: Palette.canvas, flex: 1 },
  sheetBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingBottom: Spacing.three, paddingHorizontal: Spacing.five, paddingTop: Spacing.five },
  sheetTitle: { color: Palette.ink, ...Type.title2 },
  sheetContent: { gap: Spacing.three, paddingHorizontal: Spacing.five, paddingTop: Spacing.two },
  sheetLead: { color: Palette.ink, ...Type.body },
  sheetHeading: { color: Palette.ink, ...Type.headline, marginTop: Spacing.three },
  sheetBody: { color: Palette.inkMuted, ...Type.body },
  block: { marginTop: Spacing.three },
  contextLine: { color: Palette.inkMuted, ...Type.subhead, marginTop: 2 },
  cardName: { color: Palette.ink, ...Type.title2, marginTop: Spacing.three },
  cardNameFirst: { color: Palette.ink, ...Type.title2 },
  cardNameInline: { color: Palette.ink, ...Type.title3, flex: 1 },
  cardBody: { color: Palette.inkMuted, ...Type.subhead, marginTop: 2 },
  cardBodyTop: { color: Palette.inkMuted, ...Type.subhead, marginTop: Spacing.three },
  cardFootnote: { color: Palette.inkMuted, ...Type.footnote, marginTop: Spacing.three },
  cardAction: { marginTop: Spacing.four },
  valueRow: { alignItems: 'baseline', flexDirection: 'row', gap: 4, marginTop: Spacing.two },
  heroValue: { color: Palette.ink, ...Type.figure, fontSize: 64, lineHeight: 66 },
  heroUnit: { color: Palette.inkMuted, ...Type.label, fontSize: 20, lineHeight: 24 },
  zoneLine: { color: Palette.warning, ...Type.label },
  fieldTop: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between' },
  fieldTrend: { alignItems: 'flex-end', gap: 2, paddingBottom: Spacing.two },
  fieldTrendText: { color: Palette.inkMuted, ...Type.footnote },
  statRow: { borderTopColor: Palette.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', marginTop: Spacing.four, paddingTop: Spacing.three },
  stat: { flex: 1, gap: 1 },
  statLabel: { color: Palette.inkMuted, ...Type.labelSmall },
  statValue: { color: Palette.ink, ...Type.figure, fontSize: 26, lineHeight: 29 },
  signOut: { marginTop: Spacing.seven },
  track: { borderRadius: 4, flexDirection: 'row', gap: 2, height: 8, marginTop: Spacing.four, overflow: 'hidden' },
  segment: { minWidth: 6 },
  summary: { paddingBottom: Spacing.two, paddingHorizontal: Spacing.one },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.four, marginTop: Spacing.three },
  legendItem: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  legendDot: { borderRadius: 4, height: 8, width: 8 },
  segmented: { height: 32, width: '100%' },
  footnote: { color: Palette.inkMuted, ...Type.footnote, marginHorizontal: Spacing.four, marginTop: Spacing.three },
  statusTop: { alignItems: 'center', flexDirection: 'row', gap: Spacing.three },
  step: { alignItems: 'center', backgroundColor: Palette.fill, borderRadius: 14, height: 28, justifyContent: 'center', width: 28 },
  stepText: { color: Palette.ink, fontWeight: '700', fontSize: 16 },
  guideRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 52, paddingHorizontal: Spacing.four },
  guidePressed: { backgroundColor: 'rgba(255,255,255,0.08)' },
  guideTitle: { color: Palette.ink, ...Type.body },
  guideBody: { color: Palette.inkMuted, ...Type.subhead, paddingBottom: Spacing.four, paddingHorizontal: Spacing.four },
  rotated: { transform: [{ rotate: '90deg' }] },
  suggestionBody: { color: Palette.ink, ...Type.subhead, paddingRight: Spacing.five },
  suggestionAction: { alignItems: 'flex-start', marginTop: Spacing.three },
  dismiss: { position: 'absolute', right: Spacing.three, top: Spacing.three },
});
