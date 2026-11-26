'use client';
import { useRef } from 'react';
import type { CvData, Edu, Exp } from '@/lib/types';
import { AnoSel, Area, Field, Passo, Txt } from '../Fields';
import { uid } from '@/lib/store';
import { idbDel, idbSet } from '@/lib/idb';
import { kFoto } from '@/lib/loaders';
import { reduzir } from '@/lib/image';

const move = <T,>(a: T[], i: number, d: number) => { const j = i + d; if (j < 0 || j >= a.length) return a; const c = [...a]; [c[i], c[j]] = [c[j], c[i]]; return c; };

export function StepFormacao({ cv, setCv }: { cv: CvData; setCv: (f: (x: CvData) => CvData) => void }) {
  const upd = (id: string, k: keyof Edu, v: string) => setCv(x => ({ ...x, educacao: x.educacao.map(e => (e.id === id ? { ...e, [k]: v } : e)) }));
  return (
    <Passo titulo="Formação" sub="Começa pela mais recente. Podes saltar se ainda não tens.">
      {cv.educacao.map((e, i) => (
        <div key={e.id} className="card space-y-3">
          <Field label="Curso ou nível"><Txt value={e.curso} onChange={v => upd(e.id, 'curso', v)} placeholder="Ex.: Licenciatura em Contabilidade" /></Field>
          <Field label="Instituição"><Txt value={e.instituicao} onChange={v => upd(e.id, 'instituicao', v)} placeholder="Ex.: Universidade Eduardo Mondlane" /></Field>
          <div className="grid grid-cols-2 gap-2"><Field label="Início"><AnoSel value={e.inicio} onChange={v => upd(e.id, 'inicio', v)} /></Field><Field label="Fim"><AnoSel value={e.fim} onChange={v => upd(e.id, 'fim', v)} extra="A decorrer" /></Field></div>
          <Field label="Nota ou detalhe (opcional)"><Txt value={e.nota} onChange={v => upd(e.id, 'nota', v)} placeholder="Ex.: Média final: 15 valores" /></Field>
          <div className="flex gap-2"><button className="btn-ghost btn-sm" onClick={() => setCv(x => ({ ...x, educacao: move(x.educacao, i, -1) }))}>Subir</button><button className="btn-ghost btn-sm" onClick={() => setCv(x => ({ ...x, educacao: move(x.educacao, i, 1) }))}>Descer</button><button className="btn-ghost btn-sm text-rubi ml-auto" onClick={() => setCv(x => ({ ...x, educacao: x.educacao.filter(y => y.id !== e.id) }))}>Remover</button></div>
        </div>
      ))}
      <button className="btn-ghost w-full" onClick={() => setCv(x => ({ ...x, educacao: [...x.educacao, { id: uid(), curso: '', instituicao: '', inicio: '', fim: '', nota: '' }] }))}>+ Adicionar formação</button>
    </Passo>
  );
}

export function StepExperiencia({ cv, setCv }: { cv: CvData; setCv: (f: (x: CvData) => CvData) => void }) {
  const upd = (id: string, k: keyof Exp, v: string) => setCv(x => ({ ...x, experiencia: x.experiencia.map(e => (e.id === id ? { ...e, [k]: v } : e)) }));
  return (
    <Passo titulo="Experiência de trabalho" sub="Inclui estágios e trabalho voluntário. Sem experiência? Salta este passo.">
      {cv.experiencia.map((e, i) => (
        <div key={e.id} className="card space-y-3">
          <Field label="Cargo"><Txt value={e.cargo} onChange={v => upd(e.id, 'cargo', v)} placeholder="Ex.: Assistente Administrativa" /></Field>
          <Field label="Empresa e local"><Txt value={e.empresa} onChange={v => upd(e.id, 'empresa', v)} placeholder="Ex.: Cimentos de Moçambique, Maputo" /></Field>
          <div className="grid grid-cols-2 gap-2"><Field label="Início"><AnoSel value={e.inicio} onChange={v => upd(e.id, 'inicio', v)} /></Field><Field label="Fim"><AnoSel value={e.fim} onChange={v => upd(e.id, 'fim', v)} extra="Actual" /></Field></div>
          <Field label="O que fazias (2 a 3 frases)"><Area rows={3} value={e.descricao} onChange={v => upd(e.id, 'descricao', v)} placeholder="Ex.: Gestão de arquivo, lançamento de facturas e atendimento a clientes." /></Field>
          <div className="flex gap-2"><button className="btn-ghost btn-sm" onClick={() => setCv(x => ({ ...x, experiencia: move(x.experiencia, i, -1) }))}>Subir</button><button className="btn-ghost btn-sm" onClick={() => setCv(x => ({ ...x, experiencia: move(x.experiencia, i, 1) }))}>Descer</button><button className="btn-ghost btn-sm text-rubi ml-auto" onClick={() => setCv(x => ({ ...x, experiencia: x.experiencia.filter(y => y.id !== e.id) }))}>Remover</button></div>
        </div>
      ))}
      <button className="btn-ghost w-full" onClick={() => setCv(x => ({ ...x, experiencia: [...x.experiencia, { id: uid(), cargo: '', empresa: '', inicio: '', fim: '', descricao: '' }] }))}>+ Adicionar experiência</button>
    </Passo>
  );
}

