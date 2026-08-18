// Runnable check for the insight aggregation. No test framework, no @types/node:
// a tiny local assert (below) keeps the React Native app's typecheck free of
// Node globals. Run with `pnpm check:insights` (tsx). If the seed or the
// aggregation logic drifts, this fails loudly - in particular it pins the demo
// headline "32% struggled with Ionic Bonding" to real, recomputed data.

import { dataset } from '../../data/seed';
import {
  classSummary,
  conceptDetail,
  conceptInsights,
  masteryFor,
  signalCounts,
  studentDetail,
  studentsByNeed,
} from './aggregate';

// `asserts value` lets `ok(d)` narrow a nullable to non-null for the checks below.
function ok(value: unknown, msg?: string): asserts value {
  if (!value) throw new Error(msg ?? 'assertion failed');
}
function eq<T>(actual: T, expected: T, msg?: string): void {
  if (actual !== expected) {
    throw new Error(`${msg ?? 'not equal'}: got ${String(actual)}, want ${String(expected)}`);
  }
}
function deepEq(actual: unknown, expected: unknown, msg?: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg ?? 'not deep equal'}: got ${a}, want ${e}`);
}

let checks = 0;
const check = (label: string, fn: () => void): void => {
  fn();
  checks++;
  console.log(`  ok  ${label}`);
};

// --- the headline ------------------------------------------------------------
check('Ionic Bonding is the top struggle at exactly 32%', () => {
  const insights = conceptInsights(dataset);
  const top = insights[0];
  eq(top.conceptId, 'c-ionic');
  eq(top.strugglePct, 32);
  eq(top.strugglers, 8);
  eq(top.attempted, 25);
});

// --- descending, clean struggle curve ---------------------------------------
check('every assessed concept has 25 attempts and its target struggle %', () => {
  const byId = Object.fromEntries(conceptInsights(dataset).map((i) => [i.conceptId, i]));
  const expected: Record<string, number> = {
    'c-ionic': 32,
    'c-reactions': 24,
    'c-covalent': 20,
    'c-atomic': 12,
    'c-periodic': 8,
    'c-states': 4,
  };
  for (const [id, wantPct] of Object.entries(expected)) {
    eq(byId[id].attempted, 25, `${id} attempts`);
    eq(byId[id].strugglePct, wantPct, `${id} struggle %`);
  }
});

check('insights are sorted most-painful first', () => {
  const pcts = conceptInsights(dataset).map((i) => i.strugglePct);
  for (let i = 1; i < pcts.length; i++) ok(pcts[i - 1] >= pcts[i]);
});

// --- the "not yet assessed" path --------------------------------------------
check('Acids and Bases (draft, unassessed) is absent from insights', () => {
  const ids = conceptInsights(dataset).map((i) => i.conceptId);
  ok(!ids.includes('c-acids'));
  eq(conceptInsights(dataset).length, 6);
});

// --- mastery is a real recomputation, not a stored flag ----------------------
check('a struggler scores 1/3 and a master scores 3/3 on ionic bonding', () => {
  // s11 (index 10) is in the ionic struggler set; s1 (index 0) is not.
  eq(masteryFor(dataset, 's11', 'c-ionic'), 1 / 3);
  eq(masteryFor(dataset, 's1', 'c-ionic'), 1);
  eq(masteryFor(dataset, 's1', 'c-acids'), null); // never assessed
});

// --- class summary -----------------------------------------------------------
check('class summary: 25 students, all submitted, top struggle is ionic', () => {
  const s = classSummary(dataset);
  eq(s.studentCount, 25);
  eq(s.submissionCount, 25);
  eq(s.submissionRatePct, 100);
  eq(s.assessedConceptCount, 6);
  eq(s.topStruggle?.conceptId, 'c-ionic');
});

// --- concept drill-down ------------------------------------------------------
check('ionic drill-down lists all 8 strugglers and captured signals', () => {
  const d = conceptDetail(dataset, 'c-ionic');
  ok(d);
  eq(d.strugglingStudents.length, 8);
  const kinds = Object.fromEntries(d.signalCounts.map((c) => [c.type, c.count]));
  ok((kinds.QUESTION_STRUGGLE ?? 0) >= 8, 'strugglers each raised a struggle signal');
  ok((kinds.TIME_ON_SECTION ?? 0) > 0, 'lesson engagement captured');
});

// --- signal taxonomy is broadly represented ----------------------------------
check('the full signal taxonomy shows up, QUESTION_STRUGGLE == 25 (one per struggle pair)', () => {
  const kinds = Object.fromEntries(signalCounts(dataset.signals).map((c) => [c.type, c.count]));
  eq(kinds.QUESTION_STRUGGLE, 25);
  eq(kinds.ASSIGNMENT_PERFORMANCE, 150); // 25 students x 6 concepts
  eq(kinds.SUBMISSION_TIMESTAMP, 25);
  ok((kinds.REQUEST_SIMPLER ?? 0) > 0);
  ok((kinds.RESOURCE_ENGAGEMENT ?? 0) > 0);
});

// --- student drill-down ------------------------------------------------------
check('s1 struggles with exactly Atomic Structure, Chemical Reactions, States of Matter', () => {
  const d = studentDetail(dataset, 's1');
  ok(d);
  deepEq([...d.strugglingConceptNames].sort(), [
    'Atomic Structure',
    'Chemical Reactions',
    'States of Matter',
  ]);
  eq(d.perConcept.length, 6);
  ok(d.overallMasteryPct !== null && d.overallMasteryPct > 0);
});

// --- students ranked by need -------------------------------------------------
check('studentsByNeed ranks the most-struggling student first, all 25 present', () => {
  const ranked = studentsByNeed(dataset);
  eq(ranked.length, 25);
  for (let i = 1; i < ranked.length; i++) {
    ok(ranked[i - 1].struggleCount >= ranked[i].struggleCount, 'sorted by struggle count');
  }
  ok(ranked[0].struggleCount >= 1, 'someone is struggling');
  ok(ranked[0].strugglingConceptNames.length === ranked[0].struggleCount);
});

console.log(`\n${checks} insight checks passed.`);
