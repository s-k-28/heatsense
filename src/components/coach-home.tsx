import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedProps, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

import { CoachLargeTitle } from '@/components/dashboard-shell';
import { FieldCheckSheet } from '@/components/field-check-sheet';
import { FieldHero } from '@/components/field-hero';
import { CoachPalette, CoachRadius, CoachType } from '@/constants/coach-theme';
import { Face, Palette } from '@/constants/theme';
import { EASE_OUT, enter, swap } from '@/lib/motion';
import { ZONES, type Zone } from '@/lib/practice';
import { recheckStatus, SOURCE_LABEL } from '@/services/practice-sessions';
import { useAthletes } from '@/state/athletes';
import { usePastSessions } from '@/state/past-sessions';
import { buildSchedule, clockTime, usePracticePlans, type Block } from '@/state/practice-plans';
import { useTemperature } from '@/state/preferences';
import { useCoachData, useNow, type CoachData } from '@/state/team-session';

// The coach's Home: the field photo carrying the latest WBGT and the next action (FieldHero), the
// practice loop as three dials, first-run cards, and today's readings. Everything comes from the
// team's practice session; a build without Firebase shows the sample reading, tagged SAMPLE.

const BAND = require('@/assets/images/heatsense-band-refined.png');

/** Zone colors for drawing; Black's own color disappears on a dark screen. */
export function zoneColor(zone: Zone) {
  return ZONES[zone].color === '#000000' ? '#8E8E93' : ZONES[zone].color;
}

export function CoachHome({ onInvite, onOpenPlan }: { onInvite: () => void; onOpenPlan: () => void }) {
  const data = useCoachData('coach');
  const now = useNow();
  const reduced = useReducedMotion();
  const temp = useTemperature();
  const team = useAthletes('coach');
  const past = usePastSessions(data?.teamId ?? null, Boolean(data?.sample), 40);
  const { active: plan } = usePracticePlans();
  const [sheet, setSheet] = useState(false);
  const latest = data?.readings.at(-1) ?? null;
  const session = data?.session ?? null;
  const recheck = session ? recheckStatus(session, latest, now) : null;
  const acknowledged = data?.readings.filter((reading) => reading.acknowledgedAt).length ?? 0;
  const readingCount = data?.readings.length ?? 0;
  const live = team.athletes.filter((athlete) => athlete.live && !athlete.live.stale).length;
  const watch = team.athletes.filter((athlete) => athlete.live?.status === 'watch' && !athlete.live.stale).length;
  const todayPeak = (data?.readings ?? []).reduce<{ wbgtF: number; zone: Zone } | null>((peak, reading) => (!peak || reading.wbgtF > peak.wbgtF ? { wbgtF: reading.wbgtF, zone: reading.zone } : peak), null);
  const weekly = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now - (6 - index) * 86_400_000);
    const sameDay = (candidate: Date) => candidate.getFullYear() === date.getFullYear() && candidate.getMonth() === date.getMonth() && candidate.getDate() === date.getDate();
    const peaks = (past ?? []).filter((item) => sameDay(item.session.startedAt)).map((item) => item.peak).filter((peak): peak is NonNullable<typeof peak> => Boolean(peak));
    if (index === 6 && todayPeak) peaks.push(todayPeak);
    const peak = peaks.reduce<typeof todayPeak>((highest, item) => (!highest || item.wbgtF > highest.wbgtF ? item : highest), null);
    return { date, peak };
  });
  const alertCount = Number(Boolean(recheck?.overdue)) + Number(Boolean(latest && !latest.acknowledgedAt));
  return (
    <>
      <CoachLargeTitle title="Today" />
      <FieldHero data={data} onAction={() => setSheet(true)} />
      <Animated.View entering={enter(1, reduced)}><ConditionRings acknowledged={acknowledged} latest={latest} onPress={() => setSheet(true)} recheckFraction={recheck && session ? Math.max(0, Math.min(1, 1 - recheck.msLeft / (session.recheckMinutes * 60_000))) : 0} reduced={reduced} temperature={latest ? `${temp.value(latest.wbgtF)}${temp.unit}` : '—'} total={readingCount} /></Animated.View>
      <Animated.View entering={enter(2, reduced)}><PracticeTimeline blocks={buildSchedule(plan)} onOpenPlan={onOpenPlan} planName={plan.name} reduced={reduced} waterEvery={plan.waterEveryMinutes} /></Animated.View>
      <Animated.View entering={enter(3, reduced)}><TeamPulse live={live} onInvite={onInvite} reduced={reduced} total={team.athletes.length} watch={watch} /></Animated.View>
      <Animated.View entering={enter(4, reduced)}><WeeklyHeat days={weekly} reduced={reduced} toDisplay={temp.value} unit={temp.unit} /></Animated.View>
      <Animated.View entering={enter(5, reduced)}><AlertPreview count={alertCount} onPress={() => setSheet(true)} overdue={Boolean(recheck?.overdue)} /></Animated.View>
      <FieldCheckSheet onClose={() => setSheet(false)} visible={sheet} />
    </>
  );
}

