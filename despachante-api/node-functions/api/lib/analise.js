// ─────────────────────────────────────────────────────────────────────────────
// ANÁLISE ÚNICA DO AVISO
// Corre UMA vez, quando a vaga entra (scraper/admin) ou quando o texto muda — nunca por utilizador.
// Resultado: um "dossier" que diz exactamente que documentos a vaga pede e COMO devem ser
// (original vs. fotocópia autenticada, assinatura reconhecida, atestado, etc.).
//   1) Regras (grátis, determinísticas)   2) IA opcional (ANTHROPIC_API_KEY) — validada contra o texto.
// ─────────────────────────────────────────────────────────────────────────────
import { getEnv } from './env.js';
import { DOCS } from './catalog.js';

export const norm = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const MESES = { janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12 };

const REGRAS = [
    { id: 'requerimento', re: /requerimento/ },
    { id: 'honra', re: /compromisso de honra|declaracao sob compromisso/ },
    { id: 'cv', re: /curricul|\bcv\b/ },
    { id: 'bi', re: /bilhete de identidade|documento de identificacao|passaporte|certidao (narrativa|de nascimento)|\bbi\b/ },
    { id: 'nuit', re: /\bnuit\b|numero unico de identificacao tributaria/ },
    { id: 'certificado', re: /certificado (de )?habilita|certificado de conclusao|habilitacoes literarias|diploma/ },
    { id: 'registo', re: /registo criminal/ },
    { id: 'atestado', re: /atestado medico|aptidao fisica|sanidade mental|atestado de aptidao/ },
    { id: 'militar', re: /documento militar|cartao militar|situacao militar|cedula militar|dispensa militar|comprovativo do servico militar/ },
    { id: 'carta_conducao', re: /carta de conducao|carta de condutor/ },
    { id: 'carta', re: /carta de (motivacao|apresentacao)/ },
];
const RE_AUTENT = /autenticad|conforme (o )?original|certificad[ao] conforme/;
const RE_RECONH = /assinatura (devidamente )?reconhecid|reconhecid[ao] (por|pelo) notario|reconhecimento (da assinatura|notarial)|reconhecida notarialmente/;
const RE_OPCIONAL = /preferencia|opcional|facultativ|quando aplicavel|se aplicavel|se for o caso|se possuir|valoriz/;

const COMO = {
    requerimento: 'Preenchemos o requerimento por ti.',
    honra: 'Preenchemos a declaração. Imprime e assina.',
    cv: 'Gerado a partir dos teus dados, com os dados da vaga.',
    bi: 'Digitaliza o documento de identificação (frente e verso).',
    nuit: 'Digitaliza o cartão ou documento do NUIT.',
    certificado: 'Digitaliza o certificado (todas as páginas).',
    registo: 'Digitaliza o certificado de registo criminal.',
    atestado: 'Obtém o atestado numa unidade sanitária e digitaliza-o.',
    militar: 'Digitaliza o documento militar (cartão, cédula ou comprovativo de dispensa).',
    carta_conducao: 'Digitaliza a carta de condução (frente e verso).',
    carta: 'Escrevemos a carta com as tuas respostas.',
};
const COMO_AUTENT = 'Tem de ser fotocópia AUTENTICADA: leva o original e a fotocópia a um notário/cartório e depois digitaliza aqui a cópia já autenticada.';
const COMO_RECONH = 'A assinatura tem de ser reconhecida por notário: imprime, assina, leva ao notário e depois digitaliza o requerimento assinado.';

function itens(texto) {
    return String(texto || '').replace(/\r/g, '').split(/\n+|;|(?<=[.!?])\s+(?=[A-ZÀ-Ú•\-])/).map(s => s.replace(/^[\s•\-–*]+|^\(?[a-z]\)\s+/i, '').trim()).filter(s => s.length > 3);
}
const clausulas = (s) => s.split(/,|\s+e\s+(?=[a-zà-ú])/i).map(x => x.trim()).filter(Boolean);
const corta = (s, n = 240) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

