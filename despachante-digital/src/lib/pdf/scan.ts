import { PDFDocument } from 'pdf-lib';
import { A4 } from './text';

export type ImgPage = { bytes: Uint8Array; w: number; h: number };

/** Imagens digitalizadas → PDF A4. 'pagina': 1 imagem por página · 'duas': 2 imagens (ex.: frente e verso do BI) na mesma página. */
export async function criarScanPdf(imgs: ImgPage[], layout: 'pagina' | 'duas', titulo: string): Promise<PDFDocument> {
  const doc = await PDFDocument.create(); doc.setTitle(titulo);
  const fit = (w: number, h: number, bw: number, bh: number) => { const s = Math.min(bw / w, bh / h); return { w: w * s, h: h * s }; };
  if (layout === 'duas') {
    for (let i = 0; i < imgs.length; i += 2) {
      const page = doc.addPage([A4.w, A4.h]);
      const slot = (A4.h - 120) / 2; const bw = A4.w - 120;
      for (let j = 0; j < 2 && i + j < imgs.length; j++) {
        const im = imgs[i + j]; const jpg = await doc.embedJpg(im.bytes); const d = fit(im.w, im.h, Math.min(bw, 400), slot - 36);
        const top = A4.h - 60 - j * slot;
        page.drawImage(jpg, { x: (A4.w - d.w) / 2, y: top - d.h, width: d.w, height: d.h });
      }
    }
  } else {
    for (const im of imgs) {
      const page = doc.addPage([A4.w, A4.h]); const jpg = await doc.embedJpg(im.bytes);
      const d = fit(im.w, im.h, A4.w - 56, A4.h - 56);
      page.drawImage(jpg, { x: (A4.w - d.w) / 2, y: (A4.h - d.h) / 2, width: d.w, height: d.h });
    }
  }
  return doc;
}
