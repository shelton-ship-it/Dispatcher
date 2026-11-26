import { PDFDocument } from 'pdf-lib';
import type { Candidatura, CvData, Pessoal, Vaga } from '../types';
import { Flow, loadFonts, addPageNumbers, A4, Run } from './text';
import { dataExtenso, mesNome } from '../dates';
import { formatTel } from '../mz';

export type Ctx = { p: Pessoal; vaga: Vaga; cand: Candidatura; cv: CvData };

const BL = (n: number) => '_'.repeat(n);
const val = (v: string | undefined, blank: number) => (v && v.trim() ? v.trim() : BL(blank));

/** Aplica o género do candidato aos "(a)", "o(a)", "O(A)". Sem sexo escolhido, mantém "(a)". */
export function genero(text: string, sexo: Pessoal['sexo']) {
  if (sexo === 'M') return text.replace(/O\(A\)/g, 'O').replace(/o\(a\)/g, 'o').replace(/\(a\)/g, '').replace(/\(o\)/g, '');
  if (sexo === 'F') return text.replace(/O\(A\)/g, 'A').replace(/o\(a\)/g, 'a').replace(/\(a\)/g, 'a').replace(/\(o\)/g, '');
  return text;
}
const nasc = (p: Pessoal) => (p.sexo === 'M' ? 'nascido' : p.sexo === 'F' ? 'nascida' : 'nascido(a)');
const data3 = (d: string, m: string, a: string, bl: [number, number, number]) =>
  `${val(d, bl[0])} de ${m ? mesNome(m) : BL(bl[1])} de ${val(a, bl[2])}`;
const natural = (p: Pessoal) => (p.nacionalidade?.trim() ? p.nacionalidade.trim().toLowerCase() : 'moçambicana');

function dataAssinatura(c: Ctx) {
  const { d, m, a } = c.cand.dataAss;
  return `${val(c.cand.localAss || c.p.cidade, 18)}, aos ${val(d, 3)} de ${m ? mesNome(m) : BL(10)} de ${val(a, 4)}.`;
}

export function runsParaTexto(runs: Run[]) { return runs.map(r => r.t).join(''); }

export function requerimentoRuns(c: Ctx): Run[] {
  const { p, vaga } = c;
  const nomeConc = vaga.nomeConcurso || vaga.titulo || 'Concurso';
  return [
    { t: val(p.nome, 62), b: !!p.nome.trim() },
    { t: `, de nacionalidade ${natural(p)}, ${nasc(p)} aos ${data3(p.nascDia, p.nascMes, p.nascAno, [3, 15, 6])}, titular do Bilhete de Identidade n.º ${val(p.biNumero, 22)}, emitido pelo Arquivo de Identificação Civil de ${val(p.biLocal, 24)}, aos ${data3(p.biDia, p.biMes, p.biAno, [6, 10, 5])}, residente em ${val(p.residencia, 44)}, telefone n.º ${val(p.telefone ? formatTel(p.telefone) : '', 18)}, vem, mui respeitosamente, requerer a V. Excia. se digne autorizar a sua ` },
    { t: `admissão ao ${nomeConc},`, b: true },
    { t: ' para o preenchimento de vagas na:' },
  ];
}

export async function criarRequerimento(c: Ctx) {
  const { p, vaga, cand } = c;
  const doc = await PDFDocument.create();
  const f = await loadFonts(doc, 'times');
  const flow = new Flow(doc, f, { l: 62, r: 56, t: 52, b: 80 });
  const dest = vaga.destinatario.length ? vaga.destinatario : [`EXMO(A). SENHOR(A) — ${vaga.entidade.toUpperCase()}`];
  dest.forEach(l => flow.para([{ t: genero(l, p.sexo), b: true }], { lead: 17 }));
  flow.space(60);
  // Cidade do candidato (canto direito, sobre uma linha)
  const cidade = p.cidade?.trim();
  if (cidade) flow.para([{ t: cidade }], { align: 'right', lead: 14, x: flow.m.l + flow.width - 190, width: 190, size: 12 });
  else flow.space(14);
  flow.rule(190, { align: 'right', gapAfter: 5 });
  flow.para([{ t: '(Nome da Cidade do Candidato)', i: true }], { size: 8, align: 'right', lead: 11 });
  flow.space(44);

  const override = cand.textos.requerimento?.trim();
  const corpo: Run[] = override ? [{ t: override }] : requerimentoRuns(c);
  flow.para(corpo, { justify: true, lead: 22, size: 12 });
  const campos = vaga.campos.length ? vaga.campos : [];
  campos.forEach((cp, i) => {
    const fim = i === campos.length - 1 ? '.' : ';';
    flow.ensure(22);
    flow.page.drawText('•', { x: flow.m.l, y: flow.y - 12, size: 12, font: f.reg });
    flow.para([{ t: `${cp.label}: ${val(cand.campos[cp.id], 30)}${fim}` }], { x: flow.m.l + 36, width: flow.width - 36, lead: 22 });
  });
  flow.para([{ t: genero('O(A) requerente declara reunir os requisitos exigidos no respectivo Aviso de Abertura do Concurso e apresenta, para o efeito, os documentos comprovativos da sua elegibilidade e demais elementos exigidos.', p.sexo) }], { justify: true, lead: 22 });
  flow.para([{ t: 'Nestes termos,' }], { lead: 22 });
  flow.para([{ t: 'Pede deferimento.' }], { lead: 22, after: 22 });
  flow.para([{ t: dataAssinatura(c) }], { align: 'center', lead: 22 });
  flow.para([{ t: genero('O(A) Requerente', p.sexo) }], { align: 'center', lead: 22, after: 30 });
  flow.rule(200, { align: 'center', gapAfter: 8 });
  flow.para([{ t: '(Assinatura do candidato)' }], { align: 'center', lead: 18 });
  addPageNumbers(doc, f);
  return doc;
}

