import { AnimatedText, Text } from '@/components/ui/text';
import { useAthleteAppearance, useAthletePalette, useAthleteStyles } from '@/components/athlete-appearance';
import { Image } from 'expo-image';
import Svg, { Circle, Path } from 'react-native-svg';
import type { ComponentProps } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Surface } from '@/components/ui/surface';
import { HeatIcon } from '@/components/heat-icon';
import { HeatSenseLogo } from '@/components/heatsense-logo';
import { TextLink } from '@/components/ui/list';
import { PersonGlyph } from '@/components/whoop-ui';
import { Face, Palette, Spacing, Type } from '@/constants/theme';
import { CoachPalette, CoachRadius, CoachType } from '@/constants/coach-theme';
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
const PILL_PADDING = 4;
// The sliding pill's motion: quick, with a long soft landing.
const SLIDE_MS = 250;
const SLIDE_EASE = Easing.bezier(0.22, 1, 0.36, 1);
const TAB_MUTED = 'rgba(193,193,193,0.8)';

const bell = { ios: 'bell.fill', android: 'notifications', web: 'notifications' } as const;

function initialsOf(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join('');
}

/**
 * Fixed top row: brand mark on the left, notifications and the account button on the right.
 * Once the large title scrolls away, the bar picks up a backdrop and a small centered title.
 */
export type HeaderBand = { label: string; tone: string; accessibilityLabel: string; onPress: () => void };

/** The band, always in the corner like WHOOP's strap: battery for an athlete, bands live for staff. */
function BandChip({ band }: { band: HeaderBand }) {
  const athlete = useAthleteAppearance();
  const Palette = useAthletePalette();
  const styles = useAthleteStyles(baseStyles);
  return (
    <Pressable accessibilityLabel={band.accessibilityLabel} accessibilityRole="button" hitSlop={4} onPress={band.onPress} style={({ pressed }) => [styles.bandChip, pressed && styles.pressed]}>
      {athlete ? <Image contentFit="contain" source={require('@/assets/images/band-views/side.png')} style={{ width: 28, height: 36 }} /> : <Svg fill="none" height={16} stroke={Palette.ink} strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24" width={16}>
        <Path d="M8 2.5h8l.8 4.5v10l-.8 4.5H8l-.8-4.5V7z" />
        <Circle cx={12} cy={12} fill={band.tone} r={2.6} stroke="none" />
      </Svg>}
      <Text style={styles.bandChipText}>{band.label}</Text>
    </Pressable>
  );
}

export function DashboardHeader({
  band,
  name,
  onAlerts,
  onProfile,
  scrollY,
  title,
  variant = 'default',
}: {
  band?: HeaderBand;
  name: string;
  /** Opens the role's real alerts; no bell when the role has none. */
  onAlerts?: () => void;
  onProfile: () => void;
  scrollY: SharedValue<number>;
  title: string;
  variant?: 'coach' | 'default';
}) {
  const Palette = useAthletePalette();
  const styles = useAthleteStyles(baseStyles);
  const insets = useSafeAreaInsets();
  const backdrop = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.value, [36, 52], [0, 1], 'clamp') }));
  const { unreadNotifications, photoUri, profileName } = usePreferences();
  const shownName = profileName?.trim() || name;
  const openAlerts = () => {
    markNotificationsRead();
    onAlerts?.();
  };

  return (
    <View pointerEvents="box-none" style={[styles.headerWrap, { paddingTop: insets.top }]}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.headerBackdrop, variant === 'coach' && styles.coachHeaderBackdrop, backdrop]} />
    <View style={styles.header}>
      <HeatSenseLogo height={28} />
      <AnimatedText accessibilityElementsHidden importantForAccessibility="no" numberOfLines={1} style={[styles.headerTitle, variant === 'coach' && styles.coachHeaderTitle, backdrop]}>{title}</AnimatedText>
      <View style={styles.headerActions}>
        {band ? <BandChip band={band} /> : null}
        {onAlerts ? (
          <Pressable accessibilityLabel={unreadNotifications > 0 ? `Alerts, ${unreadNotifications} new` : 'Alerts'} accessibilityRole="button" hitSlop={4} onPress={openAlerts} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <HeatIcon name={bell} size={20} tintColor={Palette.ink} />
            {unreadNotifications > 0 ? <View style={styles.badge} /> : null}
          </Pressable>
        ) : null}
        <Pressable accessibilityLabel={shownName ? `${shownName}, account` : 'Account'} accessibilityRole="button" onPress={onProfile} style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}>
          {photoUri ? <Image accessibilityIgnoresInvertColors contentFit="cover" source={{ uri: photoUri }} style={StyleSheet.absoluteFill} /> : shownName ? <Text style={styles.avatarText}>{initialsOf(shownName)}</Text> : <PersonGlyph size={22} />}
        </Pressable>
      </View>

    </View>
    </View>
  );
}

