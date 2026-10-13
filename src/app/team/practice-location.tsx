import { Redirect } from 'expo-router';

// Practice Location isn't built yet: finish coach team creation on the mock coach dashboard.
export default function PracticeLocationPlaceholder() {
  return <Redirect href="/dashboard?role=coach" />;
}
