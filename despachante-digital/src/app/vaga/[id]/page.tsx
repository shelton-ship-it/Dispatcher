'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useVaga } from '@/components/useVaga';
import { DOC_LIST, DOC_MAP } from '@/lib/docs';
import type { DocId } from '@/lib/types';
import { calcularPreco, PRECOS } from '@/lib/pricing';
import { lerCandidaturaExistente, novaCandidatura, apagarCandidatura } from '@/lib/store';
import { apagarVagaCustom, dataPt, prazoRestante } from '@/lib/vagas';

export default function VagaPage({ params }: { params: { id: string } }) {
  const { vaga, done } = useVaga(params.id);
  const router = useRouter();
  const [sel, setSel] = useState<DocId[]>([]);
  const [existe, setExiste] = useState(false);
  const [cat, setCat] = useState('');
  const vid = vaga?.id;
  useEffect(() => {
    if (!vaga) return;
    const ex = lerCandidaturaExistente(vaga.id);
    setExiste(!!ex);
    setSel(ex?.docs ?? vaga.docs.filter(d => d.obrigatorio).map(d => d.id));
    setCat(ex?.campos?.categoria ?? '');
  }, [vid]); // eslint-disable-line
  const req = useMemo(() => new Map((vaga?.docs ?? []).map(d => [d.id, d])), [vaga]);
  if (!done) return null;
  if (!vaga) return <div className="card">Vaga não encontrada. <Link className="text-verde font-semibold" href="/">Voltar ao início</Link></div>;

  const toggle = (id: DocId) => setSel(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));
  const preco = Math.min(PRECOS.tudo, calcularPreco('docs', sel.length));
  const ordenados = DOC_LIST.map(d => d.id).filter(d => sel.includes(d));
  const prazo = prazoRestante(vaga.prazoIso);
  const categorias = vaga.categorias ?? [];
  const faltaCat = categorias.length > 0 && !cat;
  // documentos pedidos primeiro, depois o resto
  const lista = [...DOC_LIST].sort((a, b) => Number(req.has(b.id)) - Number(req.has(a.id)));

  const comecar = () => {
    const base = lerCandidaturaExistente(vaga.id) ?? novaCandidatura(vaga);
    try { localStorage.setItem(`dd:cand:${vaga.id}:v1`, JSON.stringify({ ...base, docs: ordenados, campos: { ...base.campos, ...(cat ? { categoria: cat } : {}) }, passo: existe ? base.passo : 0 })); } catch { /* ignore */ }
    router.push(`/candidatura/${vaga.id}`);
  };

  return (
    <div className="space-y-5">
      <Link href="/" className="text-sm font-semibold text-verde">← Voltar</Link>
      <section>
        <p className="text-sm text-mute">{vaga.tipo === 'concurso' ? 'Concurso público' : 'Vaga privada'}</p>
        <h1 className="text-2xl font-extrabold leading-tight mt-1">{vaga.titulo || vaga.entidade}</h1>
        <p className="text-mute mt-1">{vaga.entidade}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          {prazo && <span className={`chip ${prazo.urgente ? '!bg-sol-soft !border-sol font-bold' : ''}`}>{prazo.txt} · até {dataPt(vaga.prazoIso!)}</span>}
          <span className="chip">{vaga.canal === 'email' ? `Por email${vaga.contacto?.email ? ': ' + vaga.contacto.email : ''}` : vaga.canal === 'presencial' ? 'Entrega presencial' : vaga.canal === 'portal' ? 'Em portal online' : 'Por WhatsApp'}</span>
        </div>
        {vaga.notas && <p className="card mt-3 text-sm bg-sol-soft border-sol/50">{vaga.notas}</p>}
        {vaga.fonte && <a href={vaga.fonte} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-sm font-semibold text-verde underline">Ver o aviso oficial</a>}
      </section>

      {categorias.length > 0 && (
        <section>
          <h2 className="font-bold">A que categoria concorres?</h2>
          <div className="space-y-2 mt-2">
            {categorias.map(c => (
              <label key={c.id} className={`card flex gap-3 items-start cursor-pointer ${cat === c.nome ? 'border-verde bg-verde-soft/50' : ''}`}>
                <input type="radio" name="cat" checked={cat === c.nome} onChange={() => setCat(c.nome)} className="mt-1 h-5 w-5 accent-[#0B6B4F]" />
                <span><span className="font-semibold">{c.nome}</span>{c.vagas ? <span className="text-[13px] text-mute"> · {c.vagas} vagas</span> : null}{c.habilitacao && <span className="block text-[13px] text-mute">{c.habilitacao}</span>}</span>
              </label>
            ))}
          </div>
        </section>
      )}

      {vaga.requisitos && vaga.requisitos.length > 0 && (
        <details className="card"><summary className="font-bold cursor-pointer">Requisitos do aviso</summary><ul className="list-disc pl-5 mt-2 text-sm space-y-1">{vaga.requisitos.map(r => <li key={r}>{r}</li>)}</ul></details>
      )}

      <section>
        <h2 className="font-bold">Que documentos vais preparar?</h2>
        <p className="hint mb-3">Marcámos o que o aviso pede. Os passos a seguir dependem desta escolha.</p>
        <div className="space-y-2">
          {lista.map(d => {
            const r = req.get(d.id); const on = sel.includes(d.id);
            if (!r && d.id === 'requerimento_assinado') return null;
            return (
              <label key={d.id} className={`card flex gap-3 items-start cursor-pointer ${on ? 'border-verde bg-verde-soft/50' : ''}`}>
                <input type="checkbox" checked={on} onChange={() => toggle(d.id)} className="mt-1 h-5 w-5 accent-[#0B6B4F]" />
                <span className="min-w-0">
                  <span className="font-semibold">{DOC_MAP[d.id].label}</span>
                  {r && <span className={`ml-2 text-[12px] font-bold ${r.sugerido ? 'text-mute' : r.obrigatorio ? 'text-rubi' : 'text-mute'}`}>{r.sugerido ? 'sugerido' : r.obrigatorio ? 'exigido' : 'opcional'}</span>}
                  <span className="flex flex-wrap gap-1.5 mt-1">
                    {r?.autenticado && <span className="chip !min-h-[26px] !px-2 text-[12px] !bg-sol-soft !border-sol">fotocópia autenticada</span>}
                    {r?.reconhecida && <span className="chip !min-h-[26px] !px-2 text-[12px] !bg-sol-soft !border-sol">assinatura reconhecida</span>}
                    {r?.confirmar && <span className="chip !min-h-[26px] !px-2 text-[12px]">confirmar no aviso</span>}
                  </span>
                  <span className="block text-[13px] text-mute mt-1">{r?.como || r?.nota || DOC_MAP[d.id].descricao}</span>
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 bg-white border-t border-line">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
          <p className="text-sm min-w-0 flex-1"><b>{sel.length}</b> documento{sel.length === 1 ? '' : 's'}<br /><span className="text-mute">a partir de {preco} MZN (tudo: {PRECOS.tudo}; avulso: {PRECOS.doc})</span></p>
          <button className="btn-primary" disabled={!sel.length || faltaCat} onClick={comecar}>{faltaCat ? 'Escolhe a categoria' : existe ? 'Continuar' : 'Começar'}</button>
        </div>
      </div>

      {(existe || vaga.custom) && (
        <div className="flex flex-wrap gap-2 text-sm">
          {existe && <button className="btn-ghost btn-sm" onClick={() => { if (confirm('Apagar a candidatura guardada desta vaga? Os teus dados pessoais ficam.')) { apagarCandidatura(vaga.id); setExiste(false); } }}>Recomeçar esta candidatura</button>}
          {vaga.custom && <button className="btn-ghost btn-sm text-rubi" onClick={() => { if (confirm('Remover esta vaga da lista?')) { apagarVagaCustom(vaga.id); apagarCandidatura(vaga.id); router.push('/'); } }}>Remover vaga</button>}
        </div>
      )}
    </div>
  );
}
