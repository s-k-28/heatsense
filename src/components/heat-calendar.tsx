import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

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
const HOT: Zone[] = ['orange', 'red', 'black'];

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

export function HeatHistory({ past, today, temp }: { past: SessionSummary[]; today: { wbgtF: number; zone: Zone } | null; temp: Temp }) {
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
  const practiced = shown.filter((d) => d.peak);
  const hottest = practiced.reduce<Day['peak']>((hot, d) => (!hot || d.peak!.wbgtF > hot.wbgtF ? d.peak : hot), null);
  const pickedDay = dayOf(picked, past, today);

  return (
    <View style={styles.card}>
      <View accessibilityRole="tablist" style={styles.segments}>
        {(['week', 'month'] as const).map((key) => (
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: view === key }} key={key} onPress={() => setView(key)} style={[styles.segment, view === key && styles.segmentOn]}>
            <Text style={[styles.segmentText, view === key && styles.segmentTextOn]}>{key === 'week' ? 'Week' : 'Month'}</Text>
          </Pressable>
        ))}
      </View>

      {view === 'week' ? (
        <View style={styles.week}>
          {week.map((d) => {
            const on = sameDay(d.date, picked);
            return (
              <Pressable accessibilityLabel={`${d.date.toLocaleDateString([], { weekday: 'long' })}${d.peak ? `, peak ${temp.value(d.peak.wbgtF)} degrees, ${ZONES[d.peak.zone].label}` : ', no practice'}`} accessibilityRole="button" accessibilityState={{ selected: on }} key={d.date.toDateString()} onPress={() => setPicked(d.date)} style={styles.weekDay}>
                <Text style={[styles.weekLetter, sameDay(d.date, now) && { color: Palette.ink }]}>{d.date.toLocaleDateString([], { weekday: 'narrow' })}</Text>
                <View style={[styles.ring, { borderColor: d.peak ? tone(d.peak.zone) : 'rgba(235,235,245,0.14)', borderStyle: d.peak ? 'solid' : 'dashed' }, on && styles.ringOn]}>
                  <Text style={styles.ringDate}>{d.date.getDate()}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <>
          <View style={styles.monthHead}>
            <Pressable accessibilityLabel="Previous month" accessibilityRole="button" hitSlop={10} onPress={() => setOffset(offset + 1)}><Chevron left /></Pressable>
            <Text style={styles.monthName}>{first.toLocaleDateString([], { month: 'long', year: 'numeric' })}</Text>
            <Pressable accessibilityLabel="Next month" accessibilityRole="button" disabled={offset === 0} hitSlop={10} onPress={() => setOffset(offset - 1)} style={offset === 0 && styles.dim}><Chevron /></Pressable>
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
                  <Pressable accessibilityLabel={`${d.date.toLocaleDateString([], { month: 'long', day: 'numeric' })}${d.peak ? `, ${ZONES[d.peak.zone].label}` : ', no practice'}`} accessibilityRole="button" disabled={future} key={c} onPress={() => setPicked(d.date)} style={styles.cell}>
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
          { label: 'Practices', value: String(practiced.length) },
          { label: 'Hottest', value: hottest ? String(temp.value(hottest.wbgtF)) : '--', unit: hottest ? temp.unit : undefined, tone: hottest ? tone(hottest.zone) : undefined },
          { label: 'Orange or hotter', value: String(practiced.filter((d) => HOT.includes(d.peak!.zone)).length) },
        ]} />
      </View>

      <View accessible style={styles.picked}>
        <View style={[styles.pickedDot, { backgroundColor: pickedDay.peak ? tone(pickedDay.peak.zone) : 'rgba(235,235,245,0.2)' }]} />
        <Text style={styles.pickedText}>
          <Text style={styles.pickedDay}>{sameDay(picked, now) ? 'Today' : picked.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}  </Text>
          {pickedDay.peak
            ? `${temp.value(pickedDay.peak.wbgtF)}${temp.unit} peak · ${ZONES[pickedDay.peak.zone].label}${pickedDay.practices[0] ? ` · ${pickedDay.practices[0].session.venue}` : ''}`
            : 'No practice'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Palette.surface, borderRadius: 16, padding: 16 },
  segments: { backgroundColor: 'rgba(235,235,245,0.08)', borderRadius: 10, flexDirection: 'row', gap: 4, padding: 3 },
  segment: { alignItems: 'center', borderRadius: 8, flex: 1, justifyContent: 'center', minHeight: 34 },
  segmentOn: { backgroundColor: 'rgba(235,235,245,0.16)' },
  segmentText: { color: Palette.inkMuted, fontSize: 15, fontWeight: '600' },
  segmentTextOn: { color: Palette.ink },
  week: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  weekDay: { alignItems: 'center', gap: 6 },
  weekLetter: { color: Palette.inkMuted, fontSize: 13, fontWeight: '600' },
  ring: { alignItems: 'center', borderRadius: 21, borderWidth: 3, height: 42, justifyContent: 'center', width: 42 },
  ringOn: { backgroundColor: 'rgba(235,235,245,0.14)' },
  ringDate: { color: Palette.ink, fontFamily: Face.figure, fontSize: 17 },
  monthHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingHorizontal: 4 },
  monthName: { color: Palette.ink, fontSize: 17, fontWeight: '600' },
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
  picked: { alignItems: 'center', backgroundColor: 'rgba(235,235,245,0.06)', borderRadius: 10, flexDirection: 'row', gap: 10, marginTop: 14, padding: 12 },
  pickedDot: { borderRadius: 5, height: 10, width: 10 },
  pickedText: { color: Palette.inkMuted, flex: 1, fontSize: 15 },
  pickedDay: { color: Palette.ink, fontWeight: '600' },
});
