import type { Concept, Dataset, LearningSignal, LearningSignalType, Student } from '../models';
/** Below this fraction of correct answers on a concept, a student is struggling. */
export declare const STRUGGLE_THRESHOLD = 0.5;
export interface ConceptInsight {
    conceptId: string;
    name: string;
    order: number;
    /** Students who answered at least one question on this concept. */
    attempted: number;
    strugglers: number;
    strugglePct: number;
    avgMasteryPct: number;
}
export interface SignalCount {
    type: LearningSignalType;
    count: number;
}
export interface ClassSummary {
    className: string;
    studentCount: number;
    submissionCount: number;
    submissionRatePct: number;
    assessedConceptCount: number;
    topStruggle: ConceptInsight | null;
    signalCounts: SignalCount[];
    totalSignals: number;
}
export interface ConceptDetail {
    concept: Concept;
    insight: ConceptInsight;
    strugglingStudents: Student[];
    signalCounts: SignalCount[];
}
export interface StudentConceptMastery {
    conceptId: string;
    name: string;
    masteryPct: number | null;
    struggling: boolean;
}
export interface StudentDetail {
    student: Student;
    overallMasteryPct: number | null;
    perConcept: StudentConceptMastery[];
    signals: LearningSignal[];
    strugglingConceptNames: string[];
}
/** Fraction of a student's answers on one concept that were correct, or null if none. */
export declare function masteryFor(dataset: Dataset, studentId: string, conceptId: string): number | null;
/** Per-concept struggle, sorted most-painful first. Concepts with no submissions are omitted. */
export declare function conceptInsights(dataset: Dataset): ConceptInsight[];
export declare function signalCounts(signals: LearningSignal[]): SignalCount[];
export declare function classSummary(dataset: Dataset): ClassSummary;
export declare function conceptDetail(dataset: Dataset, conceptId: string): ConceptDetail | null;
export declare function studentDetail(dataset: Dataset, studentId: string): StudentDetail | null;
export interface StudentNeed {
    student: Student;
    struggleCount: number;
    overallMasteryPct: number | null;
    strugglingConceptNames: string[];
}
export declare function studentsByNeed(dataset: Dataset): StudentNeed[];
