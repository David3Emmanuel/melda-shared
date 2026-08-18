// Deterministic seed for the MVP demo.
//
// No Date.now()/Math.random(): the dataset must be byte-identical on every run
// so the insight check is stable and the demo is reproducible. "Struggle" is
// never hard-coded as a percentage; it is engineered into the raw submissions
// and recomputed by src/domain/insights/aggregate.ts. Change a struggler set
// here and the headline number moves there, which is the point.

import type {
  Adaptation,
  Assignment,
  Concept,
  Dataset,
  Lesson,
  LearningSignal,
  LearningSignalType,
  Question,
  Student,
  Submission,
} from '../domain/models';

// --- deterministic clock -----------------------------------------------------
// A fixed Monday; everything is an offset from it. new Date(number) is pure.
const BASE = Date.parse('2026-05-04T08:00:00.000Z');
const iso = (dayOffset: number, hour = 8): string =>
  new Date(BASE + dayOffset * 864e5 + hour * 36e5).toISOString();

// --- students ----------------------------------------------------------------
const NAMES = [
  'Amara Okafor',
  'Kwame Mensah',
  'Zanele Dlamini',
  'Tunde Adeyemi',
  'Fatima Bello',
  'Chipo Moyo',
  'Kofi Asante',
  'Naledi Khumalo',
  'Emeka Nwosu',
  'Aisha Diallo',
  'Thabo Nkosi',
  'Ngozi Eze',
  'Sekou Traore',
  'Lerato Molefe',
  'Yusuf Abubakar',
  'Wanjiru Kamau',
  'Kwabena Osei',
  'Zola Mthembu',
  'Ibrahim Sow',
  'Ada Obi',
  'Tendai Chirwa',
  'Mariam Cisse',
  'Sipho Zulu',
  'Halima Yusuf',
  'Chidi Okeke',
];

const initials = (name: string): string =>
  name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase();

const students: Student[] = NAMES.map((name, i) => ({
  id: `s${i + 1}`,
  name,
  initials: initials(name),
}));

// --- concepts ----------------------------------------------------------------
// Orders 1..6 are assessed by the review assignment. Order 7 (Acids & Bases) is
// upcoming: it has a draft lesson but no submissions, exercising the
// "not yet assessed" path in insights.
const concepts: Concept[] = [
  {
    id: 'c-atomic',
    name: 'Atomic Structure',
    blurb: 'Protons, neutrons, electrons and the nucleus.',
    order: 1,
  },
  {
    id: 'c-periodic',
    name: 'The Periodic Table',
    blurb: 'Groups, periods and how elements are organised.',
    order: 2,
  },
  {
    id: 'c-ionic',
    name: 'Ionic Bonding',
    blurb: 'Transferring electrons to form charged ions.',
    order: 3,
  },
  {
    id: 'c-covalent',
    name: 'Covalent Bonding',
    blurb: 'Sharing electrons between atoms.',
    order: 4,
  },
  {
    id: 'c-reactions',
    name: 'Chemical Reactions',
    blurb: 'Reactants, products and conservation of mass.',
    order: 5,
  },
  {
    id: 'c-states',
    name: 'States of Matter',
    blurb: 'Solids, liquids, gases and the changes between them.',
    order: 6,
  },
  {
    id: 'c-acids',
    name: 'Acids and Bases',
    blurb: 'pH, neutralisation and everyday acids.',
    order: 7,
  },
];

/** The six concepts the assignment actually measures, in teaching order. */
const ASSESSED = concepts.filter((c) => c.order <= 6);

// --- which students struggle with which concept ------------------------------
// A rotation spreads strugglers across the class instead of the same few
// students failing everything. Counts are tuned so Ionic Bonding lands at
// exactly 8/25 = 32% - the demo headline - and the rest form a clean
// descending bar chart.
const STRUGGLE_TARGET: Record<string, number> = {
  'c-atomic': 3, // 12%
  'c-periodic': 2, // 8%
  'c-ionic': 8, // 32%  <- headline
  'c-covalent': 5, // 20%
  'c-reactions': 6, // 24%
  'c-states': 1, // 4%
};

