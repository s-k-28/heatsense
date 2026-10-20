import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import type { ComponentProps } from 'react';
import { createContext, useContext, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';

import { LargeTitle, SectionHeader, type DashboardRole } from '@/components/dashboard-shell';
import { HeatIcon } from '@/components/heat-icon';
import { BarChart, LineChart } from '@/components/ui/charts';
import { BaselineChart, DateTile, HeatDayChart, PhotoBanner, RingAvatar, Ring, SegmentBar, Spark, StatStrip, Timeline } from '@/components/ui/visuals';
import { WeekSwitcher } from '@/components/week-switcher';
import { Button, Card, CardHeader, Group, IconTile, Initials, Row, TextLink, chevron, textStyles } from '@/components/ui/list';
import { Palette, Spacing, Type } from '@/constants/theme';
import { TODAY, ZONES } from '@/lib/practice';
import { ensureTeamInvite, getMyTeamInvite } from '@/services/team-invites';
import { firebaseAuth } from '@/services/firebase';
import { useTeamDraft, type TeamDraft } from '@/state/onboarding';
import { setPreference, usePreferences, useTemperature } from '@/state/preferences';

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
// Hourly WBGT from 7 AM to 7 PM (sample). The curve is drawn up to the latest reading only.
const DAY_WBGT = [62, 64, 67, 71, 75, 79, 82, 83, 84, 84, 83, 81, 78];
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
  if (tab === 'plan') return <PlanScreen />;
  if (tab === 'team') return <RosterScreen title="Team" variant="coach" />;
  if (tab === 'alerts') return <AlertsScreen />;
  if (tab === 'profile') return <ProfileScreen role="Coach" />;
  return <CoachHome />;
}

function TrainerContent({ tab }: { tab: string }) {
  if (tab === 'monitor') return <MonitorScreen />;
  if (tab === 'athletes') return <RosterScreen title="Athletes" variant="trainer" />;
  if (tab === 'protocols') return <ProtocolsScreen />;
  if (tab === 'profile') return <ProfileScreen role="Athletic trainer" />;
  return <TrainerHome />;
}

function AthleteContent({ tab }: { tab: string }) {
  if (tab === 'status') return <StatusScreen />;
  if (tab === 'sessions') return <SessionsScreen />;
  if (tab === 'learn') return <LearnScreen />;
  if (tab === 'profile') return <ProfileScreen role="Athlete" />;
  return <AthleteHome />;
}

/* ─────────────────────────────── Home screens ─────────────────────────────── */

const FIELD_PHOTO = require('@/assets/images/home/field-hero.webp');

/** Coach Home, kept short: readiness hero, one Today bar, the field reading, invite. */
function CoachHome() {
  const go = useContext(NavContext);
  const { draft, name } = useTeam();
  const [conditionsOpen, setConditionsOpen] = useState(false);
  return (
    <>
      <LargeTitle title="Today" />
      <ReadinessHero onAction={() => setConditionsOpen(true)} />
      <TodayBar onNavigate={go} />
      <CompactField onPress={() => go('plan')} />

      <InviteRow name={name} onShare={() => shareTeamCode(draft)} />
      <ConditionsSheet onClose={() => setConditionsOpen(false)} visible={conditionsOpen} />
    </>
  );
}

/** The photo card that asks the coach the one question that matters before practice. */
function ReadinessHero({ onAction }: { onAction: () => void }) {
  return (
    <View style={styles.hero}>
      <Image accessibilityIgnoresInvertColors contentFit="cover" contentPosition={{ top: '12%', left: '50%' }} source={FIELD_PHOTO} style={StyleSheet.absoluteFill} />
      {/* Keeps the copy readable where it sits, at the bottom of the photo. */}
      <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.9)']} locations={[0.1, 0.55, 1]} pointerEvents="none" style={StyleSheet.absoluteFill} />
      <View accessible accessibilityLabel={ZONES[TODAY.zone].label} style={styles.zoneTag}>
        <View style={[styles.zoneDot, { backgroundColor: ZONES[TODAY.zone].color }]} />
        <Text style={styles.zoneTagText}>{ZONES[TODAY.zone].label}</Text>
      </View>
      <View style={styles.heroCopy}>
        <Text accessibilityRole="header" style={styles.heroTitle}>Ready for practice?</Text>
        <Pressable accessibilityHint="Opens how to check conditions before practice" accessibilityLabel="Check field conditions" accessibilityRole="button" onPress={onAction} style={({ pressed }) => [styles.heroButton, pressed && styles.pressed]}>
          <Text style={styles.heroButtonText}>Check field conditions</Text>
          <HeatIcon name={chevron} size={12} tintColor="#FFFFFF" weight="bold" />
        </Pressable>
      </View>
    </View>
  );
}

