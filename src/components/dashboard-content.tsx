import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import type { ComponentProps } from 'react';
import { createContext, useContext, useState } from 'react';
import { Alert, Linking, Pressable, Share, StyleSheet, Switch, Text, View } from 'react-native';

import { CoachHome } from '@/components/coach-home';
import { CoachAlerts } from '@/components/coach-alerts';
import { CoachPlan } from '@/components/coach-plan';
import { CoachProfile } from '@/components/coach-profile';
import { CoachTeam } from '@/components/coach-team';
import { LargeTitle, SectionHeader, type DashboardRole } from '@/components/dashboard-shell';
import { HeatIcon } from '@/components/heat-icon';
import { BarChart, LineChart } from '@/components/ui/charts';
import { Card, CardHeader, Group, IconTile, Initials, Row, chevron, textStyles } from '@/components/ui/list';
import { Palette, Spacing, Type } from '@/constants/theme';
import { SAMPLE_HOURLY_WBGT as HOURLY_WBGT, TODAY, ZONES } from '@/lib/practice';
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

const RECOVERY_BPM = [158, 154, 151, 149, 147, 145, 144, 143, 142];

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

export function DashboardContent({ onNavigate, role, sample = false, tab }: { onNavigate?: (tab: string) => void; role: DashboardRole; sample?: boolean; tab: string }) {
  const content = role === 'coach' ? <CoachContent sample={sample} tab={tab} /> : role === 'trainer' ? <TrainerContent tab={tab} /> : <AthleteContent tab={tab} />;
  return <NavContext.Provider value={onNavigate ?? (() => {})}>{content}</NavContext.Provider>;
}

