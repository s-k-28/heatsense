import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeatIcon } from '@/components/heat-icon';
import { Fonts, MaxContentWidth, Palette, Radius, Spacing } from '@/constants/theme';

const icons = {
  back: { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' },
  heat: { ios: 'thermometer.sun.fill', android: 'device_thermostat', web: 'device_thermostat' },
  school: { ios: 'building.2.fill', android: 'school', web: 'school' },
  team: { ios: 'person.3.fill', android: 'groups', web: 'groups' },
  wristband: { ios: 'applewatch', android: 'watch', web: 'watch' },
} as const;

export default function ReadyScreen() {
  const router = useRouter();
  const { role = 'Coach' } = useLocalSearchParams<{ role?: string }>();

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.shell}>
          <Pressable accessibilityLabel="Back to onboarding" onPress={() => router.back()} style={styles.backButton}>
            <HeatIcon name={icons.back} size={23} tintColor={Palette.ink} />
          </Pressable>

          <View style={styles.content}>
            <Text style={styles.kicker}>{role} setup</Text>
            <Text style={styles.title}>Your HeatSense workspace starts here.</Text>
            <Text style={styles.body}>
              Finish the essentials first. Wristbands stay optional, and WBGT guidance works without them.
            </Text>

            <View style={styles.setupCard}>
              <View style={styles.setupHeader}>
                <View style={styles.brandMark}>
                  <HeatIcon
                    animationSpec={{
                      effect: { type: 'pulse', wholeSymbol: true },
                      repeatCount: 1,
                      speed: 0.7,
                    }}
                    name={icons.heat}
                    size={22}
                    tintColor={Palette.coralDark}
                  />
                </View>
                <View style={styles.setupHeaderCopy}>
                  <Text style={styles.setupTitle}>Next setup steps</Text>
                  <Text style={styles.setupSubtitle}>About two minutes</Text>
                </View>
              </View>

              <View style={styles.divider} />
              <ReadyRow detail="Required" icon={icons.school} label="Add your school" tone={Palette.warning} />
              <ReadyRow detail="Required" icon={icons.team} label="Create or join a team" tone={Palette.safe} />
              <ReadyRow detail="Optional" icon={icons.wristband} label="Pair a wristband" tone="#547A8C" />
            </View>
          </View>

          <Pressable onPress={() => router.back()} style={styles.button}>
            <Text style={styles.buttonText}>Review my choices</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

function ReadyRow({
  detail,
  icon,
  label,
  tone,
}: {
  detail: string;
  icon: ComponentProps<typeof HeatIcon>['name'];
  label: string;
  tone: string;
}) {
  return (
    <View style={styles.setupRow}>
      <View style={[styles.rowIcon, { backgroundColor: `${tone}18` }]}>
        <HeatIcon name={icon} size={18} tintColor={tone} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowDetail}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: Palette.canvas, flex: 1 },
  safeArea: { flex: 1 },
  shell: {
    alignSelf: 'center',
    flex: 1,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    width: '100%',
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderRadius: 24,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: Spacing.five,
  },
  kicker: {
    color: Palette.coralDark,
    fontFamily: Fonts.bold,
    fontSize: 13,
  },
  title: {
    color: Palette.ink,
    fontFamily: Fonts.extrabold,
    fontSize: 31,
    letterSpacing: -1.1,
    lineHeight: 37,
    marginTop: Spacing.two,
    maxWidth: 430,
  },
  body: {
    color: Palette.inkMuted,
    fontFamily: Fonts.medium,
    fontSize: 15,
    lineHeight: 23,
    marginTop: Spacing.four,
    maxWidth: 430,
  },
  setupCard: {
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderRadius: Radius.large,
    borderWidth: 1,
    marginTop: Spacing.seven,
    padding: Spacing.five,
  },
  setupHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: Palette.coralSoft,
    borderRadius: 17,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  setupHeaderCopy: {
    flex: 1,
  },
  setupTitle: {
    color: Palette.ink,
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
  setupSubtitle: {
    color: Palette.inkMuted,
    fontFamily: Fonts.medium,
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    backgroundColor: Palette.border,
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.four,
  },
  setupRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
    minHeight: 54,
  },
  rowIcon: {
    alignItems: 'center',
    borderRadius: 14,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  rowLabel: {
    color: Palette.ink,
    flex: 1,
    fontFamily: Fonts.semibold,
    fontSize: 13,
  },
  rowDetail: {
    color: Palette.inkMuted,
    fontFamily: Fonts.medium,
    fontSize: 10,
  },
  button: {
    alignItems: 'center',
    backgroundColor: Palette.ink,
    borderRadius: Radius.pill,
    height: 54,
    justifyContent: 'center',
  },
  buttonText: {
    color: Palette.surface,
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
});
