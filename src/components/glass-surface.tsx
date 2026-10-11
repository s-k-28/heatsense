import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

// On iOS 26+ this is Apple's native Liquid Glass (via expo-glass-effect). Everywhere
// else it is a layered "smoked glass" approximation: a translucent surface, a soft
// specular sheen strongest at the upper-left, and a fine inner top edge. Over the flat
// charcoal background a blur alone would be invisible, so the layers carry the effect,
// and the translucent fill doubles as the fallback where backdrop blur is unsupported.
const nativeGlass = Platform.OS === 'ios' && isLiquidGlassAvailable();

export type GlassTone = 'neutral' | 'warm' | 'orange' | 'muted';

const fills: Record<GlassTone, string> = {
  neutral: 'rgba(255,255,255,0.032)',
  warm: 'rgba(255,152,107,0.06)',
  orange: '#C2551F',
  muted: 'rgba(255,255,255,0.035)',
};
const nativeTints: Partial<Record<GlassTone, string>> = {
  warm: 'rgba(255,152,107,0.16)',
  orange: 'rgba(194,85,31,0.92)',
};

export function GlassSurface({ tone = 'neutral', radius, sheen = 1, style, children }: { tone?: GlassTone; radius: number; sheen?: number; style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
      {nativeGlass ? (
        <GlassView
          style={[StyleSheet.absoluteFill, { borderRadius: radius }, tone === 'orange' && { backgroundColor: fills.orange }]}
          glassEffectStyle={tone === 'muted' ? 'clear' : 'regular'}
          colorScheme="dark"
          tintColor={nativeTints[tone]}
        />
      ) : (
        <>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: fills[tone] }]} />
          {/* Specular sheen: brightest at the upper-left edge, fading across the surface. */}
          <LinearGradient
            pointerEvents="none"
            colors={[`rgba(255,255,255,${0.07 * sheen})`, `rgba(255,255,255,${0.015 * sheen})`, 'rgba(255,255,255,0)']}
            locations={[0, 0.35, 0.75]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.55, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </>
      )}
      {/* Fine inner reflection along the top edge. */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, boxShadow: `inset 0 1px 0 rgba(255,255,255,${tone === 'orange' ? 0.24 : 0.1 * sheen})` }]} />
      {children}
    </View>
  );
}
