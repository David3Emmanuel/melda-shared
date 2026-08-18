// Runnable check for the EXPERIENCE derivation: the bridge from a student's raw
// answers to what the teacher dashboards see. Proves four things, ending with
// the demo's headline claim wired end to end. Run with `pnpm check:experience`.
//
//   1. a perfect paper grades all-correct and emits no struggle signals
//   2. answering only the first question of each concept reproduces the seed's
//      "struggling" pattern (1/3 mastery) and emits a struggle signal per concept
//   3. a re-attempt REPLACES a student's prior submission (never accumulates)
//   4. therefore, when an ionic struggler re-sits and aces it, the class struggle
//      figure for Ionic Bonding drops from 32% to 28% - the loop the demo shows.

import { dataset } from '../data/seed';
import { conceptInsights } from './insights/aggregate';
import {
  assignmentProgress,
  buildSubmission,
  upsertSubmission,
  type Selections,
} from './experience';

function ok(value: unknown, msg?: string): asserts value {
  if (!value) throw new Error(msg ?? 'assertion failed');
}
function eq<T>(actual: T, expected: T, msg?: string): void {
  if (actual !== expected) {
    throw new Error(`${msg ?? 'not equal'}: got ${String(actual)}, want ${String(expected)}`);
  }
}

let checks = 0;
const check = (label: string, fn: () => void): void => {
  fn();
  checks++;
  console.log(`  ok  ${label}`);
};

const assignment = dataset.assignments[0];
const ASSESSED_CONCEPTS = new Set(assignment.questions.map((q) => q.conceptId)).size;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

// The choice each answer selects under a given strategy.
const selectionsWhere = (correctFor: (questionIndexInConcept: number) => boolean): Selections =>
  Object.fromEntries(
    assignment.questions.map((q) => {
      const qi = Number(q.id.split('-q')[1]) - 1; // 0..2 within the concept
      const choiceCount = q.choices?.length ?? 4;
      const idx = correctFor(qi) ? q.correctIndex! : (q.correctIndex! + 1) % choiceCount;
      return [q.id, idx];
    }),
  );

const perfect = selectionsWhere(() => true);
const seedStruggler = selectionsWhere((qi) => qi === 0); // only the first of each triple

const countType = (signals: { type: string }[], type: string): number =>
  signals.filter((s) => s.type === type).length;

check('a perfect paper grades all-correct with no struggle signals', () => {
  const { submission, signals } = buildSubmission(assignment, 's-test', perfect, 'T', 'sub-T');
  eq(submission.answers.length, assignment.questions.length, 'every question answered');
  ok(
    submission.answers.every((a) => a.correct),
    'all answers correct',
  );
  eq(countType(signals, 'SUBMISSION_TIMESTAMP'), 1, 'one submission-timestamp signal');
  eq(
    countType(signals, 'ASSIGNMENT_PERFORMANCE'),
    ASSESSED_CONCEPTS,
    'one perf signal per concept',
  );
  eq(countType(signals, 'QUESTION_STRUGGLE'), 0, 'no struggle signals on a perfect paper');
  ok(
    signals.every((s) => s.id.startsWith('sub-T-sig-')),
    'signal ids derive from the submission id',
  );
  eq(new Set(signals.map((s) => s.id)).size, signals.length, 'signal ids are unique');
});

check('the seed struggle pattern yields 1/3 mastery and a struggle signal per concept', () => {
  const { signals } = buildSubmission(assignment, 's-test', seedStruggler, 'T', 'sub-T');
  eq(countType(signals, 'QUESTION_STRUGGLE'), ASSESSED_CONCEPTS, 'a struggle signal per concept');
  const perf = signals.filter((s) => s.type === 'ASSIGNMENT_PERFORMANCE');
  ok(
    perf.every((s) => Math.abs((s.value ?? 0) - 1 / 3) < 1e-9),
    'each concept scores 1 of 3',
  );
});

check('a re-attempt replaces the prior submission rather than accumulating', () => {
  const submissions = clone(dataset.submissions);
  const before = submissions.length;
  const s16 = buildSubmission(assignment, 's16', perfect, 'T', 'sub-redo').submission;
  const after = upsertSubmission(submissions, s16);
  eq(after.length, before, 's16 already had a submission, so the count is unchanged');
  eq(after[0].id, 'sub-redo', 'the new submission is newest-first');
  eq(
    after.filter((s) => s.studentId === 's16' && s.assignmentId === assignment.id).length,
    1,
    'exactly one submission per student per assignment',
  );

  const fresh = buildSubmission(assignment, 's-new', perfect, 'T', 'sub-new').submission;
  eq(upsertSubmission(submissions, fresh).length, before + 1, 'a brand-new student adds a row');
});

check('an ionic struggler acing the re-sit drops class struggle 32% -> 28%', () => {
  const ionic = () => conceptInsights(dataset).find((c) => c.conceptId === 'c-ionic')!;
  eq(ionic().strugglePct, 32, 'baseline headline is 32%');
  eq(ionic().strugglers, 8, 'baseline is 8 of 25');

  // s16 is Wanjiru Kamau, a seeded ionic struggler. Re-sit the review perfectly.
  const next = clone(dataset);
  const redo = buildSubmission(assignment, 's16', perfect, 'T', 'sub-redo').submission;
  next.submissions = upsertSubmission(next.submissions, redo);

  const after = conceptInsights(next).find((c) => c.conceptId === 'c-ionic')!;
  eq(after.strugglers, 7, 'one fewer struggler');
  eq(after.strugglePct, 28, 'headline moves to 28%');
});

check('assignmentProgress tallies the roster and the class average for a review', () => {
  const prog = assignmentProgress(dataset, assignment.id)!;
  ok(prog, 'the seeded assignment resolves');
  eq(prog.rows.length, dataset.students.length, 'one row per student');
  eq(prog.submittedCount, dataset.students.length, 'all seeded students submitted');
  ok(
    prog.rows.every((r) => r.submitted),
    'every seeded row is marked submitted',
  );
  ok(prog.avgScorePct !== null && prog.avgScorePct > 0, 'a class average is computed');

  // An assignment nobody has taken yet: full roster, zero submitted, no average.
  const empty = clone(dataset);
  const fresh = { ...assignment, id: 'a-fresh' };
  empty.assignments = [fresh, ...empty.assignments];
  const p2 = assignmentProgress(empty, 'a-fresh')!;
  eq(p2.submittedCount, 0, 'nobody has submitted the fresh review');
  eq(p2.avgScorePct, null, 'no average before any submissions');
  eq(p2.rows.length, empty.students.length, 'still one row per student');
  ok(
    p2.rows.every((r) => !r.submitted && r.total === fresh.questions.length),
    'unsubmitted rows fall back to the question count',
  );

  eq(assignmentProgress(dataset, 'nope'), null, 'unknown assignment id is null');
});

console.log(`\n${checks} experience checks passed.`);
