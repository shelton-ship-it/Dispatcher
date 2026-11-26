import { PDFDocument, PDFImage, PDFPage, rgb, degrees, RGB } from 'pdf-lib';
import { A4, Fonts, loadFonts, safe, layoutRuns, drawLine, Run } from './text';
import type { CvStyle, SectionKey } from '../cvstyles';
import type { Candidatura, CvData, Pessoal, Vaga } from '../types';
import { dataExtenso } from '../dates';
import { formatTel } from '../mz';

export type CvInput = {
  p: Pessoal; cv: CvData; vaga: Vaga; cand: Candidatura; style: CvStyle;
  fotoQuadrada?: Uint8Array | null; fotoCirculo?: Uint8Array | null;
};

type Th = { ink: RGB; accent: RGB; muted: RGB; rule: RGB; paper: RGB; soft: RGB };
type Block = { h: number; keep?: boolean; draw: (pg: PDFPage, x: number, y: number) => void };
type Col = { x: number; w: number; dark?: boolean; blocks: Block[]; first: number; next: number; bottom: number };
const hex = (h: string): RGB => { const n = parseInt(h.slice(1), 16); return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); };
const WHITE = rgb(1, 1, 1); const LIGHT = rgb(0.88, 0.89, 0.92); const LIGHT2 = rgb(0.74, 0.76, 0.82);

type K = { doc: PDFDocument; f: Fonts; th: Th; s: number; body: number; lead: number; gap: number; inp: CvInput; photo: PDFImage | null };

const LABEL: Record<string, string> = { profile: 'Perfil', experience: 'Experiência profissional', education: 'Formação académica', skills: 'Competências', languages: 'Idiomas', contact: 'Contactos', projects: 'Projectos', target: 'Candidatura' };

// ───────── blocos básicos ─────────
function textBlock(k: K, runs: Run[], size: number, w: number, o: { color?: RGB; lead?: number; before?: number; after?: number; align?: 'left' | 'center' | 'right'; keep?: boolean } = {}): Block {
  const lines = layoutRuns(runs, k.f, size, w);
  const lead = o.lead ?? size * 1.32; const before = o.before ?? 0; const after = o.after ?? 0;
  return {
    h: before + lines.length * lead + after, keep: o.keep,
    draw: (pg, x, y) => lines.forEach((ln, i) => { if (ln.words.length) drawLine(pg, ln, k.f, x, y - before - i * lead - size, w, size, { color: o.color, align: o.align }); }),
  };
}
function heading(k: K, label: string, w: number, dark: boolean, plain = false): Block {
  const size = 8.6 * k.s;
  return {
    h: 24 * k.s, keep: true,
    draw: (pg, x, y) => {
      pg.drawText(safe(k.f.bold, label.toUpperCase()), { x, y: y - size - 2, size, font: k.f.bold, color: dark ? WHITE : k.th.accent });
      if (!plain) pg.drawLine({ start: { x, y: y - size - 7 }, end: { x: x + w, y: y - size - 7 }, thickness: 0.7, color: dark ? rgb(0.42, 0.44, 0.5) : k.th.rule });
    },
  };
}
function itemBlock(k: K, w: number, dark: boolean, title: string, sub: string, period: string, desc: string): Block {
  const ts = 10.2 * k.s; const ss = 8.8 * k.s; const ds = k.body * k.s;
  const perW = period ? k.f.ital.widthOfTextAtSize(safe(k.f.ital, period), 8 * k.s) : 0;
  const tW = period ? Math.max(60, w - perW - 10) : w;
  const tl = layoutRuns([{ t: title, b: true }], k.f, ts, tW);
  const sl = sub ? layoutRuns([{ t: sub }], k.f, ss, w) : [];
  const dl = desc ? layoutRuns([{ t: desc }], k.f, ds, w) : [];
  const tLead = ts * 1.25; const sLead = ss * 1.3; const dLead = k.lead * k.s;
  const h = tl.length * tLead + sl.length * sLead + (dl.length ? 2 + dl.length * dLead : 0) + k.gap * k.s;
  return {
    h,
    draw: (pg, x, y) => {
      let cy = y;
      tl.forEach(ln => { drawLine(pg, ln, k.f, x, cy - ts, tW, ts, { color: dark ? WHITE : k.th.ink }); cy -= tLead; });
      if (period) pg.drawText(safe(k.f.ital, period), { x: x + w - perW, y: y - ts, size: 8 * k.s, font: k.f.ital, color: dark ? LIGHT2 : k.th.muted });
      sl.forEach(ln => { drawLine(pg, ln, k.f, x, cy - ss, w, ss, { color: k.th.accent }); cy -= sLead; });
      if (dl.length) { cy -= 2; dl.forEach(ln => { drawLine(pg, ln, k.f, x, cy - ds, w, ds, { color: dark ? LIGHT : k.th.muted }); cy -= dLead; }); }
    },
  };
}
const periodo = (a: string, b: string) => (a || b ? `${a || ''}${a && b ? ' — ' : ''}${b || ''}` : '');

