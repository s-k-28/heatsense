import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { PRACTICE_MINUTES, TODAY, WATER_BREAK_MINUTES, ZONES, formatWbgt } from '@/lib/practice';

// The sample session starts the first time this runs in an app launch.
const session = { startedAt: Date.now() };
let logoUri: string | null = null;

/** The island can't read the app's bundle, so the logo is copied into the folder the widget shares. */
async function shareLogo(widgetsDirectory: string) {
  if (logoUri) return logoUri;
  const asset = Asset.fromModule(require('@/assets/images/heatsense-logo-island.png'));
  await asset.downloadAsync();
  if (!asset.localUri) throw new Error('The logo file is missing.');
  const target = new File(widgetsDirectory, 'heatsense-logo-island.png');
  new File(asset.localUri).copy(target, { overwrite: true });
  logoUri = target.uri;
  return logoUri;
}

/** Starts the practice Live Activity, or refreshes it if it's already running. Never throws. */
export async function startPracticeActivity({ celsius }: { celsius: boolean }) {
  if (Platform.OS !== 'ios') return;
  try {
    const { widgetsDirectory } = require('expo-widgets') as typeof import('expo-widgets');
    const PracticeActivity = require('@/widgets/PracticeActivity').default as typeof import('@/widgets/PracticeActivity').default;
    if (!widgetsDirectory) return;

    const startedAt = new Date(session.startedAt);
    const props = {
      zone: TODAY.zone,
      zoneLabel: ZONES[TODAY.zone].label,
      wbgt: formatWbgt(TODAY.wbgtF, celsius),
      startedAt: startedAt.toISOString(),
      endsAt: new Date(session.startedAt + PRACTICE_MINUTES * 60_000).toISOString(),
      nextBreakAt: new Date(session.startedAt + WATER_BREAK_MINUTES * 60_000).toISOString(),
      logoUri: await shareLogo(widgetsDirectory),
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
  if (Platform.OS !== 'ios') return;
  try {
    const PracticeActivity = require('@/widgets/PracticeActivity').default as typeof import('@/widgets/PracticeActivity').default;
    await Promise.all(PracticeActivity.getInstances().map((instance) => instance.end('immediate')));
  } catch {
    // Nothing running, or Live Activities are unavailable.
  }
}
