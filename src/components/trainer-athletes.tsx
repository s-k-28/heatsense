import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { SampleTag } from '@/components/whoop-ui';
import { Face, Palette } from '@/constants/theme';
import { CoachPalette, CoachRadius } from '@/constants/coach-theme';
import { ACCLIMATIZATION_DAYS } from '@/lib/acclimatization';
import { enter, settle } from '@/lib/motion';
import { useAthletes, type AthleteView } from '@/state/athletes';

// The trainer's roster: everyone on the team, searchable, with where each athlete is in heat
// acclimatization and whether their band is reporting. Live numbers live on Monitor, not here.

type Filter = 'all' | 'acclimatizing' | 'band' | 'watch';
const FILTERS: Record<Filter, { label: string; match: (a: AthleteView) => boolean }> = {
  all: { label: 'All', match: () => true },
  acclimatizing: { label: 'Acclimatizing', match: (a) => a.acclimatizationDay < ACCLIMATIZATION_DAYS },
  band: { label: 'On band', match: (a) => Boolean(a.live && !a.live.stale) },
  watch: { label: 'Watch', match: (a) => a.live?.status === 'watch' },
};

const initials = (name: string) => name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();

function AcclimatizationPill({ day }: { day: number }) {
  const done = day >= ACCLIMATIZATION_DAYS;
  const tone = done ? Palette.safe : day < 6 ? Palette.warning : Palette.coral;
  return (
    <View accessibilityLabel={done ? 'Acclimatized' : day === 0 ? 'New, acclimatization not started' : `Acclimatization day ${day} of 14`} accessible style={[styles.pill, { borderColor: tone }]}>
      {done ? (
        <Svg fill="none" height={12} stroke={tone} strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} viewBox="0 0 24 24" width={12}><Path d="m5 12 5 5L20 7" /></Svg>
      ) : null}
      <Text style={[styles.pillText, { color: tone }]}>{done ? 'Ready' : day === 0 ? 'New' : `Day ${day}/14`}</Text>
    </View>
  );
}

function BandMark({ a }: { a: AthleteView }) {
  const on = Boolean(a.live && !a.live.stale);
  const tone = !on ? 'rgba(235,235,245,0.25)' : a.live!.status === 'watch' ? Palette.warning : Palette.safe;
  return (
    <View accessibilityLabel={on ? (a.live!.status === 'watch' ? 'Band live, slow recovery' : 'Band live') : 'No band signal'} accessible style={styles.band}>
      <Svg fill="none" height={20} stroke={on ? Palette.ink : 'rgba(235,235,245,0.3)'} strokeWidth={1.8} viewBox="0 0 24 24" width={20}>
        <Path d="M8 3h8l1 4v10l-1 4H8l-1-4V7z" strokeLinejoin="round" />
        <Circle cx={12} cy={12} fill={tone} r={2.4} stroke="none" />
      </Svg>
    </View>
  );
}