const ZONE_ORDER: Zone[] = ['green', 'yellow', 'orange', 'red', 'black'];

function GradientRing({ id, progress, radius, reduced, start, end }: { id: string; progress: number; radius: number; reduced: boolean; start: string; end: string }) {
  const circumference = 2 * Math.PI * radius;
  const fill = useSharedValue(reduced ? progress : 0);
  useEffect(() => {
    fill.set(reduced ? progress : withTiming(progress, { duration: 780, easing: EASE_OUT }));
  }, [fill, progress, reduced]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - fill.value) }));
  return (
    <>
      <Circle cx={105} cy={105} fill="none" opacity={0.13} r={radius} stroke={start} strokeWidth={11} />
      <AnimatedCircle animatedProps={props} cx={105} cy={105} fill="none" originX={105} originY={105} r={radius} rotation={-90} stroke={`url(#${id})`} strokeDasharray={circumference} strokeLinecap="round" strokeWidth={11} />
      <Defs><SvgLinearGradient id={id} x1="0" x2="1" y1="0" y2="1"><Stop offset="0" stopColor={start} /><Stop offset="1" stopColor={end} /></SvgLinearGradient></Defs>
    </>
  );
}

function ConditionRings({ acknowledged, latest, onPress, recheckFraction, reduced, temperature, total }: { acknowledged: number; latest: { zone: Zone } | null; onPress: () => void; recheckFraction: number; reduced: boolean; temperature: string; total: number }) {
  const zoneIndex = latest ? ZONE_ORDER.indexOf(latest.zone) : -1;
  const heatTone = latest ? zoneColor(latest.zone) : CoachPalette.faint;
  const applied = total ? acknowledged / total : 0;
  return (
    <View style={styles.visualSection}>
      <View style={styles.visualHead}><Text accessibilityRole="header" style={styles.visualTitle}>Field conditions</Text><Text style={styles.visualMeta}>{latest ? ZONES[latest.zone].label : 'Awaiting reading'}</Text></View>
      <Pressable accessibilityLabel={latest ? `${temperature}, ${ZONES[latest.zone].label}. Open practice.` : 'No field reading. Open practice.'} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.ringDashboard, pressed && styles.pressedScale]}>
        <View style={styles.largeRing}>
          <Svg height={210} width={210}>
            <GradientRing end={heatTone} id="coachHeat" progress={zoneIndex < 0 ? 0 : (zoneIndex + 1) / ZONE_ORDER.length} radius={91} reduced={reduced} start="#FFD36A" />
            <GradientRing end={CoachPalette.peach} id="coachGuidance" progress={applied} radius={73} reduced={reduced} start="#30D158" />
            <GradientRing end="#67E8F9" id="coachRecheck" progress={recheckFraction} radius={55} reduced={reduced} start="#4AA8FF" />
          </Svg>
          <View pointerEvents="none" style={styles.largeRingCenter}><Animated.Text entering={swap(reduced)} key={temperature} style={styles.largeRingValue}>{temperature}</Animated.Text><Text style={[styles.largeRingZone, latest && { color: heatTone }]}>{latest ? ZONES[latest.zone].label.replace(' zone', '') : 'No data'}</Text></View>
        </View>
        <View style={styles.ringLegend}>
          <RingKey color={heatTone} label="Heat zone" value={latest ? `${zoneIndex + 1}/5` : '—'} />
          <RingKey color="#30D158" label="Guidance" value={total ? `${acknowledged}/${total}` : '—'} />
          <RingKey color="#4AA8FF" label="Recheck" value={recheckFraction ? `${Math.round(recheckFraction * 100)}%` : '—'} />
        </View>
      </Pressable>
    </View>
  );
}

