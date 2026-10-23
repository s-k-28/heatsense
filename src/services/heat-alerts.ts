import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Heat alerts on the free plan: there is no server to send pushes, so the phone schedules its
// own. Recheck reminders are scheduled ahead and fire even with the app closed; a zone change is
// announced when this phone sees the new reading (the app open or recently backgrounded).
// ponytail: zone changes need the app running; true push needs Cloud Functions (Blaze plan).

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
});

const SOON = 'heatsense-recheck-soon';
const DUE = 'heatsense-recheck-due';
const REMIND_BEFORE_MS = 5 * 60_000;

/** Asks for permission once, at a moment it makes sense. Resolves whether alerts can be shown. */
export async function askForHeatAlerts(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || !current.canAskAgain) return current.granted;
  return (await Notifications.requestPermissionsAsync()).granted;
}

async function allowed() {
  return Platform.OS !== 'web' && (await Notifications.getPermissionsAsync()).granted;
}

function at(identifier: string, date: number, title: string, body: string) {
  if (date <= Date.now() + 1000) return null;
  return Notifications.scheduleNotificationAsync({ identifier, content: { title, body }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date } });
}

/** Reminds whoever logs readings 5 minutes before the next recheck and when it's due. `null` clears them. */
export async function scheduleRecheck(dueAt: number | null) {
  await Promise.all([SOON, DUE].map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  if (dueAt === null || !(await allowed())) return;
  await Promise.all([
    at(SOON, dueAt - REMIND_BEFORE_MS, 'WBGT recheck in 5 minutes', 'Take the next field reading so the zone stays current.'),
    at(DUE, dueAt, 'WBGT recheck is due', 'Take a field reading now. HeatSense marks it late until you do.'),
  ]);
}

/** Announces that the latest reading put the field in a new zone. */
export async function alertZoneChange(title: string, body: string) {
  if (!(await allowed())) return;
  await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
}
