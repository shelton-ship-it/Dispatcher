'use client';
import type { Candidatura, CvData, DocId, Pessoal, Vaga } from '@/lib/types';
import { construir, Built } from '@/lib/pdf/build';
import { carregarFoto, carregarScans } from '@/lib/loaders';

export type Dados = { p: Pessoal; cv: CvData; cand: Candidatura; vaga: Vaga };
export async function construirDoc(id: DocId, d: Dados, marca: boolean): Promise<Built> {
  const [foto, scans] = await Promise.all([id === 'cv' ? carregarFoto(d.cv) : Promise.resolve(null), carregarScans(d.cand, [id])]);
  return construir(id, { ...d, foto, scans }, marca);
}
export const chaveDados = (id: DocId, d: Dados, marca: boolean) => JSON.stringify([id, marca, d.p, id === 'cv' ? d.cv : id === 'carta' ? [d.cv.educacao, d.cv.experiencia] : 0, { ...d.cand, passo: 0, atualizado: 0, docs: 0, scans: d.cand.scans[id] ?? [], textos: d.cand.textos }, d.vaga.id]);
