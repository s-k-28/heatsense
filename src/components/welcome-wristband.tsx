import { Image, View, type ImageSourcePropType } from 'react-native';
import Svg, { ClipPath, Defs, Ellipse, G, Line, LinearGradient, Path, Pattern, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

// Product photo of the HeatSense Band, cut out from its black studio background
// (source: IMG_1544.jpeg). Set to null to fall back to the drawing below.
const BAND_IMAGE: ImageSourcePropType | null = require('@/assets/images/heatsense-band-refined.png');
// Crop the generous transparent padding around the square studio render.
const PHOTO_ASPECT = 1 / 1.15;

export const WRISTBAND_ASPECT = BAND_IMAGE ? PHOTO_ASPECT : 300 / 320;

// Geometry traced from the reference pose: a wide strap loop seen from the front-left.
// The left side shows the ribbed inner face, the right and bottom show the woven outer
// surface, and the sensor pod rides the front with a clasp bar across its base.
const OUTLINE = 'M48 34 C100 4 200 0 246 10 C272 16 284 34 285 62 C287 110 290 160 286 200 C278 258 222 312 156 312 C84 312 24 250 22 156 C21 100 28 62 48 34 Z';
const OPENING = 'M156 22 C120 34 100 112 100 186 C100 236 122 268 160 276 C176 240 178 120 168 40 C166 30 162 24 156 22 Z';
const INNER_FACE = 'M156 22 C100 8 52 22 36 58 C20 110 22 210 72 268 C100 286 132 284 160 276 C122 268 100 236 100 186 C100 112 120 34 156 22 Z';
const RIBS = Array.from({ length: 16 }, (_, i) => -60 + i * 26);

function BandDrawing({ width }: { width: number }) {
  return (
    <Svg width={width} height={width / WRISTBAND_ASPECT} viewBox="0 0 300 320">
      <Defs>
        <RadialGradient id="studio" cx="0.55" cy="0.42" r="0.6">
          <Stop offset="0" stopColor="#5C5C5C" stopOpacity="0.14" />
          <Stop offset="1" stopColor="#5C5C5C" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="strap" x1="1" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#2C2C2E" />
          <Stop offset="0.55" stopColor="#1A1A1B" />
          <Stop offset="1" stopColor="#0E0E0F" />
        </LinearGradient>
        <LinearGradient id="innerShade" x1="0" y1="0" x2="1" y2="0.3">
          <Stop offset="0" stopColor="#000000" stopOpacity="0.1" />
          <Stop offset="1" stopColor="#000000" stopOpacity="0.5" />
        </LinearGradient>
        {/* Crosshatch weave without pattern transforms so iOS and web render it alike. */}
        <Pattern id="weave" width="4" height="4" patternUnits="userSpaceOnUse">
          <Line x1="0" y1="4" x2="4" y2="0" stroke="#3A3A3C" strokeWidth="0.9" />
          <Line x1="0" y1="0" x2="4" y2="4" stroke="#252527" strokeWidth="0.9" />
        </Pattern>
        <LinearGradient id="rim" x1="1" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.32" />
          <Stop offset="0.6" stopColor="#FFFFFF" stopOpacity="0.05" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.12" />
        </LinearGradient>
        <LinearGradient id="podFront" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#3E3E42" />
          <Stop offset="0.25" stopColor="#2C2C30" />
          <Stop offset="1" stopColor="#141416" />
        </LinearGradient>
        <LinearGradient id="podSide" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#0C0C0D" />
          <Stop offset="1" stopColor="#1F1F22" />
        </LinearGradient>
        <LinearGradient id="clasp" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#6E6E74" />
          <Stop offset="0.3" stopColor="#47474C" />
          <Stop offset="1" stopColor="#1C1C1F" />
        </LinearGradient>
        <LinearGradient id="hole" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#0A0A0B" stopOpacity="0.85" />
          <Stop offset="1" stopColor="#0A0A0B" stopOpacity="0.35" />
        </LinearGradient>
        <ClipPath id="strapClip"><Path d={`${OUTLINE} ${OPENING}`} clipRule="evenodd" /></ClipPath>
        <ClipPath id="innerClip"><Path d={INNER_FACE} /></ClipPath>
      </Defs>

      <Rect x={0} y={0} width={300} height={320} fill="url(#studio)" />

      {/* Looking through the loop: shaded so the opening reads as depth, not a flat panel. */}
      <Path d={OPENING} fill="url(#hole)" />

      {/* Strap: woven outer surface everywhere, ribbed and shaded on the inner face. */}
      <Path d={`${OUTLINE} ${OPENING}`} fillRule="evenodd" fill="url(#strap)" />
      <G clipPath="url(#strapClip)">
        <Rect x={0} y={0} width={300} height={320} fill="url(#weave)" opacity={0.85} />
        <G clipPath="url(#innerClip)">
          <Path d={INNER_FACE} fill="#161617" />
          {RIBS.map((y) => <Line key={y} x1={0} y1={y} x2={200} y2={y + 84} stroke="#1F1F21" strokeWidth={11} strokeLinecap="round" />)}
          <Path d={INNER_FACE} fill="url(#innerShade)" />
        </G>
      </G>
      <Path d={OUTLINE} fill="none" stroke="url(#rim)" strokeWidth={1.4} />

      {/* Sensor pod on the front of the strap: darker side bevel, lit front face. */}
      <G transform="rotate(-12.5 182 108)">
        <Rect x={160} y={14} width={14} height={186} rx={7} fill="url(#podSide)" />
        <Rect x={166} y={12} width={38} height={190} rx={17} fill="url(#podFront)" />
        <Rect x={172} y={24} width={4} height={160} rx={2} fill="#FFFFFF" opacity={0.2} />
        <Rect x={164} y={70} width={3} height={34} rx={1.5} fill="#000000" opacity={0.6} />
      </G>

      {/* Clasp bar across the base of the pod, with the engraved H. */}
      <Rect x={200} y={163} width={88} height={36} rx={6} fill="#141416" />
      <Rect x={198} y={159} width={88} height={36} rx={6} fill="url(#clasp)" />
      <Rect x={202} y={160} width={80} height={1.4} rx={0.7} fill="#FFFFFF" opacity={0.4} />
      <SvgText x={244} y={183} fontSize={15} fontWeight="300" fontFamily="Helvetica Neue, Helvetica, Arial, sans-serif" fill="#D6D6DB" opacity={0.8} textAnchor="middle">H</SvgText>
    </Svg>
  );
}

export function WelcomeWristband({ width }: { width: number }) {
  if (BAND_IMAGE) {
    const height = width / WRISTBAND_ASPECT;
    return (
      <View style={{ width, height, overflow: 'hidden' }}>
        <Image source={BAND_IMAGE} resizeMode="contain" accessibilityIgnoresInvertColors style={{ position: 'absolute', width: width * 1.3, height: width * 1.3, left: -width * 0.15, top: -width * 0.07 }} />
      </View>
    );
  }
  return <BandDrawing width={width} />;
}

// Soft floor shadow; the welcome screen animates it separately from the band.
export function WristbandShadow({ width }: { width: number }) {
  return (
    <Svg width={width} height={width * 0.18} viewBox="0 0 200 36">
      <Defs>
        <RadialGradient id="floor" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#000000" stopOpacity="0.75" />
          <Stop offset="0.6" stopColor="#000000" stopOpacity="0.28" />
          <Stop offset="1" stopColor="#000000" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx={100} cy={18} rx={100} ry={18} fill="url(#floor)" />
    </Svg>
  );
}
