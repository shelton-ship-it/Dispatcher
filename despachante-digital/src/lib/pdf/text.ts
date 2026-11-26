import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb, degrees } from 'pdf-lib';

export const A4 = { w: 595.28, h: 841.89 };

export type Fonts = { reg: PDFFont; bold: PDFFont; ital: PDFFont; boldItal: PDFFont };

export async function loadFonts(doc: PDFDocument, family: 'times' | 'helvetica' | 'courier' = 'times'): Promise<Fonts> {
  const F = StandardFonts;
  const map = {
    times: [F.TimesRoman, F.TimesRomanBold, F.TimesRomanItalic, F.TimesRomanBoldItalic],
    helvetica: [F.Helvetica, F.HelveticaBold, F.HelveticaOblique, F.HelveticaBoldOblique],
    courier: [F.Courier, F.CourierBold, F.CourierOblique, F.CourierBoldOblique],
  }[family];
  const [reg, bold, ital, boldItal] = await Promise.all(map.map(n => doc.embedFont(n)));
  return { reg, bold, ital, boldItal };
}

const charsetCache = new WeakMap<PDFFont, Set<number>>();
function charset(font: PDFFont) {
  let s = charsetCache.get(font);
  if (!s) { s = new Set(font.getCharacterSet()); charsetCache.set(font, s); }
  return s;
}
const REPL: Record<string, string> = { '\u2018': "'", '\u2019': "'", '\u201C': '"', '\u201D': '"', '\u2026': '...', '\u00A0': ' ', '\u2022': '\u2022', '\t': '    ', '\u2212': '-', '\u2192': '->', '\u200B': '' };
/** Remove/substitui caracteres que a fonte padrão do PDF não suporta (evita erros ao gerar). */
export function safe(font: PDFFont, input: string) {
  const cs = charset(font);
  let out = '';
  for (const ch of String(input ?? '').replace(/\r/g, '')) {
    const r = REPL[ch] ?? ch;
    for (const c of r) {
      const cp = c.codePointAt(0)!;
      if (c === '\n' || cs.has(cp)) out += c;
      else {
        const base = c.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (base && base !== c && [...base].every(b => cs.has(b.codePointAt(0)!))) out += base; else out += '';
      }
    }
  }
  return out;
}

export type Run = { t: string; b?: boolean; i?: boolean; u?: boolean };
type Seg = { text: string; font: PDFFont; u?: boolean };
type Word = { segs: Seg[]; w: number };

function pickFont(f: Fonts, r: Run) { return r.b && r.i ? f.boldItal : r.b ? f.bold : r.i ? f.ital : f.reg; }

function toWords(runs: Run[], f: Fonts, size: number): Word[] {
  const words: Word[] = []; let cur: Word | null = null;
  for (const run of runs) {
    const font = pickFont(f, run);
    for (const part of run.t.split(/(\s+)/)) {
      if (part === '') continue;
      if (/^\s+$/.test(part)) { if (cur) { words.push(cur); cur = null; } continue; }
      const text = safe(font, part);
      if (!text) continue;
      if (!cur) cur = { segs: [], w: 0 };
      cur.segs.push({ text, font, u: run.u });
      cur.w += font.widthOfTextAtSize(text, size);
    }
  }
  if (cur) words.push(cur);
  return words;
}

// quebra palavras maiores que a linha (ex.: e-mails muito longos)
function splitLong(words: Word[], width: number, size: number): Word[] {
  const out: Word[] = [];
  for (const w of words) {
    if (w.w <= width) { out.push(w); continue; }
    const seg = w.segs[0];
    let buf = '';
    for (const ch of w.segs.map(s => s.text).join('')) {
      if (seg.font.widthOfTextAtSize(buf + ch, size) > width) { out.push({ segs: [{ text: buf, font: seg.font }], w: seg.font.widthOfTextAtSize(buf, size) }); buf = ch; } else buf += ch;
    }
    if (buf) out.push({ segs: [{ text: buf, font: seg.font }], w: seg.font.widthOfTextAtSize(buf, size) });
  }
  return out;
}

export type Line = { words: Word[]; last: boolean };
export function layoutRuns(runs: Run[], f: Fonts, size: number, width: number, firstIndent = 0): Line[] {
  const paras: Run[][] = [[]];
  for (const r of runs) {
    const parts = r.t.split('\n');
    parts.forEach((p, i) => { if (i > 0) paras.push([]); if (p) paras[paras.length - 1].push({ ...r, t: p }); });
  }
  const lines: Line[] = [];
  const space = f.reg.widthOfTextAtSize(' ', size);
  paras.forEach((para, pi) => {
    const words = splitLong(toWords(para, f, size), width, size);
    if (!words.length) { if (pi > 0 || paras.length > 1) lines.push({ words: [], last: true }); return; }
    let line: Word[] = []; let lw = 0; let first = true;
    for (const w of words) {
      const avail = width - (first && pi === 0 ? firstIndent : 0);
      const need = line.length ? lw + space + w.w : w.w;
      if (need > avail && line.length) { lines.push({ words: line, last: false }); first = false; line = [w]; lw = w.w; }
      else { line.push(w); lw = need; }
    }
    if (line.length) lines.push({ words: line, last: true });
  });
  return lines;
}

