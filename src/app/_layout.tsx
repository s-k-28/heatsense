import {
  AtkinsonHyperlegibleNext_400Regular,
  AtkinsonHyperlegibleNext_500Medium,
  AtkinsonHyperlegibleNext_600SemiBold,
  AtkinsonHyperlegibleNext_700Bold,
  AtkinsonHyperlegibleNext_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/atkinson-hyperlegible-next';
import { Fraunces_500Medium_Italic, Fraunces_600SemiBold_Italic } from '@expo-google-fonts/fraunces';
import { Stack } from 'expo-router';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { BarlowCondensed_600SemiBold, BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { createTamagui, TamaguiProvider } from 'tamagui';
import { defaultConfig } from '@tamagui/config/v6';
import { onAuthStateChanged, type User } from 'firebase/auth';

import { Palette } from '@/constants/theme';
import { firebaseAuth } from '@/services/firebase';

SplashScreen.preventAutoHideAsync();
const tamaguiConfig = createTamagui(defaultConfig);

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!firebaseAuth);
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
    Fraunces_500Medium_Italic,
    Fraunces_600SemiBold_Italic,
  });

  useEffect(() => {
    if ((fontsLoaded || fontError) && authReady) {
      SplashScreen.hideAsync();
    }
  }, [authReady, fontError, fontsLoaded]);

  useEffect(() => {
    if (!firebaseAuth) return;
    return onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    }, () => setAuthReady(true));
  }, []);

  if ((!fontsLoaded && !fontError) || !authReady) {
    return null;
  }

  // Unconfigured local development keeps design review routes reachable. A
  // configured build always uses the real session for navigation protection.
  const canOpenAccountRoutes = (__DEV__ && !firebaseAuth) || Boolean(user);

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      <Stack
        screenOptions={{
          animation: 'fade',
          contentStyle: { backgroundColor: Palette.canvas },
          headerShown: false,
        }}
      >
        <Stack.Protected guard={canOpenAccountRoutes}>
          <Stack.Screen name="role" />
          <Stack.Screen name="ready" />
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="detail" />
          <Stack.Screen name="setup/coach" />
          <Stack.Screen name="setup/[role]" />
          <Stack.Screen name="team/create" />
          <Stack.Screen name="team/invite" />
          <Stack.Screen name="team/[mode]" />
          <Stack.Screen name="team/practice-location" />
        </Stack.Protected>
      </Stack>
    </TamaguiProvider>
  );
}
