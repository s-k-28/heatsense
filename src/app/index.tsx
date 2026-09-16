import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeatIcon } from '@/components/heat-icon';
import {
  AlertLevelsVisual,
  ContextVisual,
  PracticePlanVisual,
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
    eyebrow: 'WBGT + athlete context',
    title: 'Heat safety, for every athlete.',
    description:
      'Know the field. Notice the athlete. Act before heat becomes an emergency.',
    visual: RunnerSignalVisual,
  },
  {
    eyebrow: 'UIL practice guidance',
    title: 'Know the risk before practice starts.',
    description:
      'A single field reading becomes a clear, class-specific zone for the whole practice.',
    visual: WbgtVisual,
  },
  {
    eyebrow: 'Practice adjustments',
    title: 'Turn the zone into a practice plan.',
    description:
      'HeatSense keeps the work, rest, water, and equipment rules in one coach-ready view.',
    visual: PracticePlanVisual,
  },
  {
    eyebrow: 'Athlete signals',
    title: 'Four signals. One personal baseline.',
    description: 'Available when an optional HeatSense wristband is paired.',
    visual: SignalsVisual,
  },
  {
    eyebrow: 'Movement context',
    title: 'The same heart rate can mean different things.',
    description:
      'Movement shows whether an elevated heart rate happened during exertion or while recovery stalled.',
    visual: ContextVisual,
  },
  {
    eyebrow: 'Alert behavior',
    title: 'Make rising risk hard to miss.',
    description:
      'Combined signals move through four levels. Collapse detection goes directly to Emergency.',
    visual: AlertLevelsVisual,
  },
  {
    eyebrow: 'Team setup',
    title: 'One sideline. One safety picture.',
    description:
      'Choose your role now. School, team, and optional wristband setup come next.',
    visual: TeamVisual,
  },
] as const;

type Role = 'Coach' | 'Athletic trainer' | 'Athlete';

export default function OnboardingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string; step?: string }>();
  const { height } = useWindowDimensions();
  const requestedStep = Number.parseInt(params.step ?? '1', 10) - 1;
  const initialStep = Number.isFinite(requestedStep) ? Math.max(0, Math.min(requestedStep, steps.length - 1)) : 0;
  const initialRole: Role = params.role === 'Athlete' || params.role === 'Athletic trainer' ? params.role : 'Coach';
  const [manualStep, setManualStep] = useState({ sourceStep: initialStep, value: initialStep });
  const [role, setRole] = useState<Role>(initialRole);
  const stepIndex = manualStep.sourceStep === initialStep ? manualStep.value : initialStep;
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
    setManualStep({ sourceStep: initialStep, value: Math.min(stepIndex + 1, steps.length - 1) });
  }

  function goBack() {
    setManualStep({ sourceStep: initialStep, value: Math.max(stepIndex - 1, 0) });
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

            {!isFinalStep ? (
              <Pressable
                accessibilityLabel="Skip introduction"
                accessibilityRole="button"
                hitSlop={10}
                onPress={() => setManualStep({ sourceStep: initialStep, value: steps.length - 1 })}
                style={({ pressed }) => [styles.skipButton, pressed && styles.buttonPressed]}>
                <Text style={styles.skipText}>Skip</Text>
              </Pressable>
            ) : null}
          </View>

          <View
            accessibilityLabel={`Step ${stepIndex + 1} of ${steps.length}`}
            accessibilityRole="progressbar"
            accessibilityValue={{ max: steps.length, min: 1, now: stepIndex + 1 }}
            style={styles.progressRow}>
            {steps.map((_, index) => (
              <ProgressSegment active={index <= stepIndex} key={index} />
            ))}
          </View>

          <ScrollView
            bounces={false}
            contentContainerStyle={[styles.scrollContent, isCompact && styles.scrollContentCompact]}
            showsVerticalScrollIndicator={false}>
            <Animated.View
              entering={FadeIn.duration(220)}
              exiting={FadeOut.duration(140)}
              key={stepIndex}
              style={styles.story}>
              <OnboardingCopy compact={isCompact} step={step} />
              <View style={styles.visualWrap}>
                <Visual />
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

function ProgressSegment({ active }: { active: boolean }) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, { duration: reduceMotion ? 1 : 220 });
  }, [active, progress, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [Palette.border, Palette.coral]),
  }));

  return <Animated.View style={[styles.progressTrack, animatedStyle]} />;
}

function OnboardingCopy({
  compact,
  step,
  style,
}: {
  compact: boolean;
  step: (typeof steps)[number];
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.copyBlock, style]}>
      <Text style={styles.eyebrow}>{step.eyebrow}</Text>
      <Text style={[styles.title, compact && styles.titleCompact]}>{step.title}</Text>
      <Text style={styles.description}>{step.description}</Text>
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Spacing.three,
    paddingTop: Spacing.five,
  },
  scrollContentCompact: {
    paddingTop: Spacing.four,
  },
  story: {
    flex: 1,
  },
  visualWrap: {
    flex: 1,
    marginTop: Spacing.five,
    width: '100%',
  },
  copyBlock: {
    alignItems: 'flex-start',
  },
  eyebrow: {
    color: Palette.coralDark,
    fontFamily: Fonts.bold,
    fontSize: 13,
  },
  title: {
    color: Palette.ink,
    fontFamily: Fonts.extrabold,
    fontSize: 29,
    letterSpacing: -1.1,
    lineHeight: 34,
    marginTop: Spacing.two,
    maxWidth: 410,
  },
  titleCompact: {
    fontSize: 27,
    lineHeight: 32,
  },
  description: {
    color: Palette.inkMuted,
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    marginTop: Spacing.two,
    maxWidth: 430,
  },
  roleSection: {
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  rolePrompt: {
    color: Palette.ink,
    fontFamily: Fonts.bold,
    fontSize: 12,
  },
  roleRow: {
    backgroundColor: Palette.surfaceMuted,
    borderRadius: Radius.medium,
    flexDirection: 'row',
    gap: 3,
    padding: 4,
  },
  roleChip: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: Spacing.two,
  },
  roleChipSelected: {
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
  },
  roleText: {
    color: Palette.inkMuted,
    fontFamily: Fonts.semibold,
    fontSize: 11,
    textAlign: 'center',
  },
  roleTextSelected: {
    color: Palette.ink,
  },
  actionBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
    paddingBottom: Platform.OS === 'android' ? Spacing.four : Spacing.two,
    paddingTop: Spacing.two,
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
    height: 58,
    justifyContent: 'center',
    paddingHorizontal: 56,
    position: 'relative',
  },
  primaryButtonPressed: {
    opacity: 0.82,
  },
  primaryButtonText: {
    color: Palette.surface,
    fontFamily: Fonts.bold,
    fontSize: 16,
    textAlign: 'center',
  },
  primaryButtonIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(27,28,25,0.14)',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    position: 'absolute',
    right: 7,
    width: 40,
  },
  buttonPressed: {
    opacity: 0.64,
  },
});
