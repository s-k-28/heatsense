import assert from 'node:assert/strict';
import { test } from 'node:test';
import { recheckState, RECHECK_MS } from '../src/components/coach/recheck-clock.ts';

test('a two-minute-old reading has 28 minutes remaining', () => {
  const state = recheckState(1000, 121000);
  assert.equal(state.label, '28:00');
  assert.equal(state.ageMinutes, 2);
  assert.equal(state.due, false);
});
test('the deadline expires exactly at 30 minutes and remains due', () => {
  assert.equal(recheckState(0, RECHECK_MS - 1).label, '00:01');
  assert.equal(recheckState(0, RECHECK_MS - 1).due, false);
  for (const now of [RECHECK_MS, RECHECK_MS + 1, RECHECK_MS * 4]) {
    assert.equal(recheckState(0, now).due, true);
    assert.equal(recheckState(0, now).label, '00:00');
    assert.equal(recheckState(0, now).fraction, 0);
  }
});
test('background time counts toward the deadline without interval ticks', () => {
  const measuredAt = Date.UTC(2026, 8, 16, 16);
  assert.equal(recheckState(measuredAt, measuredAt + 29 * 60000).label, '01:00');
  assert.equal(recheckState(measuredAt, measuredAt + 45 * 60000).due, true);
});
test('clock reversal cannot produce negative age or a bar above 100 percent', () => {
  const state = recheckState(10000, 0);
  assert.equal(state.label, '30:00');
  assert.equal(state.fraction, 1);
  assert.equal(state.ageMinutes, 0);
});
