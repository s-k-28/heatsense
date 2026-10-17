import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, Text, TextInput, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn, FadeInUp, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EntryButton, EntryHeader, entryStyles } from '@/components/entry-ui';
import { MobileViewport } from '@/components/mobile-viewport';
import { RosterMark } from '@/components/onboarding-art';
import { OnboardingSelectField, OnboardingTextField } from '@/components/onboarding-fields';
import { Entry } from '@/constants/entry-theme';
import { SPORTS } from '@/constants/sports';
import { setTeamDraft, useTeamDraft, type TeamDraft } from '@/state/onboarding';

const MAX_NAME = 80;

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
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + 12, 26), paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <Animated.View entering={fade(0)}>
          <EntryHeader onBack={back} />
        </Animated.View>

        <Animated.View entering={rise(300)} style={[styles.titleRow, { marginTop: compact ? 22 : 30 }]}>
          <Text accessibilityRole="header" style={[entryStyles.formHeadline, compact && entryStyles.formHeadlineCompact, styles.title]}>{'Create your\nteam.'}</Text>
          <RosterMark size={compact ? 72 : 84} />
        </Animated.View>
        <Animated.Text entering={rise(450)} style={[entryStyles.description, styles.noShrink]}>A few details to get your team up and running.</Animated.Text>

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
          <EntryButton label="Create team" disabled={!valid} onPress={next} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: Entry.canvas },
  content: { flexGrow: 1, paddingHorizontal: 26 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  // flexShrink 0: on web, text would otherwise shrink when an open menu makes the form taller than the screen.
  title: { flex: 1, flexShrink: 0 },
  noShrink: { flexShrink: 0 },
});
