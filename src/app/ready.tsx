import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeatIcon } from '@/components/heat-icon';
import { Fonts, MaxContentWidth, Palette, Radius, Spacing } from '@/constants/theme';

const icons = {
  back: { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' },
  coach: { ios: 'person.3.fill', android: 'groups', web: 'groups' },
  trainer: { ios: 'cross.case.fill', android: 'medical_services', web: 'medical_services' },
  athlete: { ios: 'figure.run', android: 'directions_run', web: 'directions_run' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
} as const;

type ReadyRole = 'Coach' | 'Athletic trainer' | 'Athlete';
type IconName = ComponentProps<typeof HeatIcon>['name'];

type RoleSetup = {
  body: string;
  button: string;
  colors: readonly [string, string, ...string[]];
  dashboardRole: 'coach' | 'trainer' | 'athlete';
  icon: IconName;
  kicker: string;
  previewDetail: string;
  previewLabel: string;
  previewUnit: string;
  previewValue: string;
  steps: { detail: string; label: string; optional?: boolean }[];
  title: string;
};

const setupByRole: Record<ReadyRole, RoleSetup> = {
  Coach: {
    body: 'Connect the school, sport, and current UIL plan before the first outdoor practice.',
    button: 'Enter coach workspace',
    colors: ['#F6A35A', '#FFD28C', '#FFF2D7'],
    dashboardRole: 'coach',
    icon: icons.coach,
    kicker: 'Coach setup',
    previewDetail: 'WBGT plan and live roster',
    previewLabel: 'Team view preview',
    previewUnit: 'athletes',
    previewValue: '24',
    steps: [
      { label: 'Confirm school and sport', detail: 'Liberty High School · varsity soccer' },
      { label: 'Choose the UIL activity class', detail: 'Controls work, rest, water, and equipment guidance' },
      { label: 'Invite staff and athletes', detail: 'Share a team code when you are ready', optional: true },
    ],
    title: 'Set up the team view.',
  },
  'Athletic trainer': {
    body: 'Prepare the sideline response view and decide who can share optional wristband signals.',
    button: 'Enter trainer workspace',
    colors: ['#E86C5D', '#F5A897', '#FCE8DF'],
    dashboardRole: 'trainer',
    icon: icons.trainer,
    kicker: 'Athletic trainer setup',
    previewDetail: 'Prioritized for human review',
    previewLabel: 'Sideline queue preview',
    previewUnit: 'active reviews',
    previewValue: '2',
    steps: [
      { label: 'Confirm school access', detail: 'Liberty High School athletics' },
      { label: 'Review the emergency action plan', detail: 'Contacts, cooling location, and response roles' },
      { label: 'Set athlete data permissions', detail: 'Wristband sharing stays optional', optional: true },
    ],
    title: 'Prepare your sideline tools.',
  },
  Athlete: {
    body: 'Join your team’s heat-safety plan. Personal wristband signals are optional and never replace WBGT guidance.',
    button: 'Enter athlete view',
    colors: ['#75B99C', '#B8DDC7', '#F2EBD9'],
    dashboardRole: 'athlete',
    icon: icons.athlete,
    kicker: 'Athlete setup',
    previewDetail: 'Team plan works without a band',
    previewLabel: 'Practice view preview',
    previewUnit: 'WBGT example',
    previewValue: '84°',
    steps: [
      { label: 'Join your team', detail: 'Enter the code from your coach' },
      { label: 'Review sharing choices', detail: 'You control optional personal signal access' },
      { label: 'Pair a HeatSense Band', detail: 'Adds personal trends to the team plan', optional: true },
    ],
    title: 'Get your practice view ready.',
  },
};

export default function ReadyScreen() {
  const router = useRouter();
  const { role = 'Coach' } = useLocalSearchParams<{ role?: string }>();
  const normalizedRole: ReadyRole = role === 'Athlete' || role === 'Athletic trainer' ? role : 'Coach';
  const setup = setupByRole[normalizedRole];

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.shell}>
          <Pressable
            accessibilityLabel="Back to onboarding"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}>
            <HeatIcon name={icons.back} size={23} tintColor={Palette.ink} />
          </Pressable>

          <View style={styles.content}>
            <Text style={styles.kicker}>{setup.kicker}</Text>
            <Text style={styles.title}>{setup.title}</Text>
            <Text style={styles.body}>{setup.body}</Text>

            <LinearGradient colors={setup.colors} style={styles.preview}>
              <View style={styles.previewTopline}>
                <Text style={styles.previewLabel}>{setup.previewLabel}</Text>
                <HeatIcon name={setup.icon} size={24} tintColor={Palette.ink} />
              </View>
              <View style={styles.previewMetric}>
                <Text style={styles.previewValue}>{setup.previewValue}</Text>
                <Text style={styles.previewUnit}>{setup.previewUnit}</Text>
              </View>
              <Text style={styles.previewDetail}>{setup.previewDetail}</Text>
            </LinearGradient>

            <View style={styles.setupHeading}>
              <Text style={styles.setupTitle}>Before you start</Text>
              <Text style={styles.setupTime}>About 2 minutes</Text>
            </View>
            <View style={styles.setupList}>
              {setup.steps.map((step, index) => (
                <ReadyRow
                  detail={step.detail}
                  index={index + 1}
                  key={step.label}
                  label={step.label}
                  last={index === setup.steps.length - 1}
                  optional={step.optional}
                />
              ))}
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace(`/dashboard?role=${setup.dashboardRole}` as never)}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
            <Text style={styles.buttonText}>{setup.button}</Text>
            <HeatIcon name={icons.check} size={18} tintColor={Palette.surface} />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

