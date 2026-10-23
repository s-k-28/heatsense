// Decodes the packets the HeatSense Band firmware sends over Bluetooth (see README, "HeatSense Band").
// Little-endian, one packet per notification:
//
//   offset  field       type    meaning
//   0       version     uint8   1 = 13 bytes, 2 = 14 bytes (adds SpO2), 3 = 20 bytes (adds steps)
//   1       sequence    uint16  counts up by one per packet; gaps mean dropped packets
//   3       seconds     uint32  seconds since the band started
//   7       heartRate   uint8   bpm, 0 = no valid reading
//   8       motion      uint16  MPU6050 movement over the last second, milli-g with gravity removed
//   10      gsr         uint16  raw GSR level (0 until wired)
//   12      battery     uint8   percent 0-100, 255 = unknown
//   13      spo2        uint8   percent, 0 = no valid reading (version 2+)
//   14      steps       uint32  steps since the band started (version 3)
//   18      cadence     uint8   steps per minute over the last 10 seconds (version 3)
//   19      activity    uint8   0 still, 1 active, 2 walking, 3 running (version 3)
//
// Free of app imports so `node scripts/check-band-packet.ts` can test it.

export type BandPacket = {
  version: number;
  sequence: number;
  seconds: number;
  /** null when the band has no valid reading (finger or skin not detected, still settling). */
  heartRate: number | null;
  motion: number;
  gsr: number;
  battery: number | null;
  spo2: number | null;
  /** Steps since the band started. null before version 3. */
  steps: number | null;
  /** Steps per minute. null before version 3. */
  cadence: number | null;
  activity: Activity | null;
};

export type Activity = 'still' | 'active' | 'walking' | 'running';
const ACTIVITIES: Activity[] = ['still', 'active', 'walking', 'running'];

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Bluetooth libraries hand characteristic values over as base64 text. */
export function base64ToBytes(text: string): Uint8Array {
  const clean = text.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of clean) {
    buffer = (buffer << 6) | BASE64.indexOf(char);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(bytes);
}

/** Returns null for anything that isn't a packet format this app understands. */
export function decodeBandPacket(bytes: Uint8Array): BandPacket | null {
  if (bytes.length < 13) return null;
  const version = bytes[0];
  if (version < 1 || version > 3) return null;
  if (version === 2 && bytes.length < 14) return null;
  if (version === 3 && bytes.length < 20) return null;

  const u16 = (i: number) => bytes[i] | (bytes[i + 1] << 8);
  const u32 = (i: number) => (bytes[i] | (bytes[i + 1] << 8) | (bytes[i + 2] << 16) | (bytes[i + 3] << 24)) >>> 0;

  return {
    version,
    sequence: u16(1),
    seconds: u32(3),
    heartRate: bytes[7] > 0 ? bytes[7] : null,
    motion: u16(8),
    gsr: u16(10),
    battery: bytes[12] <= 100 ? bytes[12] : null,
    spo2: version >= 2 && bytes[13] > 0 ? bytes[13] : null,
    steps: version >= 3 ? u32(14) : null,
    cadence: version >= 3 ? bytes[18] : null,
    activity: version >= 3 ? ACTIVITIES[bytes[19]] ?? null : null,
  };
}