function CoachContent({ sample, tab }: { sample: boolean; tab: string }) {
  const go = useContext(NavContext);
  if (tab === 'plan') return <CoachPlan sample={sample} />;
  if (tab === 'team') return <CoachTeam />;
  if (tab === 'alerts') return <CoachAlerts sample={sample} />;
  if (tab === 'profile') return <CoachProfile />;
  return <CoachHome onNavigate={go} sample={sample} />;
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
export function FieldCard({ onPress }: { onPress?: () => void }) {
  const temp = useTemperature();
  const { refreshedAt } = usePreferences();
  return (
    <Card>
      <CardHeader icon={icons.sun} label="Field WBGT" onPress={onPress} tone={Palette.warning} trailing="4:10 PM" />
      <View style={styles.valueRow}>
        <Text style={styles.heroValue}>{temp.value(TODAY.wbgtF)}</Text>
        <Text style={styles.heroUnit}>{temp.unit}</Text>
      </View>
      <Text style={[styles.zoneLine, { color: ZONES[TODAY.zone].text }]}>{ZONES[TODAY.zone].label}</Text>
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


function RosterScreen({ title, variant }: { title: string; variant: 'coach' | 'trainer' }) {
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
      <View style={[styles.firstBlock, styles.summary]}>
        <Text style={styles.cardNameFirst}>{variant === 'coach' ? '21 of 24 within plan' : '2 athletes to review'}</Text>
        <Text style={styles.cardBody}>{variant === 'coach' ? '3 need a follow-up today.' : 'Sorted by recovery and movement.'}</Text>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.track}>
          <View style={[styles.segment, { backgroundColor: Palette.safe, flex: 21 }]} />
          <View style={[styles.segment, { backgroundColor: Palette.caution, flex: 2 }]} />
          <View style={[styles.segment, { backgroundColor: Palette.warning, flex: 1 }]} />
        </View>
        <View style={styles.legend}>
          <Legend label="Normal" tone={Palette.safe} value="21" />
          <Legend label="Caution" tone={Palette.caution} value="2" />
          <Legend label="Review" tone={Palette.warning} value="1" />
        </View>
      </View>

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
        <Group inset={68}>
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
      <Card style={styles.block}>
        <CardHeader icon={icons.heart} label="Heart-rate recovery" tone={Palette.emergency} trailing="Review" />
        <View style={styles.valueRow}>
          <Text style={styles.heroValue}>142</Text>
          <Text style={styles.heroUnit}>BPM</Text>
        </View>
        <LineChart labels={['Break started', 'Now']} summary="Heart rate during the break, still elevated at 142 beats per minute" tone={Palette.emergency} values={RECOVERY_BPM} />
        <Text style={styles.cardBodyTop}>Elevated for 6 minutes while movement stays low.</Text>
      </Card>

      <SectionHeader title="Other signals" />
      <Group>
        <Row title="Skin trend" value={temp.delta(0.8)} valueTone={Palette.warning} />
        <Row title="Sweat trend" value="+11%" />
        <Row title="Movement" value="Low" valueTone={Palette.warning} />
        <Row title="Break time" value="6 min" />
      </Group>
      <Text style={styles.footnote}>Signals are compared with Maya’s own baseline and need a person’s judgment. HeatSense does not diagnose heat illness.</Text>
    </>
  );
}

function ProtocolsScreen() {
  const [mode, setMode] = useState<'immediate' | 'recovery'>('immediate');
  const steps = mode === 'immediate'
    ? [
        ['Stop activity', 'Move the athlete to shade or a cooled area.'],
        ['Assess right away', 'Check responsiveness and follow the school’s emergency procedures.'],
        ['Escalate when needed', 'Call emergency services for collapse or suspected heat stroke.'],
      ]
    : [
        ['Stay with the athlete', 'Keep supervising. Do not allow a return to activity.'],
        ['Track recovery', 'Record symptoms, cooling steps and how the athlete responds.'],
        ['Follow clearance policy', 'Use district and medical guidance before any return to play.'],
      ];

  return (
    <>
      <LargeTitle title="Protocols" />
      <View style={styles.firstBlock}>
        <Group inset={59}>
          <Row
            detail="Activate the emergency action plan now."
            leading={<IconTile color={Palette.emergency} icon={icons.medical} />}
            strong
            title="Collapse, confusion, or loss of consciousness"
          />
        </Group>
      </View>

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
        <Group inset={56}>
          {steps.map(([title, detail], index) => (
            <Row detail={detail} key={title} leading={<StepNumber n={index + 1} />} title={title} />
          ))}
        </Group>
      </View>
      <View style={styles.block}>
        <Group inset={59}>
          <Row
            detail="Then your campus office and district EAP"
            leading={<IconTile color={Palette.emergency} icon={icons.phone} />}
            onPress={() => Alert.alert('Call 911?', 'This places a real phone call.', [
              { style: 'cancel', text: 'Cancel' },
              { onPress: () => Linking.openURL('tel:911'), style: 'destructive', text: 'Call 911' },
            ])}
            title="Call 911"
          />
        </Group>
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
      <Card style={styles.block}>
        <View style={styles.statusTop}>
          <HeatIcon name={icons.check} size={30} tintColor={Palette.safe} />
          <Text style={styles.cardNameInline}>Within your usual range</Text>
        </View>
        <Text style={styles.cardBodyTop}>Keep following today’s Orange-zone plan and take every scheduled water break.</Text>
      </Card>

      <SectionHeader title="Today’s signals" />
      <Group>
        <Row title="Heart-rate recovery" value="Normal" />
        <Row title="Skin trend" value={temp.delta(0.3)} />
        <Row title="Sweat trend" value="+4%" />
        <Row title="Exertion" value="Moderate" />
      </Group>

      <SectionHeader title="This week" />
      <Card>
        <CardHeader icon={icons.heart} label="Recovery time" trailing="8 min average" />
        <LineChart labels={['Mon', 'Today']} max={12} min={0} summary="Minutes to recover after breaks this week, steady at about 8" tone={Palette.safe} values={[9, 8, 9, 8, 7, 8, 8]} />
      </Card>
    </>
  );
}

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
      <Card style={styles.block}>
        <CardHeader icon={icons.heart} label="Recovery time" trailing={period === 'week' ? 'Last 7 days' : 'Last 4 weeks'} />
        <View style={styles.valueRow}>
          <Text style={styles.heroValue}>{period === 'week' ? '8' : '9'}</Text>
          <Text style={styles.heroUnit}>min average</Text>
        </View>
        <LineChart
          labels={period === 'week' ? ['Sep 9', 'Today'] : ['Aug 19', 'Today']}
          max={12}
          min={0}
          summary="Average recovery time, stable"
          tone={Palette.safe}
          values={period === 'week' ? [9, 8, 9, 8, 7, 8, 8] : [10, 9, 9, 10, 9, 8, 9, 9, 8]}
        />
        <View style={styles.statRow}>
          <Stat label="Sessions" value={period === 'week' ? '3' : '11'} />
          <Stat label="Alerts" value={period === 'week' ? '0' : '1'} />
        </View>
      </Card>

      <SectionHeader title="Recent" />
      <Group>
        <SessionRow date="Sep 15" detail="72 min · Orange zone" title="Varsity conditioning" />
        <SessionRow date="Sep 13" detail="58 min · Yellow zone" title="Technical practice" />
        <SessionRow date="Sep 11" detail="81 min · Orange zone" title="Scrimmage" />
      </Group>
    </>
  );
}

