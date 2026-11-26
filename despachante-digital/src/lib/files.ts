'use client';
import { zipSync } from 'fflate';
import { PDFDocument } from 'pdf-lib';

export function baixarBlob(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = nome; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
export const pdfBlob = (bytes: Uint8Array) => new Blob([bytes as BlobPart], { type: 'application/pdf' });

export function criarZip(ficheiros: { nome: string; bytes: Uint8Array }[]) {
  const o: Record<string, Uint8Array> = {};
  ficheiros.forEach(f => { o[f.nome] = f.bytes; });
  return new Blob([zipSync(o, { level: 0 }) as BlobPart], { type: 'application/zip' });
}

export async function juntarPdfs(lista: Uint8Array[]) {
  const out = await PDFDocument.create();
  for (const b of lista) { const src = await PDFDocument.load(b); (await out.copyPages(src, src.getPageIndices())).forEach(pg => out.addPage(pg)); }
  return out.save();
}

/** Partilha nativa (WhatsApp, Gmail, etc.) — só em telemóveis que suportam ficheiros. */
export function podePartilharFicheiros(files: File[]) {
  try { return !!(navigator as any).canShare?.({ files }); } catch { return false; }
}
export async function partilhar(files: File[], titulo: string, texto: string) {
  await (navigator as any).share({ files, title: titulo, text: texto });
}
export function paraBase64(bytes: Uint8Array) {
  let s = ''; const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode(...bytes.subarray(i, i + CH));
  return btoa(s);
}
