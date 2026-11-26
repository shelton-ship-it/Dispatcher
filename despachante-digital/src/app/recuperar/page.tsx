'use client';
import Link from 'next/link';
import { useState } from 'react';
import { guardarToken } from '@/lib/entitlement';
import { apiJson } from '@/lib/api';

export default function Recuperar() {
  const [ref, setRef] = useState(''); const [msg, setMsg] = useState(''); const [ok, setOk] = useState(false); const [busy, setBusy] = useState(false);
  const enviar = async () => {
    setBusy(true); setMsg('');
    try {
      const { data: j } = await apiJson(`/api/pay/status/${encodeURIComponent(ref.trim())}`, { timeoutMs: 15000 });
      if (j?.status === 'paid' && j.token) { const g = await guardarToken(j.token, ref.trim()); setOk(g); setMsg(g ? 'Pagamento recuperado neste aparelho. Abre a tua candidatura para descarregar.' : 'Pagamento válido, mas não foi possível guardá-lo neste aparelho.'); }
      else setMsg(j?.status === 'pending' ? 'Esse pagamento ainda está pendente.' : j?.message || 'Não foi possível validar este código.');
    } catch { setMsg('Sem ligação à internet.'); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Recuperar pagamento</h1>
      <p className="text-mute">Mudaste de telemóvel ou limpaste os dados? Cola aqui o código do recibo (começa por DD-) que recebeste ao pagar.</p>
      <input className="input font-mono text-sm" value={ref} onChange={e => setRef(e.target.value)} placeholder="DD-…" autoCapitalize="characters" />
      <button className="btn-primary w-full" disabled={busy || ref.trim().length < 20} onClick={enviar}>{busy ? 'A verificar…' : 'Recuperar'}</button>
      {msg && <p className={`card ${ok ? 'border-verde bg-verde-soft' : ''}`} role="status">{msg}</p>}
      {ok && <Link href="/" className="btn-ghost w-full">Ir para o início</Link>}
    </div>
  );
}
