import { surfaceStyles } from '@/components/ui/surface';
import { Text, TextInput } from '@/components/ui/text';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { ListRow, Rows, SampleTag } from '@/components/whoop-ui';
import { Segmented } from '@/components/motion/segmented';
import { ActionButton } from '@/components/ui/action-button';
import { Face, Palette } from '@/constants/theme';
import { CoachPalette, CoachRadius } from '@/constants/coach-theme';
import { enter, settle } from '@/lib/motion';
import { ACCLIMATIZATION_DAYS } from '@/lib/acclimatization';
import { useAthletes, type AthleteView } from '@/state/athletes';

// The trainer's roster: everyone on the team, searchable, with where each athlete is in heat
// acclimatization and whether their band is reporting. Live numbers live on Monitor, not here.

type Filter = 'all' | 'acclimatizing' | 'band' | 'watch';
const FILTERS: Record<Filter, { label: string; match: (a: AthleteView) => boolean }> = {
  all: { label: 'All', match: () => true },
  acclimatizing: { label: 'Under 14', match: (a) => a.practiceDaysKnown && a.acclimatizationDay < ACCLIMATIZATION_DAYS },
  band: { label: 'Live', match: (a) => Boolean(a.live && !a.live.stale) },
  watch: { label: 'Watch', match: (a) => Boolean(a.live && !a.live.stale && a.live.status === 'watch') },
};

function practiceDayLabel(a: AthleteView) {
  if (!a.practiceDaysKnown) return '—';
  const day = a.acclimatizationDay;
  return day >= ACCLIMATIZATION_DAYS ? '14+ days' : `${day} ${day === 1 ? 'day' : 'days'}`;
}

function bandLabel(a: AthleteView) {
  if (!a.live) return 'No band signal';
  const state = a.live.stale ? 'Signal stale' : a.live.status === 'watch' ? 'Live · slow recovery' : a.live.status === 'unknown' ? 'Live · recovery unavailable' : 'Band live';
  return `${a.simulated ? 'Simulated · ' : ''}${state}`;
}

