// Copia o worker do pdf.js para /public (servido do próprio domínio, em cache para sempre)
import fs from 'node:fs';
import path from 'node:path';
const src = path.resolve('node_modules/pdfjs-dist/build/pdf.worker.min.js');
const dst = path.resolve('public/pdf.worker.min.js');
try { if (fs.existsSync(src)) { fs.copyFileSync(src, dst); console.log('pdf.worker.min.js copiado'); } }
catch (e) { console.warn('Não foi possível copiar o worker do pdf.js:', e.message); }
