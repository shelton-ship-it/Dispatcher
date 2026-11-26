'use client';
import type { Candidatura, CvData, DocId } from './types';
import { idbGet } from './idb';
import { bytes, prepararFoto } from './image';
import type { ImgPage } from './pdf/scan';

export const kOut = (doc: DocId, id: string) => `out:${doc}:${id}`;
export const kSrc = (doc: DocId, id: string) => `src:${doc}:${id}`;
export const kFoto = 'foto';

export async function carregarScans(cand: Candidatura, docs: DocId[]): Promise<Partial<Record<DocId, ImgPage[]>>> {
  const out: Partial<Record<DocId, ImgPage[]>> = {};
  for (const d of docs) {
    const pages = cand.scans[d]; if (!pages?.length) continue;
    const arr: ImgPage[] = [];
    for (const pg of pages) { const b = await idbGet<Blob>(kOut(d, pg.id)); if (b) arr.push({ bytes: await bytes(b), w: pg.w, h: pg.h }); }
    if (arr.length) out[d] = arr;
  }
  return out;
}

let fotoCache: { ver: number; val: { quadrada: Uint8Array; circulo: Uint8Array } | null } | null = null;
export async function carregarFoto(cv: CvData) {
  const ver = cv.fotoVer ?? 0;
  if (fotoCache && fotoCache.ver === ver) return fotoCache.val;
  let val: { quadrada: Uint8Array; circulo: Uint8Array } | null = null;
  if (ver > 0) { const b = await idbGet<Blob>(kFoto); if (b) { try { val = await prepararFoto(b); } catch { val = null; } } }
  fotoCache = { ver, val };
  return val;
}
