import type { Candidatura, CvData, DocId, Pessoal, Vaga } from '../types';
import { DOC_MAP } from '../docs';
import { criarCarta, criarHonra, criarRequerimento } from './letters';
import { criarCv } from './cv';
import { criarScanPdf, ImgPage } from './scan';
import { marcaDagua } from './text';
import { estiloPorId } from '../cvstyles';

export type BuildData = {
  p: Pessoal; vaga: Vaga; cand: Candidatura; cv: CvData;
  foto?: { quadrada: Uint8Array; circulo: Uint8Array } | null;
  scans: Partial<Record<DocId, ImgPage[]>>;
};
export type Built = { bytes: Uint8Array; paginas: number } | null;

/** Constrói UM documento em PDF — 100% no browser. `marca=true` → pré-visualização com marca de água. */
export async function construir(id: DocId, d: BuildData, marca: boolean): Promise<Built> {
  const ctx = { p: d.p, vaga: d.vaga, cand: d.cand, cv: d.cv };
  let doc;
  if (id === 'requerimento') doc = await criarRequerimento(ctx);
  else if (id === 'honra') doc = await criarHonra(ctx);
  else if (id === 'carta') doc = await criarCarta(ctx);
  else if (id === 'cv') doc = await criarCv({ ...ctx, style: estiloPorId(d.cand.modelo), fotoQuadrada: d.foto?.quadrada, fotoCirculo: d.foto?.circulo });
  else {
    const imgs = d.scans[id];
    if (!imgs?.length) return null;
    const def = DOC_MAP[id];
    doc = await criarScanPdf(imgs, d.cand.scanLayout[id] ?? def.scan?.layoutPadrao ?? 'pagina', def.label);
  }
  if (marca) await marcaDagua(doc);
  const bytes = await doc.save();
  return { bytes, paginas: doc.getPageCount() };
}