/** Three readouts, each opening its tab, with the rest of today's plan on one line beneath. */
function TodayBar({ onNavigate }: { onNavigate: (tab: string) => void }) {
  return (
    <Card style={styles.todayBar}>
      <View style={styles.todayRow}>
        <TodayItem accessibilityLabel="Plan: 20 minutes work, 10 minutes rest" label="Plan" onPress={() => onNavigate('plan')} value="20 / 10 min">
          <View style={styles.miniBar}>
            <View style={[styles.miniWork, { flex: 20 }]} />
            <View style={[styles.miniRest, { flex: 10 }]} />
          </View>
        </TodayItem>
        <TodayItem accessibilityLabel="Alerts: 1 needs a response" centered label="Alerts" onPress={() => onNavigate('alerts')} value="Active">
          <Text style={[styles.todayNumber, { color: Palette.emergency }]}>1</Text>
        </TodayItem>
        <TodayItem accessibilityLabel="Team: 24 athletes, 3 need follow-up" label="Team" onPress={() => onNavigate('team')} value="Athletes">
          <Text style={styles.todayNumber}>24</Text>
        </TodayItem>
      </View>
      <Pressable accessibilityLabel="Water every 10 minutes. Equipment off during breaks." accessibilityRole="button" onPress={() => onNavigate('plan')} style={({ pressed }) => [styles.todayPlanLine, pressed && styles.pressed]}>
        <Text numberOfLines={1} style={styles.todayPlanText}>Water every 10 min · Equipment off during breaks</Text>
      </Pressable>
    </Card>
  );
}

function TodayItem({ accessibilityLabel, centered, children, label, onPress, value }: { accessibilityLabel: string; centered?: boolean; children: React.ReactNode; label: string; onPress: () => void; value: string }) {
  return (
    <Pressable accessibilityLabel={accessibilityLabel} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.todayItem, centered && styles.todayItemCentered, pressed && styles.pressed]}>
      {/* The block can sit in the middle of the bar, but its lines always start at the same left edge. */}
      <View style={styles.todayInner}>
        <View style={styles.todayVisual}>{children}</View>
        <Text numberOfLines={1} style={styles.todayValue}>{value}</Text>
        <Text style={styles.todayLabel}>{label}</Text>
      </View>
    </Pressable>
  );
}

/** Today's field reading on one compact card: the figure and guidance beside a small trend. */
function CompactField({ onPress }: { onPress: () => void }) {
  const temp = useTemperature();
  const { refreshedAt } = usePreferences();
  return (
    <Card style={styles.compactField}>
      <CardHeader icon={icons.sun} label="Field WBGT" onPress={onPress} tone={Palette.warning} trailing="4:10 PM" />
      <View style={styles.compactBody}>
        <View style={styles.compactCopy}>
          <View style={styles.compactValueRow}>
            <Text style={styles.compactValue}>{temp.value(TODAY.wbgtF)}</Text>
            <Text style={styles.heroUnit}>{temp.unit}</Text>
          </View>
          <Text style={styles.compactGuidance}>Modify work and rest intervals before athletes take the field.</Text>
        </View>
        <View style={styles.compactChart}>
          <LineChart
            height={64}
            labels={['7 AM', 'Now']}
            max={90}
            min={56}
            summary={`Hourly WBGT today, rising from ${temp.value(62)} to ${temp.value(84)} degrees by 4 PM.`}
            tone={Palette.warning}
            values={HOURLY_WBGT}
          />
        </View>
      </View>
      <Text style={styles.cardFootnote}>Memorial Stadium · updated {refreshedAt ? 'just now' : '2 min ago'}</Text>
    </Card>
  );
}