export function extrairEmail(texto) {
    const all = [...new Set((String(texto).match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g) || []).map(e => e.toLowerCase()))];
    return all.find(e => /recrut|rh@|candidat|vagas|emprego|carreira|jobs|hr@/.test(e)) || all[0] || null;
}

function dataIso(y, m, d) { const dt = new Date(Date.UTC(y, m - 1, d)); return Number.isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10); }
export function extrairPrazo(texto, dataRef = new Date()) {
    const t = norm(texto); const avisos = [];
    // data limite explícita: "até 15 de dezembro de 2026" / "até ao dia 15/12/2026"
    let m = /ate (?:ao dia |o dia )?(\d{1,2}) de ([a-z]+)(?: de (\d{4}))?/.exec(t);
    if (m && MESES[m[2]]) return { iso: dataIso(Number(m[3]) || dataRef.getUTCFullYear(), MESES[m[2]], Number(m[1])), avisos };
    m = /ate (?:ao dia |o dia )?(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(t);
    if (m) return { iso: dataIso(Number(m[3]), Number(m[2]), Number(m[1])), avisos };
    // duração + início: "30 dias de calendário a contar de 16 de novembro"
    const dur = /(\d{1,3})\s*(?:\([^)]*\)\s*)?dias(?:\s+(de calendario|uteis|seguidos|corridos))?/.exec(t);
    const ini = /(?:a partir d[aeo]|a contar d[aeo]|contados? (?:a partir )?d[aeo])\s*(?:data (?:de|da) )?(?:dia )?(\d{1,2}) de ([a-z]+)(?: de (\d{4}))?/.exec(t);
    if (dur && ini && MESES[ini[2]]) {
        const start = new Date(Date.UTC(Number(ini[3]) || dataRef.getUTCFullYear(), MESES[ini[2]] - 1, Number(ini[1])));
        let n = Number(dur[1]); const uteis = dur[2] === 'uteis';
        if (uteis) { let c = 0; while (c < n - 1) { start.setUTCDate(start.getUTCDate() + 1); const w = start.getUTCDay(); if (w !== 0 && w !== 6) c++; } avisos.push('Prazo em dias úteis: data aproximada (feriados não considerados).'); }
        else start.setUTCDate(start.getUTCDate() + n - 1);
        return { iso: start.toISOString().slice(0, 10), avisos };
    }
    if (dur) avisos.push('O aviso indica uma duração sem data de início clara: confirma o prazo.');
    return { iso: null, avisos };
}

