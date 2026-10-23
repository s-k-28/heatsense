import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { VitalsDetail } from '@/components/vitals';
import { MaxContentWidth, Palette } from '@/constants/theme';
import { useDemoTeam } from '@/state/demo-team';
import { useCoachData, type SessionRole } from '@/state/team-session';

// One athlete's band vitals, opened from the coach's Team tab or the trainer's Monitor.

export default function AthleteVitalsScreen() {
  const { id, role } = useLocalSearchParams<{ id?: string; role?: SessionRole }>();
  const insets = useSafeAreaInsets();
  const data = useCoachData(role === 'trainer' ? 'trainer' : 'coach');
  const zone = data?.readings.at(-1)?.zone ?? 'yellow';
  const { members } = useDemoTeam(zone);
  const member = members.find((m) => m.athlete.id === id) ?? null;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
        <Pressable accessibilityLabel="Back" accessibilityRole="button" hitSlop={10} onPress={() => (router.canGoBack() ? router.back() : router.replace('/dashboard?role=coach&tab=team'))} style={styles.back}>
          <Svg fill="none" height={24} stroke={Palette.ink} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" width={24}><Path d="m15 5-7 7 7 7" /></Svg>
        </Pressable>
        <Text numberOfLines={1} style={styles.barTitle}>{member ? member.athlete.name : 'Athlete'}</Text>
        <View style={styles.back} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.column}>
          {member ? (
            <>
              <Text style={styles.position}>{member.athlete.position}</Text>
              <VitalsDetail member={member} />
            </>
          ) : (
            <Text style={styles.empty}>No band data for this athlete. Vitals appear once they pair a HeatSense Band.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#0A0B0D', flex: 1 },
  bar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12 },
  back: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  barTitle: { color: Palette.ink, flex: 1, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  content: { alignItems: 'center', paddingTop: 8 },
  column: { maxWidth: MaxContentWidth, paddingHorizontal: 16, width: '100%' },
  position: { color: Palette.inkMuted, fontSize: 15, marginBottom: 12, textAlign: 'center' },
  empty: { color: Palette.inkMuted, fontSize: 16, lineHeight: 22, marginTop: 40, textAlign: 'center' },
});
