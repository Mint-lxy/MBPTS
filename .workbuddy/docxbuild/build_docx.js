const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
        Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
        WidthType, ShadingType, PageNumber, PageBreak, TableOfContents } = require('docx');

const mdPath = process.argv[2];
const outPath = process.argv[3];
const imgDir = process.argv[4]; // dir containing mermaid_N.png
const mdDir = path.dirname(mdPath);
const md = fs.readFileSync(mdPath, 'utf8');
const lines = md.split(/\r?\n/);

const FONT = 'Microsoft YaHei';
const CONTENT_W = 9026; // A4 portrait, 1" margins

function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50) {
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  }
  return { w: 800, h: 500 };
}

function imgRun(file, maxW = 600) {
  const { w, h } = pngSize(file);
  const scale = Math.min(1, maxW / w);
  return new ImageRun({
    type: 'png',
    data: fs.readFileSync(file),
    transformation: { width: Math.round(w * scale), height: Math.round(h * scale) },
    altText: { title: path.basename(file), description: path.basename(file), name: path.basename(file) }
  });
}

// inline parser: **bold**, `code`, [text](url) -> text
function parseInline(text, baseSize, extra) {
  const runs = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]*\]\([^)]*\))/g;
  let last = 0, m;
  const push = (t, opt) => { if (t) runs.push(new TextRun({ text: t, font: FONT, size: baseSize, ...opt, ...(extra || {}) })); };
  while ((m = re.exec(text)) !== null) {
    push(text.slice(last, m.index), {});
    const tok = m[1];
    if (tok.startsWith('**')) push(tok.slice(2, -2), { bold: true });
    else if (tok.startsWith('`')) push(tok.slice(1, -1), { font: 'Consolas' });
    else push(tok.replace(/\[([^\]]*)\]\([^)]*\)/, '$1'), { color: '2E75B6' });
    last = m.index + tok.length;
  }
  push(text.slice(last), {});
  return runs.length ? runs : [new TextRun({ text: '', font: FONT, size: baseSize, ...(extra || {}) })];
}

const border = { style: BorderStyle.SINGLE, size: 1, color: 'BFBFBF' };
const borders = { top: border, bottom: border, left: border, right: border };

function makeTable(tblLines) {
  const rows = tblLines.map(l => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim()));
  const nCols = Math.max(...rows.map(r => r.length));
  const fontSize = nCols >= 8 ? 14 : nCols >= 6 ? 15 : 16;
  const colW = Math.floor(CONTENT_W / nCols);
  const columnWidths = Array(nCols).fill(colW);
  columnWidths[nCols - 1] = CONTENT_W - colW * (nCols - 1);
  const bodyRows = rows.filter((r, i) => !(i === 1 && /^[:\-\s|]+$/.test(r.join(''))));
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths,
    rows: bodyRows.map((r, ri) => new TableRow({
      tableHeader: ri === 0,
      children: Array.from({ length: nCols }, (_, ci) => new TableCell({
        borders,
        width: { size: columnWidths[ci], type: WidthType.DXA },
        shading: ri === 0 ? { fill: 'D5E8F0', type: ShadingType.CLEAR } : undefined,
        margins: { top: 40, bottom: 40, left: 80, right: 80 },
        children: [new Paragraph({ children: parseInline(r[ci] || '', fontSize, ri === 0 ? { bold: true } : undefined) })]
      }))
    }))
  });
}

const children = [];
let i = 0, mermaidIdx = 0, numRef = 0;
const numRefs = [];

