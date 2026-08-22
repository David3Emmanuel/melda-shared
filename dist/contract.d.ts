import type { AdaptationMode, Assignment, Lesson, LearningSignalType, SectionKind, Subject } from './domain/models';
import type { ClassSummary, ConceptInsight, StudentNeed } from './domain/insights/aggregate';
import type { Selections } from './domain/experience';
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
/** One class the signed-in user belongs to. GET /me/classes returns a list of these. */
export interface ClassCard {
    id: string;
    name: string;
    subject: Subject;
    studentCount: number;
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
export interface CreateLessonSection {
    title: string;
    kind: SectionKind;
    body: string;
}
/** POST /classes/:id/lessons. The server resolves `topic` to a real Concept. */
export interface CreateLessonRequest {
    topic: string;
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
