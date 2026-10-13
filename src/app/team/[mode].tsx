import { Redirect } from 'expo-router';

// Join Team isn't built yet (Create Team lives in team/create.tsx): land on the mock coach dashboard.
export default function TeamPlaceholder() {
  return <Redirect href="/dashboard?role=coach" />;
}
