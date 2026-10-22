import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { ConditionsSheet } from '@/components/conditions-sheet';
import { Glyph, PrimaryButton, SecondaryButton, Sheet, Tap, TextAction } from '@/components/ds';
import { Color, Motion, Radius, Space, TOUCH, Type } from '@/constants/design-system';
import { useCoachTeam } from '@/hooks/use-coach-team';
import { CONFIGURED_POLICY, SAMPLE_POLICY, ZONE_ORDER, buildTimeline, zoneEntry, zoneName, type Block, type HeatPolicy, type TimelineResult, type ZoneGuidance } from '@/lib/heat-policy';
import { SAMPLE_READING, ZONES, type FieldReading, type Zone } from '@/lib/practice';
import { useAuthSession } from '@/state/auth-session';
import { formatClock, usePracticeDay, type PracticeDay } from '@/state/practice-day';
import { useTemperature } from '@/state/preferences';

// Coach Plan: field conditions → heat zone → practice adjustments → timeline → safety.
// Every adjustment comes from a configured heat policy and a verified reading. Neither exists in
// this build, so by default the page says exactly what's missing. `?sample=1` runs the same page on
// the sample reading and SAMPLE_POLICY, with "sample" written wherever those values appear.
// Layout and anti-pattern rules: docs/design/design-system.md.

const PLAN_PHOTO = require('@/assets/images/home/plan-hero.webp');

/* ─────────────────────────────── Hero ─────────────────────────────── */

function ConditionsHero({ guidance, onCheck, reading }: { guidance: ZoneGuidance | null; onCheck: () => void; reading: FieldReading | null }) {
  const reducedMotion = useReducedMotion();
  const temp = useTemperature();
  const zone = reading ? ZONES[reading.zone] : null;
  return (
    <View style={styles.hero}>
      <Image accessibilityIgnoresInvertColors contentFit="cover" contentPosition={{ top: '20%', left: '50%' }} source={PLAN_PHOTO} style={StyleSheet.absoluteFill} transition={reducedMotion ? 0 : Motion.reveal} />
      <LinearGradient colors={['rgba(16,20,22,0.55)', 'rgba(16,20,22,0.72)', 'rgba(16,20,22,0.95)']} locations={[0, 0.45, 0.9]} pointerEvents="none" style={StyleSheet.absoluteFill} />
      <Animated.View entering={reducedMotion ? undefined : FadeIn.delay(60).duration(Motion.state + 40)} style={styles.heroCopy}>
        <Text style={styles.eyebrow}>FIELD CONDITIONS</Text>
        {reading && zone ? (
          <>
            <View accessibilityLabel={`WBGT ${temp.value(reading.wbgtF)} ${temp.unit === '°F' ? 'degrees Fahrenheit' : 'degrees Celsius'}, ${zone.label}.${reading.source === 'sample' ? ' Sample reading, not live.' : ''}`} accessible style={styles.readingRow}>
              <Text style={styles.reading}>{temp.value(reading.wbgtF)}</Text>
              <View style={styles.readingUnit}>
                <Text style={styles.readingDegree}>{temp.unit}</Text>
                <Text style={styles.readingKind}>WBGT</Text>
              </View>
            </View>
            <Text style={[styles.zoneLabel, { color: zone.text }]}>{zone.label}</Text>
            {guidance ? <Text style={styles.heroLine}>{guidance.summary}</Text> : null}
            <Text style={styles.heroMeta}>
              {[reading.location, reading.source === 'sample' ? 'sample reading, not live' : `updated ${reading.observedLabel}`].join(' · ')}
            </Text>
          </>
        ) : (
          <>
            <Text accessibilityRole="header" style={styles.heroTitle}>Check field conditions.</Text>
            <Text style={styles.heroLine}>A verified reading sets today’s heat zone.</Text>
            <View style={styles.heroAction}><PrimaryButton label="Check conditions" onPress={onCheck} /></View>
          </>
        )}
      </Animated.View>
    </View>
  );
}

/* ─────────────────────────────── Heat zone scale ─────────────────────────────── */

