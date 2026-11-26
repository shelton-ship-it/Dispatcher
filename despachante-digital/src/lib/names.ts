import type { DocId, Pessoal, Vaga } from './types';

export function semAcentos(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
export function slug(s: string, max = 60) {
  return semAcentos(s).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, max);
}
export function titulo(s: string) {
  return s.toLowerCase().replace(/(^|\s)(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
}
// Nome do ficheiro: 01_Requerimento_Joao_Manuel_Silva_AT.pdf
export function nomeFicheiro(ordem: number, ficheiro: string, p: Pessoal, vaga: Vaga, extra = '') {
  const pessoa = slug(titulo(p.nome || 'Candidato'), 40);
  const parts = [String(ordem).padStart(2, '0'), ficheiro + extra, pessoa, slug(vaga.sigla || vaga.entidade, 14)].filter(Boolean);
  return parts.join('_') + '.pdf';
}
export function nomeZip(p: Pessoal, vaga: Vaga) {
  return `Candidatura_${slug(vaga.sigla || vaga.entidade, 14)}_${slug(titulo(p.nome || 'Candidato'), 40)}.zip`;
}
export const primeiroUltimo = (nome: string) => {
  const t = nome.trim().split(/\s+/).filter(Boolean);
  return t.length <= 1 ? t.join(' ') : `${t[0]} ${t[t.length - 1]}`;
};
