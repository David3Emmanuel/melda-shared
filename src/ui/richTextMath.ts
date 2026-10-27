// LaTeX -> SVG via MathJax, DOM-free (liteAdaptor). Pure of react/native imports
// so the runnable check converts the exact same code the app renders through.
//
// Two details that shipped broken before, both now covered by the check:
//   1. Listing a package in `packages` does nothing unless its configuration
//      module has been imported (it self-registers). Without the imports below,
//      \begin{pmatrix} renders as an error box while simpler math still works.
//   2. MathJax emits width/height in `ex` units, which react-native-svg cannot
//      parse - so the raw string renders at zero/NaN size. We strip those
//      attributes and hand SvgXml explicit pixel dimensions derived from the
//      viewBox, scaled so 1ex ~ half the body font size.

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

export interface MathImage {
  /** SVG markup with the unparseable `ex` size attributes removed. */
  svg: string;
  width: number;
  height: number;
}

// A number followed by a unit, e.g. "11.893ex" / "2.185ex" / "120".
function lengthPx(value: string | undefined, fontPx: number): number | null {
  if (!value) return null;
  const m = value.trim().match(/^(-?[\d.]+)\s*(ex|em|px|pt)?$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  switch (m[2]) {
    case 'ex':
      return n * fontPx * 0.5;
    case 'em':
      return n * fontPx;
    case 'pt':
      return (n * fontPx) / 12;
    default:
      return n;
  }
}

/** viewBox="minX minY w h" -> {w,h} in user units, or null. */
function viewBoxSize(svgTag: string): { w: number; h: number } | null {
  const m = svgTag.match(/viewBox="([^"]+)"/);
  if (!m) return null;
  const parts = m[1].trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  return { w: parts[2], h: parts[3] };
}

/**
 * LaTeX -> { svg, width, height } sized in px for the given body font size.
 * Null for empty input; unknown commands render visibly rather than throwing.
 *
 * `ink` replaces MathJax's `currentColor`: react-native-svg does not reliably
 * resolve it, and an unresolved fill paints nothing (invisible math).
 */
export function texToImage(
  src: string,
  display: boolean,
  fontPx = 15,
  ink = '#17203A',
): MathImage | null {
  if (!src.trim()) return null;
  let outer: string;
  try {
    const node = doc().convert(src.trim(), { display });
    outer = mathAdaptor!.outerHTML(node);
  } catch {
    return null;
  }

  const match = outer.match(/<svg\b[^>]*>[\s\S]*<\/svg>/);
  if (!match) return null;
  const raw = match[0];
  const openTag = raw.slice(0, raw.indexOf('>') + 1);

  const declaredW = lengthPx(openTag.match(/\bwidth="([^"]*)"/)?.[1], fontPx);
  const declaredH = lengthPx(openTag.match(/\bheight="([^"]*)"/)?.[1], fontPx);
  const vb = viewBoxSize(openTag);

  // Prefer the viewBox (exact aspect), falling back to the declared size.
  let width = declaredW ?? vb?.w ?? 0;
  let height = declaredH ?? vb?.h ?? 0;
  if (vb && vb.w > 0 && vb.h > 0) {
    if (!width) width = vb.w;
    if (!height) height = (width / vb.w) * vb.h;
  }
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  // Cap very wide display math so it fits the content column.
  const MAX_W = 320;
  if (width > MAX_W) {
    height = (height * MAX_W) / width;
    width = MAX_W;
  }

  // Strip the ex/em sizes (and the inline style) that RN-SVG cannot parse; the
  // viewBox is kept so the drawing scales to the explicit width/height props.
  const cleanedOpenTag = openTag
    .replace(/\s(?:width|height|style)="[^"]*"/g, '')
    .replace(/\srole="[^"]*"/g, '')
    .replace(/\sfocusable="[^"]*"/g, '');
  const cleaned = (cleanedOpenTag + raw.slice(openTag.length)).replace(
    /currentColor/g,
    ink,
  );

  return { svg: cleaned, width: Math.round(width), height: Math.round(height) };
}