export function drawLine(page: PDFPage, line: Line, f: Fonts, x: number, y: number, width: number, size: number, opts: { justify?: boolean; align?: 'left' | 'center' | 'right'; color?: any; indent?: number }) {
  const space = f.reg.widthOfTextAtSize(' ', size);
  const n = line.words.length;
  const sum = line.words.reduce((s, w) => s + w.w, 0);
  const natural = sum + space * Math.max(0, n - 1);
  const indent = opts.indent || 0;
  let gap = space; let cx = x + indent;
  const avail = width - indent;
  if (opts.justify && !line.last && n > 1) gap = (avail - sum) / (n - 1);
  else if (opts.align === 'center') cx = x + (width - natural) / 2;
  else if (opts.align === 'right') cx = x + width - natural;
  const color = opts.color ?? rgb(0, 0, 0);
  for (const w of line.words) {
    let sx = cx;
    for (const s of w.segs) {
      page.drawText(s.text, { x: sx, y, size, font: s.font, color });
      const sw = s.font.widthOfTextAtSize(s.text, size);
      if (s.u) page.drawLine({ start: { x: sx, y: y - 1.6 }, end: { x: sx + sw, y: y - 1.6 }, thickness: 0.6, color });
      sx += sw;
    }
    cx += w.w + gap;
  }
}

/** Cursor de fluxo vertical com quebra automática de página. */
export class Flow {
  page: PDFPage; y: number; pages: PDFPage[] = [];
  constructor(public doc: PDFDocument, public f: Fonts, public m = { l: 62, r: 56, t: 62, b: 72 }) {
    this.page = doc.addPage([A4.w, A4.h]); this.pages.push(this.page); this.y = A4.h - m.t;
  }
  get width() { return A4.w - this.m.l - this.m.r; }
  newPage() { this.page = this.doc.addPage([A4.w, A4.h]); this.pages.push(this.page); this.y = A4.h - this.m.t; }
  ensure(h: number) { if (this.y - h < this.m.b) this.newPage(); }
  space(h: number) { this.y -= h; }
  para(runs: Run[], o: { size?: number; lead?: number; justify?: boolean; align?: 'left' | 'center' | 'right'; x?: number; width?: number; indent?: number; after?: number; color?: any } = {}) {
    const size = o.size ?? 12; const lead = o.lead ?? size * 1.75;
    const x = o.x ?? this.m.l; const width = o.width ?? this.width;
    const lines = layoutRuns(runs, this.f, size, width, o.indent ?? 0);
    lines.forEach((ln, i) => {
      this.ensure(lead);
      if (ln.words.length) drawLine(this.page, ln, this.f, x, this.y - size, width, size, { justify: o.justify, align: o.align, color: o.color, indent: i === 0 ? o.indent : 0 });
      this.y -= lead;
    });
    this.y -= o.after ?? 0;
  }
  rule(w: number, o: { align?: 'left' | 'center' | 'right'; x?: number; thick?: number; gapAfter?: number } = {}) {
    const x0 = o.x ?? this.m.l; const wid = o.x !== undefined ? w : this.width;
    const sx = o.align === 'center' ? x0 + (wid - w) / 2 : o.align === 'right' ? x0 + wid - w : x0;
    this.page.drawLine({ start: { x: sx, y: this.y }, end: { x: sx + w, y: this.y }, thickness: o.thick ?? 0.7, color: rgb(0, 0, 0) });
    this.y -= o.gapAfter ?? 6;
  }
}

export function addPageNumbers(doc: PDFDocument, f: Fonts, label = 'Pag.') {
  const pages = doc.getPages(); const n = pages.length;
  pages.forEach((p, i) => {
    const t = `${label} ${i + 1}/${n}`;
    const w = f.reg.widthOfTextAtSize(t, 9);
    p.drawText(t, { x: A4.w - 56 - w, y: 56, size: 9, font: f.reg, color: rgb(0, 0, 0) });
  });
}

export async function marcaDagua(doc: PDFDocument, texto = 'PRÉ-VISUALIZAÇÃO', sub = 'Paga para descarregar sem marca') {
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  for (const p of doc.getPages()) {
    const { width, height } = p.getSize();
    const size = Math.min(58, width / 9);
    const tw = font.widthOfTextAtSize(safe(font, texto), size);
    const ang = 38; const rad = (ang * Math.PI) / 180;
    p.drawText(safe(font, texto), { x: width / 2 - (tw / 2) * Math.cos(rad), y: height / 2 - (tw / 2) * Math.sin(rad), size, font, color: rgb(0.78, 0.1, 0.1), opacity: 0.16, rotate: degrees(ang) });
    const s2 = size * 0.32; const w2 = font.widthOfTextAtSize(safe(font, sub), s2);
    p.drawText(safe(font, sub), { x: width / 2 - (w2 / 2) * Math.cos(rad) + 18, y: height / 2 - (w2 / 2) * Math.sin(rad) - 26, size: s2, font, color: rgb(0.78, 0.1, 0.1), opacity: 0.2, rotate: degrees(ang) });
  }
}
