import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { MobileViewport } from '@/components/mobile-viewport';

// Temporary placeholder for the Create Team and Join Team screens.
export default function TeamPlaceholder() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  return (
    <MobileViewport>
      <StatusBar style="light" />
      <View accessibilityLabel={`${mode === 'join' ? 'Join' : 'Create'} team, coming soon`} style={{ flex: 1 }} />
    </MobileViewport>
  );
}
