// The REST wire contract shared by the backend and both apps. Request bodies and
// response shapes live here so the server and its clients never drift. Types that
// already exist in the domain (Lesson, ClassSummary, ConceptDetail, the AI I/O
// DTOs, AssignmentProgress) are reused directly through the barrel; this file only
// adds what crosses the wire and has no home in the domain: auth, and the composite
// read models the screens fetch.
//
// Design note - who reads what: the teacher app fetches the rich reads (insights,
// per-student, per-concept, assignment progress with the full roster). The student
// app never sees classmates' data: it lists only its own assignments (StudentAssignment)
// and submits. Endpoint-level auth enforces that; these shapes just mirror it.

import type {
  AdaptationMode,
  Assignment,
  Lesson,
  LearningSignalType,
  SectionKind,
  Subject,
} from './domain/models';
import type { ClassSummary, ConceptInsight, StudentNeed } from './domain/insights/aggregate';
import type { Selections } from './domain/experience';

// --- auth --------------------------------------------------------------------

export type Role = 'teacher' | 'student';

/** The authenticated principal, decoded from the JWT and returned by login/signup. */
export interface AuthUser {
  id: string;
  role: Role;
  name: string;
  email: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  role: Role;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
  role: Role;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

// --- classes -----------------------------------------------------------------

/** One class the signed-in user belongs to. GET /me/classes returns a list of these. */
export interface ClassCard {
  id: string;
  name: string;
  subject: Subject;
  studentCount: number;
  /** The join code, present only on a teacher's own class (so they can re-share it). */
  inviteCode?: string;
}

/** POST /classes - a teacher creates a class and owns it. */
export interface CreateClassRequest {
  name: string;
  subject?: string;
}

/** The class just created, plus the invite code students use to join it. */
export interface CreateClassResponse extends ClassCard {
  inviteCode: string;
}

/** POST /classes/join - a student enrolls with a teacher-shared invite code. */
export interface JoinClassRequest {
  code: string;
}

// --- teacher reads (computed server-side via loadDataset + pure aggregation) --

/**
 * GET /classes/:id/insights - the deterministic numbers and the AI narration
 * returned together, so "the AI only narrates numbers it did not invent" holds
 * on the server: aggregation runs first, its output feeds narrateInsight.
 */
export interface InsightsResponse {
  summary: ClassSummary;
  concepts: ConceptInsight[];
  studentsByNeed: StudentNeed[];
  /** Server-authoritative class average: the mean of each student's overall mastery. */
  avgMasteryPct: number;
  narration: string;
}

// conceptDetail / studentDetail / assignmentProgress / lessons are returned as the
// domain types themselves (ConceptDetail, StudentDetail, AssignmentProgress, Lesson[]);
// no wrapper is added here.

// --- teacher CREATE requests -------------------------------------------------

export interface CreateLessonSection {
  title: string;
  kind: SectionKind;
  body: string;
}

/** POST /classes/:id/lessons. The server resolves `topic` to a real Concept. */
export interface CreateLessonRequest {
  topic: string;
  gradeLevel?: string;
  title: string;
  summary: string;
  sections: CreateLessonSection[];
  publish?: boolean;
}

export interface CreateQuestion {
  prompt: string;
  choices: string[];
  correctIndex: number;
}

/** POST /classes/:id/assignments. The server resolves `topic` to a real Concept. */
export interface CreateAssignmentRequest {
  topic: string;
  title: string;
  lessonId?: string;
  dueAt: string;
  questions: CreateQuestion[];
}

/** POST /lessons/:id/adaptations - persists an AI adaptation against a section. */
export interface CreateAdaptationRequest {
  sectionId: string;
  conceptId: string;
  mode: AdaptationMode;
  body: string;
}

// --- student EXPERIENCE ------------------------------------------------------

/** One assignment as the student sees it: the paper, plus their own status only. */
export interface StudentAssignment {
  assignment: Assignment;
  submitted: boolean;
  /** The student's own score, or null before they submit. Never anyone else's. */
  scorePct: number | null;
  /**
   * Names of the concepts (teaching order) this student answered wrong, computed
   * server-side from their own submission. Present once submitted; empty when
   * everything was right. Never leaks the answer key.
   */
  topicsToReview?: string[];
}

/** A lesson with the current student's saved-state, returned by GET /lessons/:id. */
export interface StudentLesson extends Lesson {
  /** Whether this student has bookmarked the lesson. */
  saved: boolean;
}

/** POST /assignments/:id/submissions - the server grades via buildSubmission. */
export interface SubmitAssignmentRequest {
  selections: Selections;
}

/** The graded result of a submission: score plus which topics to re-study. */
export interface SubmitAssignmentResponse {
  submitted: boolean;
  scorePct: number;
  /** Concept names (teaching order) answered wrong; no answer text ever leaves the server. */
  topicsToReview: string[];
}

/** POST /signals - a single learning signal emitted by the student app. */
export interface RecordSignalRequest {
  type: LearningSignalType;
  conceptId?: string;
  lessonId?: string;
  sectionId?: string;
  value?: number;
  note?: string;
}
