'use client';
import type { Candidatura, Vaga } from '@/lib/types';
import { Area, Field, Passo } from '../Fields';

const PONTOS = ['responsabilidade', 'pontualidade', 'organização', 'trabalho em equipa', 'honestidade', 'capacidade de aprendizagem', 'boa comunicação', 'disciplina'];
export default function StepCarta({ vaga, cand, setCand }: { vaga: Vaga; cand: Candidatura; setCand: (f: (x: Candidatura) => Candidatura) => void }) {
  const pts = cand.carta.pontos;
  const toggle = (s: string) => setCand(c => ({ ...c, carta: { ...c.carta, editado: false, pontos: c.carta.pontos.includes(s) ? c.carta.pontos.filter(x => x !== s) : [...c.carta.pontos, s].slice(0, 4) } }));
  return (
    <Passo titulo="Carta de apresentação" sub="Duas respostas curtas e a carta escreve-se sozinha. Depois podes editar o texto todo.">
      <Field label="Porque queres esta vaga?" hint="Opcional. Se deixares vazio, usamos uma frase pronta e respeitosa.">
        <Area rows={4} value={cand.carta.motivo} onChange={v => setCand(c => ({ ...c, carta: { ...c.carta, motivo: v, editado: false } }))} placeholder={`Ex.: Quero trabalhar ${vaga.entidade ? 'na ' + vaga.entidade : 'convosco'} porque admiro o vosso trabalho e quero crescer profissionalmente.`} />
      </Field>
      <Field label="Os teus pontos fortes (até 4)">
        <div className="flex flex-wrap gap-2">{PONTOS.map(s => <button key={s} type="button" onClick={() => toggle(s)} className={`chip ${pts.includes(s) ? 'chip-on' : ''}`}>{s}</button>)}</div>
      </Field>
    </Passo>
  );
}
