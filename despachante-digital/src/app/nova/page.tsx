'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CAMPOS_CONCURSO, DOCS_CONCURSO, DOCS_PRIVADA, guardarVagaCustom, siglaDe } from '@/lib/vagas';
import type { Canal, Vaga } from '@/lib/types';

function Form() {
  const sp = useSearchParams(); const router = useRouter();
  const [tipo, setTipo] = useState<'concurso' | 'privada'>(sp.get('tipo') === 'privada' ? 'privada' : 'concurso');
  const [entidade, setEntidade] = useState(''); const [titulo, setTitulo] = useState('');
  const [dest, setDest] = useState(''); const [canal, setCanal] = useState<Canal>(tipo === 'privada' ? 'email' : 'presencial');
  const [email, setEmail] = useState(''); const [decl, setDecl] = useState('não me encontro na situação de aposentado(a)');
  const ok = entidade.trim().length > 2 && (tipo === 'concurso' || titulo.trim().length > 1);

  const criar = () => {
    const nome = tipo === 'concurso' ? (titulo.trim() || `Concurso Público de Ingresso na ${entidade.trim()}`) : titulo.trim();
    const e = entidade.trim();
    const v: Vaga = {
      id: `x-${Date.now().toString(36)}`, tipo, entidade: e, sigla: siglaDe(e), titulo: nome,
      nomeConcurso: tipo === 'concurso' ? nome : undefined,
      destinatario: tipo === 'concurso' ? (dest.trim() ? dest.trim().toUpperCase().split('\n').filter(Boolean) : [`EXMO(A). SENHOR(A) PRESIDENTE DO(A) ${e.toUpperCase()}`]) : [],
      saudacao: dest.trim() ? dest.trim().split('\n')[0] : undefined,
      campos: tipo === 'concurso' ? CAMPOS_CONCURSO : [], declaracoes: tipo === 'concurso' ? decl.split(';').map(s => s.trim()).filter(Boolean) : [],
      docs: tipo === 'concurso' ? DOCS_CONCURSO : DOCS_PRIVADA, canal, contacto: email.trim() ? { email: email.trim() } : undefined, custom: true,
    };
    guardarVagaCustom(v); router.push(`/vaga/${v.id}`);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Nova candidatura</h1>
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-white border border-line p-1">
        {(['concurso', 'privada'] as const).map(k => <button key={k} onClick={() => { setTipo(k); setCanal(k === 'privada' ? 'email' : 'presencial'); }} className={`min-h-[46px] rounded-xl font-bold ${tipo === k ? 'bg-verde text-white' : 'text-mute'}`}>{k === 'concurso' ? 'Concurso público' : 'Vaga privada'}</button>)}
      </div>
      <div><label className="label">Nome da entidade</label><input className="input" value={entidade} onChange={e => setEntidade(e.target.value)} placeholder={tipo === 'concurso' ? 'Ex.: Instituto Nacional de Segurança Social' : 'Ex.: Nome da empresa'} /></div>
      <div><label className="label">{tipo === 'concurso' ? 'Nome do concurso (como no aviso)' : 'Cargo / vaga'}</label><input className="input" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder={tipo === 'concurso' ? 'Ex.: Concurso Público de Ingresso no …' : 'Ex.: Assistente Administrativo'} /><p className="hint">{tipo === 'concurso' ? 'Se deixares vazio, usamos “Concurso Público de Ingresso na …”.' : ''}</p></div>
      {tipo === 'concurso' && (<>
        <div><label className="label">A quem se dirige o requerimento</label><textarea className="input py-3" rows={2} value={dest} onChange={e => setDest(e.target.value)} placeholder={'Exmo. Senhor Presidente do …\n(uma linha por cada linha do cabeçalho)'} /></div>
        <div><label className="label">Declaração de honra — o que declaras</label><textarea className="input py-3" rows={2} value={decl} onChange={e => setDecl(e.target.value)} /><p className="hint">Copia do formulário do concurso. Separa várias declarações com “;”.</p></div>
      </>)}
      <div><label className="label">Como se entrega?</label>
        <select className="input" value={canal} onChange={e => setCanal(e.target.value as Canal)}>
          <option value="email">Por email</option><option value="presencial">Impressão / entrega presencial</option><option value="whatsapp">Por WhatsApp</option><option value="portal">Em portal online</option>
        </select></div>
      {canal === 'email' && <div><label className="label">Email de destino (opcional)</label><input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="rh@empresa.co.mz" /></div>}
      <button className="btn-primary w-full" disabled={!ok} onClick={criar}>Criar e escolher documentos</button>
    </div>
  );
}
export default function Nova() { return <Suspense><Form /></Suspense>; }