function alvoBlock(k: K, w: number): Block | null {
  const { vaga, cand } = k.inp;
  const linhas: [string, string][] = [];
  if (vaga.tipo === 'concurso') linhas.push(['Concurso', vaga.nomeConcurso || vaga.titulo]);
  else { linhas.push(['Vaga', vaga.titulo]); if (vaga.entidade) linhas.push(['Entidade', vaga.entidade]); }
  vaga.campos.forEach(c => { const v = cand.campos[c.id]?.trim(); if (v) linhas.push([c.label, v]); });
  const ls = linhas.filter(l => l[1]);
  if (!ls.length) return null;
  const size = 9 * k.s; const lead = size * 1.4; const pad = 7;
  const laid = ls.map(([a, b]) => layoutRuns([{ t: `${a}: `, b: true }, { t: b }], k.f, size, w - pad * 2 - 4));
  const textH = laid.reduce((s, l) => s + l.length * lead, 0);
  const h = textH + pad * 2 + 22 * k.s;
  return {
    h,
    draw: (pg, x, y) => {
      const boxTop = y - 12 * k.s;
      pg.drawRectangle({ x, y: boxTop - textH - pad * 2, width: w, height: textH + pad * 2, color: k.th.soft });
      pg.drawRectangle({ x, y: boxTop - textH - pad * 2, width: 3, height: textH + pad * 2, color: k.th.accent });
      pg.drawText('CANDIDATURA', { x, y: y - 8 * k.s, size: 7.4 * k.s, font: k.f.bold, color: k.th.accent });
      let cy = boxTop - pad;
      laid.forEach(l => l.forEach(ln => { drawLine(pg, ln, k.f, x + pad + 3, cy - size, w - pad * 2 - 4, size, { color: k.th.ink }); cy -= lead; }));
    },
  };
}

