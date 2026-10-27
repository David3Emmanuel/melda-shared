// Runnable check for the RichText parser. Guards the delimiter handling that
// broke in the first cut: the AI emitted MathJax-style \(...\) and \[...\] while
// the parser only knew $...$/$$...$$, so math rendered as literal source. These
// assertions use the exact spellings seen in a real generated lesson.
//
// Run with `pnpm check:richtext` (tsx). No framework - assert + throw.

import { parseBlocks, tokenizeInline } from './richTextParse';
import { svgIsError, texToImage } from './richTextMath';

let passed = 0;
function ok(cond: boolean, msg: string): void {
  if (!cond) throw new Error('FAIL: ' + msg);
  passed++;
  console.log('  ok -', msg);
}

console.log('richTextParse');

// --- inline math, both delimiter spellings -----------------------------------
{
  const dollar = tokenizeInline('the value is $x^2$ here');
  const math = dollar.filter((r) => r.kind === 'math');
  ok(math.length === 1 && math[0].value === 'x^2', '$...$ is parsed as inline math');
  ok(
    dollar.some((r) => r.kind === 'text' && r.value.includes('the value is')),
    'surrounding text survives around $...$',
  );
}

{
  // The real regression: the generator emitted \( ... \) for inline math.
  const paren = tokenizeInline('Suppose \\(A=\\begin{pmatrix}2&1\\\\0&3\\end{pmatrix}\\) and more');
  const math = paren.filter((r) => r.kind === 'math');
  ok(math.length === 1, 'a \\(...\\) run is recognised as inline math');
  ok(math[0].value.includes('pmatrix'), 'the full TeX body is captured, braces included');
  ok(
    paren.some((r) => r.kind === 'text' && r.value.includes('Suppose')),
    'text before a \\(...\\) run is preserved',
  );
  ok(
    paren.some((r) => r.kind === 'text' && r.value.includes('and more')),
    'text after a \\(...\\) run is preserved',
  );
}

// --- bold still works and does not swallow math ------------------------------
{
  const runs = tokenizeInline('take the **dot product** of $A$ and $B$');
  ok(
    runs.some((r) => r.kind === 'bold' && r.value === 'dot product'),
    '**bold** is still parsed',
  );
  ok(runs.filter((r) => r.kind === 'math').length === 2, 'both $A$ and $B$ are math');
}

// --- display math, both spellings, including a spanning block ---------------
{
  const blocks = parseBlocks(
    'Some text\n\\[\nAB=\\begin{pmatrix}4&8\\\\6&0\\end{pmatrix}\n\\]\nAfter text',
  );
  const disp = blocks.filter((b) => b.kind === 'math');
  ok(disp.length === 1, 'a \\[...\\] block is parsed as display math');
  ok(disp[0].kind === 'math' && disp[0].display === true, 'the display block is flagged display');
  ok(disp[0].kind === 'math' && disp[0].tex.includes('pmatrix'), 'the pmatrix TeX is captured');
  ok(
    blocks.some((b) => b.kind === 'paragraph' && JSON.stringify(b).includes('Some text')),
    'text before the display block is kept',
  );
  ok(
    blocks.some((b) => b.kind === 'paragraph' && JSON.stringify(b).includes('After text')),
    'text after the display block is kept',
  );
}

{
  const blocks = parseBlocks('$$a^2 + b^2 = c^2$$');
  ok(
    blocks.length === 1 && blocks[0].kind === 'math' && blocks[0].tex === 'a^2 + b^2 = c^2',
    '$$...$$ is parsed as display math',
  );
}

// --- structure: headings, lists, paragraphs ---------------------------------
{
  const blocks = parseBlocks('## Example:\n\n- first **bold** item\n- second item');
  ok(
    blocks.some((b) => b.kind === 'heading' && b.text === 'Example:'),
    '## heading is parsed',
  );
  const list = blocks.find((b) => b.kind === 'list');
  ok(!!list && list.kind === 'list' && list.items.length === 2, 'a bullet list keeps both items');
  ok(
    !!list &&
      list.kind === 'list' &&
      list.items[0].some((r) => r.kind === 'bold' && r.value === 'bold'),
    'bold inside a list item is parsed',
  );
}

// --- plain prose passes through unchanged -----------------------------------
{
  const blocks = parseBlocks('Just a normal sentence with no formatting.');
  ok(
    blocks.length === 1 &&
      blocks[0].kind === 'paragraph' &&
      blocks[0].runs[0].kind === 'text' &&
      blocks[0].runs[0].value.includes('Just a normal sentence'),
    'plain prose renders as text',
  );
}

// --- real TeX -> SVG (the layer that actually renders) ----------------------
// These strings are from a generated "Matrices" lesson that shipped broken:
// pmatrix failed because its TeX package config was never imported.
{
  const cases: [string, string, boolean][] = [
    ['pmatrix A', 'A=\\begin{pmatrix}2&1\\\\0&3\\end{pmatrix}', false],
    ['pmatrix B', 'B=\\begin{pmatrix}1&4\\\\2&0\\end{pmatrix}', false],
    ['dot product', '2\\cdot 1+1\\cdot 2=4', false],
    ['display AB', 'AB=\\begin{pmatrix}4&8\\\\6&0\\end{pmatrix}', true],
    ['quadratic', 'a^2+b^2=c^2', true],
    ['fraction', '\\frac{1}{2}', false],
    ['sqrt', '\\sqrt{x^2+y^2}', false],
    ['cases', '\\begin{cases}1 & x>0\\\\0 & x\\le 0\\end{cases}', false],
    ['greek', 'A = \\pi r^2', false],
  ];
  for (const [label, src, display] of cases) {
    const img = texToImage(src, display);
    ok(img !== null, `${label} converts to an image`);
    if (!img) continue;
    ok(!svgIsError(img.svg), `${label} converts without a MathJax error`);
    ok(/<(path|rect|line|use|g)\b/.test(img.svg), `${label} SVG carries drawn geometry`);
    ok(img.width > 0 && img.height > 0, `${label} has positive px dimensions`);
    ok(Number.isInteger(img.width) && Number.isInteger(img.height), `${label} dimensions are integers`);
    // The bug that would render math invisible: RN-SVG cannot parse `ex` units.
    ok(!/\bwidth="[^"]*ex"/.test(img.svg), `${label} SVG drops the unparseable ex width`);
    ok(!/\bheight="[^"]*ex"/.test(img.svg), `${label} SVG drops the unparseable ex height`);
    ok(/viewBox="/.test(img.svg), `${label} SVG keeps its viewBox so it scales`);
    ok(img.width <= 320, `${label} width is capped to the content column`);
    // Unresolved currentColor paints nothing in react-native-svg -> invisible math.
    ok(!/currentColor/.test(img.svg), `${label} SVG has no unresolved currentColor`);
  }
  ok(texToImage('', false) === null, 'empty TeX yields null (falls back, never blank)');
}

console.log(`\nAll ${passed} assertions passed.`);