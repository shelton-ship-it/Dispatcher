// node-functions/api/[[default]].js — API do Despachante Digital (EdgeOne Pages Node Functions, Express).
// Mesmas regras do teu api-core: sem app.listen(), `export default app`, env via process.env.
import express from 'express';
import helmet from 'helmet';
import { getEnv, getEnvList } from './lib/env.js';
import { ping } from './lib/turso.js';
import vagasRoutes from './routes/vagas.js';
import adminRoutes from './routes/admin.js';
import payRoutes from './routes/pay.js';
import whatsappRoutes from './routes/whatsapp.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS por origem (ALLOWED_ORIGINS=https://despachante.exemplo.co.mz,https://www...). Em dev sem lista: aberto.
app.use((req, res, next) => {
    const lista = getEnvList('ALLOWED_ORIGINS'); const o = req.headers.origin;
    if (o && (lista.includes(o) || (!lista.length && getEnv('NODE_ENV') !== 'production'))) {
        res.set({ 'Access-Control-Allow-Origin': o, Vary: 'Origin', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS', 'Access-Control-Max-Age': '86400' });
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

// JSON pequeno por defeito; guarda o corpo bruto (necessário p/ validar o webhook).
const jsonPadrao = express.json({ limit: '200kb', verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); } });
app.use((req, res, next) => (req.path === '/api/whatsapp/send' || req.path.startsWith('/api/admin/') ? next() : jsonPadrao(req, res, next)));

app.get('/api/health', async (_req, res) => res.set('Cache-Control', 'no-store').json({ ok: true, db: await ping() }));
vagasRoutes(app); adminRoutes(app, express); payRoutes(app, express); whatsappRoutes(app, express);

app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
app.use((err, _req, res, _next) => { console.error('[api]', err?.message); res.status(err?.status || 500).json({ error: 'erro_interno' }); });

export default app;