function sectionBlocks(k: K, key: string, w: number, dark: boolean): Block[] {
  const { cv, p } = k.inp; const out: Block[] = [];
  const bodyC = dark ? LIGHT : k.th.muted; const bs = k.body * k.s;
  const head = () => out.push(heading(k, LABEL[key] || key, w, dark));
  if (key === 'target') { const b = alvoBlock(k, w); return b ? [b] : []; }
  if (key === 'contact') {
    const vals = [p.email, p.telefone ? formatTel(p.telefone) : '', [p.residencia, p.cidade].filter(Boolean).join(', '), p.linkedin].filter(Boolean);
    if (!vals.length) return [];
    head(); vals.forEach(v => out.push(textBlock(k, [{ t: v }], 8.6 * k.s, w, { color: bodyC, lead: 11.5 * k.s })));
    out.push({ h: 8 * k.s, draw: () => {} }); return out;
  }
  if (key === 'profile') {
    if (!cv.resumo.trim()) return [];
    head(); out.push(textBlock(k, [{ t: cv.resumo.trim() }], bs, w, { color: bodyC, lead: k.lead * k.s, after: 10 * k.s })); return out;
  }
  if (key === 'experience') {
    const it = cv.experiencia.filter(e => e.cargo.trim() || e.empresa.trim()); if (!it.length) return [];
    head(); it.forEach(e => out.push(itemBlock(k, w, dark, e.cargo, e.empresa, periodo(e.inicio, e.fim), e.descricao.trim()))); return out;
  }
  if (key === 'education') {
    const it = cv.educacao.filter(e => e.curso.trim() || e.instituicao.trim()); if (!it.length) return [];
    head(); it.forEach(e => out.push(itemBlock(k, w, dark, e.curso, e.instituicao, periodo(e.inicio, e.fim), e.nota.trim()))); return out;
  }
  if (key === 'skills') {
    const it = cv.competencias.filter(Boolean); if (!it.length) return [];
    head(); out.push(textBlock(k, [{ t: it.map(s => `• ${s}`).join('\n') }], 8.8 * k.s, w, { color: bodyC, lead: 12 * k.s, after: 8 * k.s })); return out;
  }
  if (key === 'languages') {
    const it = cv.idiomas.filter(i => i.nome.trim()); if (!it.length) return [];
    head(); out.push(textBlock(k, [{ t: it.map(i => `${i.nome}${i.nivel ? ` — ${i.nivel}` : ''}`).join('\n') }], 8.8 * k.s, w, { color: bodyC, lead: 12 * k.s, after: 8 * k.s })); return out;
  }
  return out;
}

// ───────── cabeçalho / foto ─────────
function photoBlockDraw(k: K, pg: PDFPage, x: number, y: number, size: number, treat: string) {
  const { p } = k.inp;
  if (k.photo) {
    pg.drawImage(k.photo, { x, y: y - size, width: size, height: size });
    if (/círculo|medalhão|arco/.test(treat)) pg.drawCircle({ x: x + size / 2, y: y - size / 2, size: size / 2 + 1.5, borderColor: k.th.accent, borderWidth: 1.6 });
    else if (/moldura|quadrado|offset|recortado|contido|grelha|vertical/.test(treat)) pg.drawRectangle({ x: x - 2.5, y: y - size - 2.5, width: size + 5, height: size + 5, borderColor: k.th.accent, borderWidth: 1 });
    return;
  }
  if (treat && treat !== 'sem fotografia') {
    pg.drawRectangle({ x, y: y - size, width: size, height: size, color: k.th.soft, borderColor: k.th.accent, borderWidth: 1 });
    const ini = p.nome.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();
    const fs = size / 3; const wI = k.f.bold.widthOfTextAtSize(safe(k.f.bold, ini), fs);
    pg.drawText(safe(k.f.bold, ini), { x: x + (size - wI) / 2, y: y - size / 2 - fs / 3, size: fs, font: k.f.bold, color: k.th.accent });
  }
}
const hasPhotoBox = (k: K, treat: string) => !!k.photo || (!!treat && treat !== 'sem fotografia');