export function analisarRegras(texto, { tipo = 'concurso', dataRef = new Date() } = {}) {
    const lista = itens(texto); const achados = new Map(); const avisos = [];
    for (const it of lista) {
        const n = norm(it); const presentes = REGRAS.filter(r => r.re.test(n));
        if (!presentes.length) continue;
        const pos = presentes.map(r => ({ r, i: n.search(r.re) })).sort((a, b) => a.i - b.i);
        const cls = clausulas(it).map(c => ({ c, n: norm(c) }));
        for (const { r } of pos) {
            const mesmo = presentes.length === 1 ? n : (cls.find(x => r.re.test(x.n))?.n ?? n);
            let aut = RE_AUTENT.test(mesmo); let rec = RE_RECONH.test(mesmo);
            if (!aut && presentes.length > 1 && /(documento de identificacao|bilhete de identidade)[^;.]*?certificado[^;.]*?autenticad/.test(n) && (r.id === 'bi' || r.id === 'certificado')) aut = true;
            if (!rec && r.id === 'requerimento' && RE_RECONH.test(n) && cls.filter(x => REGRAS.some(q => q.re.test(x.n))).length <= 1) rec = true;
            const prev = achados.get(r.id) || { id: r.id, obrigatorio: true, autenticado: false, reconhecida: false, fonte: corta(it) };
            prev.autenticado ||= aut; prev.reconhecida ||= rec;
            if (RE_OPCIONAL.test(n)) { prev.obrigatorio = false; prev.confirmar = true; }
            achados.set(r.id, prev);
        }
    }
    const docs = [...achados.values()];
    // requerimento com assinatura reconhecida → também precisa da versão assinada digitalizada
    const req = docs.find(d => d.id === 'requerimento');
    if (req?.reconhecida) docs.push({ id: 'requerimento_assinado', obrigatorio: true, autenticado: false, reconhecida: false, fonte: req.fonte });
    for (const d of docs) {
        d.como = d.id === 'requerimento_assinado' ? COMO_RECONH : d.autenticado ? COMO_AUTENT : COMO[d.id];
        if (d.id === 'requerimento' && d.reconhecida) d.como = 'Preenchemos o requerimento por ti. Depois: imprime, assina e reconhece a assinatura no notário.';
        if (d.id === 'honra' && d.reconhecida) d.como = 'Preenchemos a declaração. A assinatura tem de ser reconhecida por notário.';
        if (d.id === 'requerimento_assinado') d.nota = 'Requerimento impresso, assinado e com assinatura reconhecida.';
    }
    // sugeridos (não pedidos no aviso mas úteis)
    const tem = (id) => docs.some(d => d.id === id);
    if (!tem('cv')) docs.push({ id: 'cv', obrigatorio: false, sugerido: true, como: COMO.cv, nota: 'Não referido no aviso — útil a anexar.' });
    if (tipo === 'privada' && !tem('carta')) docs.push({ id: 'carta', obrigatorio: false, sugerido: true, como: COMO.carta });
    docs.sort((a, b) => DOCS.indexOf(a.id) - DOCS.indexOf(b.id));

    const email = extrairEmail(texto);
    const { iso: prazoIso, avisos: avP } = extrairPrazo(texto, dataRef); avisos.push(...avP);
    const nt = norm(texto);
    let canal = email && /electronic|e-?mail|correio electronico|via electronica/.test(nt) ? 'email'
        : /envelope|secretaria|entregues? (na|no|em maos)|presencial|balcao/.test(nt) ? 'presencial'
        : /portal|plataforma|formulario online|link/.test(nt) ? 'portal' : email ? 'email' : 'presencial';
    const declaracoes = [];
    if (/aposentad/.test(nt)) declaracoes.push('não me encontro na situação de aposentado(a)');
    if (/expuls[oa].{0,40}aparelho do estado/.test(nt)) declaracoes.push('não fui expulso(a) do Aparelho do Estado');
    if (/reune os requisitos legais|reuno os requisitos/.test(nt)) declaracoes.push('reúno os requisitos legais exigidos para o provimento da vaga');
    const requisitos = lista.filter(i => /(\d{1,2}\.?\s*[aª]?\s*classe|nacionalidade|cidadao mocambicano|anos de idade|maior de 18)/.test(norm(i)) && !REGRAS.some(r => r.re.test(norm(i)))).map(i => corta(i, 200)).slice(0, 6);
    const etapasItem = lista.find(i => /etapas/.test(norm(i)) && /prova|entrevista/.test(norm(i)));
    const etapas = etapasItem ? etapasItem.split(/,|\be\b por fim/i).map(s => s.replace(/^.*?(compo[ée]\w* de etapas[^:]*:|nomeadamente)/i, '').trim()).filter(s => s.length > 3 && s.length < 80).slice(0, 8) : [];

    const pedidos = docs.filter(d => !d.sugerido).length;
    let confianca = Math.min(1, (Math.min(pedidos, 5) / 5) * 0.5 + (tem('requerimento') || tipo === 'privada' ? 0.15 : 0) + (tem('cv') && !docs.find(d => d.id === 'cv')?.sugerido ? 0.1 : 0) + (email || canal !== 'email' ? 0.1 : 0) + (prazoIso ? 0.1 : 0) + (tem('bi') ? 0.05 : 0));
    if (pedidos === 0) { avisos.push('Não foi possível identificar documentos no texto: rever manualmente.'); confianca = Math.min(confianca, 0.2); }
    if (!prazoIso) avisos.push('Prazo não identificado.');
    return { docs, email, canal, prazoIso, declaracoes, requisitos, etapas, avisos, confianca: Math.round(confianca * 100) / 100, fonteAnalise: 'regras' };
}

