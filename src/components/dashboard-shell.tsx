import type { ComponentProps } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassSurface } from '@/components/glass-surface';
import { HeatIcon } from '@/components/heat-icon';
import { HeatSenseLogo } from '@/components/heatsense-logo';
import { Group, IconTile, Row, TextLink } from '@/components/ui/list';
import { Palette, Spacing, Type } from '@/constants/theme';
import { markNotificationsRead, usePreferences } from '@/state/preferences';

export type DashboardRole = 'coach' | 'trainer' | 'athlete';

export type DashboardTab = {
  id: string;
  icon: ComponentProps<typeof HeatIcon>['name'];
  label: string;
};

// Space the floating tab bar occupies above the bottom safe area.
export const TAB_BAR_HEIGHT = 80;
/** Height of the fixed top row, below the status bar. */
export const HEADER_ROW = 52;
const PILL_HEIGHT = 64;
const PILL_PADDING = 6;

const bell = { ios: 'bell.fill', android: 'notifications', web: 'notifications' } as const;
const sun = { ios: 'cloud.sun.fill', android: 'partly_cloudy_day', web: 'partly_cloudy_day' } as const;
const gauge = { ios: 'gauge.with.needle.fill', android: 'speed', web: 'speed' } as const;
const shield = { ios: 'exclamationmark.shield.fill', android: 'health_and_safety', web: 'health_and_safety' } as const;

const NOTIFICATIONS = [
  { icon: sun, title: 'WBGT rose to the Orange zone', detail: 'Practice plan updated', time: '2 min ago' },
  { icon: gauge, title: 'Field sensor reading refreshed', detail: 'Memorial Stadium', time: '9 min ago' },
  { icon: shield, title: 'Reduce equipment use during breaks', detail: 'Part of today’s Orange-zone plan', time: 'Today' },
] as const;

function initialsOf(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join('');
}

/**
 * Fixed top row: brand mark on the left, notifications and the account button on the right.
 * Once the large title scrolls away, the bar picks up a backdrop and a small centered title.
 */
export function DashboardHeader({
  name,
  onProfile,
  scrollY,
  showLogo,
  title,
}: {
  name: string;
  onProfile: () => void;
  scrollY: SharedValue<number>;
  showLogo: boolean;
  title: string;
}) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const backdrop = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.value, [36, 52], [0, 1], 'clamp') }));
  const { unreadNotifications } = usePreferences();
  const close = () => {
    setOpen(false);
    markNotificationsRead();
  };

  return (
    <View pointerEvents="box-none" style={[styles.headerWrap, { paddingTop: insets.top }]}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.headerBackdrop, backdrop]} />
      <View pointerEvents="none" style={[styles.headerTitleWrap, { top: insets.top }]}>
        <Animated.Text accessibilityElementsHidden importantForAccessibility="no" numberOfLines={1} style={[styles.headerTitle, backdrop]}>{title}</Animated.Text>
      </View>
    <View style={[styles.header, !showLogo && styles.headerEnd]}>
      {showLogo ? <HeatSenseLogo height={28} /> : null}
      <View style={styles.headerActions}>
        <Pressable accessibilityLabel={unreadNotifications > 0 ? `Notifications, ${unreadNotifications} new` : 'Notifications'} accessibilityRole="button" hitSlop={4} onPress={() => setOpen(true)} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <HeatIcon name={bell} size={20} tintColor={Palette.ink} />
          {unreadNotifications > 0 ? <View style={styles.badge} /> : null}
        </Pressable>
        <Pressable accessibilityLabel={`${name}, account`} accessibilityRole="button" onPress={onProfile} style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}>
          <Text style={styles.avatarText}>{initialsOf(name)}</Text>
        </Pressable>
      </View>

      <Modal animationType="slide" onRequestClose={close} presentationStyle="pageSheet" visible={open}>
        <View style={styles.sheet}>
          <View style={styles.sheetBar}>
            <Text style={styles.sheetTitle}>Notifications</Text>
            <TextLink label="Done" onPress={close} />
          </View>
          <ScrollView contentContainerStyle={styles.sheetContent}>
            <Group inset={59}>
              {NOTIFICATIONS.map((item) => (
                <Row
                  detail={`${item.detail} · ${item.time}`}
                  key={item.title}
                  leading={<IconTile icon={item.icon} />}
                  title={item.title}
                />
              ))}
            </Group>
          </ScrollView>
        </View>
      </Modal>
    </View>
    </View>
  );
}

