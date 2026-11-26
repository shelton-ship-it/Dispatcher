import type { ScanOpts } from './types';

export async function carregarImagem(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(blob, { imageOrientation: 'from-image' } as ImageBitmapOptions); } catch { /* fallback */ }
  }
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(blob); const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Não foi possível abrir a imagem.')); };
    img.src = url;
  });
}
const dim = (i: ImageBitmap | HTMLImageElement) => ({ w: 'naturalWidth' in i ? i.naturalWidth : i.width, h: 'naturalHeight' in i ? i.naturalHeight : i.height });

function canvas(w: number, h: number) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
const toBlob = (c: HTMLCanvasElement, type = 'image/jpeg', q = 0.82) => new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('Falha ao gerar imagem.'))), type, q));

/** Reduz a foto original (as câmaras actuais têm 12+ MP) para o ecrã de edição e para guardar. */
export async function reduzir(blob: Blob, maxSide = 2000, q = 0.86): Promise<{ blob: Blob; w: number; h: number }> {
  const img = await carregarImagem(blob); const { w, h } = dim(img);
  const sc = Math.min(1, maxSide / Math.max(w, h));
  const c = canvas(w * sc, h * sc); c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return { blob: await toBlob(c, 'image/jpeg', q), w: c.width, h: c.height };
}

function autoNiveis(c: HTMLCanvasElement, cinza: boolean) {
  const ctx = c.getContext('2d')!; const im = ctx.getImageData(0, 0, c.width, c.height); const d = im.data;
  const hist = new Uint32Array(256); const step = 4 * Math.max(1, Math.floor((d.length / 4) / 60000));
  let n = 0;
  for (let i = 0; i < d.length; i += step) { hist[Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])]++; n++; }
  let acc = 0; let lo = 0; let hi = 255;
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= n * 0.015) { lo = v; break; } }
  acc = 0; for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= n * 0.12) { hi = v; break; } }   // 12% mais claros = papel
  if (hi - lo < 40) { lo = 0; hi = 255; }
  const gain = 255 / (hi - lo);
  for (let i = 0; i < d.length; i += 4) {
    if (cinza) { const g = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] - lo) * gain; const v = g < 0 ? 0 : g > 255 ? 255 : g; d[i] = d[i + 1] = d[i + 2] = v; }
    else for (let j = 0; j < 3; j++) { const v = (d[i + j] - lo) * gain; d[i + j] = v < 0 ? 0 : v > 255 ? 255 : v; }
  }
  ctx.putImageData(im, 0, 0);
}

/** Aplica rotação → recorte → filtro e devolve JPEG pronto a entrar no PDF. */
export async function processarScan(src: Blob, o: ScanOpts, maxSide = 1700): Promise<{ blob: Blob; w: number; h: number }> {
  const img = await carregarImagem(src); const { w, h } = dim(img);
  const rot = o.rot; const rw = rot % 180 ? h : w; const rh = rot % 180 ? w : h;
  const rc = canvas(rw, rh); const rx = rc.getContext('2d')!;
  rx.translate(rw / 2, rh / 2); rx.rotate((rot * Math.PI) / 180); rx.drawImage(img, -w / 2, -h / 2);
  const cr = o.crop ?? { x: 0, y: 0, w: 1, h: 1 };
  const sx = cr.x * rw; const sy = cr.y * rh; const sw = cr.w * rw; const sh = cr.h * rh;
  const sc = Math.min(1, maxSide / Math.max(sw, sh));
  const out = canvas(sw * sc, sh * sc); const ox = out.getContext('2d')!;
  ox.fillStyle = '#fff'; ox.fillRect(0, 0, out.width, out.height);
  ox.drawImage(rc, sx, sy, sw, sh, 0, 0, out.width, out.height);
  if (o.filtro !== 'original') autoNiveis(out, o.filtro === 'cinza');
  return { blob: await toBlob(out, 'image/jpeg', 0.8), w: out.width, h: out.height };
}

/** Fotografia do CV: recorte central quadrado (JPEG) e versão circular (PNG com transparência). */
export async function prepararFoto(src: Blob, size = 420): Promise<{ quadrada: Uint8Array; circulo: Uint8Array }> {
  const img = await carregarImagem(src); const { w, h } = dim(img);
  const s = Math.min(w, h); const sx = (w - s) / 2; const sy = Math.max(0, (h - s) / 2 - h * 0.04);
  const q = canvas(size, size); const qx = q.getContext('2d')!; qx.fillStyle = '#fff'; qx.fillRect(0, 0, size, size);
  qx.drawImage(img, sx, Math.min(sy, h - s), s, s, 0, 0, size, size);
  const c = canvas(size, size); const cx = c.getContext('2d')!;
  cx.beginPath(); cx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); cx.closePath(); cx.clip();
  cx.drawImage(q, 0, 0);
  const [qb, cb] = await Promise.all([toBlob(q, 'image/jpeg', 0.85), toBlob(c, 'image/png')]);
  return { quadrada: new Uint8Array(await qb.arrayBuffer()), circulo: new Uint8Array(await cb.arrayBuffer()) };
}

export async function bytes(b: Blob) { return new Uint8Array(await b.arrayBuffer()); }
export const urlDe = (b: Blob) => URL.createObjectURL(b);
