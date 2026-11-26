'use client';
import type { Candidatura, DocId, Pessoal, Vaga } from '@/lib/types';
import { DataSel, Field, Passo, Txt } from '../Fields';
import { hoje } from '@/lib/dates';

export default function StepCandidatura({ vaga, cand, setCand, p, gerados }: { vaga: Vaga; cand: Candidatura; setCand: (x: Partial<Candidatura>) => void; p: Pessoal; docs?: DocId[]; gerados: boolean }) {
  return (
    <Passo titulo="Dados da candidatura" sub={vaga.tipo === 'concurso' ? 'Copia do Aviso de Abertura do concurso. Estes dados vão para o requerimento, a carta e o CV.' : `Vaga: ${vaga.titulo}`}>
      {vaga.campos.map(c => (
        <Field key={c.id} label={c.label}>
          {c.opcoes?.length ? (
            <select className="input" value={cand.campos[c.id] || ''} onChange={e => setCand({ campos: { ...cand.campos, [c.id]: e.target.value } })}>
              <option value="">Escolhe…</option>{c.opcoes.map(o => <option key={o}>{o}</option>)}
            </select>
          ) : <Txt value={cand.campos[c.id] || ''} onChange={v => setCand({ campos: { ...cand.campos, [c.id]: v } })} placeholder={c.placeholder} />}
          {c.id === 'local' && c.opcoes?.length ? <p className="hint">Concorre de preferência na província onde vives.</p> : null}
        </Field>
      ))}
      {gerados && <>
        <Field label="Local da assinatura" hint="Aparece em “Maputo, aos 24 de …”."><Txt value={cand.localAss || p.cidade} onChange={v => setCand({ localAss: v })} /></Field>
        <Field label="Data dos documentos">
          <DataSel d={cand.dataAss.d} m={cand.dataAss.m} a={cand.dataAss.a} desde={new Date().getFullYear() - 1} ate={new Date().getFullYear() + 1} onChange={v => setCand({ dataAss: v })} />
          <button type="button" className="text-sm font-semibold text-verde mt-2" onClick={() => setCand({ dataAss: hoje() })}>Usar a data de hoje</button>
        </Field>
      </>}
      {vaga.contacto?.email && <p className="card text-sm">Enviar a candidatura para: <b>{vaga.contacto.email}</b></p>}
    </Passo>
  );
}
