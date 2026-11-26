// Recibos assinados (ECDSA P-256) + referências de pagamento assinadas (HMAC).
import crypto from 'node:crypto';
import { getEnv } from './env.js';
import { MASK_TUDO } from './catalog.js';

const b64u = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64u = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

function privateKey() {
    const raw = getEnv('TOKEN_PRIVATE_KEY');
    if (!raw) throw new Error('TOKEN_PRIVATE_KEY não configurada (npm run keys).');
    return crypto.createPrivateKey({ key: Buffer.from(raw, 'base64'), format: 'der', type: 'pkcs8' });
}

export function criarToken({ vaga, scope, mask, ref, dias = 60 }) {
    const payload = { v: 1, vaga, scope, mask: scope === 'tudo' ? MASK_TUDO : mask, ref, exp: Math.floor(Date.now() / 1000) + dias * 86400 };
    const pl = b64u(JSON.stringify(payload));
    const sig = crypto.sign('sha256', Buffer.from(pl), { key: privateKey(), dsaEncoding: 'ieee-p1363' });
    return { token: `${pl}.${b64u(sig)}`, info: payload };
}
export function verificarToken(token) {
    try {
        const [pl, sig] = String(token).split('.'); if (!pl || !sig) return null;
        const ok = crypto.verify('sha256', Buffer.from(pl), { key: crypto.createPublicKey(privateKey()), dsaEncoding: 'ieee-p1363' }, fromB64u(sig));
        if (!ok) return null;
        const info = JSON.parse(fromB64u(pl).toString());
        return info.exp * 1000 > Date.now() ? info : null;
    } catch { return null; }
}

function refSig(vc, sm, nonce) {
    const secret = getEnv('REFERENCE_SECRET'); if (!secret) throw new Error('REFERENCE_SECRET não configurado.');
    return crypto.createHmac('sha256', secret).update(`${vc}|${sm}|${nonce}`).digest('hex').slice(0, 12);
}
export function criarReferencia(vc, scope, mask) {
    const sm = scope === 'tudo' ? 'T' : `D${mask.toString(16)}`; const nonce = crypto.randomBytes(4).toString('hex');
    return `DD-${vc}-${sm}-${nonce}-${refSig(vc, sm, nonce)}`;
}
export function lerReferencia(ref) {
    const m = /^DD-([A-Za-z0-9]{1,24})-(T|D[0-9a-f]{1,4})-([0-9a-f]{8})-([0-9a-f]{12})$/.exec(String(ref || '').trim());
    if (!m) return null;
    const [, vc, sm, nonce, sig] = m; const esperado = refSig(vc, sm, nonce);
    if (!crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(sig))) return null;
    return sm === 'T' ? { vc, scope: 'tudo', mask: MASK_TUDO } : { vc, scope: 'docs', mask: parseInt(sm.slice(1), 16) };
}
