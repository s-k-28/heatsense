// Self-check for the UIL WBGT classifier. Run: node scripts/check-uil-wbgt.ts
import assert from 'node:assert/strict';

import { celsiusToF, classifyWbgt, evenIntervals, zoneRange } from '../src/lib/uil-wbgt.ts';

// The bug this module replaces: 84 °F was shown as Orange. UIL puts it in Yellow for both classes.
assert.equal(classifyWbgt(84, 3), 'yellow');
assert.equal(classifyWbgt(84, 2), 'yellow');

// Every published edge, both sides.
const edges: [number, 2 | 3, string][] = [
  [81.9, 3, 'green'], [82.0, 3, 'yellow'], [86.9, 3, 'yellow'], [87.0, 3, 'orange'],
  [90.0, 3, 'orange'], [90.1, 3, 'red'], [92.0, 3, 'red'], [92.1, 3, 'black'],
  [79.6, 2, 'green'], [79.7, 2, 'yellow'], [84.6, 2, 'yellow'], [84.7, 2, 'orange'],
  [87.6, 2, 'orange'], [87.7, 2, 'red'], [89.7, 2, 'red'], [89.8, 2, 'black'],
];
for (const [f, c, zone] of edges) assert.equal(classifyWbgt(f, c), zone, `${f} °F class ${c}`);

// Rounding to the chart's precision: 90.04 reads as 90.0 (Orange), 90.06 as 90.1 (Red).
assert.equal(classifyWbgt(90.04, 3), 'orange');
assert.equal(classifyWbgt(90.06, 3), 'red');

// Typos and nonsense never produce a zone.
for (const bad of [NaN, Infinity, -5, 840, 8.4]) assert.equal(classifyWbgt(bad, 3), null);

assert.equal(Math.round(celsiusToF(30) * 10) / 10, 86);
assert.equal(zoneRange('yellow', 3), '82.0–86.9 °F');
assert.equal(zoneRange('black', 2), '≥ 89.8 °F');
assert.deepEqual(evenIntervals('orange'), { workMinutes: 11, restMinutes: 4 });
assert.equal(evenIntervals('red'), null);

console.log('uil-wbgt: all checks passed');
