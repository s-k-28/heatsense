import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import type { BleManager, Subscription } from 'react-native-ble-plx';

import { activeKcal, metFor } from '@/lib/band-motion';
import { base64ToBytes, decodeBandPacket, type BandPacket } from '@/lib/band-packet';
import { setPreference } from '@/state/preferences';

// The live Bluetooth link to a HeatSense Band: scan for bands advertising the HeatSense service,
// connect to one, and keep its latest packet plus a short heart-rate history. The phone is the
// central; the band is the peripheral and notifies one packet a second.
//
// The Bluetooth library is native, so it's only loaded on a phone build. In the iOS Simulator
// (no Bluetooth radio) and on the web, `radio` reports 'unsupported' and the pairing screen falls
// back to its demo.

export const BAND_SERVICE_UUID = '7c2daac7-c17d-4d78-bb0a-d6af909b166c';
export const BAND_DATA_UUID = 'a69c8da6-232c-4de9-8185-c767023d0af0';

const SCAN_TIMEOUT_MS = 15_000;
const HISTORY_LENGTH = 120; // two minutes at one packet a second
const LAST_BAND_KEY = 'heatsense.lastBand.v1';

export type Radio = 'unknown' | 'on' | 'off' | 'unauthorized' | 'unsupported';
export type FoundBand = { id: string; name: string; rssi: number | null };

type BandState = {
  radio: Radio;
  status: 'idle' | 'scanning' | 'connecting' | 'connected';
  found: FoundBand[];
  device: { id: string; name: string } | null;
  reading: BandPacket | null;
  receivedAt: number | null;
  /** Heart rate per packet, newest last. 0 marks a packet with no valid reading. */
  history: number[];
  /** Totals since this connection started (needs band firmware that sends steps). */
  session: Session;
  error: string | null;
};

type Session = { steps: number; activeSeconds: number; activeKcal: number };
const EMPTY_SESSION: Session = { steps: 0, activeSeconds: 0, activeKcal: 0 };

