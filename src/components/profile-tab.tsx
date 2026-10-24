import { Text } from '@/components/ui/text';
import { Image } from 'expo-image';
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { signOut, updateProfile } from 'firebase/auth';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useAthleteAppearance, useAthleteStyles } from '@/components/athlete-appearance';
import { Fill } from '@/components/motion/fill';
import { FloatingBand } from '@/components/motion/floating-band';
import { Segmented } from '@/components/motion/segmented';
import { ActionButton } from '@/components/ui/action-button';
import { CapsLabel, ListRow, PersonGlyph, Rows, SampleTag } from '@/components/whoop-ui';
import { Face, Palette } from '@/constants/theme';
import { CoachPalette, CoachRadius, CoachType } from '@/constants/coach-theme';
import { EASE_OUT } from '@/lib/motion-engine';
import { ZONES, type Zone } from '@/lib/practice';
import { UIL_SOURCE_URL } from '@/lib/uil-wbgt';
import { firebaseAuth } from '@/services/firebase';
import { askForHeatAlerts, notifyNow } from '@/services/heat-alerts';
import { getMyTeamInvite, type TeamInvite, type TeamSummary } from '@/services/team-invites';
import { useAuthSession } from '@/state/auth-session';
import { PAIRED_SERIAL } from '@/state/band-uplink';
import { usePastSessionsState } from '@/state/past-sessions';
import { setPreference, setProfile, usePreferences, useTemperature } from '@/state/preferences';
import { useCoachDataState, useMembership, useNow, useTrainers } from '@/state/team-session';

// Identity and activity belong together; settings have their own view. The activity summary uses
// Strava's period-first hierarchy, translated to practice records and HeatSense's existing rows.

type Role = 'Coach' | 'Athletic trainer' | 'Athlete';
type Period = '30d' | '90d' | 'Recent';
const PERIOD_DAYS: Record<Period, number | null> = { '30d': 30, '90d': 90, Recent: null };
const RECORD_LIMIT = 100;
const BAND = require('@/assets/images/heatsense-band-refined.png');
const BAND_SIDE = require('@/assets/images/band-views/side.png');
const tone = (zone: Zone) => (zone === 'black' ? '#8E8E93' : ZONES[zone].color);

function useMyTeam(enabled: boolean) {
  const { user, ready } = useAuthSession();
  const uid = user?.uid ?? null;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ uid: string; attempt: number; value: { team: TeamSummary; invite: TeamInvite } | null; error: boolean } | null>(null);
  useEffect(() => {
    if (!enabled || !uid) return;
    let live = true;
    getMyTeamInvite().then((value) => { if (live) setResult({ uid, attempt, value, error: false }); }).catch(() => { if (live) setResult({ uid, attempt, value: null, error: true }); });
    return () => { live = false; };
  }, [attempt, enabled, uid]);
  const selected = result?.uid === uid && result.attempt === attempt ? result : null;
  return {
    value: enabled ? selected?.value ?? null : null,
    loading: enabled && (!ready || Boolean(uid && !selected)),
    error: enabled && Boolean(selected?.error),
    retry: () => setAttempt((value) => value + 1),
  };
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