function ZoneScale({ current, onSelect, policy, reading }: { current: Zone | null; onSelect: (zone: Zone) => void; policy: HeatPolicy | null; reading: FieldReading | null }) {
  const reducedMotion = useReducedMotion();
  const temp = useTemperature();
  const [width, setWidth] = useState(0);
  const gap = 4;
  const segment = width > 0 ? (width - gap * (ZONE_ORDER.length - 1)) / ZONE_ORDER.length : 0;
  const index = current ? ZONE_ORDER.indexOf(current) : -1;
  const target = index >= 0 ? index * (segment + gap) + segment / 2 : 0;
  const x = useSharedValue(target);
  useEffect(() => {
    if (index < 0 || segment === 0) return;
    x.set(reducedMotion ? target : withTiming(target, { duration: 320, easing: Easing.out(Easing.cubic) }));
  }, [index, reducedMotion, segment, target, x]);
  const marker = useAnimatedStyle(() => ({ transform: [{ translateX: x.value - 32 }] }));

  return (
    <View>
      <View onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
        {current && reading && width > 0 ? (
          <Animated.View pointerEvents="none" style={[styles.marker, marker]}>
            <Text style={styles.markerValue}>{temp.value(reading.wbgtF)}{temp.unit}</Text>
            <Svg height={8} viewBox="0 0 14 8" width={14}><Path d="M0 0h14L7 8Z" fill={Color.ink} /></Svg>
          </Animated.View>
        ) : <View style={styles.markerSpacer} />}
        <View style={styles.scaleRow}>
          {ZONE_ORDER.map((zone) => {
            const active = zone === current;
            return (
              <Tap
                accessibilityHint="Shows what this zone means"
                accessibilityLabel={`${ZONES[zone].label}${active ? ', current zone' : ', reference'}`}
                accessibilityState={{ selected: active }}
                key={zone}
                onPress={() => onSelect(zone)}
                radius={Radius.control}
                style={styles.scaleCell}>
                <View style={[styles.segment, { backgroundColor: ZONES[zone].color }, zone === 'black' && styles.segmentBlack, !current && styles.segmentReference, current && !active && styles.segmentInactive, active && styles.segmentActive]} />
                <Text numberOfLines={1} style={[styles.scaleLabel, active && styles.scaleLabelActive]}>{zoneName(zone)}</Text>
              </Tap>
            );
          })}
        </View>
      </View>
      <Text style={[Type.support, styles.muted, styles.scaleCaption]}>
        {current
          ? `${policy?.sample ? 'Sample reading · ' : ''}tap a zone for its guidance`
          : 'Current zone unavailable · tap a zone for reference'}
      </Text>
    </View>
  );
}

function ZoneSheet({ current, onClose, policy, reading, zone }: { current: Zone | null; onClose: () => void; policy: HeatPolicy | null; reading: FieldReading | null; zone: Zone | null }) {
  const temp = useTemperature();
  const entry = zone ? zoneEntry(policy, zone) : null;
  const guidance = entry?.guidance ?? null;
  const isCurrent = Boolean(zone && zone === current && reading);
  return (
    <Sheet onClose={onClose} title={zone ? ZONES[zone].label : ''} visible={zone !== null}>
      <Text style={[Type.bodyStrong, isCurrent ? styles.ink : styles.muted, styles.gapS]}>
        {isCurrent && reading ? `Today’s zone · ${temp.value(reading.wbgtF)}${temp.unit} WBGT${reading.source === 'sample' ? ' (sample)' : ''}` : 'For reference. This is not today’s reading.'}
      </Text>
      <Fact label="WBGT range" value={!policy ? 'No heat policy configured' : entry?.range ?? `Not set in the ${policy.name.toLowerCase()}`} />
      {guidance ? (
        <>
          <Fact label="Guidance" value={guidance.summary} />
          {guidance.workMinutes && guidance.restMinutes ? <Fact label="Work / rest" value={`${guidance.workMinutes} min / ${guidance.restMinutes} min`} /> : null}
          {guidance.hydrationEveryMinutes ? <Fact label="Water" value={`Every ${guidance.hydrationEveryMinutes} min`} /> : null}
          {guidance.equipment ? <Fact label="Equipment" value={guidance.equipment} /> : null}
          {guidance.maxPracticeMinutes ? <Fact label="Longest practice" value={`${guidance.maxPracticeMinutes} min`} /> : null}
        </>
      ) : (
        <Fact label="Guidance" value={policy ? `The ${policy.name.toLowerCase()} has no guidance for this zone.` : 'Set by your school’s heat policy once it’s configured.'} />
      )}
      {policy ? <Text style={[Type.meta, styles.subtle, styles.gapL]}>Source: {policy.source}</Text> : null}
    </Sheet>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={[Type.meta, styles.subtle]}>{label}</Text>
      <Text style={[Type.body, styles.ink]}>{value}</Text>
    </View>
  );
}

