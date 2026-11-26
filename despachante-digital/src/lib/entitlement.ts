'use client';
import type { DocId } from './types';
import { docsFromMask } from './docs';

export type TokenInfo = { v: 1; vaga: string; scope: 'tudo' | 'docs'; mask: number; exp: number; ref: string };
export type TokenGuardado = { token: string; recibo: string; info: TokenInfo };
const K = 'dd:tokens:v1';
const K_PEND = 'dd:pending:v1';

export const vagaCode = (id: string) => id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24);
const b64uToBytes = (s: string) => { const b = atob(s.replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, c => c.charCodeAt(0)); };
const b64ToBytes = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));

let keyP: Promise<CryptoKey | null> | null = null;
function publicKey() {
  if (!keyP) keyP = (async () => {
    const raw = process.env.NEXT_PUBLIC_TOKEN_PUBKEY;
    if (!raw || !crypto?.subtle) return null;
    try { return await crypto.subtle.importKey('spki', b64ToBytes(raw), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']); } catch { return null; }
  })();
  return keyP;
}

/** Verifica o recibo NO TELEMÓVEL (ECDSA P-256) — não gasta nenhum pedido ao servidor. */
export async function verificarToken(token: string): Promise<TokenInfo | null> {
  try {
    const [pl, sig] = token.split('.'); if (!pl || !sig) return null;
    const key = await publicKey(); if (!key) return null;
    const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, b64uToBytes(sig), new TextEncoder().encode(pl));
    if (!ok) return null;
    const info = JSON.parse(new TextDecoder().decode(b64uToBytes(pl))) as TokenInfo;
    if (info.exp * 1000 < Date.now()) return null;
    return info;
  } catch { return null; }
}

export function tokensGuardados(): TokenGuardado[] { try { return JSON.parse(localStorage.getItem(K) || '[]'); } catch { return []; } }
export async function guardarToken(token: string, recibo: string) {
  const info = await verificarToken(token); if (!info) return false;
  const all = tokensGuardados().filter(t => t.token !== token);
  all.push({ token, recibo, info });
  try { localStorage.setItem(K, JSON.stringify(all)); } catch { return false; }
  return true;
}

export type Permissoes = { tudo: boolean; docs: Set<DocId>; tokens: TokenGuardado[] };
export async function permissoes(vagaId: string): Promise<Permissoes> {
  const vc = vagaCode(vagaId); const docs = new Set<DocId>(); let tudo = false; const tokens: TokenGuardado[] = [];
  for (const t of tokensGuardados()) {
    const info = await verificarToken(t.token);
    if (!info || info.vaga !== vc) continue;
    tokens.push(t);
    if (info.scope === 'tudo') tudo = true; else docsFromMask(info.mask).forEach(d => docs.add(d));
  }
  return { tudo, docs, tokens };
}
export const temAcesso = (p: Permissoes | null, id: DocId) => !!p && (p.tudo || p.docs.has(id));

export type Pendente = { reference: string; vagaId: string; scope: 'tudo' | 'docs'; docs: DocId[]; valor: number; ts: number };
export const lerPendente = (): Pendente | null => { try { const v = JSON.parse(localStorage.getItem(K_PEND) || 'null'); return v && Date.now() - v.ts < 6 * 3600e3 ? v : null; } catch { return null; } };
export const guardarPendente = (p: Pendente | null) => { try { p ? localStorage.setItem(K_PEND, JSON.stringify(p)) : localStorage.removeItem(K_PEND); } catch { /* ignore */ } };
