import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DashboardContent } from '@/components/dashboard-content';
import { DashboardState, type DashboardReviewState } from '@/components/dashboard-states';
import {
  DashboardHeader,
  HEADER_ROW,
  TAB_BAR_HEIGHT,
  TabBar,
  type DashboardRole,
  type DashboardTab,
} from '@/components/dashboard-shell';
import { MaxContentWidth, Palette, Spacing } from '@/constants/theme';
import { endPracticeActivity, startPracticeActivity } from '@/lib/practice-activity';
import { markRefreshed, usePreferences } from '@/state/preferences';

const icons = {
  alert: { ios: 'bell.badge.fill', android: 'notifications_active', web: 'notifications_active' },
  book: { ios: 'book.closed.fill', android: 'menu_book', web: 'menu_book' },
  clipboard: { ios: 'list.clipboard.fill', android: 'assignment', web: 'assignment' },
  heart: { ios: 'heart.text.square.fill', android: 'monitor_heart', web: 'monitor_heart' },
  home: { ios: 'house.fill', android: 'home', web: 'home' },
  people: { ios: 'person.3.fill', android: 'groups', web: 'groups' },
  person: { ios: 'person.crop.circle.fill', android: 'account_circle', web: 'account_circle' },
  run: { ios: 'figure.run', android: 'directions_run', web: 'directions_run' },
  waveform: { ios: 'waveform.path.ecg', android: 'monitor_heart', web: 'monitor_heart' },
} as const;

const roleTabs: Record<DashboardRole, DashboardTab[]> = {
  coach: [
    { id: 'plan', icon: icons.clipboard, label: 'Plan' },
    { id: 'team', icon: icons.people, label: 'Team' },
    { id: 'home', icon: icons.home, label: 'Home' },
    { id: 'alerts', icon: icons.alert, label: 'Alerts' },
    { id: 'profile', icon: icons.person, label: 'Profile' },
  ],
  trainer: [
    { id: 'monitor', icon: icons.waveform, label: 'Monitor' },
    { id: 'athletes', icon: icons.people, label: 'Athletes' },
    { id: 'home', icon: icons.home, label: 'Home' },
    { id: 'protocols', icon: icons.clipboard, label: 'Protocols' },
    { id: 'profile', icon: icons.person, label: 'Profile' },
  ],
  athlete: [
    { id: 'status', icon: icons.heart, label: 'Status' },
    { id: 'sessions', icon: icons.run, label: 'Sessions' },
    { id: 'home', icon: icons.home, label: 'Home' },
    { id: 'learn', icon: icons.book, label: 'Learn' },
    { id: 'profile', icon: icons.person, label: 'Profile' },
  ],
};

const roleIdentity = {
  coach: { eyebrow: 'Coach workspace', name: 'Coach Rivera' },
  trainer: { eyebrow: 'Athletic trainer workspace', name: 'Alex Thompson' },
  athlete: { eyebrow: 'Athlete workspace', name: 'Maya Chen' },
} as const;

function normalizeRole(value?: string): DashboardRole {
  const normalized = value?.toLowerCase();
  if (normalized === 'athlete') return 'athlete';
  if (normalized === 'trainer' || normalized === 'athletic trainer') return 'trainer';
  return 'coach';
}

export default function DashboardScreen() {
  const params = useLocalSearchParams<{ role?: string; state?: string; tab?: string }>();
  const insets = useSafeAreaInsets();
  const { celsius, practiceLiveActivity } = usePreferences();

  // The Dynamic Island / Lock Screen practice activity follows the Profile switch and the unit choice.
  useEffect(() => {
    if (practiceLiveActivity) startPracticeActivity({ celsius });
    else endPracticeActivity();
  }, [celsius, practiceLiveActivity]);

  const role = normalizeRole(params.role);
  const tabs = roleTabs[role];
  const requestedTab = tabs.some((item) => item.id === params.tab) ? params.tab! : 'home';
  const [manualSelection, setManualSelection] = useState({ role, sourceTab: requestedTab, value: requestedTab });
  const activeTab = manualSelection.role === role && manualSelection.sourceTab === requestedTab
    ? manualSelection.value
    : requestedTab;

  const identity = roleIdentity[role];
  const reviewState = ['weather-stale', 'empty-team', 'pairing', 'no-band', 'alert-acknowledged'].includes(params.state ?? '')
    ? params.state as DashboardReviewState
    : null;
  const contentKey = useMemo(() => `${role}-${activeTab}-${reviewState ?? 'default'}`, [activeTab, reviewState, role]);
  const select = (value: string) => setManualSelection({ role, sourceTab: requestedTab, value });

  // The small title in the header matches the large one that scrolls away beneath it.
  const reviewTitles: Record<DashboardReviewState, string> = {
    'alert-acknowledged': 'Alert',
    'empty-team': 'Team',
    'no-band': 'Today',
    pairing: 'Pair your band',
    'weather-stale': 'Today',
  };
  const title = reviewState ? reviewTitles[reviewState] : activeTab === 'home' ? 'Today' : tabs.find((item) => item.id === activeTab)?.label ?? 'Today';

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  // A new screen starts at the top, so the header goes back to its resting style.
  useEffect(() => {
    scrollY.value = 0;
  }, [contentKey, scrollY]);

  const [refreshing, setRefreshing] = useState(false);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (refreshTimer.current) clearTimeout(refreshTimer.current); }, []);
  const refresh = () => {
    setRefreshing(true);
    refreshTimer.current = setTimeout(() => {
      markRefreshed();
      setRefreshing(false);
    }, 900);
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Animated.ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + Spacing.six, paddingTop: insets.top + HEADER_ROW },
        ]}
        key={contentKey}
        onScroll={onScroll}
        refreshControl={<RefreshControl onRefresh={refresh} progressViewOffset={insets.top + HEADER_ROW} refreshing={refreshing} tintColor={Palette.inkMuted} />}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}>
        <View style={styles.column}>
          {reviewState ? <DashboardState state={reviewState} /> : <DashboardContent onNavigate={select} role={role} tab={activeTab} />}
        </View>
      </Animated.ScrollView>
      <DashboardHeader name={identity.name} onProfile={() => select('profile')} scrollY={scrollY} showLogo={activeTab === 'home' && !reviewState} title={title} />
      <TabBar activeTab={activeTab} onChange={select} tabs={tabs} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: Palette.canvas, flex: 1 },
  scrollContent: { alignItems: 'center' },
  column: { maxWidth: MaxContentWidth, paddingHorizontal: Spacing.four, width: '100%' },
});
