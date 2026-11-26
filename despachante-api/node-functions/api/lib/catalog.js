// Catálogo de documentos e preços — AUTORIDADE no servidor.
// A ORDEM define o bit de cada documento nos recibos: só acrescentar no FIM.
import { getEnvInt } from './env.js';

export const DOCS = ['requerimento', 'honra', 'carta', 'cv', 'bi', 'nuit', 'certificado', 'registo', 'atestado', 'carta_conducao', 'outro', 'militar', 'requerimento_assinado'];
export const docBit = (id) => DOCS.indexOf(id);
export const maskFromDocs = (ids) => ids.reduce((m, id) => (docBit(id) >= 0 ? m | (1 << docBit(id)) : m), 0);
export const MASK_TUDO = (1 << DOCS.length) - 1;

export function precos() { return { moeda: 'MZN', tudo: getEnvInt('PRECO_TUDO', 65), doc: getEnvInt('PRECO_DOC', 35) }; }
export function calcularPreco(scope, nDocs) { const p = precos(); return scope === 'tudo' ? p.tudo : Math.max(1, nDocs) * p.doc; }
export const vagaCode = (id) => String(id || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 24);
