import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type ReactNode } from 'react';
import { AppState, Modal, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, FadeInDown, LinearTransition, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoachColors as C, CoachFonts as F } from '@/constants/coach-theme';
import { coachProfile, coachRoster, practice, recheckState, type CoachAthlete } from './coach-data';
import { FlameMascot } from './flame-mascot';
import { InstrumentIcon, type InstrumentIconName } from './instrument-icon';
import { RiskHero as OriginalRiskHero } from '@/components/dashboard-content';
import { WorkspaceProgress, WorkspaceSectionTitle } from './workspace-ui';

type CoachTab = 'home' | 'plan' | 'team' | 'alerts' | 'profile';
const tabs: { id: CoachTab; name: string; icon: InstrumentIconName }[] = [
  { id: 'home', name: 'Home', icon: 'home' },
  { id: 'plan', name: 'Plan', icon: 'plan' },
  { id: 'team', name: 'Team', icon: 'team' },
  { id: 'alerts', name: 'Alerts', icon: 'bell' },
  { id: 'profile', name: 'Profile', icon: 'profile' },
];
const adjustments: { icon: InstrumentIconName; label: string; value: string; detail: string }[] = [
  { icon: 'clock', label: 'Work / rest', value: '20 / 10', detail: 'minutes' },
  { icon: 'water', label: 'Water', value: 'Every 10', detail: 'minutes' },
  { icon: 'equipment', label: 'Equipment', value: 'Remove', detail: 'during breaks' },
];

