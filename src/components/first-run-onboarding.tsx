import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ComponentProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { HeatIcon } from '@/components/heat-icon';
import { Fonts, MaxContentWidth, Palette, Radius, Spacing } from '@/constants/theme';

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? 'GOOGLE_CLIENT_ID_REQUIRED';
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? 'GOOGLE_CLIENT_ID_REQUIRED';
const GOOGLE_PLATFORM_CLIENT_ID = Platform.OS === 'web' ? GOOGLE_WEB_CLIENT_ID : GOOGLE_CLIENT_ID;

const steps = [
  'welcome',
  'auth',
  'identity',
  'role',
  'context',
  'risk',
  'plan',
  'signals',
  'alerts',
  'ready',
] as const;

type Role = 'Coach' | 'Athletic trainer' | 'Athlete';
type IconName = ComponentProps<typeof HeatIcon>['name'];

const icons = {
  alert: { ios: 'bell.badge.fill', android: 'notifications_active', web: 'notifications_active' },
  athlete: { ios: 'figure.run', android: 'directions_run', web: 'directions_run' },
  back: { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  clock: { ios: 'clock.fill', android: 'schedule', web: 'schedule' },
  coach: { ios: 'person.3.fill', android: 'groups', web: 'groups' },
  droplet: { ios: 'drop.fill', android: 'water_drop', web: 'water_drop' },
  forward: { ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' },
  heart: { ios: 'heart.fill', android: 'favorite', web: 'favorite' },
  movement: { ios: 'figure.run', android: 'directions_run', web: 'directions_run' },
  sun: { ios: 'sun.max.fill', android: 'sunny', web: 'sunny' },
  thermometer: { ios: 'thermometer.medium', android: 'device_thermostat', web: 'device_thermostat' },
  trainer: { ios: 'cross.case.fill', android: 'medical_services', web: 'medical_services' },
} as const;

const roleRoutes: Record<Role, 'coach' | 'trainer' | 'athlete'> = {
  Coach: 'coach',
  'Athletic trainer': 'trainer',
  Athlete: 'athlete',
};

export default function FirstRunOnboarding() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string; step?: string }>();
  const requestedStep = Number.parseInt(params.step ?? '1', 10) - 1;
  const initialStep = Number.isFinite(requestedStep)
    ? Math.max(0, Math.min(requestedStep, steps.length - 1))
    : 0;
  const initialRole: Role =
    params.role === 'Athlete' || params.role === 'Athletic trainer' ? params.role : 'Coach';

  const [stepIndex, setStepIndex] = useState(initialStep);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<Role>(initialRole);
  const [organization, setOrganization] = useState('');
  const [sport, setSport] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [appleAvailable, setAppleAvailable] = useState(false);

  const [googleRequest, googleResponse, promptGoogle] = Google.useAuthRequest({
    iosClientId: GOOGLE_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
  });

  const step = steps[stepIndex];
  const isWelcome = step === 'welcome';
  const canContinue = useMemo(() => {
    if (step === 'identity') return firstName.trim().length > 0 && lastName.trim().length > 0;
    if (step === 'context') return organization.trim().length > 0;
    return true;
  }, [firstName, lastName, organization, step]);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => setAppleAvailable(false));
  }, []);

  useEffect(() => {
    if (googleResponse?.type !== 'success') return;

    const accessToken = googleResponse.authentication?.accessToken ?? googleResponse.params.access_token;
    if (!accessToken) return;

    fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((response) => response.json())
      .then((profile: { given_name?: string; family_name?: string }) => {
        if (profile.given_name) setFirstName(profile.given_name);
        if (profile.family_name) setLastName(profile.family_name);
        setAuthMessage('Signed in with Google');
        setStepIndex(2);
      })
      .catch(() => setAuthMessage('Google sign-in finished, but the profile could not be loaded.'));
  }, [googleResponse]);

  function goBack() {
    setStepIndex((current) => Math.max(0, current - 1));
  }

  function goForward() {
    if (!canContinue) return;
    if (step === 'ready') {
      router.replace(`/dashboard?role=${roleRoutes[role]}&tab=home` as never);
      return;
    }
    setStepIndex((current) => Math.min(steps.length - 1, current + 1));
  }

  async function signInWithApple() {
    try {
      setAuthMessage('');
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (credential.fullName?.givenName) setFirstName(credential.fullName.givenName);
      if (credential.fullName?.familyName) setLastName(credential.fullName.familyName);
      setAuthMessage('Signed in with Apple');
      setStepIndex(2);
    } catch (error) {
      if ((error as { code?: string }).code !== 'ERR_REQUEST_CANCELED') {
        setAuthMessage('Apple sign-in could not be completed. Try again.');
      }
    }
  }

  async function signInWithGoogle() {
    if (GOOGLE_PLATFORM_CLIENT_ID === 'GOOGLE_CLIENT_ID_REQUIRED') {
      setAuthMessage(`Add EXPO_PUBLIC_GOOGLE_${Platform.OS === 'web' ? 'WEB' : 'IOS'}_CLIENT_ID to enable Google sign-in.`);
      return;
    }
    setAuthMessage('');
    await promptGoogle();
  }

  return (
    <View style={[styles.screen, isWelcome && styles.welcomeScreen]}>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        {isWelcome ? (
          <WelcomeScreen onContinue={goForward} />
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.safeArea}>
            <View style={styles.shell}>
              <OnboardingHeader onBack={goBack} step={stepIndex + 1} />
              <ScrollView
                bounces={false}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                {step === 'auth' ? (
                  <AuthStep
                    appleAvailable={appleAvailable}
                    googleDisabled={!googleRequest || GOOGLE_PLATFORM_CLIENT_ID === 'GOOGLE_CLIENT_ID_REQUIRED'}
                    message={authMessage}
                    onApple={signInWithApple}
                    onDemo={goForward}
                    onGoogle={signInWithGoogle}
                  />
                ) : null}
                {step === 'identity' ? (
                  <IdentityStep
                    firstName={firstName}
                    lastName={lastName}
                    onFirstName={setFirstName}
                    onLastName={setLastName}
                  />
                ) : null}
                {step === 'role' ? <RoleStep onChange={setRole} value={role} /> : null}
                {step === 'context' ? (
                  <ContextStep
                    onOrganization={setOrganization}
                    onSport={setSport}
                    organization={organization}
                    role={role}
                    sport={sport}
                  />
                ) : null}
                {step === 'risk' ? <RiskStep /> : null}
                {step === 'plan' ? <PlanStep /> : null}
                {step === 'signals' ? <SignalsStep /> : null}
                {step === 'alerts' ? <AlertsStep /> : null}
                {step === 'ready' ? (
                  <ReadyStep firstName={firstName} organization={organization} role={role} />
                ) : null}
              </ScrollView>
              {step !== 'auth' ? (
                <PrimaryButton
                  disabled={!canContinue}
                  label={step === 'ready' ? 'Enter HeatSense' : 'Continue'}
                  onPress={goForward}
                />
              ) : null}
            </View>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </View>
  );
}

function WelcomeScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <View style={styles.welcomeShell}>
      <View style={styles.welcomeBrand}>
        <Image contentFit="cover" source={require('../../assets/images/heatsense-app-icon.png')} style={styles.logoLarge} />
        <Text style={styles.welcomeBrandName}>HeatSense</Text>
      </View>
      <HeatFieldVisual />
      <View style={styles.welcomeCopy}>
        <Text style={styles.welcomeTitle}>Make every practice heat-ready.</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onContinue}
        style={({ pressed }) => [styles.welcomeButton, pressed && styles.pressed]}>
        <Text style={styles.welcomeButtonText}>Set up HeatSense</Text>
        <View style={styles.welcomeButtonIcon}>
          <HeatIcon name={icons.forward} size={20} tintColor={Palette.surface} />
        </View>
      </Pressable>
      <Text style={styles.welcomePrivacy}>
        By continuing, you agree to the Terms of Use and acknowledge the Privacy Policy.
      </Text>
    </View>
  );
}

function HeatFieldVisual() {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = reducedMotion ? 1 : withTiming(1, { duration: 700 });
  }, [progress, reducedMotion]);

  const revealStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * 18 },
      { scale: 0.96 + progress.value * 0.04 },
    ],
  }));

  return (
    <View accessibilityElementsHidden style={styles.heatVisualStage}>
      <Animated.View shouldRasterizeIOS style={[styles.heatVisual, revealStyle]}>
        <Svg height="100%" viewBox="0 0 360 360" width="100%">
          <Circle cx="252" cy="128" fill="#F06F5F" r="112" />
          <Path
            d="M2 232 C64 196 118 194 172 226 C229 260 289 261 358 218 L358 360 L2 360 Z"
            fill="#10110F"
          />
          <Path
            d="M12 231 C72 197 120 200 172 230 C228 263 292 261 350 224"
            fill="none"
            stroke="#F7F8F4"
            strokeLinecap="round"
            strokeWidth="6"
          />
          <Path
            d="M22 279 C83 247 128 249 180 278 C235 308 290 306 342 276"
            fill="none"
            stroke="#FFA471"
            strokeLinecap="round"
            strokeWidth="5"
          />
          <Path
            d="M48 322 C103 298 143 299 188 322 C236 346 278 345 318 326"
            fill="none"
            opacity="0.72"
            stroke="#F06F5F"
            strokeLinecap="round"
            strokeWidth="4"
          />
          <Path
            d="M35 118 C77 87 117 87 154 112"
            fill="none"
            stroke="#10110F"
            strokeLinecap="round"
            strokeWidth="5"
          />
          <Path
            d="M17 157 C73 117 119 119 163 151"
            fill="none"
            opacity="0.38"
            stroke="#10110F"
            strokeLinecap="round"
            strokeWidth="3"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

/*
 * The welcome illustration deliberately stays abstract: the upper disk is heat,
 * the lower contour is the field, and the crossing lines read as changing
 * conditions. It avoids tying HeatSense to one sport, athlete, or body type.
 */

function OnboardingHeader({ onBack, step }: { onBack: () => void; step: number }) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        hitSlop={8}
        onPress={onBack}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
        <HeatIcon name={icons.back} size={22} tintColor={Palette.ink} />
      </Pressable>
      <View style={styles.brandLockup}>
        <Image contentFit="cover" source={require('../../assets/images/heatsense-app-icon.png')} style={styles.logoSmall} />
        <Text style={styles.brandName}>HeatSense</Text>
      </View>
      <Text style={styles.stepCount}>{step} of {steps.length}</Text>
    </View>
  );
}

