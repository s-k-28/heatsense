import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { MobileViewport } from '@/components/mobile-viewport';

// Temporary placeholder for the coach Practice Location step, reached from Invite Your Team.
export default function PracticeLocationPlaceholder() {
  return (
    <MobileViewport>
      <StatusBar style="light" />
      <View accessibilityLabel="Practice location, coming soon" style={{ flex: 1 }} />
    </MobileViewport>
  );
}
