import assert from 'node:assert/strict';

import { recheckStatus } from '../src/lib/recheck.ts';

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

console.log('recheck: all checks passed');
