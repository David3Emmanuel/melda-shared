// A rich-text renderer for AI-authored lesson prose: Markdown (headings, bold,
// bullet lists, blank-line paragraphs) plus LaTeX math. Math is rendered
// server-style to SVG by MathJax's liteAdaptor (no DOM, no WebView), and the
// inner <svg> is drawn by react-native-svg's SvgXml - so the exact same output
// works on web (react-native-web) and native Android.
//
// Two things this file learned the hard way, both covered by
// richTextParse.check.ts and a real-TeX conversion check:
//   1. Models emit BOTH $...$ and MathJax-style \(...\)/\[...\] delimiters, so the
//      parser accepts all four spellings (see richTextParse.ts).
//   2. Listing 'ams' in the TeX packages array is not enough on its own: each
//      package's configuration module must be imported so it registers itself,
//      or \begin{pmatrix} silently renders as an error box.
//
// Deliberately a SMALL static renderer rather than a full CommonMark engine.

import { useMemo } from 'react';
import { View, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { color, sp, weight } from './tokens';
import { Txt } from './components';
import { parseBlocks, type Inline } from './richTextParse';
import { texToImage } from './richTextMath';

function MathSvg({ tex, display }: { tex: string; display: boolean }) {
  const img = useMemo(() => texToImage(tex, display, 15, color.ink), [tex, display]);
  if (!img) {
    // Last-resort: show the source so a broken formula is readable, never blank.
    return (
      <Txt variant="body" c={color.ink}>
        {tex}
      </Txt>
    );
  }
  return (
    <SvgXml
      xml={img.svg}
      width={img.width}
      height={img.height}
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

// A paragraph that contains inline math must flow word-by-word: React Native
// cannot wrap text around a non-text child, so one big <Txt> would push the math
// onto its own line. Splitting into word runs lets the wrap row lay math inline.
// Math-free paragraphs keep the cheaper whole-run rendering.
function renderRuns(runs: Inline[]) {
  const hasMath = runs.some((r) => r.kind === 'math');
  if (!hasMath) {
    return runs.map((run, k) => <InlineRun key={k} run={run} />);
  }
  const words: Inline[] = [];
  for (const r of runs) {
    if (r.kind !== 'text') {
      words.push(r);
      continue;
    }
    // Keep the separators so spacing between words survives.
    for (const piece of r.value.split(/(\s+)/)) {
      if (!piece) continue;
      words.push({ kind: 'text', value: piece });
    }
  }
  return words.map((run, k) => <InlineRun key={k} run={run} />);
}

/** Render one Markdown + LaTeX source string as rich text. */
export function RichText(props: { children: string; style?: ViewStyle }) {
  const { children: src, style } = props;
  const blocks = useMemo(() => parseBlocks(src ?? ''), [src]);

  return (
    <View style={[{ gap: sp.md }, style]}>
      {blocks.map((b, i) => {
        if (b.kind === 'math') return <MathSvg key={i} tex={b.tex} display />;

        if (b.kind === 'heading') {
          return (
            <Txt key={i} variant="h3" style={{ marginTop: sp.xs }}>
              {b.text}
            </Txt>
          );
        }

        if (b.kind === 'list') {
          return (
            <View key={i} style={{ gap: sp.xs }}>
              {b.items.map((runs, j) => (
                <View key={j} style={{ flexDirection: 'row', gap: sp.sm }}>
                  <Txt variant="body" c={color.inkMuted}>
                    {'\u2022'}
                  </Txt>
                  <View
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                    }}
                  >
                    {renderRuns(runs)}
                  </View>
                </View>
              ))}
            </View>
          );
        }

        return (
          <View
            key={i}
            style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}
          >
            {renderRuns(b.runs)}
          </View>
        );
      })}
    </View>
  );
}
