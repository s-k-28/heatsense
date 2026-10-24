import { Text } from '@/components/ui/text';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useAthleteStyles } from '@/components/athlete-appearance';
import { Segmented } from '@/components/motion/segmented';
import { StatRow } from '@/components/whoop-ui';
import { Face, Palette } from '@/constants/theme';
import { ZONES, type Zone } from '@/lib/practice';
import type { SessionSummary } from '@/services/practice-sessions';

// The team's heat history the way Cal AI and Strava show a habit: a week strip of days ringed in
// their hottest zone, or a month of tiles. Tap a day to see that practice.

type Day = { date: Date; peak: { wbgtF: number; zone: Zone } | null; practices: SessionSummary[] };
type Temp = { value: (f: number) => number | string; unit: string };

const tone = (zone: Zone) => (zone === 'black' ? '#8E8E93' : ZONES[zone].color);
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

function dayOf(date: Date, past: SessionSummary[], today: { wbgtF: number; zone: Zone } | null): Day {
  const practices = past.filter((p) => sameDay(p.session.startedAt, date));
  const peaks = practices.map((p) => p.peak).filter((p): p is { wbgtF: number; zone: Zone } => Boolean(p));
  if (today && sameDay(date, new Date())) peaks.push(today);
  const peak = peaks.reduce<Day['peak']>((hot, p) => (!hot || p.wbgtF > hot.wbgtF ? p : hot), null);
  return { date, peak, practices };
}

function Chevron({ left }: { left?: boolean }) {
  return <Svg fill="none" height={20} stroke={Palette.ink} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} viewBox="0 0 24 24" width={20}><Path d={left ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'} /></Svg>;
}

