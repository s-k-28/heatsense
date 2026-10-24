import { Archivo_700Bold, Archivo_800ExtraBold } from '@expo-google-fonts/archivo';
import { Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';

import { BandJourneyLayer } from '@/components/band/band-journey';
import { PhoneFrame } from '@/components/layout/mobile-viewport';
import { Palette } from '@/constants/theme';
import { firebaseAuth } from '@/services/firebase';
import { AuthSessionContext } from '@/state/auth-session';
import { hydrateOnboardingRole } from '@/state/onboarding';

SplashScreen.preventAutoHideAsync();
// The launch screen is the HeatSense H where the welcome intro assembles it; fading out hands over to that intro.
SplashScreen.setOptions({ duration: 350, fade: true });

export default function RootLayout() {
  const reducedMotion = useReducedMotion();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [initialAuthReady, setInitialAuthReady] = useState(false);
  const [fontsLoaded, fontError] = useFonts({ Archivo_700Bold, Archivo_800ExtraBold, Manrope_600SemiBold, Manrope_700Bold });

  useEffect(() => {
    if ((fontsLoaded || fontError) && authReady) {
      SplashScreen.hideAsync();
    }
  }, [authReady, fontError, fontsLoaded]);

  useEffect(() => {
    let active = true;
    let restoreVersion = 0;
    const restore = async (nextUser: User | null) => {
      const version = ++restoreVersion;
      setUser(nextUser);
      await hydrateOnboardingRole(nextUser?.uid ?? (__DEV__ && !firebaseAuth ? 'local-demo' : null));
      if (active && version === restoreVersion) {
        setAuthReady(true);
        setInitialAuthReady(true);
      }
    };
    if (!firebaseAuth) {
      void restore(null);
      return () => { active = false; };
    }
    const unsubscribe = onAuthStateChanged(firebaseAuth, (nextUser) => {
      setAuthReady(false);
      void restore(nextUser);
    }, () => {
      if (active) {
        setAuthReady(true);
        setInitialAuthReady(true);
      }
    });
    return () => { active = false; unsubscribe(); };
  }, []);

  if ((!fontsLoaded && !fontError) || !initialAuthReady) {
    return null;
  }

  // Unconfigured local development keeps design review routes reachable. A
  // configured build always uses the real session for navigation protection.
  const canOpenAccountRoutes = (__DEV__ && !firebaseAuth) || Boolean(user);

  return (
    <AuthSessionContext.Provider value={{ user, ready: authReady }}>
      <PhoneFrame>
        <Stack
          screenOptions={{
            animation: reducedMotion ? 'none' : 'fade',
            animationDuration: reducedMotion ? 0 : 300,
            contentStyle: { backgroundColor: Palette.canvas },
            headerShown: false,
          }}
        >
          <Stack.Protected guard={canOpenAccountRoutes}>
            <Stack.Screen name="role" />
            <Stack.Screen name="ready" />
            {/* The dashboard is home base once set up: no swipe back into onboarding, which also frees left-edge drags for the content. */}
            <Stack.Screen name="dashboard" options={{ gestureEnabled: false }} />
            <Stack.Screen name="practice-record" />
            <Stack.Screen name="athlete-vitals" />
            <Stack.Screen name="setup/coach" />
            <Stack.Screen name="setup/athlete" />
            <Stack.Screen name="athlete/profile" />
            <Stack.Screen name="athlete/body" />
            <Stack.Screen name="athlete/safety" />
            <Stack.Screen name="athlete/done" />
            <Stack.Screen name="setup/[role]" />
            <Stack.Screen name="team/create" />
            <Stack.Screen name="team/invite" />
          </Stack.Protected>
        </Stack>
        <BandJourneyLayer />
      </PhoneFrame>
    </AuthSessionContext.Provider>
  );
}
