// Pure Markdown + LaTeX parsing for RichText. Kept free of react/native imports
// so it can be unit-checked in Node (richTextParse.check.ts) without a renderer -
// delimiter handling is exactly where the first cut broke, so it is the part that
// must be provable rather than eyeballed.
//
// Accepted math delimiters, all four spellings:
//   inline:  $...$      and  \(...\)
//   display: $$...$$    and  \[...\]
// Models emit the MathJax-style \(...\)/\[...\] as readily as $...$, so the
// parser accepts both rather than betting on one convention.

export type Inline =
  | { kind: 'text'; value: string }
  | { kind: 'bold'; value: string }
  | { kind: 'math'; value: string; display: boolean };

export type Block =
  | { kind: 'math'; tex: string; display: true }
  | { kind: 'heading'; text: string }
  | { kind: 'list'; items: Inline[][] }
  | { kind: 'paragraph'; runs: Inline[] };

// Inline math: $...$ or \(...\); bold: **...**. Order matters only when two could
// start at the same index, and they cannot (different lead characters).
const INLINE_RE = /\$([^$\n]+)\$|\\\(([\s\S]+?)\\\)|\*\*([^*\n]+)\*\*/g;

/** Split one line of text into text / bold / inline-math runs. */
export function tokenizeInline(line: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  INLINE_RE.lastIndex = 0;
  while ((m = INLINE_RE.exec(line))) {
    if (m.index > last) out.push({ kind: 'text', value: line.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ kind: 'math', value: m[1], display: false });
    else if (m[2] !== undefined) out.push({ kind: 'math', value: m[2], display: false });
    else out.push({ kind: 'bold', value: m[3] });
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push({ kind: 'text', value: line.slice(last) });
  return out;
}

// Display math may appear anywhere in the source (its own paragraph, or nested in
// a run of single-spaced lines), so split the source on it first, then classify
// the text between the displays. $$...$$ and \[...\] are both accepted.
const DISPLAY_SPLIT_RE = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]/g;

/** Split a Markdown+LaTeX source string into renderable blocks. */
export function parseBlocks(src: string): Block[] {
  const out: Block[] = [];

  const emitText = (text: string): void => {
    for (const raw of text.split(/\n\s*\n/)) {
      const b = raw.trim();
      if (!b) continue;

      const heading = b.match(/^#{1,3}\s+(.+)$/);
      if (heading) {
        out.push({ kind: 'heading', text: heading[1].trim() });
        continue;
      }

      const lines = b.split('\n');
      if (lines.every((l) => /^\s*-\s+/.test(l))) {
        out.push({
          kind: 'list',
          items: lines.map((l) => tokenizeInline(l.replace(/^\s*-\s+/, ''))),
        });
        continue;
      }

      out.push({ kind: 'paragraph', runs: tokenizeInline(b) });
    }
  };

  DISPLAY_SPLIT_RE.lastIndex = 0;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = DISPLAY_SPLIT_RE.exec(src))) {
    emitText(src.slice(last, m.index));
    const tex = (m[1] ?? m[2] ?? '').trim();
    if (tex) out.push({ kind: 'math', tex, display: true });
    last = m.index + m[0].length;
  }
  emitText(src.slice(last));

  return out;
}
