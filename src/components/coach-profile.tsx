import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import { useState } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';

import { Avatar, Glyph, Group, SecondaryButton, SettingRow, Sheet, Tap } from '@/components/ds';
import { Color, Radius, Space, TOUCH, Type } from '@/constants/design-system';
import { useCoachTeam } from '@/hooks/use-coach-team';
import { firebaseAuth } from '@/services/firebase';
import { useAuthSession } from '@/state/auth-session';
import { setPreference, usePreferences } from '@/state/preferences';

// Coach Profile: who you are, your team, a few preferences, and the fine print. Confirmations use
// in-app sheets because React Native's Alert does nothing on the web.

type Info = 'permissions' | 'safety' | 'credits' | null;

const INFO: Record<Exclude<Info, null>, { title: string; body: string[] }> = {
  permissions: {
    title: 'Data permissions',
    body: [
      'You see your team’s roster and the profile basics approved athletes share: name, grade, sport, and jersey number.',
      'Health and emergency details athletes enter stay private to them. Coaches can’t read them.',
      'Wristband signals appear only for athletes who pair a band and choose to share a session.',
    ],
  },
  safety: {
    title: 'Safety and limitations',
    body: [
      'HeatSense supports, but doesn’t replace, your district’s emergency action plan or an athletic trainer’s judgment.',
      'It doesn’t diagnose heat illness. Practice guidance comes from your school’s heat policy.',
    ],
  },
  credits: {
    title: 'Photo credits',
    body: [
      'Home: George G. Westfeldt Complex and Danny Thiel Track, by Tulane Public Relations, CC BY 2.0. Cropped and color-adjusted.',
      'Plan: Summer football practice, U.S. Department of Agriculture. Public domain.',
    ],
  },
};

export function CoachProfile() {
  const { user } = useAuthSession();
  const { state: team } = useCoachTeam(user?.uid ?? null);
  const { celsius, compactRoster, practiceLiveActivity } = usePreferences();
  const [info, setInfo] = useState<Info>(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const name = user?.displayName?.trim() || user?.email || 'Coach';
  const teamLine = team.status === 'ready' ? team.team.teamName : team.status === 'none' ? 'No team yet' : null;
  const signOutNow = () => {
    setConfirmSignOut(false);
    if (firebaseAuth) signOut(firebaseAuth).catch(() => {});
    router.replace('/welcome');
  };

  return (
    <View>
      <View accessible accessibilityLabel={`${name}, coach${teamLine ? `, ${teamLine}` : ''}`} style={styles.identity}>
        <Avatar name={name} size={84} />
        <Text numberOfLines={1} style={styles.name}>{name}</Text>
        <Text numberOfLines={1} style={[Type.support, styles.muted]}>
          Coach{teamLine ? ` · ${teamLine}` : ''}
        </Text>
        {team.status === 'ready' ? <Text numberOfLines={1} style={[Type.meta, styles.subtle]}>{[team.team.level, team.team.sport, team.team.school].filter(Boolean).join(' · ')}</Text> : null}
      </View>

      <View style={styles.groups}>
        <Group title="Display">
          <SettingRow onToggle={(value) => setPreference('celsius', value)} title="Temperatures in °C" toggled={celsius} />
          <SettingRow detail="Hides the line under each name" onToggle={(value) => setPreference('compactRoster', value)} title="Compact roster" toggled={compactRoster} />
          {Platform.OS === 'ios' ? (
            <SettingRow detail="Zone and time left on the Lock Screen" onToggle={(value) => setPreference('practiceLiveActivity', value)} title="Practice on Dynamic Island" toggled={practiceLiveActivity} />
          ) : null}
        </Group>

        <Group title="Team">
          {team.status === 'ready' ? (
            <SettingRow onPress={() => router.push('/team/invite')} title="Invite codes and requests" />
          ) : (
            <SettingRow onPress={() => router.push('/team/create')} title="Create a team" />
          )}
        </Group>

        <Group title="About">
          <SettingRow onPress={() => setInfo('permissions')} title="Data permissions" />
          <SettingRow onPress={() => setInfo('safety')} title="Safety and limitations" />
          <SettingRow onPress={() => setInfo('credits')} title="Photo credits" />
        </Group>
      </View>

      {user?.email ? <Text style={[Type.meta, styles.subtle, styles.signedIn]}>Signed in as {user.email}</Text> : null}
      <Tap accessibilityLabel="Sign out" onPress={() => setConfirmSignOut(true)} radius={Radius.pill} style={styles.signOut}>
        <Glyph color={Color.error} name="logout" size={18} strokeWidth={2} />
        <Text style={[Type.button, styles.signOutText]}>Sign out</Text>
      </Tap>

      <Sheet onClose={() => setInfo(null)} title={info ? INFO[info].title : ''} visible={info !== null}>
        {info ? INFO[info].body.map((line) => <Text key={line} style={[Type.body, styles.muted, styles.infoLine]}>{line}</Text>) : null}
        {info === 'credits' ? (
          <Tap accessibilityLabel="Open the CC BY 2.0 license" onPress={() => Linking.openURL('https://creativecommons.org/licenses/by/2.0/').catch(() => {})} radius={Radius.control} style={styles.link}>
            <Text style={[Type.button, styles.accent]}>CC BY 2.0 license</Text>
          </Tap>
        ) : null}
      </Sheet>

      <Sheet hideDone onClose={() => setConfirmSignOut(false)} title="Sign out?" visible={confirmSignOut}>
        <Text style={[Type.body, styles.muted, styles.infoLine]}>You can sign back in with the same account.</Text>
        <Tap accessibilityLabel="Sign out now" onPress={signOutNow} radius={Radius.pill} style={styles.signOutNow}>
          <Text style={[Type.button, styles.ink]}>Sign out</Text>
        </Tap>
        <SecondaryButton label="Cancel" onPress={() => setConfirmSignOut(false)} style={styles.cancel} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  ink: { color: Color.ink },
  muted: { color: Color.inkMuted },
  subtle: { color: Color.inkSubtle },
  accent: { color: Color.accent },

  identity: { alignItems: 'center', gap: 4, paddingBottom: Space.xl, paddingTop: Space.l },
  name: { color: Color.ink, fontFamily: Type.page.fontFamily, fontSize: 34, letterSpacing: 0.3, lineHeight: 38, marginTop: Space.m },

  groups: { gap: Space.xl },
  signedIn: { marginTop: Space.xxl, textAlign: 'center' },
  signOut: { alignItems: 'center', alignSelf: 'center', borderColor: Color.outline, borderWidth: 1.5, flexDirection: 'row', gap: Space.s, justifyContent: 'center', marginTop: Space.m, minHeight: TOUCH + 4, paddingHorizontal: Space.xxl },
  signOutText: { color: Color.error },

  infoLine: { marginTop: Space.m },
  link: { alignSelf: 'flex-start', justifyContent: 'center', marginTop: Space.m, minHeight: TOUCH },
  signOutNow: { alignItems: 'center', backgroundColor: '#8E2C25', justifyContent: 'center', marginTop: Space.xl, minHeight: 54 },
  cancel: { alignSelf: 'stretch', marginTop: Space.m },
});
