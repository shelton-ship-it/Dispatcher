'use client';
import type { Vaga, VagaResumo } from './types';
import { aplicarPrecos } from './pricing';
import seedAt from './seed-at.json';

export const API = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
export async function apiJson<T = any>(path: string, init?: RequestInit & { timeoutMs?: number }): Promise<{ ok: boolean; status: number; data: T }> {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), init?.timeoutMs ?? 35_000);
  try {
    const r = await fetch(`${API}${path}`, { ...init, signal: ctrl.signal, headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers } });
    let data: any = null; try { data = await r.json(); } catch { /* vazio */ }
    return { ok: r.ok, status: r.status, data };
  } finally { clearTimeout(t); }
}

// ── Vagas: cache local (stale-while-revalidate) + cópia offline da AT. Zero deploys por vaga. ──
const K_LISTA = 'dd:vagas:v3'; const K_VAGA = (id: string) => `dd:vaga:${id}:v3`; const TTL = 10 * 60_000;
export const SEED: Vaga[] = [seedAt as unknown as Vaga];
export const seedResumo = (v: Vaga): VagaResumo => ({ id: v.id, tipo: v.tipo, entidade: v.entidade, sigla: v.sigla, titulo: v.titulo, provincia: v.provincia, prazoIso: v.prazoIso ?? null, nDocs: v.docs.filter(d => !d.sugerido).length, canal: v.canal, categorias: (v.categorias || []).map(c => c.nome) });

const lerCache = <T,>(k: string): { ts: number; v: T } | null => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const gravarCache = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify({ ts: Date.now(), v })); } catch { /* cheio */ } };

export function listaEmCache(): VagaResumo[] { return lerCache<VagaResumo[]>(K_LISTA)?.v ?? SEED.map(seedResumo); }
export async function revalidarLista(force = false): Promise<VagaResumo[] | null> {
  const c = lerCache<VagaResumo[]>(K_LISTA);
  if (!force && c && Date.now() - c.ts < TTL) return null;
  try {
    const r = await apiJson<{ vagas: VagaResumo[]; config?: { precos?: { tudo: number; doc: number } } }>('/api/vagas?limit=100', { timeoutMs: 12_000 });
    if (!r.ok || !Array.isArray(r.data?.vagas)) return null;
    aplicarPrecos(r.data.config?.precos); gravarCache(K_LISTA, r.data.vagas); return r.data.vagas;
  } catch { return null; }
}
export function vagaEmCache(id: string): Vaga | undefined { return lerCache<Vaga>(K_VAGA(id))?.v ?? SEED.find(v => v.id === id); }
export async function buscarVaga(id: string): Promise<Vaga | null> {
  try {
    const r = await apiJson<{ vaga: Vaga }>(`/api/vagas/${encodeURIComponent(id)}`, { timeoutMs: 12_000 });
    if (r.ok && r.data?.vaga) { gravarCache(K_VAGA(id), r.data.vaga); return r.data.vaga; }
  } catch { /* offline: usa cache */ }
  return null;
}
