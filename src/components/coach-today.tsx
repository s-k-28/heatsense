import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { FieldCheckSheet } from '@/components/field-check-sheet';
import { HeatOrb } from '@/components/heat-orb';
import { SampleTag } from '@/components/whoop-ui';
import { Ring } from '@/components/ui/visuals';
import { Palette } from '@/constants/theme';
import { enter, swap } from '@/lib/motion';
import { ZONES, type Zone } from '@/lib/practice';
import { recheckStatus, SOURCE_LABEL } from '@/services/practice-sessions';
import { useTemperature } from '@/state/preferences';
import { useCoachData, useNow, type SessionRole } from '@/state/team-session';

// Coach Home, after WHOOP's Home: one living orb with the latest field reading, three rings for
// the practice loop (recheck, readings, acknowledged), then "Get started" cards and today's record.
// Everything comes from the team's practice session in Firestore. A build without Firebase shows the
// sample reading instead, tagged SAMPLE wherever it appears.

const BAND = require('@/assets/images/heatsense-band-refined.png');
const NEUTRAL = '#6B7A82';

export function CoachToday({ onInvite, readOnly = false, role = 'coach' }: { onInvite?: () => void; readOnly?: boolean; role?: SessionRole }) {
  const data = useCoachData(role);
  const temp = useTemperature();
  const now = useNow();
  const [sheet, setSheet] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const reduced = useReducedMotion();

  const latest = data?.readings.at(-1) ?? null;
  const zone: Zone | null = latest?.zone ?? null;
  const color = zone ? ZONES[zone].color === '#000000' ? '#8E8E93' : ZONES[zone].color : NEUTRAL;
  const session = data?.session ?? null;
  const recheck = session ? recheckStatus(session, latest, now) : null;
  const acked = data?.readings.filter((r) => r.acknowledgedAt).length ?? 0;
  const total = data?.readings.length ?? 0;
  const minutesAgo = latest ? Math.max(0, Math.round((now - latest.measuredAt.getTime()) / 60_000)) : 0;

  const action = !session ? 'Start practice' : latest ? 'Add a reading' : 'Take first reading';
  // Trainers log readings once the coach has started practice; athletes only watch.
  const trainerRecords = role === 'trainer' && Boolean(session) && !data?.sample;
  const canRecord = !readOnly || trainerRecords;

  return (
    <>
      <View style={styles.hero}>
        {data?.sample ? <SampleTag /> : null}
        <HeatOrb color={color} size={268} still={!latest}>
          {latest ? (
            <Animated.View entering={swap(reduced)} key={latest.id} style={styles.orbCopy}>
              <Text style={styles.orbValue}>{temp.value(latest.wbgtF)}<Text style={styles.orbUnit}>{temp.unit}</Text></Text>
              <Text style={[styles.orbZone, { color: ZONES[latest.zone].text }]}>{ZONES[latest.zone].label}</Text>
            </Animated.View>
          ) : (
            <>
              <Text style={styles.orbEmpty}>--</Text>
              <Text style={styles.orbMeta}>{session ? 'No reading yet' : 'No practice today'}</Text>
            </>
          )}
        </HeatOrb>
        {canRecord ? (
          <Pressable accessibilityRole="button" onPress={() => setSheet(true)} style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
            <Text style={styles.ctaText}>{action}</Text>
          </Pressable>
        ) : null}
        {latest ? <Text style={styles.measured}>WBGT measured {minutesAgo === 0 ? 'just now' : `${minutesAgo} min ago`}</Text> : null}
      </View>

      <Animated.View entering={enter(2, reduced)} style={styles.rings}>
        <Metric label="Recheck" sub={recheck ? (recheck.overdue ? 'Overdue' : 'Next reading') : 'No session'}>
          <Ring
            max={1}
            segments={[{ color: recheck?.overdue ? Palette.emergency : Palette.coral, value: recheck ? Math.min(1, 1 - Math.max(0, recheck.msLeft) / (session!.recheckMinutes * 60_000)) : 0 }]}
            size={88}
            stroke={7}
            summary={recheck ? (recheck.overdue ? 'Reading overdue' : `Next reading in ${Math.ceil(recheck.msLeft / 60_000)} minutes`) : 'No practice session'}>
            <Text style={[styles.ringValue, recheck?.overdue && { color: Palette.emergency }]}>{recheck ? (recheck.overdue ? 'LATE' : `${Math.ceil(recheck.msLeft / 60_000)}m`) : '--'}</Text>
          </Ring>
        </Metric>
        <Metric label="Readings" sub="Today">
          <Ring max={Math.max(total, 4)} segments={(data?.readings ?? []).map((r) => ({ color: ZONES[r.zone].color === '#000000' ? '#8E8E93' : ZONES[r.zone].color, value: 1 }))} size={88} stroke={7} summary={`${total} readings today`}>
            <Text style={styles.ringValue}>{total || '--'}</Text>
          </Ring>
        </Metric>
        <Metric label="Applied" sub="Guidance">
          <Ring max={Math.max(total, 1)} segments={[{ color: Palette.safe, value: acked }]} size={88} stroke={7} summary={`${acked} of ${total} readings acknowledged`}>
            <Text style={styles.ringValue}>{total ? `${acked}/${total}` : '--'}</Text>
          </Ring>
        </Metric>
      </Animated.View>

      {readOnly ? null : <>
      <Text accessibilityRole="header" style={styles.section}>Get started</Text>
      <Animated.View entering={enter(4, reduced)} style={styles.cards}>
        {!latest && !dismissed.includes('reading') ? (
          <StartCard accent action="Check field conditions" body="Enter the WBGT from your meter. HeatSense sets the zone from your UIL class and tells you what to change." onAction={() => setSheet(true)} onDismiss={() => setDismissed([...dismissed, 'reading'])} title="Take a field reading" />
        ) : null}
        {!dismissed.includes('invite') ? (
          <StartCard action="Share team code" body="Athletes join with your 6-digit code. You approve each one." onAction={() => onInvite?.()} onDismiss={() => setDismissed([...dismissed, 'invite'])} title="Invite your athletes" />
        ) : null}
        {!dismissed.includes('band') ? (
          <StartCard action="How pairing works" body="Athletes pair a HeatSense Band during setup. Bands are optional; field readings drive every decision." onAction={() => setDismissed([...dismissed, 'band'])} onDismiss={() => setDismissed([...dismissed, 'band'])} title="Pair athlete bands" art={<Image contentFit="contain" source={BAND} style={styles.bandArt} />} />
        ) : null}
      </Animated.View>
      </>}

      {total > 0 ? (
        <>
          <Text accessibilityRole="header" style={styles.section}>Today’s readings</Text>
          <View style={styles.list}>
            {[...(data?.readings ?? [])].reverse().map((r) => (
              <View key={r.id} style={styles.row}>
                <View style={[styles.dot, { backgroundColor: ZONES[r.zone].color === '#000000' ? '#8E8E93' : ZONES[r.zone].color }]} />
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle}>{temp.value(r.wbgtF)}{temp.unit} · {ZONES[r.zone].label}</Text>
                  <Text style={styles.rowMeta}>{r.measuredAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {SOURCE_LABEL[r.source]}</Text>
                </View>
                <Text style={[styles.rowState, { color: r.acknowledgedAt ? Palette.safe : Palette.inkMuted }]}>{r.acknowledgedAt ? 'Applied' : 'Pending'}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {canRecord ? <FieldCheckSheet onClose={() => setSheet(false)} trainerTeamId={role === 'trainer' ? data?.teamId ?? null : undefined} visible={sheet} /> : null}
    </>
  );
}

function Metric({ children, label, sub }: { children: ReactNode; label: string; sub: string }) {
  return (
    <View style={styles.metric}>
      {children}
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricSub}>{sub}</Text>
    </View>
  );
}

function StartCard({ action, art, body, onAction, onDismiss, title }: { accent?: boolean; action: string; art?: ReactNode; body: string; onAction: () => void; onDismiss: () => void; title: string }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardCopy}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardBody}>{body}</Text>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={onAction} style={({ pressed }) => pressed && styles.pressed}>
          <Text style={styles.cardAction}>{action}</Text>
        </Pressable>
      </View>
      {art ? <View style={styles.cardArt}>{art}</View> : null}
      <Pressable accessibilityLabel={`Dismiss ${title}`} accessibilityRole="button" hitSlop={10} onPress={onDismiss} style={styles.close}>
        <Text style={styles.closeText}>×</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  hero: { alignItems: 'center', marginTop: 8 },
  orbCopy: { alignItems: 'center' },
  orbValue: { color: Palette.ink, fontSize: 58, fontVariant: ['tabular-nums'], fontWeight: '700', letterSpacing: -1 },
  orbUnit: { color: Palette.inkMuted, fontSize: 22, fontWeight: '600' },
  orbZone: { fontSize: 17, fontWeight: '600', marginTop: 2 },
  orbMeta: { color: Palette.inkMuted, fontSize: 16, marginTop: 6 },
  orbEmpty: { color: Palette.inkMuted, fontSize: 52, fontWeight: '600' },
  cta: { backgroundColor: Palette.coral, borderRadius: 999, marginTop: 18, minHeight: 52, justifyContent: 'center', paddingHorizontal: 32 },
  ctaText: { color: '#1A0E07', fontSize: 17, fontWeight: '600' },
  measured: { color: Palette.inkMuted, fontSize: 15, marginTop: 12 },
  rings: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 28, paddingHorizontal: 4 },
  metric: { alignItems: 'center', gap: 4, width: '32%' },
  ringValue: { color: Palette.ink, fontSize: 20, fontVariant: ['tabular-nums'], fontWeight: '700' },
  metricLabel: { color: Palette.ink, fontSize: 16, fontWeight: '600', marginTop: 10 },
  metricSub: { color: Palette.inkMuted, fontSize: 14 },
  section: { color: Palette.ink, fontSize: 22, fontWeight: '700', letterSpacing: -0.3, marginBottom: 12, marginTop: 34 },
  cards: { gap: 12 },
  card: { backgroundColor: Palette.surface, borderRadius: 16, flexDirection: 'row', gap: 12, padding: 18 },
  cardCopy: { flex: 1, gap: 6 },
  cardTitle: { color: Palette.ink, fontSize: 18, fontWeight: '600', paddingRight: 24 },
  cardBody: { color: Palette.inkMuted, fontSize: 15, lineHeight: 21 },
  cardAction: { color: Palette.coral, fontSize: 16, fontWeight: '600', marginTop: 8 },
  cardArt: { alignItems: 'center', justifyContent: 'center', width: 84 },
  bandArt: { height: 84, width: 84 },
  close: { position: 'absolute', right: 14, top: 10 },
  closeText: { color: Palette.inkMuted, fontSize: 22 },
  list: { backgroundColor: Palette.card, borderRadius: 20, paddingHorizontal: 16 },
  row: { alignItems: 'center', borderBottomColor: 'rgba(255,255,255,0.06)', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 12, minHeight: 64 },
  dot: { borderRadius: 6, height: 12, width: 12 },
  rowCopy: { flex: 1, gap: 2 },
  rowTitle: { color: Palette.ink, fontSize: 16, fontWeight: '600' },
  rowMeta: { color: Palette.inkMuted, fontSize: 13 },
  rowState: { fontSize: 13, fontWeight: '700' },
});
