import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { INCIDENT, TODAY, ZONES, formatWbgt, type Zone } from '@/lib/practice';
import { firestore } from '@/services/firebase';
import { getActivePlan } from '@/state/practice-plans';

// The sample session starts the first time this runs in an app launch.
const session = { startedAt: Date.now() };
const shared = new Map<string, string>();

type StartOptions = { celsius: boolean; incidentOpen?: boolean; startedAt?: number | null };
// A build connected to Firebase shows only the team's real readings (none until one arrives);
// the sample reading and incident are for the offline sample build.
let team: { reading: { wbgtF: number; zone: Zone } | null } | null = firestore ? { reading: null } : null;
let shown: StartOptions | null = null;

/** Feeds the team's latest real reading (or none yet) to the island, refreshing it if it's showing. */
export function setActivityReading(reading: { wbgtF: number; zone: Zone } | null) {
  team = { reading };
  if (shown) void startPracticeActivity(shown);
}

/** The island can't read the app's bundle, so its images are copied into the folder the widget shares. */
async function shareImage(widgetsDirectory: string, name: string, source: number) {
  const known = shared.get(name);
  if (known) return known;
  const asset = Asset.fromModule(source);
  await asset.downloadAsync();
  if (!asset.localUri) throw new Error(`${name} is missing.`);
  const target = new File(widgetsDirectory, name);
  new File(asset.localUri).copy(target, { overwrite: true });
  shared.set(name, target.uri);
  return target.uri;
}

/** Starts the practice Live Activity, or refreshes it if it's already running. Never throws. */
export async function startPracticeActivity(options: StartOptions) {
  const { celsius, startedAt: practiceStart } = options;
  // The sample incident belongs to the sample practice only; a real team's island shows no made-up athlete.
  const incidentOpen = (options.incidentOpen ?? true) && team === null;
  if (Platform.OS !== 'ios') return;
  shown = options;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- iOS-only widget code, loaded lazily
    const { widgetsDirectory } = require('expo-widgets') as typeof import('expo-widgets');
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- iOS-only widget code, loaded lazily
    const PracticeActivity = require('@/widgets/PracticeActivity').default as typeof import('@/widgets/PracticeActivity').default;
    if (!widgetsDirectory) return;

    // A practice the coach started from the field check, or the sample session already under way.
    const start = practiceStart ?? session.startedAt;
    const startedAt = new Date(start);
    // Length and water come from today's plan. Water falls every so many minutes from the start;
    // point at the next one still ahead.
    const plan = getActivePlan();
    const breakMs = plan.waterEveryMinutes * 60_000;
    const nextBreak = start + Math.max(1, Math.ceil((Date.now() - start) / breakMs)) * breakMs;
    const props = {
      ...(() => {
        const reading = team ? team.reading : TODAY;
        if (!reading) return { zone: 'none' as const, zoneLabel: 'No reading yet', wbgt: '--' };
        return { zone: reading.zone, zoneLabel: ZONES[reading.zone].label, wbgt: formatWbgt(reading.wbgtF, celsius) };
      })(),
      startedAt: startedAt.toISOString(),
      endsAt: new Date(start + plan.lengthMinutes * 60_000).toISOString(),
      nextBreakAt: new Date(nextBreak).toISOString(),
       
      logoUri: await shareImage(widgetsDirectory, 'heatsense-logo-island.png', require('@/assets/images/heatsense-logo-island.png')),
       
      bandUri: await shareImage(widgetsDirectory, 'heatsense-band-island.png', require('@/assets/images/heatsense-band-island.png')),
      incident: incidentOpen && INCIDENT ? INCIDENT.title : '',
      incidentDetail: incidentOpen && INCIDENT ? INCIDENT.detail : '',
      athlete: incidentOpen && INCIDENT ? INCIDENT.athlete : '',
      bpm: incidentOpen && INCIDENT ? String(INCIDENT.bpm) : '',
      incidentMinutes: incidentOpen && INCIDENT ? `${INCIDENT.minutes} min` : '',
    };

    const running = PracticeActivity.getInstances();
    if (running.length > 0) {
      await Promise.all(running.map((instance) => instance.update(props)));
    } else {
      PracticeActivity.start(props, 'heatsenseapp:///dashboard');
    }
  } catch (error) {
    // Live Activities can be turned off in Settings, or unsupported on this device.
    if (__DEV__) console.warn('[practice-activity] could not start:', error);
  }
}

export async function endPracticeActivity() {
  shown = null;
  if (Platform.OS !== 'ios') return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- iOS-only widget code, loaded lazily
    const PracticeActivity = require('@/widgets/PracticeActivity').default as typeof import('@/widgets/PracticeActivity').default;
    await Promise.all(PracticeActivity.getInstances().map((instance) => instance.end('immediate')));
  } catch {
    // Nothing running, or Live Activities are unavailable.
  }
}
