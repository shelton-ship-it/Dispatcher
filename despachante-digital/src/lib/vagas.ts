import type { Vaga, DocReq } from './types';

// As vagas reais vêm da API (base de dados). Aqui ficam só os modelos para vagas criadas pelo utilizador
// e as vagas "locais" (guardadas neste telemóvel).
export const DOCS_CONCURSO: DocReq[] = [
  { id: 'requerimento', obrigatorio: true }, { id: 'honra', obrigatorio: true },
  { id: 'cv', obrigatorio: true, nota: 'Nos concursos o CV leva os dados da vaga a que concorres.' },
  { id: 'bi', obrigatorio: true, nota: 'Confirma no aviso se pedem fotocópia autenticada.' },
  { id: 'nuit', obrigatorio: false }, { id: 'certificado', obrigatorio: true },
];
export const DOCS_PRIVADA: DocReq[] = [
  { id: 'carta', obrigatorio: true }, { id: 'cv', obrigatorio: true },
  { id: 'bi', obrigatorio: false }, { id: 'nuit', obrigatorio: false }, { id: 'certificado', obrigatorio: false },
];
export const CAMPOS_CONCURSO = [
  { id: 'categoria', label: 'Categoria', placeholder: 'Conforme o Aviso de Abertura' },
  { id: 'area', label: 'Área', placeholder: 'Conforme o Aviso de Abertura' },
  { id: 'local', label: 'Local de afectação pretendido', placeholder: 'Ex.: Maputo' },
];

const CUSTOM_KEY = 'dd:vagas-custom:v1';
export function carregarVagasCustom(): Vaga[] { if (typeof window === 'undefined') return []; try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]'); } catch { return []; } }
export function guardarVagaCustom(v: Vaga) { const t = carregarVagasCustom().filter(x => x.id !== v.id); t.unshift(v); localStorage.setItem(CUSTOM_KEY, JSON.stringify(t.slice(0, 50))); }
export function apagarVagaCustom(id: string) { localStorage.setItem(CUSTOM_KEY, JSON.stringify(carregarVagasCustom().filter(x => x.id !== id))); }
export function siglaDe(nome: string) {
  const p = nome.replace(/\b(de|da|do|das|dos|e|em)\b/gi, '').split(/\s+/).filter(Boolean);
  return p.length === 1 ? p[0].slice(0, 8).toUpperCase() : p.map(x => x[0]).join('').slice(0, 6).toUpperCase();
}
export const prazoRestante = (iso?: string | null) => {
  if (!iso) return null; const d = Math.ceil((new Date(iso + 'T23:59:59').getTime() - Date.now()) / 86400000);
  return { dias: d, txt: d < 0 ? 'Encerrado' : d === 0 ? 'Termina hoje' : d === 1 ? 'Termina amanhã' : `Faltam ${d} dias`, urgente: d <= 5 };
};
export const dataPt = (iso: string) => iso.split('-').reverse().join('/');
