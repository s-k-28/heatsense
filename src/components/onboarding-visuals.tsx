import { type ComponentProps, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { HeatIcon } from '@/components/heat-icon';
import { Fonts, Palette, Radius, Spacing } from '@/constants/theme';

const iconNames = {
  runner: { ios: 'figure.run', android: 'directions_run', web: 'directions_run' },
  heart: { ios: 'heart.fill', android: 'favorite', web: 'favorite' },
  heat: { ios: 'thermometer.medium', android: 'device_thermostat', web: 'device_thermostat' },
  water: { ios: 'drop.fill', android: 'water_drop', web: 'water_drop' },
  movement: { ios: 'figure.walk', android: 'directions_walk', web: 'directions_walk' },
  shield: { ios: 'shield.lefthalf.filled', android: 'health_and_safety', web: 'health_and_safety' },
  people: { ios: 'person.2.fill', android: 'groups', web: 'groups' },
  location: { ios: 'location.fill', android: 'location_on', web: 'location_on' },
} as const;

type SymbolName = ComponentProps<typeof HeatIcon>['name'];

export function RunnerSignalVisual() {
  const runnerX = useSharedValue(0);
  const runnerY = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    runnerX.value = withDelay(
      250,
      withTiming(1, { duration: reduceMotion ? 1 : 1650, easing: Easing.out(Easing.cubic) })
    );
    if (!reduceMotion) {
      runnerY.value = withRepeat(
        withSequence(withTiming(-5, { duration: 280 }), withTiming(2, { duration: 280 })),
        -1,
        true
      );
    }
  }, [reduceMotion, runnerX, runnerY]);

  const runnerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -70 + runnerX.value * 118 },
      { translateY: runnerY.value },
    ],
  }));

  return (
    <View style={styles.heroCard}>
      <View style={styles.visualTopRow}>
        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live protection</Text>
        </View>
        <HeatIcon name={iconNames.shield} size={22} tintColor={Palette.coral} />
      </View>

      <View style={styles.heartReadout}>
        <HeatIcon name={iconNames.heart} size={18} tintColor={Palette.coral} />
        <Text style={styles.readoutValue}>112</Text>
        <Text style={styles.readoutUnit}>bpm</Text>
      </View>

      <View style={styles.signalCanvas}>
        <Svg height="150" viewBox="0 0 340 150" width="100%">
          <Defs>
            <LinearGradient id="signalFill" x1="0" x2="0" y1="0" y2="1">
              <Stop offset="0" stopColor={Palette.coral} stopOpacity="0.22" />
              <Stop offset="1" stopColor={Palette.coral} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Path
            d="M0 92 L35 92 L50 84 L62 102 L77 91 L102 91 L116 82 L130 110 L145 34 L160 116 L175 72 L190 91 L225 91 L240 80 L252 100 L269 90 L302 90 L318 72 L340 91 L340 150 L0 150 Z"
            fill="url(#signalFill)"
          />
          <Path
            d="M0 92 L35 92 L50 84 L62 102 L77 91 L102 91 L116 82 L130 110 L145 34 L160 116 L175 72 L190 91 L225 91 L240 80 L252 100 L269 90 L302 90 L318 72 L340 91"
            fill="none"
            stroke={Palette.coral}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="4"
          />
          <Circle cx="318" cy="72" fill={Palette.surface} r="7" stroke={Palette.coral} strokeWidth="4" />
        </Svg>
        <Animated.View style={[styles.runnerBadge, runnerStyle]}>
          <HeatIcon name={iconNames.runner} size={50} tintColor={Palette.coralDark} />
        </Animated.View>
      </View>

      <View style={styles.visualFooter}>
        <Text style={styles.footerLabel}>Environment + athlete</Text>
        <Text style={styles.footerValue}>One clear safety picture</Text>
      </View>
    </View>
  );
}

export function WbgtVisual() {
  return (
    <View style={[styles.heroCard, styles.wbgtCard]}>
      <View style={styles.wbgtHeader}>
        <View>
          <Text style={styles.miniLabel}>Frisco, Texas</Text>
          <Text style={styles.updatedText}>Updated just now</Text>
        </View>
        <View style={styles.sunIconWrap}>
          <HeatIcon name={iconNames.heat} size={24} tintColor={Palette.warning} />
        </View>
      </View>

      <View style={styles.wbgtMain}>
        <Text style={styles.wbgtNumber}>84</Text>
        <Text style={styles.degree}>°F WBGT</Text>
        <View style={styles.zonePill}>
          <View style={styles.zoneDot} />
          <Text style={styles.zoneText}>Orange zone</Text>
        </View>
      </View>

      <Text style={styles.wbgtMessage}>Modify practice and increase recovery time.</Text>

      <View style={styles.wbgtStats}>
        <MiniWeatherStat label="Humidity" value="58%" />
        <View style={styles.statDivider} />
        <MiniWeatherStat label="Next break" value="08 min" />
        <View style={styles.statDivider} />
        <MiniWeatherStat label="Hydration" value="Ready" />
      </View>
    </View>
  );
}

function MiniWeatherStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.weatherStat}>
      <Text style={styles.weatherValue}>{value}</Text>
      <Text style={styles.weatherLabel}>{label}</Text>
    </View>
  );
}

type VitalCardProps = {
  alternateData: number[];
  color: string;
  data: number[];
  icon: SymbolName;
  label: string;
  unit: string;
  value: string;
  variant: 'line' | 'bars';
};

function VitalCard({ alternateData, color, data, icon, label, unit, value, variant }: VitalCardProps) {
  const [active, setActive] = useState(false);
  const reduceMotion = useReducedMotion();
  const cardScale = useSharedValue(1);
  const chartData = useMemo(
    () => (active ? alternateData : data).map((point) => ({ frontColor: color, value: point })),
    [active, alternateData, color, data]
  );
  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  function toggleSignal() {
    setActive((current) => !current);
    if (!reduceMotion) {
      cardScale.set(withSequence(
        withTiming(0.975, { duration: 90 }),
        withSpring(1, { damping: 13, stiffness: 240 })
      ));
    }
  }

  return (
    <Pressable
      accessibilityHint="Changes the sample signal trend"
      accessibilityLabel={`${label}, ${value} ${unit}`}
      accessibilityRole="button"
      onPress={toggleSignal}
      style={styles.vitalCardPressable}>
      <Animated.View
        style={[
          styles.vitalCard,
          active && { borderColor: color, borderWidth: 1.5 },
          animatedCardStyle,
        ]}>
        <View style={styles.vitalLabelRow}>
          <HeatIcon name={icon} size={16} tintColor={color} />
          <Text style={styles.vitalLabel}>{label}</Text>
          <View style={[styles.interactionDot, active && { backgroundColor: color }]} />
        </View>
        <View style={styles.vitalValueRow}>
          <Text style={styles.vitalValue}>{value}</Text>
          <Text style={styles.vitalUnit}>{unit}</Text>
        </View>
        <View pointerEvents="none" style={styles.miniChartClip}>
          {variant === 'line' ? (
            <LineChart
              adjustToWidth
              animateOnDataChange
              animationDuration={reduceMotion ? 1 : 520}
              color={color}
              curved={false}
              data={chartData}
              disableScroll
              endSpacing={0}
              height={46}
              hideDataPoints
              hideRules
              hideYAxisText
              initialSpacing={0}
              isAnimated
              key={`line-${active}`}
              onDataChangeAnimationDuration={reduceMotion ? 1 : 520}
              parentWidth={126}
              spacing={18}
              thickness={3}
              width={126}
              xAxisThickness={0}
              yAxisThickness={0}
            />
          ) : (
            <BarChart
              adjustToWidth
              animationDuration={reduceMotion ? 1 : 520}
              barBorderRadius={5}
              barWidth={13}
              data={chartData}
              endSpacing={0}
              height={46}
              hideRules
              hideYAxisText
              initialSpacing={0}
              isAnimated
              key={`bars-${active}`}
              maxValue={100}
              parentWidth={126}
              spacing={5}
              width={126}
              xAxisThickness={0}
              yAxisThickness={0}
            />
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

export function SignalsVisual() {
  return (
    <View>
      <View style={styles.signalGrid}>
        <VitalCard
          alternateData={[48, 66, 42, 82, 50, 76, 58]}
          color={Palette.coral}
          data={[42, 45, 68, 39, 61, 55, 73]}
          icon={iconNames.heart}
          label="Heart rate"
          unit="bpm"
          value="112"
          variant="line"
        />
        <VitalCard
          alternateData={[47, 50, 58, 55, 70, 64, 78]}
          color={Palette.warning}
          data={[44, 46, 52, 49, 60, 56, 64]}
          icon={iconNames.heat}
          label="Skin temp"
          unit="°F"
          value="98.2"
          variant="line"
        />
        <VitalCard
          alternateData={[36, 58, 45, 72, 64, 81, 69]}
          color="#547A8C"
          data={[28, 51, 39, 65, 54, 76, 62]}
          icon={iconNames.water}
          label="Sweat trend"
          unit="rising"
          value="+8%"
          variant="bars"
        />
        <VitalCard
          alternateData={[42, 67, 55, 81, 64, 88, 73]}
          color={Palette.safe}
          data={[36, 58, 44, 70, 57, 82, 65]}
          icon={iconNames.movement}
          label="Exertion"
          unit="moderate"
          value="62%"
          variant="bars"
        />
      </View>
      <View style={styles.signalNote}>
        <View style={styles.signalNoteIcon}>
          <HeatIcon name={iconNames.shield} size={18} tintColor={Palette.coralDark} />
        </View>
        <Text style={styles.signalNoteText}>
          Compared with the athlete&apos;s own baseline—not used as a diagnosis.
        </Text>
      </View>
    </View>
  );
}

export function TeamVisual() {
  return (
    <View style={[styles.heroCard, styles.teamCard]}>
      <View style={styles.teamHeader}>
        <View style={styles.teamIcon}>
          <HeatIcon name={iconNames.people} size={24} tintColor={Palette.ink} />
        </View>
        <View style={styles.teamCopy}>
          <Text style={styles.teamTitle}>Liberty High School</Text>
          <Text style={styles.teamSubtitle}>Varsity soccer · 24 athletes</Text>
        </View>
        <View style={styles.safePill}>
          <Text style={styles.safeText}>Ready</Text>
        </View>
      </View>

      <View style={styles.teamDivider} />

      <View style={styles.teamRows}>
        <TeamRow
          detail="WBGT 81°F · Yellow zone"
          icon={iconNames.location}
          label="Practice conditions"
          tone={Palette.caution}
        />
        <TeamRow
          detail="21 normal · 3 need review"
          icon={iconNames.heart}
          label="Athlete status"
          tone={Palette.coral}
        />
        <TeamRow
          detail="Every 20 minutes"
          icon={iconNames.water}
          label="Hydration plan"
          tone="#547A8C"
        />
      </View>
    </View>
  );
}

function TeamRow({
  detail,
  icon,
  label,
  tone,
}: {
  detail: string;
  icon: SymbolName;
  label: string;
  tone: string;
}) {
  return (
    <View style={styles.teamRow}>
      <View style={[styles.rowIcon, { backgroundColor: `${tone}18` }]}>
        <HeatIcon name={icon} size={18} tintColor={tone} />
      </View>
      <View style={styles.teamCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDetail}>{detail}</Text>
      </View>
      <View style={[styles.statusDot, { backgroundColor: tone }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderRadius: Radius.large,
    borderWidth: 1,
    minHeight: 326,
    overflow: 'hidden',
    padding: Spacing.five,
    shadowColor: '#45372E',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
  },
  visualTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  livePill: {
    alignItems: 'center',
    backgroundColor: Palette.coralSoft,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: 7,
  },
  liveDot: {
    backgroundColor: Palette.coral,
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  liveText: {
    color: Palette.coralDark,
    fontFamily: Fonts.semibold,
    fontSize: 12,
  },
  heartReadout: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 5,
    marginTop: Spacing.five,
  },
  readoutValue: {
    color: Palette.ink,
    fontFamily: Fonts.extrabold,
    fontSize: 34,
    letterSpacing: -1.5,
  },
  readoutUnit: {
    color: Palette.inkMuted,
    fontFamily: Fonts.semibold,
    fontSize: 12,
  },
  signalCanvas: {
    height: 150,
    justifyContent: 'center',
    marginHorizontal: -Spacing.five,
    marginTop: -6,
  },
  runnerBadge: {
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderColor: Palette.coralSoft,
    borderRadius: 36,
    borderWidth: 1,
    height: 70,
    justifyContent: 'center',
    left: '50%',
    position: 'absolute',
    top: 15,
    width: 70,
  },
  visualFooter: {
    borderTopColor: Palette.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
    paddingTop: Spacing.four,
  },
  footerLabel: {
    color: Palette.inkMuted,
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
  footerValue: {
    color: Palette.ink,
    fontFamily: Fonts.bold,
    fontSize: 15,
  },
  wbgtCard: {
    backgroundColor: '#FFF4DD',
  },
  wbgtHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  miniLabel: {
    color: Palette.ink,
    fontFamily: Fonts.bold,
    fontSize: 13,
  },
  updatedText: {
    color: Palette.inkMuted,
    fontFamily: Fonts.medium,
    fontSize: 11,
    marginTop: 2,
  },
  sunIconWrap: {
    alignItems: 'center',
    backgroundColor: '#FFE8B5',
    borderRadius: Radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  wbgtMain: {
    alignItems: 'baseline',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: Spacing.four,
  },
  wbgtNumber: {
    color: Palette.ink,
    fontFamily: Fonts.extrabold,
    fontSize: 76,
    letterSpacing: -5,
    lineHeight: 82,
  },
  degree: {
    color: Palette.inkMuted,
    fontFamily: Fonts.bold,
    fontSize: 13,
  },
  zonePill: {
    alignItems: 'center',
    backgroundColor: '#FFE2B6',
    borderRadius: Radius.pill,
    flexDirection: 'row',
    gap: 6,
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  zoneDot: {
    backgroundColor: Palette.warning,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  zoneText: {
    color: '#75410D',
    fontFamily: Fonts.bold,
    fontSize: 11,
  },
  wbgtMessage: {
    color: Palette.ink,
    fontFamily: Fonts.semibold,
    fontSize: 17,
    lineHeight: 23,
    marginTop: Spacing.one,
    maxWidth: 270,
  },
  wbgtStats: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.52)',
    borderRadius: Radius.medium,
    flexDirection: 'row',
    marginTop: 'auto',
    paddingVertical: Spacing.four,
  },
  weatherStat: {
    alignItems: 'center',
    flex: 1,
    gap: 3,
  },
  weatherValue: {
    color: Palette.ink,
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
  weatherLabel: {
    color: Palette.inkMuted,
    fontFamily: Fonts.medium,
    fontSize: 10,
  },
  statDivider: {
    backgroundColor: 'rgba(27,28,25,0.12)',
    height: 28,
    width: StyleSheet.hairlineWidth,
  },
  signalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  vitalCardPressable: {
    flexBasis: '47%',
    flexGrow: 1,
  },
  vitalCard: {
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderRadius: Radius.medium,
    borderWidth: 1,
    minHeight: 164,
    overflow: 'hidden',
    padding: Spacing.four,
  },
  vitalLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  vitalLabel: {
    color: Palette.ink,
    fontFamily: Fonts.semibold,
    fontSize: 12,
  },
  interactionDot: {
    backgroundColor: Palette.border,
    borderRadius: 3,
    height: 6,
    marginLeft: 'auto',
    width: 6,
  },
  vitalValueRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 5,
    marginTop: Spacing.three,
  },
  vitalValue: {
    color: Palette.ink,
    fontFamily: Fonts.extrabold,
    fontSize: 25,
    letterSpacing: -1,
  },
  vitalUnit: {
    color: Palette.inkMuted,
    fontFamily: Fonts.medium,
    fontSize: 9,
  },
  miniChartClip: {
    height: 50,
    marginLeft: -6,
    marginTop: 1,
    overflow: 'hidden',
    width: 132,
  },
  signalNote: {
    alignItems: 'center',
    backgroundColor: Palette.coralSoft,
    borderRadius: Radius.medium,
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  signalNoteIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderRadius: Radius.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  signalNoteText: {
    color: Palette.coralDark,
    flex: 1,
    fontFamily: Fonts.semibold,
    fontSize: 11,
    lineHeight: 16,
  },
  teamCard: {
    justifyContent: 'flex-start',
  },
  teamHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
  },
  teamIcon: {
    alignItems: 'center',
    backgroundColor: Palette.surfaceMuted,
    borderRadius: 18,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  teamCopy: {
    flex: 1,
  },
  teamTitle: {
    color: Palette.ink,
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
  teamSubtitle: {
    color: Palette.inkMuted,
    fontFamily: Fonts.medium,
    fontSize: 11,
    marginTop: 3,
  },
  safePill: {
    backgroundColor: '#DFEEE5',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  safeText: {
    color: Palette.safe,
    fontFamily: Fonts.bold,
    fontSize: 10,
  },
  teamDivider: {
    backgroundColor: Palette.border,
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.five,
  },
  teamRows: {
    gap: Spacing.four,
  },
  teamRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
  },
  rowIcon: {
    alignItems: 'center',
    borderRadius: 14,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  rowLabel: {
    color: Palette.ink,
    fontFamily: Fonts.semibold,
    fontSize: 12,
  },
  rowDetail: {
    color: Palette.inkMuted,
    fontFamily: Fonts.medium,
    fontSize: 10,
    marginTop: 3,
  },
  statusDot: {
    borderRadius: 5,
    height: 9,
    width: 9,
  },
});
