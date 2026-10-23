// Self-check for the demo band simulator. Run: node scripts/check-band-simulator.ts
import assert from 'node:assert/strict';

import { DEMO_TEAM, recoveryStatus, vitalsAt } from '../src/lib/band-simulator.ts';

const [jordan, , marcus] = DEMO_TEAM;
const WORK = 20 * 60;

// Repeatable: the same moment gives the same signals.
assert.deepEqual(vitalsAt(jordan, 600, 'yellow'), vitalsAt(jordan, 600, 'yellow'));

// Plausible ranges across a whole 90-minute practice in every zone.
for (const zone of ['green', 'yellow', 'orange', 'red', 'black'] as const) {
  for (let t = 0; t <= 90 * 60; t += 30) {
    for (const a of DEMO_TEAM) {
      const v = vitalsAt(a, t, zone);
      assert.ok(v.heartRate >= 60 && v.heartRate <= 200, `HR ${v.heartRate}`);
      assert.ok(v.skinTempF >= 90 && v.skinTempF <= 97, `skin ${v.skinTempF}`);
      assert.ok(v.sweat >= 0 && v.sweat <= 25, `sweat ${v.sweat}`);
      assert.ok(v.movement >= 0 && v.movement <= 100, `movement ${v.movement}`);
      assert.ok(v.spo2 >= 94 && v.spo2 <= 100, `spo2 ${v.spo2}`);
    }
  }
}

// Work raises heart rate; rest brings it down.
assert.ok(vitalsAt(jordan, WORK - 30, 'yellow').heartRate > vitalsAt(jordan, WORK + 8 * 60, 'yellow').heartRate + 20);

// Heat costs something: same moment, hotter zone, higher heart rate and skin temperature.
assert.ok(vitalsAt(jordan, 900, 'red').heartRate > vitalsAt(jordan, 900, 'green').heartRate);
assert.ok(vitalsAt(jordan, 900, 'red').skinTempF > vitalsAt(jordan, 900, 'green').skinTempF);

// Recovery check: typical athlete recovers, the slow-recovery athlete gets flagged in the same break.
const sixMinIntoRest = WORK + 6 * 60;
assert.equal(recoveryStatus(jordan, sixMinIntoRest, 'yellow'), 'usual');
assert.equal(recoveryStatus(marcus, sixMinIntoRest, 'yellow'), 'watch');
// Never flagged during work or the first minutes of a break.
assert.equal(recoveryStatus(marcus, WORK - 60, 'yellow'), 'usual');
assert.equal(recoveryStatus(marcus, WORK + 2 * 60, 'yellow'), 'usual');

console.log('band-simulator: all checks passed');
