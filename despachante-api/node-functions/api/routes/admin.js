// Ingestão e revisão de vagas — protegido por ADMIN_TOKEN (para o teu scraper e para correcções manuais).
import crypto from 'node:crypto';
import { getEnv } from '../lib/env.js';
import { ingerir, listarAdmin, obterAdmin, atualizarAdmin } from '../lib/vagas-repo.js';
import { analisarAviso } from '../lib/analise.js';
import { limite, ipDe } from '../lib/ratelimit.js';

function auth(req, res, next) {
    const t = getEnv('ADMIN_TOKEN');
    const h = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const ok = t && h.length === t.length && crypto.timingSafeEqual(Buffer.from(h), Buffer.from(t));
    if (!ok) { limite(`adminfail:${ipDe(req)}`, 1, 1); return res.status(401).json({ error: 'nao_autorizado' }); }
    next();
}
export default function adminRoutes(app, express) {
    const big = express.json({ limit: '3mb' });
    app.post('/api/admin/vagas', big, auth, async (req, res) => {
        try { res.json(await ingerir(req.body, { force: req.query.force === '1' })); }
        catch (e) { res.status(e.status || 500).json({ error: e.message }); }
    });
    // Para o scraper: até 50 itens por chamada; só reanalisa quando o texto mudou.
    app.post('/api/admin/vagas/bulk', big, auth, async (req, res) => {
        const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 50) : [];
        const out = [];
        for (const it of items) { try { out.push({ ok: true, ...(await ingerir(it)) }); } catch (e) { out.push({ ok: false, titulo: it?.titulo, error: e.message }); } }
        res.json({ total: items.length, criadas: out.filter(o => o.criada).length, rascunhos: out.filter(o => o.status === 'rascunho').length, resultados: out });
    });
    app.get('/api/admin/vagas', auth, async (req, res) => res.json({ vagas: await listarAdmin(req.query.status) }));
    app.get('/api/admin/vagas/:id', auth, async (req, res) => { const r = await obterAdmin(req.params.id); r ? res.json(r) : res.status(404).json({ error: 'nao_encontrada' }); });
    app.patch('/api/admin/vagas/:id', big, auth, async (req, res) => { const r = await atualizarAdmin(req.params.id, req.body || {}); r ? res.json({ ok: true, vaga: r }) : res.status(404).json({ error: 'nao_encontrada' }); });
    // Pré-visualização da análise sem gravar (útil para afinar regras)
    app.post('/api/admin/analisar', big, auth, async (req, res) => res.json(await analisarAviso(String(req.body?.texto || ''), { tipo: req.body?.tipo || 'concurso' })));
}