/* ─────────────────────────────── Practice adjustments ─────────────────────────────── */

const MISSING_COPY = {
  reading: 'No verified field reading yet',
  policy: 'No heat policy configured for your school',
  intervals: 'Your policy has no work and rest times for this zone',
  schedule: 'No practice time set',
} as const;

function Adjustments({ guidance, hasReading, policy }: { guidance: ZoneGuidance | null; hasReading: boolean; policy: HeatPolicy | null }) {
  const reducedMotion = useReducedMotion();
  const grow = useSharedValue(reducedMotion ? 1 : 0);
  const hasIntervals = Boolean(guidance?.workMinutes && guidance.restMinutes);
  useEffect(() => {
    if (hasIntervals && !reducedMotion) grow.set(withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, [grow, hasIntervals, reducedMotion]);
  const barStyle = useAnimatedStyle(() => ({ width: `${grow.value * 100}%` }));

  if (!guidance || !hasReading || !policy) {
    const missing = [!hasReading && 'reading', !policy && 'policy'].filter(Boolean) as ('reading' | 'policy')[];
    return (
      <View>
        <Text style={[Type.bodyStrong, styles.ink]}>Adjustments need:</Text>
        <MissingList items={missing.length > 0 ? missing : ['intervals']} />
      </View>
    );
  }

  const work = guidance.workMinutes ?? 0;
  const rest = guidance.restMinutes ?? 0;
  return (
    <View>
      {hasIntervals ? (
        <View accessibilityLabel={`Work ${work} minutes, then rest ${rest} minutes.`} accessible style={styles.workRest}>
          <View style={styles.workRestNumbers}>
            <View>
              <Text style={[styles.bigNumber, styles.accentText]}>{work}<Text style={styles.bigUnit}> min</Text></Text>
              <Text style={[Type.support, styles.muted]}>Work</Text>
            </View>
            <View>
              <Text style={[styles.bigNumber, styles.supportText]}>{rest}<Text style={styles.bigUnit}> min</Text></Text>
              <Text style={[Type.support, styles.muted]}>Rest</Text>
            </View>
          </View>
          <Animated.View style={[styles.ratioBar, barStyle]}>
            <View style={[styles.ratioWork, { flex: work }]} />
            <View style={[styles.ratioRest, { flex: rest }]} />
          </Animated.View>
        </View>
      ) : (
        <MissingList items={['intervals']} />
      )}

      <View style={styles.supportRow}>
        {guidance.hydrationEveryMinutes ? (
          <View style={styles.supportItem}>
            <Glyph color={Color.support} name="drop" size={22} />
            <Text style={[Type.bodyStrong, styles.ink, styles.gapS]}>Every {guidance.hydrationEveryMinutes} min</Text>
            <Text style={[Type.meta, styles.muted]}>Water break</Text>
          </View>
        ) : null}
        {guidance.equipment ? (
          <View style={styles.supportItem}>
            <Glyph color={Color.support} name="helmet" size={22} />
            <Text style={[Type.bodyStrong, styles.ink, styles.gapS]}>{guidance.equipment}</Text>
            <Text style={[Type.meta, styles.muted]}>Equipment</Text>
          </View>
        ) : null}
        {guidance.maxPracticeMinutes ? (
          <View style={styles.supportItem}>
            <Glyph color={Color.support} name="clock" size={22} />
            <Text style={[Type.bodyStrong, styles.ink, styles.gapS]}>{guidance.maxPracticeMinutes} min</Text>
            <Text style={[Type.meta, styles.muted]}>Longest practice</Text>
          </View>
        ) : null}
      </View>
      <Text style={[Type.meta, styles.subtle, styles.gapL]}>From the {policy.name.toLowerCase()}{policy.sample ? '. Sample values, not for real practices.' : '.'}</Text>
    </View>
  );
}

function MissingList({ items }: { items: (keyof typeof MISSING_COPY)[] }) {
  return (
    <View style={styles.missing}>
      {items.map((item) => (
        <View key={item} style={styles.missingRow}>
          <Glyph color={Color.inkSubtle} name="minus" size={16} />
          <Text style={[Type.support, styles.ink]}>{MISSING_COPY[item]}</Text>
        </View>
      ))}
    </View>
  );
}

/* ─────────────────────────────── Schedule ─────────────────────────────── */

function Stepper({ label, onChange, step, value, format, min, max }: { label: string; onChange: (value: number) => void; step: number; value: number; format: (value: number) => string; min: number; max: number }) {
  return (
    <View style={styles.stepper}>
      <Text style={[Type.meta, styles.muted]}>{label}</Text>
      <View accessibilityLabel={`${label}, ${format(value)}`} style={styles.stepperRow}>
        <Tap accessibilityLabel={`Earlier ${label.toLowerCase()}`} disabled={value <= min} onPress={() => onChange(Math.max(min, value - step))} radius={Radius.pill} style={styles.stepButton}>
          <Glyph name="minus" size={18} />
        </Tap>
        <Text style={[Type.bodyStrong, styles.ink, styles.stepValue]}>{format(value)}</Text>
        <Tap accessibilityLabel={`Later ${label.toLowerCase()}`} disabled={value >= max} onPress={() => onChange(Math.min(max, value + step))} radius={Radius.pill} style={styles.stepButton}>
          <Glyph name="plus" size={18} />
        </Tap>
      </View>
    </View>
  );
}

function ScheduleControl({ day, onSave }: { day: PracticeDay; onSave: (start: number, duration: number) => void }) {
  const hasSchedule = day.startMinutes !== null && day.durationMinutes !== null;
  const [editing, setEditing] = useState(false);
  // Starting values for the editor only. Nothing is saved until the coach taps Save.
  const [start, setStart] = useState(day.startMinutes ?? 15 * 60 + 30);
  const [duration, setDuration] = useState(day.durationMinutes ?? 90);

  if (editing) {
    return (
      <View style={styles.editor}>
        <View style={styles.editorRow}>
          <Stepper format={formatClock} label="Start time" max={23 * 60} min={5 * 60} onChange={setStart} step={15} value={start} />
          <Stepper format={(v) => `${v} min`} label="Length" max={240} min={15} onChange={setDuration} step={15} value={duration} />
        </View>
        <View style={styles.editorActions}>
          <SecondaryButton label="Save time" onPress={() => { onSave(start, duration); setEditing(false); }} />
          <TextAction arrow={false} label="Cancel" onPress={() => setEditing(false)} />
        </View>
      </View>
    );
  }
  if (!hasSchedule) {
    return (
      <View>
        <SecondaryButton label="Set practice time" onPress={() => setEditing(true)} />
      </View>
    );
  }
  return (
    <View style={styles.scheduleSummary}>
      <Glyph color={Color.inkMuted} name="clock" size={18} />
      <Text style={[Type.bodyStrong, styles.ink, styles.flex]}>
        {formatClock(day.startMinutes!)} – {formatClock(day.startMinutes! + day.durationMinutes!)}
        <Text style={[Type.support, styles.muted]}>  ·  {day.durationMinutes} min</Text>
      </Text>
      <TextAction label="Edit" onPress={() => { setStart(day.startMinutes!); setDuration(day.durationMinutes!); setEditing(true); }} />
    </View>
  );
}

/* ─────────────────────────────── Timeline ─────────────────────────────── */

const BLOCK_HEIGHT = 84;

function Timeline({ guidance, result, start }: { guidance: ZoneGuidance; result: Extract<TimelineResult, { status: 'ready' }>; start: number }) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const total = result.blocks[result.blocks.length - 1]!.endMinute;
  const perMinute = width > 0 ? Math.max(3.6, width / total) : 0;
  const block = selected !== null ? result.blocks[selected] : null;
  const marksIn = (b: Block) => result.hydrationMarks.filter((m) => m > b.startMinute && m < b.endMinute);
  // Where practice is right now, refreshed each minute. Only shown while today's practice is running.
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 60000);
    return () => clearInterval(id);
  }, []);
  const nowMinute = clock.getHours() * 60 + clock.getMinutes() - start;

  return (
    <View>
      <View onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
        {perMinute > 0 ? (
          <ScrollView contentContainerStyle={{ width: total * perMinute }} horizontal showsHorizontalScrollIndicator={false} style={styles.timelineScroll}>
            <View style={{ height: BLOCK_HEIGHT + 46, width: total * perMinute }}>
              {result.hydrationMarks.map((minute) => (
                <View accessible={false} key={`drop-${minute}`} pointerEvents="none" style={[styles.dropMark, { left: minute * perMinute - 8 }]}>
                  <Glyph color={Color.support} name="drop" size={16} />
                </View>
              ))}
              {result.blocks.map((b, i) => {
                const left = b.startMinute * perMinute;
                const blockWidth = (b.endMinute - b.startMinute) * perMinute - 3;
                const label = b.kind === 'work' ? 'Work' : 'Rest';
                return (
                  <Tap
                    accessibilityLabel={`${label}, ${formatClock(start + b.startMinute)} to ${formatClock(start + b.endMinute)}`}
                    accessibilityState={{ selected: selected === i }}
                    key={`${b.kind}-${b.startMinute}`}
                    onPress={() => setSelected(selected === i ? null : i)}
                    radius={14}
                    style={[styles.block, { left, width: blockWidth }, b.kind === 'work' ? styles.blockWork : styles.blockRest, selected === i && styles.blockSelected]}>
                    {blockWidth >= 40 ? (
                      <>
                        <Text numberOfLines={1} style={styles.blockLabel}>{label}</Text>
                        <Text numberOfLines={1} style={styles.blockMinutes}>{b.endMinute - b.startMinute}m</Text>
                      </>
                    ) : null}
                  </Tap>
                );
              })}
              {result.blocks.filter((b) => b.kind === 'work').map((b) => (
                <Text key={`t-${b.startMinute}`} style={[styles.axisLabel, { left: b.startMinute * perMinute }]}>{formatClock(start + b.startMinute).replace(' PM', '').replace(' AM', '')}</Text>
              ))}
              <Text style={[styles.axisLabel, styles.axisEnd, { left: total * perMinute - 52 }]}>{formatClock(start + total)}</Text>
              {nowMinute !== null && nowMinute >= 0 && nowMinute <= total ? (
                <View accessibilityLabel={`Now, ${formatClock(start + nowMinute)}`} accessible style={[styles.nowLine, { left: nowMinute * perMinute - 1 }]}>
                  <Text style={styles.nowLabel}>Now</Text>
                </View>
              ) : null}
            </View>
          </ScrollView>
        ) : <View style={{ height: BLOCK_HEIGHT + 46 }} />}
      </View>

      {block ? (
        <Animated.View entering={FadeIn.duration(Motion.state)} style={styles.blockDetail}>
          <Text style={[Type.bodyStrong, styles.ink]}>
            {block.kind === 'work' ? 'Work' : 'Rest and water'} · {formatClock(start + block.startMinute)} – {formatClock(start + block.endMinute)}
          </Text>
          {block.kind === 'work' && marksIn(block).length > 0 ? (
            <Text style={[Type.support, styles.muted]}>Water break at {marksIn(block).map((m) => formatClock(start + m)).join(', ')}</Text>
          ) : null}
          {guidance.equipment ? <Text style={[Type.support, styles.muted]}>Equipment: {guidance.equipment.toLowerCase()}</Text> : null}
        </Animated.View>
      ) : (
        <Text style={[Type.meta, styles.muted, styles.gapS]}>Tap a block for its times.</Text>
      )}
    </View>
  );
}