function RingKey({ color, label, value }: { color: string; label: string; value: string }) {
  return <View><View style={[styles.ringKey, { backgroundColor: color }]} /><Text style={styles.ringKeyValue}>{value}</Text><Text style={styles.ringKeyLabel}>{label}</Text></View>;
}

function PracticeTimeline({ blocks, onOpenPlan, planName, reduced, waterEvery }: { blocks: Block[]; onOpenPlan: () => void; planName: string; reduced: boolean; waterEvery: number }) {
  const [selected, setSelected] = useState(0);
  const active = blocks[selected] ?? null;
  const waterStops = Math.max(0, Math.floor(blocks.filter((block) => block.kind !== 'arrive').reduce((sum, block) => sum + block.minutes, 0) / waterEvery));
  const blockTone = (kind: Block['kind']) => kind === 'work' ? CoachPalette.peach : kind === 'rest' ? '#30D158' : '#8B7CF6';
  return (
    <View style={styles.timelineSection}>
      <View style={styles.visualHead}><Pressable accessibilityRole="button" onPress={onOpenPlan} style={({ pressed }) => pressed && styles.pressed}><Text accessibilityRole="header" style={styles.visualTitle}>Practice rhythm</Text><Text numberOfLines={1} style={styles.visualMeta}>{planName}  ›</Text></Pressable><Text style={styles.timelineClock}>{active ? clockTime(active.start, true) : '—'}</Text></View>
      <View accessibilityLabel={blocks.map((block) => `${block.title}, ${block.minutes} minutes`).join(', ')} style={styles.blockTrack}>{blocks.map((block, index) => <Animated.View entering={reduced ? undefined : enter(index, false)} key={`${block.kind}-${block.start}`} style={{ flex: block.minutes }}><Pressable accessibilityRole="button" onPress={() => setSelected(index)} style={[styles.block, { backgroundColor: blockTone(block.kind) }, selected === index && styles.blockSelected]} /></Animated.View>)}</View>
      <View style={styles.timelineDetail}><Text style={styles.timelineDetailTitle}>{active?.title ?? 'No schedule'}</Text><Text style={styles.timelineDetailValue}>{active ? `${active.minutes} min` : '—'}</Text></View>
      <View style={styles.waterRail}><View style={styles.waterLine} />{Array.from({ length: waterStops }, (_, index) => <View key={index} style={[styles.waterTick, { left: `${((index + 1) / (waterStops + 1)) * 100}%` }]} />)}</View>
      <Text style={styles.waterLabel}>HYDRATION · EVERY {waterEvery} MIN</Text>
    </View>
  );
}

function TeamPulse({ live, onInvite, reduced, total, watch }: { live: number; onInvite: () => void; reduced: boolean; total: number; watch: number }) {
  const metrics = [{ color: CoachPalette.text, label: 'Roster', value: total }, { color: '#30D158', label: 'Live', value: live }, { color: watch ? '#FF9F0A' : CoachPalette.muted, label: 'Watch', value: watch }];
  return <View style={styles.teamSection}><View style={styles.visualHead}><Text accessibilityRole="header" style={styles.visualTitle}>Team pulse</Text>{total === 0 ? <Pressable accessibilityRole="button" onPress={onInvite} style={({ pressed }) => pressed && styles.pressed}><Text style={styles.inlineAction}>Share code</Text></Pressable> : null}</View><View style={styles.teamMetrics}>{metrics.map((metric) => <View key={metric.label} style={styles.teamMetric}><Animated.Text entering={swap(reduced)} key={`${metric.label}-${metric.value}`} style={[styles.teamNumber, { color: metric.color }]}>{metric.value}</Animated.Text><View style={[styles.teamRule, { backgroundColor: metric.color }]} /><Text style={styles.teamLabel}>{metric.label}</Text></View>)}</View></View>;
}