function identity(k: K, pg: PDFPage, x: number, y: number, w: number, o: { dark?: boolean; photo?: boolean; align?: 'left' | 'center' | 'right'; big?: boolean; upper?: boolean }) {
  const { p, style } = k.inp; const rc = style.recipe;
  const showPhoto = !!o.photo && hasPhotoBox(k, rc.photoTreatment);
  const ps = showPhoto ? Math.min(o.dark ? 64 : 86, w * 0.2) : 0;
  const tx = x + (ps ? ps + 16 : 0); const tw = w - (tx - x);
  if (showPhoto) photoBlockDraw(k, pg, x, y + 4, ps, rc.photoTreatment);
  const ns = (o.big ? 27 : 22) * k.s; const name = o.upper ? p.nome.toUpperCase() : p.nome;
  const nl = layoutRuns([{ t: name || 'Nome completo', b: true }], k.f, ns, tw);
  let cy = y;
  nl.forEach(ln => { drawLine(pg, ln, k.f, tx, cy - ns, tw, ns, { color: o.dark ? WHITE : k.th.ink, align: o.align }); cy -= ns * 1.15; });
  const titulo = k.inp.cand.campos.categoria?.trim() || k.inp.vaga.titulo;
  const sub = k.inp.vaga.tipo === 'concurso' ? (k.inp.cand.campos.categoria?.trim() ? `Candidato(a) — ${k.inp.cand.campos.categoria.trim()}` : '') : (k.inp.vaga.titulo ? `Candidatura: ${k.inp.vaga.titulo}` : '');
  void titulo;
  if (sub) { const sl = layoutRuns([{ t: sub.replace('Candidato(a)', k.inp.p.sexo === 'F' ? 'Candidata' : k.inp.p.sexo === 'M' ? 'Candidato' : 'Candidato(a)') }], k.f, 11 * k.s, tw); cy -= 2; sl.forEach(ln => { drawLine(pg, ln, k.f, tx, cy - 11 * k.s, tw, 11 * k.s, { color: o.dark ? rgb(0.95, 0.85, 0.5) : k.th.accent, align: o.align }); cy -= 14 * k.s; }); }
  const bottom = showPhoto ? Math.min(cy, y + 4 - ps - 8) : cy;
  return bottom - 6;
}
function contactLine(k: K, pg: PDFPage, x: number, y: number, w: number, dark: boolean, align?: 'left' | 'center' | 'right') {
  const { p } = k.inp;
  const vals = [p.email, p.telefone ? formatTel(p.telefone) : '', [p.residencia, p.cidade].filter(Boolean).join(', '), p.linkedin].filter(Boolean);
  if (!vals.length) return y;
  const lines = layoutRuns([{ t: vals.join('   |   ') }], k.f, 8.6 * k.s, w);
  lines.forEach(ln => { drawLine(pg, ln, k.f, x, y - 8.6 * k.s, w, 8.6 * k.s, { color: dark ? LIGHT : k.th.muted, align }); y -= 12 * k.s; });
  return y - 2;
}

// ───────── ornamentos por página ─────────
function ornament(k: K, pg: PDFPage, first: boolean) {
  const t = k.inp.style.recipe.ornament; const a = k.th.accent;
  if (t === 'frame') pg.drawRectangle({ x: 18, y: 18, width: A4.w - 36, height: A4.h - 36, borderColor: a, borderWidth: 1.1 });
  if (!first) return;
  if (t === 'dot') pg.drawCircle({ x: A4.w - 36, y: A4.h - 36, size: 6, color: a });
  if (t === 'block') pg.drawRectangle({ x: A4.w - 52, y: A4.h - 52, width: 22, height: 22, color: a });
  if (t === 'corner') { pg.drawLine({ start: { x: 28, y: A4.h - 28 }, end: { x: 84, y: A4.h - 28 }, color: a, thickness: 2 }); pg.drawLine({ start: { x: 28, y: A4.h - 28 }, end: { x: 28, y: A4.h - 84 }, color: a, thickness: 2 }); }
  if (t === 'grid') for (let i = 0; i < 3; i++) pg.drawLine({ start: { x: A4.w - 64 + i * 9, y: A4.h - 30 }, end: { x: A4.w - 64 + i * 9, y: A4.h - 58 }, color: a, thickness: 0.7 });
  if (t === 'rule') pg.drawLine({ start: { x: A4.w - 88, y: A4.h - 36 }, end: { x: A4.w - 30, y: A4.h - 36 }, color: a, thickness: 2 });
}