/** One row that replaces the old invite card: share the team code, or dismiss it. */
function InviteRow({ name, onShare }: { name: string; onShare: () => void }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <View style={styles.inviteRow}>
      <Group>
        <Row
          detail={`Athletes join ${name} with a team code.`}
          onPress={onShare}
          showChevron={false}
          title="Invite your athletes"
          trailing={
            <View style={styles.inviteActions}>
              <TextLink label="Share" onPress={onShare} />
              <Pressable accessibilityLabel="Dismiss invite" accessibilityRole="button" hitSlop={14} onPress={() => setDismissed(true)}>
                <HeatIcon name={icons.close} size={12} tintColor={Palette.inkMuted} weight="bold" />
              </Pressable>
            </View>
          }
        />
      </Group>
    </View>
  );
}

/** What "Check field conditions" opens: how to get a reading before practice. */
function ConditionsSheet({ onClose, visible }: { onClose: () => void; visible: boolean }) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible={visible}>
      <View style={styles.sheet}>
        <View style={styles.sheetBar}>
          <Text style={styles.sheetTitle}>Field conditions</Text>
          <TextLink label="Done" onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={styles.sheetContent}>
          <Text style={styles.sheetLead}>HeatSense isn’t connected to a WBGT sensor or weather feed yet, so it can’t read conditions at your field.</Text>
          <Text style={styles.sheetHeading}>Before practice</Text>
          <Text style={styles.sheetBody}>Take a WBGT reading on site with a handheld meter, or ask your athletic trainer for theirs.</Text>
          <Text style={styles.sheetBody}>Then follow your school’s heat policy for that reading.</Text>
        </ScrollView>
      </View>
    </Modal>
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

/** Today's field reading: the one card every role shares. */
export function FieldCard({ onPress, showZone = true }: { onPress?: () => void; showZone?: boolean }) {
  const temp = useTemperature();
  const { refreshedAt } = usePreferences();
  return (
    <Card>
      <CardHeader icon={icons.sun} label="Field WBGT" onPress={onPress} tone={Palette.warning} trailing="4:10 PM" />
      <View style={styles.valueRow}>
        <Text style={styles.heroValue}>{temp.value(TODAY.wbgtF)}</Text>
        <Text style={styles.heroUnit}>{temp.unit}</Text>
      </View>
      {showZone ? <Text style={[styles.zoneLine, { color: ZONES[TODAY.zone].text }]}>{ZONES[TODAY.zone].label}</Text> : null}
      <Text style={styles.cardBody}>Modify work and rest intervals before athletes take the field.</Text>
      <LineChart
        labels={['7 AM', 'Now']}
        max={90}
        min={56}
        summary={`Hourly WBGT today, rising from ${temp.value(62)} to ${temp.value(84)} degrees by 4 PM.`}
        tone={Palette.warning}
        values={HOURLY_WBGT}
      />
      <Text style={styles.cardFootnote}>Memorial Stadium · updated {refreshedAt ? 'just now' : '2 min ago'}</Text>
    </Card>
  );
}

/** Kept for the coach workspace route, which still imports it. */
export function RiskHero(_props: { mode: 'coach' }) {
  return <FieldCard />;
}

/* ─────────────────────────────── Other screens ─────────────────────────────── */

