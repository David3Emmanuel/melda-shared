import type { Assignment, Concept, Dataset, LearningSignal, Student, Submission } from './models';
/** questionId -> chosen choice index. A missing entry means an unanswered question. */
export type Selections = Record<string, number>;
export interface SubmissionResult {
    submission: Submission;
    signals: LearningSignal[];
}
/**
 * Grade `selections` against `assignment` and derive the submission plus the
 * signals it emits. Deterministic given its inputs: signal ids are derived from
 * `idBase` (the submission's own id), so re-running produces identical output.
 */
export declare function buildSubmission(assignment: Assignment, studentId: string, selections: Selections, submittedAt: string, idBase: string): SubmissionResult;
/**
 * Replace a student's prior submission for the same assignment (or prepend it if
 * there is none), newest first. Mastery sums across a student's submissions, so
 * a re-attempt must overwrite rather than accumulate.
 */
export declare function upsertSubmission(submissions: Submission[], sub: Submission): Submission[];
/**
 * Names of the concepts (in teaching order) a submission answered wrong - the
 * "what to re-study" hint a student sees after a quiz, without exposing which
 * answer was which. Answers carry a denormalised conceptId, so no re-join is
 * needed; concepts the submission never touched (or no longer exist) drop out.
 */
export declare function missedTopicNames(concepts: Concept[], submission: Submission): string[];
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
export declare function assignmentProgress(dataset: Dataset, assignmentId: string): AssignmentProgress | null;
