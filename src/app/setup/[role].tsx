import { Redirect, useLocalSearchParams } from 'expo-router';

// Role setup isn't built yet for athlete/trainer: land on that role's mock dashboard.
export default function RoleSetupPlaceholder() {
  const { role } = useLocalSearchParams<{ role?: string }>();
  return <Redirect href={`/dashboard?role=${role === 'athlete' || role === 'trainer' ? role : 'coach'}` as never} />;
}