let state: BandState = { radio: 'unknown', status: 'idle', found: [], device: null, reading: null, receivedAt: null, history: [], session: EMPTY_SESSION, error: null };
const listeners = new Set<() => void>();
function set(patch: Partial<BandState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

let manager: BleManager | null = null;
let monitor: Subscription | null = null;
let disconnectWatch: Subscription | null = null;
let scanTimer: ReturnType<typeof setTimeout> | null = null;
let userDisconnected = false;

const RADIO: Record<string, Radio> = { PoweredOn: 'on', PoweredOff: 'off', Unauthorized: 'unauthorized', Unsupported: 'unsupported' };

function getManager() {
  if (manager || Platform.OS === 'web') return manager;
  try {
    // Loaded lazily so the web build never pulls in the native module.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { BleManager: Manager } = require('react-native-ble-plx') as typeof import('react-native-ble-plx');
    manager = new Manager();
    manager.onStateChange((radio) => set({ radio: RADIO[radio] ?? 'unknown' }), true);
  } catch {
    set({ radio: 'unsupported' });
  }
  return manager;
}

/** Starts the Bluetooth radio check. Call when a screen that needs Bluetooth opens. */
export function prepareBluetooth() {
  if (!getManager()) set({ radio: 'unsupported' });
}

export function stopScan() {
  if (scanTimer) clearTimeout(scanTimer);
  scanTimer = null;
  manager?.stopDeviceScan().catch(() => {});
  if (state.status === 'scanning') set({ status: 'idle' });
}

/** Looks for nearby bands for up to 15 seconds. Bands appear in `found` as they're seen. */
export function startScan() {
  const ble = getManager();
  if (!ble || state.radio !== 'on') return;
  stopScan();
  set({ status: 'scanning', found: [], error: null });
  ble
    .startDeviceScan([BAND_SERVICE_UUID], { allowDuplicates: false }, async (error, device) => {
      if (error) {
        set({ error: error.message, status: 'idle' });
        stopScan();
        return;
      }
      if (!device || state.found.some((band) => band.id === device.id)) return;
      set({ found: [...state.found, { id: device.id, name: device.localName ?? device.name ?? 'HeatSense Band', rssi: device.rssi ?? null }] });
    })
    .catch((error: Error) => set({ error: error.message, status: 'idle' }));
  scanTimer = setTimeout(stopScan, SCAN_TIMEOUT_MS);
}

/** Adds one packet's movement to the session. The band's step count runs from when it turned on, so
 *  the session counts the change between packets; a drop means the band restarted. */
function addToSession(previous: BandPacket | null, packet: BandPacket): Session {
  if (packet.steps === null) return state.session;
  const first = previous?.steps == null;
  const steps = first ? 0 : packet.steps >= previous.steps! ? packet.steps - previous.steps! : packet.steps;
  const seconds = first ? 1 : Math.min(5, Math.max(0, packet.seconds - previous.seconds));
  const moving = packet.activity !== null && packet.activity !== 'still';
  return {
    steps: state.session.steps + steps,
    activeSeconds: state.session.activeSeconds + (moving ? seconds : 0),
    activeKcal: state.session.activeKcal + activeKcal(metFor(packet.activity, packet.cadence), seconds),
  };
}

function onPacket(base64: string | null | undefined) {
  if (!base64) return;
  const packet = decodeBandPacket(base64ToBytes(base64));
  if (!packet) return;
  set({
    reading: packet,
    receivedAt: Date.now(),
    history: [...state.history, packet.heartRate ?? 0].slice(-HISTORY_LENGTH),
    session: addToSession(state.reading, packet),
  });
}

/** Connects to a band and starts listening to its packets. Resolves true once data is flowing. */
export async function connectBand(band: { id: string; name: string }) {
  const ble = getManager();
  if (!ble) return false;
  stopScan();
  userDisconnected = false;
  set({ status: 'connecting', error: null, device: band });
  try {
    await ble.connectToDevice(band.id, { timeout: 10_000 });
    await ble.discoverAllServicesAndCharacteristicsForDevice(band.id);

    disconnectWatch?.remove();
    disconnectWatch = ble.onDeviceDisconnected(band.id, () => {
      monitor?.remove();
      monitor = null;
      set({ status: 'idle', error: userDisconnected ? null : 'The band disconnected. Move closer and reconnect.' });
    });

    monitor?.remove();
    monitor = ble.monitorCharacteristicForDevice(band.id, BAND_SERVICE_UUID, BAND_DATA_UUID, (error, characteristic) => {
      if (error) {
        // Disconnects also end the monitor with an error; the disconnect handler explains those.
        if (state.status === 'connected' && !userDisconnected) set({ error: error.message });
        return;
      }
      onPacket(characteristic?.value);
    });

    set({ status: 'connected', history: [], reading: null, receivedAt: null, session: EMPTY_SESSION });
    setPreference('bandConnected', true);
    AsyncStorage.setItem(LAST_BAND_KEY, JSON.stringify(band)).catch(() => {});
    return true;
  } catch (error) {
    set({ status: 'idle', error: error instanceof Error ? error.message : 'Couldn’t connect to the band.' });
    return false;
  }
}

/** Reconnects to the band this phone last paired with, if there is one. */
export async function reconnectLastBand() {
  try {
    const saved = await AsyncStorage.getItem(LAST_BAND_KEY);
    if (!saved) return false;
    return connectBand(JSON.parse(saved) as { id: string; name: string });
  } catch {
    return false;
  }
}

export async function disconnectBand() {
  userDisconnected = true;
  monitor?.remove();
  monitor = null;
  if (manager && state.device) await manager.cancelDeviceConnection(state.device.id).catch(() => {});
  set({ status: 'idle', error: null });
  setPreference('bandConnected', false);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useBand() {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

/** The serial the app records for a band, from its Bluetooth ID, in the `HS-XXXX` form the rules accept. */
export function bandSerial(id: string) {
  return `HS-${(id.replace(/[^0-9a-f]/gi, '') + '0000').slice(0, 4).toUpperCase()}`;
}

/** True when the band is connected and its last packet arrived within the last few seconds. */
export function isLive(band: BandState, now = Date.now()) {
  return band.status === 'connected' && band.receivedAt !== null && now - band.receivedAt < 5_000;
}
