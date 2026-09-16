import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardContent } from '@/components/dashboard-content';
import { DashboardState, type DashboardReviewState } from '@/components/dashboard-states';
import {
  BottomDock,
  DashboardHeader,
  type DashboardRole,
  type DashboardTab,
} from '@/components/dashboard-shell';
import { MaxContentWidth, Motion, Palette, Spacing } from '@/constants/theme';

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
    { id: 'home', icon: icons.home, label: 'Home' },
    { id: 'plan', icon: icons.clipboard, label: 'Plan' },
    { id: 'team', icon: icons.people, label: 'Team' },
    { id: 'alerts', icon: icons.alert, label: 'Alerts' },
    { id: 'profile', icon: icons.person, label: 'Profile' },
  ],
  trainer: [
    { id: 'home', icon: icons.home, label: 'Home' },
    { id: 'monitor', icon: icons.waveform, label: 'Monitor' },
    { id: 'athletes', icon: icons.people, label: 'Athletes' },
    { id: 'protocols', icon: icons.clipboard, label: 'Protocols' },
    { id: 'profile', icon: icons.person, label: 'Profile' },
  ],
  athlete: [
    { id: 'home', icon: icons.home, label: 'Home' },
    { id: 'status', icon: icons.heart, label: 'My Status' },
    { id: 'sessions', icon: icons.run, label: 'Sessions' },
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
  const role = normalizeRole(params.role);
  const tabs = roleTabs[role];
  const requestedTab = tabs.some((item) => item.id === params.tab) ? params.tab! : 'home';
  const [manualSelection, setManualSelection] = useState({ role, sourceTab: requestedTab, value: requestedTab });
  const reducedMotion = useReducedMotion();
  const activeTab = manualSelection.role === role && manualSelection.sourceTab === requestedTab
    ? manualSelection.value
    : requestedTab;

  const identity = roleIdentity[role];
  const reviewState = ['weather-stale', 'empty-team', 'pairing', 'no-band', 'alert-acknowledged'].includes(params.state ?? '')
    ? params.state as DashboardReviewState
    : null;
  const contentKey = useMemo(() => `${role}-${activeTab}-${reviewState ?? 'default'}`, [activeTab, reviewState, role]);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.shell}>
          <DashboardHeader
            eyebrow={identity.eyebrow}
            name={identity.name}
            onNotifications={() =>
              setManualSelection({
                role,
                sourceTab: requestedTab,
                value: role === 'athlete' ? 'status' : role === 'coach' ? 'alerts' : 'monitor',
              })
            }
          />
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            key={contentKey}
            showsVerticalScrollIndicator={false}>
            <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(Motion.quick)} key={contentKey}>
              {reviewState ? <DashboardState state={reviewState} /> : <DashboardContent role={role} tab={activeTab} />}
            </Animated.View>
          </ScrollView>
          <BottomDock
            activeTab={activeTab}
            onChange={(value) => setManualSelection({ role, sourceTab: requestedTab, value })}
            tabs={tabs}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: Palette.canvas, flex: 1 },
  safeArea: { flex: 1 },
  shell: { alignSelf: 'center', flex: 1, maxWidth: MaxContentWidth, paddingHorizontal: Spacing.five, width: '100%' },
  scrollContent: { paddingBottom: 112, paddingTop: Spacing.two },
});
