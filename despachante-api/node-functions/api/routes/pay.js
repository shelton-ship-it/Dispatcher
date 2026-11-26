// Pagamentos M-Pesa / e-Mola (Debito Pay) com registo em Turso. Webhook + reconciliação por referência.
import crypto from 'node:crypto';
import { getEnv } from '../lib/env.js';
import { execute, getOne, getAll } from '../lib/turso.js';
import { garantirSchema } from '../lib/schema.js';
import { DOCS, calcularPreco, maskFromDocs, vagaCode } from '../lib/catalog.js';
import { criarReferencia, lerReferencia, criarToken } from '../lib/token.js';
import { criarDebito, estadoPorId, interpretarEstado, mensagemErro, debitopayConfigurado, metodoDisponivel, verificarAssinaturaWebhook, idDoPagamento, lerEvento } from '../lib/debitopay.js';
import { limite, ipDe } from '../lib/ratelimit.js';

const localMsisdn = (raw) => { let d = String(raw || '').replace(/\D/g, ''); while (d.length > 9 && d.startsWith('258')) d = d.slice(3); return d; };
const operador = (n) => (/^8[45]\d{7}$/.test(n) ? 'mpesa' : /^8[67]\d{7}$/.test(n) ? 'emola' : /^8[23]\d{7}$/.test(n) ? 'mkesh' : null);
const mascara = (n) => `${n.slice(0, 2)}•••••${n.slice(-2)}`;
const demo = () => getEnv('PAYMENT_MODE', 'live').toLowerCase() === 'demo';
const bad = (res, msg, st = 400) => res.status(st).json({ ok: false, message: msg });

async function marcarPago(ref, providerId) {
    await execute(`UPDATE dd_pagamentos SET status='paid', provider_id=COALESCE(?, provider_id), pago_em=COALESCE(pago_em, CURRENT_TIMESTAMP) WHERE reference=?`, [providerId || null, ref]);
}
const tokenDe = (ref, info) => criarToken({ vaga: info.vc, scope: info.scope, mask: info.mask, ref }).token;

/** Estado actual de uma referência: BD primeiro; se pendente, pergunta à Debito Pay (reconciliação). */
async function resolver(reference) {
    const info = lerReferencia(reference); if (!info) return { http: 400, body: { ok: false, message: 'Código de recibo inválido.' } };
    await garantirSchema();
    let row = await getOne('SELECT * FROM dd_pagamentos WHERE reference = ?', [reference]);
    if (row?.status === 'paid') return { http: 200, body: { ok: true, status: 'paid', token: tokenDe(reference, info), vaga: info.vc } };
    if (row?.status === 'failed') return { http: 200, body: { ok: true, status: 'failed', message: 'Pagamento recusado ou cancelado.' } };
    if (demo()) { if (!row) await execute(`INSERT INTO dd_pagamentos (reference,vaga_code,scope,mask,valor,status) VALUES (?,?,?,?,?,'pending')`, [reference, info.vc, info.scope, info.mask, 0]); await marcarPago(reference, 'demo'); return { http: 200, body: { ok: true, status: 'paid', token: tokenDe(reference, info), vaga: info.vc } }; }
    if (!row) return { http: 404, body: { ok: false, message: 'Pagamento não encontrado.' } };
    if (!row.provider_id) return { http: 200, body: { ok: true, status: 'pending' } };
    const r = await estadoPorId(row.provider_id);   // a Debito Pay consulta pelo payment_id, não pela nossa referência
    if (r.timedOut || r.net || r.http >= 500 || r.http === 404) return { http: 200, body: { ok: true, status: 'pending' } };
    const st = interpretarEstado(r.data);
    if (st === 'paid') { await marcarPago(reference, row.provider_id); return { http: 200, body: { ok: true, status: 'paid', token: tokenDe(reference, info), vaga: info.vc } }; }
    if (st === 'failed') { await execute(`UPDATE dd_pagamentos SET status='failed' WHERE reference=? AND status='pending'`, [reference]); return { http: 200, body: { ok: true, status: 'failed', message: mensagemErro(r.data, 'Pagamento recusado ou cancelado.') } }; }
    return { http: 200, body: { ok: true, status: 'pending' } };
}

