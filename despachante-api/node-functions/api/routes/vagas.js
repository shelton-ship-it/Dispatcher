import { listarPublicas, obterPublica } from '../lib/vagas-repo.js';
import { precos, DOCS } from '../lib/catalog.js';
import { limite, ipDe } from '../lib/ratelimit.js';

const CACHE = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600';
export default function vagasRoutes(app) {
    // Uma só chamada traz a lista + preços (o frontend guarda em cache local e revalida em segundo plano).
    app.get('/api/vagas', async (req, res) => {
        if (!limite(`vagas:${ipDe(req)}`, 120, 60_000)) return res.status(429).json({ error: 'rate_limited' });
        try {
            const vagas = await listarPublicas({ tipo: req.query.tipo, q: String(req.query.q || '').slice(0, 60), limit: req.query.limit, offset: req.query.offset });
            res.set('Cache-Control', CACHE).json({ vagas, config: { precos: precos(), docs: DOCS }, ts: Date.now() });
        } catch (e) { console.error('[vagas]', e.message); res.status(500).json({ error: 'erro_interno' }); }
    });
    app.get('/api/vagas/:id', async (req, res) => {
        if (!limite(`vaga:${ipDe(req)}`, 120, 60_000)) return res.status(429).json({ error: 'rate_limited' });
        try {
            const v = await obterPublica(String(req.params.id).slice(0, 80));
            if (!v) return res.status(404).json({ error: 'nao_encontrada' });
            res.set('Cache-Control', CACHE).json({ vaga: v });
        } catch (e) { console.error('[vaga]', e.message); res.status(500).json({ error: 'erro_interno' }); }
    });
}
