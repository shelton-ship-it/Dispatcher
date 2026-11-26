// Envio de UM PDF por WhatsApp (Evolution API). Só com recibo válido que cubra o documento.
import { getEnv } from '../lib/env.js';
import { verificarToken } from '../lib/token.js';
import { DOCS, docBit } from '../lib/catalog.js';
import { limite, ipDe } from '../lib/ratelimit.js';

const local = (raw) => { let d = String(raw || '').replace(/\D/g, ''); while (d.length > 9 && d.startsWith('258')) d = d.slice(3); return d; };
export default function whatsappRoutes(app, express) {
    app.post('/api/whatsapp/send', express.json({ limit: '9mb' }), async (req, res) => {
        const bad = (m, s = 400) => res.status(s).json({ ok: false, message: m });
        const url = getEnv('EVOLUTION_API_URL', '').replace(/\/+$/, ''), inst = getEnv('EVOLUTION_INSTANCE'), key = getEnv('EVOLUTION_API_KEY');
        if (!url || !inst || !key) return bad('Envio por WhatsApp ainda não configurado.', 503);
        const b = req.body || {}; const info = verificarToken(b.token);
        if (!info) return bad('Recibo inválido ou expirado.', 402);
        if (!DOCS.includes(b.doc) || !(info.mask & (1 << docBit(b.doc)))) return bad('Este documento não está incluído no teu pagamento.', 402);
        if (!limite(`wa:${info.ref}`, 40, 24 * 3600_000) || !limite(`waip:${ipDe(req)}`, 60, 3600_000)) return bad('Limite de envios atingido. Tenta mais tarde.', 429);
        const n = local(b.number); if (!/^8[2-7]\d{7}$/.test(n)) return bad('Número de WhatsApp inválido (9 dígitos).');
        const media = String(b.base64 || ''); if (!media || media.length > 7_000_000) return bad('Ficheiro inválido ou demasiado grande.');
        const fileName = String(b.fileName || 'documento.pdf').replace(/[^\w.\-]+/g, '_').slice(0, 90);
        try {
            const r = await fetch(`${url}/message/sendMedia/${encodeURIComponent(inst)}`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: key },
                body: JSON.stringify({ number: `258${n}`, mediatype: 'document', mimetype: 'application/pdf', caption: String(b.caption || '').slice(0, 300), media, fileName }) });
            if (!r.ok) { console.error('[whatsapp]', r.status, (await r.text().catch(() => '')).slice(0, 200)); return bad('O WhatsApp recusou o envio. Confirma o número.', 502); }
            res.json({ ok: true });
        } catch (e) { console.error('[whatsapp]', e.message); bad('Não foi possível contactar o WhatsApp.', 502); }
    });
}
