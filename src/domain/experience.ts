// The EXPERIENCE layer's client-side derivation: turn a student's raw MCQ
// selections into the graded Submission and the learning signals a real student
// app would POST as it goes. Kept pure - no clock, no ids of its own beyond an
// injected base - so the exact same logic runs in the store and in a runnable
// check.
//
// Submissions and signals have deliberately different lifetimes, because the
// teacher dashboards read them differently:
//   - a Submission is CURRENT STATE. masteryFor sums a student's answers across
//     ALL their submissions (see aggregate.masteryFor), so a re-attempt must
//     REPLACE the previous one or the two would be averaged together and the
//     score would lie. upsertSubmission enforces that.
//   - a LearningSignal is an EVENT. A student's history is never rewritten, so
//     signals are only ever appended.

import { STRUGGLE_THRESHOLD } from './insights/aggregate';
import type { Answer, Assignment, Dataset, LearningSignal, Student, Submission } from './models';

/** questionId -> chosen choice index. A missing entry means an unanswered question. */
export type Selections = Record<string, number>;

export interface SubmissionResult {
  submission: Submission;
  signals: LearningSignal[];
}

// Seeded signals tie a concept back to its lesson as `lesson-<key>` (e.g.
// c-ionic -> lesson-ionic); match that so the ones we emit drill down the same.
const lessonIdFor = (conceptId: string): string => `lesson-${conceptId.slice(2)}`;

/**
 * Grade `selections` against `assignment` and derive the submission plus the
 * signals it emits. Deterministic given its inputs: signal ids are derived from
 * `idBase` (the submission's own id), so re-running produces identical output.
 */
export function buildSubmission(
  assignment: Assignment,
  studentId: string,
  selections: Selections,
  submittedAt: string,
  idBase: string,
): SubmissionResult {
  const answers: Answer[] = assignment.questions.map((q) => {
    const selectedIndex = selections[q.id];
    return {
      questionId: q.id,
      conceptId: q.conceptId,
      // A question with no answer key (a short-answer prompt) is never auto-marked
      // correct; only a matching MCQ choice counts.
      correct: q.correctIndex !== undefined && selectedIndex === q.correctIndex,
      selectedIndex,
    };
  });

  const submission: Submission = {
    id: idBase,
    assignmentId: assignment.id,
    studentId,
    submittedAt,
    answers,
  };

  // Tally correct/total per concept; a Map preserves first-seen (question) order.
  const tally = new Map<string, { correct: number; total: number }>();
  for (const a of answers) {
    const t = tally.get(a.conceptId) ?? { correct: 0, total: 0 };
    t.total++;
    if (a.correct) t.correct++;
    tally.set(a.conceptId, t);
  }

  const signals: LearningSignal[] = [];
  const push = (s: Omit<LearningSignal, 'id'>): void => {
    signals.push({ id: `${idBase}-sig-${signals.length}`, ...s });
  };

  push({
    studentId,
    type: 'SUBMISSION_TIMESTAMP',
    createdAt: submittedAt,
    note: `Submitted ${assignment.title}`,
  });

  for (const [conceptId, t] of tally) {
    const mastery = t.total === 0 ? 0 : t.correct / t.total;
    push({
      studentId,
      type: 'ASSIGNMENT_PERFORMANCE',
      conceptId,
      createdAt: submittedAt,
      value: mastery,
    });
    if (mastery < STRUGGLE_THRESHOLD) {
      push({
        studentId,
        type: 'QUESTION_STRUGGLE',
        conceptId,
        lessonId: lessonIdFor(conceptId),
        createdAt: submittedAt,
        note: 'Missed most of these questions',
      });
    }
  }

  return { submission, signals };
}

/**
 * Replace a student's prior submission for the same assignment (or prepend it if
 * there is none), newest first. Mastery sums across a student's submissions, so
 * a re-attempt must overwrite rather than accumulate.
 */
export function upsertSubmission(submissions: Submission[], sub: Submission): Submission[] {
  const rest = submissions.filter(
    (s) => !(s.assignmentId === sub.assignmentId && s.studentId === sub.studentId),
  );
  return [sub, ...rest];
}

// --- live tracking -----------------------------------------------------------
// The teacher's view of one review as it lands: who has submitted, their score,
// and the class average so far. Pure over the dataset, so the tracker screen
// recomputes on every store change without any wiring.

export interface ProgressRow {
  student: Student;
  submitted: boolean;
  /** Correct answers and question count; falls back to the assignment length when unsubmitted. */
  correct: number;
  total: number;
}

export interface AssignmentProgress {
  assignment: Assignment;
  studentCount: number;
  submittedCount: number;
  /** Mean score over submitted papers only, 0..100, or null before any come in. */
  avgScorePct: number | null;
  /** One row per student, submitted first, then in roster order. */
  rows: ProgressRow[];
}

export function assignmentProgress(
  dataset: Dataset,
  assignmentId: string,
): AssignmentProgress | null {
  const assignment = dataset.assignments.find((a) => a.id === assignmentId);
  if (!assignment) return null;

  // One submission per student (upsertSubmission guarantees no duplicates).
  const byStudent = new Map<string, Submission>();
  for (const sub of dataset.submissions) {
    if (sub.assignmentId === assignmentId) byStudent.set(sub.studentId, sub);
  }

  const rows: ProgressRow[] = dataset.students.map((student) => {
    const sub = byStudent.get(student.id);
    return {
      student,
      submitted: sub !== undefined,
      correct: sub ? sub.answers.filter((a) => a.correct).length : 0,
      total: sub ? sub.answers.length : assignment.questions.length,
    };
  });
  rows.sort((a, b) => Number(b.submitted) - Number(a.submitted));

  const submitted = rows.filter((r) => r.submitted);
  const avgScorePct = submitted.length
    ? Math.round(
        (submitted.reduce((sum, r) => sum + (r.total ? r.correct / r.total : 0), 0) /
          submitted.length) *
          100,
      )
    : null;

  return {
    assignment,
    studentCount: dataset.students.length,
    submittedCount: submitted.length,
    avgScorePct,
    rows,
  };
}