type Plan = {
  decor: (pg: PDFPage, first: boolean) => void;
  header: (pg: PDFPage) => number;
  running: (pg: PDFPage) => number;     // cabeçalho curto nas páginas seguintes
  cols: (y0: number) => Col[];
};

function pickKeys(k: K) {
  const rc = k.inp.style.recipe; const vis = new Set(['profile', 'experience', 'education', 'skills', 'languages', 'contact']);
  const side = rc.sideContent.filter(s => vis.has(s)) as string[];
  const main = [...rc.sectionOrder, ...['profile', 'experience', 'education', 'skills', 'languages']].filter((s, i, a) => vis.has(s) && !side.includes(s) && a.indexOf(s) === i) as string[];
  const si = side.indexOf('contact'); if (si > 0) side.splice(si, 1); if (si !== 0) side.unshift('contact');
  return { side, main };
}

function makePlan(k: K): Plan {
  const rc = k.inp.style.recipe; const th = k.th; const comp = rc.composition;
  const { side, main } = pickKeys(k);
  const bottom = 52; const topN = A4.h - 52;
  const mk = (keys: string[], w: number, dark = false) => keys.flatMap(key => sectionBlocks(k, key, w, dark));
  const upper = /masthead|monograma/.test(rc.headerTreatment);
  const align: 'left' | 'center' | 'right' = /centrado/.test(rc.headerTreatment) ? 'center' : /direita/.test(rc.headerTreatment) ? 'right' : 'left';
  const big = /escala/.test(rc.headerTreatment);
  const runningHead = (x: number, w: number) => (pg: PDFPage) => {
    pg.drawText(safe(k.f.bold, k.inp.p.nome), { x, y: A4.h - 38, size: 9 * k.s, font: k.f.bold, color: th.ink });
    pg.drawLine({ start: { x, y: A4.h - 46 }, end: { x: x + w, y: A4.h - 46 }, thickness: 0.7, color: th.accent });
    return A4.h - 62;
  };

  if (comp === 'sidebar-left' || comp === 'sidebar-right') {
    const sw = 176; const left = comp === 'sidebar-left';
    const sx = left ? 0 : A4.w - sw; const mx = left ? sw + 28 : 38; const mw = A4.w - sw - 28 - 38;
    const ix = sx + 24; const iw = sw - 48;
    const photoBlk: Block[] = hasPhotoBox(k, rc.photoTreatment) ? [{ h: iw * 0.9 + 18, draw: (pg, x, y) => photoBlockDraw(k, pg, x, y, iw * 0.9, rc.photoTreatment) }] : [];
    const target = alvoBlock(k, mw);
    return {
      decor: (pg, first) => { pg.drawRectangle({ x: sx, y: 0, width: sw, height: A4.h, color: th.ink }); ornament(k, pg, first); },
      header: pg => { const y = identity(k, pg, mx, A4.h - 52, mw, { upper, big }); pg.drawLine({ start: { x: mx, y }, end: { x: mx + mw, y }, thickness: 1.1, color: th.accent }); return y - 18; },
      running: pg => runningHead(mx, mw)(pg),
      cols: y0 => [
        { x: ix, w: iw, dark: true, first: A4.h - 44, next: topN, bottom, blocks: [...photoBlk, ...mk(side, iw, true), ...mk(main.filter(m => ['skills', 'languages'].includes(m) && false), iw, true)] },
        { x: mx, w: mw, first: y0, next: topN - 10, bottom, blocks: [...(target ? [target] : []), ...mk(main, mw)] },
      ],
    };
  }

  if (comp === 'split' || comp === 'modular') {
    const bandH = comp === 'split' ? 128 : 124; const sx = comp === 'split' ? A4.w * 0.38 : A4.w * 0.5;
    const lw = sx - 38 - 12; const rw = A4.w - sx - 36;
    const leftKeys = side.filter(s => s !== 'contact');
    const leftAll = [...leftKeys, ...main.filter(m => m === 'skills' || m === 'languages').filter(m => !leftKeys.includes(m))];
    const rightKeys = main.filter(m => !leftAll.includes(m));
    const target = alvoBlock(k, rw);
    return {
      decor: (pg, first) => { if (first) pg.drawRectangle({ x: 0, y: A4.h - bandH, width: A4.w, height: bandH, color: th.ink }); ornament(k, pg, first); },
      header: pg => { const y = identity(k, pg, 38, A4.h - 38, A4.w - 76, { dark: true, photo: true, align, upper, big }); void y; contactLine(k, pg, 38, A4.h - bandH + 26, A4.w - 76, true, align); return A4.h - bandH - 26; },
      running: pg => runningHead(38, A4.w - 76)(pg),
      cols: y0 => [
        { x: 38, w: lw, first: y0, next: topN - 10, bottom, blocks: mk(leftAll, lw) },
        { x: sx + 4, w: rw, first: y0, next: topN - 10, bottom, blocks: [...(target ? [target] : []), ...mk(rightKeys, rw)] },
      ],
    };
  }

  if (comp === 'editorial') {
    const gx = 50; const gw = A4.w - 100; const nw = 150; const ww = gw - nw - 22;
    const narrow = side.filter(s => s !== 'contact').concat(main.filter(m => m === 'skills' || m === 'languages'));
    const wide = main.filter(m => !narrow.includes(m));
    const target = alvoBlock(k, ww);
    return {
      decor: (pg, first) => ornament(k, pg, first),
      header: pg => {
        pg.drawText(safe(k.f.bold, (k.inp.vaga.tipo === 'concurso' ? 'Concurso público' : 'Candidatura').toUpperCase()), { x: gx, y: A4.h - 56, size: 8 * k.s, font: k.f.bold, color: th.accent });
        let y = identity(k, pg, gx, A4.h - 72, gw, { photo: true, align, upper, big });
        y = contactLine(k, pg, gx, y, gw, false);
        pg.drawLine({ start: { x: gx, y }, end: { x: gx + gw, y }, thickness: 1.8, color: th.ink });
        return y - 20;
      },
      running: pg => runningHead(gx, gw)(pg),
      cols: y0 => [
        { x: gx, w: ww, first: y0, next: topN - 10, bottom, blocks: [...(target ? [target] : []), ...mk(wide, ww)] },
        { x: gx + ww + 22, w: nw, first: y0, next: topN - 10, bottom, blocks: mk(narrow, nw) },
      ],
    };
  }

  // coluna única: single, framed, offset, rail, timeline
  const gx = comp === 'rail' ? 74 : comp === 'framed' ? 52 : 48; const gw = A4.w - gx - (comp === 'rail' ? 36 : gx);
  const rest = [...main, ...side.filter(s => s !== 'contact')].filter((s, i, a) => a.indexOf(s) === i);
  const target = alvoBlock(k, gw);
  return {
    decor: (pg, first) => {
      if (comp === 'rail') { pg.drawRectangle({ x: 0, y: 0, width: 44, height: A4.h, color: th.ink }); if (first) pg.drawText('CV', { x: 16, y: A4.h - 46, size: 11, font: k.f.bold, color: WHITE, rotate: degrees(90) }); pg.drawLine({ start: { x: 22, y: A4.h - 100 }, end: { x: 22, y: 45 }, color: th.accent, thickness: 2 }); }
      if (comp === 'offset' && first) pg.drawRectangle({ x: 0, y: A4.h - 100, width: A4.w, height: 100, color: th.soft });
      if (comp === 'timeline') pg.drawLine({ start: { x: gx - 14, y: A4.h - (first ? 150 : 60) }, end: { x: gx - 14, y: 46 }, color: th.accent, thickness: 1.2 });
      ornament(k, pg, first);
    },
    header: pg => {
      let y = identity(k, pg, gx, A4.h - 54, gw, { photo: true, align, upper, big });
      y = contactLine(k, pg, gx, y, gw, false, align);
      pg.drawLine({ start: { x: gx, y }, end: { x: gx + gw, y }, thickness: 1.2, color: th.accent });
      return y - 20;
    },
    running: pg => runningHead(gx, gw)(pg),
    cols: y0 => [{ x: gx, w: gw, first: y0, next: topN - 10, bottom, blocks: [...(target ? [target] : []), ...mk(rest, gw)] }],
  };
}