const SUGESTOES = ['Microsoft Word', 'Microsoft Excel', 'Atendimento ao público', 'Trabalho em equipa', 'Organização', 'Comunicação', 'Contabilidade', 'Informática na óptica do utilizador', 'Condução'];
const NIVEIS = ['Nativo', 'Fluente', 'Avançado', 'Intermédio', 'Básico'];

export function StepExtras({ cv, setCv }: { cv: CvData; setCv: (f: (x: CvData) => CvData) => void }) {
  const fRef = useRef<HTMLInputElement>(null);
  const add = (s: string) => setCv(x => (x.competencias.includes(s) ? x : { ...x, competencias: [...x.competencias, s] }));
  const foto = async (f?: File) => { if (!f) return; const r = await reduzir(f, 900, 0.88); await idbSet(kFoto, r.blob); setCv(x => ({ ...x, fotoVer: Date.now() })); };
  return (
    <Passo titulo="Competências, idiomas e resumo" sub="O que te distingue dos outros candidatos.">
      <Field label="Competências" hint="Toca numa sugestão ou escreve a tua e carrega em Adicionar.">
        <div className="flex flex-wrap gap-2 mb-2">{cv.competencias.map(c => <button key={c} className="chip chip-on" onClick={() => setCv(x => ({ ...x, competencias: x.competencias.filter(y => y !== c) }))}>{c} ✕</button>)}</div>
        <div className="flex flex-wrap gap-2 mb-2">{SUGESTOES.filter(s => !cv.competencias.includes(s)).slice(0, 7).map(s => <button key={s} className="chip" onClick={() => add(s)}>+ {s}</button>)}</div>
        <form className="flex gap-2" onSubmit={e => { e.preventDefault(); const i = (e.currentTarget.elements.namedItem('c') as HTMLInputElement); if (i.value.trim()) add(i.value.trim()); i.value = ''; }}>
          <input name="c" className="input" placeholder="Outra competência" /><button className="btn-ghost">Adicionar</button>
        </form>
      </Field>
      <Field label="Idiomas">
        <div className="space-y-2">{cv.idiomas.map((l, i) => (
          <div key={i} className="grid grid-cols-[1.4fr_1fr_auto] gap-2">
            <input className="input" value={l.nome} onChange={e => setCv(x => ({ ...x, idiomas: x.idiomas.map((y, j) => (j === i ? { ...y, nome: e.target.value } : y)) }))} placeholder="Idioma" />
            <select className="input px-2" value={l.nivel} onChange={e => setCv(x => ({ ...x, idiomas: x.idiomas.map((y, j) => (j === i ? { ...y, nivel: e.target.value } : y)) }))}><option value="">Nível</option>{NIVEIS.map(n => <option key={n}>{n}</option>)}</select>
            <button className="btn-ghost px-3" aria-label="Remover idioma" onClick={() => setCv(x => ({ ...x, idiomas: x.idiomas.filter((_, j) => j !== i) }))}>✕</button>
          </div>))}
        </div>
        <button className="btn-ghost btn-sm mt-2" onClick={() => setCv(x => ({ ...x, idiomas: [...x.idiomas, { nome: '', nivel: '' }] }))}>+ Idioma</button>
      </Field>
      <Field label="Resumo sobre ti (opcional)" hint="2 a 3 frases: quem és, o que sabes fazer e o que procuras."><Area rows={4} value={cv.resumo} onChange={v => setCv(x => ({ ...x, resumo: v }))} placeholder="Ex.: Licenciada em Contabilidade, organizada e rigorosa, com experiência em apoio administrativo." /></Field>
      <Field label="Fotografia (opcional)" hint="Os concursos públicos normalmente não pedem fotografia no CV. Se usares, que seja de frente e com fundo simples.">
        <input ref={fRef} type="file" accept="image/*" hidden onChange={e => { foto(e.target.files?.[0]); e.target.value = ''; }} />
        <div className="flex gap-2"><button className="btn-ghost" onClick={() => fRef.current?.click()}>{(cv.fotoVer ?? 0) > 0 ? 'Mudar fotografia' : 'Escolher fotografia'}</button>{(cv.fotoVer ?? 0) > 0 && <button className="btn-ghost text-rubi" onClick={async () => { await idbDel(kFoto); setCv(x => ({ ...x, fotoVer: 0 })); }}>Remover</button>}</div>
      </Field>
    </Passo>
  );
}
