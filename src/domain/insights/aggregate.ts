// The UNDERSTAND layer's brain: pure aggregation over the raw submissions and
// signals. Nothing here is memoised or cached - the dataset is tiny (25
// students) so every screen just recomputes. "Struggle" is derived here, not
// stored: a student struggles with a concept when their mastery on it falls
// below STRUGGLE_THRESHOLD. The seed engineers the raw records; this file is
// what turns them into "32% struggled with ionic bonding".

import type { Concept, Dataset, LearningSignal, LearningSignalType, Student } from '../models';

/** Below this fraction of correct answers on a concept, a student is struggling. */
export const STRUGGLE_THRESHOLD = 0.5;

const pct = (fraction: number): number => Math.round(fraction * 100);

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
export function masteryFor(dataset: Dataset, studentId: string, conceptId: string): number | null {
  let correct = 0;
  let total = 0;
  for (const sub of dataset.submissions) {
    if (sub.studentId !== studentId) continue;
    for (const a of sub.answers) {
      if (a.conceptId !== conceptId) continue;
      total++;
      if (a.correct) correct++;
    }
  }
  return total === 0 ? null : correct / total;
}

/** Concept ids that at least one submission actually answered. */
function assessedConceptIds(dataset: Dataset): Set<string> {
  const ids = new Set<string>();
  for (const sub of dataset.submissions) {
    for (const a of sub.answers) ids.add(a.conceptId);
  }
  return ids;
}

/** Per-concept struggle, sorted most-painful first. Concepts with no submissions are omitted. */
export function conceptInsights(dataset: Dataset): ConceptInsight[] {
  const assessed = assessedConceptIds(dataset);
  const out: ConceptInsight[] = [];
  for (const c of dataset.concepts) {
    if (!assessed.has(c.id)) continue;
    let attempted = 0;
    let strugglers = 0;
    let masterySum = 0;
    for (const s of dataset.students) {
      const m = masteryFor(dataset, s.id, c.id);
      if (m === null) continue;
      attempted++;
      masterySum += m;
      if (m < STRUGGLE_THRESHOLD) strugglers++;
    }
    out.push({
      conceptId: c.id,
      name: c.name,
      order: c.order,
      attempted,
      strugglers,
      strugglePct: attempted ? pct(strugglers / attempted) : 0,
      avgMasteryPct: attempted ? pct(masterySum / attempted) : 0,
    });
  }
  return out.sort((a, b) => b.strugglePct - a.strugglePct || a.order - b.order);
}

export function signalCounts(signals: LearningSignal[]): SignalCount[] {
  const map = new Map<LearningSignalType, number>();
  for (const s of signals) map.set(s.type, (map.get(s.type) ?? 0) + 1);
  return [...map.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

export function classSummary(dataset: Dataset): ClassSummary {
  const insights = conceptInsights(dataset);
  const studentCount = dataset.students.length;
  const submissionCount = new Set(dataset.submissions.map((s) => s.studentId)).size;
  return {
    className: dataset.classroom.name,
    studentCount,
    submissionCount,
    submissionRatePct: studentCount ? pct(submissionCount / studentCount) : 0,
    assessedConceptCount: insights.length,
    topStruggle: insights[0] ?? null,
    signalCounts: signalCounts(dataset.signals),
    totalSignals: dataset.signals.length,
  };
}

export function conceptDetail(dataset: Dataset, conceptId: string): ConceptDetail | null {
  const concept = dataset.concepts.find((c) => c.id === conceptId);
  if (!concept) return null;
  const insight =
    conceptInsights(dataset).find((i) => i.conceptId === conceptId) ??
    ({
      conceptId,
      name: concept.name,
      order: concept.order,
      attempted: 0,
      strugglers: 0,
      strugglePct: 0,
      avgMasteryPct: 0,
    } satisfies ConceptInsight);
  const strugglingStudents = dataset.students.filter((s) => {
    const m = masteryFor(dataset, s.id, conceptId);
    return m !== null && m < STRUGGLE_THRESHOLD;
  });
  const conceptSignals = dataset.signals.filter((s) => s.conceptId === conceptId);
  return { concept, insight, strugglingStudents, signalCounts: signalCounts(conceptSignals) };
}

export function studentDetail(dataset: Dataset, studentId: string): StudentDetail | null {
  const student = dataset.students.find((s) => s.id === studentId);
  if (!student) return null;
  const assessed = assessedConceptIds(dataset);
  const perConcept: StudentConceptMastery[] = [];
  let sum = 0;
  let n = 0;
  for (const c of dataset.concepts) {
    if (!assessed.has(c.id)) continue;
    const m = masteryFor(dataset, studentId, c.id);
    perConcept.push({
      conceptId: c.id,
      name: c.name,
      masteryPct: m === null ? null : pct(m),
      struggling: m !== null && m < STRUGGLE_THRESHOLD,
    });
    if (m !== null) {
      sum += m;
      n++;
    }
  }
  return {
    student,
    overallMasteryPct: n ? pct(sum / n) : null,
    perConcept,
    signals: dataset.signals.filter((s) => s.studentId === studentId),
    strugglingConceptNames: perConcept.filter((p) => p.struggling).map((p) => p.name),
  };
}

export interface StudentNeed {
  student: Student;
  struggleCount: number;
  overallMasteryPct: number | null;
  strugglingConceptNames: string[];
}

// Students ranked by how much they need attention: most struggling concepts
// first, then lowest overall mastery. Drives the dashboard's follow-up list.
export function studentsByNeed(dataset: Dataset): StudentNeed[] {
  return dataset.students
    .map((s) => {
      const d = studentDetail(dataset, s.id)!;
      return {
        student: s,
        struggleCount: d.strugglingConceptNames.length,
        overallMasteryPct: d.overallMasteryPct,
        strugglingConceptNames: d.strugglingConceptNames,
      };
    })
    .sort(
      (a, b) =>
        b.struggleCount - a.struggleCount ||
        (a.overallMasteryPct ?? 100) - (b.overallMasteryPct ?? 100),
    );
}
