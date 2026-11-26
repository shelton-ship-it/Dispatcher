'use client';
import { useEffect, useRef, useState } from 'react';
import type { ScanOpts } from '@/lib/types';
import { processarScan } from '@/lib/image';

type Crop = { x: number; y: number; w: number; h: number };
type Handle = 'tl' | 'tr' | 'bl' | 'br' | 'move';

/** Ecrã de edição: rodar, recortar (arrastar cantos) e escolher o filtro. */
export default function Cropper({ src, inicial, onSave, onCancel }: { src: Blob; inicial: ScanOpts; onSave: (o: ScanOpts) => Promise<void>; onCancel: () => void }) {
  const [rot, setRot] = useState<ScanOpts['rot']>(inicial.rot);
  const [filtro, setFiltro] = useState<ScanOpts['filtro']>(inicial.filtro);
  const [crop, setCrop] = useState<Crop>(inicial.crop ?? { x: 0.03, y: 0.03, w: 0.94, h: 0.94 });
  const [prev, setPrev] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ h: Handle; sx: number; sy: number; c: Crop } | null>(null);

  useEffect(() => { // pré-visualização já rodada (reduzida)
    let url = ''; let off = false;
    processarScan(src, { filtro: 'original', rot, crop: null }, 1100).then(r => { if (off) return; url = URL.createObjectURL(r.blob); setPrev(url); });
    return () => { off = true; if (url) URL.revokeObjectURL(url); };
  }, [src, rot]);

  const down = (h: Handle) => (e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); (e.target as HTMLElement).setPointerCapture(e.pointerId); drag.current = { h, sx: e.clientX, sy: e.clientY, c: crop }; };
  const move = (e: React.PointerEvent) => {
    const d = drag.current; const r = box.current?.getBoundingClientRect(); if (!d || !r) return;
    const dx = (e.clientX - d.sx) / r.width; const dy = (e.clientY - d.sy) / r.height; const c = { ...d.c }; const min = 0.1;
    if (d.h === 'move') { c.x = Math.min(1 - c.w, Math.max(0, c.x + dx)); c.y = Math.min(1 - c.h, Math.max(0, c.y + dy)); }
    else {
      if (d.h.includes('l')) { const nx = Math.min(c.x + c.w - min, Math.max(0, c.x + dx)); c.w += c.x - nx; c.x = nx; } else { c.w = Math.min(1 - c.x, Math.max(min, c.w + dx)); }
      if (d.h.includes('t')) { const ny = Math.min(c.y + c.h - min, Math.max(0, c.y + dy)); c.h += c.y - ny; c.y = ny; } else { c.h = Math.min(1 - c.y, Math.max(min, c.h + dy)); }
    }
    setCrop(c);
  };
  const up = () => { drag.current = null; };
  const girar = () => { setRot(r => ((r + 90) % 360) as ScanOpts['rot']); setCrop({ x: 0.03, y: 0.03, w: 0.94, h: 0.94 }); };
  const guardar = async () => { setBusy(true); try { await onSave({ rot, filtro, crop }); } finally { setBusy(false); } };
  const hnd = (h: Handle, st: React.CSSProperties) => <span onPointerDown={down(h)} style={{ ...st, touchAction: 'none' }} className="absolute w-9 h-9 -m-[18px] flex items-center justify-center"><span className="w-5 h-5 rounded-full bg-sol border-2 border-white shadow" /></span>;

  return (
    <div className="fixed inset-0 z-50 bg-ink/90 flex flex-col" role="dialog" aria-modal="true" aria-label="Editar digitalização">
      <div className="flex-1 min-h-0 flex items-center justify-center p-3" onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        {prev ? (
          <div ref={box} className="relative select-none" style={{ touchAction: 'none' }}>
            <img src={prev} alt="" draggable={false} className="block max-h-[62vh] max-w-full" />
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(0,0,0,.5)', clipPath: `polygon(0 0,100% 0,100% 100%,0 100%,0 0,${crop.x * 100}% ${crop.y * 100}%,${crop.x * 100}% ${(crop.y + crop.h) * 100}%,${(crop.x + crop.w) * 100}% ${(crop.y + crop.h) * 100}%,${(crop.x + crop.w) * 100}% ${crop.y * 100}%,${crop.x * 100}% ${crop.y * 100}%)` }} />
            <div onPointerDown={down('move')} className="absolute border-2 border-sol" style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.w * 100}%`, height: `${crop.h * 100}%`, touchAction: 'none' }} />
            {hnd('tl', { left: `${crop.x * 100}%`, top: `${crop.y * 100}%` })}{hnd('tr', { left: `${(crop.x + crop.w) * 100}%`, top: `${crop.y * 100}%` })}
            {hnd('bl', { left: `${crop.x * 100}%`, top: `${(crop.y + crop.h) * 100}%` })}{hnd('br', { left: `${(crop.x + crop.w) * 100}%`, top: `${(crop.y + crop.h) * 100}%` })}
          </div>
        ) : <p className="text-white">A abrir…</p>}
      </div>
      <div className="bg-white p-3 space-y-3 rounded-t-2xl">
        <p className="text-[13px] text-mute text-center">Arrasta os pontos amarelos até aos cantos do documento.</p>
        <div className="flex gap-2 justify-center flex-wrap">
          {([['doc', 'Documento (recomendado)'], ['cinza', 'Preto e branco'], ['original', 'Original']] as const).map(([k, l]) => <button key={k} onClick={() => setFiltro(k)} className={`chip ${filtro === k ? 'chip-on' : ''}`}>{l}</button>)}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button className="btn-ghost" onClick={girar}>Rodar ↻</button><button className="btn-ghost" onClick={onCancel}>Cancelar</button><button className="btn-primary" disabled={busy} onClick={guardar}>{busy ? 'A guardar…' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  );
}
