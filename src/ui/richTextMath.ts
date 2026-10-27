// LaTeX -> SVG via MathJax, DOM-free (liteAdaptor). Pure of react/native imports
// so the runnable check converts the exact same code the app renders through.
//
// Critical detail: listing a package name in `packages` does nothing unless that
// package's configuration module has been imported (it self-registers). Omitting
// these imports makes \begin{pmatrix} render as an error box while simpler
// expressions still work - which is how it first shipped broken.

import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';

import 'mathjax-full/js/input/tex/ams/AmsConfiguration.js';
import 'mathjax-full/js/input/tex/newcommand/NewcommandConfiguration.js';
import 'mathjax-full/js/input/tex/noundefined/NoUndefinedConfiguration.js';

/** TeX packages enabled for lesson math: matrices, cases, roots, greek, bold. */
export const TEX_PACKAGES = ['base', 'ams', 'newcommand', 'noundefined'];

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

/** True when the produced SVG carries a MathJax error marker. */
export function svgIsError(svg: string): boolean {
  return /data-mjx-error|merror/i.test(svg);
}

/**
 * LaTeX -> inner <svg> string (the piece react-native-svg's SvgXml accepts).
 * Null for empty input; unknown commands render visibly rather than throwing.
 */
export function texToSvg(src: string, display: boolean): string | null {
  if (!src.trim()) return null;
  try {
    const node = doc().convert(src.trim(), { display });
    const outer = mathAdaptor!.outerHTML(node);
    const m = outer.match(/<svg[\s\S]*<\/svg>/);
    return m ? m[0] : null;
  } catch {
    return null;
  }
}
