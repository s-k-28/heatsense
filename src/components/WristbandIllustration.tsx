import { Image, StyleSheet, View } from 'react-native';

/** The real product render, supplied directly -- replaces the earlier
 * code-drawn vector approximation. */
export default function WristbandIllustration({ size = 220 }: { size?: number }) {
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Image
        resizeMode="contain"
        source={require('@/assets/wristband-render.png')}
        style={styles.image}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
});
