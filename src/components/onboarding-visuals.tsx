import { type ComponentProps, useEffect, useMemo, useState } from 'react';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
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
  emergency: { ios: 'cross.case.fill', android: 'medical_services', web: 'medical_services' },
  clock: { ios: 'clock.fill', android: 'schedule', web: 'schedule' },
  work: { ios: 'figure.run', android: 'fitness_center', web: 'fitness_center' },
  rest: { ios: 'pause.fill', android: 'pause', web: 'pause' },
  equipment: { ios: 'sportscourt.fill', android: 'sports_football', web: 'sports_football' },
  alert: { ios: 'bell.badge.fill', android: 'notifications_active', web: 'notifications_active' },
} as const;

type SymbolName = ComponentProps<typeof HeatIcon>['name'];

export function RunnerSignalVisual() {
  const runnerX = useSharedValue(0);
  const runnerY = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    runnerX.value = withDelay(
      160,
      withTiming(1, { duration: reduceMotion ? 1 : 860, easing: Easing.out(Easing.cubic) })
    );
    if (!reduceMotion) {
      runnerY.value = withDelay(
        320,
        withSequence(
          withTiming(-4, { duration: 150, easing: Easing.out(Easing.quad) }),
          withSpring(0, { damping: 20, stiffness: 280 })
        )
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
    <View style={[styles.heroCard, styles.runnerCard]}>
      <View style={styles.visualTopRow}>
        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Sample athlete signal</Text>
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
        <Text style={styles.footerLabel}>Primary protection</Text>
        <Text style={styles.footerValue}>WBGT guidance works without a wristband.</Text>
      </View>
    </View>
  );
}

export function WbgtVisual() {
  return (
    <ExpoLinearGradient
      colors={['#F5A052', '#FFD28A', '#FFF7E8']}
      end={{ x: 0.9, y: 1 }}
      locations={[0, 0.46, 1]}
      start={{ x: 0.1, y: 0 }}
      style={[styles.heroCard, styles.wbgtCard]}>
      <View style={styles.wbgtHeader}>
        <View>
          <Text style={styles.miniLabel}>Frisco, Texas</Text>
          <Text style={styles.updatedText}>Example conditions</Text>
        </View>
        <View style={styles.sunIconWrap}>
          <HeatIcon name={iconNames.heat} size={24} tintColor={Palette.warning} />
        </View>
      </View>

      <View style={styles.wbgtMain}>
        <Text style={styles.wbgtNumber}>84</Text>
        <Text style={styles.degree}>°F WBGT</Text>
      </View>

      <View>
        <Text style={styles.wbgtZoneTitle}>Orange zone</Text>
        <Text style={styles.wbgtMessage}>Use the school&apos;s class-specific UIL plan.</Text>
      </View>

      <View style={styles.wbgtTimingRow}>
        <WbgtTiming label="Before" value="15 min" />
        <WbgtTiming label="Recheck" value="30 min" />
        <WbgtTiming label="If changed" value="Adjust" />
      </View>

      <View style={styles.wbgtTrend}>
        <Svg height="52" viewBox="0 0 340 52" width="100%">
          <Path
            d="M0 31 C35 33 52 21 76 27 C98 32 105 45 124 29 C145 11 161 43 183 28 C208 12 231 24 249 21 C276 17 295 37 316 24 C326 18 334 11 340 4"
            fill="none"
            stroke={Palette.ink}
            strokeLinecap="round"
            strokeWidth="2.4"
          />
        </Svg>
      </View>
    </ExpoLinearGradient>
  );
}

function WbgtTiming({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.wbgtTiming}>
      <Text style={styles.wbgtTimingValue}>{value}</Text>
      <Text style={styles.wbgtTimingLabel}>{label}</Text>
    </View>
  );
}

