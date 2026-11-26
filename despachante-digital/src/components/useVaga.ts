'use client';
import { useEffect, useState } from 'react';
import { buscarVaga, vagaEmCache } from '@/lib/api';
import { carregarVagasCustom } from '@/lib/vagas';
import type { Vaga } from '@/lib/types';

/** Mostra logo o que há em cache/local e actualiza em segundo plano com a versão mais recente da API. */
export function useVaga(id: string) {
  const [vaga, setVaga] = useState<Vaga | undefined>(undefined);
  const [done, setDone] = useState(false);
  useEffect(() => {
    let off = false;
    const local = carregarVagasCustom().find(v => v.id === id);
    if (local) { setVaga(local); setDone(true); return; }
    const c = vagaEmCache(id); if (c) { setVaga(c); setDone(true); }
    buscarVaga(id).then(v => { if (off) return; if (v) setVaga(v); setDone(true); });
    return () => { off = true; };
  }, [id]);
  return { vaga, done };
}
