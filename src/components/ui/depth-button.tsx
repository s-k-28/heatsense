import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Button } from 'tamagui';

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
  const [pressed, setPressed] = useState(false);
  return (
    <View style={styles.base}>
      <Button
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        width="100%"
        height={58}
        padding={0}
        borderRadius={29}
        borderWidth={1}
        borderColor="#FFD3B5"
        backgroundColor={pressed ? '#E9956A' : '#F4A77C'}
        shadowColor="#F4A77C"
        shadowOpacity={pressed ? 0.06 : 0.18}
        shadowRadius={12}
        shadowOffset={{ width: 0, height: 5 }}
        y={pressed ? 3 : 0}
      >
        <LinearGradient
          pointerEvents="none"
          colors={pressed ? ['#ECA076', '#D98159'] : ['#FFD6B8', '#F5AE84', '#E79268']}
          locations={pressed ? [0, 1] : [0, 0.42, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.12, y: 1 }}
          style={styles.gradient}
        />
        <Button.Text color="#241710" fontFamily={fontFamily} fontSize={15} fontWeight="800" letterSpacing={1.5}>
          {label.toUpperCase()}
        </Button.Text>
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 62,
    borderRadius: 31,
    backgroundColor: '#995436',
  },
  gradient: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 29 },
});
