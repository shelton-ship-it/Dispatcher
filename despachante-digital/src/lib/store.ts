'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Candidatura, CvData, DocId, Pessoal, Vaga } from './types';
import { hoje } from './dates';

const K_PROFILE = 'dd:profile:v1';
const K_INDEX = 'dd:index:v1';
const kCand = (id: string) => `dd:cand:${id}:v1`;

export const pessoalVazio = (): Pessoal => ({
  nome: '', sexo: '', nascDia: '', nascMes: '', nascAno: '', nacionalidade: 'Moçambicana', naturalidade: '',
  biNumero: '', biDia: '', biMes: '', biAno: '', biLocal: '', nuit: '', residencia: '', cidade: '', telefone: '', email: '', linkedin: '',
});
export const cvVazio = (): CvData => ({ resumo: '', educacao: [], experiencia: [], competencias: [], idiomas: [{ nome: 'Português', nivel: 'Nativo' }], fotoVer: 0 });
export const novaCandidatura = (vaga: Vaga, localAss = ''): Candidatura => ({
  vagaId: vaga.id, docs: vaga.docs.filter(d => d.obrigatorio).map(d => d.id), campos: {}, localAss,
  dataAss: hoje(), carta: { motivo: '', pontos: [], texto: '', editado: false }, textos: {},
  modelo: 'CV-0001', cvPaginas: 1, scanLayout: {}, scans: {}, passo: 0, criado: Date.now(), atualizado: Date.now(),
});

function ler<T>(k: string, def: T): T { try { const v = localStorage.getItem(k); return v ? { ...(def as any), ...JSON.parse(v) } : def; } catch { return def; } }
function gravar(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } }

export type IndexItem = { vagaId: string; titulo: string; entidade: string; atualizado: number; passo: number };
export function lerIndex(): IndexItem[] { try { return JSON.parse(localStorage.getItem(K_INDEX) || '[]'); } catch { return []; } }
function atualizarIndex(vaga: Vaga, passo: number) {
  const idx = lerIndex().filter(i => i.vagaId !== vaga.id);
  idx.unshift({ vagaId: vaga.id, titulo: vaga.titulo || vaga.entidade, entidade: vaga.entidade, atualizado: Date.now(), passo });
  gravar(K_INDEX, idx.slice(0, 20));
}
export function apagarCandidatura(id: string) {
  try { localStorage.removeItem(kCand(id)); gravar(K_INDEX, lerIndex().filter(i => i.vagaId !== id)); } catch { /* ignore */ }
}
export function lerCandidaturaExistente(id: string): Candidatura | null {
  try { const v = localStorage.getItem(kCand(id)); return v ? JSON.parse(v) : null; } catch { return null; }
}

/** Estado completo do assistente. Tudo é guardado no browser (localStorage + IndexedDB) com atraso de 350 ms. */
export function useCandidatura(vaga: Vaga | undefined) {
  const [ready, setReady] = useState(false);
  const [p, setPState] = useState<Pessoal>(pessoalVazio());
  const [cv, setCvState] = useState<CvData>(cvVazio());
  const [cand, setCandState] = useState<Candidatura | null>(null);
  const [saved, setSaved] = useState<number>(0);
  const timer = useRef<any>(null);
  const latest = useRef({ p, cv, cand });
  latest.current = { p, cv, cand };

  useEffect(() => {
    if (!vaga) return;
    const prof = ler<{ p: Pessoal; cv: CvData }>(K_PROFILE, { p: pessoalVazio(), cv: cvVazio() });
    const existente = lerCandidaturaExistente(vaga.id);
    setPState({ ...pessoalVazio(), ...prof.p });
    setCvState({ ...cvVazio(), ...prof.cv });
    setCandState(existente ? { ...novaCandidatura(vaga), ...existente } : novaCandidatura(vaga, prof.p?.cidade || ''));
    setReady(true);
  }, [vaga?.id]); // eslint-disable-line

  const flush = useCallback(() => {
    const { p, cv, cand } = latest.current;
    if (!vaga || !cand) return;
    gravar(K_PROFILE, { p, cv });
    const c = { ...cand, atualizado: Date.now() };
    gravar(kCand(vaga.id), c);
    atualizarIndex(vaga, c.passo);
    setSaved(Date.now());
  }, [vaga]);

  const agendar = useCallback(() => { clearTimeout(timer.current); timer.current = setTimeout(flush, 350); }, [flush]);
  useEffect(() => { const h = () => flush(); window.addEventListener('pagehide', h); document.addEventListener('visibilitychange', h); return () => { window.removeEventListener('pagehide', h); document.removeEventListener('visibilitychange', h); }; }, [flush]);

  const setP = useCallback((fn: Partial<Pessoal> | ((x: Pessoal) => Pessoal)) => { setPState(x => (typeof fn === 'function' ? fn(x) : { ...x, ...fn })); agendar(); }, [agendar]);
  const setCv = useCallback((fn: Partial<CvData> | ((x: CvData) => CvData)) => { setCvState(x => (typeof fn === 'function' ? fn(x) : { ...x, ...fn })); agendar(); }, [agendar]);
  const setCand = useCallback((fn: Partial<Candidatura> | ((x: Candidatura) => Candidatura)) => { setCandState(x => (x ? (typeof fn === 'function' ? fn(x) : { ...x, ...fn }) : x)); agendar(); }, [agendar]);
  return { ready, p, setP, cv, setCv, cand, setCand, saved, flush };
}

export const uid = () => Math.random().toString(36).slice(2, 9);
export function docsOrdenados(docs: DocId[], ordem: DocId[]) { return ordem.filter(d => docs.includes(d)); }
