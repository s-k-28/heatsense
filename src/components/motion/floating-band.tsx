import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

/** Resting product image. Exploration motion is user-triggered in BandViewer. */
export function FloatingBand({ source, size }: { source: number; size: number }) {
  return <View style={{ height: size, width: size }}>
    <Image accessibilityIgnoresInvertColors contentFit="contain" source={source} style={StyleSheet.absoluteFill} />
  </View>;
}
