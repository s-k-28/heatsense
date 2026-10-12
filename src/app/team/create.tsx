import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, TextInput, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn, FadeInUp, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { GlassSurface } from '@/components/glass-surface';
import { HeatSenseLogo } from '@/components/heatsense-logo';
import { MobileViewport } from '@/components/mobile-viewport';
import { OnboardingContinueButton, onboardingFont as fontFamily } from '@/components/onboarding-controls';
import { OnboardingSelectField, OnboardingTextField } from '@/components/onboarding-fields';
import { setTeamDraft, useTeamDraft, type TeamDraft } from '@/state/onboarding';

const PEACH = '#FF986B';
const MUTED = '#B8B8B8';
const FOCUS_RING = { outlineColor: '#FFFFFF', outlineStyle: 'solid', outlineWidth: 2, outlineOffset: 3 } as const;
const MAX_NAME = 80;

const SPORTS = ['Football', 'Soccer', 'Cross Country', 'Track & Field', 'Baseball', 'Softball', 'Tennis', 'Basketball', 'Volleyball', 'Other'] as const;
const LEVELS = ['Varsity', 'Junior Varsity', 'Freshman', 'Middle School', 'Club / Other'] as const;

type Field = keyof TeamDraft;
type Menu = 'sport' | 'level' | null;

// Collapse runs of whitespace and trim the ends.
const clean = (value: string) => value.replace(/\s+/g, ' ').trim();

function errorsFor(draft: TeamDraft): Record<Field, string | null> {
  return {
    school: clean(draft.school) ? null : 'Enter your school or organization.',
    teamName: clean(draft.teamName) ? null : 'Enter a team name.',
    sport: draft.sport ? null : 'Choose a sport.',
    level: draft.level ? null : 'Choose a team level.',
  };
}

export default function CreateTeamScreen() {
  return <MobileViewport><Content /></MobileViewport>;
}

