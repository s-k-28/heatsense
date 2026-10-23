// Self-check for the plan-vs-UIL check. Run: node scripts/check-plan-check.ts
import assert from 'node:assert/strict';

import { checkPlan } from '../src/lib/plan-check.ts';
import { UIL_GUIDANCE } from '../src/lib/uil-wbgt.ts';

const standard = { workMinutes: 20, restMinutes: 10, lengthMinutes: 72 };

// Green: 20/10 gives 2 breaks an hour, short of 3.
assert.equal(checkPlan(standard, UIL_GUIDANCE.green).ok, false);
// Every zone with a fix: applying it passes.
for (const zone of ['green', 'yellow', 'orange', 'red'] as const) {
  for (const plan of [standard, { workMinutes: 45, restMinutes: 2, lengthMinutes: 180 }]) {
    const result = checkPlan(plan, UIL_GUIDANCE[zone]);
    if (result.ok) continue;
    assert.ok(result.fix, `${zone} has a fix`);
    assert.equal(checkPlan({ ...plan, ...result.fix }, UIL_GUIDANCE[zone]).ok, true, `${zone} fix passes`);
  }
}
// Orange caps practice at 2 hours.
assert.equal(checkPlan({ workMinutes: 11, restMinutes: 4, lengthMinutes: 150 }, UIL_GUIDANCE.orange).rows.find((r) => r.label === 'Practice length')?.ok, false);
// Black: no outdoor practice, and no timing fix can change that.
const black = checkPlan(standard, UIL_GUIDANCE.black);
assert.equal(black.ok, false);
assert.equal(black.fix, null);

console.log('plan-check: all checks passed');
