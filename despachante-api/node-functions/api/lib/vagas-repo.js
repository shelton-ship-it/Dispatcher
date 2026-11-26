// Vagas em base de dados (Turso): entram por ingestão (scraper/admin) e são servidas em JSON — sem deploy por vaga.
import crypto from 'node:crypto';
import { execute, getOne, getAll } from './turso.js';
import { garantirSchema } from './schema.js';
import { analisarAviso, norm } from './analise.js';
import { getEnv } from './env.js';

const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
export const hash = (s) => crypto.createHash('sha256').update(String(s || '')).digest('hex').slice(0, 32);
export function siglaDe(nome) {
    const p = String(nome).replace(/\b(de|da|do|das|dos|e|em|na|no)\b/gi, '').split(/\s+/).filter(Boolean);
    return p.length <= 1 ? (p[0] || '').slice(0, 8).toUpperCase() : p.map(x => x[0]).join('').slice(0, 6).toUpperCase();
}
const hoje = () => new Date().toISOString().slice(0, 10);

const CAMPOS_CONCURSO = (categorias, locais) => [
    { id: 'categoria', label: 'Categoria', placeholder: 'Conforme o aviso', ...(categorias?.length ? { opcoes: categorias.map(c => c.nome) } : {}) },
    { id: 'area', label: 'Área', placeholder: 'Conforme o aviso (se aplicável)' },
    { id: 'local', label: 'Local de afectação pretendido', placeholder: 'Ex.: Maputo', ...(locais?.length ? { opcoes: locais } : {}) },
];

function entregaDe(docs, canal, email, prazoIso) {
    const L = [];
    const nome = (id) => ({ requerimento: 'o requerimento', bi: 'o documento de identificação', certificado: 'o certificado de habilitações', nuit: 'o NUIT', honra: 'a declaração de honra' }[id] || id);
    const rec = docs.filter(d => d.reconhecida && d.id !== 'requerimento_assinado').map(d => d.id);
    if (rec.length) L.push(`Assinatura reconhecida por notário: ${rec.map(nome).join(' e ')}. Imprime, assina, leva ao notário e digitaliza o resultado.`);
    const aut = docs.filter(d => d.autenticado).map(d => d.id);
    if (aut.length) L.push(`Fotocópia autenticada: ${aut.map(nome).join(', ')}. Autentica no notário/cartório e digitaliza a cópia autenticada.`);
    if (docs.some(d => d.id === 'atestado')) L.push('O atestado médico/aptidão física obtém-se numa unidade sanitária — não conseguimos gerá-lo.');
    if (canal === 'email' && email) L.push(`Envia tudo num único email para ${email} e guarda o comprovativo de submissão.`);
    if (canal === 'presencial') L.push('Entrega presencial: imprime tudo e entrega em envelope, dentro do prazo e do horário do aviso.');
    if (prazoIso) L.push(`Prazo: até ${prazoIso.split('-').reverse().join('/')}. Confirma a data exacta no aviso.`);
    return L;
}

export function montarVaga(base, analise, curado = {}) {
    const tipo = base.tipo === 'privada' ? 'privada' : 'concurso';
    const categorias = curado.categorias ?? base.categorias ?? analise.categorias ?? [];
    const locais = curado.locais ?? base.locais ?? analise.locais ?? [];
    const docs = (curado.docs ?? analise.docs).map(d => ({ ...d, categorias: d.categorias }));
    const email = curado.email ?? analise.email ?? base.email ?? null;
    const canal = curado.canal ?? analise.canal;
    const prazoIso = curado.prazoIso ?? base.prazoIso ?? analise.prazoIso ?? null;
    const entidade = base.entidade;
    const v = {
        id: base.id, tipo, entidade, sigla: base.sigla || siglaDe(entidade), titulo: base.titulo,
        nomeConcurso: tipo === 'concurso' ? (base.nomeConcurso || base.titulo) : undefined,
        destinatario: base.destinatario?.length ? base.destinatario : (tipo === 'concurso' ? [`EXMO(A). SENHOR(A) PRESIDENTE DO(A) ${entidade.toUpperCase()}`] : []),
        saudacao: base.saudacao, categorias, campos: curado.campos ?? (tipo === 'concurso' ? CAMPOS_CONCURSO(categorias, locais) : []),
        declaracoes: curado.declaracoes ?? (analise.declaracoes?.length ? analise.declaracoes : tipo === 'concurso' ? ['reúno os requisitos legais exigidos para a candidatura'] : []),
        docs, canal, contacto: { ...(email ? { email } : {}), ...(base.whatsapp ? { whatsapp: base.whatsapp } : {}), ...(base.morada ? { morada: base.morada } : {}) },
        prazoIso, provincia: base.provincia, notas: curado.notas ?? base.notas, fonte: base.fonte_url,
        requisitos: curado.requisitos ?? analise.requisitos, etapas: curado.etapas ?? analise.etapas,
        entrega: curado.entrega ?? entregaDe(docs, canal, email, prazoIso),
        revisao: { confianca: analise.confianca, avisos: analise.avisos, origem: analise.fonteAnalise },
    };
    return JSON.parse(JSON.stringify(v));   // remove undefined
}