export function PracticePlanVisual() {
  return (
    <View style={[styles.heroCard, styles.planCard]}>
      <View style={styles.planHeader}>
        <View>
          <Text style={styles.miniLabel}>Orange zone example</Text>
          <Text style={styles.updatedText}>Coach practice view</Text>
        </View>
        <View style={styles.planClock}>
          <HeatIcon name={iconNames.clock} size={22} tintColor={Palette.warning} />
        </View>
      </View>

      <View style={styles.planRows}>
        <PlanRow
          detail="Use the class-specific maximum"
          icon={iconNames.work}
          label="Work interval"
          tone={Palette.warning}
        />
        <PlanRow
          detail="Meet the required minimum"
          icon={iconNames.rest}
          label="Rest break"
          tone={Palette.coralDark}
        />
        <PlanRow
          detail="Unlimited during rest breaks"
          icon={iconNames.water}
          label="Water access"
          tone="#547A8C"
        />
        <PlanRow
          detail="Modify when the plan requires it"
          icon={iconNames.equipment}
          label="Equipment"
          tone={Palette.inkMuted}
        />
      </View>

      <View style={styles.planFooter}>
        <Text style={styles.planFooterTitle}>One source of truth</Text>
        <Text style={styles.planFooterBody}>The school&apos;s current UIL plan controls every recommendation.</Text>
      </View>
    </View>
  );
}

function PlanRow({
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
    <View style={styles.planRow}>
      <View style={[styles.planRowIcon, { backgroundColor: `${tone}16` }]}>
        <HeatIcon name={icon} size={19} tintColor={tone} />
      </View>
      <View style={styles.planRowCopy}>
        <Text style={styles.planRowLabel}>{label}</Text>
        <Text style={styles.planRowDetail}>{detail}</Text>
      </View>
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
        withSpring(1, { damping: 20, stiffness: 280 })
      ));
    }
  }

  return (
    <Pressable
      accessibilityHint="Changes the sample signal trend"
      accessibilityLabel={`${label}, ${value} ${unit}`}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={toggleSignal}
      style={styles.vitalCardPressable}>
      <Animated.View
        style={[
          styles.vitalCard,
          active && { borderColor: color, borderWidth: 1.5 },
          animatedCardStyle,
        ]}>
        <View style={styles.vitalLabelRow}>
          <HeatIcon
            animationSpec={
              reduceMotion
                ? undefined
                : {
                    effect: { type: 'scale', wholeSymbol: true },
                    repeatCount: 1,
                    speed: 0.45,
                  }
            }
            key={`${label}-${active}`}
            name={icon}
            size={16}
            tintColor={color}
          />
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
    <View style={styles.signalsVisual}>
      <View style={styles.signalGrid}>
        <VitalCard
          alternateData={[48, 66, 42, 82, 50, 76, 58]}
          color={Palette.coral}
          data={[42, 45, 68, 39, 61, 55, 73]}
          icon={iconNames.heart}
          label="HR recovery"
          unit="bpm"
          value="+18"
          variant="line"
        />
        <VitalCard
          alternateData={[47, 50, 58, 55, 70, 64, 78]}
          color={Palette.warning}
          data={[44, 46, 52, 49, 60, 56, 64]}
          icon={iconNames.heat}
          label="Skin trend"
          unit="°F / 5m"
          value="+0.7"
          variant="line"
        />
        <VitalCard
          alternateData={[36, 58, 45, 72, 64, 81, 69]}
          color="#547A8C"
          data={[28, 51, 39, 65, 54, 76, 62]}
          icon={iconNames.water}
          label="Sweat trend"
          unit="baseline"
          value="+8%"
          variant="bars"
        />
        <VitalCard
          alternateData={[42, 67, 55, 81, 64, 88, 73]}
          color={Palette.safe}
          data={[36, 58, 44, 70, 57, 82, 65]}
          icon={iconNames.movement}
          label="Exertion"
          unit="movement"
          value="62%"
          variant="bars"
        />
      </View>
      <View style={styles.signalFootnote}>
        <Text style={styles.signalFootnoteTitle}>Illustrative readings</Text>
        <Text style={styles.signalFootnoteBody}>
          Each card shows change from this athlete&apos;s baseline. HeatSense flags patterns for human review and does not diagnose.
        </Text>
      </View>
    </View>
  );
}

