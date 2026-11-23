import assert from 'node:assert/strict';

import { recheckStatus } from '../src/lib/recheck.ts';
import { checkOutdoorStart, outdoorPracticeDuration, outdoorStartTime } from '../src/lib/outdoor-start.ts';

const start = Date.parse('2026-10-23T15:00:00Z');
const session = { startedAt: new Date(start), recheckMinutes: 30 };
const minute = 60_000;

// Starting practice must never give a grace period before the first measurement.
assert.deepEqual(recheckStatus(session, null, start), { dueAt: start, overdue: false, msLeft: 0 });
assert.deepEqual(recheckStatus(session, null, start + minute), { dueAt: start, overdue: true, msLeft: -minute });

// Rechecks follow when the reading was measured, including backdated readings.
const reading = { measuredAt: new Date(start + 5 * minute) };
assert.deepEqual(recheckStatus(session, reading, start + 10 * minute), {
  dueAt: start + 35 * minute, overdue: false, msLeft: 25 * minute,
});
assert.equal(recheckStatus(session, reading, start + 35 * minute).msLeft, 0);
assert.equal(recheckStatus(session, reading, start + 36 * minute).overdue, true);
assert.equal(recheckStatus({ ...session, recheckMinutes: 15 }, reading, start).dueAt, start + 20 * minute);

const field = { ...reading, zone: 'orange' as const };
assert.equal(checkOutdoorStart(null, start), 'missing');
assert.equal(checkOutdoorStart(field, start), 'invalid-time');
assert.equal(checkOutdoorStart({ ...field, measuredAt: new Date(NaN) }, start), 'invalid-time');
assert.equal(checkOutdoorStart(field, start + 5 * minute), 'ready');
assert.equal(checkOutdoorStart(field, start + 20 * minute), 'ready');
assert.equal(checkOutdoorStart(field, start + 20 * minute + 1), 'stale');
assert.equal(checkOutdoorStart({ ...field, zone: 'black' }, start + 25 * minute), 'stop');
assert.equal(outdoorStartTime(session), session.startedAt);
assert.equal(outdoorStartTime({ ...session, outdoorStart: null }), null);
assert.equal(outdoorStartTime({ ...session, outdoorStart: { at: reading.measuredAt } }), reading.measuredAt);
const ended = { ...session, endedAt: new Date(start + 30 * minute) };
assert.equal(outdoorPracticeDuration(ended), 30 * minute);
assert.equal(outdoorPracticeDuration({ ...ended, outdoorStart: null }), null);
assert.equal(outdoorPracticeDuration({ ...ended, outdoorStart: { at: reading.measuredAt } }), 25 * minute);

console.log('recheck and outdoor start: all checks passed');