const strugglerIndexSet = (conceptIndex: number, count: number): Set<number> => {
  const start = conceptIndex * 5;
  const set = new Set<number>();
  for (let j = 0; j < count; j++) set.add((start + j) % students.length);
  return set;
};

const strugglers: Record<string, Set<number>> = {};
ASSESSED.forEach((c, ci) => {
  strugglers[c.id] = strugglerIndexSet(ci, STRUGGLE_TARGET[c.id]);
});

const isStruggling = (studentIndex: number, conceptId: string): boolean =>
  strugglers[conceptId]?.has(studentIndex) ?? false;

// --- assignment questions (3 per assessed concept) ---------------------------
type QSpec = { prompt: string; choices: string[]; correct: number };
const QUESTIONS: Record<string, QSpec[]> = {
  'c-atomic': [
    {
      prompt: 'Which particle in an atom carries a negative charge?',
      choices: ['Proton', 'Neutron', 'Electron', 'Nucleus'],
      correct: 2,
    },
    {
      prompt: "Where is most of an atom's mass concentrated?",
      choices: ['Electron cloud', 'Nucleus', 'Outer shell', 'Chemical bonds'],
      correct: 1,
    },
    {
      prompt: 'What does the atomic number of an element tell you?',
      choices: ['Number of neutrons', 'Number of protons', 'Number of shells', 'Atomic mass'],
      correct: 1,
    },
  ],
  'c-periodic': [
    {
      prompt: 'Elements in the same group share the same number of...',
      choices: ['Neutrons', 'Valence electrons', 'Protons', 'Isotopes'],
      correct: 1,
    },
    {
      prompt: 'Moving left to right across a period, atomic number...',
      choices: ['Decreases', 'Stays the same', 'Increases', 'Doubles'],
      correct: 2,
    },
    {
      prompt: 'Which of these is a noble gas?',
      choices: ['Sodium', 'Chlorine', 'Argon', 'Iron'],
      correct: 2,
    },
  ],
  'c-ionic': [
    {
      prompt: 'An ionic bond forms when electrons are...',
      choices: [
        'Shared equally',
        'Transferred from one atom to another',
        'Destroyed',
        'Turned into protons',
      ],
      correct: 1,
    },
    {
      prompt: 'What does a sodium atom become after it bonds ionically?',
      choices: ['A negative anion', 'A positive cation', 'A neutral atom', 'An isotope'],
      correct: 1,
    },
    {
      prompt: 'Ionic compounds are held together mainly by...',
      choices: [
        'Van der Waals forces',
        'Attraction between opposite charges',
        'Shared electron pairs',
        'Metallic bonds',
      ],
      correct: 1,
    },
  ],
  'c-covalent': [
    {
      prompt: 'A covalent bond involves atoms that...',
      choices: ['Transfer electrons', 'Share electrons', 'Lose all electrons', 'Gain protons'],
      correct: 1,
    },
    {
      prompt: 'How many electrons are shared in a single covalent bond?',
      choices: ['1', '2', '4', '8'],
      correct: 1,
    },
    {
      prompt: 'Which molecule is held together by covalent bonds?',
      choices: ['NaCl', 'H2O', 'KBr', 'MgO'],
      correct: 1,
    },
  ],
  'c-reactions': [
    {
      prompt: 'In a balanced chemical equation, mass is...',
      choices: ['Created', 'Destroyed', 'Conserved', 'Ignored'],
      correct: 2,
    },
    {
      prompt: 'What is produced when an acid reacts with a base?',
      choices: ['A metal', 'Salt and water', 'A gas only', 'A pure element'],
      correct: 1,
    },
    {
      prompt: 'A reaction that releases heat is described as...',
      choices: ['Endothermic', 'Exothermic', 'Neutral', 'Catalytic'],
      correct: 1,
    },
  ],
  'c-states': [
    {
      prompt: 'Which state of matter has a fixed shape and volume?',
      choices: ['Gas', 'Liquid', 'Solid', 'Plasma'],
      correct: 2,
    },
    {
      prompt: 'Melting is the change from...',
      choices: ['Liquid to gas', 'Solid to liquid', 'Gas to liquid', 'Solid to gas'],
      correct: 1,
    },
    {
      prompt: 'In which state are particles most free to move?',
      choices: ['Solid', 'Liquid', 'Gas', 'They are equal'],
      correct: 2,
    },
  ],
};

