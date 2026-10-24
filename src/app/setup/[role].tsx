import { Redirect, useLocalSearchParams } from 'expo-router';

// Fallback for dynamic setup paths; supported roles have their own static setup screens.
export default function RoleSetupPlaceholder() {
  const { role } = useLocalSearchParams<{ role?: string }>();
  return <Redirect href={`/dashboard?role=${role === 'athlete' || role === 'trainer' ? role : 'coach'}` as never} />;
}
