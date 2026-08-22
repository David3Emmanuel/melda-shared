import type { AdaptationMode, SectionKind } from '../domain/models';
export interface LessonDraftSection {
    title: string;
    kind: SectionKind;
    body: string;
}
export interface LessonDraft {
    title: string;
    summary: string;
    sections: LessonDraftSection[];
}
export interface DraftLessonInput {
    topic: string;
    gradeLevel?: string;
    notes?: string;
}
export interface QuizDraftQuestion {
    prompt: string;
    choices: string[];
    /** Index into `choices` of the right answer. */
    correctIndex: number;
}
export interface QuizDraft {
    title: string;
    questions: QuizDraftQuestion[];
}
export interface DraftQuizInput {
    topic: string;
    gradeLevel?: string;
    /** How many questions to draft (defaults to a handful). */
    count?: number;
}
export interface AdaptSectionInput {
    conceptName: string;
    sectionTitle: string;
    originalBody: string;
    mode: AdaptationMode;
    /** How many students struggled, passed through so the copy can reference it. */
    strugglePct?: number;
}
export interface AdaptationDraft {
    mode: AdaptationMode;
    body: string;
}
export interface NarrateInsightInput {
    className: string;
    studentCount: number;
    topConceptName: string;
    topStrugglePct: number;
    avgMasteryPct: number;
}
export interface AIService {
    /** Draft a fresh lesson from a topic (the AI-assisted "new lesson" flow). */
    draftLesson(input: DraftLessonInput): Promise<LessonDraft>;
    /** Draft a multiple-choice review from a topic (the AI-assisted "new review" flow). */
    draftQuiz(input: DraftQuizInput): Promise<QuizDraft>;
    /** Re-cast one section for students who did not get it the first time. */
    adaptSection(input: AdaptSectionInput): Promise<AdaptationDraft>;
    /** Turn the real, already-computed class numbers into a plain-language read-out. */
    narrateInsight(input: NarrateInsightInput): Promise<string>;
}
