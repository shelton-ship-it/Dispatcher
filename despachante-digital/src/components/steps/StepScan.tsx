'use client';
import { useEffect, useRef, useState } from 'react';
import type { Candidatura, DocId, DocReq, Pessoal, ScanOpts, ScanPage } from '@/lib/types';
import { DOC_MAP } from '@/lib/docs';
import { Passo } from '../Fields';
import Cropper from '../Cropper';
import { idbDel, idbGet, idbSet } from '@/lib/idb';
import { kOut, kSrc } from '@/lib/loaders';
import { processarScan, reduzir } from '@/lib/image';
import { uid } from '@/lib/store';

const OPTS0: ScanOpts = { filtro: 'doc', rot: 0, crop: null };

function Miniatura({ doc, page }: { doc: DocId; page: ScanPage }) {
  const [u, setU] = useState('');
  useEffect(() => { let url = ''; let off = false; idbGet<Blob>(kOut(doc, page.id)).then(b => { if (b && !off) { url = URL.createObjectURL(b); setU(url); } }); return () => { off = true; if (url) URL.revokeObjectURL(url); }; }, [doc, page.id, page.opts]);
  return u ? <img src={u} alt={page.rotulo} className="w-full h-full object-contain bg-slate-100" /> : <div className="w-full h-full bg-slate-100 animate-pulse" />;
}