export function ContextVisual() {
  return (
    <View style={[styles.heroCard, styles.contextCard]}>
      <View style={styles.contextReading}>
        <HeatIcon name={iconNames.heart} size={19} tintColor={Palette.coral} />
        <Text style={styles.contextNumber}>142</Text>
        <Text style={styles.contextUnit}>bpm in both moments</Text>
      </View>

      <View style={styles.contextTrace}>
        <Svg height="68" viewBox="0 0 340 68" width="100%">
          <Path
            d="M0 41 L34 41 L47 28 L60 51 L78 37 L104 37 L117 23 L132 53 L150 35 L183 35 L199 20 L214 51 L231 36 L258 36 L273 25 L291 48 L309 34 L340 34"
            fill="none"
            stroke={Palette.coral}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3.5"
          />
        </Svg>
      </View>

      <View style={styles.contextScenarios}>
        <ContextScenario
          detail="High movement"
          icon={iconNames.runner}
          label="During a sprint"
          result="Expected exertion"
          tone={Palette.safe}
        />
        <ContextScenario
          detail="Low movement"
          icon={iconNames.rest}
          label="During a water break"
          result="Recovery needs review"
          tone={Palette.coralDark}
        />
      </View>

      <View style={styles.contextFooter}>
        <HeatIcon name={iconNames.movement} size={20} tintColor={Palette.ink} />
        <View style={styles.contextFooterCopy}>
          <Text style={styles.contextFooterTitle}>Movement changes the meaning</Text>
          <Text style={styles.contextFooterBody}>The IMU helps separate exertion from stalled recovery.</Text>
        </View>
      </View>
    </View>
  );
}

function ContextScenario({
  detail,
  icon,
  label,
  result,
  tone,
}: {
  detail: string;
  icon: SymbolName;
  label: string;
  result: string;
  tone: string;
}) {
  return (
    <View style={styles.contextScenario}>
      <View style={[styles.contextScenarioIcon, { backgroundColor: `${tone}18` }]}>
        <HeatIcon name={icon} size={27} tintColor={tone} />
      </View>
      <Text style={styles.contextScenarioLabel}>{label}</Text>
      <Text style={styles.contextScenarioDetail}>{detail}</Text>
      <View style={[styles.contextResult, { backgroundColor: `${tone}14` }]}>
        <Text style={[styles.contextResultText, { color: tone }]}>{result}</Text>
      </View>
    </View>
  );
}

export function AlertLevelsVisual() {
  return (
    <View style={[styles.heroCard, styles.alertCard]}>
      <View style={styles.alertHeader}>
        <Text style={styles.miniLabel}>Wristband and app outputs</Text>
        <HeatIcon name={iconNames.alert} size={22} tintColor={Palette.coralDark} />
      </View>

      <View style={styles.alertRows}>
        <AlertRow color={Palette.safe} detail="Routine vitals" label="Normal" message="Home dashboard" />
        <AlertRow color={Palette.caution} detail="One short buzz" label="Caution" message="Hydrate" />
        <AlertRow
          color={Palette.warning}
          detail="Repeats until acknowledged"
          label="Warning"
          message="Take a break"
        />
        <AlertRow
          color={Palette.emergency}
          detail="Continuous buzz and app alert"
          label="Emergency"
          message="Immediate response"
        />
      </View>

      <View style={styles.alertFooter}>
        <HeatIcon name={iconNames.emergency} size={19} tintColor={Palette.emergency} />
        <Text style={styles.alertFooterText}>Collapse detection bypasses scoring and triggers Emergency.</Text>
      </View>
    </View>
  );
}

