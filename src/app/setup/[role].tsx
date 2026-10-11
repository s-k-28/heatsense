import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { MobileViewport } from '@/components/mobile-viewport';

// Temporary placeholder for the role-specific setup screens (coach, trainer, athlete).
export default function RoleSetupPlaceholder() {
  const { role } = useLocalSearchParams<{ role?: string }>();
  return (
    <MobileViewport>
      <StatusBar style="light" />
      <View accessibilityLabel={`${role ?? 'Role'} setup, coming soon`} style={{ flex: 1 }} />
    </MobileViewport>
  );
}