function render(k: K, doc: PDFDocument) {
  const plan = makePlan(k);
  const pages: PDFPage[] = [];
  const newPage = () => { const pg = doc.addPage([A4.w, A4.h]); pg.drawRectangle({ x: 0, y: 0, width: A4.w, height: A4.h, color: k.th.paper }); plan.decor(pg, pages.length === 0); pages.push(pg); return pg; };
  let pg = newPage(); const y0 = plan.header(pg);
  const cols = plan.cols(y0);
  const cursors = cols.map(c => ({ i: 0, y: c.first }));
  let guard = 0;
  while (cols.some((c, i) => cursors[i].i < c.blocks.length) && guard++ < 12) {
    const pageIdx = pages.length - 1;
    cols.forEach((c, ci) => {
      const cur = cursors[ci]; if (pageIdx > 0) cur.y = c.next;
      while (cur.i < c.blocks.length) {
        const b = c.blocks[cur.i]; const nxt = c.blocks[cur.i + 1];
        const need = b.h + (b.keep && nxt ? nxt.h : 0);
        const fresh = cur.y >= c.next - 0.5 || (pageIdx === 0 && cur.y >= c.first - 0.5);
        if (cur.y - need < c.bottom && !fresh) break;
        b.draw(pg, c.x, cur.y); cur.y -= b.h; cur.i++;
      }
    });
    if (cols.some((c, i) => cursors[i].i < c.blocks.length)) {
      pg = newPage(); const yy = plan.running(pg); cols.forEach(c => { c.next = Math.min(c.next, yy); });
    }
  }
  return pages.length;
}

