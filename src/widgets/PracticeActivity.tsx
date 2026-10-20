import { Circle, HStack, Image, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import { aspectRatio, font, foregroundStyle, frame, monospacedDigit, padding, resizable, widgetAccentedRenderingMode } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity } from 'expo-widgets';

export type PracticeActivityProps = {
  zone: 'green' | 'yellow' | 'orange' | 'red' | 'black';
  zoneLabel: string;
  wbgt: string;
  startedAt: string;
  endsAt: string;
  nextBreakAt: string;
  logoUri: string;
  /** Empty when all clear. Otherwise the island shows a warning instead of the zone dot. */
  incident: string;
  incidentDetail: string;
};

// Runs in the widget's own isolated runtime: no hooks, no outside variables, only SwiftUI
// components. Everything it needs comes in through props. The compact Dynamic Island shows the
// logo on one side and a zone-colored dot on the other; pressing and holding opens the expanded
// view with the practice countdown.
const PracticeActivity = (props: PracticeActivityProps) => {
  'widget';
  const zoneColors = { green: '#30D158', yellow: '#FFD60A', orange: '#FF9F0A', red: '#FF453A', black: '#000000' };
  const color = zoneColors[props.zone];
  const started = new Date(props.startedAt);
  const ends = new Date(props.endsAt);
  const nextBreak = new Date(props.nextBreakAt);

  const warning = props.incident !== '';
  const alertRed = '#FF453A';

  // While an incident is open the dot becomes a red warning triangle.
  // The Black zone is black on a black island, so its dot gets a thin white ring to stay visible.
  const dot = (size: number) =>
    warning ? (
      <Image systemName="exclamationmark.triangle.fill" color={alertRed} size={size} />
    ) : props.zone === 'black' ? (
      <ZStack>
        <Circle modifiers={[foregroundStyle('#FFFFFF'), frame({ width: size, height: size })]} />
        <Circle modifiers={[foregroundStyle('#000000'), frame({ width: size - 4, height: size - 4 })]} />
      </ZStack>
    ) : (
      <Circle modifiers={[foregroundStyle(color), frame({ width: size, height: size })]} />
    );

  const logo = (size: number) => (
    <Image uiImage={props.logoUri} modifiers={[resizable(), aspectRatio({ contentMode: 'fit' }), frame({ width: size, height: size }), widgetAccentedRenderingMode('fullColor')]} />
  );

  const countdown = (until: Date, size: number) => (
    <Text
      countsDown
      timerInterval={{ lower: started, upper: until }}
      modifiers={[font({ size, weight: 'semibold' }), monospacedDigit(), foregroundStyle('#FFFFFF'), frame({ maxWidth: 110, alignment: 'leading' })]}
    />
  );

  return {
    banner: (
      <HStack modifiers={[padding({ all: 14 })]}>
        {logo(36)}
        <VStack alignment="leading">
          <Text modifiers={[font({ size: 16, weight: 'semibold' }), foregroundStyle(warning ? alertRed : '#FFFFFF')]}>{warning ? props.incident : props.zoneLabel}</Text>
          <Text modifiers={[font({ size: 13 }), foregroundStyle('#AEAEB2')]}>{warning ? props.incidentDetail : `WBGT ${props.wbgt}`}</Text>
        </VStack>
        <Spacer />
        <VStack alignment="trailing">
          <Text modifiers={[font({ size: 12 }), foregroundStyle('#AEAEB2')]}>Practice ends in</Text>
          {countdown(ends, 20)}
        </VStack>
      </HStack>
    ),
    compactLeading: logo(22),
    compactTrailing: dot(14),
    minimal: dot(14),
    expandedLeading: (
      <VStack alignment="leading" modifiers={[padding({ all: 10 })]}>
        {logo(30)}
        <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(warning ? alertRed : props.zone === 'black' ? '#FFFFFF' : color)]}>{warning ? 'Warning' : props.zoneLabel}</Text>
      </VStack>
    ),
    expandedTrailing: (
      <VStack alignment="trailing" modifiers={[padding({ all: 10 })]}>
        <Text modifiers={[font({ size: 12 }), foregroundStyle('#AEAEB2')]}>WBGT</Text>
        <Text modifiers={[font({ size: 26, weight: 'bold' }), foregroundStyle('#FFFFFF')]}>{props.wbgt}</Text>
      </VStack>
    ),
    expandedBottom: warning ? (
      // One line for what happened, one line for the clocks, so the whole thing fits under the island.
      <VStack alignment="leading" modifiers={[padding({ all: 10 })]}>
        <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle('#FFFFFF')]}>{props.incident}</Text>
        <HStack>
          <Text modifiers={[font({ size: 12 }), foregroundStyle('#AEAEB2')]}>Ends in</Text>
          {countdown(ends, 13)}
          <Spacer />
          <Text modifiers={[font({ size: 12 }), foregroundStyle('#AEAEB2')]}>Water in</Text>
          {countdown(nextBreak, 13)}
        </HStack>
      </VStack>
    ) : (
      <HStack modifiers={[padding({ all: 10 })]}>
        <VStack alignment="leading">
          <Text modifiers={[font({ size: 12 }), foregroundStyle('#AEAEB2')]}>Practice ends in</Text>
          {countdown(ends, 22)}
        </VStack>
        <Spacer />
        <VStack alignment="trailing">
          <Text modifiers={[font({ size: 12 }), foregroundStyle('#AEAEB2')]}>Next water break</Text>
          {countdown(nextBreak, 22)}
        </VStack>
      </HStack>
    ),
  };
};

export default createLiveActivity('PracticeActivity', PracticeActivity);
