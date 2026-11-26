'use client';
import type { Pessoal, DocId } from '@/lib/types';
import { camposPessoaisNecessarios } from '@/lib/docs';
import { Area, DataSel, Field, Passo, Txt } from '../Fields';
import { localMsisdn } from '@/lib/mz';

export default function StepPessoal({ p, setP, docs }: { p: Pessoal; setP: (x: Partial<Pessoal>) => void; docs: DocId[] }) {
  const n = camposPessoaisNecessarios(docs);
  const tel = localMsisdn(p.telefone);
  return (
    <Passo titulo="Insere o teu nome completo" sub="Escreve como está no teu Bilhete de Identidade. Só pedimos o que os documentos escolhidos precisam.">
      <Field label="Nome completo"><Txt value={p.nome} onChange={v => setP({ nome: v })} autoComplete="name" placeholder="Ex.: Amélia Joaquim Macuácua" /></Field>
      {n.has('sexo') && (
        <Field label="Sexo" hint="Serve para escrever “nascido/nascida”, “candidato/candidata”, etc.">
          <div className="grid grid-cols-2 gap-2">{([['F', 'Feminino'], ['M', 'Masculino']] as const).map(([k, l]) => <button key={k} type="button" onClick={() => setP({ sexo: k })} className={`btn ${p.sexo === k ? 'btn-primary' : 'btn-ghost'}`}>{l}</button>)}</div>
        </Field>
      )}
      {n.has('nascDia') && <Field label="Data de nascimento"><DataSel d={p.nascDia} m={p.nascMes} a={p.nascAno} desde={1950} ate={new Date().getFullYear() - 14} onChange={v => setP({ nascDia: v.d, nascMes: v.m, nascAno: v.a })} /></Field>}
      {n.has('naturalidade') && <Field label="Naturalidade (onde nasceste)"><Txt value={p.naturalidade} onChange={v => setP({ naturalidade: v })} placeholder="Ex.: Xai-Xai, Gaza" /></Field>}
      {n.has('biNumero') && <>
        <Field label="Número do Bilhete de Identidade"><Txt value={p.biNumero} onChange={v => setP({ biNumero: v.toUpperCase().replace(/\s/g, '') })} autoCapitalize="characters" placeholder="Ex.: 110100234567B" /></Field>
        <Field label="Data de emissão do BI"><DataSel d={p.biDia} m={p.biMes} a={p.biAno} desde={1990} onChange={v => setP({ biDia: v.d, biMes: v.m, biAno: v.a })} /></Field>
        {n.has('biLocal') && <Field label="Arquivo de Identificação Civil de…" hint="A cidade que aparece no teu BI como local de emissão."><Txt value={p.biLocal} onChange={v => setP({ biLocal: v })} placeholder="Ex.: Maputo" /></Field>}
      </>}
      {n.has('residencia') && <Field label="Onde resides" hint="Bairro, quarteirão e casa, se tiveres."><Area rows={2} value={p.residencia} onChange={v => setP({ residencia: v })} placeholder="Ex.: Bairro Polana Caniço A, Quarteirão 12, Casa 45" /></Field>}
      {n.has('cidade') && <Field label="Cidade onde vives"><Txt value={p.cidade} onChange={v => setP({ cidade: v })} placeholder="Ex.: Maputo" /></Field>}
      {n.has('telefone') && <Field label="Telefone" hint={tel && tel.length === 9 ? undefined : 'Número com 9 dígitos, ex.: 84 123 4567'}><Txt value={p.telefone} onChange={v => setP({ telefone: v })} inputMode="tel" autoComplete="tel" placeholder="84 123 4567" /></Field>}
      {n.has('email') && <Field label="Email" hint="Usa um email sério, de preferência com o teu nome."><Txt value={p.email} onChange={v => setP({ email: v.trim() })} type="email" inputMode="email" autoComplete="email" placeholder="o.teu.nome@gmail.com" /></Field>}
      {n.has('linkedin') && <Field label="LinkedIn (opcional)"><Txt value={p.linkedin} onChange={v => setP({ linkedin: v })} placeholder="linkedin.com/in/…" /></Field>}
    </Passo>
  );
}