function Action({ children, onPress, label, style, selected, tab = false, filled = false }: { children: ReactNode; onPress: () => void; label: string; style?: StyleProp<ViewStyle>; selected?: boolean; tab?: boolean; filled?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole={tab ? 'tab' : 'button'} accessibilityLabel={label} accessibilityState={selected === undefined ? undefined : { selected }} onPress={onPress} onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={({ pressed }) => [s.action, style, (hovered || pressed) && (filled ? { backgroundColor: C.peach } : s.actionHover), focused && s.actionFocus]}>{children}</Pressable>;
}

export function CoachWorkspace({ activeTab, onTabChange, reviewState }: { activeTab: string; onTabChange: (tab: string) => void; reviewState?: string | null }) {
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const [clock, setClock] = useState({ measuredAt: 0, now: 120000 });
  const [selectedAthlete, setSelectedAthlete] = useState<CoachAthlete | null>(null);
  const [filter, setFilter] = useState('All');
  const [info, setInfo] = useState<string | null>(null);
  const [alertsAcknowledged, setAlertsAcknowledged] = useState(false);

  useEffect(() => {
    const measuredAt = Date.now() - 120000;
    const update = () => setClock({ measuredAt, now: Date.now() });
    update();
    const interval = setInterval(update, 1000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') update(); });
    return () => { clearInterval(interval); subscription.remove(); };
  }, []);

  const countdown = recheckState(clock.measuredAt, clock.now);
  const urgency = { Review: 0, Caution: 1, Normal: 2 } as const;
  const attention = coachRoster.filter((athlete) => athlete.status !== 'Normal').sort((a, b) => urgency[a.status] - urgency[b.status]);
  // The bubble reflects real workspace state: recheck timer first, then open follow-ups.
  const mascotMessage = reviewState === 'weather-stale' || countdown.due
    ? 'Field recheck is due'
    : attention.length > 0
      ? `${attention.length} athlete${attention.length === 1 ? '' : 's'} to check on`
      : 'You’re all caught up!';
  const visible = coachRoster.filter((athlete) => filter === 'All' || (filter === 'Needs attention' ? athlete.status !== 'Normal' : athlete.status === 'Normal'));
  const go = (tab: string) => { onTabChange(tab); };

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <LinearGradient pointerEvents="none" colors={['#12161C', C.background, C.background]} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
      <SafeAreaView edges={['top']} style={s.safe}>
        <View style={s.shell}>
          {activeTab !== 'home' && <View style={s.header}>
            <View style={s.row}>
              <View style={s.brandTile}><InstrumentIcon name="heat" size={26} /></View>
              <View><Text style={s.workspace}>COACH WORKSPACE</Text><Text style={s.brand}>Coach Rivera</Text></View>
            </View>
            <Action label="Open coach alerts" onPress={() => go('alerts')} style={s.bell}>
              <InstrumentIcon name="bell" size={23} />
              {!alertsAcknowledged && <View style={s.notificationDot} />}
            </Action>
          </View>}
          <ScrollView key={activeTab} contentContainerStyle={[s.scroll, { paddingBottom: 120 + insets.bottom }]} showsVerticalScrollIndicator={false}>
            {activeTab !== 'home' && <View style={s.contextRow}><Text style={s.context}>Varsity soccer · Memorial Stadium</Text><Text style={s.demo}>SAMPLE DATA</Text></View>}
            <Animated.View entering={reducedMotion ? undefined : FadeInDown.duration(280)}>
              {activeTab === 'home' && <>
                <GreetingHeader message={mascotMessage} />
                {reviewState === 'weather-stale' ? <Notice title="Field reading is out of date" body="Take a new field measurement before relying on the practice plan." icon="alert" /> : <RiskInstrument countdown={countdown} />}
                <PracticeOverview onFullPlan={() => go('plan')} />
                <View style={s.overviewHeading}>
                  <View style={s.row}><Text accessibilityRole="header" style={s.overviewTitle}>Needs attention</Text><Text style={s.attentionCount}>{attention.length}</Text></View>
                  <PeachButton label="View team" onPress={() => go('team')} compact />
                </View>
                <View style={s.attentionList}>
                  {attention.length === 0 ? <Text style={s.attentionDetail}>No athletes need a follow-up right now.</Text> : attention.map((athlete, index) => <AttentionRow athlete={athlete} key={athlete.name} index={index} onPress={() => setSelectedAthlete(athlete)} />)}
                </View>
                <Text style={[s.sampleNote, { marginTop: 32 }]}>Sample data · illustrative field reading and practice adjustments.</Text>
              </>}
              {activeTab === 'plan' && <>
                <PageTitle title="Practice plan" detail="Varsity soccer · Memorial Stadium" />
                <RiskInstrument countdown={countdown} />
                <Section title="Today’s adjustments" />
                <View style={s.adjustments}>{adjustments.map((rule) => <View style={s.adjustment} key={rule.label}><InstrumentIcon name={rule.icon} color={C.secondary} /><Text style={s.adjustmentLabel}>{rule.label}</Text><Text style={s.adjustmentValue}>{rule.value}</Text><Text style={s.adjustmentDetail}>{rule.detail}</Text></View>)}</View>
                <Section title="Practice timeline" />
                <View style={[s.card, { padding: 20 }]}>{[
                  ['4:00', 'Arrival and baseline check', 'Water available before warm-up'],
                  ['4:10', '20-minute work block', 'Monitor heavy equipment and athlete response'],
                  ['4:30', '10-minute recovery', 'Shade, water, and athlete check'],
                ].map(([time, title, detail], index) => <View style={s.timelineRow} key={time}><Text style={s.timelineTime}>{time}</Text><View style={s.timelineRail}><View style={s.timelineDot} />{index < 2 && <View style={s.timelineLine} />}</View><View style={s.flex}><Text style={s.rowTitle}>{title}</Text><Text style={s.rowDetail}>{detail}</Text></View></View>)}</View>
                <Text style={s.sampleNote}>Sample plan. School-specific rules are not connected.</Text>
              </>}
              {activeTab === 'team' && <>
                <PageTitle title="Team status" detail="Varsity soccer · 6 athletes" />
                {reviewState === 'empty-team' ? <Notice title="No athletes added yet" body="Your team roster will appear here once connected." icon="team" /> : <>
                  <View style={[s.card, { marginTop: 20 }]}><View style={s.cardInset}><Text style={s.cardTitle}>2 need attention</Text><Text style={s.rowDetail}>Personal signals, with the field plan in view.</Text></View><RosterSummary /></View>
                  <View style={s.filters}>{['All', 'Needs attention', 'Normal'].map((label) => <Action key={label} label={`Filter team: ${label}`} selected={filter === label} onPress={() => setFilter(label)} style={[s.filter, filter === label && s.selectedFilter]}><Text style={[s.filterText, filter === label && { color: C.accent }]}>{label}</Text></Action>)}</View>
                  <View style={s.list}>{visible.map((athlete, index) => <AthleteRow athlete={athlete} key={athlete.name} index={index} onPress={() => setSelectedAthlete(athlete)} />)}</View>
                </>}
              </>}
              {activeTab === 'alerts' && <>
                <PageTitle title="Alerts" detail="Athlete exceptions and field conditions" />
                <View style={[s.card, s.alertCard]}><View style={s.spread}><InstrumentIcon name="alert" color={C.orange} /><StatusPill status={alertsAcknowledged || reviewState === 'alert-acknowledged' ? 'Acknowledged' : 'Review'} color={alertsAcknowledged ? C.accent : C.orange} /></View><Text style={s.alertTitle}>Maya needs a recovery check.</Text><Text style={s.body}>Elevated heart rate and rising skin trend continued through a low-movement break.</Text><Action label="Open Maya’s recovery review" onPress={() => setSelectedAthlete(coachRoster[0])} filled style={s.primaryButton}><Text style={s.primaryText}>Open athlete review</Text><InstrumentIcon name="arrow" color={C.background} size={18} /></Action>{!alertsAcknowledged && <Action label="Acknowledge sample alert" onPress={() => setAlertsAcknowledged(true)} style={s.centerAction}><Text style={s.link}>Acknowledge alert</Text></Action>}</View>
                <Section title="Earlier today" />
                <View style={s.card}><History title="Hydration reminder" detail="Jordan Lee · acknowledged" time="3:52 PM" /><History title="WBGT entered Orange zone" detail="Practice plan updated" time="3:35 PM" /></View>
              </>}
              {activeTab === 'profile' && <>
                <PageTitle title="Coach profile" detail="Workspace and preferences" />
                <View style={[s.card, s.profileCard]}><View style={s.profileAvatar}><Text style={s.profileInitials}>CR</Text></View><View style={s.flex}><Text style={s.cardTitle}>Coach Rivera</Text><Text style={s.rowDetail}>Liberty High School · Varsity soccer</Text></View></View>
                <Section title="Workspace" />
                <View style={s.card}>{[
                  ['team', 'School and team', 'Liberty High School · Soccer', 'This preview uses a sample school and roster. Team setup will be available when accounts are connected.'],
                  ['bell', 'Alert preferences', 'Warnings and emergencies', 'Coach alerts are shown in the Alerts tab. Notification delivery is not connected in this preview.'],
                  ['signal', 'Wristbands', 'Optional athlete signals', 'A wristband adds individual context. The field practice plan remains available without one.'],
                  ['shield', 'Data permissions', 'Role-based team access', 'This workspace contains sample athletes only. Real team data will require school-managed access.'],
                ].map(([icon, title, detail, description]) => <Action key={title} label={title} onPress={() => setInfo(description)} style={s.settingRow}><InstrumentIcon name={icon as InstrumentIconName} color={C.secondary} /><View style={s.flex}><Text style={s.rowTitle}>{title}</Text><Text style={s.rowDetail}>{detail}</Text></View><InstrumentIcon name="chevron" color={C.muted} size={17} /></Action>)}</View>
                <Action label="Return to role selection" onPress={() => router.push('/?step=7')} style={s.centerAction}><Text style={s.link}>Switch workspace</Text><InstrumentIcon name="arrow" color={C.accent} size={17} /></Action>
              </>}
            </Animated.View>
          </ScrollView>
          <LinearGradient pointerEvents="none" colors={['rgba(13,16,21,0)', C.background, C.background]} locations={[0, 0.35, 1]} style={[s.dockScrim, { height: 110 + Math.max(insets.bottom, 14) }]} />
          <View style={[s.dockWrap, { bottom: Math.max(insets.bottom, 14) }]}><View style={s.dock}>{tabs.map((tab) => <DockItem key={tab.id} icon={tab.icon} label={tab.name} active={activeTab === tab.id} badge={tab.id === 'alerts' && !alertsAcknowledged} onPress={() => go(tab.id)} />)}</View></View>
        </View>
      </SafeAreaView>
      <Modal visible={selectedAthlete !== null || info !== null} transparent animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={() => { setSelectedAthlete(null); setInfo(null); }}>
        <View style={s.modalBackdrop}><View accessibilityViewIsModal style={s.modal}><ScrollView bounces={false}>
          <View style={s.spread}><Text style={s.workspace}>{selectedAthlete ? 'ATHLETE REVIEW' : 'WORKSPACE'}</Text><Action label="Close details" onPress={() => { setSelectedAthlete(null); setInfo(null); }} style={s.close}><InstrumentIcon name="close" /></Action></View>
          {selectedAthlete ? <><Text style={s.modalTitle}>{selectedAthlete.name}</Text><View style={{ alignItems: 'flex-start', marginVertical: 16 }}><StatusPill status={selectedAthlete.status} color={selectedAthlete.color} /></View><Text style={s.body}>{selectedAthlete.detail}</Text><Text style={s.rowDetail}>Varsity soccer · Sample athlete</Text>{selectedAthlete.name === 'Maya Chen' && <><View style={s.reviewMetrics}><View><Text style={s.reviewValue}>142 <Text style={s.rowDetail}>bpm</Text></Text><Text style={s.rowDetail}>Heart-rate recovery</Text></View><View><Text style={s.reviewValue}>6 <Text style={s.rowDetail}>min</Text></Text><Text style={s.rowDetail}>Into rest break</Text></View></View><Text style={s.body}>Recovery is slower than Maya’s usual range while movement remains low. Check on the athlete in person.</Text><Action label="View detailed athlete context" onPress={() => { setSelectedAthlete(null); router.push({ pathname: '/detail', params: { kind: 'athlete', name: 'Maya Chen' } }); }} filled style={s.primaryButton}><Text style={s.primaryText}>Full athlete context</Text><InstrumentIcon name="arrow" color={C.background} size={18} /></Action></>}</> : <Text style={s.body}>{info}</Text>}
        </ScrollView></View></View>
      </Modal>
    </View>
  );
}

// Primary contextual action: shares the warm gradient language of the heat-risk card.
function PeachButton({ label, accessibilityLabel, onPress, compact = false }: { label: string; accessibilityLabel?: string; onPress: () => void; compact?: boolean }) {
  const reducedMotion = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} onPress={onPress} onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)} onPressIn={() => { if (!reducedMotion) scale.set(withTiming(0.95, { duration: 90 })); }} onPressOut={() => { scale.set(withTiming(1, { duration: 140 })); }} hitSlop={compact ? 6 : 2}>
    <Animated.View style={[style, hovered && { opacity: 0.9 }]}>
      <LinearGradient colors={[C.peach, C.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.peachButton, compact && s.peachButtonCompact]}>
        <Text style={s.peachText}>{label}</Text>
        <InstrumentIcon name="arrow" size={compact ? 14 : 15} color={C.onAccent} />
      </LinearGradient>
    </Animated.View>
  </Pressable>;
}

