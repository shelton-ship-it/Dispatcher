// Cliente Debito Pay (M-Pesa 84/85, e-Mola 86/87) + verificação do webhook.
// Métodos suportados aqui: mpesa (84/85, síncrono), emola (86/87) e mkesh (82/83) — estes dois confirmam por webhook.
// Contrato: https://debito.co.mz/api-docs  (POST /payment-orchestrator; action "process" | "check-status").
// M-Pesa confirma síncrono; e-Mola confirma por webhook (payment.completed / payment.failed) ou por check-status.
import crypto from 'node:crypto';
import { getEnv, getEnvInt } from './env.js';

const origin = () => getEnv('DEBITOPAY_API_URL', 'https://gyqoaningqhurhvdugne.supabase.co/functions/v1').replace(/\/+$/, '');
const carteira = (metodo) => getEnv(`DEBITOPAY_WALLET_CODE_${String(metodo).toUpperCase()}`);
/** Método com carteira configurada (M-Pesa, e-Mola e mKesh têm cada um o seu wallet_code). */
export const metodoDisponivel = (metodo) => !!carteira(metodo);
export const debitopayConfigurado = () => !!(getEnv('DEBITOPAY_API_KEY') && getEnv('DEBITOPAY_MERCHANT_ID'));

async function call(body, { idempotencyKey, timeoutMs = 30000 } = {}) {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const headers = { Authorization: `Bearer ${getEnv('DEBITOPAY_API_KEY')}`, Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'DespachanteDigital/1.0' };
        if (idempotencyKey) headers['X-Idempotency-Key'] = idempotencyKey;
        const r = await fetch(`${origin()}/payment-orchestrator`, { method: 'POST', signal: ctrl.signal, headers, body: JSON.stringify(body) });
        let data = null; try { data = await r.json(); } catch { /* vazio */ }
        return { http: r.status, ok: r.ok && data?.success !== false, data, timedOut: false, net: null };
    } catch (e) {
        if (e?.name === 'AbortError') return { http: 0, ok: false, data: null, timedOut: true, net: null };
        return { http: 0, ok: false, data: null, timedOut: false, net: e?.message || 'network_error' };
    } finally { clearTimeout(t); }
}

// A resposta de "process" traz `status` no topo; "check-status" traz `payment.status`; o webhook traz `data`.
const nucleo = (d) => (d && typeof d === 'object' ? (d.payment && typeof d.payment === 'object' ? d.payment : d.data && typeof d.data === 'object' ? d.data : d) : null);
export function interpretarEstado(data) {
    if (!data || typeof data !== 'object') return 'pending';
    if (data.success === false) return 'failed';
    const s = String(nucleo(data)?.status ?? '').toLowerCase();
    if (['success', 'completed', 'paid', 'succeeded'].includes(s)) return 'paid';
    if (['failed', 'expired', 'cancelled', 'canceled', 'rejected'].includes(s)) return 'failed';
    return 'pending';
}
const ERROS = {
    INVALID_API_KEY: 'Pagamentos mal configurados (chave inválida).', WALLET_CODE_NOT_FOUND: 'Pagamentos mal configurados (carteira inexistente).',
    WALLET_DOMAIN_NOT_ALLOWED: 'Pagamentos mal configurados (domínio não autorizado).', 'Invalid amount': 'Valor abaixo do mínimo do método de pagamento.',
};
export function mensagemErro(data, fallback = 'Pagamento recusado.') {
    if (!data || typeof data !== 'object') return fallback;
    const v = data.error ?? data.message ?? data.erro;
    if (typeof v === 'string' && v.trim()) return ERROS[v] || v;
    return fallback;
}
/** Identificador do pagamento na Debito Pay (guardado em dd_pagamentos.provider_id; é o que o check-status e o webhook usam). */
export const idDoPagamento = (data) => data?.payment_id || nucleo(data)?.payment_id || nucleo(data)?.id || null;

/** Cria a cobrança. `msisdn` = 9 dígitos locais; a nossa referência vai em source_id e como X-Idempotency-Key. */
export function criarDebito({ valor, referencia, metodo, msisdn, descricao }) {
    return call({
        action: 'process', payment_method: metodo, merchant_id: getEnv('DEBITOPAY_MERCHANT_ID'), wallet_code: carteira(metodo),
        amount: valor, currency: 'MZN', phone: `258${msisdn}`, source: 'gateway', source_id: referencia,
        ...(descricao ? { description: descricao } : {}),
    }, { idempotencyKey: referencia, timeoutMs: getEnvInt('DEBITOPAY_DEBIT_TIMEOUT_MS', 25000) });
}
export const estadoPorId = (paymentId) => call({ action: 'check-status', payment_id: paymentId }, { timeoutMs: 10000 });

/** Normaliza o webhook → { evento, id (payment_id), referencia (nossa, só se vier source_id), dados } */
export function lerEvento(body) {
    const b = body || {}; const d = b.data && typeof b.data === 'object' ? b.data : b;
    return { evento: String(b.event ?? '').toLowerCase(), id: d.payment_id || null, referencia: d.source_id || null, dados: d };
}

function safeHexEqual(a, b) { try { const x = Buffer.from(a, 'hex'), y = Buffer.from(b, 'hex'); return x.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y); } catch { return false; } }
/** HMAC-SHA256 hex do corpo cru (header x-webhook-signature). Aceita também o formato `t=…,v1=…` e o prefixo `sha256=`. */
export function verificarAssinaturaWebhook(rawBody, header, secret, { toleranceSec = 300, nowMs = Date.now() } = {}) {
    if (!header || !secret || typeof rawBody !== 'string') return false;
    const parts = String(header).trim().split(',').map(s => s.trim());
    const tPart = parts.find(p => p.startsWith('t=')); const v1s = parts.filter(p => p.startsWith('v1=')).map(p => p.slice(3));
    if (tPart && v1s.length) {
        let t = Number(tPart.slice(2)); if (!Number.isFinite(t)) return false; if (t > 1e11) t = Math.floor(t / 1000);
        if (Math.abs(Math.floor(nowMs / 1000) - t) > toleranceSec) return false;
        const exp = crypto.createHmac('sha256', secret).update(`${tPart.slice(2)}.${rawBody}`).digest('hex');
        return v1s.some(s => safeHexEqual(s, exp));
    }
    const bare = String(header).trim().replace(/^sha256=/i, '');
    if (/^[0-9a-f]{64}$/i.test(bare)) return safeHexEqual(bare, crypto.createHmac('sha256', secret).update(rawBody).digest('hex'));
    return false;
}
