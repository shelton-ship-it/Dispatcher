'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Candidatura, CvData, DocId, Pessoal, Vaga } from '@/lib/types';
import { DOC_MAP, camposPessoaisNecessarios } from '@/lib/docs';
import { construirDoc, chaveDados } from '../docBuild';
import PdfPreview from '../PdfPreview';
import { Area, Passo } from '../Fields';
import { gerarCartaTexto, honraParas, requerimentoRuns, runsParaTexto } from '@/lib/pdf/letters';
import { temAcesso, Permissoes } from '@/lib/entitlement';

const ROT: Partial<Record<keyof Pessoal, string>> = { nome: 'nome', sexo: 'sexo', nascDia: 'data de nascimento', nascAno: 'data de nascimento', biNumero: 'número do BI', biDia: 'data do BI', biLocal: 'local de emissão do BI', residencia: 'residência', telefone: 'telefone', email: 'email', cidade: 'cidade' };

export default function StepRever({ vaga, p, cv, cand, setCand, docs, perm, irPara }: { vaga: Vaga; p: Pessoal; cv: CvData; cand: Candidatura; setCand: (f: (x: Candidatura) => Candidatura) => void; docs: DocId[]; perm: Permissoes | null; irPara: (id: string) => void }) {
  const [ativo, setAtivo] = useState<DocId>(docs[0]);
  const [bytes, setBytes] = useState<Uint8Array | null>(null); const [info, setInfo] = useState(''); const [erro, setErro] = useState('');
  useEffect(() => { if (!docs.includes(ativo)) setAtivo(docs[0]); }, [docs, ativo]);
  const marca = !temAcesso(perm, ativo);
  const dados = { p, cv, cand, vaga };
  const chave = chaveDados(ativo, dados, marca);
  const t = useRef<any>(null);
  useEffect(() => {
    setErro(''); clearTimeout(t.current);
    t.current = setTimeout(async () => {
      try { const r = await construirDoc(ativo, dados, marca); setBytes(r?.bytes ?? null); setInfo(r ? `${r.paginas} página${r.paginas > 1 ? 's' : ''}` : 'Ainda sem digitalização'); }
      catch (e: any) { console.error(e); setErro('Não foi possível gerar este documento. Verifica os dados e tenta de novo.'); }
    }, 350);
    return () => clearTimeout(t.current);
  }, [chave]); // eslint-disable-line

  const ctx = { p, vaga, cand, cv };
  const falta = useMemo(() => { if (DOC_MAP[ativo].tipo !== 'gerado') return []; const n = camposPessoaisNecessarios([ativo]); const m = new Set<string>(); (Object.keys(ROT) as (keyof Pessoal)[]).forEach(k => { if (n.has(k) && !String(p[k] || '').trim()) m.add(ROT[k]!); }); return [...m]; }, [ativo, p]);

  const editor = () => {
    if (ativo === 'carta') { const v = cand.carta.editado ? cand.carta.texto : gerarCartaTexto(ctx); return <><Area rows={10} value={v} onChange={x => setCand(c => ({ ...c, carta: { ...c.carta, texto: x, editado: true } }))} /><button className="btn-ghost btn-sm mt-2" onClick={() => setCand(c => ({ ...c, carta: { ...c.carta, editado: false, texto: '' } }))}>Repor texto automático</button></>; }
    if (ativo === 'requerimento') { const v = cand.textos.requerimento ?? runsParaTexto(requerimentoRuns(ctx)); return <><Area rows={8} value={v} onChange={x => setCand(c => ({ ...c, textos: { ...c.textos, requerimento: x } }))} /><button className="btn-ghost btn-sm mt-2" onClick={() => setCand(c => { const { requerimento, ...r } = c.textos; return { ...c, textos: r }; })}>Repor texto original</button></>; }
    if (ativo === 'honra') { const v = cand.textos.honra ?? honraParas(ctx).map(runsParaTexto).join('\n'); return <><Area rows={10} value={v} onChange={x => setCand(c => ({ ...c, textos: { ...c.textos, honra: x } }))} /><button className="btn-ghost btn-sm mt-2" onClick={() => setCand(c => { const { honra, ...r } = c.textos; return { ...c, textos: r }; })}>Repor texto original</button></>; }
    if (ativo === 'cv') return <div className="grid grid-cols-2 gap-2"><button className="btn-ghost btn-sm" onClick={() => irPara('modelo')}>Mudar modelo</button><button className="btn-ghost btn-sm" onClick={() => irPara('cv-experiencia')}>Editar experiência</button><button className="btn-ghost btn-sm" onClick={() => irPara('cv-formacao')}>Editar formação</button><button className="btn-ghost btn-sm" onClick={() => irPara('cv-extras')}>Competências e foto</button></div>;
    return <button className="btn-ghost btn-sm w-full" onClick={() => irPara(`scan:${ativo}`)}>Voltar a digitalizar / recortar</button>;
  };

  return (
    <Passo titulo="Revê e corrige" sub="Isto é o que vai ser entregue. Podes editar o texto antes de exportar.">
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">{docs.map(d => <button key={d} onClick={() => setAtivo(d)} className={`chip whitespace-nowrap ${ativo === d ? 'chip-on' : ''}`}>{DOC_MAP[d].curto}{!temAcesso(perm, d) ? '' : ' ✓'}</button>)}</div>
      {falta.length > 0 && <div className="card bg-sol-soft border-sol/60 text-sm">Falta preencher: <b>{falta.join(', ')}</b>. Fica com espaços em branco para escreveres à mão, ou <button className="underline font-semibold" onClick={() => irPara('pessoal')}>preenche agora</button>.</div>}
      <details className="card" open={ativo === 'carta'}><summary className="font-bold cursor-pointer min-h-[32px]">Editar este documento</summary><div className="mt-3">{editor()}</div></details>
      <div><div className="flex items-center justify-between mb-2"><p className="text-sm font-semibold">{DOC_MAP[ativo].label}</p><p className="text-[13px] text-mute">{info}</p></div>
        {marca && <p className="text-[13px] text-mute mb-2">A pré-visualização tem marca de água. O ficheiro final sai limpo depois do pagamento.</p>}
        {erro ? <p className="card text-rubi border-rubi/40">{erro}</p> : <PdfPreview bytes={bytes} />}</div>
    </Passo>
  );
}