export function honraParas(c: Ctx): Run[][] {
  const { p, vaga } = c;
  const nomeConc = vaga.nomeConcurso || vaga.titulo || 'Concurso';
  const clausulas = (vaga.declaracoes.length ? vaga.declaracoes : ['reúno os requisitos exigidos para a candidatura']).map(x => genero(x, p.sexo));
  const clausulaTxt = clausulas.length === 1 ? clausulas[0] : clausulas.slice(0, -1).join('; ') + ' e ' + clausulas[clausulas.length - 1];
  const cand = p.sexo === 'M' ? 'candidato' : p.sexo === 'F' ? 'candidata' : 'candidato(a)';
  return [
    [
      { t: 'Eu, ' }, { t: val(p.nome, 62), b: !!p.nome.trim() },
      { t: `, de nacionalidade ${natural(p)}, titular do Bilhete de Identidade n.º ${val(p.biNumero, 22)}, emitido aos ${data3(p.biDia, p.biMes, p.biAno, [6, 12, 5])}, residente em ${val(p.residencia, 50)}, ${cand} ao ${nomeConc}, declaro, sob compromisso de honra, que ${clausulaTxt}.` },
    ],
    [{ t: genero('Declaro, ainda, que tenho pleno conhecimento de que a prestação de falsas declarações poderá determinar a exclusão da minha candidatura e desencadear os procedimentos legais aplicáveis.', p.sexo) }],
    [{ t: 'Por ser verdade, assino a presente declaração para os devidos efeitos.' }],
  ];
}

export async function criarHonra(c: Ctx) {
  const { p, cand } = c;
  const doc = await PDFDocument.create();
  const f = await loadFonts(doc, 'times');
  const flow = new Flow(doc, f, { l: 62, r: 56, t: 52, b: 80 });
  flow.para([{ t: 'DECLARAÇÃO SOB COMPROMISSO DE HONRA', b: true }], { lead: 17 });
  flow.space(76);
  const override = cand.textos.honra?.trim();
  if (override) override.split('\n').filter(x => x.trim()).forEach(par => flow.para([{ t: par.trim() }], { justify: true, lead: 22 }));
  else honraParas(c).forEach(par => flow.para(par, { justify: true, lead: 22 }));
  if (!override) flow.space(0);
  flow.space(24);
  flow.para([{ t: dataAssinatura(c) }], { align: 'center', lead: 22 });
  flow.para([{ t: genero('O(A) Declarante', p.sexo) }], { align: 'center', lead: 22, after: 30 });
  flow.rule(200, { align: 'center', gapAfter: 8 });
  flow.para([{ t: '(Assinatura)' }], { align: 'center', lead: 18 });
  addPageNumbers(doc, f);
  return doc;
}