function AuthStep({
  appleAvailable,
  googleDisabled,
  message,
  onApple,
  onDemo,
  onGoogle,
}: {
  appleAvailable: boolean;
  googleDisabled: boolean;
  message: string;
  onApple: () => void;
  onDemo: () => void;
  onGoogle: () => void;
}) {
  return (
    <View style={styles.content}>
      <QuestionCopy
        body="Sign in once so your role, team, and safety preferences follow you across devices."
        title="Your sideline starts with an account."
      />
      <View style={styles.authActions}>
        {appleAvailable ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            cornerRadius={14}
            onPress={onApple}
            style={styles.appleButton}
          />
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={googleDisabled}
          onPress={onGoogle}
          style={({ pressed }) => [
            styles.googleButton,
            googleDisabled && styles.disabled,
            pressed && styles.pressed,
          ]}>
          <Text style={styles.googleMark}>G</Text>
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </Pressable>
      </View>
      {message ? <Text style={styles.authMessage}>{message}</Text> : null}
      <View style={styles.authAside}>
        <Text style={styles.authAsideTitle}>Reviewing the prototype?</Text>
        <Pressable accessibilityRole="button" onPress={onDemo}>
          <Text style={styles.demoLink}>Continue with demo setup</Text>
        </Pressable>
      </View>
      <Text style={styles.legalCopy}>
        Continuing means you agree to the Terms and acknowledge the Privacy Policy. HeatSense only requests your name and email from a sign-in provider.
      </Text>
    </View>
  );
}

function IdentityStep({
  firstName,
  lastName,
  onFirstName,
  onLastName,
}: {
  firstName: string;
  lastName: string;
  onFirstName: (value: string) => void;
  onLastName: (value: string) => void;
}) {
  return (
    <View style={styles.content}>
      <QuestionCopy
        body="This is how you’ll appear to coaches, athletic trainers, and teammates you connect with."
        title="What should your team call you?"
      />
      <View style={styles.formBlock}>
        <RuledInput
          autoComplete="given-name"
          label="First name"
          onChangeText={onFirstName}
          returnKeyType="next"
          value={firstName}
        />
        <RuledInput
          autoComplete="family-name"
          label="Last name"
          onChangeText={onLastName}
          returnKeyType="done"
          value={lastName}
        />
      </View>
      <ReasonNote text="Why we ask: alerts and team views must identify the right person clearly." />
    </View>
  );
}

function RoleStep({ onChange, value }: { onChange: (role: Role) => void; value: Role }) {
  const choices: { detail: string; icon: IconName; value: Role }[] = [
    { detail: 'Plan practice and oversee the roster', icon: icons.coach, value: 'Coach' },
    { detail: 'Review signals and coordinate response', icon: icons.trainer, value: 'Athletic trainer' },
    { detail: 'See your practice plan and personal trends', icon: icons.athlete, value: 'Athlete' },
  ];

  return (
    <View style={styles.content}>
      <QuestionCopy
        body="Your answer changes the tools and information we place first. You can change roles later."
        title="How will you use HeatSense?"
      />
      <View accessibilityRole="radiogroup" style={styles.choiceList}>
        {choices.map((choice) => {
          const selected = choice.value === value;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              key={choice.value}
              onPress={() => onChange(choice.value)}
              style={({ pressed }) => [styles.choiceRow, pressed && styles.choiceRowPressed]}>
              <HeatIcon name={choice.icon} size={24} tintColor={selected ? Palette.coralDark : Palette.inkMuted} />
              <View style={styles.choiceCopy}>
                <Text style={styles.choiceTitle}>{choice.value}</Text>
                <Text style={styles.choiceDetail}>{choice.detail}</Text>
              </View>
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ContextStep({
  onOrganization,
  onSport,
  organization,
  role,
  sport,
}: {
  onOrganization: (value: string) => void;
  onSport: (value: string) => void;
  organization: string;
  role: Role;
  sport: string;
}) {
  const title = role === 'Athlete' ? 'Where do you practice?' : 'Which program are you supporting?';
  const organizationLabel = role === 'Athlete' ? 'School or team' : 'School or organization';

  return (
    <View style={styles.content}>
      <QuestionCopy
        body="We use this to connect the correct heat policy, team, and shared practice plan."
        title={title}
      />
      <View style={styles.formBlock}>
        <RuledInput
          autoCapitalize="words"
          label={organizationLabel}
          onChangeText={onOrganization}
          returnKeyType="next"
          value={organization}
        />
        <RuledInput
          autoCapitalize="words"
          label="Primary sport or activity (optional)"
          onChangeText={onSport}
          returnKeyType="done"
          value={sport}
        />
      </View>
      <ReasonNote text="Invite codes and athlete consent come later, when you actually join a team." />
    </View>
  );
}

function RiskStep() {
  return (
    <View style={styles.content}>
      <QuestionCopy
        body="HeatSense starts with a field reading and turns it into the risk zone your program follows."
        title="Know the field before practice starts."
      />
      <View style={styles.riskVisual}>
        <View style={styles.riskTopline}>
          <Text style={styles.visualLabel}>Sample field reading</Text>
          <HeatIcon name={icons.sun} size={25} tintColor={Palette.warning} />
        </View>
        <View style={styles.riskMetricRow}>
          <Text style={styles.riskNumber}>84</Text>
          <View>
            <Text style={styles.riskUnit}>°F WBGT</Text>
            <Text style={styles.riskZone}>Orange zone</Text>
          </View>
        </View>
        <Svg height="95" viewBox="0 0 340 95" width="100%">
          <Path d="M3 70 C43 58 62 75 97 54 S153 33 183 52 S238 78 277 48 S319 34 337 26" fill="none" stroke={Palette.warning} strokeLinecap="round" strokeWidth="4" />
          <Circle cx="337" cy="26" fill={Palette.canvas} r="7" stroke={Palette.warning} strokeWidth="4" />
        </Svg>
        <Text style={styles.visualFootnote}>Updated readings keep the plan tied to current conditions.</Text>
      </View>
    </View>
  );
}

function PlanStep() {
  const rows = [
    { icon: icons.clock, label: 'Work / rest', value: '20 / 10 min' },
    { icon: icons.droplet, label: 'Water', value: 'Every 10 min' },
    { icon: icons.athlete, label: 'Equipment', value: 'Remove in breaks' },
  ];

  return (
    <View style={styles.content}>
      <QuestionCopy
        body="The zone becomes a plan your staff can scan while practice is moving."
        title="Turn one reading into the next right action."
      />
      <View style={styles.planList}>
        {rows.map((row, index) => (
          <View key={row.label} style={styles.planRow}>
            <Text style={styles.planIndex}>0{index + 1}</Text>
            <HeatIcon name={row.icon} size={21} tintColor={Palette.coralDark} />
            <View style={styles.planCopy}>
              <Text style={styles.planLabel}>{row.label}</Text>
              <Text style={styles.planValue}>{row.value}</Text>
            </View>
          </View>
        ))}
      </View>
      <Text style={styles.productPrinciple}>Field guidance works whether or not anyone wears a HeatSense Band.</Text>
    </View>
  );
}

function SignalsStep() {
  const signals = [
    { icon: icons.heart, label: 'Recovery' },
    { icon: icons.thermometer, label: 'Skin trend' },
    { icon: icons.droplet, label: 'Sweat response' },
    { icon: icons.movement, label: 'Movement' },
  ];

  return (
    <View style={styles.content}>
      <QuestionCopy
        body="An optional wristband compares four signals with the athlete’s own baseline—not somebody else’s threshold."
        title="Personal context, without pretending to diagnose."
      />
      <View style={styles.signalPlot}>
        <Svg height="125" viewBox="0 0 340 125" width="100%">
          <Path d="M3 82 C34 78 55 40 84 68 S130 102 160 61 S207 30 236 67 S291 96 337 45" fill="none" stroke={Palette.coral} strokeLinecap="round" strokeWidth="5" />
          <Path d="M3 92 C40 89 73 86 111 84 S181 82 229 77 S301 68 337 64" fill="none" opacity="0.35" stroke={Palette.inkMuted} strokeDasharray="6 8" strokeWidth="2" />
        </Svg>
        <Text style={styles.baselineLabel}>Personal baseline</Text>
      </View>
      <View style={styles.signalLegend}>
        {signals.map((signal) => (
          <View key={signal.label} style={styles.signalItem}>
            <HeatIcon name={signal.icon} size={19} tintColor={Palette.coralDark} />
            <Text style={styles.signalLabel}>{signal.label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.productPrinciple}>Movement explains whether a rising heart rate happened during work or while recovery stalled.</Text>
    </View>
  );
}

function AlertsStep() {
  const levels = [
    { label: 'Normal', note: 'Continue the plan', tone: Palette.safe },
    { label: 'Caution', note: 'Watch the next recovery', tone: Palette.caution },
    { label: 'Warning', note: 'Find and assess the athlete', tone: Palette.warning },
    { label: 'Emergency', note: 'Start the emergency action plan', tone: Palette.emergency },
  ];

  return (
    <View style={styles.content}>
      <QuestionCopy
        body="Every alert says what changed and what the responsible adult should do next."
        title="Make rising risk difficult to miss."
      />
      <View style={styles.alertList}>
        {levels.map((level) => (
          <View key={level.label} style={styles.alertRow}>
            <View style={[styles.alertRule, { backgroundColor: level.tone }]} />
            <View style={styles.alertCopy}>
              <Text style={styles.alertLabel}>{level.label}</Text>
              <Text style={styles.alertNote}>{level.note}</Text>
            </View>
            {level.label === 'Warning' ? <HeatIcon name={icons.alert} size={21} tintColor={level.tone} /> : null}
          </View>
        ))}
      </View>
      <Text style={styles.productPrinciple}>Collapse detection goes directly to Emergency. A human still assesses and responds.</Text>
    </View>
  );
}

function ReadyStep({ firstName, organization, role }: { firstName: string; organization: string; role: Role }) {
  const name = firstName.trim() || 'Your';
  return (
    <View style={styles.content}>
      <QuestionCopy
        body="Your field plan works immediately. Team invitations, permissions, and optional band pairing appear only when you need them."
        title={`${name}'s HeatSense is ready.`}
      />
      <View style={styles.reviewList}>
        <ReviewRow label="Workspace" value={role} />
        <ReviewRow label="Program" value={organization.trim() || 'Add later'} />
        <ReviewRow label="Wristband" value="Optional" />
      </View>
      <View style={styles.readyStatement}>
        <HeatIcon name={icons.check} size={25} tintColor={Palette.safe} />
        <Text style={styles.readyStatementText}>WBGT guidance stays primary in every workspace.</Text>
      </View>
    </View>
  );
}

function QuestionCopy({ body, title }: { body: string; title: string }) {
  return (
    <View style={styles.questionCopy}>
      <Text style={styles.questionTitle}>{title}</Text>
      <Text style={styles.questionBody}>{body}</Text>
    </View>
  );
}

function RuledInput({ label, ...props }: { label: string } & ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={Palette.inkMuted}
        selectionColor={Palette.coral}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

function ReasonNote({ text }: { text: string }) {
  return (
    <View style={styles.reasonNote}>
      <View style={styles.reasonLine} />
      <Text style={styles.reasonText}>{text}</Text>
    </View>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.reviewValue}>{value}</Text>
    </View>
  );
}

function PrimaryButton({ disabled, label, onPress }: { disabled?: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, disabled && styles.primaryButtonDisabled, pressed && styles.pressed]}>
      <Text style={styles.primaryButtonText}>{label}</Text>
      <HeatIcon name={icons.forward} size={19} tintColor={Palette.surface} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: Palette.canvas, flex: 1 },
  welcomeScreen: { backgroundColor: '#F7F8F4' },
  safeArea: { flex: 1 },
  shell: { alignSelf: 'center', flex: 1, maxWidth: MaxContentWidth, paddingHorizontal: Spacing.five, width: '100%' },
  scrollContent: { flexGrow: 1, paddingBottom: Spacing.five },
  content: { flex: 1, paddingTop: Spacing.seven },
  header: { alignItems: 'center', flexDirection: 'row', minHeight: 60 },
  backButton: { alignItems: 'center', height: 44, justifyContent: 'center', marginLeft: -10, width: 44 },
  brandLockup: { alignItems: 'center', flexDirection: 'row', gap: 9, marginLeft: 3 },
  logoSmall: { borderRadius: 9, height: 32, width: 32 },
  brandName: { color: Palette.ink, fontFamily: Fonts.extrabold, fontSize: 17, letterSpacing: -0.5 },
  stepCount: { color: Palette.inkMuted, fontFamily: Fonts.semibold, fontSize: 12, marginLeft: 'auto' },
  welcomeShell: { alignSelf: 'center', flex: 1, maxWidth: MaxContentWidth, paddingHorizontal: Spacing.five, paddingBottom: Spacing.four, width: '100%' },
  welcomeBrand: { alignItems: 'center', flexDirection: 'row', gap: 11, minHeight: 62 },
  logoLarge: { borderRadius: 12, height: 42, width: 42 },
  welcomeBrandName: { color: '#10110F', fontFamily: Fonts.extrabold, fontSize: 21, letterSpacing: -0.7 },
  heatVisualStage: { flex: 1, justifyContent: 'center', minHeight: 360, overflow: 'hidden' },
  heatVisual: { height: 360, marginHorizontal: -Spacing.five },
  welcomeCopy: { justifyContent: 'flex-end', minHeight: 150, paddingBottom: Spacing.six },
  welcomeTitle: { color: '#10110F', fontFamily: Fonts.extrabold, fontSize: 48, letterSpacing: -2.1, lineHeight: 51, maxWidth: 380, textAlign: 'left' },
  welcomeButton: { alignItems: 'center', backgroundColor: '#10110F', borderRadius: Radius.pill, flexDirection: 'row', height: 60, justifyContent: 'center', paddingHorizontal: Spacing.five, position: 'relative' },
  welcomeButtonIcon: { position: 'absolute', right: Spacing.five },
  welcomeButtonText: { color: Palette.surface, fontFamily: Fonts.bold, fontSize: 19 },
  welcomePrivacy: { color: '#696C66', fontFamily: Fonts.medium, fontSize: 10, lineHeight: 15, paddingHorizontal: Spacing.three, paddingTop: Spacing.three, textAlign: 'center' },
  questionCopy: { maxWidth: 450 },
  questionTitle: { color: Palette.ink, fontFamily: Fonts.extrabold, fontSize: 34, letterSpacing: -1.25, lineHeight: 39 },
  questionBody: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 14, lineHeight: 21, marginTop: Spacing.three, maxWidth: 430 },
  authActions: { gap: Spacing.three, marginTop: Spacing.eight },
  appleButton: { height: 54, width: '100%' },
  googleButton: { alignItems: 'center', backgroundColor: Palette.surface, borderColor: Palette.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', height: 54, justifyContent: 'center', position: 'relative' },
  googleMark: { color: '#4285F4', fontFamily: Fonts.bold, fontSize: 19, left: 18, position: 'absolute' },
  googleButtonText: { color: Palette.ink, fontFamily: Fonts.semibold, fontSize: 15 },
  authMessage: { color: Palette.coralDark, fontFamily: Fonts.semibold, fontSize: 11, lineHeight: 16, marginTop: Spacing.three },
  authAside: { borderTopColor: Palette.border, borderTopWidth: 1, marginTop: Spacing.eight, paddingTop: Spacing.five },
  authAsideTitle: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 12 },
  demoLink: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 14, marginTop: Spacing.two, textDecorationLine: 'underline' },
  legalCopy: { color: Palette.inkMuted, fontFamily: Fonts.regular, fontSize: 10, lineHeight: 15, marginTop: Spacing.five },
  formBlock: { marginTop: Spacing.eight },
  inputGroup: { borderBottomColor: Palette.ink, borderBottomWidth: 1, marginBottom: Spacing.six, paddingBottom: 7 },
  inputLabel: { color: Palette.inkMuted, fontFamily: Fonts.semibold, fontSize: 11, marginBottom: 3 },
  input: { color: Palette.ink, fontFamily: Fonts.semibold, fontSize: 21, minHeight: 40, padding: 0 },
  reasonNote: { alignItems: 'flex-start', flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.four, maxWidth: 400 },
  reasonLine: { backgroundColor: Palette.coral, borderRadius: 2, height: 28, width: 3 },
  reasonText: { color: Palette.inkMuted, flex: 1, fontFamily: Fonts.medium, fontSize: 11, lineHeight: 16 },
  choiceList: { borderTopColor: Palette.border, borderTopWidth: 1, marginTop: Spacing.seven },
  choiceRow: { alignItems: 'center', borderBottomColor: Palette.border, borderBottomWidth: 1, flexDirection: 'row', gap: Spacing.four, minHeight: 84, paddingVertical: Spacing.three },
  choiceRowPressed: { backgroundColor: 'rgba(240,111,95,0.05)' },
  choiceCopy: { flex: 1 },
  choiceTitle: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 15 },
  choiceDetail: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 11, lineHeight: 16, marginTop: 3 },
  radio: { alignItems: 'center', borderColor: Palette.border, borderRadius: 11, borderWidth: 2, height: 22, justifyContent: 'center', width: 22 },
  radioSelected: { borderColor: Palette.coralDark },
  radioDot: { backgroundColor: Palette.coralDark, borderRadius: 5, height: 10, width: 10 },
  riskVisual: { marginTop: Spacing.seven },
  riskTopline: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  visualLabel: { color: Palette.inkMuted, fontFamily: Fonts.semibold, fontSize: 11 },
  riskMetricRow: { alignItems: 'flex-end', flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.four },
  riskNumber: { color: Palette.ink, fontFamily: Fonts.extrabold, fontSize: 92, letterSpacing: -5, lineHeight: 96 },
  riskUnit: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 14, marginBottom: 7 },
  riskZone: { color: Palette.warning, fontFamily: Fonts.extrabold, fontSize: 20, marginBottom: 9 },
  visualFootnote: { borderTopColor: Palette.border, borderTopWidth: 1, color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 11, lineHeight: 17, paddingTop: Spacing.three },
  planList: { borderTopColor: Palette.border, borderTopWidth: 1, marginTop: Spacing.seven },
  planRow: { alignItems: 'center', borderBottomColor: Palette.border, borderBottomWidth: 1, flexDirection: 'row', gap: Spacing.three, minHeight: 72 },
  planIndex: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 10, width: 22 },
  planCopy: { alignItems: 'center', flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  planLabel: { color: Palette.inkMuted, fontFamily: Fonts.semibold, fontSize: 12 },
  planValue: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 14 },
  productPrinciple: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 13, lineHeight: 19, marginTop: Spacing.five, maxWidth: 410 },
  signalPlot: { marginTop: Spacing.seven, position: 'relative' },
  baselineLabel: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 10, position: 'absolute', right: 2, top: 88 },
  signalLegend: { borderBottomColor: Palette.border, borderBottomWidth: 1, borderTopColor: Palette.border, borderTopWidth: 1, flexDirection: 'row', flexWrap: 'wrap', marginTop: Spacing.three },
  signalItem: { alignItems: 'center', flexDirection: 'row', gap: Spacing.two, minHeight: 48, width: '50%' },
  signalLabel: { color: Palette.ink, fontFamily: Fonts.semibold, fontSize: 11 },
  alertList: { borderTopColor: Palette.border, borderTopWidth: 1, marginTop: Spacing.seven },
  alertRow: { alignItems: 'center', borderBottomColor: Palette.border, borderBottomWidth: 1, flexDirection: 'row', minHeight: 70 },
  alertRule: { alignSelf: 'stretch', width: 4 },
  alertCopy: { flex: 1, paddingLeft: Spacing.four },
  alertLabel: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 14 },
  alertNote: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 10, marginTop: 3 },
  reviewList: { borderTopColor: Palette.border, borderTopWidth: 1, marginTop: Spacing.seven },
  reviewRow: { alignItems: 'center', borderBottomColor: Palette.border, borderBottomWidth: 1, flexDirection: 'row', minHeight: 66 },
  reviewLabel: { color: Palette.inkMuted, fontFamily: Fonts.semibold, fontSize: 11 },
  reviewValue: { color: Palette.ink, flex: 1, fontFamily: Fonts.bold, fontSize: 13, marginLeft: Spacing.four, textAlign: 'right' },
  readyStatement: { alignItems: 'center', flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.six },
  readyStatementText: { color: Palette.ink, flex: 1, fontFamily: Fonts.bold, fontSize: 13, lineHeight: 19 },
  primaryButton: { alignItems: 'center', backgroundColor: Palette.ink, borderRadius: Radius.pill, flexDirection: 'row', gap: Spacing.three, height: 56, justifyContent: 'center', marginBottom: Spacing.two },
  primaryButtonDisabled: { opacity: 0.28 },
  primaryButtonText: { color: Palette.surface, fontFamily: Fonts.bold, fontSize: 15 },
  pressed: { opacity: 0.68 },
  disabled: { opacity: 0.45 },
});
