// Valores por defeito. O servidor é a autoridade: a API devolve os preços reais em /api/vagas (config) e o
// frontend actualiza este objecto — o cliente nunca decide quanto se paga.
export const MOEDA = 'MZN';
export const PRECOS = { tudo: 65, doc: 35 };
export function aplicarPrecos(p?: { tudo?: number; doc?: number }) { if (p?.tudo) PRECOS.tudo = p.tudo; if (p?.doc) PRECOS.doc = p.doc; }
export function calcularPreco(scope: 'tudo' | 'docs', nDocs: number) { return scope === 'tudo' ? PRECOS.tudo : Math.max(1, nDocs) * PRECOS.doc; }
export const mzn = (v: number) => `${v} MZN`;
