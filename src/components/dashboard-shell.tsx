import type { ComponentProps } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isKeyboardFocus } from '@/components/entry-ui';
import { FramedModalContent } from '@/components/mobile-viewport';
import { HeatIcon } from '@/components/heat-icon';
import { HeatSenseLogo } from '@/components/heatsense-logo';
import { Group, IconTile, Row, TextLink } from '@/components/ui/list';
import { Entry } from '@/constants/entry-theme';
import { MaxContentWidth, Palette, Spacing, Type } from '@/constants/theme';
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
const PILL_HEIGHT = 60;

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
  backdropColor = Palette.canvas,
  contentWidth = MaxContentWidth,
  name,
  onProfile,
  scrollY,
  showLogo,
  title,
}: {
  backdropColor?: string;
  /** Widest the header row gets, matching the content column under it. */
  contentWidth?: number;
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
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.headerBackdrop, { backgroundColor: backdropColor }, backdrop]} />
      <View pointerEvents="none" style={[styles.headerTitleWrap, { top: insets.top }]}>
        <Animated.Text accessibilityElementsHidden importantForAccessibility="no" numberOfLines={1} style={[styles.headerTitle, backdrop]}>{title}</Animated.Text>
      </View>
    <View style={[styles.header, { maxWidth: contentWidth }, !showLogo && styles.headerEnd]}>
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

      <Modal animationType="slide" onRequestClose={close} presentationStyle="pageSheet" transparent={Platform.OS === 'web'} visible={open}>
        <FramedModalContent backdrop>
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
        </FramedModalContent>
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

/**
 * Floating dock: one solid surface, no outline, no sliding pill. The selected tab is peach, and its
 * icon settles in over 180ms so the change registers without a second layer.
 */
export function TabBar({ activeTab, onChange, tabs }: { activeTab: string; onChange: (tab: string) => void; tabs: DashboardTab[] }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.pillWrap, { bottom: Math.max(insets.bottom - 6, Spacing.three) }]}>
      <View accessibilityRole="tablist" style={styles.pill}>
        {tabs.map((tab) => <TabButton active={tab.id === activeTab} key={tab.id} onPress={() => onChange(tab.id)} tab={tab} />)}
      </View>
    </View>
  );
}

function TabButton({ active, onPress, tab }: { active: boolean; onPress: () => void; tab: DashboardTab }) {
  const reducedMotion = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const settle = useSharedValue(1);
  const wasActive = useRef(active);
  useEffect(() => {
    if (active && !wasActive.current && !reducedMotion) {
      settle.set(0.88);
      settle.set(withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) }));
    }
    wasActive.current = active;
  }, [active, reducedMotion, settle]);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: settle.value }] }));
  return (
    <Pressable
      accessibilityLabel={tab.label}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onBlur={() => setFocused(false)}
      onFocus={(event) => setFocused(isKeyboardFocus(event))}
      onPress={onPress}
      style={({ hovered }: { hovered?: boolean }) => [styles.tab, styles.noOutline, hovered && !active && styles.tabHover, focused && styles.tabFocus]}>
      <Animated.View style={iconStyle}>
        <HeatIcon name={tab.icon} size={22} tintColor={active ? Entry.peach : Entry.muted} />
      </Animated.View>
      <Text maxFontSizeMultiplier={1.15} numberOfLines={1} style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.55 },
  headerWrap: { left: 0, position: 'absolute', right: 0, top: 0, zIndex: 10 },
  headerBackdrop: { borderBottomColor: Palette.border, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitleWrap: { alignItems: 'center', height: HEADER_ROW, justifyContent: 'center', left: 0, position: 'absolute', right: 0 },
  headerTitle: { color: Palette.ink, ...Type.headline },
  header: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', height: HEADER_ROW, justifyContent: 'space-between', paddingHorizontal: Spacing.four, width: '100%' },
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
  // A floating dock, as wide as the content column at most, so it doesn't stretch across a desktop window.
  pillWrap: { alignItems: 'center', left: Spacing.four, position: 'absolute', right: Spacing.four },
  pill: { backgroundColor: Entry.surface, borderCurve: 'continuous', borderRadius: PILL_HEIGHT / 2, elevation: 10, flexDirection: 'row', height: PILL_HEIGHT, maxWidth: 420, paddingHorizontal: 6, shadowColor: '#000', shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.45, shadowRadius: 18, width: '100%' },
  tab: { alignItems: 'center', flex: 1, gap: 3, justifyContent: 'center' },
  tabHover: { opacity: 0.8 },
  tabFocus: { borderColor: Entry.blue, borderRadius: 22, borderWidth: 2 },
  noOutline: Platform.select({ web: { outlineStyle: 'none' } as unknown as ViewStyle, default: {} }),
  tabLabel: { color: Entry.muted, fontFamily: Entry.medium, fontSize: 11, letterSpacing: 0.3, lineHeight: 13 },
  tabLabelActive: { color: Entry.peach },
});