while (i < lines.length) {
  const line = lines[i];

  // fenced code
  if (/^```/.test(line)) {
    const lang = line.slice(3).trim();
    const buf = [];
    i++;
    while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
    i++;
    if (lang === 'mermaid') {
      mermaidIdx++;
      const png = path.join(imgDir, `mermaid_${mermaidIdx}.png`);
      if (fs.existsSync(png)) {
        children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 120 }, children: [imgRun(png, 620)] }));
      }
    } else {
      for (const cl of buf) {
        children.push(new Paragraph({
          shading: { fill: 'F2F2F2', type: ShadingType.CLEAR },
          children: [new TextRun({ text: cl || ' ', font: 'Consolas', size: 16 })]
        }));
      }
    }
    continue;
  }

  // table
  if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[\s:\-|]+\|\s*$/.test(lines[i + 1])) {
    const tbl = [];
    while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { tbl.push(lines[i]); i++; }
    children.push(makeTable(tbl));
    children.push(new Paragraph({ children: [new TextRun({ text: '', size: 8 })] }));
    continue;
  }

  // heading
  const h = line.match(/^(#{1,4})\s+(.*)$/);
  if (h) {
    const lvl = h[1].length;
    const text = h[2].replace(/\*\*/g, '');
    const heading = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4][lvl - 1];
    children.push(new Paragraph({ heading, pageBreakBefore: lvl === 1 && children.length > 2, children: [new TextRun({ text, font: FONT, bold: true })] }));
    i++; continue;
  }

  // hr
  if (/^---+\s*$/.test(line)) { i++; continue; }

  // image
  const im = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
  if (im) {
    const p = path.resolve(mdDir, im[2]);
    if (fs.existsSync(p)) {
      children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 }, children: [imgRun(p, 560)] }));
      if (im[1]) children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: im[1], font: FONT, size: 16, color: '808080' })] }));
    }
    i++; continue;
  }

  // blockquote
  if (/^>\s?/.test(line)) {
    children.push(new Paragraph({
      indent: { left: 360 },
      children: parseInline(line.replace(/^>\s?/, ''), 18, { italics: true, color: '595959' })
    }));
    i++; continue;
  }

  // bullet list
  if (/^\s*-\s+/.test(line)) {
    children.push(new Paragraph({
      numbering: { reference: 'bullets', level: 0 },
      children: parseInline(line.replace(/^\s*-\s+/, ''), 20)
    }));
    i++; continue;
  }

  // numbered list
  if (/^\s*\d+\.\s+/.test(line)) {
    numRef++;
    const ref = `nums${numRef}`;
    numRefs.push(ref);
    const items = [];
    while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+\.\s+/, '')); i++; }
    for (const it of items) {
      children.push(new Paragraph({ numbering: { reference: ref, level: 0 }, children: parseInline(it, 20) }));
    }
    continue;
  }

  // blank
  if (/^\s*$/.test(line)) { i++; continue; }

  // normal paragraph
  children.push(new Paragraph({ spacing: { after: 80 }, children: parseInline(line, 20) }));
  i++;
}

const numbering = {
  config: [
    { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 480, hanging: 240 } } } }] },
    ...numRefs.map(ref => ({ reference: ref, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 480, hanging: 240 } } } }] }))
  ]
};

const doc = new Document({
  creator: 'BA',
  title: 'UC34 Case2 MBUSI PRD 修订版',
  styles: {
    default: { document: { run: { font: FONT, size: 20 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 30, bold: true, font: FONT, color: '1F4E79' }, paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, font: FONT, color: '1F4E79' }, paragraph: { spacing: { before: 220, after: 120 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 23, bold: true, font: FONT, color: '2E75B6' }, paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 2 } },
      { id: 'Heading4', name: 'Heading 4', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 21, bold: true, font: FONT, color: '404040' }, paragraph: { spacing: { before: 140, after: 80 }, outlineLevel: 3 } },
    ]
  },
  numbering,
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: 'MBPTS UC34 Case 2 · MBUSI 线 PRD(修订版)v1.2.0', font: FONT, size: 14, color: '808080' })]
      })] })
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: '第 ', font: FONT, size: 14, color: '808080' }),
                   new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 14, color: '808080' }),
                   new TextRun({ text: ' 页', font: FONT, size: 14, color: '808080' })]
      })] })
    },
    children
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log('DOCX written:', outPath, buf.length, 'bytes');
  console.log('mermaid images embedded:', mermaidIdx, '| tables/lists built, numbered lists:', numRef);
});
