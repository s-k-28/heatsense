import { Circle, HStack, Image, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import { aspectRatio, fixedSize, font, foregroundStyle, frame, lineLimit, monospacedDigit, multilineTextAlignment, padding, resizable, widgetAccentedRenderingMode } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity } from 'expo-widgets';

export type PracticeActivityProps = {
  zone: 'green' | 'yellow' | 'orange' | 'red' | 'black';
  zoneLabel: string;
  wbgt: string;
  startedAt: string;
  endsAt: string;
  nextBreakAt: string;
  logoUri: string;
  bandUri: string;
  /** Empty when all clear. Otherwise the island leads with the athlete's band and a red dot. */
  incident: string;
  incidentDetail: string;
  athlete: string;
  bpm: string;
  incidentMinutes: string;
};

// Runs in the widget's own isolated runtime: no hooks, no outside variables, only SwiftUI
// components. Everything it needs comes in through props.
//
// All clear: the logo on the left of the island, and on the right the zone's dot beside the time
// left in practice; holding it shows the zone, WBGT and both clocks.
// During an incident it leads with the athlete: their band with a red dot, their name and their
// heart rate beside a heart, and the practice clock still counting down beside the band.
//
// Alignment rules, so nothing drifts: every expanded region uses the same 4pt inset, and every clock
// has a fixed width. A SwiftUI timer text otherwise stretches to fill its row, which is what pushed
// the second clock into the middle.
const PracticeActivity = (props: PracticeActivityProps) => {
  'widget';
  const zoneColors = { green: '#30D158', yellow: '#FFD60A', orange: '#FF9F0A', red: '#FF453A', black: '#000000' };
  const color = zoneColors[props.zone];
  const started = new Date(props.startedAt);
  const ends = new Date(props.endsAt);
  const nextBreak = new Date(props.nextBreakAt);
  const warning = props.incident !== '';
  const red = '#FF453A';
  const muted = '#AEAEB2';
  const inset = 4;

  // The Black zone is black on a black island, so its dot gets a thin white ring to stay visible.
  const zoneDot = (size: number) =>
    props.zone === 'black' ? (
      <ZStack>
        <Circle modifiers={[foregroundStyle('#FFFFFF'), frame({ width: size, height: size })]} />
        <Circle modifiers={[foregroundStyle('#000000'), frame({ width: size - 4, height: size - 4 })]} />
      </ZStack>
    ) : (
      <Circle modifiers={[foregroundStyle(color), frame({ width: size, height: size })]} />
    );

  const picture = (uri: string, size: number) => (
    <Image uiImage={uri} modifiers={[resizable(), aspectRatio({ contentMode: 'fit' }), frame({ width: size, height: size }), widgetAccentedRenderingMode('fullColor')]} />
  );

  // The band with a red dot on its top corner, ringed in black so it reads against the band.
  const band = (size: number) => (
    <ZStack alignment="topTrailing" modifiers={[frame({ width: size, height: size })]}>
      {picture(props.bandUri, size)}
      <ZStack>
        <Circle modifiers={[foregroundStyle('#000000'), frame({ width: size * 0.36, height: size * 0.36 })]} />
        <Circle modifiers={[foregroundStyle(red), frame({ width: size * 0.26, height: size * 0.26 })]} />
      </ZStack>
    </ZStack>
  );

  const clock = (until: Date, size: number, alignment: 'leading' | 'trailing', width: number) => (
    <Text
      countsDown
      timerInterval={{ lower: started, upper: until }}
      modifiers={[font({ size, weight: 'semibold' }), monospacedDigit(), multilineTextAlignment(alignment), foregroundStyle('#FFFFFF'), frame({ width, alignment })]}
    />
  );

  // During an incident the island carries only the name and this: a heart and the live reading.
  const heartRate = (size: number) => (
    <HStack spacing={size * 0.22}>
      <Image systemName="heart.fill" color={red} size={size * 0.62} />
      <Text modifiers={[font({ size, weight: 'bold' }), monospacedDigit(), foregroundStyle(red), lineLimit(1), fixedSize({ horizontal: true, vertical: false })]}>{props.bpm}</Text>
    </HStack>
  );

  const caption = (text: string, alignment: 'leading' | 'trailing' = 'leading') => (
    <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle(muted), frame({ maxWidth: 200, alignment })]}>{text}</Text>
  );

  const clocks = (size: number) => (
    <HStack alignment="bottom">
      <VStack alignment="leading" spacing={1}>
        {caption('Practice ends in')}
        {clock(ends, size, 'leading', size * 4.2)}
      </VStack>
      <Spacer />
      <VStack alignment="trailing" spacing={1}>
        {caption('Next water break', 'trailing')}
        {clock(nextBreak, size, 'trailing', size * 3.2)}
      </VStack>
    </HStack>
  );

  return {
    banner: warning ? (
      <VStack alignment="leading" spacing={10} modifiers={[padding({ all: 14 })]}>
        <HStack spacing={12}>
          {band(44)}
          <Text modifiers={[font({ size: 20, weight: 'semibold' }), foregroundStyle('#FFFFFF'), lineLimit(1)]}>{props.athlete}</Text>
          <Spacer />
          {heartRate(30)}
        </HStack>
        {clocks(18)}
      </VStack>
    ) : (
      <VStack alignment="leading" spacing={10} modifiers={[padding({ all: 14 })]}>
        <HStack spacing={10}>
          {picture(props.logoUri, 28)}
          <Text modifiers={[font({ size: 16, weight: 'semibold' }), foregroundStyle('#FFFFFF')]}>{props.zoneLabel}</Text>
          {zoneDot(10)}
          <Spacer />
          <Text modifiers={[font({ size: 16, weight: 'semibold' }), monospacedDigit(), foregroundStyle('#FFFFFF')]}>{`WBGT ${props.wbgt}`}</Text>
        </HStack>
        {clocks(20)}
      </VStack>
    ),

    compactLeading: warning ? (
      <HStack spacing={4}>
        {band(20)}
        {clock(ends, 12, 'leading', 58)}
      </HStack>
    ) : picture(props.logoUri, 22),
    compactTrailing: warning ? (
      heartRate(15)
    ) : (
      <HStack spacing={5}>
        {zoneDot(8)}
        {clock(ends, 14, 'trailing', 58)}
      </HStack>
    ),
    minimal: warning ? <Circle modifiers={[foregroundStyle(red), frame({ width: 12, height: 12 })]} /> : zoneDot(14),

    expandedLeading: warning ? (
      <HStack spacing={10} modifiers={[padding({ leading: inset, top: inset })]}>
        {band(44)}
        <Text modifiers={[font({ size: 19, weight: 'semibold' }), foregroundStyle('#FFFFFF'), lineLimit(1), fixedSize({ horizontal: true, vertical: false })]}>{props.athlete}</Text>
      </HStack>
    ) : (
      <HStack spacing={8} modifiers={[padding({ leading: inset, top: inset })]}>
        {picture(props.logoUri, 30)}
        <VStack alignment="leading" spacing={0}>
          <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle(muted)]}>Zone</Text>
          <Text modifiers={[font({ size: 17, weight: 'semibold' }), foregroundStyle(props.zone === 'black' ? '#FFFFFF' : color), lineLimit(1), fixedSize({ horizontal: true, vertical: false })]}>{props.zoneLabel.replace(' zone', '')}</Text>
        </VStack>
      </HStack>
    ),
    expandedTrailing: warning ? (
      <HStack modifiers={[padding({ trailing: inset, top: inset }), frame({ height: 44 })]}>{heartRate(28)}</HStack>
    ) : (
      <VStack alignment="trailing" spacing={0} modifiers={[padding({ trailing: inset, top: inset })]}>
        <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle(muted)]}>WBGT</Text>
        <Text modifiers={[font({ size: 24, weight: 'bold' }), monospacedDigit(), foregroundStyle('#FFFFFF')]}>{props.wbgt}</Text>
      </VStack>
    ),
    expandedBottom: warning ? (
      <VStack modifiers={[padding({ leading: inset, trailing: inset, top: 6 })]}>{clocks(20)}</VStack>
    ) : (
      <VStack modifiers={[padding({ leading: inset, trailing: inset, top: 6 })]}>{clocks(22)}</VStack>
    ),
  };
};

export default createLiveActivity('PracticeActivity', PracticeActivity);
