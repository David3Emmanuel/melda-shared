// A rich-text renderer for AI-authored lesson prose: Markdown (headings, bold,
// bullet lists, blank-line paragraphs) plus LaTeX math. Math is rendered
// server-style to SVG by MathJax's liteAdaptor (no DOM, no WebView), and the
// inner <svg> is drawn by react-native-svg's SvgXml - so the exact same output
// works on web (react-native-web) and native Android.
//
// Deliberately a SMALL, static renderer rather than a full CommonMark engine: the
// AI is instructed to emit only **bold**, "- " bullets, "##" headings, and
// $...$/$$...$$ math, so a ~60-line tokeniser is more robust than pulling a heavy
// parser. The TeX package list is the static subset (no require/autoload, which
// depend on MathJax's webpacked loader that Metro never loads); school-level math
// (fractions, roots, greek, bolding, physics) is covered.

import { useMemo } from 'react';
import { View, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';
import { color, sp, weight } from './tokens';
import { Txt } from './components';

const TEX_PACKAGES = [
  'base',
  'ams',
  'newcommand',
  'noundefined',
  'boldsymbol',
  'physics',
  'mathtools',
  'color',
];

// One MathJax document for the process, built lazily on first math render.
let mathDoc: ReturnType<typeof mathjax.document> | null = null;
let mathAdaptor: ReturnType<typeof liteAdaptor> | null = null;
function doc() {
  if (mathDoc) return mathDoc;
  const adaptor = liteAdaptor();
  RegisterHTMLHandler(adaptor);
  const tex = new TeX({ packages: TEX_PACKAGES });
  const svg = new SVG({ fontCache: 'none' });
  mathAdaptor = adaptor;
  mathDoc = mathjax.document('', { InputJax: tex, OutputJax: svg });
  return mathDoc;
}

/** LaTeX -> inner <svg> string; null when the source is empty or unparseable. */
function texToSvg(src: string, display: boolean): string | null {
  if (!src.trim()) return null;
  try {
    const node = doc().convert(src.trim(), { display });
    const outer = mathAdaptor!.outerHTML(node);
    const m = outer.match(/<svg[\s\S]*<\/svg>/);
    return m ? m[0] : null;
  } catch {
    return null; // unparseable TeX -> render the raw $...$ text below
  }
}

type Inline = { kind: 'text' | 'bold' | 'math'; value: string; display?: boolean };

// Split one line's inline content into text / bold / inline-math runs.
// $...$ is inline math; **...** is bold. Runs are processed left-to-right and
// never nested (the AI is told not to nest them).
function tokenizeInline(line: string): Inline[] {
  const out: Inline[] = [];
  const re = /\$([^$\n]+)\$|\*\*([^*\n]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push({ kind: 'text', value: line.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ kind: 'math', value: m[1], display: false });
    else out.push({ kind: 'bold', value: m[2] });
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push({ kind: 'text', value: line.slice(last) });
  return out;
}

function MathSvg({ tex, display }: { tex: string; display: boolean }) {
  const svg = useMemo(() => texToSvg(tex, display), [tex, display]);
  if (!svg) {
    return (
      <Txt variant={display ? 'body' : 'body'} c={color.ink}>
        {display ? `$$${tex}$$` : `$${tex}$`}
      </Txt>
    );
  }
  return (
    <SvgXml
      xml={svg}
      width="100%"
      style={display ? { alignSelf: 'center', marginVertical: sp.sm } : undefined}
    />
  );
}

function InlineRun({ run }: { run: Inline }) {
  if (run.kind === 'math') return <MathSvg tex={run.value} display={false} />;
  if (run.kind === 'bold') {
    return (
      <Txt variant="body" w={weight.bold} c={color.ink}>
        {run.value}
      </Txt>
    );
  }
  return (
    <Txt variant="body" c={color.inkSecondary}>
      {run.value}
    </Txt>
  );
}

/** Render one Markdown + LaTeX source string as rich text. */
export function RichText(props: { children: string; style?: ViewStyle }) {
  const { children: src, style } = props;

  // Split into blocks on blank lines; $$...$$ display math may span one block.
  const blocks = src.split(/\n\s*\n/);

  return (
    <View style={[{ gap: sp.md }, style]}>
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Display math block: a line of exactly $$...$$.
        const disp = trimmed.match(/^\$\$([\s\S]+?)\$\$$/);
        if (disp) {
          return <MathSvg key={i} tex={disp[1]} display />;
        }

        // Heading.
        const heading = trimmed.match(/^#{2,3}\s+(.+)$/);
        if (heading) {
          return (
            <Txt key={i} variant="h3" style={{ marginTop: sp.xs }}>
              {heading[1]}
            </Txt>
          );
        }

        // Bullet list block (consecutive "- " lines).
        if (trimmed.split('\n').every((l) => /^\s*-\s+/.test(l))) {
          return (
            <View key={i} style={{ gap: sp.xs }}>
              {trimmed.split('\n').map((li, j) => (
                <View key={j} style={{ flexDirection: 'row', gap: sp.sm }}>
                  <Txt variant="body" c={color.inkMuted}>
                    {'\u2022'}
                  </Txt>
                  <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 0 }}>
                    {tokenizeInline(li.replace(/^\s*-\s+/, '')).map((run, k) => (
                      <InlineRun key={k} run={run} />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          );
        }

        // Plain paragraph with inline runs.
        return (
          <View key={i} style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {tokenizeInline(trimmed).map((run, k) => (
              <InlineRun key={k} run={run} />
            ))}
          </View>
        );
      })}
    </View>
  );
}
