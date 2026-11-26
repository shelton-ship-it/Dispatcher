const hits = new Map();
export function limite(key, max, janelaMs) {
    const now = Date.now(); const arr = (hits.get(key) || []).filter(t => now - t < janelaMs);
    if (arr.length >= max) { hits.set(key, arr); return false; }
    arr.push(now); hits.set(key, arr);
    if (hits.size > 5000) for (const [k, v] of hits) if (!v.some(t => now - t < janelaMs)) hits.delete(k);
    return true;
}
export const ipDe = (req) => String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.ip || 'anon').split(',')[0].trim();
