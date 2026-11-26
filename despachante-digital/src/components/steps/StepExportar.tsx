'use client';
import { useMemo, useState } from 'react';
import type { Candidatura, CvData, DocId, Pessoal, Vaga } from '@/lib/types';
import { DOC_MAP } from '@/lib/docs';
import { nomeFicheiro, nomeZip } from '@/lib/names';
import { construirDoc } from '../docBuild';
import { baixarBlob, criarZip, juntarPdfs, paraBase64, partilhar, pdfBlob, podePartilharFicheiros } from '@/lib/files';
import { Permissoes, temAcesso } from '@/lib/entitlement';
import { Passo } from '../Fields';
import PayDialog from '../PayDialog';
import { localMsisdn, isMzLocal, formatTel } from '@/lib/mz';
import { PRECOS } from '@/lib/pricing';
import { apiJson } from '@/lib/api';

type Pronto = { id: DocId; nome: string; bytes: Uint8Array; paginas: number };

export default function StepExportar({ vaga, p, cv, cand, docs, perm, recarregarPerm }: { vaga: Vaga; p: Pessoal; cv: CvData; cand: Candidatura; docs: DocId[]; perm: Permissoes | null; recarregarPerm: () => void }) {
  const [pagar, setPagar] = useState(false); const [busy, setBusy] = useState(''); const [aviso, setAviso] = useState('');
  const [wa, setWa] = useState(localMsisdn(p.telefone)); const [waEstado, setWaEstado] = useState('');
  const liberados = docs.filter(d => temAcesso(perm, d)); const bloqueados = docs.filter(d => !temAcesso(perm, d));
  const dados = { p, cv, cand, vaga };
  const nomes = useMemo(() => Object.fromEntries(docs.map((d, i) => [d, nomeFicheiro(i + 1, DOC_MAP[d].ficheiro, p, vaga)])) as Record<DocId, string>, [docs, p, vaga]);
  const temWA = true;

  const gerar = async (ids: DocId[]): Promise<Pronto[]> => {
    const out: Pronto[] = [];
    for (const id of ids) { const r = await construirDoc(id, dados, false); if (r) out.push({ id, nome: nomes[id], bytes: r.bytes, paginas: r.paginas }); }
    out.forEach((f, i) => { f.nome = nomeFicheiro(i + 1, DOC_MAP[f.id].ficheiro, p, vaga); });   // numeração sequencial, sem saltos
    return out;
  };
  const exec = async (txt: string, fn: () => Promise<void>) => { setBusy(txt); setAviso(''); try { await fn(); } catch (e: any) { console.error(e); setAviso('Algo correu mal ao gerar os ficheiros. Tenta de novo.'); } finally { setBusy(''); } };

  const baixarZip = () => exec('A preparar o ZIP…', async () => { const fs = await gerar(liberados); if (!fs.length) { setAviso('Ainda não há documentos prontos (falta digitalizar?).'); return; } baixarBlob(criarZip(fs), nomeZip(p, vaga)); const falta = liberados.filter(d => !fs.some(f => f.id === d)); if (falta.length) setAviso(`Ficaram de fora (ainda sem digitalização): ${falta.map(d => DOC_MAP[d].label).join(', ')}.`); });
  const baixarUm = (id: DocId) => exec('A gerar…', async () => { const [f] = await gerar([id]); if (!f) { setAviso('Este documento ainda não tem digitalização.'); return; } baixarBlob(pdfBlob(f.bytes), f.nome); });
  const imprimir = () => exec('A preparar a impressão…', async () => { const fs = await gerar(liberados); if (!fs.length) return; const junto = await juntarPdfs(fs.map(f => f.bytes)); const url = URL.createObjectURL(pdfBlob(junto)); const w = window.open(url, '_blank'); if (!w) baixarBlob(pdfBlob(junto), nomeZip(p, vaga).replace('.zip', '_IMPRIMIR.pdf')); });
  const partilharTudo = () => exec('A preparar…', async () => {
    const fs = await gerar(liberados); const files = fs.map(f => new File([f.bytes as BlobPart], f.nome, { type: 'application/pdf' }));
    if (!podePartilharFicheiros(files)) { setAviso('Este aparelho não permite partilhar ficheiros directamente. Usa “Baixar tudo”.'); return; }
    await partilhar(files, `Candidatura — ${vaga.titulo || vaga.entidade}`, `Candidatura de ${p.nome}`).catch(() => {});
  });
  const enviarWA = () => exec('A enviar por WhatsApp…', async () => {
    const token = perm?.tokens.find(t => t.info.scope === 'tudo' || docs.some(d => t.info.mask & (1 << DOC_LIST_INDEX(d))))?.token; if (!token) return;
    const fs = await gerar(liberados); let ok = 0; setWaEstado('');
    for (const f of fs) {
      const tk = perm!.tokens.find(t => t.info.scope === 'tudo' || (t.info.mask & (1 << DOC_LIST_INDEX(f.id))))?.token ?? token;
      const { ok: httpOk, data: j } = await apiJson('/api/whatsapp/send', { method: 'POST', timeoutMs: 40000, body: JSON.stringify({ token: tk, doc: f.id, number: wa, fileName: f.nome, base64: paraBase64(f.bytes), caption: `${DOC_MAP[f.id].label} — ${p.nome}` }) });
      if (!httpOk || !j?.ok) { setWaEstado(j?.message || 'Falha no envio.'); return; } ok++;
    }
    setWaEstado(`Enviado${ok > 1 ? 's' : ''} ${ok} ficheiro${ok > 1 ? 's' : ''} para o WhatsApp ${formatTel(wa)}.`);
  });
  const assunto = encodeURIComponent(`Candidatura — ${vaga.titulo || vaga.entidade} — ${p.nome}`);
  const corpo = encodeURIComponent(`Exmos. Senhores,\n\nVenho submeter a minha candidatura (${vaga.titulo || vaga.entidade}). Seguem em anexo os documentos solicitados.\n\nCom os melhores cumprimentos,\n${p.nome}\n${p.telefone ? 'Tel.: ' + formatTel(p.telefone) : ''}`);

  return (
    <Passo titulo="Tudo pronto" sub={bloqueados.length ? 'Desbloqueia para descarregar os PDFs sem marca de água.' : 'Descarrega, imprime ou envia. Podes voltar atrás e corrigir sempre que quiseres.'}>
      <ul className="space-y-2">{docs.map(d => { const ok = temAcesso(perm, d); return (
        <li key={d} className="card !p-3 flex items-center gap-3"><span className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${ok ? 'bg-verde text-white' : 'bg-paper text-mute'}`}>{ok ? '✓' : '🔒'}</span>
          <span className="min-w-0 flex-1"><span className="block font-semibold text-sm">{DOC_MAP[d].label}</span><span className="block text-[12px] text-mute break-all">{nomes[d]}</span></span>
          {ok && <button className="btn-ghost btn-sm" disabled={!!busy} onClick={() => baixarUm(d)}>PDF</button>}</li>); })}</ul>

      {bloqueados.length > 0 && <div className="card bg-sol-soft border-sol/60 space-y-3"><div><p className="font-extrabold text-lg">{PRECOS.tudo} MZN — tudo</p><p className="text-sm">Ou 35 MZN por documento. Pagas com M-Pesa, e-Mola ou mKesh, no teu telemóvel.</p></div><button className="btn-primary w-full" onClick={() => setPagar(true)}>Desbloquear com M-Pesa / e-Mola / mKesh</button></div>}

      {liberados.length > 0 && <div className="space-y-3">
        <button className="btn-primary w-full" disabled={!!busy} onClick={baixarZip}>Baixar tudo num só ficheiro (ZIP)</button>
        <div className="grid grid-cols-2 gap-2"><button className="btn-ghost" disabled={!!busy} onClick={partilharTudo}>Partilhar…</button><button className="btn-ghost" disabled={!!busy} onClick={imprimir}>Imprimir tudo</button></div>
        {vaga.canal === 'email' && <a className="btn-sol w-full" href={`mailto:${vaga.contacto?.email || ''}?subject=${assunto}&body=${corpo}`}>Abrir email para {vaga.contacto?.email || 'a empresa'}</a>}
        {vaga.canal === 'email' && <p className="hint">O email abre sem anexos (limitação dos telemóveis). Anexa os PDFs que baixaste, ou usa “Partilhar…” e escolhe o Gmail.</p>}
        {temWA && <div className="card space-y-2"><p className="font-bold text-sm">Receber no WhatsApp</p><div className="flex gap-2"><input className="input" inputMode="tel" value={wa} onChange={e => setWa(localMsisdn(e.target.value))} placeholder="84 123 4567" /><button className="btn-ghost shrink-0" disabled={!!busy || !isMzLocal(wa)} onClick={enviarWA}>Enviar</button></div>{waEstado && <p className="text-sm" role="status">{waEstado}</p>}</div>}
        {cand.recibo && null}
      </div>}
      {busy && <p className="text-sm text-mute" role="status">{busy}</p>}
      {aviso && <p className="card text-rubi border-rubi/40" role="alert">{aviso}</p>}
      {vaga.entrega && vaga.entrega.length > 0 && (
        <div className="card space-y-2"><p className="font-bold">Antes de entregar</p>
          <ul className="space-y-2 text-sm">{vaga.entrega.map(e => <li key={e} className="flex gap-2"><span aria-hidden="true">☐</span><span>{e}</span></li>)}</ul>
          {vaga.fonte && <a href={vaga.fonte} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-verde underline">Conferir no aviso oficial</a>}
        </div>
      )}
      {vaga.notas && <p className="hint">{vaga.notas}</p>}
      {pagar && <PayDialog vagaId={vaga.id} docs={docs} perm={perm} telefone={p.telefone} onClose={() => setPagar(false)} onPaid={recarregarPerm} />}
    </Passo>
  );
}
import { docBit as DOC_LIST_INDEX } from '@/lib/docs';
