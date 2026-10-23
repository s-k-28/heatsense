// Self-check for the HeatSense Band packet decoder. Run: node scripts/check-band-packet.ts
import assert from 'node:assert/strict';

import { base64ToBytes, decodeBandPacket } from '../src/lib/band-packet.ts';
import { activeKcal, metFor } from '../src/lib/band-motion.ts';

const hex = (text: string) => Uint8Array.from(text.split(/\s+/).map((byte) => parseInt(byte, 16)));
const toBase64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64');

// A real packet from the bench test: 78 bpm, SpO2 99%, battery unknown.
const real = hex('02 06 01 94 01 00 00 4E 00 00 00 00 FF 63');
assert.deepEqual(decodeBandPacket(real), { version: 2, sequence: 262, seconds: 404, heartRate: 78, motion: 0, gsr: 0, battery: null, spo2: 99, steps: null, cadence: null, activity: null });

// The same packet as the Bluetooth library delivers it (base64) decodes the same way.
assert.deepEqual(base64ToBytes(toBase64(real)), real);
assert.equal(decodeBandPacket(base64ToBytes(toBase64(real)))?.heartRate, 78);

// No finger: heart rate and SpO2 are 0 on the wire, null here.
const empty = decodeBandPacket(hex('02 07 01 95 01 00 00 00 00 00 00 00 FF 00'));
assert.equal(empty?.heartRate, null);
assert.equal(empty?.spo2, null);

// Version 1 (13 bytes, no SpO2) still decodes; battery in range is kept.
const v1 = decodeBandPacket(hex('01 FF FF 10 00 00 00 48 34 12 CD AB 57'));
assert.deepEqual(v1, { version: 1, sequence: 65535, seconds: 16, heartRate: 72, motion: 0x1234, gsr: 0xabcd, battery: 87, spo2: null, steps: null, cadence: null, activity: null });

// Version 3 adds motion: 72 bpm, 98%, 312 milli-g, 1,234 steps, 112 steps/min, walking.
const v3 = decodeBandPacket(hex('03 10 00 3C 00 00 00 48 38 01 00 00 FF 62 D2 04 00 00 70 02'));
assert.deepEqual(v3, { version: 3, sequence: 16, seconds: 60, heartRate: 72, motion: 312, gsr: 0, battery: null, spo2: 98, steps: 1234, cadence: 112, activity: 'walking' });
assert.equal(decodeBandPacket(hex('03 10 00 3C 00 00 00 48 38 01 00 00 FF 62 D2 04 00 00 70')), null, 'v3 needs 20 bytes');
assert.equal(decodeBandPacket(hex('03 10 00 3C 00 00 00 48 38 01 00 00 FF 62 D2 04 00 00 70 09'))?.activity, null, 'unknown activity');

// Large values use unsigned maths.
assert.equal(decodeBandPacket(hex('01 00 00 FF FF FF FF 48 00 00 00 00 FF'))?.seconds, 4294967295);

// Anything else is rejected rather than misread.
assert.equal(decodeBandPacket(hex('02 06 01 94 01 00 00 4E 00 00 00 00 FF')), null, 'v2 needs 14 bytes');
assert.equal(decodeBandPacket(hex('04 06 01 94 01 00 00 4E 00 00 00 00 FF 63 00 00 00 00 00 00')), null, 'unknown version');
assert.equal(decodeBandPacket(new Uint8Array(5)), null, 'too short');

// Energy: an hour of running at 9 MET for a 70 kg athlete is (9 - 1) × 3.5 × 70 / 200 × 60 = 588 kcal above rest.
assert.equal(Math.round(activeKcal(metFor('running', 160), 3600, 70)), 588);
assert.equal(activeKcal(metFor('still', 0), 60), 0, 'standing still adds nothing above rest');
assert.ok(metFor('walking', 125) > metFor('walking', 90), 'brisk walking costs more');

console.log('band packet: all checks passed');
