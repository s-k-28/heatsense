import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { HeatSenseLogo } from '@/components/heatsense-logo';
import { HeatSenseMascot, type MascotReaction } from '@/components/heatsense-mascot';
import { MobileViewport } from '@/components/mobile-viewport';
import { setOnboardingRole, useOnboardingRole, type OnboardingRole } from '@/state/onboarding';

// Same palette and type as the sign-in screen ("Built for the heat."), so the two read as consecutive screens.
// The controls are local to this screen on purpose: the shared onboarding controls also style other pages.
const SCREEN = '#090909';
const MUTED = '#B8B8B8';
const fontFamily = Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif', default: '"Helvetica Neue", Helvetica, Arial, sans-serif' });

const T = {
  surface: '#101010',
  surfaceHover: '#161616',
  surfaceSelected: '#1A1A1A',
  outline: 'rgba(255,255,255,0.7)',
  outlineStrong: '#FFFFFF',
  outlineDisabled: 'rgba(255,255,255,0.22)',
  indicator: 'rgba(255,255,255,0.4)',
} as const;

const easeOut = Easing.out(Easing.cubic);
const FOCUS_RING = { outlineColor: '#FFFFFF', outlineStyle: 'solid', outlineWidth: 2, outlineOffset: 3 } as const;

type IconProps = { size?: number };
const ICON_STROKE = 1.8;

// Lucide "clipboard-list".
function CoachIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={8} y={2} width={8} height={4} rx={1} />
      <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <Path d="M12 11h4" /><Path d="M12 16h4" /><Path d="M8 11h.01" /><Path d="M8 16h.01" />
    </Svg>
  );
}

// Lucide "activity".
function AthleteIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
    </Svg>
  );
}

const roles: { id: OnboardingRole; name: string; description: string; Icon: (props: IconProps) => React.JSX.Element }[] = [
  { id: 'coach', name: 'Coach', description: 'Lead safer practices.', Icon: CoachIcon },
  { id: 'athlete', name: 'Athlete', description: 'Train with confidence.', Icon: AthleteIcon },
];

function BackChevron() {
  return <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="m15 5-7 7 7 7" /></Svg>;
}

function useMs() {
  const reducedMotion = useReducedMotion();
  return useCallback((value: number) => (reducedMotion ? 0 : value), [reducedMotion]);
}

// Hover brightens the charcoal and the outline; press scales to 0.985.
function usePressFeedback() {
  const ms = useMs();
  const hover = useSharedValue(0);
  const press = useSharedValue(0);
  const handlers = {
    onHoverIn: () => { hover.set(withTiming(1, { duration: ms(200), easing: easeOut })); },
    onHoverOut: () => { hover.set(withTiming(0, { duration: ms(200), easing: easeOut })); },
    onPressIn: () => { press.set(withTiming(1, { duration: ms(110), easing: easeOut })); },
    onPressOut: () => { press.set(withTiming(0, { duration: ms(200), easing: easeOut })); },
  };
  return { hover, press, handlers, ms };
}

function SelectionIndicator({ selected }: { selected: boolean }) {
  const ms = useMs();
  const progress = useSharedValue(selected ? 1 : 0);
  useEffect(() => { progress.set(withTiming(selected ? 1 : 0, { duration: ms(200), easing: easeOut })); }, [ms, progress, selected]);
  const ring = useAnimatedStyle(() => ({ borderColor: interpolateColor(progress.value, [0, 1], [T.indicator, T.outlineStrong]) }));
  const check = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ scale: 0.7 + progress.value * 0.3 }] }));
  return (
    <Animated.View style={[styles.indicator, ring]}>
      <Animated.View style={check}>
        <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round"><Path d="m5 12 4 4L19 6" /></Svg>
      </Animated.View>
    </Animated.View>
  );
}

function RoleButton({ icon, title, description, selected, onPress, height }: { icon: ReactNode; title: string; description: string; selected: boolean; onPress: () => void; height: number }) {
  const { hover, press, handlers, ms } = usePressFeedback();
  const [focused, setFocused] = useState(false);
  const progress = useSharedValue(selected ? 1 : 0);
  useEffect(() => { progress.set(withTiming(selected ? 1 : 0, { duration: ms(220), easing: easeOut })); }, [ms, progress, selected]);

  const frame = useAnimatedStyle(() => ({
    borderColor: interpolateColor(Math.max(progress.value, hover.value), [0, 1], [T.outline, T.outlineStrong]),
    backgroundColor: progress.value > hover.value
      ? interpolateColor(progress.value, [0, 1], [T.surface, T.surfaceSelected])
      : interpolateColor(hover.value, [0, 1], [T.surface, T.surfaceHover]),
    transform: [{ scale: 1 - press.value * 0.015 }],
  }));

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`${title}. ${description}`}
      aria-checked={selected}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      {...handlers}
      style={[{ borderRadius: 9999 }, focused && FOCUS_RING]}>
      <Animated.View style={[styles.role, { height }, frame]}>
        <View style={styles.roleIcon}>{icon}</View>
        <View style={styles.roleCopy}>
          <Text numberOfLines={1} style={[styles.roleTitle, { fontFamily }]}>{title}</Text>
          <Text numberOfLines={1} style={[styles.roleDescription, { fontFamily }]}>{description}</Text>
        </View>
        <SelectionIndicator selected={selected} />
      </Animated.View>
    </Pressable>
  );
}