function Header({ role, team = null, coach = false }: { role: Role; team?: string | null; coach?: boolean }) {
  const styles = useAthleteStyles(baseStyles);
  const { user } = useAuthSession();
  const { photoUri, profileName } = usePreferences();
  const profileOwner = user?.uid ?? (firebaseAuth ? null : 'local-demo');
  const since = user?.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString([], { month: 'long', year: 'numeric' }) : null;
  const realName = profileName?.trim() || user?.displayName?.trim() || null;
  const name = realName ?? 'Add your name';
  const initials = realName ? realName.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase() : null;

  const pick = async (camera: boolean) => {
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) { Alert.alert('Camera access is off', 'Turn it on in Settings to take a profile picture.', [{ text: 'Not now', style: 'cancel' }, { text: 'Settings', onPress: () => Linking.openSettings() }]); return; }
      }
      const options: ImagePicker.ImagePickerOptions = { allowsEditing: true, aspect: [1, 1], mediaTypes: ['images'], quality: 0.7 };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets[0]) return;
      setProfile({ photoUri: await keepPhoto(result.assets[0].uri, photoUri) }, profileOwner);
    } catch {
      Alert.alert('Couldn’t use that photo', camera ? 'This device may not have a camera. Try choosing from your library.' : 'Try another photo.');
    }
  };
  const choosePhoto = () => Alert.alert('Profile picture', undefined, [
    // The picker can't present while this alert is still closing, so it waits a beat.
    { text: 'Choose from library', onPress: () => setTimeout(() => pick(false), 400) },
    { text: 'Take photo', onPress: () => setTimeout(() => pick(true), 400) },
    ...(photoUri ? [{ text: 'Remove photo', style: 'destructive' as const, onPress: () => { try { new File(photoUri).delete(); } catch {} setProfile({ photoUri: null }, profileOwner); } }] : []),
    { text: 'Cancel', style: 'cancel' as const },
  ]);
  const rename = () => {
    const save = (next?: string) => {
      const value = next?.trim();
      if (!value) return;
      setProfile({ profileName: value }, profileOwner);
      const current = firebaseAuth?.currentUser;
      if (current && current.uid === profileOwner) updateProfile(current, { displayName: value }).catch(() => {});
    };
    if (Platform.OS === 'ios') Alert.prompt('Your name', 'Shown to your team.', save, 'plain-text', realName ?? '');
    else Alert.alert('Change your name', 'Name changes are available on iPhone for now.');
  };

  return (
    <View style={[styles.header, coach && styles.coachHeader]}>
      <Pressable accessibilityHint="Changes your profile picture" accessibilityLabel="Profile picture" accessibilityRole="button" onPress={choosePhoto} style={({ pressed }) => [styles.avatarWrap, coach && styles.coachAvatarWrap, pressed && styles.pressed]}>
        {photoUri ? <Image accessibilityIgnoresInvertColors contentFit="cover" source={{ uri: photoUri }} style={[styles.avatar, coach && styles.coachAvatar]} /> : <View style={[styles.avatar, coach && styles.coachAvatar]}>{initials ? <Text style={[styles.avatarText, coach && styles.coachAvatarText]}>{initials}</Text> : <PersonGlyph />}</View>}
        <View style={styles.avatarBadge}><Pencil /></View>
      </Pressable>
      <View style={[styles.identity, coach && styles.coachIdentity]}>
        <View style={styles.nameLine}>
          <Text style={[styles.name, coach && styles.coachName, !realName && styles.namePlaceholder]}>{name}</Text>
          <ActionButton accessibilityLabel="Edit your name" accessibilityHint="Changes the name shown to your team" label="Edit" onPress={rename} style={styles.editAction} variant="text" />
        </View>
        <Text style={[styles.meta, coach && styles.coachMeta]}>{role}{coach && team ? ` · ${team}` : ''}</Text>
        {coach && since ? <Text style={styles.coachSince}>Member since {since}</Text> : null}
      </View>
    </View>
  );
}

