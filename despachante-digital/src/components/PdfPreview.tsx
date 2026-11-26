'use client';
import { useEffect, useRef, useState } from 'react';

/** Mostra um PDF em canvas (funciona em todos os telemóveis, ao contrário do <iframe> de PDF). */
export default function PdfPreview({ bytes }: { bytes: Uint8Array | null }) {
  const ref = useRef<HTMLDivElement>(null); const [erro, setErro] = useState('');
  useEffect(() => {
    const host = ref.current; if (!host || !bytes) return; let cancel = false; setErro('');
    (async () => {
      try {
        // @ts-ignore — pdfjs 3.x (compatível com telemóveis mais antigos)
        const pdfjs: any = await import('pdfjs-dist/build/pdf');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
        const pdf = await pdfjs.getDocument({ data: bytes.slice() }).promise; if (cancel) return;
        const frag = document.createDocumentFragment(); const width = host.clientWidth || 320; const dpr = Math.min(2, window.devicePixelRatio || 1);
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i); const v0 = page.getViewport({ scale: 1 }); const sc = (width / v0.width) * dpr; const vp = page.getViewport({ scale: sc });
          const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; c.style.width = '100%'; c.style.display = 'block'; c.className = 'bg-white shadow border border-line mb-3 rounded-sm';
          await page.render({ canvasContext: c.getContext('2d')!, viewport: vp }).promise; if (cancel) return; frag.appendChild(c);
        }
        if (!cancel) { host.replaceChildren(frag); }
      } catch (e: any) { if (!cancel) setErro('Não foi possível mostrar a pré-visualização.'); }
    })();
    return () => { cancel = true; };
  }, [bytes]);
  return <div><div ref={ref} className="min-h-[200px]">{!bytes && <div className="aspect-[1/1.41] bg-white animate-pulse rounded" />}</div>{erro && <p className="text-rubi text-sm">{erro}</p>}</div>;
}
