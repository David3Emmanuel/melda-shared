"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