function PlanScreen() {
  const temp = useTemperature();
  return (
    <>
      <LargeTitle title="Plan" />
      <View style={styles.block}><WeekSwitcher /></View>
      <Text style={[styles.contextLine, styles.contextBelow]}>Today · <Text style={{ color: ZONES[TODAY.zone].text, fontWeight: '600' }}>{ZONES[TODAY.zone].label}</Text> · {temp.value(TODAY.wbgtF)}{temp.unit} WBGT at 4:10 PM</Text>

      <SectionHeader title="Heat through the day" />
      <HeatDayChart color={ZONES[TODAY.zone].color} nowHour={16.17} startHour={7} values={DAY_WBGT} window={[16, 17.5]} />

      <SectionHeader title="Today’s session" />
      <SegmentBar
        segments={[
          { color: 'rgba(235,235,245,0.3)', flex: 10, label: 'Arrive', time: '4:00' },
          { color: Palette.coral, flex: 20, label: 'Work', time: '4:10' },
          { color: Palette.info, flex: 10, label: 'Rest', time: '4:30' },
        ]}
      />
      <View style={styles.planStats}>
        <StatStrip items={[{ label: 'Work / rest', value: '20 / 10' }, { label: 'Water every', value: '10 min' }, { label: 'Equipment', value: 'Off' }]} />
      </View>

      <SectionHeader title="Timeline" />
      <Timeline
        items={[
          { color: 'rgba(235,235,245,0.32)', detail: 'Water available before warm-up', time: '4:00', title: 'Arrival and baseline check' },
          { color: Palette.coral, detail: 'Helmets and heavy equipment monitored', time: '4:10', title: 'Work block · 20 min' },
          { color: Palette.info, detail: 'Shade, water, and an athlete check', time: '4:30', title: 'Recovery · 10 min' },
        ]}
      />
    </>
  );
}

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
        <SegmentedControl
          appearance="dark"
          onValueChange={(value) => setFilter(value === 'Needs attention' ? 'attention' : value === 'Normal' ? 'normal' : 'all')}
          selectedIndex={index}
          style={styles.segmented}
          values={['All', 'Needs attention', 'Normal']}
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