export default function payRoutes(app, express) {
    app.post('/api/pay/charge', async (req, res) => {
        if (!limite(`charge:${ipDe(req)}`, 8, 10 * 60_000)) return bad(res, 'Demasiadas tentativas. Espera uns minutos.', 429);
        try {
            const b = req.body || {}; const vc = vagaCode(b.vagaId); const scope = b.scope === 'docs' ? 'docs' : 'tudo';
            const docs = Array.isArray(b.docs) ? b.docs.filter(d => DOCS.includes(d)) : [];
            if (!vc) return bad(res, 'Vaga inválida.');
            if (scope === 'docs' && !docs.length) return bad(res, 'Escolhe pelo menos um documento.');
            const msisdn = localMsisdn(b.msisdn); const metodo = operador(msisdn);
            if (!metodo) return bad(res, 'Número inválido. Usa M-Pesa (84/85), e-Mola (86/87) ou mKesh (82/83), com 9 dígitos.');
            await garantirSchema();
            const valor = calcularPreco(scope, docs.length); const mask = scope === 'tudo' ? 0 : maskFromDocs(docs);
            // Sem tempos de espera: cada tentativa envia SEMPRE um novo pedido ao telemóvel (PIN errado, popup que não apareceu…).
            // Só um duplo-toque no mesmo instante (< 2 s) reutiliza a referência. Pagamentos duplicados são devolvidos à mão;
            // as tentativas anteriores ainda pendentes vão em `anteriores` para o cliente as continuar a verificar (recibo nunca se perde).
            const pend = await getAll(`SELECT reference, CAST(strftime('%s','now') AS INTEGER) - CAST(strftime('%s',criado_em) AS INTEGER) AS idade FROM dd_pagamentos WHERE vaga_code=? AND msisdn_mask=? AND scope=? AND mask=? AND status='pending' AND criado_em > datetime('now','-10 minutes') ORDER BY criado_em DESC LIMIT 3`, [vc, mascara(msisdn), scope, mask]);
            if (pend[0] && Number(pend[0].idade) < 2) return res.json({ ok: true, status: 'pending', reference: pend[0].reference, valor, anteriores: pend.slice(1).map(x => x.reference) });
            const anteriores = pend.map(x => x.reference);
            const ref = criarReferencia(vc, scope, mask);
            await execute(`INSERT INTO dd_pagamentos (reference,vaga_code,scope,mask,valor,metodo,msisdn_mask,status) VALUES (?,?,?,?,?,?,?,'pending')`, [ref, vc, scope, mask, valor, metodo, mascara(msisdn)]);
            if (demo()) { await marcarPago(ref, 'demo'); return res.json({ ok: true, status: 'paid', reference: ref, token: tokenDe(ref, lerReferencia(ref)), valor, demo: true }); }
            if (!debitopayConfigurado() || !metodoDisponivel(metodo)) return bad(res, 'Este método de pagamento ainda não está disponível.', 503);
            // Falha transitória do provedor (não de configuração/valor): repete até 2× em 1,2 s, para o popup do PIN chegar sem o cliente esperar.
            const fatal = (d) => /INVALID_API_KEY|WALLET_|Invalid amount|Missing required|Unsupported/i.test(String(d?.error ?? d?.message ?? ''));
            let r = await criarDebito({ valor, referencia: ref, metodo, msisdn, descricao: `Despachante Digital ${vc}` });
            for (let i = 0; i < 2 && !r.ok && !r.timedOut && interpretarEstado(r.data) !== 'paid' && !fatal(r.data); i++) {
                await new Promise(ok => setTimeout(ok, 1200));
                r = await criarDebito({ valor, referencia: ref, metodo, msisdn, descricao: `Despachante Digital ${vc}` });   // mesma referência = mesma X-Idempotency-Key
            }
            if (r.net) return bad(res, 'Não foi possível contactar o serviço de pagamento. Tenta de novo.', 502);
            if (r.timedOut) return res.json({ ok: true, status: 'pending', reference: ref, valor, anteriores });
            const pid = idDoPagamento(r.data); if (pid) await execute(`UPDATE dd_pagamentos SET provider_id=? WHERE reference=?`, [pid, ref]);
            const st = interpretarEstado(r.data);
            if (!r.ok && st !== 'paid') { await execute(`UPDATE dd_pagamentos SET status='failed' WHERE reference=?`, [ref]); return bad(res, mensagemErro(r.data), r.http >= 500 ? 502 : 400); }
            if (st === 'paid') { await marcarPago(ref, idDoPagamento(r.data)); return res.json({ ok: true, status: 'paid', reference: ref, token: tokenDe(ref, lerReferencia(ref)), valor }); }
            if (st === 'failed') { await execute(`UPDATE dd_pagamentos SET status='failed' WHERE reference=?`, [ref]); return bad(res, mensagemErro(r.data, 'Pagamento recusado ou cancelado.')); }
            res.json({ ok: true, status: 'pending', reference: ref, valor, anteriores });
        } catch (e) { console.error('[pay/charge]', e.message); bad(res, 'Erro ao iniciar o pagamento.', 500); }
    });

    // GET: usado para acompanhar E para recuperar um recibo perdido.
    app.get('/api/pay/status/:reference', async (req, res) => {
        if (!limite(`status:${ipDe(req)}`, 90, 10 * 60_000)) return bad(res, 'Demasiados pedidos.', 429);
        try { const r = await resolver(String(req.params.reference).trim()); res.set('Cache-Control', 'no-store').status(r.http).json(r.body); }
        catch (e) { console.error('[pay/status]', e.message); bad(res, 'Erro ao verificar.', 500); }
    });

    // Webhook Debito Pay: confirma e-Mola (assíncrono) mesmo que o cliente feche o browser. Liga-se ao pagamento pelo payment_id.
    app.post('/api/webhooks/debitopay', async (req, res) => {
        try {
            const raw = req.rawBody || JSON.stringify(req.body || {});
            if (!verificarAssinaturaWebhook(raw, req.headers['x-webhook-signature'], getEnv('DEBITOPAY_WEBHOOK_SECRET'))) return res.status(400).json({ error: 'invalid_signature' });
            const { evento: ev, id: pid, referencia: srcRef, dados: data } = lerEvento(req.body);
            await garantirSchema();
            const key = ev && (pid || srcRef) ? `${ev}:${pid || srcRef}` : `raw:${crypto.createHash('sha256').update(raw).digest('hex')}`;
            if (await getOne('SELECT id FROM dd_eventos WHERE id=?', [key])) return res.json({ received: true, duplicate: true });
            if (!/^payment\.(completed|failed)$/.test(ev)) return res.json({ received: true });   // refunded/chargeback: não alteram recibos
            let row = pid ? await getOne('SELECT reference FROM dd_pagamentos WHERE provider_id=?', [pid]) : null;
            if (!row && srcRef && lerReferencia(srcRef)) row = { reference: srcRef };
            // Sem ligação ao pagamento (ex.: o pedido de cobrança deu timeout e o payment_id não chegou a ser guardado):
            // liga ao único pendente sem payment_id com o mesmo valor e método, criado na última hora. Ambíguo/nenhum → 404:
            // a Debito Pay repete a entrega (até 24 h) e fica no log para revisão manual — um pagamento nunca fica sem recibo calado.
            if (!row && pid) {
                const c = await getAll(`SELECT reference FROM dd_pagamentos WHERE status='pending' AND provider_id IS NULL AND valor=? AND metodo=? AND criado_em > datetime('now','-1 hour')`, [Number(data.amount), String(data.method || '').toLowerCase()]);
                if (c.length === 1) { row = c[0]; await execute(`UPDATE dd_pagamentos SET provider_id=? WHERE reference=?`, [pid, row.reference]); }
            }
            if (!row) { console.error('[webhook] pagamento sem correspondência', ev, pid); return res.status(404).json({ received: false, error: 'payment_not_found' }); }
            if (ev === 'payment.completed') await marcarPago(row.reference, pid);
            else await execute(`UPDATE dd_pagamentos SET status='failed' WHERE reference=? AND status='pending'`, [row.reference]);
            await execute('INSERT INTO dd_eventos (id) VALUES (?)', [key]);
            res.json({ received: true, ok: true });
        } catch (e) { console.error('[webhook]', e.message); res.status(500).json({ error: 'erro_interno' }); }
    });
}