// Visual-only pill for use inside an already pressable row (no nested buttons).
function PeachPill({ label }: { label: string }) {
  return <LinearGradient colors={[C.peach, C.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.peachButton, s.peachButtonCompact]}>
    <Text style={s.peachText}>{label}</Text>
    <InstrumentIcon name="arrow" size={14} color={C.onAccent} />
  </LinearGradient>;
}

function greetingFor(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function GreetingHeader({ message }: { message: string }) {
  const reducedMotion = useReducedMotion();
  const bubble = useSharedValue(reducedMotion ? 1 : 0);
  useEffect(() => { bubble.value = withDelay(reducedMotion ? 0 : 450, withTiming(1, { duration: reducedMotion ? 0 : 380, easing: Easing.out(Easing.cubic) })); }, [bubble, message, reducedMotion]);
  const bubbleStyle = useAnimatedStyle(() => ({ opacity: bubble.value, transform: [{ translateY: (1 - bubble.value) * 6 }] }));
  return <View style={s.greeting}>
    <View style={s.greetingCopy}>
      <Text style={s.brandLabel}>HEATSENSE</Text>
      <Text accessibilityRole="header" style={s.greetingTitle}>{greetingFor(new Date())}, {coachProfile.firstName}</Text>
      <Text style={s.greetingSub}>Here’s your field update for today</Text>
    </View>
    <View style={s.mascotColumn}>
      <Animated.View accessibilityLiveRegion="polite" style={[s.bubbleAnchor, bubbleStyle]}>
        <View style={s.bubble}>
          <Text numberOfLines={1} style={s.bubbleText}>{message}</Text>
          <View style={s.bubbleTail} />
        </View>
      </Animated.View>
      <FlameMascot height={104} />
    </View>
  </View>;
}

function PracticeOverview({ onFullPlan }: { onFullPlan: () => void }) {
  return <View style={s.overview}>
    <View style={s.overviewHeading}>
      <Text accessibilityRole="header" style={s.overviewTitle}>Today’s practice</Text>
      <PeachButton label="Full plan" onPress={onFullPlan} compact />
    </View>
    <Text style={s.metric}>{practice.workRest}</Text>
    <Text style={s.metricLabel}>Work / rest · minutes</Text>
    <View style={s.practiceColumns}>
      <View style={s.practiceItem}><View style={s.practiceLabelRow}><InstrumentIcon name="water" size={16} color={C.accent} /><Text style={s.practiceLabel}>Hydration</Text></View><Text style={s.practiceValue}>{practice.hydration}</Text></View>
      <View style={s.practiceItem}><View style={s.practiceLabelRow}><InstrumentIcon name="equipment" size={16} color={C.accent} /><Text style={s.practiceLabel}>Equipment</Text></View><Text style={s.practiceValue}>{practice.equipment}</Text></View>
    </View>
  </View>;
}

function AttentionRow({ athlete, index, onPress }: { athlete: CoachAthlete; index: number; onPress: () => void }) {
  const reducedMotion = useReducedMotion();
  const urgent = athlete.status === 'Review';
  return <Animated.View entering={reducedMotion ? undefined : FadeInDown.duration(300).delay(index * 60)}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Review ${athlete.name}, ${athlete.detail}`} onPress={onPress} style={({ pressed }) => [s.attentionRow, pressed && { opacity: 0.7 }]}>
      <View style={[s.attentionAvatar, urgent && s.attentionAvatarUrgent]}><Text style={[s.attentionInitials, urgent && { color: C.accent }]}>{athlete.name.split(' ').map((name) => name[0]).join('')}</Text></View>
      <View style={s.flex}><Text style={s.attentionName}>{athlete.name}</Text><Text style={s.attentionDetail}>{athlete.detail}</Text></View>
      {urgent ? <PeachPill label="Review" /> : <InstrumentIcon name="chevron" size={16} color={C.muted} />}
    </Pressable>
  </Animated.View>;
}

function RiskInstrument({ countdown }: { countdown: ReturnType<typeof recheckState> }) {
  return <>
    {/* The approved hero stays exactly as it was: original colors, type and chart. */}
    <OriginalRiskHero mode="coach" />
    <View style={s.recheckCard}>
      <View style={s.timerRow}>
        <WorkspaceSectionTitle title={countdown.due ? 'Field recheck due' : 'Next field recheck'} />
        <Text selectable accessibilityLiveRegion={countdown.due ? 'polite' : 'none'} style={s.timerValue}>{countdown.due ? 'DUE NOW' : countdown.label}</Text>
      </View>
      <WorkspaceProgress value={countdown.fraction} label={countdown.due ? 'Field recheck due now' : `${countdown.label} remaining until field recheck`} />
      {countdown.due && <Text style={s.body}>Take a new field reading before relying on these adjustments.</Text>}
    </View>
  </>;
}

function AthleteRow({ athlete, index, onPress }: { athlete: CoachAthlete; index: number; onPress: () => void }) {
  const reducedMotion = useReducedMotion();
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (athlete.status === 'Review' && !reducedMotion) pulse.value = withRepeat(withSequence(withTiming(0.35, { duration: 1400 }), withTiming(0.9, { duration: 1400 })), -1);
    else pulse.value = 1;
    return () => cancelAnimation(pulse);
  }, [athlete.status, pulse, reducedMotion]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return <Animated.View entering={reducedMotion ? undefined : FadeInDown.duration(300).delay(index * 45)} layout={reducedMotion ? undefined : LinearTransition.duration(250)}><Action label={`Review ${athlete.name}, ${athlete.status}`} onPress={onPress} style={s.athleteRow}><View style={[s.avatar, { borderColor: athlete.status === 'Review' ? C.accent : athlete.color }]}>{athlete.status === 'Review' && <Animated.View style={[s.avatarPulse, { borderColor: C.accent }, pulseStyle]} />}<Text style={s.initials}>{athlete.name.split(' ').map((name) => name[0]).join('')}</Text></View><View style={s.flex}><Text style={s.athleteName}>{athlete.name}</Text><Text style={s.athleteDetail}>{athlete.detail}</Text></View><StatusPill status={athlete.status} color={athlete.color} /><InstrumentIcon name="chevron" size={14} color={C.muted} /></Action></Animated.View>;
}

function RosterSummary() {
  const groups = [
    { label: 'Normal', count: coachRoster.filter((athlete) => athlete.status === 'Normal').length },
    { label: 'Caution', count: coachRoster.filter((athlete) => athlete.status === 'Caution').length },
    { label: 'Review', count: coachRoster.filter((athlete) => athlete.status === 'Review').length },
  ];
  return <View style={s.rosterSummary}>
    <View style={s.spread}><WorkspaceSectionTitle title="Team overview" /><Text style={s.rosterCount}>{coachRoster.length} athletes</Text></View>
    <WorkspaceProgress value={1} segments={groups.map((group) => group.count)} label={groups.map((group) => `${group.count} ${group.label.toLowerCase()}`).join(', ')} />
    <View style={s.rosterLegendRow}>{groups.map((group) => <View key={group.label} style={s.rosterLegendItem}><Text style={s.rosterStat}>{group.count}</Text><Text style={s.rosterLegend}>{group.label}</Text></View>)}</View>
  </View>;
}

function StatusPill({ status, color }: { status: string; color: string }) {
  const reducedMotion = useReducedMotion();
  const fill = useSharedValue(color);
  useEffect(() => { fill.value = withTiming(color, { duration: reducedMotion ? 0 : 350 }); }, [color, fill, reducedMotion]);
  const style = useAnimatedStyle(() => ({ backgroundColor: fill.value }));
  return <Animated.View style={[s.pill, style]}><Text style={s.pillText}>{status}</Text></Animated.View>;
}
function Section({ title, action, onPress, count }: { title: string; action?: string; onPress?: () => void; count?: number }) { return <View style={s.section}><View style={[s.row, { gap: 8, flexShrink: 1 }]}><WorkspaceSectionTitle title={title} />{count !== undefined && <Text style={s.sectionCount}>{count.toString().padStart(2, '0')}</Text>}</View>{action && onPress && <Action label={action} onPress={onPress} style={s.sectionAction}><Text style={s.link}>{action}</Text><InstrumentIcon name="arrow" size={15} color={C.accent} /></Action>}</View>; }
function PageTitle({ title, detail }: { title: string; detail: string }) { return <View><Text accessibilityRole="header" style={s.title}>{title}</Text><Text style={s.body}>{detail}</Text></View>; }
function History({ title, detail, time }: { title: string; detail: string; time: string }) { return <View style={s.history}><InstrumentIcon name="bell" size={19} color={C.secondary} /><View style={s.flex}><Text style={s.rowTitle}>{title}</Text><Text style={s.rowDetail}>{detail}</Text></View><Text style={s.rosterLegend}>{time}</Text></View>; }
function Notice({ title, body, icon }: { title: string; body: string; icon: InstrumentIconName }) { return <View style={[s.card, s.cardInset, { marginTop: 20 }]}><InstrumentIcon name={icon} color={C.orange} /><Text style={[s.cardTitle, { marginTop: 14 }]}>{title}</Text><Text style={s.body}>{body}</Text></View>; }
function DockItem({ icon, label, active, badge = false, onPress }: { icon: InstrumentIconName; label: string; active: boolean; badge?: boolean; onPress: () => void }) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(active ? 1 : 0);
  useEffect(() => { progress.value = withTiming(active ? 1 : 0, { duration: reducedMotion ? 0 : 220 }); }, [active, progress, reducedMotion]);
  const style = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ scaleX: 0.3 + progress.value * 0.7 }] }));
  return <Action tab label={label} selected={active} onPress={onPress} style={s.dockItem}><View><InstrumentIcon name={icon} color={active ? C.accent : C.secondary} size={21} />{badge && <View style={s.dockBadge} />}</View><Text style={[s.dockLabel, active && { color: C.accent }]}>{label}</Text><Animated.View style={[s.dockIndicator, style]} /></Action>;
}

const s = StyleSheet.create({
  root: { backgroundColor: C.background, flex: 1 }, safe: { flex: 1 }, shell: { alignSelf: 'center', maxWidth: 580, width: '100%', flex: 1 }, flex: { flex: 1, minWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: C.line },
  brand: { color: C.text, fontWeight: '700', fontSize: 30, letterSpacing: -0.7 , lineHeight: 34}, workspace: { color: C.muted, fontWeight: '600', fontSize: 13, letterSpacing: 1.8, marginTop: 4 },
  bell: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderColor: C.line, borderWidth: 1 }, notificationDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent, position: 'absolute', right: 10, top: 10 },
  action: { minHeight: 44, borderRadius: 10 }, actionHover: { backgroundColor: '#22262D' }, actionFocus: { outlineColor: C.accent, outlineStyle: 'solid', outlineWidth: 2, outlineOffset: 2 },
  scroll: { paddingHorizontal: 22, paddingTop: 20 }, contextRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 20 }, context: { color: C.secondary, fontWeight: '600', fontSize: 13 }, demo: { color: C.muted, fontWeight: '600', fontSize: 13, letterSpacing: 1.2, borderColor: C.line, borderWidth: 1, borderRadius: 4, padding: 5 },
  title: { color: C.text, fontWeight: '700', fontSize: 38, lineHeight: 42, letterSpacing: -1.2, marginBottom: 8 },
  brandTile: { width: 50, height: 50, borderRadius: 15, backgroundColor: C.raised, borderColor: C.line, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  recheckCard: { backgroundColor: C.surface, borderRadius: 18, padding: 20, marginTop: 16, borderColor: C.line, borderWidth: 1, gap: 18 },
  timerRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  timerValue: { color: C.text, fontWeight: '700', fontSize: 36, lineHeight: 40, fontVariant: ['tabular-nums'] },
  rosterLegendRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rosterLegendItem: { flex: 1, gap: 3 },
  rosterStat: { color: C.text, fontWeight: '700', fontSize: 30, fontVariant: ['tabular-nums'] },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginTop: 28, marginBottom: 12, minHeight: 44 },  sectionCount: { color: C.muted, fontWeight: '600', fontSize: 13 }, sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 5, flexShrink: 0 }, link: { color: C.accent, fontWeight: '600', fontSize: 13 },
  adjustments: { flexDirection: 'row', gap: 9 }, adjustment: { flex: 1, minWidth: 0, padding: 13, paddingVertical: 17, borderRadius: 15, backgroundColor: C.surface, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.055)' }, adjustmentLabel: { color: C.secondary, fontWeight: '600', fontSize: 13, marginTop: 16 }, adjustmentValue: { color: C.text, fontWeight: '700', fontSize: 24, letterSpacing: -0.6, marginTop: 7 , lineHeight: 28, fontVariant: ['tabular-nums']}, adjustmentDetail: { color: C.muted, fontWeight: '600', fontSize: 13, marginTop: 4 },
  card: { backgroundColor: C.surface, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: C.line }, list: { backgroundColor: C.surface, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: C.line }, cardInset: { padding: 20 }, cardTitle: { color: C.text, fontWeight: '700', fontSize: 28, letterSpacing: -0.5 , lineHeight: 32},
  athleteRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 20, borderRadius: 0, borderBottomWidth: 1, borderBottomColor: C.line }, avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }, avatarPulse: { position: 'absolute', left: -4, top: -4, right: -4, bottom: -4, borderRadius: 22, borderWidth: 1 }, initials: { color: C.text, fontWeight: '600', fontSize: 13 }, athleteName: { color: C.text, fontWeight: '700', fontSize: 16, letterSpacing: -0.2 }, athleteDetail: { color: C.secondary, fontWeight: '600', fontSize: 13, lineHeight: 19, marginTop: 5 }, pill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 }, pillText: { color: C.background, fontWeight: '700', fontSize: 13 },
  rosterSummary: { padding: 16, gap: 18 }, rosterCount: { color: C.secondary, fontWeight: '600', fontSize: 13 }, rosterLegend: { color: C.muted, fontWeight: '600', fontSize: 13 }, sampleNote: { color: C.muted, fontWeight: '600', fontSize: 13, lineHeight: 19, marginTop: 15, textAlign: 'center' },
  dockScrim: { position: 'absolute', left: 0, right: 0, bottom: 0 }, dockWrap: { position: 'absolute', left: 18, right: 18, borderRadius: 25, boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }, dock: { borderRadius: 25, backgroundColor: '#1B1F26', borderColor: 'rgba(255,255,255,0.12)', borderWidth: 1, flexDirection: 'row', padding: 6, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }, dockItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 54, borderRadius: 18, paddingTop: 2, paddingBottom: 6 }, dockLabel: { fontWeight: '500', fontSize: 12, color: C.secondary }, dockBadge: { position: 'absolute', top: -1, right: -3, width: 7, height: 7, borderRadius: 4, backgroundColor: C.accent, borderWidth: 1.5, borderColor: '#1B1F26' }, dockIndicator: { position: 'absolute', bottom: 1, height: 2, width: 15, borderRadius: 2, backgroundColor: C.accent, boxShadow: '0 0 8px rgba(255,153,107,0.5)' },
  body: { color: C.secondary, fontWeight: '600', fontSize: 15, lineHeight: 23, marginTop: 8 }, rowTitle: { color: C.text, fontWeight: '700', fontSize: 15 }, rowDetail: { color: C.secondary, fontWeight: '600', fontSize: 13, lineHeight: 19, marginTop: 5 }, timelineRow: { flexDirection: 'row', gap: 12, minHeight: 87 }, timelineTime: { color: C.secondary, fontWeight: '600', fontSize: 13, width: 44, marginTop: 2 }, timelineRail: { alignItems: 'center', width: 12 }, timelineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.accent, marginTop: 4 }, timelineLine: { flex: 1, width: 1, backgroundColor: C.line, marginVertical: 6 },
  filters: { flexWrap: 'wrap', flexDirection: 'row', gap: 8, marginVertical: 20 }, filter: { borderColor: C.line, borderWidth: 1, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 12 }, selectedFilter: { borderColor: C.accent, backgroundColor: '#2A1D16' }, filterText: { color: C.secondary, fontWeight: '600', fontSize: 13 },
  alertCard: { padding: 22, marginTop: 24, borderColor: '#67472E' }, alertTitle: { color: C.text, fontWeight: '700', fontSize: 32, lineHeight: 36, letterSpacing: -0.8, marginTop: 24 }, primaryButton: { backgroundColor: C.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 48, marginTop: 22, borderRadius: 12 }, primaryText: { color: C.background, fontWeight: '600', fontSize: 13 }, centerAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 }, history: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderBottomColor: C.line, borderBottomWidth: 1 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, marginTop: 24 }, profileAvatar: { width: 52, height: 52, borderRadius: 26, borderColor: C.accent, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background }, profileInitials: { color: C.text, fontWeight: '600', fontSize: 16 }, settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderRadius: 0, borderBottomColor: C.line, borderBottomWidth: 1 },
  greeting: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, paddingTop: 30, marginBottom: 22 }, greetingCopy: { flex: 1, minWidth: 0, paddingBottom: 8 },
  brandLabel: { color: C.muted, fontWeight: '600', fontSize: 11, letterSpacing: 1.6 }, greetingTitle: { color: C.text, fontWeight: '600', fontSize: 24, lineHeight: 30, letterSpacing: -0.4, marginTop: 8 }, greetingSub: { color: C.secondary, fontWeight: '400', fontSize: 14, lineHeight: 20, marginTop: 4 },
  mascotColumn: { alignItems: 'flex-end' }, bubbleAnchor: { position: 'absolute', right: 0, bottom: 112, width: 220, alignItems: 'flex-end' }, bubble: { backgroundColor: '#342623', borderColor: 'rgba(255,196,157,0.28)', borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, maxWidth: 210 }, bubbleText: { color: C.peach, fontWeight: '500', fontSize: 12, lineHeight: 16 }, bubbleTail: { position: 'absolute', bottom: -5, right: 38, width: 9, height: 9, backgroundColor: '#342623', borderRightWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,196,157,0.28)', transform: [{ rotate: '45deg' }] },
  peachButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, paddingHorizontal: 16, borderRadius: 999 }, peachButtonCompact: { height: 36, paddingHorizontal: 14 }, peachText: { color: C.onAccent, fontWeight: '500', fontSize: 14 },
  overview: { marginTop: 34 }, overviewHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 34 }, overviewTitle: { color: C.text, fontWeight: '600', fontSize: 20, letterSpacing: -0.3 },
  metric: { color: C.text, fontWeight: '600', fontSize: 42, lineHeight: 48, letterSpacing: -1, marginTop: 18, fontVariant: ['tabular-nums'] }, metricLabel: { color: C.secondary, fontWeight: '400', fontSize: 13, marginTop: 2 },
  practiceColumns: { flexDirection: 'row', gap: 16, marginTop: 20 }, practiceItem: { flex: 1, gap: 6 }, practiceLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, practiceLabel: { color: C.secondary, fontWeight: '400', fontSize: 13 }, practiceValue: { color: C.text, fontWeight: '500', fontSize: 16 },
  attentionCount: { color: C.accent, fontWeight: '600', fontSize: 16 }, attentionList: { marginTop: 18, gap: 16 }, attentionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }, attentionAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#1A1F27', alignItems: 'center', justifyContent: 'center' }, attentionAvatarUrgent: { backgroundColor: 'rgba(255,153,107,0.14)' }, attentionInitials: { color: C.text, fontWeight: '500', fontSize: 13 }, attentionName: { color: C.text, fontWeight: '500', fontSize: 16 }, attentionDetail: { color: C.secondary, fontWeight: '400', fontSize: 13, lineHeight: 18, marginTop: 2 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'center', padding: 24 }, modal: { width: '100%', maxHeight: '90%', maxWidth: 480, alignSelf: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 22, padding: 24 }, close: { width: 44, alignItems: 'center', justifyContent: 'center' }, modalTitle: { color: C.text, fontWeight: '700', fontSize: 34, marginTop: 12, letterSpacing: -0.8 , lineHeight: 38}, reviewMetrics: { flexDirection: 'row', justifyContent: 'space-between', borderTopColor: C.line, borderTopWidth: 1, marginTop: 24, paddingTop: 20, marginBottom: 20 }, reviewValue: { color: C.text, fontWeight: '700', fontSize: 40, letterSpacing: -0.5 , lineHeight: 44, fontVariant: ['tabular-nums']},
});
