import { StatusBar } from 'expo-status-bar';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { HeatSenseLogo } from '@/components/heatsense-logo';
import { MobileViewport } from '@/components/mobile-viewport';
import { Entry } from '@/constants/entry-theme';

export function EntryScreen({ children }: { children: (compact: boolean) => ReactNode }) {
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(0);
  return (
    <MobileViewport>
      <View onLayout={(event: LayoutChangeEvent) => setHeight(event.nativeEvent.layout.height)} style={entryStyles.screen}>
        <StatusBar style="light" />
        <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={[entryStyles.content, { paddingTop: Math.max(insets.top + 12, 26), paddingBottom: Math.max(insets.bottom + 12, 24) }]}>
          {children(height > 0 && height < 760)}
        </ScrollView>
      </View>
    </MobileViewport>
  );
}

export function EntryHeader({ onBack }: { onBack?: () => void }) {
  return (
    <View style={entryStyles.header}>
      {onBack ? <EntryBackButton onPress={onBack} /> : null}
      <View accessible accessibilityLabel="HeatSense" style={entryStyles.brand}>
        <HeatSenseLogo height={26} />
        <Text style={entryStyles.wordmark}>HeatSense</Text>
      </View>
      {onBack ? <View style={{ width: 44 }} /> : null}
    </View>
  );
}

function EntryBackButton({ onPress }: { onPress: () => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={({ pressed }) => [entryStyles.back, focused && entryStyles.focus, pressed && entryStyles.pressed]}>
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Entry.ink} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><Path d="m14 6-6 6 6 6" /></Svg>
    </Pressable>
  );
}

export function EntryButton({ label, onPress, disabled = false, loading = false, icon, neutral = false }: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean; icon?: ReactNode; neutral?: boolean }) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      aria-disabled={disabled || loading} aria-busy={loading}
      disabled={disabled || loading} onPress={onPress}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={({ pressed }) => [entryStyles.button, neutral && entryStyles.neutralButton, disabled && !loading && entryStyles.disabledButton, focused && entryStyles.focus, pressed && entryStyles.pressed]}>
      {loading ? <ActivityIndicator color={Entry.canvas} /> : icon}
      <Text style={[entryStyles.buttonLabel, disabled && !loading && { color: Entry.muted }]}>{loading ? 'Signing in…' : label}</Text>
    </Pressable>
  );
}

export const entryStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Entry.canvas },
  content: { flexGrow: 1, paddingHorizontal: 26 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  wordmark: { color: Entry.ink, fontFamily: Entry.strong, fontSize: 19, letterSpacing: -0.6 },
  back: { height: 44, width: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderColor: Entry.line, borderWidth: 1 },
  headline: { color: Entry.ink, fontFamily: Entry.display, fontSize: 58, lineHeight: 58, letterSpacing: -0.8 },
  headlineCompact: { fontSize: 48, lineHeight: 49 },
  description: { color: Entry.muted, fontFamily: Entry.body, fontSize: 15, lineHeight: 23, marginTop: 14 },
  button: { minHeight: 58, paddingVertical: 16, paddingHorizontal: 18, borderRadius: 18, backgroundColor: Entry.peach, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12 },
  neutralButton: { backgroundColor: Entry.ink },
  disabledButton: { backgroundColor: Entry.raised },
  buttonLabel: { color: Entry.canvas, fontFamily: Entry.strong, fontSize: 16, flexShrink: 1, textAlign: 'center' },
  note: { color: Entry.muted, fontFamily: Entry.body, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  focus: Platform.OS === 'web' ? { outlineColor: Entry.blue, outlineWidth: 3, outlineOffset: 4, outlineStyle: 'solid' } : { borderColor: Entry.blue, borderWidth: 2 },
  pressed: { opacity: 0.8 },
});
