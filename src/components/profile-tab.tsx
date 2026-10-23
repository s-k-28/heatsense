import { Image } from 'expo-image';
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { signOut, updateProfile } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { CapsLabel, ListRow, PersonGlyph, Rows } from '@/components/whoop-ui';
import { Face, Palette } from '@/constants/theme';
import { ZONES, type Zone } from '@/lib/practice';
import { UIL_SOURCE_URL } from '@/lib/uil-wbgt';
import { firebaseAuth } from '@/services/firebase';
import { askForHeatAlerts, notifyNow } from '@/services/heat-alerts';
import { getMyTeamInvite, type TeamInvite, type TeamSummary } from '@/services/team-invites';
import { useAuthSession } from '@/state/auth-session';
import { PAIRED_SERIAL } from '@/state/band-uplink';
import { usePastSessions } from '@/state/past-sessions';
import { setPreference, setProfile, usePreferences, useTemperature } from '@/state/preferences';
import { useCoachData, useMembership, useNow, useTrainers } from '@/state/team-session';

// Profile, after WHOOP's and Strava's: who you are up top (photo, name, team), what your season
// looks like (Gentler Streak-style periods with the change from the one before), your band if you
// wear one, then the choices that change how the app behaves: alerts, units, sample data.

type Role = 'Coach' | 'Athletic trainer' | 'Athlete';
type Period = '1M' | '3M' | 'All';
const PERIOD_DAYS: Record<Period, number | null> = { '1M': 30, '3M': 90, All: null };
const BAND = require('@/assets/images/heatsense-band-refined.png');
const tone = (zone: Zone) => (zone === 'black' ? '#8E8E93' : ZONES[zone].color);

function useMyTeam(enabled: boolean) {
  const [mine, setMine] = useState<{ team: TeamSummary; invite: TeamInvite } | null | undefined>(undefined);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    getMyTeamInvite().then((value) => { if (live) setMine(value); }).catch(() => { if (live) setMine(null); });
    return () => { live = false; };
  }, [enabled]);
  return enabled ? mine : null;
}

/** Copies the picked image into the app's documents so it survives cache clean-ups. */
async function keepPhoto(uri: string, previous: string | null) {
  const dest = new File(Paths.document, `profile-${Date.now()}.jpg`);
  await new File(uri).copy(dest);
  if (previous) { try { new File(previous).delete(); } catch {} }
  return dest.uri;
}

function Pencil() {
  return <Svg fill="none" height={14} stroke="#101416" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} viewBox="0 0 24 24" width={14}><Path d="M4 20h4L19 9l-4-4L4 16z" /></Svg>;
}

function Header({ role, team }: { role: Role; team: string | null }) {
  const { user } = useAuthSession();
  const { photoUri, profileName } = usePreferences();
  const realName = profileName?.trim() || user?.displayName?.trim() || null;
  const name = realName ?? 'Add your name';
  const initials = realName ? realName.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase() : null;
  const since = user?.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString([], { month: 'long', year: 'numeric' }) : null;

  const pick = async (camera: boolean) => {
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) { Alert.alert('Camera access is off', 'Turn it on in Settings to take a profile picture.', [{ text: 'Not now', style: 'cancel' }, { text: 'Settings', onPress: () => Linking.openSettings() }]); return; }
      }
      const options: ImagePicker.ImagePickerOptions = { allowsEditing: true, aspect: [1, 1], mediaTypes: ['images'], quality: 0.7 };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets[0]) return;
      setProfile({ photoUri: await keepPhoto(result.assets[0].uri, photoUri) });
    } catch {
      Alert.alert('Couldn’t use that photo', camera ? 'This device may not have a camera. Try choosing from your library.' : 'Try another photo.');
    }
  };
  const choosePhoto = () => Alert.alert('Profile picture', undefined, [
    // The picker can't present while this alert is still closing, so it waits a beat.
    { text: 'Choose from library', onPress: () => setTimeout(() => pick(false), 400) },
    { text: 'Take photo', onPress: () => setTimeout(() => pick(true), 400) },
    ...(photoUri ? [{ text: 'Remove photo', style: 'destructive' as const, onPress: () => { try { new File(photoUri).delete(); } catch {} setProfile({ photoUri: null }); } }] : []),
    { text: 'Cancel', style: 'cancel' as const },
  ]);
  const rename = () => {
    const save = (next?: string) => {
      const value = next?.trim();
      if (!value) return;
      setProfile({ profileName: value });
      const current = firebaseAuth?.currentUser;
      if (current) updateProfile(current, { displayName: value }).catch(() => {});
    };
    if (Platform.OS === 'ios') Alert.prompt('Your name', 'Shown to your team.', save, 'plain-text', realName ?? '');
    else Alert.alert('Change your name', 'Name changes are available on iPhone for now.');
  };

  return (
    <View style={styles.header}>
      <Pressable accessibilityHint="Changes your profile picture" accessibilityLabel="Profile picture" accessibilityRole="button" onPress={choosePhoto} style={({ pressed }) => [styles.avatarWrap, pressed && styles.pressed]}>
        {photoUri ? <Image accessibilityIgnoresInvertColors contentFit="cover" source={{ uri: photoUri }} style={styles.avatar} /> : <View style={styles.avatar}>{initials ? <Text style={styles.avatarText}>{initials}</Text> : <PersonGlyph />}</View>}
        <View style={styles.avatarBadge}><Pencil /></View>
      </Pressable>
      <Pressable accessibilityHint="Changes your name" accessibilityRole="button" onPress={rename} style={({ pressed }) => pressed && styles.pressed}>
        <Text style={[styles.name, !realName && styles.namePlaceholder]}>{name}</Text>
      </Pressable>
      <Text style={styles.meta}>{role}{team ? ` · ${team}` : ''}</Text>
      {since ? <Text style={styles.since}>Member since {since}</Text> : null}
    </View>
  );
}