export default function StepScan({ doc, cand, setCand, p, setP, req }: { req?: DocReq; doc: DocId; cand: Candidatura; setCand: (f: (x: Candidatura) => Candidatura) => void; p: Pessoal; setP: (x: Partial<Pessoal>) => void }) {
  const def = DOC_MAP[doc]; const sc = def.scan!;
  const pages = cand.scans[doc] ?? [];
  const cam = useRef<HTMLInputElement>(null); const gal = useRef<HTMLInputElement>(null);
  const [edit, setEdit] = useState<{ page: ScanPage; src: Blob } | null>(null);
  const [busy, setBusy] = useState(''); const [erro, setErro] = useState('');
  const [ocr, setOcr] = useState<{ prog: number; achados: string[] } | null>(null);
  const [slot, setSlot] = useState<string>('');
  const proximoRotulo = () => (sc.faces ? sc.faces.find(f => !pages.some(pg => pg.rotulo === f)) ?? `Página ${pages.length + 1}` : `Página ${pages.length + 1}`);
  const cheio = pages.length >= sc.max;

  const setPages = (fn: (x: ScanPage[]) => ScanPage[]) => setCand(c => ({ ...c, scans: { ...c.scans, [doc]: fn(c.scans[doc] ?? []) } }));

  const novo = async (f?: File) => {
    if (!f) return; setErro(''); setBusy('A preparar a imagem…');
    try {
      const red = await reduzir(f, 2200, 0.88);
      const id = uid(); const rotulo = slot || proximoRotulo();
      await idbSet(kSrc(doc, id), red.blob);
      const out = await processarScan(red.blob, OPTS0);
      await idbSet(kOut(doc, id), out.blob);
      const pg: ScanPage = { id, rotulo, w: out.w, h: out.h, opts: OPTS0 };
      setPages(a => (sc.faces ? [...a.filter(x => x.rotulo !== rotulo), pg].sort((x, y) => sc.faces!.indexOf(x.rotulo) - sc.faces!.indexOf(y.rotulo)) : [...a, pg]));
      setEdit({ page: pg, src: red.blob });
    } catch (e: any) { setErro(e?.message || 'Não foi possível abrir a imagem.'); } finally { setBusy(''); setSlot(''); }
  };
  const abrirEditor = async (pg: ScanPage) => { const b = await idbGet<Blob>(kSrc(doc, pg.id)); if (b) setEdit({ page: pg, src: b }); };
  const guardarEdicao = async (o: ScanOpts) => {
    if (!edit) return; const out = await processarScan(edit.src, o);
    await idbSet(kOut(doc, edit.page.id), out.blob);
    setPages(a => a.map(x => (x.id === edit.page.id ? { ...x, w: out.w, h: out.h, opts: o } : x))); setEdit(null);
  };
  const remover = async (pg: ScanPage) => { await Promise.all([idbDel(kOut(doc, pg.id)), idbDel(kSrc(doc, pg.id))]); setPages(a => a.filter(x => x.id !== pg.id)); };
  const mover = (i: number, d: number) => setPages(a => { const j = i + d; if (j < 0 || j >= a.length) return a; const c = [...a]; [c[i], c[j]] = [c[j], c[i]]; return c; });

  const lerNumero = async () => {
    const pg = pages[0]; if (!pg) return; setOcr({ prog: 0, achados: [] });
    try {
      const b = await idbGet<Blob>(kOut(doc, pg.id)); if (!b) return;
      const { createWorker } = await import('tesseract.js');
      const w = await createWorker('por', 1, { logger: m => { if (m.status === 'recognizing text') setOcr(o => ({ prog: Math.round(m.progress * 100), achados: o?.achados ?? [] })); } });
      const r = await w.recognize(b); await w.terminate();
      const txt = r.data.text.replace(/[Oo](?=\d)/g, '0');
      const set = new Set<string>();
      if (doc === 'bi') (txt.match(/\b\d{12}[A-Z]\b/g) || []).forEach(x => set.add(x));
      if (doc === 'nuit' || doc === 'bi') (txt.match(/\b\d{9}\b/g) || []).forEach(x => set.add(x));
      setOcr({ prog: 100, achados: [...set].slice(0, 4) });
    } catch { setOcr(null); setErro('Não foi possível ler o texto (precisa de internet na primeira vez). Podes escrever o número à mão.'); }
  };
  const usar = (v: string) => { if (/^\d{12}[A-Z]$/.test(v)) setP({ biNumero: v }); else setP({ nuit: v }); setOcr(null); };

  const slots = sc.faces ?? [];
  return (
    <Passo titulo={`Digitalizar: ${def.label}`} sub={sc.dica}>
      {(req?.como || req?.autenticado || req?.reconhecida) && <div className="card bg-sol-soft border-sol/60 text-sm"><b>O que o aviso pede:</b> {req?.como}{req?.confirmar ? ' (confirma no aviso)' : ''}</div>}
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={e => { novo(e.target.files?.[0]); e.target.value = ''; }} />
      <input ref={gal} type="file" accept="image/*" hidden onChange={e => { novo(e.target.files?.[0]); e.target.value = ''; }} />
      {slots.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {slots.map(s => { const pg = pages.find(x => x.rotulo === s); return (
            <div key={s} className="card !p-2">
              <p className="text-sm font-bold mb-1">{s}</p>
              <div className="aspect-[1.6] rounded-lg overflow-hidden border border-line">{pg ? <Miniatura doc={doc} page={pg} /> : <div className="w-full h-full flex items-center justify-center text-mute text-sm bg-paper">Falta</div>}</div>
              <div className="grid gap-1.5 mt-2">
                {pg ? (<><button className="btn-ghost btn-sm" onClick={() => abrirEditor(pg)}>Recortar</button><button className="btn-ghost btn-sm" onClick={() => { setSlot(s); cam.current?.click(); }}>Tirar outra</button></>)
                  : (<><button className="btn-primary btn-sm" onClick={() => { setSlot(s); cam.current?.click(); }}>Tirar foto</button><button className="btn-ghost btn-sm" onClick={() => { setSlot(s); gal.current?.click(); }}>Da galeria</button></>)}
              </div>
            </div>); })}
        </div>
      ) : (
        <div className="space-y-3">
          {pages.map((pg, i) => (
            <div key={pg.id} className="card !p-2 flex gap-3 items-center">
              <div className="w-20 h-28 shrink-0 rounded-lg overflow-hidden border border-line"><Miniatura doc={doc} page={pg} /></div>
              <div className="flex-1 min-w-0"><p className="font-bold text-sm">{pg.rotulo}</p>
                <div className="flex flex-wrap gap-1.5 mt-2"><button className="btn-ghost btn-sm" onClick={() => abrirEditor(pg)}>Recortar</button><button className="btn-ghost btn-sm" disabled={i === 0} onClick={() => mover(i, -1)}>↑</button><button className="btn-ghost btn-sm" disabled={i === pages.length - 1} onClick={() => mover(i, 1)}>↓</button><button className="btn-ghost btn-sm text-rubi" onClick={() => remover(pg)}>Apagar</button></div></div>
            </div>))}
          {!cheio && <div className="grid grid-cols-2 gap-2"><button className="btn-primary" onClick={() => { setSlot(''); cam.current?.click(); }}>{pages.length ? 'Tirar outra página' : 'Tirar foto'}</button><button className="btn-ghost" onClick={() => { setSlot(''); gal.current?.click(); }}>Escolher da galeria</button></div>}
        </div>
      )}
      {busy && <p className="text-sm text-mute" role="status">{busy}</p>}
      {erro && <p className="card text-sm text-rubi border-rubi/40" role="alert">{erro}</p>}

      {pages.length > 1 && sc.faces && (
        <div className="card"><p className="label">Como ficam no PDF?</p>
          <div className="grid grid-cols-2 gap-2">{([['duas', 'Frente e verso na mesma página'], ['pagina', 'Uma página para cada']] as const).map(([k, l]) => <button key={k} onClick={() => setCand(c => ({ ...c, scanLayout: { ...c.scanLayout, [doc]: k } }))} className={`btn btn-sm ${(cand.scanLayout[doc] ?? sc.layoutPadrao) === k ? 'btn-primary' : 'btn-ghost'}`}>{l}</button>)}</div></div>
      )}

      {(doc === 'bi' || doc === 'nuit') && pages.length > 0 && (
        <div className="card space-y-2">
          <p className="font-bold text-sm">Preencher o número automaticamente</p>
          <p className="hint">Lemos a imagem no teu telemóvel. Tu confirmas antes de usar.</p>
          {!ocr && <button className="btn-ghost btn-sm" onClick={lerNumero}>Ler {doc === 'bi' ? 'número do BI' : 'NUIT'}</button>}
          {ocr && ocr.prog < 100 && <p className="text-sm" role="status">A ler… {ocr.prog}%</p>}
          {ocr && ocr.prog === 100 && (ocr.achados.length ? <div className="flex flex-wrap gap-2">{ocr.achados.map(a => <button key={a} className="chip chip-on" onClick={() => usar(a)}>Usar {a}</button>)}</div> : <p className="text-sm text-mute">Não encontrámos o número. Tenta recortar melhor ou escreve-o no passo dos teus dados.</p>)}
          {doc === 'nuit' && p.nuit && <p className="text-sm">NUIT guardado: <b>{p.nuit}</b></p>}
          {doc === 'bi' && p.biNumero && <p className="text-sm">BI guardado: <b>{p.biNumero}</b></p>}
        </div>
      )}
      {edit && <Cropper src={edit.src} inicial={edit.page.opts} onSave={guardarEdicao} onCancel={() => setEdit(null)} />}
    </Passo>
  );
}