// ───────────────────────── Carta de apresentação ─────────────────────────
export function gerarCartaTexto(c: Ctx): string {
  const { p, vaga, cand, cv } = c;
  const cat = cand.campos.categoria?.trim(); const area = cand.campos.area?.trim(); const local = cand.campos.local?.trim();
  const paras: string[] = [];
  if (vaga.tipo === 'concurso') {
    const nomeConc = vaga.nomeConcurso || vaga.titulo;
    const partes: string[] = [];
    if (cat) partes.push(`para a categoria de ${cat}`);
    if (area) partes.push(`na área de ${area}`);
    if (local) partes.push(`com afectação pretendida em ${local}`);
    const a = `Venho, por este meio, apresentar a minha candidatura ao ${nomeConc}${partes.length ? ', ' + partes.join(', ') : ''}, conforme o respectivo Aviso de Abertura.`;
    paras.push(a);
  } else {
    paras.push(`Venho, por este meio, candidatar-me à vaga de ${vaga.titulo || 'que se encontra em aberto'}${vaga.entidade ? ` na ${vaga.entidade}` : ''}.`);
  }
  const edu = cv.educacao.find(e => e.curso.trim());
  const exp = cv.experiencia.find(e => e.cargo.trim());
  const quali: string[] = [];
  if (edu) quali.push(`possuo formação em ${edu.curso.trim()}${edu.instituicao.trim() ? `, pela ${edu.instituicao.trim()}` : ''}`);
  if (exp) quali.push(`tenho experiência como ${exp.cargo.trim()}${exp.empresa.trim() ? ` em ${exp.empresa.trim()}` : ''}`);
  if (quali.length) paras.push(`${quali.length === 2 ? `Relativamente ao meu percurso, ${quali[0]} e ${quali[1]}.` : `Relativamente ao meu percurso, ${quali[0]}.`}`);
  const motivo = cand.carta.motivo.trim();
  paras.push(motivo || `Tenho grande interesse em integrar${vaga.entidade ? ` a ${vaga.entidade}` : ' a vossa equipa'}, por reconhecer a importância do trabalho que desenvolvem e por acreditar que posso contribuir com seriedade, responsabilidade e vontade de aprender.`);
  const pts = cand.carta.pontos.filter(Boolean);
  if (pts.length) paras.push(`Entre os meus pontos fortes destaco: ${pts.length > 1 ? pts.slice(0, -1).join(', ') + ' e ' + pts[pts.length - 1] : pts[0]}.`);
  paras.push('Junto envio o meu Curriculum Vitae e os demais documentos solicitados, ficando à inteira disposição para qualquer esclarecimento ou para uma entrevista.');
  return paras.join('\n');
}

export async function criarCarta(c: Ctx, textoFinal?: string) {
  const { p, vaga, cand } = c;
  const doc = await PDFDocument.create();
  const f = await loadFonts(doc, 'times');
  const flow = new Flow(doc, f, { l: 70, r: 70, t: 64, b: 64 });
  // remetente
  flow.para([{ t: p.nome || 'Nome completo', b: true }], { lead: 15, size: 12 });
  [p.residencia, p.telefone ? `Tel.: ${formatTel(p.telefone)}` : '', p.email].filter(Boolean).forEach(l => flow.para([{ t: l }], { lead: 14, size: 11 }));
  flow.space(18);
  const { d, m, a } = cand.dataAss;
  flow.para([{ t: `${cand.localAss || p.cidade || ''}${(cand.localAss || p.cidade) ? ', ' : ''}${dataExtenso(d, m, a)}` }], { align: 'right', lead: 16 });
  flow.space(14);
  // destinatário
  const sal = vaga.saudacao || (vaga.entidade ? `Exmos. Senhores — ${vaga.entidade}` : 'Exmos. Senhores');
  flow.para([{ t: genero(sal, p.sexo), b: true }], { lead: 15 });
  if (vaga.contacto?.morada) flow.para([{ t: vaga.contacto.morada }], { lead: 14, size: 11 });
  flow.space(14);
  const assunto = vaga.tipo === 'concurso'
    ? `Candidatura ao ${vaga.nomeConcurso || vaga.titulo}${cand.campos.categoria ? ` — ${cand.campos.categoria}` : ''}`
    : `Candidatura à vaga de ${vaga.titulo || '—'}`;
  flow.para([{ t: 'Assunto: ', b: true }, { t: assunto, b: true }], { lead: 16, after: 8 });
  const sm = vaga.saudacao?.match(/^Exm[oa]\.?\s+(Senhor|Senhora)\s+(\S+)/i);
  const abertura = sm ? `Excelentíssim${/senhora/i.test(sm[1]) ? 'a' : 'o'} ${sm[1]} ${sm[2]},` : 'Exmos. Senhores,';
  flow.para([{ t: abertura }], { lead: 20, after: 4 });
  const texto = (textoFinal ?? (cand.carta.editado ? cand.carta.texto : gerarCartaTexto(c)));
  texto.split('\n').filter(s => s.trim()).forEach(par => flow.para([{ t: par.trim() }], { justify: true, lead: 18.5, after: 6, indent: 28 }));
  flow.space(10);
  flow.para([{ t: 'Com os melhores cumprimentos,' }], { lead: 18 });
  flow.space(30);
  flow.ensure(60);
  flow.rule(200, { gapAfter: 6 });
  flow.para([{ t: p.nome || 'Nome completo' }], { lead: 15 });
  return doc;
}