export function HeatHistory({ past, today, temp, onOpenSession }: { past: SessionSummary[]; today: { wbgtF: number; zone: Zone } | null; temp: Temp; onOpenSession?: (summary: SessionSummary) => void }) {
  const styles = useAthleteStyles(baseStyles);
  const weekScroll = useRef<ScrollView>(null);
  const [view, setView] = useState<'week' | 'month'>('week');
  const [offset, setOffset] = useState(0); // months back from this one
  const now = new Date();
  const [picked, setPicked] = useState<Date>(now);

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - (6 - i));
    return dayOf(d, past, today);
  });
  const first = new Date(now.getFullYear(), now.getMonth() - offset, 1, 12);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const month = Array.from({ length: daysInMonth }, (_, i) => dayOf(new Date(first.getFullYear(), first.getMonth(), i + 1, 12), past, today));
  const shown = view === 'week' ? week : month;
  const daysWithReadings = shown.filter((d) => d.peak);
  const hottest = daysWithReadings.reduce<Day['peak']>((hot, d) => (!hot || d.peak!.wbgtF > hot.wbgtF ? d.peak : hot), null);
  const pickedDay = dayOf(picked, past, today);

  const selectView = (next: 'week' | 'month') => {
    setView(next);
    // Keep the selected date inside the newly visible period.
    if (next === 'week' && !week.some((day) => sameDay(day.date, picked))) setPicked(now);
    if (next === 'month' && !month.some((day) => sameDay(day.date, picked))) setPicked(offset === 0 ? now : first);
  };
  const changeMonth = (nextOffset: number) => {
    setOffset(nextOffset);
    setPicked(nextOffset === 0 ? now : new Date(now.getFullYear(), now.getMonth() - nextOffset, 1, 12));
  };

  return (
    <View style={styles.card}>
      <Segmented onChange={selectView} options={[{ key: 'week', label: 'Week' }, { key: 'month', label: 'Month' }]} tone="card" value={view} />

      {view === 'week' ? (
        <ScrollView contentContainerStyle={styles.week} horizontal onContentSizeChange={() => weekScroll.current?.scrollToEnd({ animated: false })} onLayout={() => weekScroll.current?.scrollToEnd({ animated: false })} ref={weekScroll} style={styles.weekViewport}>
          {week.map((d) => {
            const on = sameDay(d.date, picked);
            return (
              <Pressable accessibilityLabel={`${d.date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}${d.peak ? `, peak ${temp.value(d.peak.wbgtF)}${temp.unit}, ${ZONES[d.peak.zone].label}` : ', no saved reading'}`} accessibilityRole="button" accessibilityState={{ selected: on }} key={d.date.toDateString()} onPress={() => setPicked(d.date)} style={({ pressed }) => [styles.weekDay, pressed && styles.pressed]}>
                <Text style={[styles.weekLetter, sameDay(d.date, now) && { color: Palette.ink }]}>{d.date.toLocaleDateString([], { weekday: 'narrow' })}</Text>
                <View style={[styles.ring, { borderColor: d.peak ? tone(d.peak.zone) : 'rgba(235,235,245,0.14)', borderStyle: d.peak ? 'solid' : 'dashed' }, on && styles.ringOn]}>
                  <Text style={styles.ringDate}>{d.date.getDate()}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <>
          <View style={styles.monthHead}>
            <Pressable accessibilityLabel="Previous month" accessibilityRole="button" onPress={() => changeMonth(offset + 1)} style={({ pressed }) => [styles.monthControl, pressed && styles.pressed]}><Chevron left /></Pressable>
            <Text style={styles.monthName}>{first.toLocaleDateString([], { month: 'long', year: 'numeric' })}</Text>
            <Pressable accessibilityLabel="Next month" accessibilityRole="button" accessibilityState={{ disabled: offset === 0 }} disabled={offset === 0} onPress={() => changeMonth(offset - 1)} style={({ pressed }) => [styles.monthControl, offset === 0 && styles.dim, pressed && styles.pressed]}><Chevron /></Pressable>
          </View>
          <View style={styles.gridRow}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((l, i) => <Text key={i} style={styles.gridLetter}>{l}</Text>)}
          </View>
          {Array.from({ length: Math.ceil((first.getDay() + month.length) / 7) }, (_, w) => (
            <View key={w} style={styles.gridRow}>
              {Array.from({ length: 7 }, (_, c) => {
                const d = month[w * 7 + c - first.getDay()];
                if (!d) return <View key={c} style={styles.cell} />;
                const future = d.date > now && !sameDay(d.date, now);
                const on = sameDay(d.date, picked);
                return (
                  <Pressable accessibilityLabel={`${d.date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}${d.peak ? `, ${ZONES[d.peak.zone].label}` : ', no saved reading'}`} accessibilityRole="button" accessibilityState={{ selected: on, disabled: future }} disabled={future} key={c} onPress={() => setPicked(d.date)} style={({ pressed }) => [styles.cell, pressed && styles.pressed]}>
                    <View style={[styles.tile, d.peak ? { backgroundColor: tone(d.peak.zone) } : styles.tileEmpty, future && styles.dim, on && styles.tileOn]}>
                      <Text style={[styles.tileDate, d.peak && styles.tileDateOn]}>{d.date.getDate()}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </>
      )}

      <View style={styles.stats}>
        <StatRow stats={[
          { label: 'Days with readings', value: String(daysWithReadings.length) },
          { label: 'Hottest', value: hottest ? String(temp.value(hottest.wbgtF)) : '--', unit: hottest ? temp.unit : undefined, tone: hottest ? tone(hottest.zone) : undefined },
        ]} />
      </View>

      <View accessible style={styles.picked}>
        <View style={[styles.pickedDot, { backgroundColor: pickedDay.peak ? tone(pickedDay.peak.zone) : 'rgba(235,235,245,0.2)' }]} />
        <View style={styles.pickedCopy}>
          <Text style={styles.pickedDay}>{sameDay(picked, now) ? 'Today' : picked.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
          <Text style={styles.pickedText}>{pickedDay.peak ? `${temp.value(pickedDay.peak.wbgtF)}${temp.unit} peak · ${ZONES[pickedDay.peak.zone].label}` : 'No saved reading'}</Text>
        </View>
      </View>
      {onOpenSession ? pickedDay.practices.map((practice) => (
        <Pressable accessibilityHint="Opens the saved practice record" accessibilityLabel={`${practice.session.venue}, ${practice.session.startedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`} accessibilityRole="button" key={practice.session.id} onPress={() => onOpenSession(practice)} style={({ pressed }) => [styles.recordLink, pressed && styles.dim]}>
          <Text style={styles.recordLinkText}>{practice.session.venue} · {practice.session.startedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
          <Text style={styles.recordLinkText}>›</Text>
        </Pressable>
      )) : null}
    </View>
  );
}

const baseStyles = StyleSheet.create({
  card: { backgroundColor: Palette.surface, borderRadius: 16, padding: 16 },
  weekViewport: { marginTop: 16 },
  week: { flexDirection: 'row', flexGrow: 1, gap: 6, justifyContent: 'space-between', paddingBottom: 6 },
  weekDay: { alignItems: 'center', gap: 6, minHeight: 64, minWidth: 44 },
  weekLetter: { color: Palette.inkMuted, fontSize: 13, fontWeight: '600' },
  ring: { alignItems: 'center', borderRadius: 21, borderWidth: 3, height: 42, justifyContent: 'center', width: 42 },
  ringOn: { backgroundColor: 'rgba(235,235,245,0.14)' },
  ringDate: { color: Palette.ink, fontFamily: Face.figure, fontSize: 17 },
  monthHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingHorizontal: 4 },
  monthName: { color: Palette.ink, flex: 1, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  monthControl: { alignItems: 'center', justifyContent: 'center', minHeight: 48, minWidth: 48 },
  pressed: { opacity: 0.7 },
  dim: { opacity: 0.3 },
  gridRow: { flexDirection: 'row', marginTop: 4 },
  gridLetter: { color: Palette.inkMuted, flex: 1, fontSize: 12, fontWeight: '600', marginTop: 8, textAlign: 'center' },
  cell: { aspectRatio: 1, flex: 1, padding: 3 },
  tile: { alignItems: 'center', borderRadius: 9, flex: 1, justifyContent: 'center' },
  tileEmpty: { backgroundColor: 'rgba(235,235,245,0.06)' },
  tileOn: { borderColor: Palette.ink, borderWidth: 2 },
  tileDate: { color: Palette.inkMuted, fontFamily: Face.figure, fontSize: 15 },
  tileDateOn: { color: '#101416' },
  stats: { borderTopColor: 'rgba(255,255,255,0.08)', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 16, paddingTop: 14 },
  picked: { alignItems: 'center', borderTopColor: Palette.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 10, marginTop: 14, paddingTop: 14 },
  pickedDot: { borderRadius: 5, height: 10, width: 10 },
  pickedCopy: { flex: 1, gap: 4 },
  pickedText: { color: Palette.inkMuted, fontSize: 16, lineHeight: 22 },
  pickedDay: { color: Palette.ink, fontSize: 17, fontWeight: '600' },
  recordLink: { alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'space-between', minHeight: 48 },
  recordLinkText: { color: Palette.coral, flexShrink: 1, fontSize: 16, fontWeight: '500' },
});