export function LargeTitle({ title }: { title: string }) {
  return <Text accessibilityRole="header" style={styles.largeTitle}>{title}</Text>;
}

export function SectionHeader({ action, onActionPress, title }: { action?: string; onActionPress?: () => void; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
      {action ? <TextLink label={action} onPress={onActionPress} /> : null}
    </View>
  );
}

/** Floating pill with a smaller pill inside it that slides to the selected tab. */
export function TabBar({ activeTab, onChange, tabs }: { activeTab: string; onChange: (tab: string) => void; tabs: DashboardTab[] }) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, tabs.findIndex((tab) => tab.id === activeTab));
  const tabWidth = Math.max(0, (width - PILL_PADDING * 2) / tabs.length);
  const x = useSharedValue(0);
  const placed = useRef(false);

  useEffect(() => {
    if (tabWidth === 0) return;
    const target = index * tabWidth;
    // First layout: jump straight to the selected tab. After that, glide.
    if (!placed.current || reducedMotion) {
      x.value = target;
      placed.current = true;
      return;
    }
    x.value = withTiming(target, { duration: 280, easing: Easing.out(Easing.cubic) });
  }, [index, reducedMotion, tabWidth, x]);

  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }], width: tabWidth }));

  return (
    <View style={[styles.pillWrap, { bottom: Math.max(insets.bottom - 6, Spacing.three) }]}>
      <GlassSurface radius={PILL_HEIGHT / 2} style={styles.pill}>
        <View onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)} style={styles.pillInner}>
          {tabWidth > 0 ? <Animated.View pointerEvents="none" style={[styles.indicator, indicator]} /> : null}
          {tabs.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <Pressable
                accessibilityLabel={tab.label}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                key={tab.id}
                onPress={() => onChange(tab.id)}
                style={styles.tab}>
                <HeatIcon name={tab.icon} size={22} tintColor={active ? Palette.coral : Palette.inkMuted} />
                <Text maxFontSizeMultiplier={1.15} numberOfLines={1} style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.55 },
  headerWrap: { left: 0, position: 'absolute', right: 0, top: 0, zIndex: 10 },
  headerBackdrop: { backgroundColor: 'rgba(0,0,0,0.98)', borderBottomColor: Palette.border, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitleWrap: { alignItems: 'center', height: HEADER_ROW, justifyContent: 'center', left: 0, position: 'absolute', right: 0 },
  headerTitle: { color: Palette.ink, ...Type.headline },
  header: { alignItems: 'center', flexDirection: 'row', height: HEADER_ROW, justifyContent: 'space-between', paddingHorizontal: Spacing.four },
  headerEnd: { justifyContent: 'flex-end' },
  headerActions: { alignItems: 'center', flexDirection: 'row', gap: Spacing.two },
  iconButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  badge: { backgroundColor: Palette.emergency, borderColor: Palette.canvas, borderRadius: 5, borderWidth: 1.5, height: 10, position: 'absolute', right: 10, top: 9, width: 10 },
  avatar: { alignItems: 'center', backgroundColor: Palette.fill, borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  avatarText: { color: Palette.ink, ...Type.footnote, fontWeight: '600' },
  sheet: { backgroundColor: Palette.canvas, flex: 1 },
  sheetBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingBottom: Spacing.three, paddingHorizontal: Spacing.five, paddingTop: Spacing.five },
  sheetTitle: { color: Palette.ink, ...Type.title2 },
  sheetContent: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two },
  largeTitle: { color: Palette.ink, ...Type.largeTitle, marginTop: Spacing.one },
  sectionHeader: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.two, marginTop: Spacing.seven },
  sectionTitle: { color: Palette.ink, ...Type.title3 },
  pillWrap: { elevation: 10, left: Spacing.four, position: 'absolute', right: Spacing.four, shadowColor: '#000', shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.45, shadowRadius: 18 },
  // The translucent fill keeps labels readable over scrolled content wherever glass blur isn't available.
  pill: { backgroundColor: 'rgba(28,28,30,0.78)', borderCurve: 'continuous', height: PILL_HEIGHT },
  pillInner: { flex: 1, flexDirection: 'row', padding: PILL_PADDING },
  indicator: { backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: (PILL_HEIGHT - PILL_PADDING * 2) / 2, bottom: PILL_PADDING, left: PILL_PADDING, position: 'absolute', top: PILL_PADDING },
  tab: { alignItems: 'center', flex: 1, gap: 3, justifyContent: 'center' },
  tabLabel: { color: Palette.inkMuted, ...Type.tab },
  tabLabelActive: { color: Palette.coral },
});
