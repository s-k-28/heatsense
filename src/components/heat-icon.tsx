import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { Text } from 'react-native';

import { Fonts, Palette } from '@/constants/theme';

type HeatIconProps = Omit<ComponentProps<typeof SymbolView>, 'fallback'> & {
  fallback?: string;
};

export function HeatIcon({ fallback = '•', size = 22, tintColor = Palette.ink, ...props }: HeatIconProps) {
  return (
    <SymbolView
      {...props}
      fallback={
        <Text style={{ color: tintColor, fontFamily: Fonts.bold, fontSize: size }}>
          {fallback}
        </Text>
      }
      size={size}
      tintColor={tintColor}
    />
  );
}