/** Practices, time in the heat and the hottest day for a period, with the change from the one before. */
function Season({ teamId, sample }: { teamId: string | null; sample: boolean }) {
  const past = usePastSessions(teamId, sample, 100);
  const temp = useTemperature();
  const now = useNow(60_000);
  const [period, setPeriod] = useState<Period>('1M');
  const days = PERIOD_DAYS[period];
  const inRange = (from: number, to: number) => (past ?? []).filter((p) => p.session.startedAt.getTime() >= from && p.session.startedAt.getTime() < to);
  const current = days ? inRange(now - days * 86_400_000, now) : past ?? [];
  const before = days ? inRange(now - 2 * days * 86_400_000, now - days * 86_400_000) : null;
  const hours = (list: typeof current) => list.reduce((sum, p) => sum + ((p.session.endedAt ?? p.session.startedAt).getTime() - p.session.startedAt.getTime()), 0) / 3_600_000;
  const hottest = current.reduce<{ wbgtF: number; zone: Zone } | null>((hot, p) => (p.peak && (!hot || p.peak.wbgtF > hot.wbgtF) ? p.peak : hot), null);
  const delta = (now: number, then: number | null, unit = '') => {
    if (then === null) return null;
    const d = Math.round((now - then) * 10) / 10;
    return d === 0 ? 'Same as before' : `${d > 0 ? '↑' : '↓'} ${Math.abs(d)}${unit} vs before`;
  };
  const items = [
    { label: 'Practices', value: String(current.length), change: delta(current.length, before ? before.length : null) },
    { label: 'Hours in heat', value: hours(current).toFixed(1), change: delta(Math.round(hours(current) * 10) / 10, before ? Math.round(hours(before) * 10) / 10 : null, ' h') },
    { label: 'Hottest', value: hottest ? `${temp.value(hottest.wbgtF)}${temp.unit}` : '--', color: hottest ? tone(hottest.zone) : undefined, change: hottest ? ZONES[hottest.zone].label : null },
  ];
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle}>Your season</Text>
        <View accessibilityRole="tablist" style={styles.periods}>
          {(Object.keys(PERIOD_DAYS) as Period[]).map((key) => (
            <Pressable accessibilityRole="tab" accessibilityState={{ selected: period === key }} key={key} onPress={() => setPeriod(key)} style={[styles.period, period === key && styles.periodOn]}>
              <Text style={[styles.periodText, period === key && styles.periodTextOn]}>{key}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {items.map((item, i) => (
        <View accessible key={item.label} style={[styles.seasonRow, i > 0 && styles.seasonDivider]}>
          <Text style={styles.seasonLabel}>{item.label}</Text>
          <View style={styles.seasonRight}>
            <Text style={[styles.seasonValue, item.color ? { color: item.color } : null]}>{item.value}</Text>
            {item.change ? <Text style={styles.seasonChange}>{item.change}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

/** The athlete's band, the way WHOOP shows the strap: the device, its battery, when it last synced. */
function BandDevice() {
  const { bandConnected } = usePreferences();
  // ponytail: battery and sync come from the simulator until the band's BLE battery service lands.
  const battery = 78;
  return (
    <Pressable accessibilityHint={bandConnected ? 'Opens band settings' : 'Pairs your band'} accessibilityRole="button" onPress={() => router.push('/pair-band')} style={({ pressed }) => [styles.device, pressed && styles.pressed]}>
      <Image accessibilityIgnoresInvertColors contentFit="contain" source={BAND} style={styles.deviceImage} />
      <View style={styles.deviceCopy}>
        <Text style={styles.cardTitle}>HeatSense Band</Text>
        {bandConnected ? (
          <>
            <Text style={styles.deviceSerial}>{PAIRED_SERIAL} · synced just now</Text>
            <View style={styles.battery}>
              <View style={styles.batteryTrack}><View style={[styles.batteryFill, { width: `${battery}%` }]} /></View>
              <Text style={styles.batteryText}>{battery}%</Text>
            </View>
          </>
        ) : (
          <Text style={[styles.deviceSerial, { color: Palette.coral }]}>Not paired · tap to pair</Text>
        )}
      </View>
    </Pressable>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (next: boolean) => void }) {
  return <ListRow label={label} trailing={<Switch accessibilityLabel={label} onValueChange={onChange} trackColor={{ true: Palette.coral }} value={value} />} />;
}

export function ProfileTab({ role }: { role: Role }) {
  const data = useCoachData(role === 'Athlete' ? 'athlete' : role === 'Athletic trainer' ? 'trainer' : 'coach');
  const trainers = useTrainers(role === 'Athlete' ? data?.teamId ?? null : null);
  const mine = useMyTeam(role === 'Coach');
  const membership = useMembership(role !== 'Coach');
  const prefs = usePreferences();
  const teamName = role === 'Coach' ? mine?.team.teamName ?? null : membership?.status === 'active' ? membership.team?.teamName ?? null : null;
  const waiting = membership?.status === 'pending' ? membership.team?.teamName ?? 'your team' : null;
  const staff = role !== 'Athlete';

  const testAlert = async () => {
    if (!(await askForHeatAlerts())) {
      Alert.alert('Notifications are off', 'Turn them on in Settings so HeatSense can warn you about heat.', [{ text: 'Not now', style: 'cancel' }, { text: 'Settings', onPress: () => Linking.openSettings() }]);
      return;
    }
    notifyNow('HeatSense test alert', 'Alerts are working. You’ll hear about rechecks and zone changes like this.').catch(() => {});
  };
  const confirmSignOut = () => Alert.alert('Log out of HeatSense?', undefined, [
    { style: 'cancel', text: 'Cancel' },
    { onPress: () => { if (firebaseAuth) signOut(firebaseAuth).catch(() => {}); router.replace('/welcome'); }, style: 'destructive', text: 'Log out' },
  ]);

  return (
    <>
      <Header role={role} team={teamName} />
      <Season sample={Boolean(data?.sample)} teamId={data?.teamId ?? null} />
      {role === 'Athlete' ? <View style={styles.gap}><BandDevice /></View> : null}

      <CapsLabel>Team</CapsLabel>
      <Rows>
        <ListRow label="Team" onPress={role === 'Coach' && mine === null ? () => router.push('/team/create') : undefined} value={teamName ?? (waiting ? 'Waiting for approval' : 'None yet')} />
        {role !== 'Coach' && !data?.teamId && !waiting ? <ListRow label="Join a team" onPress={() => router.push(role === 'Athlete' ? '/setup/athlete' : '/setup/trainer')} /> : null}
        {role === 'Athlete' ? <ListRow label="Athletic trainer" value={trainers.length ? trainers.map((t) => t.displayName ?? 'Trainer').join(', ') : 'None yet'} /> : null}
      </Rows>

      <CapsLabel>Notifications</CapsLabel>
      <Rows>
        {staff ? <Toggle label="Recheck reminders" onChange={(v) => setPreference('alertRecheck', v)} value={prefs.alertRecheck} /> : null}
        <Toggle label="Zone changes" onChange={(v) => setPreference('alertZone', v)} value={prefs.alertZone} />
        {staff ? <Toggle label="Slow-recovery alerts" onChange={(v) => setPreference('alertBand', v)} value={prefs.alertBand} /> : null}
        <ListRow label="Send a test alert" onPress={testAlert} />
      </Rows>

      <CapsLabel>Display</CapsLabel>
      <Rows>
        <ListRow
          label="Temperature"
          trailing={
            <View accessibilityRole="tablist" style={styles.units}>
              {([false, true] as const).map((c) => (
                <Pressable accessibilityRole="tab" accessibilityState={{ selected: prefs.celsius === c }} key={String(c)} onPress={() => setPreference('celsius', c)} style={[styles.unit, prefs.celsius === c && styles.unitOn]}>
                  <Text style={[styles.unitText, prefs.celsius === c && styles.unitTextOn]}>{c ? '°C' : '°F'}</Text>
                </Pressable>
              ))}
            </View>
          }
        />
        <Toggle label="Lock Screen practice clock" onChange={(v) => setPreference('practiceLiveActivity', v)} value={prefs.practiceLiveActivity} />
        <Toggle label="Sample athletes" onChange={(v) => setPreference('demoTeam', v)} value={prefs.demoTeam} />
      </Rows>

      <CapsLabel>Support</CapsLabel>
      <Rows>
        <ListRow label="UIL heat chart" onPress={() => Linking.openURL(UIL_SOURCE_URL)} />
        <ListRow label="Data permissions" onPress={() => Alert.alert('Data permissions', role === 'Athlete' ? 'Your coach sees your name, team and, during practice, your band’s signals. Health answers and emergency contacts stay private to you.' : 'You see athletes on your roster and the practice records your team creates. Athletes’ health answers and emergency contacts stay private to them.')} />
        <ListRow label="Safety and limitations" onPress={() => Alert.alert('Safety and limitations', 'HeatSense supports, but doesn’t replace, your district’s emergency action plan or an athletic trainer’s judgment. It doesn’t diagnose heat illness.')} />
      </Rows>

      <Pressable accessibilityRole="button" onPress={confirmSignOut} style={({ pressed }) => [styles.logout, pressed && styles.pressed]}>
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  gap: { marginTop: 12 },
  header: { alignItems: 'center', marginBottom: 20, marginTop: 4 },
  avatarWrap: { marginBottom: 14 },
  avatar: { alignItems: 'center', backgroundColor: Palette.surface, borderRadius: 52, height: 104, justifyContent: 'center', overflow: 'hidden', width: 104 },
  avatarText: { color: Palette.ink, fontFamily: Face.label, fontSize: 38 },
  avatarBadge: { alignItems: 'center', backgroundColor: Palette.coral, borderColor: '#101416', borderRadius: 16, borderWidth: 3, bottom: -2, height: 32, justifyContent: 'center', position: 'absolute', right: -2, width: 32 },
  name: { color: Palette.ink, fontSize: 26, fontWeight: '700', letterSpacing: -0.3 },
  namePlaceholder: { color: Palette.coral, fontSize: 20 },
  meta: { color: Palette.inkMuted, fontSize: 16, marginTop: 4 },
  since: { color: Palette.inkFaint, fontSize: 14, marginTop: 2 },
  card: { backgroundColor: Palette.surface, borderRadius: 16, padding: 18 },
  cardHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cardTitle: { color: Palette.ink, fontSize: 18, fontWeight: '600' },
  periods: { backgroundColor: 'rgba(235,235,245,0.08)', borderRadius: 9, flexDirection: 'row', padding: 3 },
  period: { borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5 },
  periodOn: { backgroundColor: 'rgba(235,235,245,0.16)' },
  periodText: { color: Palette.inkMuted, fontSize: 14, fontWeight: '600' },
  periodTextOn: { color: Palette.ink },
  seasonRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 62 },
  seasonDivider: { borderTopColor: 'rgba(255,255,255,0.07)', borderTopWidth: StyleSheet.hairlineWidth },
  seasonLabel: { color: Palette.ink, fontSize: 16 },
  seasonRight: { alignItems: 'flex-end' },
  seasonValue: { color: Palette.ink, fontFamily: Face.figure, fontSize: 28, lineHeight: 32 },
  seasonChange: { color: Palette.inkMuted, fontSize: 13, fontWeight: '500' },
  device: { alignItems: 'center', backgroundColor: Palette.surface, borderRadius: 16, flexDirection: 'row', gap: 14, padding: 14 },
  deviceImage: { height: 76, width: 76 },
  deviceCopy: { flex: 1, gap: 4 },
  deviceSerial: { color: Palette.inkMuted, fontSize: 14 },
  battery: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 4 },
  batteryTrack: { backgroundColor: 'rgba(235,235,245,0.1)', borderRadius: 3, flex: 1, height: 6, overflow: 'hidden' },
  batteryFill: { backgroundColor: Palette.safe, borderRadius: 3, height: 6 },
  batteryText: { color: Palette.ink, fontFamily: Face.figure, fontSize: 16 },
  units: { backgroundColor: 'rgba(235,235,245,0.08)', borderRadius: 9, flexDirection: 'row', padding: 3 },
  unit: { borderRadius: 7, paddingHorizontal: 14, paddingVertical: 5 },
  unitOn: { backgroundColor: Palette.coral },
  unitText: { color: Palette.inkMuted, fontSize: 15, fontWeight: '700' },
  unitTextOn: { color: '#1A0E07' },
  logout: { alignItems: 'center', borderColor: 'rgba(255,69,58,0.4)', borderRadius: 14, borderWidth: 1, justifyContent: 'center', marginTop: 28, minHeight: 50 },
  logoutText: { color: Palette.emergency, fontSize: 17, fontWeight: '600' },
});