const questions: Question[] = ASSESSED.flatMap((c) =>
  QUESTIONS[c.id].map((q, qi) => ({
    id: `${c.id}-q${qi + 1}`,
    conceptId: c.id,
    prompt: q.prompt,
    kind: 'mcq' as const,
    choices: q.choices,
    correctIndex: q.correct,
  })),
);

const assignment: Assignment = {
  id: 'a1',
  lessonId: 'lesson-ionic',
  title: 'Unit 1 Review: Bonding and Reactions',
  questions,
  dueAt: iso(9, 17),
};

// --- submissions -------------------------------------------------------------
// Struggling students answer only the first of a concept's three questions
// correctly (1/3 < 0.5 threshold -> struggling); everyone else gets all three
// (3/3). All 25 students submit, so every assessed concept has 25 attempts and
// the struggle percentage has a clean /25 denominator.
const submissions: Submission[] = students.map((student, si) => {
  const answers = questions.map((q) => {
    const qi = Number(q.id.split('-q')[1]) - 1; // 0..2 within the concept
    const correct = isStruggling(si, q.conceptId) ? qi === 0 : true;
    const choiceCount = q.choices?.length ?? 4;
    const selectedIndex = correct ? q.correctIndex! : (q.correctIndex! + 1) % choiceCount;
    return { questionId: q.id, conceptId: q.conceptId, correct, selectedIndex };
  });
  return {
    id: `sub-${student.id}`,
    assignmentId: assignment.id,
    studentId: student.id,
    submittedAt: iso(9, 9 + (si % 8)), // spread across the due day
    answers,
  };
});

// --- learning signals --------------------------------------------------------
// These enrich the drill-downs and give the class dashboard a full-taxonomy
// picture of "what MELDA sees". Struggle signals only attach to students who
// actually struggled, so their counts track the submission data.
const signals: LearningSignal[] = [];
let signalSeq = 0;
const sig = (s: Omit<LearningSignal, 'id'>): void => {
  signals.push({ id: `sig-${++signalSeq}`, ...s });
};

const STRUGGLE_KINDS: LearningSignalType[] = [
  'REQUEST_SIMPLER',
  'QUESTION_STRUGGLE',
  'CONCEPT_REVISIT',
  'REQUEST_ALTERNATIVE_EXPLANATION',
  'INCORRECT_PATTERN',
];

students.forEach((student, si) => {
  // One submission-timestamp signal per student.
  sig({
    studentId: student.id,
    type: 'SUBMISSION_TIMESTAMP',
    createdAt: iso(9, 9 + (si % 8)),
    note: 'Submitted the Unit 1 review',
  });

  ASSESSED.forEach((c) => {
    const struggling = isStruggling(si, c.id);
    const mastery = struggling ? 1 / 3 : 1;
    // Performance signal for every student/concept pair.
    sig({
      studentId: student.id,
      type: 'ASSIGNMENT_PERFORMANCE',
      conceptId: c.id,
      createdAt: iso(9, 12),
      value: mastery,
    });
    // Strugglers emit a QUESTION_STRUGGLE plus one rotating help signal.
    if (struggling) {
      sig({
        studentId: student.id,
        type: 'QUESTION_STRUGGLE',
        conceptId: c.id,
        lessonId: `lesson-${c.id.slice(2)}`,
        createdAt: iso(7, 10),
        note: `Got stuck on ${c.name.toLowerCase()}`,
      });
      const kind = STRUGGLE_KINDS[(si + c.order) % STRUGGLE_KINDS.length];
      if (kind !== 'QUESTION_STRUGGLE') {
        sig({
          studentId: student.id,
          type: kind,
          conceptId: c.id,
          lessonId: `lesson-${c.id.slice(2)}`,
          createdAt: iso(7, 11),
        });
      }
    }
  });
});