export function TrainerAthletes({ role = 'trainer', embedded = false, onShare }: { role?: 'trainer' | 'coach'; embedded?: boolean; onShare?: () => void }) {
  const { athletes, pending, sample, loading } = useAthletes(role);
  const reduced = useReducedMotion();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const shown = athletes
    .filter(FILTERS[filter].match)
    .filter((a) => a.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((x, y) => x.acclimatizationDay - y.acclimatizationDay || x.name.localeCompare(y.name));
  const filters = (Object.keys(FILTERS) as Filter[]).map((key) => {
    const on = filter === key;
    return (
      <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} key={key} onPress={() => setFilter(key)} style={[styles.chip, role === 'coach' && styles.coachChip, on && styles.chipOn, role === 'coach' && on && styles.coachChipOn]}>
        <Text style={[styles.chipText, role === 'coach' && styles.coachChipText, on && styles.chipTextOn, role === 'coach' && on && styles.coachChipTextOn]}>{FILTERS[key].label} {athletes.filter(FILTERS[key].match).length}</Text>
      </Pressable>
    );
  });

  return (
    <>
      {sample && !embedded ? <SampleTag /> : null}
      <View style={[styles.search, role === 'coach' && styles.coachSearch]}>
        <Svg fill="none" height={18} stroke={role === 'coach' ? CoachPalette.muted : Palette.inkMuted} strokeLinecap="round" strokeWidth={2} viewBox="0 0 24 24" width={18}><Circle cx={11} cy={11} r={7} /><Path d="m20 20-3.5-3.5" /></Svg>
        <TextInput
          accessibilityLabel="Search athletes"
          autoCorrect={false}
          onChangeText={setQuery}
          placeholder="Search athletes"
          placeholderTextColor={Palette.inkFaint}
          returnKeyType="search"
          style={[styles.searchInput, role === 'coach' && styles.coachSearchInput]}
          value={query}
        />
      </View>

      {role === 'coach' ? <ScrollView contentContainerStyle={[styles.chips, styles.coachChips]} horizontal showsHorizontalScrollIndicator={false}>{filters}</ScrollView> : <View style={styles.chips}>{filters}</View>}

      {pending.length && !embedded ? <Text style={styles.pending}>{pending.length} waiting for your coach to approve</Text> : null}

      {loading ? (
        <Text style={styles.empty}>Loading the roster…</Text>
      ) : shown.length === 0 ? (
        <View style={role === 'coach' ? styles.coachEmpty : undefined}>
          <Text style={[styles.empty, role === 'coach' && styles.coachEmptyText]}>{athletes.length ? 'No athletes match.' : role === 'coach' ? 'Your roster is ready for its first athlete.' : 'No athletes yet. Once your coach approves athletes, they appear here.'}</Text>
          {role === 'coach' && !athletes.length && onShare ? <Pressable accessibilityRole="button" onPress={onShare} style={({ pressed }) => [styles.coachShare, pressed && styles.pressed]}><Text style={styles.coachShareText}>Share code</Text></Pressable> : null}
        </View>
      ) : (
        <View style={[styles.list, role === 'coach' && styles.coachList]}>
          {shown.map((a, i) => (
            <Animated.View entering={enter(i, reduced)} key={a.id} layout={settle(reduced)}>
              {i > 0 ? <View style={styles.divider} /> : null}
              <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/athlete-vitals', params: { id: a.id, role } })} style={({ pressed }) => [styles.row, role === 'coach' && styles.coachRow, pressed && styles.pressed]}>
                <View style={[styles.avatar, role === 'coach' && styles.coachAvatar]}><Text style={styles.avatarText}>{initials(a.name)}</Text></View>
                <Text numberOfLines={1} style={[styles.name, role === 'coach' && styles.coachName]}>{a.name}</Text>
                <AcclimatizationPill day={a.acclimatizationDay} />
                <BandMark a={a} />
              </Pressable>
            </Animated.View>
          ))}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  search: { alignItems: 'center', backgroundColor: Palette.surface, borderRadius: 12, flexDirection: 'row', gap: 10, paddingHorizontal: 14 },
  searchInput: { color: Palette.ink, flex: 1, fontSize: 17, minHeight: 46 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { borderColor: Palette.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  chipOn: { backgroundColor: Palette.ink, borderColor: Palette.ink },
  chipText: { color: Palette.ink, fontSize: 15, fontWeight: '600' },
  chipTextOn: { color: '#101416' },
  pending: { color: Palette.inkMuted, fontSize: 15, marginTop: 14 },
  empty: { color: Palette.inkMuted, fontSize: 16, lineHeight: 22, marginTop: 20 },
  list: { backgroundColor: Palette.surface, borderRadius: 16, marginTop: 14, overflow: 'hidden' },
  divider: { backgroundColor: 'rgba(255,255,255,0.07)', height: StyleSheet.hairlineWidth, marginLeft: 70 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 64, paddingHorizontal: 16 },
  avatar: { alignItems: 'center', backgroundColor: 'rgba(235,235,245,0.1)', borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  avatarText: { color: Palette.ink, fontFamily: Face.label, fontSize: 16 },
  name: { color: Palette.ink, flex: 1, fontSize: 17, fontWeight: '600' },
  pill: { alignItems: 'center', borderRadius: 999, borderWidth: 1, flexDirection: 'row', gap: 4, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 13, fontWeight: '700' },
  band: { alignItems: 'center', justifyContent: 'center', width: 26 },
  coachSearch: { backgroundColor: CoachPalette.surface, borderRadius: CoachRadius.pill, minHeight: 52, paddingHorizontal: 18 },
  coachSearchInput: { color: CoachPalette.text, fontWeight: '600' },
  coachChips: { flexWrap: 'nowrap', paddingRight: 16 },
  coachChip: { backgroundColor: CoachPalette.surface, borderColor: 'transparent', paddingHorizontal: 16, paddingVertical: 10 },
  coachChipOn: { backgroundColor: CoachPalette.text },
  coachChipText: { color: CoachPalette.textSecondary },
  coachChipTextOn: { color: CoachPalette.canvas },
  coachEmpty: { alignItems: 'flex-start', backgroundColor: CoachPalette.surface, borderRadius: CoachRadius.card, marginTop: 14, padding: 22 },
  coachEmptyText: { color: CoachPalette.muted, marginTop: 0 },
  coachShare: { backgroundColor: CoachPalette.peach, borderRadius: CoachRadius.pill, marginTop: 16, paddingHorizontal: 18, paddingVertical: 12 },
  coachShareText: { color: CoachPalette.peachInk, fontSize: 15, fontWeight: '800' },
  coachList: { backgroundColor: CoachPalette.surface, borderRadius: CoachRadius.card },
  coachRow: { minHeight: 72, paddingHorizontal: 18 },
  coachAvatar: { backgroundColor: CoachPalette.interactive, borderRadius: 22, height: 44, width: 44 },
  coachName: { color: CoachPalette.text, fontSize: 18, fontWeight: '700' },
});