export function LargeTitle({ title }: { title: string }) {
  const styles = useAthleteStyles(baseStyles);
  return <Text accessibilityRole="header" style={styles.largeTitle}>{title}</Text>;
}

export function CoachLargeTitle({ title }: { title: string }) {
  const styles = baseStyles;
  return <Text accessibilityRole="header" style={styles.coachLargeTitle}>{title}</Text>;
}

export function SectionHeader({ action, onActionPress, tight, title }: { action?: string; onActionPress?: () => void; tight?: boolean; title: string }) {
  const styles = useAthleteStyles(baseStyles);
  return (
    <View style={[styles.sectionHeader, tight && styles.sectionHeaderTight]}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
      {action ? <TextLink label={action} onPress={onActionPress} /> : null}
    </View>
  );
}

/** Floating pill with a smaller pill inside it that slides to the selected tab. */
export function TabBar({ activeTab, onChange, tabs, variant = 'default' }: { activeTab: string; onChange: (tab: string) => void; tabs: DashboardTab[]; variant?: 'coach' | 'default' }) {
  const styles = useAthleteStyles(baseStyles);
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
    x.value = withTiming(target, { duration: SLIDE_MS, easing: SLIDE_EASE });
  }, [index, reducedMotion, tabWidth, x]);

  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }], width: tabWidth }));

  return (
    <View style={[styles.pillWrap, variant === 'coach' && styles.coachPillWrap, { bottom: Math.max(insets.bottom - 6, Spacing.three) }]}>
      <Surface style={[styles.pill, { borderRadius: PILL_HEIGHT / 2, shadowOpacity: 0 }, variant === 'coach' && styles.coachPill]}>
        <View onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)} style={styles.pillInner}>
          {tabWidth > 0 ? <Animated.View pointerEvents="none" style={[styles.indicator, variant === 'coach' && styles.coachIndicator, indicator]} /> : null}
          {tabs.map((tab, position) => (
            <TabItem
              active={tab.id === activeTab}
              index={position}
              key={tab.id}
              onPress={() => onChange(tab.id)}
              tab={tab}
              tabWidth={tabWidth}
              variant={variant}
              x={x}
            />
          ))}
        </View>
      </Surface>
    </View>
  );
}

/**
 * One tab. The orange layer fades in as the pill arrives and out as it leaves, so the color
 * travels with the pill instead of jumping when the press lands.
 */
function TabItem({ active, index, onPress, tab, tabWidth, x, variant }: { active: boolean; index: number; onPress: () => void; tab: DashboardTab; tabWidth: number; x: SharedValue<number>; variant: 'coach' | 'default' }) {
  const athlete = useAthleteAppearance();
  const Palette = useAthletePalette();
  const styles = useAthleteStyles(baseStyles);
  const lit = useAnimatedStyle(() => {
    if (tabWidth === 0) return { opacity: active ? 1 : 0 };
    const here = index * tabWidth;
    return { opacity: interpolate(x.value, [here - tabWidth, here, here + tabWidth], [0, 1, 0], 'clamp') };
  });
  const dim = useAnimatedStyle(() => {
    if (tabWidth === 0) return { opacity: active ? 0 : 1 };
    const here = index * tabWidth;
    return { opacity: interpolate(x.value, [here - tabWidth, here, here + tabWidth], [1, 0, 1], 'clamp') };
  });
  const content = (color: string, labelStyle: object) => (
    <>
      <HeatIcon name={tab.icon} size={22} tintColor={color} />
      <Text maxFontSizeMultiplier={1.15} numberOfLines={1} style={[styles.tabLabel, labelStyle]}>{tab.label}</Text>
    </>
  );
  return (
    <Pressable
      accessibilityLabel={tab.label}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.tab, pressed && !active && styles.tabPressed]}>
      <Animated.View pointerEvents="none" style={[styles.tabLayer, dim]}>{content(athlete ? '#FFFFFF' : variant === 'coach' ? CoachPalette.muted : TAB_MUTED, [styles.tabLabelMuted, athlete && { color: '#FFFFFF' }])}</Animated.View>
      <Animated.View pointerEvents="none" style={[styles.tabLayer, styles.tabLayerLit, lit]}>{content(variant === 'coach' ? CoachPalette.peach : Palette.coral, styles.tabLabelActive)}</Animated.View>
    </Pressable>
  );
}