// ───────────── IA opcional (Claude) — a saída é VALIDADA contra o texto ─────────────
export async function analisarIA(texto, ctx = {}) {
    const key = getEnv('ANTHROPIC_API_KEY'); if (!key) return null;
    const prompt = `És um analista de avisos de concursos e vagas em Moçambique. Lê o AVISO e devolve APENAS JSON válido:
{"docs":[{"id":"<um de: ${DOCS.join('|')}>","obrigatorio":bool,"autenticado":bool,"reconhecida":bool,"fonte":"<excerto LITERAL do aviso, máx 160 chars>"}],
 "categorias":[{"id":"slug","nome":"","habilitacao":"","vagas":number|null}],"locais":["províncias/locais de afectação"],
 "email":"","prazoIso":"AAAA-MM-DD|null","declaracoes":["cláusulas da declaração sob compromisso de honra, na 1.ª pessoa"],"requisitos":[""]}
Regras: só documentos que o aviso pede; "autenticado"=fotocópia autenticada; "reconhecida"=assinatura reconhecida por notário; "fonte" tem de existir no texto.
Entidade: ${ctx.entidade || '?'} | Tipo: ${ctx.tipo || '?'}\n\nAVISO:\n${String(texto).slice(0, 24000)}`;
    try {
        const r = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
            body: JSON.stringify({ model: getEnv('ANALISE_MODEL', 'claude-sonnet-5-5'), max_tokens: 2000, messages: [{ role: 'user', content: prompt }] }),
        });
        if (!r.ok) return null;
        const j = await r.json(); const txt = (j.content || []).map(c => c.text || '').join('');
        const out = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
        const nt = norm(texto);
        out.docs = (out.docs || []).filter(d => DOCS.includes(d.id) && d.fonte && nt.includes(norm(d.fonte).slice(0, 40)));
        return out;
    } catch { return null; }
}

export function fundir(regras, ia) {
    if (!ia) return regras;
    const mapa = new Map(regras.docs.map(d => [d.id, { ...d }]));
    for (const d of ia.docs || []) {
        const p = mapa.get(d.id) || { id: d.id, obrigatorio: d.obrigatorio !== false, como: COMO[d.id] };
        p.autenticado ||= !!d.autenticado; p.reconhecida ||= !!d.reconhecida; p.fonte ||= d.fonte; p.sugerido = false;
        if (p.autenticado) p.como = COMO_AUTENT;
        mapa.set(d.id, p);
    }
    if (mapa.get('requerimento')?.reconhecida && !mapa.has('requerimento_assinado')) mapa.set('requerimento_assinado', { id: 'requerimento_assinado', obrigatorio: true, como: COMO_RECONH, nota: 'Requerimento impresso, assinado e com assinatura reconhecida.' });
    return {
        ...regras, docs: [...mapa.values()].sort((a, b) => DOCS.indexOf(a.id) - DOCS.indexOf(b.id)),
        email: regras.email || ia.email || null, prazoIso: regras.prazoIso || (/^\d{4}-\d{2}-\d{2}$/.test(ia.prazoIso || '') ? ia.prazoIso : null),
        declaracoes: regras.declaracoes.length ? regras.declaracoes : (ia.declaracoes || []).slice(0, 4),
        categorias: ia.categorias || [], locais: ia.locais || [], requisitos: regras.requisitos.length ? regras.requisitos : (ia.requisitos || []).slice(0, 6),
        confianca: Math.min(1, regras.confianca + 0.1), fonteAnalise: 'regras+ia',
    };
}

export async function analisarAviso(texto, ctx = {}) {
    const regras = analisarRegras(texto, ctx);
    const ia = await analisarIA(texto, ctx);
    return fundir(regras, ia);
}