/** Summarizes the available records. A capped history cannot establish all-time totals or trends. */
function Season({ team, waiting, coach = false }: { team: ReturnType<typeof useCoachDataState>; waiting: boolean; coach?: boolean }) {
  const styles = useAthleteStyles(baseStyles);
  const sample = Boolean(team.data?.sample);
  const history = usePastSessionsState(team.data?.teamId ?? null, sample, RECORD_LIMIT);
  const past = history.data;
  const temp = useTemperature();
  const now = useNow(60_000);
  const [period, setPeriod] = useState<Period>('30d');
  const days = PERIOD_DAYS[period];
  const inRange = (from: number, to: number) => (past ?? []).filter((p) => p.session.startedAt.getTime() >= from && p.session.startedAt.getTime() < to);
  const current = days ? inRange(now - days * 86_400_000, now) : past ?? [];
  const hours = (list: typeof current) => list.reduce((sum, p) => sum + ((p.session.endedAt ?? p.session.startedAt).getTime() - p.session.startedAt.getTime()), 0) / 3_600_000;
  const hottest = current.reduce<{ wbgtF: number; zone: Zone } | null>((hot, p) => (p.peak && (!hot || p.peak.wbgtF > hot.wbgtF) ? p.peak : hot), null);
  return (
    <View style={[styles.season, coach && styles.coachSeason]}>
      <View style={styles.seasonHead}>
        <Text accessibilityRole="header" style={[styles.sectionTitle, coach && styles.coachCardTitle]}>Practice record</Text>
        <Segmented itemWidth={64} onChange={setPeriod} options={(Object.keys(PERIOD_DAYS) as Period[]).map((key) => ({ key, label: key }))} size="sm" value={period} />
      </View>
      {team.status === 'ready' && history.status === 'ready' ? <Text style={styles.recordNote}>{`Based on up to ${RECORD_LIMIT} recent saved practices.`}</Text> : null}
      {sample ? <SampleTag /> : null}
      {team.status === 'error' ? <View style={styles.recordState}>
        <Text accessibilityRole="alert" style={styles.empty}>Couldn’t load your team’s practice records.</Text>
        <ActionButton label="Try again" onPress={team.retry} variant="secondary" />
      </View> : team.status === 'loading' ? <Text style={styles.empty}>Loading your team…</Text>
        : team.status === 'no-team' ? <Text style={styles.empty}>{waiting ? 'Practice records become available after your coach approves your team request.' : coach ? 'Create a team to save practice records.' : 'Join a team to view its saved practices.'}</Text>
          : history.status === 'error' ? <View style={styles.recordState}>
            <Text accessibilityRole="alert" style={styles.empty}>Couldn’t load saved practices.</Text>
            <ActionButton label="Try again" onPress={history.retry} variant="secondary" />
          </View> : past === null ? <Text style={styles.empty}>Loading practice records…</Text> : current.length ? (
        <>
          <View accessible accessibilityLabel={`${current.length} ${current.length === 1 ? 'practice' : 'practices'} in the available records`} style={styles.practiceSummary}>
            <Text style={[styles.practiceCount, coach && styles.coachPracticeCount]}>{current.length}<Text style={styles.practiceUnit}> {current.length === 1 ? 'practice' : 'practices'}</Text></Text>
          </View>
          <View accessible style={[styles.seasonRow, coach && styles.coachSeasonRow]}>
            <Text style={[styles.seasonLabel, coach && styles.coachSeasonLabel]}>Practice time</Text>
            <Text style={[styles.seasonValue, coach && styles.coachSeasonValue]}>{hours(current).toFixed(1)}<Text style={styles.zoneLabel}> hr</Text></Text>
          </View>
          <View accessible style={[styles.seasonRow, coach && styles.coachSeasonRow]}>
            <Text style={[styles.seasonLabel, coach && styles.coachSeasonLabel]}>Peak WBGT</Text>
            <Text style={[styles.seasonValue, coach && styles.coachSeasonValue, hottest ? { color: tone(hottest.zone) } : null]}>
              {hottest ? `${temp.value(hottest.wbgtF)}${temp.unit}` : '--'}
              {hottest ? <Text style={styles.zoneLabel}>  {ZONES[hottest.zone].label.replace(' zone', '')}</Text> : null}
            </Text>
          </View>
        </>
      ) : <Text style={styles.empty}>No finished practices in this view.</Text>}
    </View>
  );
}

/** The athlete's band, the way WHOOP shows the strap: the device, its battery, when it last synced. */
function BandDevice() {
  const styles = useAthleteStyles(baseStyles);
  const athleteAppearance = useAthleteAppearance();
  const { bandConnected } = usePreferences();
  // ponytail: battery and sync come from the simulator until the band's BLE battery service lands.
  const battery = 78;
  return (
    <Pressable accessibilityLabel={bandConnected ? `HeatSense Band, simulated battery ${battery} percent` : 'Pair your HeatSense Band'} accessibilityHint={bandConnected ? 'Opens band settings' : 'Opens band pairing'} accessibilityRole="button" onPress={() => router.push('/pair-band')} style={({ pressed }) => [styles.device, pressed && styles.pressed]}>
      <FloatingBand size={76} source={athleteAppearance ? BAND_SIDE : BAND} />
      <View style={styles.deviceCopy}>
        <Text style={styles.cardTitle}>HeatSense Band</Text>
        {bandConnected ? (
          <>
            <Text style={styles.deviceSerial}>Simulated · {PAIRED_SERIAL}</Text>
            <View style={styles.battery}>
              <Fill color={Palette.safe} progress={battery / 100} radius={3} style={styles.batteryBar} track="rgba(235,235,245,0.1)" />
              <Text style={styles.batteryText}>{battery}%</Text>
            </View>
          </>
        ) : (
          <Text style={[styles.deviceSerial, { color: Palette.coral }]}>Pair your band</Text>
        )}
      </View>
    </Pressable>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (next: boolean) => void }) {
  return <ListRow label={label} trailing={<Switch accessibilityLabel={label} onValueChange={onChange} trackColor={{ true: Palette.coral }} value={value} />} />;
}

