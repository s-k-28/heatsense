import { Image } from 'react-native';

// Official HeatSense mark, cut out from its black background with the artwork untouched.
const LOGO = require('@/assets/images/heatsense-logo.png');
const ASPECT = 801 / 763;

export function HeatSenseLogo({ height = 24 }: { height?: number }) {
  return <Image source={LOGO} accessibilityRole="image" accessibilityLabel="HeatSense" style={{ height, width: height * ASPECT }} resizeMode="contain" />;
}