// Lesson engagement on the Ionic Bonding lesson (the one the teacher adapts).
const IONIC_SECTIONS = ['sec-ionic-1', 'sec-ionic-2', 'sec-ionic-3', 'sec-ionic-4'];
students.slice(0, 15).forEach((student, si) => {
  IONIC_SECTIONS.forEach((sectionId, k) => {
    sig({
      studentId: student.id,
      type: 'TIME_ON_SECTION',
      conceptId: 'c-ionic',
      lessonId: 'lesson-ionic',
      sectionId,
      createdAt: iso(7, 9),
      value: 60 + ((si + k) % 4) * 45, // 60..195 seconds
    });
  });
});
students.slice(0, 10).forEach((student) => {
  sig({
    studentId: student.id,
    type: 'RESOURCE_ENGAGEMENT',
    conceptId: 'c-ionic',
    lessonId: 'lesson-ionic',
    sectionId: 'sec-ionic-2',
    createdAt: iso(7, 10),
    note: 'Opened the salt-crystal diagram',
  });
});

// --- lessons -----------------------------------------------------------------
type SectionSpec = { title: string; kind: Lesson['sections'][number]['kind']; body: string };

const lessonFor = (
  concept: Concept,
  summary: string,
  status: Lesson['status'],
  sectionSpecs: SectionSpec[],
  adaptations: Adaptation[] = [],
): Lesson => {
  const key = concept.id.slice(2); // "ionic" from "c-ionic"
  return {
    id: `lesson-${key}`,
    title: concept.name,
    summary,
    conceptIds: [concept.id],
    status,
    createdAt: iso(1),
    adaptations,
    sections: sectionSpecs.map((s, i) => ({
      id: `sec-${key}-${i + 1}`,
      title: s.title,
      kind: s.kind,
      body: s.body,
      conceptId: concept.id,
    })),
  };
};

const byId = (id: string): Concept => concepts.find((c) => c.id === id)!;

// The Ionic Bonding lesson is the richest: four sections and one existing
// "simpler" adaptation so the adapt screen is populated on first open.
const ionicLesson = lessonFor(
  byId('c-ionic'),
  'How and why atoms give and take electrons to form ionic bonds.',
  'published',
  [
    {
      title: 'What is an ionic bond?',
      kind: 'explanation',
      body: 'When a metal meets a non-metal, one atom gives away electrons and the other takes them. The atom that loses electrons becomes a positive ion (cation); the atom that gains them becomes a negative ion (anion). Opposite charges attract, and that attraction is the ionic bond.',
    },
    {
      title: 'Example: sodium chloride (table salt)',
      kind: 'example',
      body: 'Sodium (Na) has one spare electron; chlorine (Cl) needs one. Sodium hands its electron to chlorine. Now Na+ and Cl- are locked together by their opposite charges. That is the salt on your food.',
    },
    {
      title: 'Activity: build an ionic compound',
      kind: 'activity',
      body: 'In pairs, use bottle caps as electrons. Give one student a magnesium atom (2 spare electrons) and two others oxygen and... share until every atom is stable. Draw the ions you formed and their charges.',
    },
    {
      title: 'Quick check: predict the ion',
      kind: 'check',
      body: 'Potassium (K) is in group 1. When it bonds ionically, what charge will its ion have, and why?',
    },
  ],
  [
    {
      id: 'adapt-ionic-1',
      sectionId: 'sec-ionic-1',
      conceptId: 'c-ionic',
      mode: 'simpler',
      body: 'Think of it like sharing sweets. One atom has an extra sweet it does not want; the other atom is hungry for one. The first gives it away and becomes "plus", the second takes it and becomes "minus". Plus and minus stick together. That sticking is the ionic bond.',
      createdAt: iso(8, 14),
    },
  ],
);

