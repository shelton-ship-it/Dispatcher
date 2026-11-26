'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DocId, Vaga } from '@/lib/types';
import { DOC_LIST, DOC_MAP, temGerados } from '@/lib/docs';
import { useCandidatura } from '@/lib/store';
import { permissoes, Permissoes } from '@/lib/entitlement';
import StepPessoal from './steps/StepPessoal';
import StepCandidatura from './steps/StepCandidatura';
import { StepExperiencia, StepExtras, StepFormacao } from './steps/StepCv';
import StepCarta from './steps/StepCarta';
import StepScan from './steps/StepScan';
import StepModelo from './steps/StepModelo';
import StepRever from './steps/StepRever';
import StepExportar from './steps/StepExportar';

type P = { id: string; label: string };
function calcular(vaga: Vaga, docs: DocId[]): P[] {
  const s: P[] = [{ id: 'pessoal', label: 'Os teus dados' }];
  if (temGerados(docs) || vaga.campos.length) s.push({ id: 'candidatura', label: 'A candidatura' });
  if (docs.includes('cv')) s.push({ id: 'cv-formacao', label: 'Formação' }, { id: 'cv-experiencia', label: 'Experiência' }, { id: 'cv-extras', label: 'Competências' });
  if (docs.includes('carta')) s.push({ id: 'carta', label: 'Carta' });
  DOC_LIST.filter(d => d.tipo === 'scan' && docs.includes(d.id)).forEach(d => s.push({ id: `scan:${d.id}`, label: d.curto }));
  if (docs.includes('cv')) s.push({ id: 'modelo', label: 'Modelo do CV' });
  s.push({ id: 'rever', label: 'Rever' }, { id: 'exportar', label: 'Exportar' });
  return s;
}

export default function Wizard({ vaga }: { vaga: Vaga }) {
  const { ready, p, setP, cv, setCv, cand, setCand, saved, flush } = useCandidatura(vaga);
  const [perm, setPerm] = useState<Permissoes | null>(null);
  const recarregar = useCallback(() => { permissoes(vaga.id).then(setPerm); }, [vaga.id]);
  useEffect(() => { recarregar(); }, [recarregar]);
  const topo = useRef<HTMLDivElement>(null);

  const docs = useMemo(() => (cand ? DOC_LIST.map(d => d.id).filter(d => cand.docs.includes(d)) : []), [cand]);
  const passos = useMemo(() => calcular(vaga, docs), [vaga, docs]);
  if (!ready || !cand) return <p className="text-mute">A carregar…</p>;
  const i = Math.min(Math.max(0, cand.passo), passos.length - 1);
  const atual = passos[i];
  const ir = (n: number) => { setCand({ passo: Math.max(0, Math.min(passos.length - 1, n)) }); flush(); requestAnimationFrame(() => topo.current?.scrollIntoView({ block: 'start' })); };
  const irId = (id: string) => { const n = passos.findIndex(x => x.id === id); if (n >= 0) ir(n); };
  const gerados = temGerados(docs);
  const ultimo = i === passos.length - 1;
  const nomeOk = p.nome.trim().length > 4;
  const bloqueia = atual.id === 'pessoal' && !nomeOk;

  let corpo: React.ReactNode = null;
  if (atual.id === 'pessoal') corpo = <StepPessoal p={p} setP={setP} docs={docs} />;
  else if (atual.id === 'candidatura') corpo = <StepCandidatura vaga={vaga} cand={cand} setCand={setCand} p={p} gerados={gerados} />;
  else if (atual.id === 'cv-formacao') corpo = <StepFormacao cv={cv} setCv={setCv} />;
  else if (atual.id === 'cv-experiencia') corpo = <StepExperiencia cv={cv} setCv={setCv} />;
  else if (atual.id === 'cv-extras') corpo = <StepExtras cv={cv} setCv={setCv} />;
  else if (atual.id === 'carta') corpo = <StepCarta vaga={vaga} cand={cand} setCand={setCand} />;
  else if (atual.id.startsWith('scan:')) corpo = <StepScan key={atual.id} req={vaga.docs.find(d => d.id === atual.id.slice(5))} doc={atual.id.slice(5) as DocId} cand={cand} setCand={setCand} p={p} setP={setP} />;
  else if (atual.id === 'modelo') corpo = <StepModelo vaga={vaga} cand={cand} setCand={setCand} />;
  else if (atual.id === 'rever') corpo = <StepRever vaga={vaga} p={p} cv={cv} cand={cand} setCand={setCand} docs={docs} perm={perm} irPara={irId} />;
  else corpo = <StepExportar vaga={vaga} p={p} cv={cv} cand={cand} docs={docs} perm={perm} recarregarPerm={recarregar} />;

  return (
    <div>
      <div ref={topo} className="sticky top-14 z-20 -mx-4 px-4 py-2.5 bg-paper/95 backdrop-blur border-b border-line">
        <div className="flex items-center justify-between text-sm"><span className="font-bold">Passo {i + 1} de {passos.length} · {atual.label}</span><span className="text-[12px] text-mute">{saved ? 'Guardado ✓' : ''}</span></div>
        <div className="mt-2 flex gap-1" aria-hidden="true">{passos.map((s, n) => <button key={s.id} tabIndex={-1} onClick={() => n <= i && ir(n)} className={`h-1.5 flex-1 rounded-full ${n < i ? 'bg-verde' : n === i ? 'bg-sol' : 'bg-line'}`} />)}</div>
        <p className="text-[12px] text-mute mt-1 truncate">{vaga.titulo || vaga.entidade} · <Link href={`/vaga/${vaga.id}`} className="underline">mudar documentos</Link></p>
      </div>
      <div className="pt-5">{corpo}</div>
      <nav className="fixed inset-x-0 bottom-0 z-20 bg-white border-t border-line" aria-label="Navegação dos passos">
        <div className="mx-auto max-w-3xl px-4 py-3 grid grid-cols-[1fr_2fr] gap-3">
          <button className="btn-ghost" disabled={i === 0} onClick={() => ir(i - 1)}>Voltar</button>
          {ultimo ? <Link href="/" className="btn-ghost">Concluir</Link> : <button className="btn-primary" disabled={bloqueia} onClick={() => ir(i + 1)}>{atual.id === 'pessoal' && !nomeOk ? 'Escreve o teu nome' : i === passos.length - 2 ? 'Ir para exportar' : 'Continuar'}</button>}
        </div>
      </nav>
    </div>
  );
}
