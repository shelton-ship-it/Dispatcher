// Uso:  node scripts/analisar.mjs aviso.txt [concurso|privada]   → imprime o dossier SEM gravar
import fs from 'node:fs';
import { analisarAviso } from '../node-functions/api/lib/analise.js';
const [, , file, tipo = 'concurso'] = process.argv;
const texto = file ? fs.readFileSync(file, 'utf8') : fs.readFileSync(0, 'utf8');
console.log(JSON.stringify(await analisarAviso(texto, { tipo }), null, 2));