function Content() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const draft = useTeamDraft();
  const teamNameRef = useRef<TextInput>(null);
  const submitting = useRef(false);
  const [menu, setMenu] = useState<Menu>(null);
  // Errors show only after a coach has left a field, never while they are still filling it in.
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [height, setHeight] = useState(0);
  const compact = height > 0 && height < 720;
  const headlineSize = compact ? 38 : 46;
  const fieldHeight = compact ? 58 : 60;

  // The screen stays mounted under the next one, so re-arm Continue when the coach comes back.
  useFocusEffect(useCallback(() => { submitting.current = false; }, []));

  const errors = errorsFor(draft);
  const valid = Object.values(errors).every((error) => error === null);
  const shown = (field: Field) => (touched[field] ? errors[field] : null);
  const touch = (field: Field) => setTouched((current) => (current[field] ? current : { ...current, [field]: true }));

  const finishText = (field: 'school' | 'teamName') => {
    touch(field);
    const cleaned = clean(draft[field]);
    if (cleaned !== draft[field]) setTeamDraft({ [field]: cleaned });
  };

  const toggleMenu = (name: 'sport' | 'level') => (open: boolean) => {
    Keyboard.dismiss();
    // Closing a menu without choosing counts as leaving the field.
    if (!open && menu === name) touch(name);
    setMenu(open ? name : null);
  };

  const rise = (delay: number) => (reducedMotion ? undefined : FadeInUp.delay(delay).duration(480));
  const fade = (delay: number) => (reducedMotion ? undefined : FadeIn.delay(delay).duration(420));

  const back = () => (router.canGoBack() ? router.back() : router.replace('/setup/coach'));
  const next = () => {
    if (!valid || submitting.current) return;
    submitting.current = true;
    Keyboard.dismiss();
    setMenu(null);
    // No team backend exists yet: keep this as a local draft and move on. The team is
    // not created anywhere until a server accepts it in a later step.
    setTeamDraft({ school: clean(draft.school), teamName: clean(draft.teamName) });
    router.push('/team/invite');
  };

  return (
    <View style={styles.fill} onLayout={(event: LayoutChangeEvent) => setHeight(event.nativeEvent.layout.height)}>
      <StatusBar style="light" />
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + 8, compact ? 40 : 56), paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <Animated.View entering={fade(0)} style={styles.topRow}>
          <BackButton onPress={back} />
          <HeatSenseLogo height={30} />
        </Animated.View>

        <Animated.Text entering={fade(200)} style={[styles.eyebrow, { fontFamily, marginTop: compact ? 26 : 36 }]}>TEAM DETAILS</Animated.Text>
        <Animated.Text entering={rise(350)} accessibilityRole="header" style={[styles.headline, { fontFamily, fontSize: headlineSize, lineHeight: Math.round(headlineSize * 1.08), marginTop: compact ? 10 : 14 }]}>
          {'Create your\nteam.'}
        </Animated.Text>
        <Animated.Text entering={rise(500)} style={[styles.description, { fontFamily, marginTop: compact ? 10 : 14 }]}>A few details to get your team up and running.</Animated.Text>

        <View style={{ gap: compact ? 16 : 20, marginTop: compact ? 24 : 30 }}>
          <Animated.View entering={rise(650)}>
            <OnboardingTextField
              label="School or organization"
              placeholder="e.g. Emerson High School"
              value={draft.school}
              onChangeText={(school) => setTeamDraft({ school })}
              onFocus={() => setMenu(null)}
              onBlur={() => finishText('school')}
              error={shown('school')}
              height={fieldHeight}
              maxLength={MAX_NAME}
              autoCapitalize="words"
              autoComplete="organization"
              textContentType="organizationName"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => teamNameRef.current?.focus()}
            />
          </Animated.View>
          <Animated.View entering={rise(750)}>
            <OnboardingTextField
              inputRef={teamNameRef}
              label="Team name"
              placeholder="e.g. Emerson Mavericks"
              value={draft.teamName}
              onChangeText={(teamName) => setTeamDraft({ teamName })}
              onFocus={() => setMenu(null)}
              onBlur={() => finishText('teamName')}
              error={shown('teamName')}
              height={fieldHeight}
              maxLength={MAX_NAME}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => setMenu('sport')}
            />
          </Animated.View>
          <Animated.View entering={rise(850)}>
            <OnboardingSelectField
              label="Sport"
              placeholder="Select a sport"
              options={SPORTS}
              value={draft.sport}
              onChange={(sport) => { setTeamDraft({ sport }); touch('sport'); }}
              open={menu === 'sport'}
              onOpenChange={toggleMenu('sport')}
              error={shown('sport')}
              height={fieldHeight}
              maxVisibleRows={compact ? 4 : 5}
            />
          </Animated.View>
          <Animated.View entering={rise(950)}>
            <OnboardingSelectField
              label="Team level"
              placeholder="Select a level"
              options={LEVELS}
              value={draft.level}
              onChange={(level) => { setTeamDraft({ level }); touch('level'); }}
              open={menu === 'level'}
              onOpenChange={toggleMenu('level')}
              error={shown('level')}
              height={fieldHeight}
              maxVisibleRows={compact ? 4 : 5}
            />
          </Animated.View>
        </View>

        <Animated.View entering={rise(1100)} style={{ marginTop: compact ? 26 : 32 }}>
          <OnboardingContinueButton enabled={valid} onPress={next} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  const reducedMotion = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const press = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.value * 0.06 }], opacity: 1 - press.value * 0.15 }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPressIn={() => { press.set(withTiming(1, { duration: reducedMotion ? 0 : 110 })); }}
      onPressOut={() => { press.set(withTiming(0, { duration: reducedMotion ? 0 : 200 })); }}
      hitSlop={8}
      style={[styles.backWrap, focused && FOCUS_RING]}>
      <Animated.View style={style}>
        <GlassSurface radius={22} style={styles.back}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="m15 5-7 7 7 7" /></Svg>
        </GlassSurface>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 22 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backWrap: { borderRadius: 22 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.85)' },
  // flexShrink 0: on web, text would otherwise shrink when an open menu makes the form taller than the screen.
  eyebrow: { flexShrink: 0, color: PEACH, fontSize: 12.5, letterSpacing: 1.5, fontWeight: '500' },
  headline: { flexShrink: 0, color: '#FFFFFF', fontWeight: '500', letterSpacing: -0.9 },
  description: { flexShrink: 0, color: MUTED, fontSize: 15.5, lineHeight: 23, fontWeight: '400', maxWidth: 330 },
});