/* ─────────────────────────────── Checklist ─────────────────────────────── */

function Checklist({ items, done, onToggle }: { items: { id: string; label: string }[]; done: string[]; onToggle: (id: string) => void }) {
  return (
    <View>
      {items.map((item) => {
        const checked = done.includes(item.id);
        return (
          <Tap accessibilityLabel={item.label} accessibilityRole="checkbox" accessibilityState={{ checked }} key={item.id} onPress={() => onToggle(item.id)} radius={Radius.control} style={styles.checkRow}>
            <View style={[styles.checkBox, checked && styles.checkBoxOn]}>{checked ? <Glyph color={Color.onAccent} name="check" size={15} strokeWidth={2.6} /> : null}</View>
            <Text style={[Type.body, checked ? styles.checkedText : styles.ink]}>{item.label}</Text>
          </Tap>
        );
      })}
    </View>
  );
}

/* ─────────────────────────────── Screen ─────────────────────────────── */

function SectionHeading({ children, note }: { children: string; note?: string }) {
  return (
    <View style={styles.sectionHead}>
      <Text accessibilityRole="header" style={[Type.section, styles.ink]}>{children}</Text>
      {note ? <Text style={[Type.support, styles.muted, styles.gapXs]}>{note}</Text> : null}
    </View>
  );
}

