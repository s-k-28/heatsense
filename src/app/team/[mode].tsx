import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { MobileViewport } from '@/components/mobile-viewport';

// Temporary placeholder for the Join Team screen (Create Team lives in team/create.tsx).
export default function TeamPlaceholder() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  return (
    <MobileViewport>
      <StatusBar style="light" />
      <View accessibilityLabel={`${mode === 'join' ? 'Join' : 'Create'} team, coming soon`} style={{ flex: 1 }} />
    </MobileViewport>
  );
}
