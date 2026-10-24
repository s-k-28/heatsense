import { forwardRef, useState, type ComponentProps } from 'react';
import { Platform, StyleSheet, Text as NativeText, TextInput as NativeTextInput, type TextProps, type TextStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { Palette } from '@/constants/theme';
import { Typeface } from '@/constants/typography';

export type Text = NativeText;
export type TextInput = NativeTextInput;

/** Resolve actual bundled faces instead of synthesizing unsupported native font weights. */
export function textFace(style?: TextProps['style']) {
  const value = StyleSheet.flatten(style) ?? {};
  const family = value.fontFamily;
  const bold = Number(value.fontWeight ?? 600) >= 700;
  if (family?.startsWith('Archivo')) return family.includes('800') || Number(value.fontWeight) >= 800 ? Typeface.display : Typeface.heading;
  if (family?.startsWith('Manrope')) return family.includes('700') || bold ? Typeface.button : Typeface.body;
  if (family) return family;
  if (typeof value.fontSize === 'number' && value.fontSize >= 23) return Typeface.display;
  return bold ? Typeface.button : Typeface.body;
}

/** Shared readable typography, including nested text and native accessibility font scaling. */
// eslint-disable-next-line @typescript-eslint/no-redeclare -- Match the native component value/instance type API.
export const Text = forwardRef<NativeText, TextProps>(function Text({ style, ...props }, ref) {
  return <NativeText {...props} ref={ref} style={[{ color: Palette.ink }, style, { fontFamily: textFace(style), fontWeight: 'normal' }]} />;
});
export const AnimatedText = Animated.createAnimatedComponent(Text);

const noOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : undefined;

/** Existing field logic and labels stay with their callers; focus styling is shared. */
// eslint-disable-next-line @typescript-eslint/no-redeclare -- Match the native component value/instance type API.
export const TextInput = forwardRef<NativeTextInput, ComponentProps<typeof NativeTextInput>>(function TextInput({ style, onFocus, onBlur, placeholderTextColor = Palette.inkFaint, ...props }, ref) {
  const [focused, setFocused] = useState(false);
  return <NativeTextInput
    {...props}
    ref={ref}
    placeholderTextColor={placeholderTextColor}
    selectionColor={Palette.coral}
    cursorColor={Palette.coral}
    keyboardAppearance="dark"
    onFocus={event => { setFocused(true); onFocus?.(event); }}
    onBlur={event => { setFocused(false); onBlur?.(event); }}
    style={[styles.input, noOutline, style, { fontFamily: Typeface.body, fontWeight: 'normal' }, focused && styles.focused]}
  />;
});

const styles = StyleSheet.create({
  input: { backgroundColor: Palette.surfaceMuted, borderColor: 'transparent', borderRadius: 22, borderWidth: 1, color: Palette.ink, fontSize: 16, minHeight: 56, paddingHorizontal: 18, paddingVertical: 14 },
  focused: { borderColor: Palette.coral },
});
