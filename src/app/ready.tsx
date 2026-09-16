import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeatIcon } from '@/components/heat-icon';
import { Fonts, MaxContentWidth, Palette, Radius, Spacing } from '@/constants/theme';

const icons = {
  back: { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' },
  shield: { ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' },
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
            <View style={styles.successMark}>
              <HeatIcon name={icons.shield} size={38} tintColor={Palette.coralDark} />
            </View>
            <Text style={styles.kicker}>Ready for setup</Text>
            <Text style={styles.title}>Your {role.toLowerCase()} safety workspace starts here.</Text>
            <Text style={styles.body}>
              Next, add your school, team, and local practice conditions. Pairing a wristband stays optional.
            </Text>
          </View>

          <Pressable onPress={() => router.back()} style={styles.button}>
            <Text style={styles.buttonText}>Review my choices</Text>
          </Pressable>
        </View>
      </SafeAreaView>
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
  content: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  successMark: {
    alignItems: 'center',
    backgroundColor: Palette.coralSoft,
    borderColor: 'rgba(217, 87, 73, 0.16)',
    borderRadius: Radius.pill,
    borderWidth: 1,
    height: 72,
    justifyContent: 'center',
    marginBottom: Spacing.six,
    width: 72,
  },
  kicker: {
    color: Palette.coralDark,
    fontFamily: Fonts.bold,
    fontSize: 13,
    textAlign: 'center',
  },
  title: {
    color: Palette.ink,
    fontFamily: Fonts.extrabold,
    fontSize: 36,
    letterSpacing: -1.5,
    lineHeight: 42,
    marginTop: Spacing.two,
    maxWidth: 430,
    textAlign: 'center',
  },
  body: {
    color: Palette.inkMuted,
    fontFamily: Fonts.medium,
    fontSize: 15,
    lineHeight: 23,
    marginTop: Spacing.four,
    maxWidth: 390,
    textAlign: 'center',
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