export async function ingerir(item, { force = false } = {}) {
    await garantirSchema();
    if (!item?.entidade || !item?.titulo) throw Object.assign(new Error('entidade e titulo são obrigatórios'), { status: 400 });
    const tipo = item.tipo === 'privada' ? 'privada' : 'concurso';
    const id = item.id || slug(item.fonte_url ? `${item.entidade}-${item.titulo}` : `${item.entidade}-${item.titulo}`);
    const texto = String(item.texto || '').slice(0, 40000); const h = hash(texto);
    const ex = await getOne('SELECT * FROM dd_vagas WHERE id = ? OR (fonte_url IS NOT NULL AND fonte_url = ?)', [id, item.fonte_url || null]);
    const realId = ex?.id || id;
    let analise = ex?.analise_json && ex.texto_hash === h && !force ? JSON.parse(ex.analise_json) : null;
    let reanalisado = false;
    if (!analise) { analise = await analisarAviso(texto, { tipo, entidade: item.entidade, titulo: item.titulo, dataRef: item.dataRef ? new Date(item.dataRef) : new Date() }); reanalisado = true; }
    const revisado = Number(ex?.revisado || 0) === 1;
    const dossier = revisado && ex?.dossier_json && !item.curado ? JSON.parse(ex.dossier_json) : montarVaga({ ...item, id: realId, tipo }, analise, item.curado || {});
    const min = Number(getEnv('AUTO_PUBLICAR_MIN', '0.6'));
    const status = item.publicar === false ? 'rascunho' : (item.publicar === true || item.curado || analise.confianca >= min || (ex && ex.status === 'publicada' && revisado)) ? 'publicada' : 'rascunho';
    const args = [realId, tipo, item.entidade, item.titulo, item.provincia || null, item.fonte_url || null, texto || null, h, JSON.stringify(analise), JSON.stringify(dossier), status, dossier.prazoIso || null, analise.confianca, (item.curado || revisado) ? 1 : 0];
    if (ex) await execute(`UPDATE dd_vagas SET tipo=?, entidade=?, titulo=?, provincia=?, fonte_url=?, texto=?, texto_hash=?, analise_json=?, dossier_json=?, status=?, prazo=?, confianca=?, revisado=?, atualizado_em=CURRENT_TIMESTAMP WHERE id=?`, [...args.slice(1), realId]);
    else await execute(`INSERT INTO dd_vagas (id,tipo,entidade,titulo,provincia,fonte_url,texto,texto_hash,analise_json,dossier_json,status,prazo,confianca,revisado) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, args);
    return { id: realId, status, confianca: analise.confianca, reanalisado, avisos: analise.avisos, criada: !ex };
}

function resumo(row) {
    const d = JSON.parse(row.dossier_json);
    return { id: d.id, tipo: d.tipo, entidade: d.entidade, sigla: d.sigla, titulo: d.titulo, provincia: d.provincia, prazoIso: d.prazoIso || null, nDocs: d.docs.filter(x => !x.sugerido).length, canal: d.canal, categorias: (d.categorias || []).map(c => c.nome), atualizado: row.atualizado_em };
}
export async function listarPublicas({ tipo, q, limit = 60, offset = 0 } = {}) {
    await garantirSchema();
    const w = [`status = 'publicada'`, `(prazo IS NULL OR prazo >= ?)`]; const a = [hoje()];
    if (tipo === 'concurso' || tipo === 'privada') { w.push('tipo = ?'); a.push(tipo); }
    if (q) { w.push('(titulo LIKE ? OR entidade LIKE ?)'); a.push(`%${q}%`, `%${q}%`); }
    const rows = await getAll(`SELECT dossier_json, atualizado_em FROM dd_vagas WHERE ${w.join(' AND ')} ORDER BY (prazo IS NULL), prazo ASC, atualizado_em DESC LIMIT ${Math.min(100, Number(limit) | 0 || 60)} OFFSET ${Math.max(0, Number(offset) | 0)}`, a);
    return rows.map(resumo);
}
export async function obterPublica(id) {
    await garantirSchema();
    const r = await getOne(`SELECT dossier_json FROM dd_vagas WHERE id = ? AND status = 'publicada'`, [id]);
    return r ? JSON.parse(r.dossier_json) : null;
}
export async function listarAdmin(status) {
    await garantirSchema();
    const rows = await getAll(`SELECT id, tipo, entidade, titulo, status, prazo, confianca, revisado, atualizado_em FROM dd_vagas ${status ? 'WHERE status = ?' : ''} ORDER BY atualizado_em DESC LIMIT 200`, status ? [status] : []);
    return rows;
}
export async function obterAdmin(id) {
    await garantirSchema();
    const r = await getOne('SELECT * FROM dd_vagas WHERE id = ?', [id]);
    return r ? { ...r, analise: JSON.parse(r.analise_json || 'null'), dossier: JSON.parse(r.dossier_json) } : null;
}
export async function atualizarAdmin(id, { dossier, status }) {
    const r = await obterAdmin(id); if (!r) return null;
    const novo = dossier ? { ...r.dossier, ...dossier, id } : r.dossier;
    await execute(`UPDATE dd_vagas SET dossier_json=?, status=?, prazo=?, revisado=?, atualizado_em=CURRENT_TIMESTAMP WHERE id=?`, [JSON.stringify(novo), status || r.status, novo.prazoIso || null, dossier ? 1 : r.revisado, id]);
    return { ...novo };
}
