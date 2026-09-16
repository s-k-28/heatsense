import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import { HeatIcon } from '@/components/heat-icon';
import { Fonts, Palette, Spacing } from '@/constants/theme';

export type DashboardRole = 'coach' | 'trainer' | 'athlete';

export type DashboardTab = {
  id: string;
  icon: ComponentProps<typeof HeatIcon>['name'];
  label: string;
};

const icons = {
  bell: { ios: 'bell.fill', android: 'notifications', web: 'notifications' },
  heat: { ios: 'thermometer.sun.fill', android: 'device_thermostat', web: 'device_thermostat' },
} as const;

export function DashboardHeader({
  eyebrow,
  name,
  onNotifications,
}: {
  eyebrow: string;
  name: string;
  onNotifications: () => void;
}) {
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
        accessibilityLabel="Open alerts"
        accessibilityRole="button"
        onPress={onNotifications}
        style={({ pressed }) => [styles.notificationButton, pressed && styles.pressed]}>
        <HeatIcon name={icons.bell} size={20} tintColor={Palette.ink} />
        <View style={styles.notificationDot} />
      </Pressable>
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

  return (
    <View style={styles.dockShadow}>
      <View style={styles.dock}>
        {tabs.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <Pressable
              accessibilityLabel={tab.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              key={tab.id}
              onPress={() => onChange(tab.id)}
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
    flexDirection: 'row',
    minHeight: 72,
    paddingHorizontal: 6,
    paddingVertical: 7,
  },
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
    fontSize: 9,
    lineHeight: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  dockLabelActive: { color: Palette.coralDark, fontFamily: Fonts.bold, marginTop: 1 },
  pressed: { opacity: 0.66 },
});
