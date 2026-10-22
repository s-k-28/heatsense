import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Keyboard, Linking } from 'react-native';

import { HeatMark, JerseyMark, RosterMark } from '@/components/onboarding-art';
import { ChoiceRows, StepField, StepLink, StepScreen } from '@/components/step-kit';
import { SPORTS } from '@/constants/sports';
import { UIL_SOURCE_URL } from '@/lib/uil-wbgt';
import { setTeamDraft, useTeamDraft } from '@/state/onboarding';

// Create a team, one question at a time. Everything stays a local draft until the Invite step asks
// the server to create the team, so stepping back and forth here never creates anything.

const MAX_NAME = 80;
const LEVELS = ['Varsity', 'Junior Varsity', 'Freshman', 'Middle School', 'Club / Other'] as const;
const STEPS = ['school', 'teamName', 'sport', 'level', 'uilClass'] as const;
// Coach setup runs 0.28 (team choice) → 0.8 (invite); these five steps share the space between.
const progressAt = (index: number) => 0.32 + index * 0.1;

const clean = (value: string) => value.replace(/\s+/g, ' ').trim();
const rows = (values: readonly string[]) => values.map((value) => ({ value, label: value }));

export default function CreateTeamScreen() {
  const router = useRouter();
  const draft = useTeamDraft();
  const [index, setIndex] = useState(0);
  const submitting = useRef(false);
  const step = STEPS[index];

  // The screen stays mounted under Invite, so re-arm the last step when the coach comes back.
  useFocusEffect(useCallback(() => { submitting.current = false; }, []));

  const done = {
    school: Boolean(clean(draft.school)),
    teamName: Boolean(clean(draft.teamName)),
    sport: Boolean(draft.sport),
    level: Boolean(draft.level),
    uilClass: draft.uilClass !== null,
  }[step];

  const back = () => {
    Keyboard.dismiss();
    if (index > 0) setIndex(index - 1);
    else if (router.canGoBack()) router.back();
    else router.replace('/setup/coach');
  };

  const next = () => {
    if (!done) return;
    Keyboard.dismiss();
    if (step === 'school' || step === 'teamName') setTeamDraft({ [step]: clean(draft[step]) });
    if (index < STEPS.length - 1) return setIndex(index + 1);
    if (submitting.current) return;
    submitting.current = true;
    router.push('/team/invite');
  };

  const common = { next: { enabled: done, label: index === STEPS.length - 1 ? 'Create team' : 'Next', onPress: next }, onBack: back, progress: progressAt(index) };

  switch (step) {
    case 'school':
      return (
        <StepScreen {...common} icon={<RosterMark size={96} />} title="What school is this for?">
          <StepField autoCapitalize="words" autoComplete="organization" autoFocus label="School or organization" maxLength={MAX_NAME} onChangeText={(school) => setTeamDraft({ school })} onSubmitEditing={next} placeholder="Emerson High School" returnKeyType="next" textContentType="organizationName" value={draft.school} />
        </StepScreen>
      );
    case 'teamName':
      return (
        <StepScreen {...common} icon={<JerseyMark size={96} />} title="Name your team">
          <StepField autoCapitalize="words" autoFocus label="Team name" maxLength={MAX_NAME} onChangeText={(teamName) => setTeamDraft({ teamName })} onSubmitEditing={next} placeholder="Emerson Mavericks" returnKeyType="next" value={draft.teamName} />
        </StepScreen>
      );
    case 'sport':
      return (
        <StepScreen {...common} icon={<JerseyMark size={96} />} title="Which sport?" top="tight">
          <ChoiceRows label="Sport" onChange={(sport) => setTeamDraft({ sport })} options={rows(SPORTS)} value={draft.sport} />
        </StepScreen>
      );
    case 'level':
      return (
        <StepScreen {...common} icon={<RosterMark size={96} />} title="What level?">
          <ChoiceRows label="Team level" onChange={(level) => setTeamDraft({ level })} options={rows(LEVELS)} value={draft.level} />
        </StepScreen>
      );
    case 'uilClass':
      return (
        <StepScreen {...common} icon={<HeatMark size={96} />} title="Your UIL heat class">
          <ChoiceRows
            label="UIL heat class"
            onChange={(value) => setTeamDraft({ uilClass: value === '3' ? 3 : 2 })}
            options={[
              { value: '2', label: 'Class 2', detail: 'Orange starts at 84.7 °F WBGT' },
              { value: '3', label: 'Class 3', detail: 'Orange starts at 87.0 °F WBGT' },
            ]}
            value={draft.uilClass === null ? null : String(draft.uilClass) as '2' | '3'}
          />
          <StepLink label="Not sure? View the UIL chart" onPress={() => Linking.openURL(UIL_SOURCE_URL)} />
        </StepScreen>
      );
  }
}
