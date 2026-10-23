import { useAthleteStyles } from '@/components/athlete-appearance';
import { Image } from 'expo-image';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedProps, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { CoachLargeTitle } from '@/components/dashboard-shell';
import { FieldCheckSheet } from '@/components/field-check-sheet';
import { FieldHero } from '@/components/field-hero';
import { HeatIcon } from '@/components/heat-icon';
import { chevron } from '@/components/ui/list';
import { ActionButton } from '@/components/ui/action-button';
import { Palette } from '@/constants/theme';
import { EASE_OUT, enter } from '@/lib/motion';
import { ZONES, type Zone } from '@/lib/practice';
import { recheckStatus, SOURCE_LABEL } from '@/services/practice-sessions';
import { EQUIPMENT_LABEL, usePracticePlans } from '@/state/practice-plans';
import { useTemperature } from '@/state/preferences';
import { useCoachDataState, useNow, type CoachData } from '@/state/team-session';

// The coach's Home: the field photo carrying the latest WBGT and the next action (FieldHero), the
// practice loop as three dials, first-run cards, and today's readings. Everything comes from the
// team's practice session; a build without Firebase shows the sample reading, tagged SAMPLE.

const BAND = require('@/assets/images/heatsense-band-refined.png');

/** Zone colors for drawing; Black's own color disappears on a dark screen. */
export function zoneColor(zone: Zone) {
  return ZONES[zone].color === '#000000' ? '#8E8E93' : ZONES[zone].color;
}

export function CoachHome({ onInvite, onOpenPlan }: { onInvite: () => void; onOpenPlan: () => void }) {
  const styles = useAthleteStyles(baseStyles);
  const team = useCoachDataState('coach');
  const data = team.data;
  const [sheet, setSheet] = useState(false);
  if (team.status === 'error') return <>
    <CoachLargeTitle title="Today" />
    <View style={styles.cardCopy}>
      <Text accessibilityLiveRegion="polite" style={styles.cardTitle}>Practice data unavailable</Text>
      <Text style={styles.cardBody}>Couldn’t load your team’s practice.</Text>
      <ActionButton label="Try again" onPress={team.retry} variant="secondary" />
    </View>
  </>;
  return (
    <>
      <CoachLargeTitle title="Today" />
      <FieldHero data={data} onAction={() => setSheet(true)} />
      <PracticeCard data={data} onOpenPlan={onOpenPlan} />
      {data ? <GetStarted onInvite={onInvite} onReading={() => setSheet(true)} showReading={!data.readings.length} /> : null}
      <TodaysReadings data={data} />
      <FieldCheckSheet onClose={() => setSheet(false)} visible={sheet && Boolean(data)} />
    </>
  );
}

/** The practice loop dials, with the active plan's water and equipment rules on one line beneath. */
export function PracticeCard({ data, onOpenPlan, readOnly = false }: { data: CoachData | null; onOpenPlan: () => void; readOnly?: boolean }) {
  const styles = useAthleteStyles(baseStyles);
  const { active: plan, status, retry } = usePracticePlans();
  const planStatus = readOnly ? 'ready' : status;
  const label = readOnly ? 'View current zone guidance' : status === 'loading' ? 'Loading your plan…' : status === 'error' ? 'Plan unavailable · Try again' : `Water every ${plan.waterEveryMinutes} min · Equipment ${EQUIPMENT_LABEL[plan.equipment].toLowerCase()}`;
  return (
    <View style={styles.practice}>
      <PracticeRings data={data} style={styles.practiceRings} />
      <Pressable accessibilityLabel={planStatus === 'ready' ? `${label}. ${readOnly ? 'Opens practice guidance.' : 'Opens the plan.'}` : label} accessibilityRole="button" disabled={!data || planStatus === 'loading'} onPress={planStatus === 'error' ? retry : onOpenPlan} style={({ pressed }) => [styles.planLine, pressed && styles.pressed]}>
        <Text style={styles.planText}>{label}</Text>
        <HeatIcon name={chevron} size={10} tintColor={Palette.inkMuted} weight="bold" />
      </Pressable>
    </View>
  );
}

/** The practice loop as three dials, after WHOOP's Home: time to the next reading, readings so far,
 *  and the share of readings whose guidance was applied. */
