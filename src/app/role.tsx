import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn, FadeInUp, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { HeatSenseLogo } from '@/components/heatsense-logo';
import { HeatSenseMascot, type MascotReaction } from '@/components/heatsense-mascot';
import { MobileViewport } from '@/components/mobile-viewport';
import { OnboardingContinueButton, OnboardingSelectionButton, OnboardingTokens } from '@/components/onboarding-controls';
import { setOnboardingRole, useOnboardingRole, type OnboardingRole } from '@/state/onboarding';

const fontFamily = Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif', default: '"Helvetica Neue", Helvetica, Arial, sans-serif' });
const ORANGE = '#FF996B';
const MUTED = '#B8B8B8';

type IconProps = { color: string; size?: number };

// Lucide "clipboard-list".
function CoachIcon({ color, size = 28 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={8} y={2} width={8} height={4} rx={1} />
      <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <Path d="M12 11h4" /><Path d="M12 16h4" /><Path d="M8 11h.01" /><Path d="M8 16h.01" />
    </Svg>
  );
}

// Lucide "activity".
function AthleteIcon({ color, size = 28 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
    </Svg>
  );
}

// The activity glyph is sparser than the clipboard, so it is drawn a touch larger to match its weight.
const roles: { id: OnboardingRole; name: string; description: string; iconSize: number; iconColor: string; Icon: (props: IconProps) => React.JSX.Element }[] = [
  { id: 'coach', name: 'Coach', description: 'Lead safer practices.', iconSize: 26, iconColor: OnboardingTokens.iconBlue, Icon: CoachIcon },
  { id: 'athlete', name: 'Athlete', description: 'Train with confidence.', iconSize: 28, iconColor: OnboardingTokens.iconGreen, Icon: AthleteIcon },
];

function Chevron({ direction = 'right', color = '#FFFFFF', size = 18 }: { direction?: 'left' | 'right'; color?: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d={direction === 'left' ? 'm15 5-7 7 7 7' : 'm9 5 7 7-7 7'} /></Svg>;
}

export default function RoleScreen() {
  return <MobileViewport><RoleContent /></MobileViewport>;
}

function RoleContent() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const selected = useOnboardingRole();
  const [height, setHeight] = useState(0);
  const [mascotArea, setMascotArea] = useState(0);
  const [reaction, setReaction] = useState<MascotReaction>(null);
  // Short phones get tighter spacing, smaller panels and headline before anything scrolls.
  const compact = height > 0 && height < 720;
  const headlineSize = compact ? 34 : 46;

  const rise = (delay: number) => (reducedMotion ? undefined : FadeInUp.delay(delay).duration(480));
  const fade = (delay: number) => (reducedMotion ? undefined : FadeIn.delay(delay).duration(420));

  const back = () => (router.canGoBack() ? router.back() : router.replace('/sign-in'));
  const next = () => { if (selected) router.push(`/setup/${selected}`); };

  return (
    <View style={styles.fill} onLayout={(event: LayoutChangeEvent) => setHeight(event.nativeEvent.layout.height)}>
      <StatusBar style="light" />
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + 8, compact ? 34 : 56), paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <Animated.View entering={fade(0)} style={styles.topRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} hitSlop={8} style={({ pressed }) => [styles.circle, pressed && styles.pressed]}>
            <Chevron direction="left" />
          </Pressable>
          <HeatSenseLogo height={30} />
        </Animated.View>

        <Animated.Text entering={fade(200)} style={[styles.eyebrow, { fontFamily, marginTop: compact ? 12 : 34 }]}>MADE FOR YOU</Animated.Text>
        <Animated.Text entering={rise(350)} accessibilityRole="header" style={[styles.headline, { fontFamily, fontSize: headlineSize, lineHeight: Math.round(headlineSize * 1.08) }]}>
          {'Your role.\nYour experience.'}
        </Animated.Text>
        <Animated.Text entering={rise(550)} style={[styles.description, { fontFamily }]}>How will you use HeatSense?</Animated.Text>

        {/* The mascot fills the space between the intro and the role options. */}
        <View style={[styles.mascotArea, compact && { minHeight: 0, paddingVertical: 4 }]} onLayout={(event: LayoutChangeEvent) => setMascotArea(event.nativeEvent.layout.height)}>
          {mascotArea > 0 && <Animated.View entering={fade(300)}><HeatSenseMascot height={Math.max(72, Math.min(210, mascotArea - (compact ? 22 : 56)))} reaction={reaction} /></Animated.View>}
        </View>

        <View accessibilityRole="radiogroup" style={{ gap: compact ? 12 : 16 }}>
          {roles.map((role, index) => (
            <Animated.View key={role.id} entering={rise(750 + index * 200)}>
              <OnboardingSelectionButton
                icon={<role.Icon color={role.iconColor} size={role.iconSize} />}
                title={role.name}
                description={role.description}
                selected={selected === role.id}
                height={compact ? 84 : 100}
                onPress={() => { if (selected !== role.id) setReaction({ kind: role.id, id: Date.now() }); setOnboardingRole(role.id); }}
              />
            </Animated.View>
          ))}
        </View>

        <View style={{ height: compact ? 14 : 22 }} />

        <Animated.View entering={rise(1150)}>
          <OnboardingContinueButton enabled={selected !== null} onPress={next} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 22 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  circle: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  eyebrow: { color: ORANGE, fontSize: 12, letterSpacing: 1.5, fontWeight: '500' },
  headline: { color: '#FFFFFF', fontWeight: '500', letterSpacing: -0.8, marginTop: 12 },
  description: { color: MUTED, fontSize: 16, lineHeight: 22, fontWeight: '400', marginTop: 12 },
  spacer: { flexGrow: 1, minHeight: 24 },
  mascotArea: { flexGrow: 1, minHeight: 150, alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
});
