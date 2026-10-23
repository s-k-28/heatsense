import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { ListRow, Rows, SampleTag } from '@/components/whoop-ui';
import { Segmented } from '@/components/motion/segmented';
import { ActionButton } from '@/components/ui/action-button';
import { Palette } from '@/constants/theme';
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

export function TrainerAthletes({ role = 'trainer', embedded = false }: { role?: 'trainer' | 'coach'; embedded?: boolean }) {
  const { athletes, pending, sample, loading, status, vitalsStatus, historyStatus, retry } = useAthletes(role);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const filters = (Object.keys(FILTERS) as Filter[]).filter((key) => {
    const count = athletes.filter((a) => FILTERS[key].match(a)).length;
    return key === 'all' || key === filter || (count > 0 && count < athletes.length);
  });
  const showSearch = athletes.length >= 8 || Boolean(query);
  const shown = athletes
    .filter((a) => FILTERS[filter].match(a))
    .filter((a) => a.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((x, y) => Number(y.practiceDaysKnown) - Number(x.practiceDaysKnown) || (x.practiceDaysKnown && y.practiceDaysKnown ? x.acclimatizationDay - y.acclimatizationDay : 0) || x.name.localeCompare(y.name));

  return (
    <>
      {sample && !embedded ? <SampleTag /> : null}
      {athletes.length ? <Text style={styles.rosterCount}>{athletes.length} {athletes.length === 1 ? 'athlete' : 'athletes'}</Text> : null}
      {showSearch ? <View style={styles.search}>
        <Svg fill="none" height={18} stroke={Palette.inkMuted} strokeLinecap="round" strokeWidth={2} viewBox="0 0 24 24" width={18}><Circle cx={11} cy={11} r={7} /><Path d="m20 20-3.5-3.5" /></Svg>
        <TextInput
          accessibilityLabel="Search athletes"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          onChangeText={setQuery}
          placeholder="Search athletes"
          placeholderTextColor={Palette.inkFaint}
          returnKeyType="search"
          style={styles.searchInput}
          value={query}
        />
      </View> : null}

      {athletes.length > 0 && filters.length > 1 ? <View style={styles.filters}>
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
        <View style={styles.emptyState}><Text accessibilityLiveRegion="polite" style={styles.empty}>Couldn’t load the roster. Your team connection may be unavailable.</Text><ActionButton label="Try again" onPress={retry} variant="secondary" /></View>
      ) : loading ? (
        <Text style={styles.empty}>Loading the roster…</Text>
      ) : shown.length === 0 ? (
        <View style={styles.emptyState}>
          <Text accessibilityLiveRegion="polite" style={styles.empty}>{athletes.length ? filter === 'acclimatizing' && historyStatus === 'loading' ? 'Loading practice-day history…' : 'No athletes in this view.' : status === 'idle' ? 'No team connected.' : role === 'coach' ? 'Share your team code to invite athletes.' : 'Athletes appear here after coach approval.'}</Text>
          {athletes.length ? <ActionButton label="Show all athletes" onPress={() => { setQuery(''); setFilter('all'); }} variant="secondary" /> : null}
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
  search: { alignItems: 'center', backgroundColor: Palette.surface, borderRadius: 12, flexDirection: 'row', gap: 10, marginTop: 14, paddingHorizontal: 14 },
  searchInput: { color: Palette.ink, flex: 1, fontSize: 17, minHeight: 46 },
  rosterCount: { color: Palette.inkMuted, fontSize: 16, marginTop: 8 },
  filters: { marginTop: 14 },
  pending: { color: Palette.inkMuted, fontSize: 15, marginTop: 14 },
  empty: { color: Palette.inkMuted, fontSize: 17, lineHeight: 24, marginTop: 20 },
  emptyState: { gap: 16 },
  recordNote: { color: Palette.inkMuted, fontSize: 14, lineHeight: 20, marginTop: 14 },
  list: { marginTop: 18 },
});
