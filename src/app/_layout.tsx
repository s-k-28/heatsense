import {
  AtkinsonHyperlegibleNext_400Regular,
  AtkinsonHyperlegibleNext_500Medium,
  AtkinsonHyperlegibleNext_600SemiBold,
  AtkinsonHyperlegibleNext_700Bold,
  AtkinsonHyperlegibleNext_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/atkinson-hyperlegible-next';
import { Stack, router } from 'expo-router';
import { Platform, Settings } from 'react-native'; // TEMP-HSROUTE
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { BarlowCondensed_600SemiBold, BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { Palette } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    AtkinsonHyperlegibleNext_400Regular,
    AtkinsonHyperlegibleNext_500Medium,
    AtkinsonHyperlegibleNext_600SemiBold,
    AtkinsonHyperlegibleNext_700Bold,
    AtkinsonHyperlegibleNext_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontError, fontsLoaded]);

  // TEMP-HSROUTE: dev-only screenshot jump, remove after capture
  useEffect(() => {
    const route = __DEV__ && Platform.OS === 'ios' && (fontsLoaded || fontError) ? Settings.get('HSRoute') : null;
    if (typeof route === 'string' && route) setTimeout(() => router.replace(route as never), 300);
  }, [fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        animation: 'fade',
        contentStyle: { backgroundColor: Palette.canvas },
        headerShown: false,
      }}
    />
  );
}
