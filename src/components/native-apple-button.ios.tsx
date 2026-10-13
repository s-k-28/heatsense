import * as AppleAuthentication from 'expo-apple-authentication';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export function NativeAppleButton({ disabled, loading, onPress }: { disabled: boolean; loading: boolean; onPress: () => void }) {
  return (
    <View style={[styles.wrap, disabled && !loading && styles.disabled]}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE}
        cornerRadius={29}
        onPress={onPress}
        style={styles.button}
      />
      {disabled && <View pointerEvents="auto" style={styles.overlay}>{loading && <ActivityIndicator color="#FFFFFF" />}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 58, position: 'relative' },
  button: { height: 58, width: '100%' },
  disabled: { opacity: 0.55 },
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#222222' },
});
