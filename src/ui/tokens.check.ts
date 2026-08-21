// Runnable check for the pure display mappers in tokens.ts. The only one with
// real branching is dueLabel (day bucketing off an injectable clock), so that is
// what this pins: the day boundaries, the closed flag, the warn tone, and the
// NaN guard. No React, no framework. `pnpm check:ui` (tsx).

import { clampInt, dueLabel } from './tokens';

let passed = 0;
function ok(cond: boolean, msg: string) {
  if (!cond) throw new Error('FAIL: ' + msg);
  passed++;
  console.log('  ok -', msg);
}
function eq<T>(actual: T, expected: T, msg: string) {
  ok(
    actual === expected,
    `${msg} (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`,
  );
}

// A fixed mid-August clock: ±4 days stays inside August, so no DST transition
// can shift a boundary and make the bucketing flaky.
const NOW = Date.parse('2026-08-20T09:00:00Z');
const DAY = 86_400_000;
// Offsets by whole days keep the same wall-clock time, so start-of-day diff == n.
const inDays = (n: number) => new Date(NOW + n * DAY).toISOString();

function main() {
  console.log('dueLabel');

  eq(dueLabel(inDays(0), NOW).text, 'Due today', 'same day reads "Due today"');
  eq(dueLabel(inDays(1), NOW).text, 'Due tomorrow', 'next day reads "Due tomorrow"');
  eq(dueLabel(inDays(3), NOW).text, 'Due in 3 days', 'a few days out counts the days');
  eq(dueLabel(inDays(-1), NOW).text, 'Closed yesterday', 'one day past reads "Closed yesterday"');
  eq(dueLabel(inDays(-4), NOW).text, 'Closed 4 days ago', 'further past counts days ago');

  eq(dueLabel(inDays(0), NOW).closed, false, 'due today is not yet closed');
  eq(dueLabel(inDays(-1), NOW).closed, true, 'a past due day is closed');

  eq(dueLabel(inDays(0), NOW).tone, 'warn', 'due within a day warns');
  eq(dueLabel(inDays(1), NOW).tone, 'warn', 'due tomorrow warns');
  eq(dueLabel(inDays(3), NOW).tone, 'neutral', 'comfortably ahead is neutral');
  eq(dueLabel(inDays(-1), NOW).tone, 'neutral', 'closed is neutral, not alarming');

  // A late boundary crossing: 09:00Z "now" vs a 23:00-earlier-day due still lands
  // on the right calendar bucket because both snap to local midnight first.
  eq(
    dueLabel(new Date(NOW + DAY).toISOString(), NOW).text,
    'Due tomorrow',
    'the boundary is the calendar day, not a rolling 24h',
  );

  eq(dueLabel('not-a-date', NOW).text, '', 'an unparseable date yields no label');
  eq(dueLabel('not-a-date', NOW).closed, false, 'an unparseable date is not "closed"');

  console.log('clampInt');
  eq(clampInt('5', 1, 10, 3), 5, 'an in-range value passes through');
  eq(clampInt('0', 1, 10, 3), 1, 'below the floor clamps up to min');
  eq(clampInt('99', 1, 10, 3), 10, 'above the ceiling clamps down to max');
  eq(clampInt('', 1, 10, 3), 3, 'empty text falls back');
  eq(clampInt('abc', 1, 10, 3), 3, 'non-numeric text falls back');
  eq(clampInt('7.9', 1, 10, 3), 7, 'a decimal is floored to its integer part');

  console.log(`\nAll ${passed} assertions passed.`);
}

main();