export function PracticeRings({ data, style }: { data: CoachData | null; style?: StyleProp<ViewStyle> }) {
  const styles = useAthleteStyles(baseStyles);
  const now = useNow();
  const { width, fontScale } = useWindowDimensions();
  const stacked = fontScale > 1.3;
  const dialSize = stacked ? Math.min(width - 64, Math.max(160, Math.round(100 * fontScale))) : Math.min(100, Math.floor((width - 64) / 3));
  const latest = data?.readings.at(-1) ?? null;
  const session = data?.session ?? null;
  const recheck = session ? recheckStatus(session, latest, now) : null;
  const acked = data?.readings.filter((r) => r.acknowledgedAt).length ?? 0;
  const total = data?.readings.length ?? 0;
  const minutesLeft = recheck ? Math.max(0, Math.ceil(recheck.msLeft / 60_000)) : 0;
  const recheckColor = recheck?.overdue ? Palette.emergency : Palette.coral;
  const readingsColor = latest ? zoneColor(latest.zone) : Palette.inkFaint;
  const applied = total ? Math.round((acked / total) * 100) : 0;
  // Applied is always drawn green: a green track that fills as readings are acted on.
  const appliedColor = Palette.safe;

  return (
    <View style={[styles.rings, style, stacked && styles.ringsStacked]}>
      <Dial
        size={dialSize} stacked={stacked}
        color={recheckColor}
        label="Recheck"
        ring={{ max: 1, segments: [{ color: recheckColor, value: recheck ? (recheck.overdue ? 1 : Math.min(1, 1 - Math.max(0, recheck.msLeft) / (session!.recheckMinutes * 60_000))) : 0 }] }}
        status={!data ? 'Loading…' : session && !latest ? 'First reading due' : recheck ? (recheck.overdue ? 'Overdue' : 'Next reading') : 'No session'}
        summary={!data ? 'Practice loading' : session && !latest ? 'First reading due now' : recheck ? (recheck.overdue ? 'Reading overdue' : `Next reading in ${minutesLeft} minutes`) : 'No practice session'}
        unit={recheck && !recheck.overdue ? 'MIN' : undefined}
        value={recheck ? (recheck.overdue ? 'LATE' : String(minutesLeft)) : '--'}
      />
      <Dial
        size={dialSize} stacked={stacked}
        color={readingsColor}
        label="Readings"
        ring={{ max: Math.max(total, 4), segments: (data?.readings ?? []).map((r) => ({ color: zoneColor(r.zone), value: 1 })) }}
        status={!data ? 'Loading…' : latest ? ZONES[latest.zone].label.replace(' zone', '') : 'None yet'}
        summary={data ? `${total} readings this practice` : 'Readings loading'}
        unit="TODAY"
        value={total ? String(total) : '--'}
      />
      <Dial
        size={dialSize} stacked={stacked}
        color={appliedColor}
        label="Applied"
        ring={{ max: Math.max(total, 1), segments: [{ color: appliedColor, value: acked }], track: 'rgba(48,209,88,0.28)' }}
        status={!data ? 'Loading…' : total ? `${acked} of ${total}` : 'Guidance'}
        summary={data ? `${acked} of ${total} readings acknowledged` : 'Acknowledgements loading'}
        unit={total ? '%' : undefined}
        value={total ? String(applied) : '--'}
      />
    </View>
  );
}

const FILL_MS = 900;

