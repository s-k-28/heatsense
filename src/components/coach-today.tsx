import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { FieldCheckSheet } from '@/components/field-check-sheet';
import { HeatOrb } from '@/components/heat-orb';
import { Ring } from '@/components/ui/visuals';
import { Palette } from '@/constants/theme';
import { enter, swap } from '@/lib/motion';
import { ZONES, type Zone } from '@/lib/practice';
import { recheckStatus, SOURCE_LABEL } from '@/services/practice-sessions';
import { useTemperature } from '@/state/preferences';
import { useCoachData, useNow, type CoachData, type SessionRole } from '@/state/team-session';

// The orb Home, after WHOOP's Home: one living orb with the latest field reading, three rings for
// the practice loop (recheck, readings, acknowledged), then "Get started" cards and today's record.
// Athletes and trainers see it read-only; the coach's Home reuses the rings, cards and readings list.
// Everything comes from the team's practice session in Firestore. A build without Firebase shows the
// sample reading instead, tagged SAMPLE wherever it appears.

const BAND = require('@/assets/images/heatsense-band-refined.png');
const NEUTRAL = '#6B7A82';

export function CoachToday({ onInvite, readOnly = false, role = 'coach' }: { onInvite?: () => void; readOnly?: boolean; role?: SessionRole }) {
  const data = useCoachData(role);
  const temp = useTemperature();
  const now = useNow();
  const [sheet, setSheet] = useState(false);
  const reduced = useReducedMotion();

  const latest = data?.readings.at(-1) ?? null;
  const zone: Zone | null = latest?.zone ?? null;
  const color = zone ? zoneColor(zone) : NEUTRAL;
  const session = data?.session ?? null;
  const minutesAgo = latest ? Math.max(0, Math.round((now - latest.measuredAt.getTime()) / 60_000)) : 0;

  const action = !session ? 'Start practice' : latest ? 'Add a reading' : 'Take first reading';

  return (
    <>
      <View style={styles.hero}>
        {data?.sample ? <Text style={styles.sampleTag}>SAMPLE DATA</Text> : null}
        <HeatOrb color={color} size={268} still={!latest}>
          {latest ? (
            <Animated.View entering={swap(reduced)} key={latest.id} style={styles.orbCopy}>
              <Text style={styles.orbValue}>{temp.value(latest.wbgtF)}<Text style={styles.orbUnit}>{temp.unit}</Text></Text>
              <Text style={[styles.orbZone, { color: ZONES[latest.zone].text }]}>{ZONES[latest.zone].label.toUpperCase()}</Text>
            </Animated.View>
          ) : (
            <>
              <Text style={styles.orbEmpty}>--</Text>
              <Text style={styles.orbMeta}>{session ? 'No reading yet' : 'No practice today'}</Text>
            </>
          )}
        </HeatOrb>
        {readOnly ? null : (
          <Pressable accessibilityRole="button" onPress={() => setSheet(true)} style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
            <Text style={styles.ctaText}>{action.toUpperCase()}</Text>
          </Pressable>
        )}
        {latest ? <Text style={styles.measured}>WBGT measured {minutesAgo === 0 ? 'just now' : `${minutesAgo} min ago`}</Text> : null}
      </View>

      <PracticeRings data={data} />
      {readOnly ? null : <GetStarted onInvite={onInvite} onReading={() => setSheet(true)} showReading={!latest} />}
      <TodaysReadings data={data} />

      {readOnly ? null : <FieldCheckSheet onClose={() => setSheet(false)} visible={sheet} />}
    </>
  );
}

/** Zone colors for drawing; Black's own color disappears on a dark screen. */
export function zoneColor(zone: Zone) {
  return ZONES[zone].color === '#000000' ? '#8E8E93' : ZONES[zone].color;
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
  hero: { alignItems: 'center', marginTop: 8 },
  orbCopy: { alignItems: 'center' },
  sampleTag: { color: Palette.inkMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.6, marginBottom: 4 },
  orbValue: { color: Palette.ink, fontSize: 58, fontVariant: ['tabular-nums'], fontWeight: '700', letterSpacing: -1 },
  orbUnit: { color: Palette.inkMuted, fontSize: 22, fontWeight: '600' },
  orbZone: { fontSize: 14, fontWeight: '800', letterSpacing: 2, marginTop: 2 },
  orbMeta: { color: Palette.inkMuted, fontSize: 14, marginTop: 6 },
  orbEmpty: { color: Palette.inkMuted, fontSize: 52, fontWeight: '600' },
  cta: { backgroundColor: Palette.coral, borderRadius: 999, marginTop: 14, minHeight: 50, justifyContent: 'center', paddingHorizontal: 28 },
  ctaText: { color: '#1A0E07', fontSize: 14, fontWeight: '800', letterSpacing: 1.4 },
  measured: { color: Palette.inkMuted, fontSize: 15, marginTop: 12 },
  rings: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 28, paddingHorizontal: 4 },
  dial: { alignItems: 'center', width: '32%' },
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
