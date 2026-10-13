import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

const fontFamily = Platform.select({
  ios: 'Helvetica Neue',
  android: 'sans-serif',
  default: '"Helvetica Neue", Helvetica, Arial, sans-serif',
});

type DepthButtonProps = {
  label: string;
  onPress: () => void;
};

export function DepthButton({ label, onPress }: DepthButtonProps) {
  return (
    <View style={styles.base}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label.toUpperCase()}
        onPress={onPress}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        {({ pressed }) => <>
          <LinearGradient
            pointerEvents="none"
            colors={pressed ? ['#ECA076', '#D98159'] : ['#FFD6B8', '#F5AE84', '#E79268']}
            locations={pressed ? [0, 1] : [0, 0.42, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.12, y: 1 }}
            style={styles.gradient}
          />
          <Text style={[styles.label, { fontFamily }]}>{label.toUpperCase()}</Text>
        </>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 62,
    borderRadius: 31,
    backgroundColor: '#995436',
  },
  button: {
    width: '100%',
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: '#FFD3B5',
    backgroundColor: '#F4A77C',
    shadowColor: '#F4A77C',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  buttonPressed: {
    backgroundColor: '#E9956A',
    shadowOpacity: 0.06,
    transform: [{ translateY: 3 }],
  },
  label: { color: '#241710', fontSize: 15, fontWeight: '800', letterSpacing: 1.5 },
  gradient: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 29 },
});
