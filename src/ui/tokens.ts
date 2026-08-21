// Design tokens for the whole app. One place to change the look.
//
// Colour decisions follow the dataviz method: the struggle chart is a single
// series, so every struggle bar uses ONE constant colour (magnitude is read
// from bar length, not hue) rather than a cycled categorical ramp. Status
// colours are reserved and always ship next to a text label, never colour
// alone. Ink colours clear WCAG AA on white for body text.

export const color = {
  // surfaces
  appBg: '#F4F5F7',
  card: '#FFFFFF',
  cardAlt: '#FBFBFC',
  border: '#E4E7EC',
  track: '#EDEFF3', // empty bar track

  // ink (all AA on white; inkMuted also clears AA on the appBg it sits on)
  ink: '#17203A',
  inkSecondary: '#48546B',
  inkMuted: '#5B6472',
  inkInverse: '#FFFFFF',

  // brand
  accent: '#4F46E5',
  accentSoft: '#EEF0FE',
  accentInk: '#3730A3',

  // status (paired with labels in the UI)
  struggle: '#DC2626',
  struggleSoft: '#FEE2E2',
  struggleInk: '#B91C1C',
  ok: '#15803D',
  okSoft: '#DCFCE7',
  okInk: '#166534',
  warn: '#B45309',
  warnSoft: '#FEF3C7',
  warnInk: '#92400E',
  neutralSoft: '#EEF1F4',
} as const;

/** 4pt spacing grid. */
export const sp = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, huge: 44 } as const;

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const font = {
  display: 32,
  h1: 24,
  h2: 19,
  h3: 16,
  body: 15,
  small: 13,
  tiny: 11,
} as const;

export const weight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export type Tone = 'struggle' | 'warn' | 'ok' | 'accent' | 'neutral';

/** Background/foreground pair for a soft badge or tile of a given tone. */
export const toneStyle = (tone: Tone): { bg: string; fg: string } => {
  switch (tone) {
    case 'struggle':
      return { bg: color.struggleSoft, fg: color.struggleInk };
    case 'warn':
      return { bg: color.warnSoft, fg: color.warnInk };
    case 'ok':
      return { bg: color.okSoft, fg: color.okInk };
    case 'accent':
      return { bg: color.accentSoft, fg: color.accentInk };
    case 'neutral':
      return { bg: color.neutralSoft, fg: color.inkSecondary };
  }
};

/** Base (vivid) fill colour for a bar/mark of a given tone. */
export const toneFill = (tone: Tone): string => {
  switch (tone) {
    case 'struggle':
      return color.struggle;
    case 'warn':
      return color.warn;
    case 'ok':
      return color.ok;
    case 'accent':
      return color.accent;
    case 'neutral':
      return color.inkMuted;
  }
};

/** Map a concept struggle % to a tone + short word for badges. */
export const struggleTone = (pct: number): { tone: Tone; label: string } => {
  if (pct >= 25) return { tone: 'struggle', label: 'High' };
  if (pct >= 12) return { tone: 'warn', label: 'Watch' };
  return { tone: 'ok', label: 'Low' };
};

/** Below 50% mastery is "struggling" - the same threshold the aggregation uses. */
export const masteryTone = (pct: number | null): { tone: Tone; label: string } => {
  if (pct === null) return { tone: 'neutral', label: 'No data' };
  if (pct < 50) return { tone: 'struggle', label: 'Struggling' };
  if (pct < 75) return { tone: 'warn', label: 'Getting there' };
  return { tone: 'ok', label: 'On track' };
};

/** Human-friendly label for a raw signal type. */
export const signalLabel: Record<string, string> = {
  QUESTION_STRUGGLE: 'Got stuck on a question',
  CONCEPT_REVISIT: 'Revisited a concept',
  REQUEST_SIMPLER: 'Asked for a simpler explanation',
  REQUEST_ALTERNATIVE_EXPLANATION: 'Asked for another explanation',
  ACTIVITY_PERFORMANCE: 'Activity result',
  ASSIGNMENT_PERFORMANCE: 'Assignment result',
  INCORRECT_PATTERN: 'Repeated mistake pattern',
  TIME_ON_SECTION: 'Time spent on a section',
  RESOURCE_ENGAGEMENT: 'Opened a resource',
  SUBMISSION_TIMESTAMP: 'Submitted work',
};

/** Short label for each adaptation mode (used on chips and adaptation cards). */
export const adaptationLabel: Record<string, string> = {
  simpler: 'Simpler',
  detailed: 'More detail',
  example: 'Worked example',
  visual: 'Visual',
  practice: 'Practice',
  reexplain: 'Re-explained',
};

/**
 * Human due-date for a review, at day granularity (a classroom deadline is a
 * date, not a time-of-day). `now` is injectable so the label is testable without
 * a real clock. `tone` drives the text colour (warn when due within a day),
 * `closed` is true once the due day has passed.
 * Day buckets only, no "in 3 hours" - upgrade path is
 * Intl.RelativeTimeFormat if finer buckets are ever needed.
 */
export const dueLabel = (
  dueAt: string,
  now: number = Date.now(),
): { text: string; tone: Tone; closed: boolean } => {
  const t = Date.parse(dueAt);
  if (Number.isNaN(t)) return { text: '', tone: 'neutral', closed: false };
  const startOfDay = (ms: number) => {
    const d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  // Round, not floor: DST makes some days 23/25h, so the raw ms gap between two
  // local midnights isn't always an exact multiple of a 24h day.
  const days = Math.round((startOfDay(t) - startOfDay(now)) / 86_400_000);
  if (days < 0) {
    const n = -days;
    return {
      text: n === 1 ? 'Closed yesterday' : `Closed ${n} days ago`,
      tone: 'neutral',
      closed: true,
    };
  }
  if (days === 0) return { text: 'Due today', tone: 'warn', closed: false };
  if (days === 1) return { text: 'Due tomorrow', tone: 'warn', closed: false };
  return { text: `Due in ${days} days`, tone: 'neutral', closed: false };
};

/**
 * Parse a user-typed integer and clamp it into [min, max], falling back to
 * `fallback` when the text is not a number. The small numeric form inputs
 * (question count, days a review stays open) run through this so a stray or
 * empty keystroke never sends a NaN or a wild value to the backend.
 */
export const clampInt = (text: string, min: number, max: number, fallback: number): number => {
  const n = parseInt(text, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};