// Matches "Continue with Google": 58px pill, 1px white outline, dark interior, white 16px text.
function ContinueButton({ enabled, onPress }: { enabled: boolean; onPress: () => void }) {
  const { hover, press, handlers } = usePressFeedback();
  const [focused, setFocused] = useState(false);
  const frame = useAnimatedStyle(() => ({
    borderColor: interpolateColor(hover.value, [0, 1], ['rgba(255,255,255,0.85)', T.outlineStrong]),
    backgroundColor: interpolateColor(hover.value, [0, 1], [SCREEN, T.surfaceHover]),
    transform: [{ scale: 1 - press.value * 0.015 }],
  }));

  if (!enabled) {
    return (
      <View accessible accessibilityRole="button" accessibilityLabel="Continue" aria-disabled style={[styles.continue, styles.continueDisabled]}>
        <Text style={[styles.continueText, styles.continueTextDisabled, { fontFamily }]}>Continue →</Text>
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continue"
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      {...handlers}
      style={[{ borderRadius: 9999 }, focused && FOCUS_RING]}>
      <Animated.View style={[styles.continue, frame]}>
        <Text style={[styles.continueText, { fontFamily }]}>Continue →</Text>
      </Animated.View>
    </Pressable>
  );
}

export default function RoleScreen() {
  return <MobileViewport><View style={[styles.fill, { backgroundColor: SCREEN }]}><RoleContent /></View></MobileViewport>;
}

function RoleContent() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const selected = useOnboardingRole();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [mascotArea, setMascotArea] = useState(0);
  const [reaction, setReaction] = useState<MascotReaction>(null);
  // Short phones (e.g. 375 × 667) get tighter spacing and shorter options before anything scrolls.
  const compact = size.height > 0 && size.height < 760;
  const headlineSize = Math.max(38, Math.min(46, Math.floor((size.width - 44) * 0.14)));

  const rise = (delay: number) => (reducedMotion ? undefined : FadeInUp.delay(delay).duration(520).easing(easeOut));
  const mascotIn = (delay: number) => (reducedMotion ? undefined : FadeIn.delay(delay).duration(620).easing(easeOut));

  const back = () => (router.canGoBack() ? router.back() : router.replace('/sign-in'));
  const next = () => { if (selected) router.push(`/setup/${selected}`); };

  return (
    <View style={styles.fill} onLayout={(event: LayoutChangeEvent) => setSize(event.nativeEvent.layout)}>
      <StatusBar style="light" />
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + 8, compact ? 36 : 56), paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <View style={styles.topRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} hitSlop={8} style={({ pressed }) => [styles.circle, pressed && styles.pressed]}>
            <BackChevron />
          </Pressable>
          <HeatSenseLogo height={30} />
        </View>

        <Animated.Text
          entering={rise(150)}
          accessibilityRole="header"
          style={[styles.headline, { fontFamily, fontSize: headlineSize, lineHeight: Math.round(headlineSize * 1.15), marginTop: compact ? 22 : 40 }]}>
          Made for you.
        </Animated.Text>
        <Animated.Text entering={rise(300)} style={[styles.description, { fontFamily }]}>Choose how you’ll use HeatSense.</Animated.Text>

        {/* The mascot is the centerpiece between the intro and the role options, free of any container. */}
        <View style={[styles.mascotArea, compact && styles.mascotAreaCompact]} onLayout={(event: LayoutChangeEvent) => setMascotArea(event.nativeEvent.layout.height)}>
          {mascotArea > 0 && (
            <Animated.View entering={mascotIn(450)}>
              <HeatSenseMascot height={Math.max(90, Math.min(compact ? 150 : 210, mascotArea - (compact ? 12 : 40)))} reaction={reaction} />
            </Animated.View>
          )}
        </View>

        <View accessibilityRole="radiogroup" style={{ gap: compact ? 12 : 14 }}>
          {roles.map((role, index) => (
            <Animated.View key={role.id} entering={rise(620 + index * 110)}>
              <RoleButton
                icon={<role.Icon size={24} />}
                title={role.name}
                description={role.description}
                selected={selected === role.id}
                height={compact ? 80 : 86}
                onPress={() => { if (selected !== role.id) setReaction({ kind: role.id, id: Date.now() }); setOnboardingRole(role.id); }}
              />
            </Animated.View>
          ))}
        </View>

        <Animated.View entering={rise(900)} style={{ marginTop: compact ? 16 : 22 }}>
          <ContinueButton enabled={selected !== null} onPress={next} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 22 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  circle: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: '#FFFFFF', backgroundColor: SCREEN, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  headline: { color: '#FFFFFF', fontWeight: '400', letterSpacing: -0.6 },
  description: { color: MUTED, fontSize: 16.5, lineHeight: 23, fontWeight: '400', marginTop: 10 },
  mascotArea: { flexGrow: 1, minHeight: 170, alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  mascotAreaCompact: { minHeight: 110, paddingVertical: 6 },
  role: { borderRadius: 9999, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', paddingLeft: 26, paddingRight: 24, gap: 18 },
  roleIcon: { width: 24, alignItems: 'center' },
  roleCopy: { flex: 1, gap: 3 },
  roleTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '600', letterSpacing: -0.3 },
  roleDescription: { color: MUTED, fontSize: 14.5, lineHeight: 19, fontWeight: '400' },
  indicator: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  continue: { height: 58, borderRadius: 9999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)', backgroundColor: SCREEN, alignItems: 'center', justifyContent: 'center' },
  continueDisabled: { borderColor: T.outlineDisabled },
  continueText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', letterSpacing: -0.1 },
  continueTextDisabled: { opacity: 0.4 },
});
