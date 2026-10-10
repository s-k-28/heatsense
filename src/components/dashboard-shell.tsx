import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps, ReactNode } from 'react';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import { HeatIcon } from '@/components/heat-icon';
import { Fonts, Palette, Radius, Spacing } from '@/constants/theme';

export type DashboardRole = 'coach' | 'trainer' | 'athlete';

export type DashboardTab = {
  id: string;
  icon: ComponentProps<typeof HeatIcon>['name'];
  label: string;
};

const icons = {
  bell: { ios: 'bell.fill', android: 'notifications', web: 'notifications' },
  heat: { ios: 'thermometer.sun.fill', android: 'device_thermostat', web: 'device_thermostat' },
  cloud: { ios: 'cloud.sun.fill', android: 'partly_cloudy_day', web: 'partly_cloudy_day' },
  gauge: { ios: 'gauge.with.needle.fill', android: 'speed', web: 'speed' },
  shield: { ios: 'exclamationmark.shield.fill', android: 'health_and_safety', web: 'health_and_safety' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
} as const;

/** Short-form, glanceable items -- distinct from the full Alerts tab's
 * history: weather/instrument changes and precautionary notes someone
 * should be able to skim in a couple of seconds without leaving the
 * screen they're on. */
const QUICK_NOTIFICATIONS = [
  { icon: icons.cloud, tone: Palette.warning, title: 'WBGT rose to Orange zone', time: '2 min ago' },
  { icon: icons.gauge, tone: '#547A8C', title: 'Field sensor reading refreshed', time: '9 min ago' },
  { icon: icons.shield, tone: Palette.coralDark, title: 'Reduce equipment use during breaks', time: 'Today' },
] as const;

export function DashboardHeader({
  eyebrow,
  name,
}: {
  eyebrow: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const reducedMotion = useReducedMotion();

  return (
    <View style={styles.header}>
      <View style={styles.identity}>
        <View style={styles.brandMark}>
          <HeatIcon name={icons.heat} size={19} tintColor={Palette.surface} />
        </View>
        <View>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.name}>{name}</Text>
        </View>
      </View>
      <Pressable
        accessibilityLabel="Quick notifications"
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.notificationButton, pressed && styles.pressed]}>
        <HeatIcon name={icons.bell} size={20} tintColor={Palette.ink} />
        <View style={styles.notificationDot} />
      </Pressable>

      <Modal animationType="none" onRequestClose={() => setOpen(false)} transparent visible={open}>
        <Pressable onPress={() => setOpen(false)} style={styles.popoverScrim}>
          <Animated.View
            entering={reducedMotion ? undefined : ZoomIn.duration(200)}
            style={styles.popoverCard}>
            <View style={styles.popoverTopline}>
              <Text style={styles.popoverTitle}>Quick notifications</Text>
              <Pressable accessibilityLabel="Close" hitSlop={10} onPress={() => setOpen(false)}>
                <HeatIcon name={icons.close} size={17} tintColor={Palette.inkMuted} />
              </Pressable>
            </View>
            {QUICK_NOTIFICATIONS.map((item, i) => (
              <Animated.View
                entering={reducedMotion ? undefined : ZoomIn.delay(60 + i * 50).duration(180)}
                key={item.title}
                style={styles.popoverRow}>
                <View style={[styles.popoverIcon, { backgroundColor: `${item.tone}18` }]}>
                  <HeatIcon name={item.icon} size={16} tintColor={item.tone} />
                </View>
                <View style={styles.flexOne}>
                  <Text style={styles.popoverRowTitle}>{item.title}</Text>
                  <Text style={styles.popoverRowTime}>{item.time}</Text>
                </View>
              </Animated.View>
            ))}
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

export function ScreenIntro({
  action,
  eyebrow,
  title,
}: {
  action?: ReactNode;
  eyebrow?: string;
  title: string;
}) {
  return (
    <View style={styles.screenIntro}>
      <View style={styles.screenIntroCopy}>
        {eyebrow ? <Text style={styles.screenEyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.screenTitle}>{title}</Text>
      </View>
      {action}
    </View>
  );
}

export function SectionHeader({ action, title }: { action?: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

const icons2 = {
  moon: { ios: 'moon.fill', android: 'dark_mode', web: 'dark_mode' },
  haptic: { ios: 'iphone.radiowaves.left.and.right', android: 'vibration', web: 'vibration' },
  compact: { ios: 'rectangle.compress.vertical', android: 'density_small', web: 'density_small' },
  refresh: { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
} as const;

const SETTINGS_PANEL_HEIGHT = 306;

/** Quick, freely-toggleable preferences, revealed by growing the dock pill
 * itself upward (not a separate popup/sheet) -- lives inside the same
 * rounded surface as the tabs, above them. Note: these toggle local UI
 * state only for now; none of them are wired to real app behavior yet
 * (there's no light/dark switch infrastructure, no haptics library
 * installed, etc.) -- this is the interaction and panel, ready for real
 * logic to be plugged in later. */
function QuickSettingsPanel({ onClose }: { onClose: () => void }) {
  const [darkMode, setDarkMode] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [compact, setCompact] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  return (
    <View style={styles.settingsPanel}>
      <Pressable hitSlop={8} onPress={onClose} style={styles.settingsHandleRow}>
        <View style={styles.settingsHandle} />
      </Pressable>
      <View style={styles.settingsTopline}>
        <Text style={styles.settingsTitle}>Quick settings</Text>
        <Pressable accessibilityLabel="Close" hitSlop={10} onPress={onClose}>
          <HeatIcon name={icons2.close} size={16} tintColor={Palette.inkMuted} />
        </Pressable>
      </View>

      <SettingsToggleRow icon={icons2.moon} label="Dark mode" onValueChange={setDarkMode} value={darkMode} />
      <SettingsToggleRow icon={icons2.haptic} label="Haptic feedback" onValueChange={setHaptics} value={haptics} />
      <SettingsToggleRow icon={icons2.compact} label="Compact roster cards" onValueChange={setCompact} value={compact} />
      <SettingsToggleRow icon={icons2.refresh} label="Auto-refresh readings" onValueChange={setAutoRefresh} value={autoRefresh} />
    </View>
  );
}

function SettingsToggleRow({
  icon,
  label,
  onValueChange,
  value,
}: {
  icon: ComponentProps<typeof HeatIcon>['name'];
  label: string;
  onValueChange: (value: boolean) => void;
  value: boolean;
}) {
  return (
    <View style={styles.settingsRow}>
      <View style={styles.settingsRowIcon}>
        <HeatIcon name={icon} size={17} tintColor={Palette.coralDark} />
      </View>
      <Text style={styles.settingsRowLabel}>{label}</Text>
      <Switch
        onValueChange={onValueChange}
        thumbColor={Palette.surface}
        trackColor={{ false: Palette.border, true: Palette.coral }}
        value={value}
      />
    </View>
  );
}

export function BottomDock({
  activeTab,
  onChange,
  tabs,
}: {
  activeTab: string;
  onChange: (tab: string) => void;
  tabs: DashboardTab[];
}) {
  const reducedMotion = useReducedMotion();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const panelHeight = useSharedValue(0);

  const setOpen = (open: boolean) => {
    setSettingsOpen(open);
    // A plain eased timing (not a spring) -- a spring here was underdamped
    // enough to visibly overshoot and settle in 2-3 bounces on a height
    // animation, which read as the panel glitching rather than opening.
    panelHeight.value = withTiming(open ? SETTINGS_PANEL_HEIGHT : 0, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  };

  const handleTabPress = (tabId: string) => {
    if (settingsOpen) setOpen(false);
    onChange(tabId);
  };

  const panelStyle = useAnimatedStyle(() => ({
    height: panelHeight.value,
    opacity: panelHeight.value / SETTINGS_PANEL_HEIGHT,
  }));

  return (
    <View style={styles.dockShadow}>
      {/* The whole pill grows upward: this Pressable only claims long-press
          (not onPress), so it doesn't steal taps from the tab buttons or
          switches nested inside it -- an unclaimed long-press is the only
          gesture that bubbles up to it. Dock has no explicit height of its
          own, so as the settings panel's animated height grows from 0,
          the pill's top edge is pushed upward while its bottom stays
          pinned by dockShadow's `bottom` -- "everything moves up with it". */}
      <Pressable
        accessibilityHint="Hold to open quick settings"
        delayLongPress={420}
        onLongPress={() => setOpen(!settingsOpen)}
        style={styles.dock}>
        <Animated.View style={[styles.settingsPanelClip, panelStyle]}>
          <QuickSettingsPanel onClose={() => setOpen(false)} />
        </Animated.View>
        <View style={styles.dockRow}>
        {tabs.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <Pressable
              accessibilityLabel={tab.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              key={tab.id}
              onPress={() => handleTabPress(tab.id)}
              style={({ pressed }) => [styles.dockItem, pressed && styles.pressed]}>
              {active ? (
                <Animated.View
                  entering={reducedMotion ? undefined : FadeIn.duration(180)}
                  style={styles.activeTabPill}>
                  <LinearGradient
                    colors={['#FCE9E3', '#F6C7B8']}
                    end={{ x: 1, y: 1 }}
                    start={{ x: 0, y: 0 }}
                    style={styles.activeTabGradient}>
                    <HeatIcon name={tab.icon} size={19} tintColor={Palette.coralDark} />
                    <Text numberOfLines={1} style={[styles.dockLabel, styles.dockLabelActive]}>
                      {tab.label}
                    </Text>
                  </LinearGradient>
                </Animated.View>
              ) : (
                <View style={styles.inactiveTab}>
                  <View style={styles.inactiveIcon}>
                    <HeatIcon name={tab.icon} size={19} tintColor={Palette.inkMuted} />
                  </View>
                  <Text numberOfLines={1} style={styles.dockLabel}>
                    {tab.label}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 58,
  },
  identity: { alignItems: 'center', flexDirection: 'row', gap: Spacing.three },
  brandMark: {
    alignItems: 'center',
    backgroundColor: Palette.coral,
    borderRadius: 14,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  eyebrow: {
    color: Palette.inkMuted,
    fontFamily: Fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
  },
  name: {
    color: Palette.ink,
    fontFamily: Fonts.bold,
    fontSize: 17,
    lineHeight: 21,
  },
  notificationButton: {
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderRadius: 23,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    position: 'relative',
    width: 46,
  },
  notificationDot: {
    backgroundColor: Palette.coralDark,
    borderColor: Palette.surface,
    borderRadius: 5,
    borderWidth: 2,
    height: 9,
    position: 'absolute',
    right: 10,
    top: 9,
    width: 9,
  },
  flexOne: { flex: 1 },
  // paddingTop lands the card's top-right corner right where the bell
  // sits (below the safe-area inset + the bell button's own height),
  // instead of floating well below it -- the popover reads as coming
  // from the bell, not as a separate lower sheet.
  popoverScrim: { flex: 1, backgroundColor: 'rgba(27,28,25,0.32)', paddingHorizontal: Spacing.five, paddingTop: 64 },
  popoverCard: {
    alignSelf: 'flex-end',
    backgroundColor: Palette.surface,
    borderRadius: Radius.large,
    borderTopRightRadius: Radius.small,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: Spacing.four,
    width: 300,
    gap: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
  },
  popoverTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  popoverTitle: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 14 },
  popoverRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  popoverIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  popoverRowTitle: { color: Palette.ink, fontFamily: Fonts.semibold, fontSize: 12.5, lineHeight: 17 },
  popoverRowTime: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 10.5, marginTop: 1 },
  screenIntro: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.four,
  },
  screenIntroCopy: { flex: 1, paddingRight: Spacing.four },
  screenEyebrow: {
    color: Palette.coralDark,
    fontFamily: Fonts.bold,
    fontSize: 12,
    lineHeight: 16,
  },
  screenTitle: {
    color: Palette.ink,
    fontFamily: Fonts.extrabold,
    fontSize: 29,
    letterSpacing: -1,
    lineHeight: 34,
    marginTop: 3,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
    marginTop: Spacing.six,
  },
  sectionTitle: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 17 },
  sectionAction: { color: Palette.coralDark, fontFamily: Fonts.semibold, fontSize: 12 },
  dockShadow: {
    bottom: 8,
    left: Spacing.five,
    position: 'absolute',
    right: Spacing.five,
    shadowColor: '#2B271F',
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.13,
    shadowRadius: 20,
  },
  dock: {
    backgroundColor: Palette.surface,
    borderColor: 'rgba(221,216,204,0.82)',
    borderRadius: 30,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dockRow: {
    flexDirection: 'row',
    minHeight: 72,
    paddingHorizontal: 6,
    paddingVertical: 7,
  },
  // Clips the panel as its animated height grows from 0 -- the rounded
  // pill's own borderRadius on `dock` already rounds the top corners once
  // there's height to show them on.
  settingsPanelClip: { overflow: 'hidden', width: '100%' },
  settingsPanel: {
    gap: Spacing.two,
    height: SETTINGS_PANEL_HEIGHT,
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.two,
  },
  settingsHandleRow: { alignItems: 'center', paddingVertical: Spacing.two },
  settingsHandle: { backgroundColor: Palette.border, borderRadius: 3, height: 4, width: 40 },
  settingsTopline: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.two },
  settingsTitle: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 15 },
  settingsRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.three, minHeight: 52 },
  settingsRowIcon: {
    alignItems: 'center',
    backgroundColor: Palette.coralSoft,
    borderRadius: 17,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  settingsRowLabel: { color: Palette.ink, flex: 1, fontFamily: Fonts.medium, fontSize: 13.5 },
  dockItem: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 56,
    minWidth: 48,
    paddingHorizontal: 2,
  },
  activeTabPill: {
    borderRadius: 22,
    overflow: 'hidden',
    width: '100%',
  },
  activeTabGradient: { alignItems: 'center', borderRadius: 22, justifyContent: 'center', minHeight: 52 },
  inactiveTab: { alignItems: 'center', justifyContent: 'center', minHeight: 52, width: '100%' },
  inactiveIcon: { alignItems: 'center', height: 31, justifyContent: 'center', width: 42 },
  dockLabel: {
    color: Palette.inkMuted,
    fontFamily: Fonts.semibold,
    fontSize: 11,
    lineHeight: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  dockLabelActive: { color: Palette.coralDark, fontFamily: Fonts.bold, marginTop: 1 },
  pressed: { opacity: 0.66 },
});
