import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn, FadeInUp, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { GlassSurface } from '@/components/glass-surface';
import { HeatSenseLogo } from '@/components/heatsense-logo';
import { MobileViewport } from '@/components/mobile-viewport';
import { OnboardingContinueButton, OnboardingSelectionButton, OnboardingTokens } from '@/components/onboarding-controls';
import { setTeamChoice, useTeamChoice, type TeamChoice } from '@/state/onboarding';

const fontFamily = Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif', default: '"Helvetica Neue", Helvetica, Arial, sans-serif' });
const PEACH = '#FF986B';
const MUTED = '#B8B8B8';
const FOCUS_RING = { outlineColor: '#FFFFFF', outlineStyle: 'solid', outlineWidth: 2, outlineOffset: 3 } as const;

type IconProps = { color: string; size?: number };

// Lucide "circle-plus".
function CreateIcon({ color, size = 27 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Circle cx={12} cy={12} r={10} /><Path d="M8 12h8" /><Path d="M12 8v8" /></Svg>;
}

// Lucide "users".
function JoinIcon({ color, size = 27 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><Circle cx={9} cy={7} r={4} /><Path d="M22 21v-2a4 4 0 0 0-3-3.87" /><Path d="M16 3.13a4 4 0 0 1 0 7.75" /></Svg>;
}

const options: { id: TeamChoice; title: string; description: string; iconColor: string; Icon: (props: IconProps) => React.JSX.Element }[] = [
  { id: 'create', title: 'Create a team', description: 'Set up your school, sport, and roster.', iconColor: OnboardingTokens.iconTeal, Icon: CreateIcon },
  { id: 'join', title: 'Join a team', description: 'Connect with an existing team.', iconColor: OnboardingTokens.iconGreen, Icon: JoinIcon },
];

export default function CoachTeamSetup() {
  return <MobileViewport><Content /></MobileViewport>;
}

function Content() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const choice = useTeamChoice();
  const [height, setHeight] = useState(0);
  const compact = height > 0 && height < 720;
  const headlineSize = compact ? 38 : 44;

  const rise = (delay: number) => (reducedMotion ? undefined : FadeInUp.delay(delay).duration(480));
  const fade = (delay: number) => (reducedMotion ? undefined : FadeIn.delay(delay).duration(420));

  const back = () => (router.canGoBack() ? router.back() : router.replace('/role'));
  const next = () => { if (choice) router.push(`/team/${choice}`); };

  return (
    <View style={styles.fill} onLayout={(event: LayoutChangeEvent) => setHeight(event.nativeEvent.layout.height)}>
      <StatusBar style="light" />
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + 8, compact ? 40 : 56), paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <Animated.View entering={fade(0)} style={styles.topRow}>
          <BackButton onPress={back} />
          <HeatSenseLogo height={30} />
        </Animated.View>

        <Animated.Text entering={fade(200)} style={[styles.eyebrow, { fontFamily, marginTop: compact ? 26 : 40 }]}>TEAM SETUP</Animated.Text>
        <Animated.Text entering={rise(350)} accessibilityRole="header" style={[styles.headline, { fontFamily, fontSize: headlineSize, lineHeight: Math.round(headlineSize * 1.1), marginTop: compact ? 12 : 16 }]}>
          {"Let's get your\nteam ready."}
        </Animated.Text>
        <Animated.Text entering={rise(550)} style={[styles.description, { fontFamily, marginTop: compact ? 12 : 18 }]}>Create a new team or connect with one already using HeatSense.</Animated.Text>

        <View accessibilityRole="radiogroup" style={{ gap: compact ? 12 : 16, marginTop: compact ? 24 : 40 }}>
          {options.map((option, index) => (
            <Animated.View key={option.id} entering={rise(750 + index * 200)}>
              <OnboardingSelectionButton
                layout="stacked"
                icon={<option.Icon color={option.iconColor} size={compact ? 26 : 28} />}
                title={option.title}
                description={option.description}
                selected={choice === option.id}
                height={compact ? 118 : 150}
                onPress={() => setTeamChoice(option.id)}
              />
            </Animated.View>
          ))}
        </View>

        <Animated.View entering={rise(1150)} style={{ marginTop: compact ? 22 : 34 }}>
          <OnboardingContinueButton enabled={choice !== null} onPress={next} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} hitSlop={8} style={({ pressed }) => [styles.backWrap, focused && FOCUS_RING, pressed && { transform: [{ scale: 0.94 }], opacity: 0.85 }]}>
      <GlassSurface radius={22} style={styles.back}>
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="m15 5-7 7 7 7" /></Svg>
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 22 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backWrap: { borderRadius: 22 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.32)' },
  eyebrow: { color: PEACH, fontSize: 12.5, letterSpacing: 1.5, fontWeight: '500' },
  headline: { color: '#FFFFFF', fontWeight: '500', letterSpacing: -0.8 },
  description: { color: MUTED, fontSize: 15.5, lineHeight: 23, fontWeight: '400', maxWidth: 330 },
});