function LearnScreen() {
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (id: string) => setOpen(open === id ? null : id);
  return (
    <>
      <LargeTitle title="Learn" />
      <View style={styles.firstBlock}>
        <Group inset={59}>
          <Row
            detail="Dizziness, confusion, fainting or unusual behavior should never wait."
            leading={<IconTile color={Palette.emergency} icon={icons.warning} />}
            strong
            title="Stop and tell an adult"
          />
        </Group>
      </View>

      <SectionHeader title="Guides" />
      <Group>
        <Guide
          body="WBGT sets the team-wide safety plan, so everyone follows the same work, rest, water and equipment rules. Your coach adjusts them as conditions change."
          expanded={open === 'wbgt'}
          onPress={() => toggle('wbgt')}
          title="What WBGT means"
        />
        <Guide
          body="Use every scheduled break. Drink water, get into shade when you can, and notice whether your heart rate is settling."
          expanded={open === 'hydration'}
          onPress={() => toggle('hydration')}
          title="Hydration and recovery"
        />
        <Guide
          body="Do not push through symptoms. Stop, find a coach or trainer, and stay with a teammate who needs help."
          expanded={open === 'speak'}
          onPress={() => toggle('speak')}
          title="When to speak up"
        />
        <Guide
          body="Headache, nausea, cramps, heavy sweating, dizziness or unusual tiredness are early warnings. Confusion, fainting or hot, dry skin is an emergency. Tell an adult right away."
          expanded={open === 'signs'}
          onPress={() => toggle('signs')}
          title="Signs of heat illness"
        />
        <Guide
          body="Light, loose, moisture-wicking clothes help. When your coach allows it, take off helmets and pads during breaks so you can cool down."
          expanded={open === 'dress'}
          onPress={() => toggle('dress')}
          title="What to wear"
        />
        <Guide
          body="Your body adapts to heat over roughly one to two weeks. Early-season practices are shorter and lighter on purpose, so don’t try to make up for it."
          expanded={open === 'adapt'}
          onPress={() => toggle('adapt')}
          title="Getting used to the heat"
        />
      </Group>
    </>
  );
}

function ProfileScreen({ role }: { role: string }) {
  const isAthlete = role === 'Athlete';
  const isCoach = role === 'Coach';
  const name = isAthlete ? 'Maya Chen' : isCoach ? 'Coach Rivera' : 'Alex Thompson';
  const { school, name: teamName } = useTeam();
  const { bandConnected, celsius, compactRoster, practiceLiveActivity } = usePreferences();

  const disconnectBand = () =>
    Alert.alert('Disconnect HeatSense Band?', 'Your personal recovery, skin, sweat and movement trends stop until you pair again. The team’s field plan isn’t affected.', [
      { style: 'cancel', text: 'Cancel' },
      { onPress: () => setPreference('bandConnected', false), style: 'destructive', text: 'Disconnect' },
    ]);

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

  return (
    <>
      <LargeTitle title="Profile" />
      <View style={styles.firstBlock}>
        <Group inset={80}>
          <Row detail={`${role} · ${school}`} leading={<Initials name={name} size={52} />} showChevron={false} title={name} />
        </Group>
      </View>

      <SectionHeader title="Team" />
      <Group>
        <Row title="Name" value={teamName} />
        {isAthlete ? (
          <Row
            onPress={bandConnected ? disconnectBand : () => router.push('/dashboard?role=athlete&state=pairing')}
            title="HeatSense Band"
            value={bandConnected ? 'Connected' : 'Not connected'}
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
      leading={<Initials name={name} />}
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

const styles = StyleSheet.create({
  firstBlock: { marginTop: Spacing.three },
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
});
