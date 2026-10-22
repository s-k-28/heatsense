import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { StepScreen, caps } from '@/components/step-kit';
import { Entry } from '@/constants/entry-theme';

// End of setup: what happens next, in three steps, instead of a preview full of sample numbers.
// After WHOOP's "What to expect next" calibration screen.

type ReadyRole = 'Coach' | 'Athletic trainer' | 'Athlete';

const SETUP: Record<ReadyRole, { dashboardRole: 'coach' | 'trainer' | 'athlete'; steps: { title: string; detail: string }[] }> = {
  Coach: {
    dashboardRole: 'coach',
    steps: [
      { title: 'Take a field reading', detail: 'Enter the WBGT from your meter. HeatSense sets the zone from your UIL class.' },
      { title: 'Approve your athletes', detail: 'Join requests show up on the Team tab as athletes enter your code.' },
      { title: 'Recheck on time', detail: 'HeatSense counts down to the next reading and flags it when it’s late.' },
    ],
  },
  'Athletic trainer': {
    dashboardRole: 'trainer',
    steps: [
      { title: 'Review the heat plan', detail: 'Check the UIL class and recheck interval for each team.' },
      { title: 'Follow live readings', detail: 'Every reading, zone and acknowledgment is recorded as it happens.' },
      { title: 'Export the record', detail: 'Share any practice’s full record from the Practice sheet.' },
    ],
  },
  Athlete: {
    dashboardRole: 'athlete',
    steps: [
      { title: 'Wear your band to practice', detail: 'Optional. It helps your coach and trainer notice when you need a break.' },
      { title: 'Check the zone', detail: 'See the field’s heat zone and what it means for practice today.' },
      { title: 'Speak up early', detail: 'Feeling dizzy, sick or confused? Stop and tell a coach right away.' },
    ],
  },
};

const SIZE = 220;
const R = 92;

/** Three arcs around a center mark, numbered like WHOOP's calibration ring. */
function StepRing() {
  const c = SIZE / 2;
  const point = (deg: number) => [c + R * Math.cos((deg * Math.PI) / 180), c + R * Math.sin((deg * Math.PI) / 180)];
  const arc = (from: number, to: number) => {
    const [x1, y1] = point(from);
    const [x2, y2] = point(to);
    return `M${x1} ${y1} A${R} ${R} 0 0 1 ${x2} ${y2}`;
  };
  const segments = [[-80, 25], [35, 140], [150, 260]] as const;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.ring}>
      <Svg height={SIZE} width={SIZE}>
        {segments.map(([from, to], i) => (
          <Path d={arc(from, to)} fill="none" key={i} stroke={i === 0 ? Entry.peach : Entry.lineStrong} strokeLinecap="round" strokeWidth={14} />
        ))}
        {segments.map(([, to], i) => {
          const [x, y] = point(to);
          return <Circle cx={x} cy={y} fill={Entry.canvas} key={`n${i}`} r={14} stroke={i === 0 ? Entry.peach : Entry.lineStrong} strokeWidth={2} />;
        })}
      </Svg>
      {segments.map(([, to], i) => {
        const [x, y] = point(to);
        return <Text key={`t${i}`} style={[styles.ringNumber, { left: x - 14, top: y - 10, color: i === 0 ? Entry.peach : Entry.muted }]}>{i + 1}</Text>;
      })}
      <View style={styles.ringCenter}>
        <Text style={styles.ringBig}>3</Text>
        <Text style={[caps, { color: Entry.muted }]}>steps</Text>
      </View>
    </View>
  );
}

export default function ReadyScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const setup = SETUP[(role && role in SETUP ? role : 'Coach') as ReadyRole];
  return (
    <StepScreen
      next={{ enabled: true, label: 'Finish', onPress: () => router.replace(`/dashboard?role=${setup.dashboardRole}` as never) }}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/role'))}
      progress={1}
      title="What to expect next"
      top="tight">
      <StepRing />
      <View style={styles.list}>
        {setup.steps.map((step, i) => (
          <View accessible key={step.title} style={styles.item}>
            <Text style={[styles.index, i === 0 && { color: Entry.peach }]}>{i + 1}</Text>
            <View style={styles.copy}>
              <Text style={styles.itemTitle}>{step.title}</Text>
              <Text style={styles.itemDetail}>{step.detail}</Text>
            </View>
          </View>
        ))}
      </View>
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  ring: { alignSelf: 'center', height: SIZE, width: SIZE },
  ringNumber: { fontFamily: Entry.strong, fontSize: 13, position: 'absolute', textAlign: 'center', width: 28 },
  ringCenter: { alignItems: 'center', bottom: 0, justifyContent: 'center', left: 0, position: 'absolute', right: 0, top: 0 },
  ringBig: { color: Entry.ink, fontFamily: Entry.display, fontSize: 56, lineHeight: 58 },
  list: { gap: 18 },
  item: { flexDirection: 'row', gap: 14 },
  index: { color: Entry.muted, fontFamily: Entry.strong, fontSize: 15, width: 18 },
  copy: { flex: 1, gap: 3 },
  itemTitle: { color: Entry.ink, fontFamily: Entry.strong, fontSize: 16 },
  itemDetail: { color: Entry.muted, fontFamily: Entry.body, fontSize: 14, lineHeight: 20 },
});