type HeatDay = { date: Date; peak: { wbgtF: number; zone: Zone } | null };
function WeeklyHeat({ days, reduced, toDisplay, unit }: { days: HeatDay[]; reduced: boolean; toDisplay: (fahrenheit: number) => number; unit: string }) {
  const [selected, setSelected] = useState(days.length - 1);
  const current = days[selected];
  const any = days.some((day) => day.peak);
  const tone = (day: HeatDay) => day.peak ? zoneColor(day.peak.zone) : CoachPalette.interactive;
  return (
    <View style={styles.historySection}>
      <View style={styles.visualHead}><Text accessibilityRole="header" style={styles.visualTitle}>Seven-day heat</Text><Animated.Text entering={swap(reduced)} key={current?.date.toISOString()} style={styles.historyReading}>{current?.peak ? `${toDisplay(current.peak.wbgtF)}${unit}` : 'No reading'}</Animated.Text></View>
      <View style={styles.chart}>{days.map((day, index) => { const height = day.peak ? Math.max(18, Math.min(112, 18 + ((day.peak.wbgtF - 70) / 25) * 94)) : 5; return <Pressable accessibilityLabel={`${day.date.toLocaleDateString([], { weekday: 'long' })}, ${day.peak ? `${toDisplay(day.peak.wbgtF)}${unit}` : 'no reading'}`} accessibilityRole="button" key={day.date.toISOString()} onPress={() => setSelected(index)} style={styles.chartColumn}><View style={styles.chartBarSpace}><Animated.View entering={reduced ? undefined : enter(index, false)} style={[styles.chartBar, { height }, selected === index && styles.chartBarSelected]}>{day.peak ? <LinearGradient colors={[tone(day), `${tone(day)}55`]} style={StyleSheet.absoluteFill} /> : null}</Animated.View></View><Text style={[styles.chartDay, selected === index && styles.chartDayOn]}>{day.date.toLocaleDateString([], { weekday: 'narrow' })}</Text></Pressable>; })}</View>
      {!any ? <Text style={styles.emptyVisual}>Completed practices will draw this chart.</Text> : null}
    </View>
  );
}

function AlertPreview({ count, onPress, overdue }: { count: number; onPress: () => void; overdue: boolean }) {
  const tone = count ? (overdue ? Palette.emergency : Palette.warning) : Palette.safe;
  return <Pressable accessibilityRole="button" disabled={!count} onPress={onPress} style={({ pressed }) => [styles.alertStrip, pressed && styles.pressedScale]}><View style={[styles.alertGlyph, { borderColor: tone }]}><Text style={[styles.alertGlyphText, { color: tone }]}>{count || '✓'}</Text></View><View style={styles.alertText}><Text style={styles.alertTitle}>{count ? (overdue ? 'Reading overdue' : 'Guidance to confirm') : 'All clear'}</Text><Text style={styles.alertMeta}>{count ? `${count} open ${count === 1 ? 'item' : 'items'}` : 'No action needed'}</Text></View>{count ? <Text style={styles.alertArrow}>›</Text> : null}</Pressable>;
}

/** The practice loop as three dials, after WHOOP's Home: time to the next reading, readings so far,
 *  and the share of readings whose guidance was applied. */
export function PracticeRings({ data, style }: { data: CoachData | null; style?: StyleProp<ViewStyle> }) {
  const now = useNow();
  const reduced = useReducedMotion();
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
    <Animated.View entering={enter(2, reduced)} style={[styles.rings, style]}>
      <Dial
        color={recheckColor}
        label="Recheck"
        ring={{ max: 1, segments: [{ color: recheckColor, value: recheck ? (recheck.overdue ? 1 : Math.min(1, 1 - Math.max(0, recheck.msLeft) / (session!.recheckMinutes * 60_000))) : 0 }] }}
        status={recheck ? (recheck.overdue ? 'Overdue' : 'Next reading') : 'No session'}
        summary={recheck ? (recheck.overdue ? 'Reading overdue' : `Next reading in ${minutesLeft} minutes`) : 'No practice session'}
        unit={recheck && !recheck.overdue ? 'MIN' : undefined}
        value={recheck ? (recheck.overdue ? 'LATE' : String(minutesLeft)) : '--'}
      />
      <Dial
        color={readingsColor}
        label="Readings"
        ring={{ max: Math.max(total, 4), segments: (data?.readings ?? []).map((r) => ({ color: zoneColor(r.zone), value: 1 })) }}
        status={latest ? ZONES[latest.zone].label.replace(' zone', '') : 'None yet'}
        summary={`${total} readings today`}
        unit="TODAY"
        value={total ? String(total) : '--'}
      />
      <Dial
        color={appliedColor}
        label="Applied"
        ring={{ max: Math.max(total, 1), segments: [{ color: appliedColor, value: acked }], track: 'rgba(48,209,88,0.28)' }}
        status={total ? `${acked} of ${total}` : 'Guidance'}
        summary={`${acked} of ${total} readings acknowledged`}
        unit={total ? '%' : undefined}
        value={total ? String(applied) : '--'}
      />
    </Animated.View>
  );
}