export async function criarCv(inp: CvInput): Promise<PDFDocument> {
  const st = inp.style; const pal = st.palette;
  const th: Th = { ink: hex(pal.ink), accent: hex(pal.accent), muted: hex(pal.muted), rule: hex(pal.rule), paper: hex(pal.paper), soft: hex(pal.rule) };
  const family: 'times' | 'helvetica' = /serif/i.test(st.typography) && !/sans/i.test(st.typography.split('+')[0]) ? 'times' : 'helvetica';
  const dens = st.density === 'Compacto' ? { body: 9, lead: 12, gap: 7 } : st.density === 'Espaçoso' ? { body: 9.8, lead: 14, gap: 12 } : { body: 9.4, lead: 13, gap: 9 };
  const want1 = inp.cand.cvPaginas === 1;
  const scales = want1 ? [1, 0.93, 0.86, 0.8] : [1];
  let best: PDFDocument | null = null;
  for (const s of scales) {
    const doc = await PDFDocument.create();
    const f = await loadFonts(doc, family);
    let photo: PDFImage | null = null;
    const treat = st.recipe.photoTreatment;
    const bytes = /círculo|medalhão|arco/.test(treat) ? inp.fotoCirculo : inp.fotoQuadrada;
    try { if (bytes) photo = /círculo|medalhão|arco/.test(treat) ? await doc.embedPng(bytes) : await doc.embedJpg(bytes); } catch { photo = null; }
    const k: K = { doc, f, th, s, body: dens.body, lead: dens.lead, gap: dens.gap, inp, photo };
    const n = render(k, doc);
    best = doc;
    if (!want1 || n <= 1) break;
  }
  best!.setTitle(`Currículo — ${inp.p.nome}`); best!.setAuthor(inp.p.nome || 'Candidato');
  return best!;
}