function AlertRow({
  color,
  detail,
  label,
  message,
}: {
  color: string;
  detail: string;
  label: string;
  message: string;
}) {
  return (
    <View style={styles.alertRow}>
      <View style={[styles.alertRail, { backgroundColor: color }]} />
      <View style={styles.alertLevelCopy}>
        <Text style={[styles.alertLevel, { color }]}>{label}</Text>
        <Text style={styles.alertMessage}>{message}</Text>
      </View>
      <Text style={styles.alertDetail}>{detail}</Text>
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
          <Text style={styles.teamSubtitle}>Varsity soccer sample roster</Text>
        </View>
        <View style={styles.safePill}>
          <Text style={styles.safeText}>Demo</Text>
        </View>
      </View>

      <View style={styles.teamDivider} />

      <View style={styles.teamRows}>
        <TeamRow
          detail="Class-specific UIL zone"
          icon={iconNames.location}
          label="Practice conditions"
          tone={Palette.caution}
        />
        <TeamRow
          detail="3 optional wristbands to review"
          icon={iconNames.heart}
          label="Athlete status"
          tone={Palette.coral}
        />
        <TeamRow
          detail="Unlimited during rest breaks"
          icon={iconNames.water}
          label="Hydration plan"
          tone="#547A8C"
        />
        <TeamRow
          detail="Rapid-cooling equipment ready"
          icon={iconNames.emergency}
          label="Emergency readiness"
          tone={Palette.coralDark}
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
    flex: 1,
    minHeight: 326,
    overflow: 'hidden',
    padding: Spacing.five,
  },
  runnerCard: {
    minHeight: 360,
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
    fontVariant: ['tabular-nums'],
    letterSpacing: -1.5,
  },
  readoutUnit: {
    color: Palette.inkMuted,
    fontFamily: Fonts.semibold,
    fontSize: 12,
  },
  signalCanvas: {
    flex: 1,
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
    marginTop: -58,
    position: 'absolute',
    top: '50%',
    width: 70,
  },
  visualFooter: {
    borderTopColor: Palette.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 3,
    paddingTop: Spacing.four,
  },
  footerLabel: {
    color: Palette.inkMuted,
    fontFamily: Fonts.medium,
    fontSize: 10,
  },
  footerValue: {
    color: Palette.ink,
    fontFamily: Fonts.bold,
    fontSize: 13,
  },
  wbgtCard: {
    justifyContent: 'space-between',
    minHeight: 360,
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
    gap: 7,
  },
  wbgtNumber: {
    color: Palette.ink,
    fontFamily: Fonts.extrabold,
    fontSize: 84,
    fontVariant: ['tabular-nums'],
    letterSpacing: -5,
    lineHeight: 90,
  },
  degree: {
    color: Palette.inkMuted,
    fontFamily: Fonts.bold,
    fontSize: 13,
  },
  wbgtZoneTitle: {
    color: Palette.ink,
    fontFamily: Fonts.extrabold,
    fontSize: 25,
    letterSpacing: -0.8,
  },
  wbgtMessage: {
    color: Palette.ink,
    fontFamily: Fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
    maxWidth: 260,
  },
  wbgtTimingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  wbgtTiming: {
    flex: 1,
  },
  wbgtTimingValue: {
    color: Palette.ink,
    fontFamily: Fonts.bold,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  wbgtTimingLabel: {
    color: 'rgba(27,28,25,0.62)',
    fontFamily: Fonts.medium,
    fontSize: 9,
    marginTop: 2,
  },
  wbgtTrend: {
    marginBottom: -Spacing.four,
    marginHorizontal: -Spacing.five,
  },
  planCard: {
    justifyContent: 'space-between',
  },
  planHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  planClock: {
    alignItems: 'center',
    backgroundColor: '#FFF0D5',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  planRows: {
    gap: Spacing.two,
    marginVertical: Spacing.four,
  },
  planRow: {
    alignItems: 'center',
    borderBottomColor: Palette.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: Spacing.three,
    minHeight: 58,
    paddingBottom: Spacing.two,
  },
  planRowIcon: {
    alignItems: 'center',
    borderRadius: 14,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  planRowCopy: {
    flex: 1,
  },
  planRowLabel: {
    color: Palette.ink,
    fontFamily: Fonts.semibold,
    fontSize: 12,
  },
  planRowDetail: {
    color: Palette.inkMuted,
    fontFamily: Fonts.medium,
    fontSize: 10,
    marginTop: 3,
  },
  planFooter: {
    backgroundColor: Palette.surfaceMuted,
    borderRadius: Radius.medium,
    padding: Spacing.four,
  },
  planFooterTitle: {
    color: Palette.ink,
    fontFamily: Fonts.bold,
    fontSize: 11,
  },
  planFooterBody: {
    color: Palette.inkMuted,
    fontFamily: Fonts.medium,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },
  signalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  signalsVisual: {
    flex: 1,
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
    fontVariant: ['tabular-nums'],
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
  signalFootnote: {
    borderTopColor: Palette.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.four,
    paddingTop: Spacing.three,
  },
  signalFootnoteTitle: {
    color: Palette.ink,
    fontFamily: Fonts.bold,
    fontSize: 11,
  },
  signalFootnoteBody: {
    color: Palette.inkMuted,
    fontFamily: Fonts.medium,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },
  contextCard: {
    justifyContent: 'space-between',
  },
  contextReading: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 6,
  },
  contextNumber: {
    color: Palette.ink,
    fontFamily: Fonts.extrabold,
    fontSize: 44,
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
  },
  contextUnit: {
    color: Palette.inkMuted,
    fontFamily: Fonts.semibold,
    fontSize: 11,
  },
  contextScenarios: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginVertical: Spacing.four,
  },
  contextTrace: {
    marginHorizontal: -Spacing.five,
    marginTop: Spacing.two,
  },
  contextScenario: {
    backgroundColor: Palette.canvas,
    borderRadius: Radius.medium,
    flex: 1,
    minHeight: 190,
    padding: Spacing.four,
  },
  contextScenarioIcon: {
    alignItems: 'center',
    borderRadius: 18,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  contextScenarioLabel: {
    color: Palette.ink,
    fontFamily: Fonts.bold,
    fontSize: 12,
    lineHeight: 16,
    marginTop: Spacing.three,
  },
  contextScenarioDetail: {
    color: Palette.inkMuted,
    fontFamily: Fonts.medium,
    fontSize: 10,
    marginTop: 3,
  },
  contextResult: {
    borderRadius: Radius.small,
    marginTop: 'auto',
    paddingHorizontal: Spacing.two,
    paddingVertical: 7,
  },
  contextResultText: {
    fontFamily: Fonts.bold,
    fontSize: 9,
    lineHeight: 12,
  },
  contextFooter: {
    alignItems: 'center',
    borderTopColor: Palette.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: Spacing.three,
    paddingTop: Spacing.four,
  },
  contextFooterCopy: {
    flex: 1,
  },
  contextFooterTitle: {
    color: Palette.ink,
    fontFamily: Fonts.bold,
    fontSize: 11,
  },
  contextFooterBody: {
    color: Palette.inkMuted,
    fontFamily: Fonts.medium,
    fontSize: 10,
    marginTop: 3,
  },
  alertCard: {
    justifyContent: 'flex-start',
  },
  alertHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  alertRows: {
    marginTop: Spacing.four,
  },
  alertRow: {
    alignItems: 'center',
    borderBottomColor: Palette.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: 70,
  },
  alertRail: {
    alignSelf: 'stretch',
    borderRadius: Radius.pill,
    marginVertical: 10,
    width: 5,
  },
  alertLevelCopy: {
    marginLeft: Spacing.three,
    width: 96,
  },
  alertLevel: {
    fontFamily: Fonts.bold,
    fontSize: 10,
  },
  alertMessage: {
    color: Palette.ink,
    fontFamily: Fonts.semibold,
    fontSize: 11,
    marginTop: 2,
  },
  alertDetail: {
    color: Palette.inkMuted,
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: 9,
    lineHeight: 13,
    textAlign: 'right',
  },
  alertFooter: {
    alignItems: 'center',
    backgroundColor: '#FCE9E5',
    borderRadius: Radius.medium,
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: 'auto',
    padding: Spacing.three,
  },
  alertFooterText: {
    color: Palette.emergency,
    flex: 1,
    fontFamily: Fonts.semibold,
    fontSize: 10,
    lineHeight: 14,
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
    flex: 1,
    justifyContent: 'space-evenly',
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