/** A ring made of segments that fills to its value, with whatever you pass in its centre. */
function Ring({ children, max, segments, size, stroke, summary, track = 'rgba(255,255,255,0.08)' }: { children?: ReactNode; max: number; segments: { color: string; value: number }[]; size: number; stroke: number; summary: string; track?: string }) {
  const styles = useAthleteStyles(baseStyles);
  const reduced = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gap = segments.filter((segment) => segment.value > 0).length > 1 ? 4 : 0;
  const starts = segments.map((_, i) => segments.slice(0, i).reduce((sum, segment) => sum + (segment.value / max) * c, 0));
  const fill = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) { fill.set(1); return; }
    fill.set(0);
    fill.set(withTiming(1, { duration: FILL_MS, easing: EASE_OUT }));
  }, [fill, reduced]);
  return (
    <View accessible accessibilityLabel={summary} style={{ height: size, width: size }}>
      <Svg height={size} width={size}>
        <Circle cx={size / 2} cy={size / 2} fill="none" r={r} stroke={track} strokeWidth={stroke} />
        {segments.map((segment, index) => (segment.value <= 0 ? null : (
          <RingSegment circumference={c} color={segment.color} fill={fill} key={index} length={Math.max(0, (segment.value / max) * c - gap)} r={r} size={size} start={starts[index]} stroke={stroke} />
        )))}
      </Svg>
      <View style={styles.ringCenter}>{children}</View>
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function RingSegment({ circumference, color, fill, length, r, size, start, stroke }: { circumference: number; color: string; fill: SharedValue<number>; length: number; r: number; size: number; start: number; stroke: number }) {
  const props = useAnimatedProps(() => ({ strokeDasharray: [length * fill.value, circumference] }));
  return (
    <AnimatedCircle animatedProps={props} cx={size / 2} cy={size / 2} fill="none" r={r} transform={`rotate(-90 ${size / 2} ${size / 2})`} stroke={color} strokeDashoffset={-start} strokeLinecap="round" strokeWidth={stroke} />
  );
}

function Dial({ color, label, ring, status, summary, unit, value, size, stacked }: { color: string; label: string; ring: { max: number; segments: { color: string; value: number }[]; track?: string }; status: string; summary: string; unit?: string; value: string; size: number; stacked: boolean }) {
  const styles = useAthleteStyles(baseStyles);
  return (
    <View style={[styles.dial, stacked && styles.dialStacked]}>
      <View style={[styles.glow, { shadowColor: color }]}>
        <Ring max={ring.max} segments={ring.segments} size={size} stroke={9} summary={summary} track={ring.track}>
          <Text style={styles.dialValue}>{value}</Text>
          {unit ? <Text style={styles.dialUnit}>{unit}</Text> : null}
        </Ring>
      </View>
      <Text style={styles.dialLabel}>{label.toUpperCase()}</Text>
      <Text style={[styles.dialStatus, { color }]}>{status}</Text>
    </View>
  );
}

/** First-run cards: take a reading, invite athletes, pair bands. Each can be dismissed. */
export function GetStarted({ onInvite, onReading, showReading }: { onInvite?: () => void; onReading: () => void; showReading: boolean }) {
  const styles = useAthleteStyles(baseStyles);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const reduced = useReducedMotion();
  const dismiss = (id: string) => setDismissed([...dismissed, id]);
  return (
    <>
      <Text accessibilityRole="header" style={styles.section}>Get started</Text>
      <Animated.View entering={enter(4, reduced)} style={styles.cards}>
        {showReading && !dismissed.includes('reading') ? (
          <StartCard accent action="Check field conditions" body="Enter the WBGT from your meter. HeatSense sets the zone from your UIL class and tells you what to change." onAction={onReading} onDismiss={() => dismiss('reading')} title="Take a field reading" art={<Glyph color={Palette.coral} />} />
        ) : null}
        {!dismissed.includes('invite') ? (
          <StartCard action="Share team code" body="Athletes join with your 6-digit code. You approve each one." onAction={() => onInvite?.()} onDismiss={() => dismiss('invite')} title="Invite your athletes" art={<Glyph color={Palette.info} people />} />
        ) : null}
        {!dismissed.includes('band') ? (
          <StartCard action="How pairing works" body="Athletes pair a HeatSense Band during setup. Bands are optional; field readings drive every decision." onAction={() => dismiss('band')} onDismiss={() => dismiss('band')} title="Pair athlete bands" art={<Image contentFit="contain" source={BAND} style={styles.bandArt} />} />
        ) : null}
      </Animated.View>
    </>
  );
}

/** Every reading taken today, newest first, with whether its guidance was applied. */
export function TodaysReadings({ data }: { data: CoachData | null }) {
  const styles = useAthleteStyles(baseStyles);
  const temp = useTemperature();
  const readings = data?.readings ?? [];
  if (!readings.length) return null;
  return (
    <>
      <Text accessibilityRole="header" style={styles.section}>Today’s readings</Text>
      <View style={styles.list}>
        {[...readings].reverse().map((r) => (
          <View key={r.id} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: zoneColor(r.zone) }]} />
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>{temp.value(r.wbgtF)}{temp.unit} · {ZONES[r.zone].label}</Text>
              <Text style={styles.rowMeta}>{r.measuredAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {SOURCE_LABEL[r.source]}</Text>
            </View>
            <Text style={[styles.rowState, { color: r.acknowledgedAt ? Palette.safe : Palette.inkMuted }]}>{r.acknowledgedAt ? 'Applied' : 'Pending'}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function StartCard({ accent, action, art, body, onAction, onDismiss, title }: { accent?: boolean; action: string; art: ReactNode; body: string; onAction: () => void; onDismiss: () => void; title: string }) {
  const styles = useAthleteStyles(baseStyles);
  return (
    <View style={[styles.card, accent && styles.cardAccent]}>
      <View style={styles.cardCopy}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardBody}>{body}</Text>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={onAction} style={({ pressed }) => pressed && styles.pressed}>
          <Text style={styles.cardAction}>{action.toUpperCase()}  →</Text>
        </Pressable>
      </View>
      <View style={styles.cardArt}>{art}</View>
      <Pressable accessibilityLabel={`Dismiss ${title}`} accessibilityRole="button" hitSlop={10} onPress={onDismiss} style={styles.close}>
        <Text style={styles.closeText}>×</Text>
      </Pressable>
    </View>
  );
}

/** Small object for a card: a sun disc, or two figures for the team. */
function Glyph({ color, people }: { color: string; people?: boolean }) {
  const styles = useAthleteStyles(baseStyles);
  return (
    <View style={[styles.glyph, { borderColor: color }]}>
      {people ? (
        <View style={styles.people}><View style={[styles.head, { backgroundColor: color }]} /><View style={[styles.head, { backgroundColor: color, opacity: 0.6 }]} /></View>
      ) : <View style={[styles.sun, { backgroundColor: color }]} />}
    </View>
  );
}

const baseStyles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  practice: { backgroundColor: Palette.card, borderColor: Palette.cardEdge, borderCurve: 'continuous', borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, marginTop: 16, paddingBottom: 8, paddingHorizontal: 8, paddingTop: 20 },
  practiceRings: { marginTop: 0, paddingBottom: 16 },
  planLine: { alignItems: 'center', borderTopColor: Palette.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 6, justifyContent: 'space-between', marginHorizontal: 16, paddingBottom: 4, paddingTop: 16 },
  planText: { color: Palette.inkMuted, flexShrink: 1, fontSize: 13 },
  rings: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 28, paddingHorizontal: 4 },
  ringsStacked: { alignItems: 'center', flexDirection: 'column', gap: 24 },
  dial: { alignItems: 'center', width: '32%' },
  dialStacked: { width: '100%' },
  ringCenter: { alignItems: 'center', bottom: 0, justifyContent: 'center', left: 0, position: 'absolute', right: 0, top: 0 },
  glow: { shadowOffset: { height: 0, width: 0 }, shadowOpacity: 0.45, shadowRadius: 12 },
  dialValue: { color: Palette.ink, fontSize: 28, fontVariant: ['tabular-nums'], fontWeight: '700', letterSpacing: -0.5 },
  dialUnit: { color: Palette.inkMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginTop: -2 },
  dialLabel: { color: Palette.ink, fontSize: 12, fontWeight: '700', letterSpacing: 1.6, marginTop: 12 },
  dialStatus: { fontSize: 13, fontWeight: '600', marginTop: 3 },
  section: { color: Palette.ink, fontSize: 24, fontWeight: '700', letterSpacing: -0.4, marginBottom: 12, marginTop: 34 },
  cards: { gap: 12 },
  card: { backgroundColor: Palette.card, borderColor: Palette.cardEdge, borderRadius: 20, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 18 },
  cardAccent: { borderColor: Palette.coral },
  cardCopy: { flex: 1, gap: 6 },
  cardTitle: { color: Palette.ink, fontSize: 18, fontWeight: '700' },
  cardBody: { color: Palette.inkMuted, fontSize: 15, lineHeight: 21 },
  cardAction: { color: Palette.coral, fontSize: 13, fontWeight: '800', letterSpacing: 1.3, marginTop: 6 },
  cardArt: { alignItems: 'center', justifyContent: 'center', width: 84 },
  bandArt: { height: 84, width: 84 },
  close: { position: 'absolute', right: 14, top: 10 },
  closeText: { color: Palette.inkMuted, fontSize: 22 },
  glyph: { alignItems: 'center', borderRadius: 30, borderWidth: 2, height: 60, justifyContent: 'center', width: 60 },
  sun: { borderRadius: 13, height: 26, width: 26 },
  people: { flexDirection: 'row', gap: 4 },
  head: { borderRadius: 9, height: 18, width: 18 },
  list: { backgroundColor: Palette.card, borderRadius: 20, paddingHorizontal: 16 },
  row: { alignItems: 'center', borderBottomColor: 'rgba(255,255,255,0.06)', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 12, minHeight: 64 },
  dot: { borderRadius: 6, height: 12, width: 12 },
  rowCopy: { flex: 1, gap: 2 },
  rowTitle: { color: Palette.ink, fontSize: 16, fontWeight: '600' },
  rowMeta: { color: Palette.inkMuted, fontSize: 13 },
  rowState: { fontSize: 13, fontWeight: '700' },
});
