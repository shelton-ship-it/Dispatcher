'use client';
import { useMemo, useState } from 'react';
import type { Candidatura, Vaga } from '@/lib/types';
import { filterCvStyles, filterOptions, todosEstilos } from '@/lib/cvstyles';
import StyleThumb from '../StyleThumb';
import { Passo } from '../Fields';

const PAGE = 18;
export default function StepModelo({ vaga, cand, setCand }: { vaga: Vaga; cand: Candidatura; setCand: (f: Partial<Candidatura>) => void }) {
  const [q, setQ] = useState(''); const [cor, setCor] = useState(''); const [layout, setLayout] = useState(''); const [dir, setDir] = useState('');
  const [seguro, setSeguro] = useState(vaga.tipo === 'concurso'); const [n, setN] = useState(PAGE);
  const opts = useMemo(() => filterOptions(), []);
  const lista = useMemo(() => {
    const base = filterCvStyles(todosEstilos(), { query: q, color: cor, layout, direction: dir, ats: seguro ? 'Alta' : undefined });
    return base;
  }, [q, cor, layout, dir, seguro]);
  const reset = (f: () => void) => { f(); setN(PAGE); };
  return (
    <Passo titulo="Escolhe o modelo do CV" sub={vaga.tipo === 'concurso' ? 'Em concursos, modelos simples e legíveis costumam ser a melhor escolha.' : 'Podes mudar de modelo a qualquer momento, os teus dados mantêm-se.'}>
      <label className={`card flex items-start gap-3 cursor-pointer ${seguro ? 'border-verde bg-verde-soft/50' : ''}`}>
        <input type="checkbox" className="mt-1 h-5 w-5 accent-[#0B6B4F]" checked={seguro} onChange={e => reset(() => setSeguro(e.target.checked))} />
        <span><b>Só modelos simples e legíveis</b><span className="block text-[13px] text-mute">Fáceis de ler por pessoas e por programas de triagem de CV.</span></span>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <input className="input col-span-2" type="search" placeholder="Procurar (ex.: Corporate, Government, Medical)" value={q} onChange={e => reset(() => setQ(e.target.value))} />
        <select className="input px-2" value={cor} onChange={e => reset(() => setCor(e.target.value))}><option value="">Todas as cores</option>{opts.colors.map(c => <option key={c}>{c}</option>)}</select>
        <select className="input px-2" value={layout} onChange={e => reset(() => setLayout(e.target.value))}><option value="">Todas as estruturas</option>{opts.layouts.map(c => <option key={c}>{c}</option>)}</select>
        <select className="input px-2 col-span-2" value={dir} onChange={e => reset(() => setDir(e.target.value))}><option value="">Todos os estilos</option>{opts.directions.map(c => <option key={c}>{c}</option>)}</select>
      </div>
      <p className="hint">{lista.length.toLocaleString('pt-PT')} modelos. Escolhido: <b>{cand.modelo}</b></p>
      <div className="grid grid-cols-3 gap-2.5">
        {lista.slice(0, n).map(s => (
          <button key={s.id} onClick={() => setCand({ modelo: s.id })} className={`text-left rounded-xl p-1.5 border-2 bg-white ${cand.modelo === s.id ? 'border-verde' : 'border-transparent'}`} aria-pressed={cand.modelo === s.id}>
            <StyleThumb s={s} /><span className="block text-[11px] font-semibold mt-1 leading-tight">{s.id}</span><span className="block text-[11px] text-mute leading-tight">{s.visualDirection} · {s.colorSystem}</span>
          </button>))}
      </div>
      {n < lista.length && <button className="btn-ghost w-full" onClick={() => setN(x => x + PAGE)}>Mostrar mais</button>}
      <div className="card"><p className="label">Páginas do CV</p>
        <div className="grid grid-cols-2 gap-2">{([[1, 'Tentar 1 página'], [2, 'Pode ter 2 páginas']] as const).map(([k, l]) => <button key={k} onClick={() => setCand({ cvPaginas: k })} className={`btn btn-sm ${cand.cvPaginas === k ? 'btn-primary' : 'btn-ghost'}`}>{l}</button>)}</div></div>
    </Passo>
  );
}