export function TrainerAthletes({ role = 'trainer', embedded = false, onShare }: { role?: 'trainer' | 'coach'; embedded?: boolean; onShare?: () => void }) {
  const { athletes, pending, sample, loading, status, vitalsStatus, historyStatus, retry } = useAthletes(role);
  const reduced = useReducedMotion();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const filters = (Object.keys(FILTERS) as Filter[]).filter((key) => {
    const count = athletes.filter((a) => FILTERS[key].match(a)).length;
    return key === 'all' || key === filter || (count > 0 && count < athletes.length);
  });
  const showSearch = (role === 'coach' && athletes.length > 0) || athletes.length >= 8 || Boolean(query);
  const shown = athletes
    .filter((a) => FILTERS[filter].match(a))
    .filter((a) => a.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((x, y) => Number(y.practiceDaysKnown) - Number(x.practiceDaysKnown) || (x.practiceDaysKnown && y.practiceDaysKnown ? x.acclimatizationDay - y.acclimatizationDay : 0) || x.name.localeCompare(y.name));

  return (
    <>
      {sample && !embedded ? <SampleTag /> : null}
      {athletes.length ? <Text style={styles.rosterCount}>{athletes.length} {athletes.length === 1 ? 'athlete' : 'athletes'}</Text> : null}
      {showSearch ? <View style={[styles.search, role === 'coach' && styles.coachSearch]}>
        <Svg fill="none" height={18} stroke={role === 'coach' ? CoachPalette.muted : Palette.inkMuted} strokeLinecap="round" strokeWidth={2} viewBox="0 0 24 24" width={18}><Circle cx={11} cy={11} r={7} /><Path d="m20 20-3.5-3.5" /></Svg>
        <TextInput
          accessibilityLabel="Search athletes"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          onChangeText={setQuery}
          placeholder="Search athletes"
          placeholderTextColor={role === 'coach' ? CoachPalette.faint : Palette.inkFaint}
          returnKeyType="search"
          style={[styles.searchInput, role === 'coach' && styles.coachSearchInput]}
          value={query}
        />
      </View> : null}

      {athletes.length > 0 && filters.length > 1 ? role === 'coach' ? (
        <ScrollView contentContainerStyle={styles.coachChips} horizontal showsHorizontalScrollIndicator={false}>
          {filters.map((key) => <Pressable accessibilityRole="button" accessibilityState={{ selected: filter === key }} key={key} onPress={() => setFilter(key)} style={({ pressed }) => [styles.coachChip, filter === key && styles.coachChipOn, pressed && styles.pressed]}>
            <Text style={[styles.coachChipText, filter === key && styles.coachChipTextOn]}>{FILTERS[key].label} {athletes.filter((athlete) => FILTERS[key].match(athlete)).length}</Text>
          </Pressable>)}
        </ScrollView>
      ) : <View style={styles.filters}>
        <Segmented onChange={setFilter} options={filters.map((key) => ({ key, label: `${FILTERS[key].label} ${athletes.filter((a) => FILTERS[key].match(a)).length}` }))} value={filter} />
      </View> : null}

      {pending.length && !embedded ? <Text style={styles.pending}>{pending.length} {pending.length === 1 ? 'request' : 'requests'} awaiting {role === 'coach' ? '' : 'coach '}approval</Text> : null}
      {athletes.length ? <Text style={styles.recordNote}>{sample ? 'Simulated practice-day counts.' : 'Team practice dates since joining; attendance isn’t verified.'}</Text> : null}

      {athletes.length ? <>
          {vitalsStatus === 'error' ? <Text accessibilityLiveRegion="polite" style={styles.pending}>Band signals couldn’t load.</Text> : null}
          {historyStatus === 'error' ? <Text accessibilityLiveRegion="polite" style={styles.pending}>Practice-day history couldn’t load. Counts are unavailable.</Text> : null}
          {vitalsStatus === 'error' || historyStatus === 'error' ? <ActionButton label="Retry unavailable data" onPress={retry} variant="text" /> : null}
      </> : null}

      {status === 'error' ? (
        <View style={[styles.emptyState, role === 'coach' && styles.coachEmpty]}><Text accessibilityLiveRegion="polite" style={styles.empty}>Couldn’t load the roster. Your team connection may be unavailable.</Text><ActionButton label="Try again" onPress={retry} variant="secondary" /></View>
      ) : loading ? (
        <Text style={styles.empty}>Loading the roster…</Text>
      ) : shown.length === 0 ? (
        <View style={[styles.emptyState, role === 'coach' && styles.coachEmpty]}>
          <Text accessibilityLiveRegion="polite" style={styles.empty}>{athletes.length ? filter === 'acclimatizing' && historyStatus === 'loading' ? 'Loading practice-day history…' : 'No athletes in this view.' : status === 'idle' ? 'No team connected.' : role === 'coach' ? 'Share your team code to invite athletes.' : 'Athletes appear here after coach approval.'}</Text>
          {role === 'coach' && !athletes.length && status === 'ready' && onShare ? <ActionButton label="Share code" onPress={onShare} style={styles.coachShare} /> : null}
          {athletes.length ? <ActionButton label="Show all athletes" onPress={() => { setQuery(''); setFilter('all'); }} variant="secondary" /> : null}
        </View>
      ) : role === 'coach' ? (
        <View style={[styles.list, styles.coachList]}>
          {shown.map((athlete, index) => {
            const detail = !athlete.live && vitalsStatus === 'loading' ? 'Loading band signal…' : !athlete.live && vitalsStatus === 'error' ? 'Band signal unavailable' : bandLabel(athlete);
            const tone = athlete.practiceDaysKnown && athlete.acclimatizationDay < 6 ? Palette.warning : CoachPalette.textSecondary;
            return <Animated.View entering={enter(index, reduced)} key={athlete.id} layout={settle(reduced)}>
              {index > 0 ? <View style={styles.coachDivider} /> : null}
              <Pressable accessibilityLabel={`${athlete.name}, ${athlete.practiceDaysKnown ? `${practiceDayLabel(athlete)} of team practice records` : 'Practice days unavailable'}, ${detail}`} accessibilityRole="button" onPress={() => router.push({ pathname: '/athlete-vitals', params: { id: athlete.id, role } })} style={({ pressed }) => [styles.coachRow, pressed && styles.pressed]}>
                <View style={styles.coachAvatar}><Text style={styles.coachAvatarText}>{athlete.name.split(/\s+/).map((part) => Array.from(part)[0]).slice(0, 2).join('').toUpperCase()}</Text></View>
                <View style={styles.coachNameCopy}>
                  <Text style={styles.coachName}>{athlete.name}</Text>
                  <Text style={styles.coachBandDetail}>{detail}</Text>
                </View>
                <View style={[styles.coachDayPill, { borderColor: tone }]}><Text style={[styles.coachDayText, { color: tone }]}>{practiceDayLabel(athlete)}</Text></View>
                <View style={styles.coachBandMark}>
                  <Svg fill="none" height={20} stroke={athlete.live && !athlete.live.stale ? CoachPalette.text : CoachPalette.faint} strokeWidth={1.8} viewBox="0 0 24 24" width={20}><Path d="M8 3h8l1 4v10l-1 4H8l-1-4V7z" strokeLinejoin="round" /><Circle cx={12} cy={12} fill={athlete.live && !athlete.live.stale ? athlete.live.status === 'watch' ? Palette.warning : athlete.live.status === 'unknown' ? CoachPalette.muted : Palette.safe : CoachPalette.faint} r={2.4} stroke="none" /></Svg>
                </View>
              </Pressable>
            </Animated.View>;
          })}
        </View>
      ) : (
        <View style={styles.list}>
          <Rows>
            {shown.map((a) => (
              <ListRow
                key={a.id}
                label={a.name}
                detail={!a.live && vitalsStatus === 'loading' ? 'Loading band signal…' : !a.live && vitalsStatus === 'error' ? 'Band signal unavailable' : bandLabel(a)}
                onPress={() => router.push({ pathname: '/athlete-vitals', params: { id: a.id, role } })}
                value={practiceDayLabel(a)}
                valueTone={a.practiceDaysKnown && a.acclimatizationDay < 6 ? Palette.warning : undefined}
              />
            ))}
          </Rows>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  search: { alignItems: 'center', backgroundColor: Palette.surfaceMuted, borderRadius: 22, flexDirection: 'row', gap: 10, marginTop: 14, paddingHorizontal: 14 },
  searchInput: { color: Palette.ink, flex: 1, fontSize: 17, minHeight: 46 },
  rosterCount: { color: Palette.inkMuted, fontSize: 16, marginTop: 8 },
  filters: { marginTop: 14 },
  pending: { color: Palette.inkMuted, fontSize: 15, marginTop: 14 },
  empty: { color: Palette.inkMuted, fontSize: 17, lineHeight: 24, marginTop: 20 },
  emptyState: { gap: 16 },
  recordNote: { color: Palette.inkMuted, fontSize: 14, lineHeight: 20, marginTop: 14 },
  list: { marginTop: 18 },
  coachSearch: { backgroundColor: CoachPalette.surfaceAlt, borderRadius: 22, minHeight: 56, paddingHorizontal: 16 },
  coachSearchInput: { color: CoachPalette.text, fontWeight: '600' },
  coachChips: { flexDirection: 'row', gap: 8, marginTop: 14, paddingRight: 16 },
  coachChip: { alignItems: 'center', justifyContent: 'center', minHeight: 44, borderRadius: CoachRadius.pill, backgroundColor: CoachPalette.surface, borderColor: 'transparent', paddingHorizontal: 16, paddingVertical: 10 },
  coachChipOn: { backgroundColor: CoachPalette.text },
  coachChipText: { color: CoachPalette.textSecondary, fontSize: 15, fontWeight: '600' },
  coachChipTextOn: { color: CoachPalette.canvas },
  coachEmpty: { ...surfaceStyles.card, alignItems: 'flex-start', marginTop: 14, padding: 22 },
  coachEmptyText: { color: CoachPalette.muted, marginTop: 0 },
  coachShare: { backgroundColor: CoachPalette.peach, borderRadius: CoachRadius.pill, marginTop: 16, paddingHorizontal: 18, paddingVertical: 12 },
  coachShareText: { color: CoachPalette.peachInk, fontSize: 15, fontWeight: '800' },
  coachList: { ...surfaceStyles.card, borderRadius: CoachRadius.card },
  coachRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 12, minHeight: 72, paddingHorizontal: 18, paddingVertical: 14 },
  coachAvatar: { alignItems: 'center', justifyContent: 'center', backgroundColor: CoachPalette.interactive, borderRadius: 22, height: 44, width: 44 },
  coachName: { color: CoachPalette.text, fontSize: 20, lineHeight: 26, fontWeight: '700' },
  pressed: { opacity: 0.7 },
  coachDivider: { backgroundColor: CoachPalette.hairline, height: StyleSheet.hairlineWidth, marginLeft: 18 },
  coachNameCopy: { flex: 1, gap: 4, minWidth: 96 },
  coachBandDetail: { color: CoachPalette.muted, fontSize: 14, lineHeight: 20 },
  coachAvatarText: { color: CoachPalette.text, fontFamily: Face.label, fontSize: 18 },
  coachDayPill: { borderRadius: CoachRadius.pill, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  coachDayText: { fontSize: 14, fontWeight: '600' },
  coachBandMark: { alignItems: 'center', justifyContent: 'center', width: 26 },
});