const baseStyles = StyleSheet.create({
  pressed: { opacity: 0.55 },
  headerWrap: { left: 0, position: 'absolute', right: 0, top: 0, zIndex: 10 },
  headerBackdrop: { backgroundColor: Palette.canvas, borderBottomColor: 'rgba(255,255,255,0.08)', borderBottomWidth: StyleSheet.hairlineWidth },
  coachHeaderBackdrop: { backgroundColor: Palette.canvas, borderBottomColor: CoachPalette.hairline },
  headerTitleWrap: { alignItems: 'center', height: HEADER_ROW, justifyContent: 'center', left: 0, position: 'absolute', right: 0 },
  headerTitle: { color: Palette.ink, ...Type.headline, flex: 1, minWidth: 0, marginHorizontal: 12 },
  coachHeaderTitle: { color: CoachPalette.text, fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  header: { alignItems: 'center', flexDirection: 'row', height: HEADER_ROW, justifyContent: 'space-between', paddingHorizontal: Spacing.four },
  headerActions: { alignItems: 'center', flexDirection: 'row', gap: Spacing.two },
  iconButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  bandChip: { alignItems: 'center', backgroundColor: Palette.fill, borderRadius: 18, flexDirection: 'row', gap: 4, minHeight: 44, paddingHorizontal: 10 },
  bandChipText: { color: Palette.ink, fontFamily: Face.label, fontSize: 15 },
  badge: { backgroundColor: Palette.emergency, borderColor: Palette.canvas, borderRadius: 5, borderWidth: 1.5, height: 10, position: 'absolute', right: 10, top: 9, width: 10 },
  avatar: { alignItems: 'center', backgroundColor: Palette.fill, borderRadius: 18, overflow: 'hidden', height: 44, justifyContent: 'center', width: 44 },
  avatarText: { color: Palette.ink, ...Type.footnote, fontWeight: '600' },
  largeTitle: { color: Palette.ink, ...Type.largeTitle, marginTop: Spacing.one },
  coachLargeTitle: { color: CoachPalette.text, ...CoachType.page, marginBottom: 20, marginTop: 8 },
  sectionHeader: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.two, marginTop: Spacing.seven },
  sectionHeaderTight: { marginTop: Spacing.five },
  sectionTitle: { color: Palette.ink, ...Type.title3, fontWeight: '700' },
  pillWrap: { elevation: 2, left: Spacing.four, position: 'absolute', right: Spacing.four, shadowColor: '#000', shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.1, shadowRadius: 18 },
  coachPillWrap: { left: 14, right: 14, shadowOffset: { height: 10, width: 0 }, shadowOpacity: 0.1, shadowRadius: 22 },
  // Opaque tonal navigation keeps content readable without blur or specular layers.
  pill: { backgroundColor: Palette.surface, borderColor: 'rgba(191,192,203,0.08)', borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth, height: PILL_HEIGHT },
  coachPill: { backgroundColor: Palette.surface, borderColor: 'transparent', borderRadius: CoachRadius.pill },
  pillInner: { flex: 1, flexDirection: 'row', padding: PILL_PADDING },
  indicator: { backgroundColor: Palette.interactive, borderCurve: 'continuous', borderRadius: (PILL_HEIGHT - PILL_PADDING * 2) / 2, bottom: PILL_PADDING, left: PILL_PADDING, position: 'absolute', top: PILL_PADDING },
  coachIndicator: { backgroundColor: CoachPalette.interactive },
  tab: { flex: 1 },
  tabPressed: { opacity: 0.7 },
  tabLayer: { alignItems: 'center', bottom: 0, gap: 3, justifyContent: 'center', left: 0, position: 'absolute', right: 0, top: 0 },
  tabLayerLit: { zIndex: 1 },
  tabLabel: { ...Type.tab },
  tabLabelMuted: { color: TAB_MUTED },
  tabLabelActive: { color: Palette.coral },
});
