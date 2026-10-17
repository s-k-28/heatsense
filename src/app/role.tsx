import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { EntryButton, EntryHeader, EntryScreen, entryStyles, isKeyboardFocus } from '@/components/entry-ui';
import { FieldlineScene } from '@/components/fieldline-character';
import { Entry } from '@/constants/entry-theme';
import { setOnboardingRole, useOnboardingRole, type OnboardingRole } from '@/state/onboarding';

const roles = [
  { id: 'coach', title: 'Coach', description: 'Plan practices. Look after your team.' },
  { id: 'athlete', title: 'Athlete', description: 'Join your team. Know your next step.' },
] as const;

function RoleIcon({ role }: { role: OnboardingRole }) {
  return <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={Entry.blue} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    {role === 'coach' ? <><Rect x={5} y={4} width={14} height={18} rx={3} /><Rect x={9} y={2} width={6} height={4} rx={1} fill={Entry.surface} /><Path d="M9 11h6 M9 16h6" /></> : <Path d="M2 12h4l3-8 6 16 3-8h4" />}
  </Svg>;
}

function RoleOption({ role, selected, onPress }: { role: typeof roles[number]; selected: boolean; onPress: () => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable accessibilityRole="radio" accessibilityLabel={`${role.title}. ${role.description}`} accessibilityState={{ checked: selected }} aria-checked={selected} onPress={onPress} onFocus={(event) => setFocused(isKeyboardFocus(event))} onBlur={() => setFocused(false)} style={({ pressed }) => [styles.role, selected && styles.selectedRole, focused && entryStyles.focus, pressed && entryStyles.pressed]}>
      <RoleIcon role={role.id} />
      <View style={styles.roleCopy}><Text style={styles.roleTitle}>{role.title}</Text><Text style={styles.roleDescription}>{role.description}</Text></View>
      <View style={[styles.radio, selected && styles.selectedRadio]}>
        {selected ? <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={Entry.canvas} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><Path d="m5 12 4 4 10-10" /></Svg> : null}
      </View>
    </Pressable>
  );
}

export default function RoleScreen() {
  const router = useRouter();
  const selected = useOnboardingRole();
  return (
    <EntryScreen>{(compact) => <>
      <EntryHeader onBack={() => router.canGoBack() ? router.back() : router.replace('/sign-in')} />
      <View style={styles.illustration}><FieldlineScene compact small={compact} reaction={selected} /></View>
      <Text accessibilityRole="header" style={[entryStyles.headline, compact && entryStyles.headlineCompact]}>Made for you.</Text>
      <Text style={entryStyles.description}>Choose how you’ll use HeatSense.</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="Your role" style={styles.roles}>
        {roles.map((role) => <RoleOption key={role.id} role={role} selected={selected === role.id} onPress={() => setOnboardingRole(role.id)} />)}
      </View>
      <View style={styles.actions}>
        <EntryButton label={selected ? `Continue as ${selected}` : 'Choose a role to continue'} disabled={!selected} onPress={() => { if (selected) router.push(`/setup/${selected}`); }} />
        <Text style={[entryStyles.note, { marginTop: 14 }]}>Next, we’ll connect you with your team.</Text>
      </View>
    </>}</EntryScreen>
  );
}

const styles = StyleSheet.create({
  illustration: { flexGrow: 1, justifyContent: 'center', marginVertical: 14 },
  roles: { gap: 12, marginTop: 24 },
  role: { minHeight: 88, borderWidth: 1, borderColor: Entry.line, borderRadius: 20, backgroundColor: Entry.surface, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 17 },
  selectedRole: { borderColor: Entry.peach, backgroundColor: Entry.selected },
  roleCopy: { flex: 1, gap: 5 },
  roleTitle: { color: Entry.ink, fontFamily: Entry.strong, fontSize: 18 },
  roleDescription: { color: Entry.muted, fontFamily: Entry.body, fontSize: 12, lineHeight: 18 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: Entry.muted, alignItems: 'center', justifyContent: 'center' },
  selectedRadio: { borderColor: Entry.peach, backgroundColor: Entry.peach },
  actions: { marginTop: 22 },
});