function AlertsScreen() {
  return (
    <>
      <LargeTitle title="Alerts" />
      <Card style={styles.firstBlock}>
        <CardHeader icon={icons.warning} label="Needs a response" tone={Palette.emergency} trailing="Now" />
        <Text style={styles.cardName}>Maya needs a recovery check</Text>
        <Text style={styles.cardBody}>Her heart rate and skin temperature stayed up through a low-movement break.</Text>
        <View style={styles.cardAction}>
          <Button label="Acknowledge and locate" onPress={() => router.push({ pathname: '/detail', params: { kind: 'alert' } })} />
        </View>
      </Card>

      <SectionHeader title="Earlier today" />
      <Group>
        <Row detail="Jordan Lee acknowledged" title="Hydration reminder" value="3:52 PM" />
        <Row detail="Practice plan updated" title="WBGT entered the Orange zone" value="3:35 PM" />
        <Row detail="No readings above the Yellow zone" title="Pre-practice weather check" value="2:58 PM" />
      </Group>

      <SectionHeader title="Yesterday" />
      <Group>
        <Row detail="Eli Brooks · acknowledged by Alex Thompson" title="Recovery check" value="5:12 PM" />
        <Row detail="Practice moved indoors for the last 20 minutes" title="WBGT entered the Red zone" value="4:41 PM" />
      </Group>
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

function ProfileScreen({ role }: { role: string }) {
  const isAthlete = role === 'Athlete';
  const isCoach = role === 'Coach';
  const name = isAthlete ? 'Maya Chen' : isCoach ? 'Coach Rivera' : 'Alex Thompson';
  const { school, name: teamName } = useTeam();
  const { bandConnected, celsius, compactRoster, practiceLiveActivity } = usePreferences();
  const initials = name.split(/\s+/).map((part) => part[0]).join('');

  const confirmSignOut = () =>
    Alert.alert('Sign out of HeatSense?', undefined, [
      { style: 'cancel', text: 'Cancel' },
      {
        onPress: () => {
          if (firebaseAuth) signOut(firebaseAuth).catch(() => {});
          router.replace('/welcome');
        },
        style: 'destructive',
        text: 'Sign out',
      },
    ]);

  const disconnectBand = () =>
    Alert.alert('Disconnect HeatSense Band?', 'Your personal recovery, skin, sweat and movement trends stop until you pair again. The team’s field plan isn’t affected.', [
      { style: 'cancel', text: 'Cancel' },
      { onPress: () => setPreference('bandConnected', false), style: 'destructive', text: 'Disconnect' },
    ]);

  return (
    <>
      <LargeTitle title="Profile" />
      <View style={styles.identity}>
        <LinearGradient colors={['#FFB38A', '#FF8F5C']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.bigAvatar}>
          <Text style={styles.bigAvatarText}>{initials}</Text>
        </LinearGradient>
        <Text style={styles.identityName}>{name}</Text>
        <Text style={styles.identityMeta}>{role} · {school}</Text>
      </View>

      <View style={styles.identityStats}>
        {isAthlete
          ? <StatStrip items={[{ label: 'Sessions', value: '12' }, { label: 'This week', value: '3' }, { label: 'Alerts', value: '0' }]} />
          : <StatStrip items={[{ label: 'Athletes', value: '24' }, { label: 'Bands shared', value: '18' }, { label: 'Open alerts', tone: Palette.emergency, value: '1' }]} />}
      </View>

      <SectionHeader title="Team" />
      <Group>
        <Row title="Name" value={teamName} />
        {isAthlete ? (
          <Row
            onPress={bandConnected ? disconnectBand : () => router.push('/dashboard?role=athlete&state=pairing')}
            title="HeatSense Band"
            value={bandConnected ? 'Connected' : 'Not connected'}
            valueTone={bandConnected ? Palette.safe : undefined}
          />
        ) : (
          <Row title="Athlete bands" value="18 of 24 shared" />
        )}
      </Group>

      <SectionHeader title="Display" />
      <Group>
        <Row title="Show temperatures in °C" trailing={<Toggle label="Show temperatures in Celsius" onChange={(value) => setPreference('celsius', value)} value={celsius} />} />
        <Row title="Compact roster" trailing={<Toggle label="Compact roster" onChange={(value) => setPreference('compactRoster', value)} value={compactRoster} />} />
        <Row title="Practice on Dynamic Island" trailing={<Toggle label="Show practice on the Dynamic Island and Lock Screen" onChange={(value) => setPreference('practiceLiveActivity', value)} value={practiceLiveActivity} />} />
      </Group>
      <Text style={styles.footnote}>Compact roster hides the detail line under each athlete’s name. The Dynamic Island shows the field zone, and holding it shows time left in practice.</Text>

      <SectionHeader title="About" />
      <Group>
        <Row
          onPress={() => Alert.alert('Data permissions', isAthlete
            ? 'Only your coach and athletic trainer see your band’s signals, and only for sessions you share.'
            : 'You see signals only from athletes who paired a band and chose to share a session. Everyone else sees the field plan.')}
          title="Data permissions"
        />
        <Row
          onPress={() => Alert.alert('Safety and limitations', 'HeatSense supports, but doesn’t replace, your district’s emergency action plan or an athletic trainer’s judgment. It doesn’t diagnose heat illness.')}
          title="Safety and limitations"
        />
      </Group>

      <View style={styles.signOut}>
        <Group>
          <Row centered destructive onPress={confirmSignOut} showChevron={false} title="Sign out" />
        </Group>
      </View>
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
      <Text style={textStyles.footnote}>{label}</Text>
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

function StepNumber({ n }: { n: number }) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepText}>{n}</Text>
    </View>
  );
}

function Toggle({ label, onChange, value }: { label: string; onChange: (value: boolean) => void; value: boolean }) {
  return (
    <Switch
      accessibilityLabel={label}
      ios_backgroundColor={Palette.fill}
      onValueChange={onChange}
      thumbColor="#FFFFFF"
      trackColor={{ false: Palette.fill, true: Palette.safe }}
      value={value}
    />
  );
}

function Guide({ body, expanded, onPress, title }: { body: string; expanded: boolean; onPress: () => void; title: string }) {
  return (
    <View>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={onPress}>
        {({ pressed }) => (
          <View style={[styles.guideRow, pressed && styles.guidePressed]}>
            <Text style={styles.guideTitle}>{title}</Text>
            <View style={expanded ? styles.rotated : undefined}>
              <HeatIcon name={chevron} size={13} tintColor={Palette.inkFaint} weight="semibold" />
            </View>
          </View>
        )}
      </Pressable>
      {expanded ? <Text style={styles.guideBody}>{body}</Text> : null}
    </View>
  );
}

function Suggestion({ action, body, onAction, title }: { action: string; body: string; onAction: () => void; title: string }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <>
      <SectionHeader title={title} />
      <Card>
        <Text style={styles.suggestionBody}>{body}</Text>
        <View style={styles.suggestionAction}><TextLink label={action} onPress={onAction} /></View>
        <Pressable accessibilityLabel={`Dismiss ${title}`} accessibilityRole="button" hitSlop={14} onPress={() => setDismissed(true)} style={styles.dismiss}>
          <HeatIcon name={icons.close} size={12} tintColor={Palette.inkMuted} weight="bold" />
        </Pressable>
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.55 },
  categoryRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  categoryLabel: { ...Type.subhead, fontWeight: '600' },
  flexOne: { flex: 1 },
  planStats: { marginTop: Spacing.five },
  planNote: { color: Palette.inkMuted, ...Type.footnote, marginTop: Spacing.three, textAlign: 'center' },
  readiness: { alignItems: 'center', flexDirection: 'row', gap: Spacing.five, marginTop: Spacing.three },
  readinessCopy: { flex: 1, gap: 2 },
  readinessTitle: { color: Palette.ink, ...Type.title3 },
  readinessSub: { color: Palette.inkMuted, ...Type.footnote },
  legendCol: { gap: 5, marginTop: Spacing.three },
  ringNumber: { color: Palette.ink, fontSize: 32, fontWeight: '700', letterSpacing: 0.3, lineHeight: 36 },
  ringOf: { color: Palette.inkMuted, ...Type.caption },
  sosTitle: { color: Palette.ink, ...Type.title2, marginTop: Spacing.three },
  sosBody: { color: Palette.inkMuted, ...Type.subhead, marginTop: 2 },
  sosButton: { alignItems: 'center', backgroundColor: Palette.emergency, borderCurve: 'continuous', borderRadius: 16, flexDirection: 'row', gap: Spacing.two, justifyContent: 'center', marginTop: Spacing.five, minHeight: 54 },
  sosButtonText: { color: '#FFFFFF', ...Type.headline },
  statusHero: { alignItems: 'center', marginTop: Spacing.five },
  statusTitle: { color: Palette.ink, ...Type.title2, marginTop: Spacing.four },
  statusBody: { color: Palette.inkMuted, ...Type.subhead, marginTop: Spacing.one, maxWidth: 300, textAlign: 'center' },
  sessionsHero: { marginTop: Spacing.five },
  sessionsLabel: { color: Palette.inkMuted, ...Type.subhead },
  zoneDot: { borderRadius: 5, height: 10, width: 10 },
  topicGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three, marginTop: Spacing.five },
  topic: { backgroundColor: Palette.surface, borderCurve: 'continuous', borderRadius: 22, gap: Spacing.four, minHeight: 148, padding: Spacing.four, width: '48%' },
  topicDanger: { backgroundColor: '#241313' },
  topicIcon: { alignItems: 'center', borderRadius: 16, height: 48, justifyContent: 'center', width: 48 },
  topicTitle: { color: Palette.ink, ...Type.headline },
  incidentHero: { borderCurve: 'continuous', borderRadius: 26, padding: Spacing.five },
  incidentNumbers: { alignItems: 'flex-end', flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.two, marginTop: Spacing.four },
  incidentBpm: { color: Palette.ink, fontSize: 56, fontWeight: '700', letterSpacing: 0.3, lineHeight: 60 },
  incidentUnit: { color: Palette.inkMuted, ...Type.body, fontWeight: '500' },
  incidentOver: { color: Palette.emergency, ...Type.footnote, fontWeight: '600', marginBottom: 6 },
  incidentTop: { alignItems: 'center', flexDirection: 'row', gap: Spacing.three },
  incidentName: { color: Palette.ink, ...Type.title3 },
  incidentMeta: { color: Palette.inkMuted, ...Type.footnote },
  needsPill: { backgroundColor: 'rgba(255,69,58,0.2)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  needsPillText: { color: Palette.emergency, ...Type.footnote, fontWeight: '600' },
  identity: { alignItems: 'center', marginTop: Spacing.five },
  bigAvatar: { alignItems: 'center', borderRadius: 48, height: 96, justifyContent: 'center', width: 96 },
  bigAvatarText: { color: '#2A1206', fontSize: 34, fontWeight: '700', letterSpacing: 0.5 },
  identityName: { color: Palette.ink, ...Type.title2, marginTop: Spacing.three },
  identityMeta: { color: Palette.inkMuted, ...Type.subhead, marginTop: 2 },
  identityStats: { marginTop: Spacing.five },
  contextBelow: { marginTop: Spacing.four },
  firstBlock: { marginTop: Spacing.three },
  hero: { backgroundColor: Palette.surface, borderCurve: 'continuous', borderRadius: 24, justifyContent: 'flex-end', marginTop: Spacing.three, minHeight: 250, overflow: 'hidden' },
  zoneTag: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14, flexDirection: 'row', gap: 6, left: Spacing.four, paddingHorizontal: 10, paddingVertical: 6, position: 'absolute', top: Spacing.four },
  zoneTagText: { color: '#FFFFFF', ...Type.footnote, fontWeight: '600' },
  heroCopy: { padding: Spacing.four },
  heroTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '600', letterSpacing: 0.3, lineHeight: 33 },
  heroButton: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', borderCurve: 'continuous', borderRadius: 18, flexDirection: 'row', gap: 6, marginTop: Spacing.three, minHeight: 40, paddingHorizontal: Spacing.four },
  heroButtonText: { color: '#FFFFFF', ...Type.subhead, fontWeight: '600' },
  todayBar: { gap: Spacing.one, marginTop: Spacing.three, padding: Spacing.two },
  todayItem: { flex: 1, minHeight: 84, padding: Spacing.three },
  todayItemCentered: { alignItems: 'center' },
  todayRow: { flexDirection: 'row' },
  todayInner: { alignItems: 'flex-start', gap: 2 },
  todayPlanLine: { borderTopColor: Palette.border, borderTopWidth: StyleSheet.hairlineWidth, marginHorizontal: Spacing.three, paddingBottom: Spacing.one, paddingTop: Spacing.three },
  todayPlanText: { color: Palette.inkMuted, ...Type.footnote },
  compactField: { marginTop: Spacing.three, padding: Spacing.three },
  compactBody: { alignItems: 'center', flexDirection: 'row', gap: Spacing.four, marginTop: Spacing.two },
  compactCopy: { flex: 1 },
  compactValueRow: { alignItems: 'baseline', flexDirection: 'row', gap: 4 },
  compactValue: { color: Palette.ink, fontSize: 40, fontWeight: '600', letterSpacing: 0.3, lineHeight: 46 },
  compactGuidance: { color: Palette.inkMuted, ...Type.footnote, marginTop: 2 },
  compactChart: { marginTop: -Spacing.three, width: 128 },
  inviteRow: { marginTop: Spacing.three },
  inviteActions: { alignItems: 'center', flexDirection: 'row', gap: Spacing.four },
  todayVisual: { height: 30, justifyContent: 'center', marginBottom: Spacing.one },
  todayNumber: { color: Palette.ink, fontSize: 28, fontWeight: '700', letterSpacing: 0.3, lineHeight: 32 },
  todayValue: { color: Palette.ink, ...Type.subhead, fontWeight: '600' },
  todayLabel: { color: Palette.inkMuted, ...Type.footnote },
  miniBar: { flexDirection: 'row', gap: 3, height: 10, width: 104 },
  miniWork: { backgroundColor: Palette.coral, borderRadius: 5 },
  miniRest: { backgroundColor: Palette.info, borderRadius: 5 },
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
  heroValue: { color: Palette.ink, ...Type.display },
  heroUnit: { color: Palette.inkMuted, ...Type.body, fontWeight: '500' },
  zoneLine: { color: Palette.warning, ...Type.headline },
  statRow: { borderTopColor: Palette.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', marginTop: Spacing.four, paddingTop: Spacing.three },
  stat: { flex: 1, gap: 1 },
  statValue: { color: Palette.ink, ...Type.title3 },
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
  stepText: { color: Palette.ink, ...Type.subhead, fontWeight: '600' },
  guideRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 52, paddingHorizontal: Spacing.four },
  guidePressed: { backgroundColor: 'rgba(255,255,255,0.08)' },
  guideTitle: { color: Palette.ink, ...Type.body },
  guideBody: { color: Palette.inkMuted, ...Type.subhead, paddingBottom: Spacing.four, paddingHorizontal: Spacing.four },
  rotated: { transform: [{ rotate: '90deg' }] },
  suggestionBody: { color: Palette.ink, ...Type.subhead, paddingRight: Spacing.five },
  suggestionAction: { alignItems: 'flex-start', marginTop: Spacing.three },
  dismiss: { position: 'absolute', right: Spacing.three, top: Spacing.three },
});
