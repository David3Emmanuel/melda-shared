# melda-shared

The single source of truth shared by the three MELDA repos
([melda-backend](https://github.com/David3Emmanuel/melda-backend),
[melda-teacher](https://github.com/David3Emmanuel/melda-teacher), and
[melda-student](https://github.com/David3Emmanuel/melda-student)). Pure
TypeScript, no runtime dependencies.

## What lives here

- **`domain/models`** - the entity types (`Student`, `Concept`, `Lesson`,
  `Assignment`, `Submission`, `LearningSignal`, `Dataset`). The single data shape
  everything else is derived from.
- **`domain/insights/aggregate`** - pure aggregation over raw submissions and
  signals. This is what turns engineered records into "32% struggled with Ionic
  Bonding". Nothing is stored as a percentage; struggle is always recomputed.
- **`domain/experience`** - `buildSubmission` grades a student's raw selections
  into a submission plus the learning signals it emits; `assignmentProgress`
  tracks a review as it lands.
- **`ai/types`** - the `AIService` interface and its I/O DTOs. MELDA never asks
  the model for numbers; the AI only narrates and drafts prose.
- **`contract`** - the REST request/response DTOs the backend and both apps agree
  on (auth, class listing, the composite insights read, the create requests).
- **`data/seed`** - the deterministic demo dataset. The backend imports it to
  populate the database; the checks pin its derived numbers.

## Why the numbers are load-bearing

The aggregation and grading logic run identically in the backend (over a class
loaded from Postgres) and in these checks (over the seed). Two runnable checks
pin the behaviour:

```bash
pnpm check
```

- `check:insights` pins the headline: Ionic Bonding is the top struggle at
  exactly 32%, the full descending curve, and the signal taxonomy.
- `check:experience` proves the live loop: an ionic struggler acing a re-sit
  drops the class figure from 32% to 28%.

No test framework, no fixtures - each check is a `tsx`-run script with a handful
of local asserts.

## Consuming it

The package ships compiled JS + `.d.ts` via a `tsc` `prepare` step (React
Native / Metro does not transform TypeScript inside `node_modules`). Consumers
add it as a git dependency:

```json
"melda-shared": "github:David3Emmanuel/melda-shared#<tag>"
```

The backend imports the runtime logic and the seed; the two apps import types
only (erased at build).

## Build

```bash
pnpm install   # runs the tsc build via prepare
pnpm build     # or build explicitly -> dist/
```