function ReadyRow({ detail, index, label, last, optional }: { detail: string; index: number; label: string; last: boolean; optional?: boolean }) {
  return (
    <View style={[styles.setupRow, last && styles.setupRowLast]}>
      <Text style={styles.stepNumber}>{String(index).padStart(2, '0')}</Text>
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDetail}>{detail}</Text>
      </View>
      <Text style={optional ? styles.optionalText : styles.requiredText}>{optional ? 'Optional' : 'Required'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: Palette.canvas, flex: 1 },
  safeArea: { flex: 1 },
  shell: { alignSelf: 'center', flex: 1, maxWidth: MaxContentWidth, paddingHorizontal: Spacing.five, paddingVertical: Spacing.three, width: '100%' },
  backButton: { alignItems: 'center', backgroundColor: Palette.surface, borderColor: Palette.border, borderRadius: 24, borderWidth: 1, height: 48, justifyContent: 'center', width: 48 },
  content: { flex: 1, paddingTop: Spacing.six },
  kicker: { color: Palette.coralDark, fontFamily: Fonts.bold, fontSize: 12 },
  title: { color: Palette.ink, fontFamily: Fonts.extrabold, fontSize: 31, letterSpacing: -1.1, lineHeight: 36, marginTop: Spacing.two, maxWidth: 430 },
  body: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 13, lineHeight: 19, marginTop: Spacing.three, maxWidth: 430 },
  preview: { borderRadius: Radius.large, marginTop: Spacing.five, minHeight: 142, overflow: 'hidden', padding: Spacing.four },
  previewTopline: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  previewLabel: { color: 'rgba(27,28,25,0.72)', fontFamily: Fonts.semibold, fontSize: 10 },
  previewMetric: { alignItems: 'flex-end', flexDirection: 'row', marginTop: Spacing.three },
  previewValue: { color: Palette.ink, fontFamily: Fonts.extrabold, fontSize: 45, letterSpacing: -2, lineHeight: 47 },
  previewUnit: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 11, marginBottom: 7, marginLeft: 7 },
  previewDetail: { color: 'rgba(27,28,25,0.72)', fontFamily: Fonts.semibold, fontSize: 10, marginTop: 2 },
  setupHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.five },
  setupTitle: { color: Palette.ink, fontFamily: Fonts.bold, fontSize: 16 },
  setupTime: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 10 },
  setupList: { borderBottomColor: Palette.border, borderBottomWidth: 1, borderTopColor: Palette.border, borderTopWidth: 1, marginTop: Spacing.three },
  setupRow: { alignItems: 'center', borderBottomColor: Palette.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: Spacing.three, minHeight: 67, paddingVertical: Spacing.two },
  setupRowLast: { borderBottomWidth: 0 },
  stepNumber: { color: Palette.coralDark, fontFamily: Fonts.bold, fontSize: 10, width: 20 },
  rowCopy: { flex: 1 },
  rowLabel: { color: Palette.ink, fontFamily: Fonts.semibold, fontSize: 12 },
  rowDetail: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 9, lineHeight: 13, marginTop: 3 },
  requiredText: { color: Palette.ink, fontFamily: Fonts.semibold, fontSize: 9 },
  optionalText: { color: Palette.inkMuted, fontFamily: Fonts.medium, fontSize: 9 },
  button: { alignItems: 'center', backgroundColor: Palette.ink, borderRadius: Radius.pill, flexDirection: 'row', gap: Spacing.two, height: 54, justifyContent: 'center' },
  buttonText: { color: Palette.surface, fontFamily: Fonts.bold, fontSize: 14 },
  buttonPressed: { opacity: 0.7 },
});