const FILL_MS = 900;

/** A ring made of segments that fills to its value, with whatever you pass in its centre. */
function Ring({ children, max, segments, size, stroke, summary, track = 'rgba(255,255,255,0.08)' }: { children?: ReactNode; max: number; segments: { color: string; value: number }[]; size: number; stroke: number; summary: string; track?: string }) {
  const reduced = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gap = segments.filter((segment) => segment.value > 0).length > 1 ? 4 : 0;
  const starts = segments.map((_, i) => segments.slice(0, i).reduce((sum, segment) => sum + (segment.value / max) * c, 0));
  const fill = useSharedValue(reduced ? 1 : 0);
  const signature = segments.map((segment) => segment.value).join(',') + `/${max}`;
  useEffect(() => {
    if (reduced) { fill.set(1); return; }
    fill.set(0);
    fill.set(withTiming(1, { duration: FILL_MS, easing: EASE_OUT }));
  }, [fill, reduced, signature]);
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
    <AnimatedCircle animatedProps={props} cx={size / 2} cy={size / 2} fill="none" originX={size / 2} originY={size / 2} r={r} rotation={-90} stroke={color} strokeDashoffset={-start} strokeLinecap="round" strokeWidth={stroke} />
  );
}

function Dial({ color, label, ring, status, summary, unit, value }: { color: string; label: string; ring: { max: number; segments: { color: string; value: number }[]; track?: string }; status: string; summary: string; unit?: string; value: string }) {
  return (
    <View style={styles.dial}>
      <View style={[styles.glow, { shadowColor: color }]}>
        <Ring max={ring.max} segments={ring.segments} size={100} stroke={9} summary={summary} track={ring.track}>
          <Text style={styles.dialValue}>{value}</Text>
          {unit ? <Text style={styles.dialUnit}>{unit}</Text> : null}
        </Ring>
      </View>
      <Text style={styles.dialLabel}>{label.toUpperCase()}</Text>
      <Text numberOfLines={1} style={[styles.dialStatus, { color }]}>{status}</Text>
    </View>
  );
}

