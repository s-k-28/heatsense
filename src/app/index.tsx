import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeatIcon } from '@/components/heat-icon';
import {
  RunnerSignalVisual,
  SignalsVisual,
  TeamVisual,
  WbgtVisual,
} from '@/components/onboarding-visuals';
import { Fonts, MaxContentWidth, Palette, Radius, Spacing } from '@/constants/theme';

const icons = {
  back: { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' },
  forward: { ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' },
  heat: { ios: 'thermometer.sun.fill', android: 'device_thermostat', web: 'device_thermostat' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
} as const;

const steps = [
  {
    eyebrow: 'Meet HeatSense',
    title: 'Heat safety, for every athlete.',
    description:
      'Pair field-wide WBGT guidance with individual athlete signals—without replacing the people responsible for their care.',
    visual: RunnerSignalVisual,
  },
  {
    eyebrow: 'Field conditions',
    title: 'Know the risk before practice starts.',
    description:
      'HeatSense translates live conditions into clear UIL-aligned actions for work, rest, hydration, and equipment.',
    visual: WbgtVisual,
  },
  {
    eyebrow: 'Individual context',
    title: 'See the signal behind the number.',
    description:
      'An optional wristband adds heart-rate recovery, skin temperature, sweat response, and movement trends.',
    visual: SignalsVisual,
  },
  {
    eyebrow: 'Ready together',
    title: 'One sideline. One safety picture.',
    description:
      'Set up your school and team now. Wristbands can be paired later, and the core WBGT experience works without them.',
    visual: TeamVisual,
  },
] as const;

type Role = 'Coach' | 'Athletic trainer' | 'Athlete';

export default function OnboardingScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const [stepIndex, setStepIndex] = useState(0);
  const [role, setRole] = useState<Role>('Coach');
  const step = steps[stepIndex];
  const isFinalStep = stepIndex === steps.length - 1;
  const isCompact = height < 780;

  const actionLabel = useMemo(() => {
    if (isFinalStep) {
      return `Continue as ${role.toLowerCase()}`;
    }
    return stepIndex === 0 ? 'See how it works' : 'Continue';
  }, [isFinalStep, role, stepIndex]);

  function advance() {
    if (isFinalStep) {
      router.push({ pathname: '/ready', params: { role } });
      return;
    }
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  }

  function goBack() {
    setStepIndex((current) => Math.max(current - 1, 0));
  }

  const Visual = step.visual;

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.shell}>
          <View style={styles.topBar}>
            <View style={styles.brand}>
              <View style={styles.brandMark}>
                <HeatIcon name={icons.heat} size={19} tintColor={Palette.surface} />
              </View>
              <Text style={styles.brandName}>HeatSense</Text>
            </View>

            <Pressable
              accessibilityLabel="Skip introduction"
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => setStepIndex(steps.length - 1)}
              style={({ pressed }) => [styles.skipButton, pressed && styles.buttonPressed]}>
              <Text style={styles.skipText}>{isFinalStep ? 'Setup' : 'Skip'}</Text>
            </Pressable>
          </View>

          <View accessibilityLabel={`Step ${stepIndex + 1} of ${steps.length}`} style={styles.progressRow}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[styles.progressTrack, index <= stepIndex && styles.progressTrackActive]}
              />
            ))}
          </View>

          <ScrollView
            bounces={false}
            contentContainerStyle={[styles.scrollContent, isCompact && styles.scrollContentCompact]}
            showsVerticalScrollIndicator={false}>
            <Animated.View
              entering={FadeInRight.duration(330)}
              exiting={FadeOutLeft.duration(180)}
              key={stepIndex}
              style={styles.story}>
              <View style={styles.visualWrap}>
                <Visual />
              </View>

              <View style={styles.copyBlock}>
                <Text style={styles.eyebrow}>{step.eyebrow}</Text>
                <Text style={[styles.title, isCompact && styles.titleCompact]}>{step.title}</Text>
                <Text style={styles.description}>{step.description}</Text>
              </View>

              {isFinalStep ? <RoleSelector onChange={setRole} value={role} /> : null}
            </Animated.View>
          </ScrollView>

          <View style={styles.actionBar}>
            {stepIndex > 0 ? (
              <Pressable
                accessibilityLabel="Go to previous step"
                accessibilityRole="button"
                onPress={goBack}
                style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}>
                <HeatIcon name={icons.back} size={23} tintColor={Palette.ink} />
              </Pressable>
            ) : (
              <View style={styles.backButtonPlaceholder} />
            )}

            <Pressable
              accessibilityRole="button"
              onPress={advance}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}>
              <Text numberOfLines={1} style={styles.primaryButtonText}>
                {actionLabel}
              </Text>
              <View style={styles.primaryButtonIcon}>
                <HeatIcon
                  name={isFinalStep ? icons.check : icons.forward}
                  size={18}
                  tintColor={Palette.surface}
                />
              </View>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function RoleSelector({ onChange, value }: { onChange: (role: Role) => void; value: Role }) {
  const roles: Role[] = ['Coach', 'Athletic trainer', 'Athlete'];

  return (
    <View style={styles.roleSection}>
      <Text style={styles.rolePrompt}>I’m joining as</Text>
      <View style={styles.roleRow}>
        {roles.map((role) => {
          const selected = value === role;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              key={role}
              onPress={() => onChange(role)}
              style={({ pressed }) => [
                styles.roleChip,
                selected && styles.roleChipSelected,
                pressed && styles.buttonPressed,
              ]}>
              <Text style={[styles.roleText, selected && styles.roleTextSelected]}>{role}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Palette.canvas,
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  shell: {
    alignSelf: 'center',
    flex: 1,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.five,
    width: '100%',
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 54,
  },
  brand: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: Palette.coral,
    borderRadius: 13,
    height: 36,
    justifyContent: 'center',
    transform: [{ rotate: '-4deg' }],
    width: 36,
  },
  brandName: {
    color: Palette.ink,
    fontFamily: Fonts.extrabold,
    fontSize: 18,
    letterSpacing: -0.6,
  },
  skipButton: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  skipText: {
    color: Palette.inkMuted,
    fontFamily: Fonts.semibold,
    fontSize: 13,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: Spacing.three,
  },
  progressTrack: {
    backgroundColor: Palette.border,
    borderRadius: Radius.pill,
    flex: 1,
    height: 4,
  },
  progressTrackActive: {
    backgroundColor: Palette.coral,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Spacing.four,
    paddingTop: Spacing.six,
  },
  scrollContentCompact: {
    paddingTop: Spacing.four,
  },
  story: {
    flex: 1,
  },
  visualWrap: {
    width: '100%',
  },
  copyBlock: {
    marginTop: Spacing.six,
  },
  eyebrow: {
    color: Palette.coralDark,
    fontFamily: Fonts.bold,
    fontSize: 13,
  },
  title: {
    color: Palette.ink,
    fontFamily: Fonts.extrabold,
    fontSize: 34,
    letterSpacing: -1.5,
    lineHeight: 40,
    marginTop: Spacing.two,
    maxWidth: 410,
  },
  titleCompact: {
    fontSize: 30,
    lineHeight: 36,
  },
  description: {
    color: Palette.inkMuted,
    fontFamily: Fonts.medium,
    fontSize: 15,
    lineHeight: 22,
    marginTop: Spacing.three,
    maxWidth: 430,
  },
  roleSection: {
    gap: Spacing.three,
    marginTop: Spacing.five,
  },
  rolePrompt: {
    color: Palette.ink,
    fontFamily: Fonts.bold,
    fontSize: 12,
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  roleChip: {
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.four,
    paddingVertical: 10,
  },
  roleChipSelected: {
    backgroundColor: Palette.ink,
    borderColor: Palette.ink,
  },
  roleText: {
    color: Palette.inkMuted,
    fontFamily: Fonts.semibold,
    fontSize: 11,
  },
  roleTextSelected: {
    color: Palette.surface,
  },
  actionBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
    paddingBottom: Platform.OS === 'android' ? Spacing.four : Spacing.two,
    paddingTop: Spacing.three,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderRadius: 27,
    borderWidth: 1,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  backButtonPlaceholder: {
    height: 54,
    width: 0,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: Palette.coral,
    borderRadius: 27,
    flex: 1,
    flexDirection: 'row',
    height: 54,
    justifyContent: 'space-between',
    paddingLeft: Spacing.five,
    paddingRight: 7,
    shadowColor: Palette.coralDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
  },
  primaryButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  primaryButtonText: {
    color: Palette.surface,
    flexShrink: 1,
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
  primaryButtonIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(27,28,25,0.14)',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  buttonPressed: {
    opacity: 0.64,
  },
});