export function CoachPlan({ sample = false }: { sample?: boolean }) {
  const { user } = useAuthSession();
  const { state: team } = useCoachTeam(user?.uid ?? null);
  const scope = team.status === 'loading' ? null : `${sample ? 'sample-' : ''}${team.status === 'ready' ? team.invite.teamId : `coach-${user?.uid ?? 'local'}`}`;
  const { day, update } = usePracticeDay(scope);
  const [conditionsOpen, setConditionsOpen] = useState(false);
  const [zoneOpen, setZoneOpen] = useState<Zone | null>(null);
  const [guidanceOpen, setGuidanceOpen] = useState(false);

  // No WBGT feed and no configured policy exist yet; the sample pair runs only with ?sample=1.
  const reading: FieldReading | null = sample ? SAMPLE_READING : null;
  const policy: HeatPolicy | null = sample ? SAMPLE_POLICY : CONFIGURED_POLICY;
  const current = reading?.zone ?? null;
  const guidance = current ? zoneEntry(policy, current)?.guidance ?? null : null;
  const result = buildTimeline({ hasReading: Boolean(reading), policy, guidance, durationMinutes: day.durationMinutes });

  // A plan is approved against everything it was built from. If any input changes, it needs review.
  const signature = result.status === 'ready'
    ? JSON.stringify({ policy: `${policy?.id}@${policy?.version}`, zone: current, guidance, start: day.startMinutes, duration: day.durationMinutes })
    : null;
  const approval = !signature ? null : !day.approved ? 'unapproved' : day.approved.signature === signature ? 'approved' : 'changed';

  const checklist = [
    { id: 'reading', label: 'Take a WBGT reading on site' },
    ...(guidance?.workMinutes ? [{ id: 'intervals', label: 'Review work and rest times' }] : []),
    { id: 'water', label: 'Set up water access' },
    ...(guidance?.equipment ? [{ id: 'equipment', label: 'Check equipment rules' }] : []),
  ];

  return (
    <View>
      <View style={styles.header}>
        {team.status === 'ready' ? <Text numberOfLines={1} style={styles.teamLabel}>{team.team.teamName.toUpperCase()}</Text> : null}
        <Text accessibilityRole="header" style={styles.pageTitle}>Practice plan</Text>
      </View>

      <ConditionsHero guidance={guidance} onCheck={() => setConditionsOpen(true)} reading={reading} />

      <View style={styles.section}>
        <SectionHeading>Heat zone</SectionHeading>
        <ZoneScale current={current} onSelect={setZoneOpen} policy={policy} reading={reading} />
      </View>

      <View style={styles.section}>
        <SectionHeading>Practice adjustments</SectionHeading>
        <Adjustments guidance={guidance} hasReading={Boolean(reading)} policy={policy} />
      </View>

      <View style={styles.section}>
        <SectionHeading>Practice timeline</SectionHeading>
        <ScheduleControl day={day} onSave={(start, duration) => update((d) => ({ ...d, startMinutes: start, durationMinutes: duration }))} />
        {result.status === 'ready' && guidance && day.startMinutes !== null ? (
          <View style={styles.gapL}>
            {approval === 'changed' ? (
              <Text style={[Type.bodyStrong, styles.ink, styles.reviewNote]}>Changed since you approved it. Review the update.</Text>
            ) : null}
            <Timeline guidance={guidance} result={result} start={day.startMinutes} />
            <View style={styles.gapL}>
              {approval === 'approved' && day.approved ? (
                <View style={styles.approved}>
                  <Glyph color={Color.support} name="check" size={18} strokeWidth={2.4} />
                  <Text style={[Type.support, styles.ink]}>Approved at {new Date(day.approved.approvedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</Text>
                </View>
              ) : (
                <PrimaryButton label={approval === 'changed' ? 'Approve updated plan' : 'Approve plan'} onPress={() => update((d) => ({ ...d, approved: { signature: signature!, approvedAt: Date.now() } }))} />
              )}
            </View>
          </View>
        ) : result.status === 'missing' && result.missing.some((m) => m !== 'schedule') ? (
          <View style={styles.gapL}>
            <Text style={[Type.support, styles.muted]}>The timeline appears once adjustments can be set.</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <SectionHeading>Before you start</SectionHeading>
        <Checklist
          done={day.checklist}
          items={checklist}
          onToggle={(id) => update((d) => ({ ...d, checklist: d.checklist.includes(id) ? d.checklist.filter((x) => x !== id) : [...d.checklist, id] }))}
        />
      </View>

      <View style={styles.section}>
        <SectionHeading>Heat safety</SectionHeading>
        <Text style={[Type.bodyStrong, styles.ink]}>Collapse or suspected heat stroke: call 911 and start your school’s emergency action plan.</Text>
        <Text style={[Type.meta, styles.muted, styles.gapS]}>{policy ? `Following the ${policy.name.toLowerCase()}${policy.sample ? ' (sample)' : ''}` : 'No heat policy configured'}</Text>
        <TextAction label="View full guidance" onPress={() => setGuidanceOpen(true)} />
      </View>

      <ConditionsSheet onClose={() => setConditionsOpen(false)} visible={conditionsOpen} />
      <ZoneSheet current={current} onClose={() => setZoneOpen(null)} policy={policy} reading={reading} zone={zoneOpen} />
      <Sheet onClose={() => setGuidanceOpen(false)} title="Heat safety" visible={guidanceOpen}>
        <Text style={[Type.bodyStrong, styles.ink, styles.gapS]}>Collapse or suspected heat stroke: call 911 and start your school’s emergency action plan.</Text>
        <Fact label="Heat policy" value={policy ? policy.name : 'Not configured. Your school’s heat plan (for Texas schools, the UIL plan) sets every zone and adjustment.'} />
        {policy ? <Fact label="Source" value={policy.source} /> : null}
        {policy ? <Fact label="Version" value={[policy.version, policy.effectiveDate && `effective ${policy.effectiveDate}`].filter(Boolean).join(', ') || 'Not stated'} /> : null}
        <Fact label="Measurement" value={reading ? `WBGT${reading.source === 'sample' ? ', sample reading' : ''} at ${reading.location}` : 'No WBGT source connected'} />
        <Text style={[Type.meta, styles.subtle, styles.gapL]}>HeatSense supports coach decisions. It doesn’t replace your athletic trainer, your school’s policy, or emergency services.</Text>
      </Sheet>
    </View>
  );
}

/* ─────────────────────────────── Styles ─────────────────────────────── */

const styles = StyleSheet.create({
  ink: { color: Color.ink },
  muted: { color: Color.inkMuted },
  subtle: { color: Color.inkSubtle },
  accentText: { color: Color.accent },
  supportText: { color: Color.support },
  flex: { flex: 1 },
  gapXs: { marginTop: Space.xs },
  gapS: { marginTop: Space.s },
  gapM: { marginTop: Space.m },
  gapL: { marginTop: Space.l },

  header: { gap: 4, marginBottom: Space.l, marginTop: Space.xs },
  teamLabel: { ...Type.meta, color: Color.inkMuted, letterSpacing: 1.2 },
  pageTitle: { color: Color.ink, fontWeight: Type.section.fontWeight, fontSize: 36, letterSpacing: 0.2, lineHeight: 38 },

  hero: { backgroundColor: Color.surface, borderCurve: 'continuous', borderRadius: Radius.hero, justifyContent: 'flex-end', minHeight: 236, overflow: 'hidden' },
  heroCopy: { padding: Space.xl },
  eyebrow: { ...Type.meta, color: Color.ink, fontWeight: Type.bodyStrong.fontWeight, letterSpacing: 1.4 },
  readingRow: { alignItems: 'flex-start', flexDirection: 'row', marginTop: Space.s },
  reading: { color: Color.ink, fontWeight: Type.data.fontWeight, fontSize: 76, includeFontPadding: false, lineHeight: 76 },
  readingUnit: { marginLeft: Space.s, marginTop: 12 },
  readingDegree: { color: Color.ink, fontWeight: Type.data.fontWeight, fontSize: 28, lineHeight: 30 },
  readingKind: { ...Type.meta, color: Color.support, fontWeight: Type.bodyStrong.fontWeight, letterSpacing: 1 },
  zoneLabel: { fontWeight: Type.section.fontWeight, fontSize: 26, lineHeight: 30 },
  heroTitle: { color: Color.ink, fontWeight: Type.hero.fontWeight, fontSize: 38, lineHeight: 38, marginTop: Space.s },
  heroLine: { ...Type.body, color: 'rgba(246,243,236,0.88)', marginTop: Space.xs, maxWidth: 420 },
  heroMeta: { ...Type.meta, color: Color.inkMuted, marginTop: Space.m },
  heroAction: { marginTop: Space.xl },

  section: { marginTop: Space.section },
  sectionHead: { marginBottom: Space.m },

  markerSpacer: { height: 30 },
  marker: { alignItems: 'center', height: 30, justifyContent: 'flex-end', width: 64 },
  markerValue: { ...Type.bodyStrong, color: Color.ink, fontSize: 14, lineHeight: 18 },
  scaleRow: { flexDirection: 'row', gap: 4 },
  scaleCell: { flex: 1, gap: 8, minHeight: TOUCH, paddingTop: 4 },
  segment: { borderRadius: 7, height: 14 },
  segmentBlack: { borderColor: '#4B5A62', borderWidth: 1 },
  segmentReference: { opacity: 0.4 },
  segmentInactive: { opacity: 0.35 },
  segmentActive: { height: 20, marginTop: -3 },
  scaleLabel: { ...Type.meta, color: Color.inkMuted, textAlign: 'center' },
  scaleLabelActive: { color: Color.ink, fontWeight: Type.bodyStrong.fontWeight },
  scaleCaption: { marginTop: Space.m },

  workRest: { backgroundColor: Color.surface, borderCurve: 'continuous', borderRadius: Radius.surface, padding: Space.xl - 4 },
  workRestNumbers: { flexDirection: 'row', gap: Space.xxl },
  bigNumber: { fontWeight: Type.data.fontWeight, fontSize: 56, lineHeight: 58 },
  bigUnit: { color: Color.ink, fontWeight: Type.data.fontWeight, fontSize: 22 },
  ratioBar: { flexDirection: 'row', gap: 4, height: 12, marginTop: Space.l },
  ratioWork: { backgroundColor: Color.accent, borderRadius: 6 },
  ratioRest: { backgroundColor: Color.support, borderRadius: 6 },
  supportRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.xl, marginTop: Space.xl },
  supportItem: { flexBasis: 140, flexGrow: 1 },
  missing: { gap: Space.s, marginTop: Space.m },
  missingRow: { alignItems: 'center', flexDirection: 'row', gap: Space.s },

  editor: { backgroundColor: Color.surface, borderCurve: 'continuous', borderRadius: Radius.surface, padding: Space.l },
  editorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.l },
  editorActions: { alignItems: 'center', flexDirection: 'row', gap: Space.l, marginTop: Space.l },
  stepper: { flexBasis: 150, flexGrow: 1, gap: 6 },
  stepperRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  stepButton: { alignItems: 'center', backgroundColor: Color.control, height: TOUCH, justifyContent: 'center', width: TOUCH },
  stepValue: { flex: 1, textAlign: 'center' },
  scheduleSummary: { alignItems: 'center', flexDirection: 'row', gap: Space.s },

  timelineScroll: { overflow: 'visible' },
  dropMark: { alignItems: 'center', position: 'absolute', top: 0, width: 16 },
  block: { borderCurve: 'continuous', height: BLOCK_HEIGHT, justifyContent: 'flex-end', overflow: 'hidden', paddingBottom: 10, paddingHorizontal: 10, position: 'absolute', top: 22 },
  blockWork: { backgroundColor: Color.accent },
  blockRest: { backgroundColor: Color.support },
  blockSelected: { borderColor: Color.ink, borderWidth: 2 },
  blockLabel: { ...Type.meta, color: Color.onAccent, fontWeight: Type.bodyStrong.fontWeight },
  blockMinutes: { color: Color.onAccent, fontWeight: Type.data.fontWeight, fontSize: 26, lineHeight: 28 },
  axisLabel: { ...Type.meta, color: Color.inkMuted, position: 'absolute', top: BLOCK_HEIGHT + 28 },
  axisEnd: { textAlign: 'right', width: 52 },
  blockDetail: { gap: 2, marginTop: Space.m },
  nowLine: { backgroundColor: Color.ink, bottom: 18, position: 'absolute', top: 6, width: 2 },
  nowLabel: { ...Type.meta, color: Color.ink, fontWeight: Type.bodyStrong.fontWeight, left: 6, position: 'absolute', top: -4 },
  reviewNote: { marginBottom: Space.m },
  approved: { alignItems: 'center', flexDirection: 'row', gap: Space.s },

  checkRow: { alignItems: 'center', flexDirection: 'row', gap: Space.m, marginHorizontal: -Space.s, minHeight: 52, paddingHorizontal: Space.s },
  checkBox: { alignItems: 'center', borderColor: Color.inkSubtle, borderRadius: 13, borderWidth: 2, height: 26, justifyContent: 'center', width: 26 },
  checkBoxOn: { backgroundColor: Color.accent, borderColor: Color.accent },
  checkedText: { color: Color.inkMuted, textDecorationLine: 'line-through' },

  fact: { gap: 2, marginTop: Space.l },
});