function CoachSettingRow({ label, onPress, trailing }: { label: string; onPress?: () => void; trailing?: ReactNode }) {
  const styles = baseStyles;
  const content = <><Text style={styles.coachSettingLabel}>{label}</Text>{trailing ?? (onPress ? <Text style={styles.coachChevron}>›</Text> : null)}</>;
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.coachSettingRow, pressed && styles.pressed]}>{content}</Pressable> : <View style={styles.coachSettingRow}>{content}</View>;
}

function CoachSettingsSection({ children, title }: { children: ReactNode; title: string }) {
  const styles = baseStyles;
  return <View style={styles.coachSettingsSection}><Text accessibilityRole="header" style={styles.coachSettingsTitle}>{title}</Text><View style={styles.coachSettingsCard}>{children}</View></View>;
}

export function ProfileTab({ role }: { role: Role }) {
  const styles = useAthleteStyles(baseStyles);
  const team = useCoachDataState(role === 'Athlete' ? 'athlete' : role === 'Athletic trainer' ? 'trainer' : 'coach');
  const data = team.data;
  const trainers = useTrainers(role === 'Athlete' ? data?.teamId ?? null : null);
  const teamLookup = useMyTeam(role === 'Coach');
  const mine = teamLookup.value;
  const membership = useMembership(role !== 'Coach');
  const prefs = usePreferences();
  const { user } = useAuthSession();
  const reduced = useReducedMotion();
  const since = user?.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString([], { month: 'long', year: 'numeric' }) : null;
  const teamName = role === 'Coach' ? mine?.team.teamName ?? null : membership?.status === 'active' ? membership.team?.teamName ?? null : null;
  const waiting = membership?.status === 'pending' ? membership.team?.teamName ?? 'your team' : null;
  const staff = role !== 'Athlete';
  const [view, setView] = useState<'overview' | 'settings'>('overview');
  const [testingAlert, setTestingAlert] = useState(false);
  const testingAlertRef = useRef(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const loggingOutRef = useRef(false);
  const [signOutPrompt, setSignOutPrompt] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const testAlert = async () => {
    if (testingAlertRef.current) return;
    testingAlertRef.current = true;
    setTestingAlert(true);
    try {
      if (!(await askForHeatAlerts())) {
        Alert.alert('Notifications are off', 'Turn them on in Settings so HeatSense can warn you about heat.', [{ text: 'Not now', style: 'cancel' }, { text: 'Settings', onPress: () => Linking.openSettings() }]);
        return;
      }
      await notifyNow('HeatSense test alert', 'Alerts are working. You’ll hear about rechecks and zone changes like this.');
    } catch {
      Alert.alert('Couldn’t send the test alert', 'Try again. If it still doesn’t appear, check notification permissions in Settings.');
    } finally {
      testingAlertRef.current = false;
      setTestingAlert(false);
    }
  };
  const performSignOut = async () => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    setLoggingOut(true);
    setSignOutError(null);
    try {
      if (firebaseAuth) await signOut(firebaseAuth);
      router.replace('/welcome');
    } catch {
      setSignOutError('Couldn’t log out. Please try again.');
      if (Platform.OS !== 'web') Alert.alert('Couldn’t log out', 'Please try again.');
    } finally {
      loggingOutRef.current = false;
      setLoggingOut(false);
    }
  };
  const confirmSignOut = () => {
    if (loggingOutRef.current) return;
    setSignOutError(null);
    if (Platform.OS === 'web') {
      setSignOutPrompt(true);
      return;
    }
    Alert.alert('Log out of HeatSense?', undefined, [
      { style: 'cancel', text: 'Cancel' },
      { onPress: performSignOut, style: 'destructive', text: 'Log out' },
    ]);
  };

  if (role === 'Coach') {
    return (
      <>
        <Header coach role={role} team={teamName} />
        <Season coach team={team} waiting={false} />
        <CoachSettingsSection title="Team">
          {teamLookup.error ? <CoachSettingRow label="Couldn’t load your team" onPress={teamLookup.retry} trailing={<Text style={styles.coachSettingValue}>Try again</Text>} /> : teamLookup.loading ? <CoachSettingRow label="Loading your team…" /> : <CoachSettingRow label={teamName ?? 'Create or manage your team'} onPress={mine === null ? () => router.push('/team/create') : undefined} trailing={<Text style={styles.coachSettingValue}>{teamName ? 'Team' : 'Not set'}</Text>} />}
        </CoachSettingsSection>
        <CoachSettingsSection title="Notifications">
          <CoachSettingRow label="Recheck reminders" trailing={<Switch accessibilityLabel="Recheck reminders" onValueChange={(v) => setPreference('alertRecheck', v)} trackColor={{ false: CoachPalette.interactive, true: CoachPalette.peach }} value={prefs.alertRecheck} />} />
          <CoachSettingRow label="Zone changes" trailing={<Switch accessibilityLabel="Zone changes" onValueChange={(v) => setPreference('alertZone', v)} trackColor={{ false: CoachPalette.interactive, true: CoachPalette.peach }} value={prefs.alertZone} />} />
          <CoachSettingRow label="Slow-recovery alerts" trailing={<Switch accessibilityLabel="Slow-recovery alerts" onValueChange={(v) => setPreference('alertBand', v)} trackColor={{ false: CoachPalette.interactive, true: CoachPalette.peach }} value={prefs.alertBand} />} />
          <CoachSettingRow label="Test alert" trailing={<ActionButton busy={testingAlert} busyLabel="Sending…" label="Send" onPress={testAlert} variant="text" />} />
        </CoachSettingsSection>
        <CoachSettingsSection title="Display">
          <CoachSettingRow label="Temperature" trailing={<Segmented itemWidth={46} onChange={(key) => setPreference('celsius', key === 'c')} options={[{ key: 'f', label: '°F' }, { key: 'c', label: '°C' }]} size="sm" value={prefs.celsius ? 'c' : 'f'} />} />
          <CoachSettingRow label="Lock Screen practice clock" trailing={<Switch accessibilityLabel="Lock Screen practice clock" onValueChange={(v) => setPreference('practiceLiveActivity', v)} trackColor={{ false: CoachPalette.interactive, true: CoachPalette.peach }} value={prefs.practiceLiveActivity} />} />
          <CoachSettingRow label="Sample athletes" trailing={<Switch accessibilityLabel="Sample athletes" onValueChange={(v) => setPreference('demoTeam', v)} trackColor={{ false: CoachPalette.interactive, true: CoachPalette.peach }} value={prefs.demoTeam} />} />
        </CoachSettingsSection>
        <CoachSettingsSection title="Support">
          <CoachSettingRow label="UIL heat chart" onPress={() => Linking.openURL(UIL_SOURCE_URL)} />
          <CoachSettingRow label="Data permissions" onPress={() => Alert.alert('Data permissions', 'You see athletes on your roster and the practice records your team creates. Athletes’ health answers and emergency contacts stay private to them.')} />
          <CoachSettingRow label="Safety and limitations" onPress={() => Alert.alert('Safety and limitations', 'HeatSense supports, but doesn’t replace, your district’s emergency action plan or an athletic trainer’s judgment. It doesn’t diagnose heat illness.')} />
        </CoachSettingsSection>
        {Platform.OS === 'web' && signOutPrompt ? <View style={styles.signOutConfirm}>
          <Text accessibilityRole="header" style={styles.coachCardTitle}>Log out of HeatSense?</Text>
          {signOutError ? <Text accessibilityRole="alert" style={styles.signOutError}>{signOutError}</Text> : null}
          <ActionButton busy={loggingOut} busyLabel="Logging out…" label="Log out" onPress={performSignOut} variant="danger" />
          <ActionButton disabled={loggingOut} label="Cancel" onPress={() => { setSignOutPrompt(false); setSignOutError(null); }} variant="secondary" />
        </View> : <ActionButton busy={loggingOut} busyLabel="Logging out…" label="Log out" onPress={confirmSignOut} style={styles.coachLogout} variant="danger" />}
      </>
    );
  }

  return (
    <>
      <Header role={role} />
      <Segmented onChange={setView} options={[{ key: 'overview', label: 'Overview' }, { key: 'settings', label: 'Settings' }]} value={view} />

      <Animated.View entering={reduced ? undefined : FadeIn.duration(180).easing(EASE_OUT)} key={view}>
      {view === 'overview' ? <>
      <Season team={team} waiting={Boolean(waiting)} />
      {role === 'Athlete' ? <View style={styles.gap}><BandDevice /></View> : null}
      <CapsLabel>Team</CapsLabel>
      <Rows>
        {team.status === 'error' ? <ListRow label="Couldn’t load your team" onPress={team.retry} value="Try again" />
          : membership === undefined || team.status === 'loading' ? <ListRow label="Team" value="Loading…" />
            : <ListRow label={waiting ? 'Waiting for approval' : 'Team'} value={teamName ?? waiting ?? (data?.teamId ? 'Joined' : 'None yet')} />}
        {team.status === 'no-team' && membership !== undefined && !waiting ? <ListRow label="Join a team" onPress={() => router.push(role === 'Athlete' ? '/setup/athlete' : '/setup/trainer')} /> : null}
        {role === 'Athlete' ? <ListRow label="Athletic trainer" value={trainers.length ? trainers.map((t) => t.displayName ?? 'Trainer').join(', ') : 'None yet'} /> : null}
      </Rows>
      </> : <>
      <CapsLabel>Notifications</CapsLabel>
      <Rows>
        {staff ? <Toggle label="Recheck reminders" onChange={(v) => setPreference('alertRecheck', v)} value={prefs.alertRecheck} /> : null}
        <Toggle label="Zone changes" onChange={(v) => setPreference('alertZone', v)} value={prefs.alertZone} />
        {staff ? <Toggle label="Slow-recovery alerts" onChange={(v) => setPreference('alertBand', v)} value={prefs.alertBand} /> : null}
      </Rows>

      <ActionButton busy={testingAlert} busyLabel="Sending test alert…" label="Send a test alert" onPress={testAlert} style={styles.gap} variant="secondary" />

      <CapsLabel>Display</CapsLabel>
      <Rows>
        <ListRow
          label="Temperature"
          trailing={
            <Segmented itemWidth={46} onChange={(key) => setPreference('celsius', key === 'c')} options={[{ key: 'f', label: '°F' }, { key: 'c', label: '°C' }]} size="sm" value={prefs.celsius ? 'c' : 'f'} />
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
      <View style={styles.gap}><Rows>
        {since ? <ListRow label="Member since" value={since} /> : null}
        {Platform.OS === 'web' && signOutPrompt ? (
          <View style={styles.signOutConfirm}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Log out of HeatSense?</Text>
            {signOutError ? <Text accessibilityRole="alert" style={styles.signOutError}>{signOutError}</Text> : null}
            <ActionButton busy={loggingOut} busyLabel="Logging out…" label="Log out" onPress={performSignOut} variant="danger" />
            <ActionButton disabled={loggingOut} label="Cancel" onPress={() => { setSignOutPrompt(false); setSignOutError(null); }} variant="secondary" />
          </View>
        ) : <ListRow destructive label={loggingOut ? 'Logging out…' : 'Log out'} onPress={loggingOut ? undefined : confirmSignOut} />}
      </Rows></View>
      </>}
      </Animated.View>
    </>
  );
}

const baseStyles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  gap: { marginTop: 12 },
  signOutConfirm: { gap: 12, padding: 16 },
  signOutError: { color: Palette.emergency, fontSize: 16, lineHeight: 22 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 16, marginBottom: 24, marginTop: 16 },
  avatarWrap: { alignSelf: 'flex-start' },
  avatar: { alignItems: 'center', backgroundColor: Palette.surface, borderRadius: 36, height: 72, justifyContent: 'center', overflow: 'hidden', width: 72 },
  avatarText: { color: Palette.ink, fontFamily: Face.label, fontSize: 28 },
  avatarBadge: { alignItems: 'center', backgroundColor: Palette.coral, borderColor: Palette.canvas, borderRadius: 13, borderWidth: 3, bottom: -2, height: 26, justifyContent: 'center', position: 'absolute', right: -2, width: 26 },
  identity: { flex: 1, gap: 3 },
  nameLine: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  name: { color: Palette.ink, flexShrink: 1, fontSize: 23, fontWeight: '700', letterSpacing: -0.3 },
  namePlaceholder: { fontSize: 21 },
  editAction: { paddingHorizontal: 0, paddingVertical: 8 },
  meta: { color: Palette.inkMuted, fontSize: 15 },
  season: { marginTop: 28 },
  recordState: { alignItems: 'flex-start', gap: 8 },
  seasonHead: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', marginBottom: 18 },
  sectionTitle: { color: Palette.ink, fontSize: 20, fontWeight: '600' },
  cardTitle: { color: Palette.ink, fontSize: 18, fontWeight: '600' },
  practiceSummary: { gap: 4, paddingBottom: 20 },
  practiceCount: { color: Palette.ink, fontFamily: Face.figure, fontSize: 48, lineHeight: 54 },
  practiceUnit: { color: Palette.ink, fontFamily: Face.label, fontSize: 24 },
  seasonRow: { alignItems: 'center', borderTopColor: Palette.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', minHeight: 60, paddingVertical: 10 },
  seasonLabel: { color: Palette.ink, fontSize: 16 },
  seasonValue: { color: Palette.ink, flexShrink: 1, fontFamily: Face.figure, fontSize: 26, lineHeight: 30 },
  zoneLabel: { fontFamily: Face.label, fontSize: 17 },
  recordNote: { color: Palette.inkMuted, fontSize: 14, lineHeight: 20, marginBottom: 16 },
  empty: { color: Palette.inkMuted, fontSize: 16, lineHeight: 23, paddingBottom: 16 },
  device: { alignItems: 'center', borderBottomColor: Palette.border, borderBottomWidth: StyleSheet.hairlineWidth, borderTopColor: Palette.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 14, paddingVertical: 16 },
  deviceCopy: { flex: 1, gap: 4 },
  deviceSerial: { color: Palette.inkMuted, fontSize: 14 },
  battery: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 4 },
  batteryBar: { flex: 1 },
  batteryText: { color: Palette.ink, fontFamily: Face.figure, fontSize: 16 },
  coachHeader: { alignItems: 'flex-start', flexDirection: 'column', gap: 0, marginBottom: 24 },
  coachAvatarWrap: { marginBottom: 16 },
  coachAvatar: { backgroundColor: CoachPalette.surface, borderRadius: 42, height: 84, width: 84 },
  coachAvatarText: { color: CoachPalette.text, fontSize: 30 },
  coachName: { color: CoachPalette.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  coachMeta: { color: CoachPalette.textSecondary, fontSize: 16, fontWeight: '600' },
  coachSince: { color: CoachPalette.muted, fontSize: 13 },
  coachSeason: { marginTop: 0, backgroundColor: CoachPalette.surface, borderRadius: CoachRadius.card, padding: 22 },
  coachCardTitle: { color: CoachPalette.text, ...CoachType.card },
  coachPeriods: { backgroundColor: CoachPalette.interactive, borderRadius: CoachRadius.pill, padding: 4 },
  coachPeriod: { borderRadius: CoachRadius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  coachPeriodOn: { backgroundColor: CoachPalette.text },
  coachPeriodText: { color: CoachPalette.muted },
  coachSeasonRow: { minHeight: 72 },
  coachSeasonLabel: { color: CoachPalette.textSecondary, fontWeight: '600' },
  coachSeasonValue: { color: CoachPalette.text, fontSize: 32, lineHeight: 35 },
  coachSeasonChange: { color: CoachPalette.muted },
  coachSettingsSection: { marginTop: 30 },
  coachSettingsTitle: { color: CoachPalette.text, ...CoachType.section, marginBottom: 12 },
  coachSettingsCard: { backgroundColor: CoachPalette.surface, borderRadius: CoachRadius.card, overflow: 'hidden', paddingHorizontal: 20 },
  coachSettingRow: { alignItems: 'center', borderBottomColor: CoachPalette.hairline, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 12, justifyContent: 'space-between', minHeight: 62, paddingVertical: 8 },
  coachSettingLabel: { flex: 1, color: CoachPalette.textSecondary, fontSize: 16, fontWeight: '600' },
  coachSettingValue: { color: CoachPalette.muted, fontSize: 15, fontWeight: '600' },
  coachChevron: { color: CoachPalette.muted, fontSize: 26, lineHeight: 28 },
  coachUnits: { backgroundColor: CoachPalette.interactive, borderRadius: CoachRadius.pill, flexDirection: 'row', padding: 3 },
  coachUnit: { borderRadius: CoachRadius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  coachUnitOn: { backgroundColor: CoachPalette.peach },
  coachUnitText: { color: CoachPalette.muted, fontSize: 14, fontWeight: '800' },
  coachUnitTextOn: { color: CoachPalette.peachInk },
  coachLogout: { alignItems: 'center', backgroundColor: CoachPalette.surface, borderRadius: CoachRadius.pill, justifyContent: 'center', marginBottom: 12, marginTop: 30, minHeight: 52 },
  coachIdentity: { flex: 0, width: '100%' },
  coachPracticeCount: { color: CoachPalette.text },
});