const simple = (
  concept: Concept,
  explanation: string,
  example: string,
  check: string,
): SectionSpec[] => [
  { title: `Understanding ${concept.name.toLowerCase()}`, kind: 'explanation', body: explanation },
  { title: 'Worked example', kind: 'example', body: example },
  { title: 'Quick check', kind: 'check', body: check },
];

const lessons: Lesson[] = [
  lessonFor(
    byId('c-atomic'),
    'The building blocks of every atom and where they sit.',
    'published',
    simple(
      byId('c-atomic'),
      'Every atom has a tiny dense nucleus of protons and neutrons, surrounded by electrons. Protons are positive, electrons are negative, neutrons are neutral.',
      'A carbon atom has 6 protons in its nucleus and 6 electrons around it, which is why its atomic number is 6.',
      'If an atom has 11 protons, what is its atomic number?',
    ),
  ),
  lessonFor(
    byId('c-periodic'),
    'How the elements are arranged and what the pattern tells us.',
    'published',
    simple(
      byId('c-periodic'),
      'The periodic table lines elements up by atomic number. Columns (groups) share chemical behaviour; rows (periods) show trends as atoms get bigger.',
      'All the elements in group 1 - lithium, sodium, potassium - react strongly with water, because they each have one valence electron to give away.',
      'Two elements are in the same group. What do they have in common?',
    ),
  ),
  ionicLesson,
  lessonFor(
    byId('c-covalent'),
    'What happens when atoms share electrons instead of giving them away.',
    'published',
    simple(
      byId('c-covalent'),
      'In a covalent bond neither atom gives up its electrons; they share a pair so both count as full. This is common between non-metals.',
      'In a water molecule (H2O), oxygen shares a pair of electrons with each hydrogen, holding the molecule together.',
      'Name one molecule held together by covalent bonds.',
    ),
  ),
  lessonFor(
    byId('c-reactions'),
    'Reactants, products, and why atoms are never lost.',
    'published',
    simple(
      byId('c-reactions'),
      'In a reaction, starting substances (reactants) rearrange into new ones (products). Atoms are only rearranged, never created or destroyed, so mass is conserved.',
      'When you burn methane, carbon and hydrogen atoms recombine with oxygen to make carbon dioxide and water. Count the atoms: they balance.',
      'Why must a chemical equation be balanced?',
    ),
  ),
  lessonFor(
    byId('c-states'),
    'Solids, liquids and gases, and the changes between them.',
    'published',
    simple(
      byId('c-states'),
      'In a solid, particles are locked in place. In a liquid they slide past each other. In a gas they fly apart freely. Adding heat moves matter up this ladder.',
      'Ice (solid) melts to water (liquid), then boils to steam (gas), all the same substance with more energy each time.',
      'What is the name for the change from a solid directly to a gas?',
    ),
  ),
  // Upcoming, not yet taught or assessed: exercises the draft badge and the
  // "no data yet" path in insights.
  lessonFor(
    byId('c-acids'),
    'A first look at acids, bases and neutralisation. Still a draft.',
    'draft',
    [
      {
        title: 'What makes something an acid?',
        kind: 'explanation',
        body: 'Acids taste sour and release hydrogen ions in water. Bases feel slippery and accept them. The pH scale measures how acidic or basic something is.',
      },
    ],
  ),
];

// --- dataset -----------------------------------------------------------------
export const dataset: Dataset = {
  classroom: {
    id: 'class-1',
    name: 'Grade 10 Chemistry',
    subject: 'Chemistry',
    studentIds: students.map((s) => s.id),
  },
  students,
  concepts,
  lessons,
  assignments: [assignment],
  submissions,
  signals,
};
