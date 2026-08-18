// Domain model for MELDA's teacher-first MVP.
//
// One subject (Chemistry), one classroom, a handful of concepts and lessons,
// one review assignment, and the raw learning records the UNDERSTAND layer
// aggregates. Everything downstream (seed, insights, screens) imports these
// types, so this file is the single source of truth for the data shape.

export type ID = string;

export type Subject = 'Chemistry';

export interface Student {
  id: ID;
  name: string;
  initials: string;
}

export interface Concept {
  id: ID;
  name: string;
  blurb: string;
  /** Teaching sequence within the unit (1-based). */
  order: number;
}

export type SectionKind = 'explanation' | 'example' | 'activity' | 'check';

export interface LessonSection {
  id: ID;
  title: string;
  kind: SectionKind;
  body: string;
  /** Primary concept this section teaches. */
  conceptId: ID;
}

export type LessonStatus = 'draft' | 'published';

/**
 * A teacher-authored adaptation of a section, produced by the AI service when
 * a concept is not landing. Attached to the lesson it came from.
 */
export type AdaptationMode =
  'simpler' | 'detailed' | 'example' | 'visual' | 'practice' | 'reexplain';

export interface Adaptation {
  id: ID;
  sectionId: ID;
  conceptId: ID;
  mode: AdaptationMode;
  body: string;
  createdAt: string;
}

export interface Lesson {
  id: ID;
  title: string;
  summary: string;
  conceptIds: ID[];
  sections: LessonSection[];
  status: LessonStatus;
  createdAt: string;
  adaptations: Adaptation[];
}

export type QuestionKind = 'mcq' | 'short';

export interface Question {
  id: ID;
  conceptId: ID;
  prompt: string;
  kind: QuestionKind;
  choices?: string[];
  /** Index into `choices` for mcq questions. */
  correctIndex?: number;
}

export interface Assignment {
  id: ID;
  /** The lesson this reviews, when authored from one. Standalone quizzes omit it. */
  lessonId?: ID;
  title: string;
  questions: Question[];
  dueAt: string;
}

export interface Answer {
  questionId: ID;
  /** Denormalised from the question so aggregation never re-joins. */
  conceptId: ID;
  correct: boolean;
  selectedIndex?: number;
}

export interface Submission {
  id: ID;
  assignmentId: ID;
  studentId: ID;
  submittedAt: string;
  answers: Answer[];
}

/**
 * The signal taxonomy the EXPERIENCE layer would emit as students learn. In the
 * MVP these are seeded, but the shape is what a real student app would POST.
 */
export type LearningSignalType =
  | 'QUESTION_STRUGGLE'
  | 'CONCEPT_REVISIT'
  | 'REQUEST_SIMPLER'
  | 'REQUEST_ALTERNATIVE_EXPLANATION'
  | 'ACTIVITY_PERFORMANCE'
  | 'ASSIGNMENT_PERFORMANCE'
  | 'INCORRECT_PATTERN'
  | 'TIME_ON_SECTION'
  | 'RESOURCE_ENGAGEMENT'
  | 'SUBMISSION_TIMESTAMP';

export interface LearningSignal {
  id: ID;
  studentId: ID;
  type: LearningSignalType;
  conceptId?: ID;
  lessonId?: ID;
  sectionId?: ID;
  createdAt: string;
  /** Seconds for TIME_ON_SECTION, a 0..1 score for *_PERFORMANCE, etc. */
  value?: number;
  note?: string;
}

export interface ClassRoom {
  id: ID;
  name: string;
  subject: Subject;
  studentIds: ID[];
}

/** Everything the app is seeded with, in one immutable container. */
export interface Dataset {
  classroom: ClassRoom;
  students: Student[];
  concepts: Concept[];
  lessons: Lesson[];
  assignments: Assignment[];
  submissions: Submission[];
  signals: LearningSignal[];
}
