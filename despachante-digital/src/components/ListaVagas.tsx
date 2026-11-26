'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { listaEmCache, revalidarLista, seedResumo } from '@/lib/api';
import { carregarVagasCustom, prazoRestante } from '@/lib/vagas';
import { lerIndex, IndexItem } from '@/lib/store';
import type { VagaResumo } from '@/lib/types';
import { PRECOS } from '@/lib/pricing';

export default function ListaVagas() {
  const [aba, setAba] = useState<'concurso' | 'privada'>('concurso');
  const [q, setQ] = useState('');
  const [remotas, setRemotas] = useState<VagaResumo[]>([]);
  const [custom, setCustom] = useState<VagaResumo[]>([]);
  const [recentes, setRecentes] = useState<IndexItem[]>([]);
  const [aActualizar, setAct] = useState(true);
  const [, tick] = useState(0);
  useEffect(() => {
    setCustom(carregarVagasCustom().map(v => ({ ...seedResumo(v), custom: true })));
    setRecentes(lerIndex()); setRemotas(listaEmCache());
    revalidarLista().then(v => { if (v) setRemotas(v); setAct(false); tick(x => x + 1); });
  }, []);
  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return [...custom, ...remotas].filter(v => v.tipo === aba && (!t || `${v.entidade} ${v.titulo}`.toLowerCase().includes(t)))
      .filter(v => { const p = prazoRestante(v.prazoIso); return !p || p.dias >= 0; });
  }, [aba, q, custom, remotas]);

  return (
    <div className="space-y-6">
      {recentes.length > 0 && (
        <section aria-label="Continuar">
          <h2 className="font-bold mb-2">Continuar onde ficaste</h2>
          <div className="space-y-2">
            {recentes.slice(0, 3).map(r => (
              <Link key={r.vagaId} href={`/candidatura/${r.vagaId}`} className="card flex items-center justify-between hover:border-verde">
                <span className="min-w-0"><span className="block font-semibold truncate">{r.titulo}</span><span className="block text-[13px] text-mute truncate">{r.entidade} · passo {r.passo + 1}</span></span>
                <span className="btn-primary btn-sm shrink-0">Continuar</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div role="tablist" className="grid grid-cols-2 gap-1 rounded-2xl bg-white border border-line p-1 mb-3">
          {([['concurso', 'Concursos públicos'], ['privada', 'Vagas privadas']] as const).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={aba === k} onClick={() => setAba(k)} className={`min-h-[46px] rounded-xl text-[15px] font-bold ${aba === k ? 'bg-verde text-white' : 'text-mute'}`}>{l}</button>
          ))}
        </div>
        <input className="input mb-3" type="search" placeholder="Procurar entidade ou cargo" value={q} onChange={e => setQ(e.target.value)} />
        <div className="space-y-3">
          {lista.map(v => {
            const p = prazoRestante(v.prazoIso);
            return (
              <Link key={v.id} href={`/vaga/${v.id}`} className="card block hover:border-verde">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold leading-snug">{v.titulo || v.entidade}</p>
                    <p className="text-sm text-mute mt-0.5">{v.entidade}{v.provincia ? ` · ${v.provincia}` : ''}</p>
                  </div>
                  {v.custom ? <span className="chip shrink-0">Minha</span> : p && <span className={`chip shrink-0 ${p.urgente ? '!bg-sol-soft !border-sol font-bold' : ''}`}>{p.txt}</span>}
                </div>
                {v.categorias?.length > 0 && <p className="text-[13px] mt-2">{v.categorias.join(' · ')}</p>}
                <p className="text-[13px] text-mute mt-1">{v.nDocs} documentos · {v.canal === 'email' ? 'candidatura por email' : v.canal === 'whatsapp' ? 'por WhatsApp' : v.canal === 'portal' ? 'por portal' : 'entrega presencial'}</p>
              </Link>
            );
          })}
          {lista.length === 0 && <p className="card text-mute text-sm">{aActualizar ? 'A procurar vagas…' : 'Ainda não há vagas nesta lista. Cria a tua candidatura abaixo — leva um minuto.'}</p>}
        </div>
      </section>

      <section className="card bg-verde-soft border-verde/30">
        <h2 className="font-bold">Não encontras a tua vaga?</h2>
        <p className="text-sm text-mute mt-1 mb-3">Diz-nos a entidade e o cargo e preparamos os documentos certos.</p>
        <div className="grid sm:grid-cols-2 gap-2">
          <Link href="/nova?tipo=concurso" className="btn-primary">Outro concurso público</Link>
          <Link href="/nova?tipo=privada" className="btn-ghost">Outra vaga privada</Link>
        </div>
      </section>

      <section className="card">
        <h2 className="font-bold mb-2">Quanto custa</h2>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl bg-sol-soft p-3"><p className="text-2xl font-extrabold">{PRECOS.tudo} MZN</p><p className="text-[13px]">Todos os documentos da candidatura</p></div>
          <div className="rounded-xl bg-paper p-3"><p className="text-2xl font-extrabold">{PRECOS.doc} MZN</p><p className="text-[13px]">Cada documento avulso</p></div>
        </div>
        <p className="hint mt-3">Preencher e ver os documentos é grátis. Só pagas para descarregar ou enviar. Pagamento por M-Pesa, e-Mola ou mKesh.</p>
      </section>
    </div>
  );
}
