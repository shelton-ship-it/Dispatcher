'use client';
import { useEffect, useRef, useState } from 'react';
import type { DocId } from '@/lib/types';
import { DOC_MAP } from '@/lib/docs';
import { calcularPreco, PRECOS } from '@/lib/pricing';
import { apiJson } from '@/lib/api';
import { isMobileMoney, localMsisdn, operador, formatTel } from '@/lib/mz';
import { guardarPendente, guardarToken, lerPendente, Permissoes } from '@/lib/entitlement';

type Fase = 'escolher' | 'numero' | 'aguardar' | 'ok' | 'erro';
export default function PayDialog({ vagaId, docs, perm, telefone, onClose, onPaid }: { vagaId: string; docs: DocId[]; perm: Permissoes | null; telefone: string; onClose: () => void; onPaid: () => void }) {
  const porPagar = docs.filter(d => !(perm?.tudo || perm?.docs.has(d)));
  const [plano, setPlano] = useState<'tudo' | 'docs'>('tudo');
  const [sel, setSel] = useState<DocId[]>(porPagar);
  const [tel, setTel] = useState(localMsisdn(telefone));
  const [fase, setFase] = useState<Fase>('escolher');
  const [msg, setMsg] = useState(''); const [recibo, setRecibo] = useState('');
  const poll = useRef<any>(null);
  const valorDocs = calcularPreco('docs', sel.length);
  const valor = plano === 'tudo' ? PRECOS.tudo : valorDocs;
  const op = operador(tel);
  useEffect(() => () => clearInterval(poll.current), []);

  const concluir = async (token: string, ref: string) => {
    const ok = await guardarToken(token, ref); guardarPendente(null); clearInterval(poll.current);
    if (!ok) { setFase('erro'); setMsg('Pagamento confirmado, mas o recibo não pôde ser validado neste aparelho. Usa “Recuperar pagamento” com o código ' + ref); return; }
    setRecibo(ref); setFase('ok'); onPaid();
  };
  const verificar = async (ref: string, principal = true) => {
    try {
      const { data: j } = await apiJson(`/api/pay/status/${encodeURIComponent(ref)}`, { timeoutMs: 15000 });
      if (j.status === 'paid' && j.token) await concluir(j.token, ref);
      else if (j.status === 'failed' && principal) { clearInterval(poll.current); guardarPendente(null); setFase('erro'); setMsg(j.message || 'Pagamento recusado ou cancelado.'); }
      return j.status as string;
    } catch { return 'pending'; }
  };
  const pagar = async () => {
    clearInterval(poll.current);
    setFase('aguardar'); setMsg('Enviámos um pedido para o teu telemóvel. Digita o PIN para confirmar.');
    try {
      const body = { vagaId, scope: plano, docs: plano === 'docs' ? sel : docs, msisdn: tel };
      const { ok: httpOk, data: j } = await apiJson('/api/pay/charge', { method: 'POST', body: JSON.stringify(body), timeoutMs: 40000 });
      if (!httpOk || !j?.ok) { setFase('erro'); setMsg(j?.message || 'Não foi possível iniciar o pagamento.'); return; }
      if (j.status === 'paid' && j.token) { await concluir(j.token, j.reference); return; }
      guardarPendente({ reference: j.reference, vagaId, scope: plano, docs: body.docs, valor, ts: Date.now() });
      // Tentativas anteriores ainda pendentes (ex.: PIN errado): continuam a ser verificadas — se alguma acabar paga, o recibo não se perde.
      const refs: string[] = [j.reference, ...((j.anteriores as string[]) || [])];
      clearInterval(poll.current);
      let n = 0; poll.current = setInterval(async () => { n++; let s = 'pending'; for (const r of refs) { const x = await verificar(r, r === j.reference); if (x === 'paid') return; if (r === j.reference) s = x; } if (n > 40 && s === 'pending') { clearInterval(poll.current); setFase('erro'); setMsg('Ainda não recebemos a confirmação. Se já pagaste, toca em “Já paguei” dentro de instantes.'); } }, 3000);
    } catch { setFase('erro'); setMsg('Sem ligação à internet. Tenta de novo.'); }
  };
  const pend = lerPendente();

  return (
    <div className="fixed inset-0 z-50 bg-ink/70 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Pagamento">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[92vh] overflow-auto">
        <div className="flex items-center justify-between"><h2 className="text-xl font-extrabold">{fase === 'ok' ? 'Pagamento confirmado' : 'Desbloquear documentos'}</h2><button className="text-mute text-2xl px-2" aria-label="Fechar" onClick={onClose}>✕</button></div>

        {fase === 'escolher' && <>
          <button onClick={() => setPlano('tudo')} className={`card w-full text-left ${plano === 'tudo' ? 'border-verde bg-verde-soft/50' : ''}`}><span className="flex justify-between font-bold"><span>Tudo desta candidatura</span><span>{PRECOS.tudo} MZN</span></span><span className="text-[13px] text-mute">Todos os {docs.length} documentos, sempre que quiseres corrigir e baixar de novo.{docs.length * PRECOS.doc > PRECOS.tudo ? ` Poupas ${docs.length * PRECOS.doc - PRECOS.tudo} MZN.` : ''}</span></button>
          <button onClick={() => setPlano('docs')} className={`card w-full text-left ${plano === 'docs' ? 'border-verde bg-verde-soft/50' : ''}`}><span className="flex justify-between font-bold"><span>Só alguns documentos</span><span>{PRECOS.doc} MZN cada</span></span></button>
          {plano === 'docs' && <div className="space-y-2">{porPagar.map(d => <label key={d} className="flex items-center gap-3 card !p-3"><input type="checkbox" className="h-5 w-5 accent-[#0B6B4F]" checked={sel.includes(d)} onChange={() => setSel(s => (s.includes(d) ? s.filter(x => x !== d) : [...s, d]))} />{DOC_MAP[d].label}</label>)}</div>}
          <button className="btn-primary w-full" disabled={plano === 'docs' && !sel.length} onClick={() => setFase('numero')}>Continuar — {valor} MZN</button>
          {pend && <button className="btn-ghost w-full btn-sm" onClick={() => { setFase('aguardar'); setMsg('A verificar o pagamento anterior…'); let n = 0; poll.current = setInterval(async () => { n++; const s = await verificar(pend.reference); if (n > 5 && s === 'pending') { clearInterval(poll.current); setFase('erro'); setMsg('Esse pagamento ainda não foi confirmado.'); } }, 2500); }}>Já paguei — verificar</button>}
        </>}

        {fase === 'numero' && <>
          <div><label className="label">Número M-Pesa, e-Mola ou mKesh</label><input className="input text-lg" inputMode="tel" autoFocus value={tel} onChange={e => setTel(localMsisdn(e.target.value))} placeholder="84 123 4567" />
            <p className="hint">{tel.length === 9 ? (op ? `Operador: ${op === 'mpesa' ? 'M-Pesa' : op === 'emola' ? 'e-Mola' : 'mKesh'} · ${formatTel(tel)}` : 'Usa um número 84/85 (M-Pesa), 86/87 (e-Mola) ou 82/83 (mKesh).') : '9 dígitos, sem +258.'}</p></div>
          <div className="card bg-sol-soft border-sol/50 flex justify-between font-bold"><span>Total</span><span>{valor} MZN</span></div>
          <div className="grid grid-cols-3 gap-2"><button className="btn-ghost" onClick={() => setFase('escolher')}>Voltar</button><button className="btn-primary col-span-2" disabled={!isMobileMoney(tel)} onClick={pagar}>Pagar {valor} MZN</button></div>
        </>}

        {fase === 'aguardar' && <div className="text-center space-y-3 py-4" role="status"><div className="mx-auto h-12 w-12 rounded-full border-4 border-verde border-t-transparent animate-spin" /><p className="font-semibold">{msg}</p><p className="hint">Não feches esta janela. Demora até 1 minuto. Se o pedido não aparecer no telemóvel, toca em “Tentar de novo”: enviamos logo outro.</p>
          <div className="flex gap-2 justify-center"><button className="btn-ghost btn-sm" onClick={() => { const p = lerPendente(); if (p) verificar(p.reference); }}>Já paguei</button><button className="btn-ghost btn-sm" onClick={() => { clearInterval(poll.current); setFase('numero'); }}>Tentar de novo</button></div></div>}

        {fase === 'ok' && <div className="space-y-3 text-center"><p className="carimbo text-base">PAGO</p><p>Já podes descarregar e enviar os teus documentos.</p><p className="text-[13px] text-mute">Código do recibo (guarda-o, serve para recuperar noutro telemóvel):</p><p className="font-mono text-xs break-all bg-paper rounded-lg p-2 select-all">{recibo}</p><button className="btn-primary w-full" onClick={onClose}>Continuar</button></div>}

        {fase === 'erro' && <div className="space-y-3"><p className="card text-rubi border-rubi/40" role="alert">{msg}</p><div className="grid grid-cols-2 gap-2"><button className="btn-ghost" onClick={onClose}>Fechar</button><button className="btn-primary" onClick={() => setFase('numero')}>Tentar de novo</button></div></div>}
      </div>
    </div>
  );
}