/** First-run cards: take a reading, invite athletes, pair bands. Each can be dismissed. */
export function GetStarted({ onInvite, onReading, showReading }: { onInvite?: () => void; onReading: () => void; showReading: boolean }) {
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
  return (
    <View style={[styles.glyph, { borderColor: color }]}>
      {people ? (
        <View style={styles.people}><View style={[styles.head, { backgroundColor: color }]} /><View style={[styles.head, { backgroundColor: color, opacity: 0.6 }]} /></View>
      ) : <View style={[styles.sun, { backgroundColor: color }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  pressedScale: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  visualSection: { marginTop: 28 },
  visualHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  visualTitle: { color: CoachPalette.text, ...CoachType.section },
  visualMeta: { color: CoachPalette.muted, fontSize: 14, fontWeight: '600', marginTop: 2 },
  ringDashboard: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 226 },
  largeRing: { height: 210, width: 210 },
  largeRingCenter: { alignItems: 'center', bottom: 0, justifyContent: 'center', left: 0, position: 'absolute', right: 0, top: 0 },
  largeRingValue: { color: CoachPalette.text, fontFamily: Face.figure, fontSize: 38, lineHeight: 41 },
  largeRingZone: { color: CoachPalette.muted, fontSize: 13, fontWeight: '700' },
  ringLegend: { flex: 1, gap: 18, marginLeft: 14 },
  ringKey: { borderRadius: 3, height: 5, marginBottom: 5, width: 28 },
  ringKeyValue: { color: CoachPalette.text, fontFamily: Face.figure, fontSize: 24, lineHeight: 26 },
  ringKeyLabel: { color: CoachPalette.muted, fontSize: 12, fontWeight: '600' },
  timelineSection: { backgroundColor: CoachPalette.surface, borderRadius: CoachRadius.card, marginTop: 28, padding: 22 },
  timelineClock: { color: CoachPalette.text, fontFamily: Face.figure, fontSize: 21 },
  blockTrack: { flexDirection: 'row', gap: 4, height: 38, marginTop: 6 },
  block: { borderRadius: 10, height: 32, opacity: 0.7 },
  blockSelected: { height: 38, opacity: 1, transform: [{ translateY: -3 }] },
  timelineDetail: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  timelineDetailTitle: { color: CoachPalette.textSecondary, fontSize: 16, fontWeight: '700' },
  timelineDetailValue: { color: CoachPalette.text, fontFamily: Face.figure, fontSize: 22 },
  waterRail: { height: 18, marginTop: 12, position: 'relative' },
  waterLine: { backgroundColor: 'rgba(74,168,255,0.24)', height: 2, left: 0, position: 'absolute', right: 0, top: 8 },
  waterTick: { backgroundColor: '#4AA8FF', borderColor: CoachPalette.surface, borderRadius: 5, borderWidth: 2, height: 10, marginLeft: -5, position: 'absolute', top: 4, width: 10 },
  waterLabel: { color: '#67B8FF', fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: 1 },
  teamSection: { marginTop: 32 },
  inlineAction: { color: CoachPalette.peach, fontSize: 15, fontWeight: '800' },
  teamMetrics: { flexDirection: 'row', gap: 12 },
  teamMetric: { flex: 1, paddingVertical: 8 },
  teamNumber: { fontFamily: Face.figure, fontSize: 50, lineHeight: 53 },
  teamRule: { borderRadius: 3, height: 5, marginBottom: 7, marginTop: 4, width: '72%' },
  teamLabel: { color: CoachPalette.muted, fontSize: 14, fontWeight: '700' },
  historySection: { backgroundColor: CoachPalette.surface, borderRadius: CoachRadius.card, marginTop: 28, paddingHorizontal: 20, paddingTop: 20 },
  historyReading: { color: CoachPalette.text, fontFamily: Face.figure, fontSize: 24 },
  chart: { flexDirection: 'row', gap: 7, height: 154 },
  chartColumn: { alignItems: 'center', flex: 1 },
  chartBarSpace: { flex: 1, justifyContent: 'flex-end', width: '100%' },
  chartBar: { backgroundColor: CoachPalette.interactive, borderRadius: 10, overflow: 'hidden', width: '100%' },
  chartBarSelected: { borderColor: CoachPalette.text, borderWidth: 2 },
  chartDay: { color: CoachPalette.muted, fontSize: 12, fontWeight: '700', marginTop: 8 },
  chartDayOn: { color: CoachPalette.text },
  emptyVisual: { color: CoachPalette.muted, fontSize: 14, fontWeight: '600', paddingBottom: 20, textAlign: 'center' },
  alertStrip: { alignItems: 'center', backgroundColor: CoachPalette.surface, borderRadius: CoachRadius.pill, flexDirection: 'row', marginBottom: 4, marginTop: 20, minHeight: 76, paddingHorizontal: 16 },
  alertGlyph: { alignItems: 'center', borderRadius: 23, borderWidth: 4, height: 46, justifyContent: 'center', width: 46 },
  alertGlyphText: { fontFamily: Face.figure, fontSize: 21 },
  alertText: { flex: 1, marginLeft: 14 },
  alertTitle: { color: CoachPalette.text, fontSize: 17, fontWeight: '800' },
  alertMeta: { color: CoachPalette.muted, fontSize: 13, fontWeight: '600', marginTop: 2 },
  alertArrow: { color: CoachPalette.muted, fontSize: 30 },
  practice: { backgroundColor: Palette.card, borderColor: Palette.cardEdge, borderCurve: 'continuous', borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, marginTop: 16, paddingBottom: 8, paddingHorizontal: 8, paddingTop: 20 },
  practiceRings: { marginTop: 0, paddingBottom: 16 },
  planLine: { alignItems: 'center', borderTopColor: Palette.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 6, justifyContent: 'space-between', marginHorizontal: 16, paddingBottom: 4, paddingTop: 16 },
  planText: { color: Palette.inkMuted, flexShrink: 1, fontSize: 13 },
  rings: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 28, paddingHorizontal: 4 },
  dial: { alignItems: 'center', width: '32%' },
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
