import type { DocId, Pessoal } from './types';

export type DocDef = {
  id: DocId;
  label: string;
  curto: string;
  tipo: 'gerado' | 'scan';
  ficheiro: string;                 // nome-base do ficheiro
  descricao: string;
  scan?: { faces?: string[]; multi?: boolean; dica: string; max: number; layoutPadrao: 'pagina' | 'duas' };
};

// Ordem de EXIBIÇÃO. O bit de cada documento no recibo vem de BIT_ORDER (igual ao da API) — só acrescentar no fim.
export const DOC_LIST: DocDef[] = [
  { id: 'requerimento', label: 'Requerimento', curto: 'Requerimento', tipo: 'gerado', ficheiro: 'Requerimento', descricao: 'Pedido de admissão dirigido à entidade, já preenchido.' },
  { id: 'requerimento_assinado', label: 'Requerimento assinado e reconhecido', curto: 'Req. assinado', tipo: 'scan', ficheiro: 'Requerimento_Assinado_Reconhecido', descricao: 'O requerimento impresso, assinado e com assinatura reconhecida no notário, digitalizado.',
    scan: { dica: 'Imprime o requerimento, assina, leva ao notário para reconhecer a assinatura e fotografa o resultado.', max: 2, layoutPadrao: 'pagina', multi: true } },
  { id: 'honra', label: 'Declaração sob compromisso de honra', curto: 'Comp. de honra', tipo: 'gerado', ficheiro: 'Declaracao_Compromisso_de_Honra', descricao: 'Declaração formal pronta a assinar.' },
  { id: 'carta', label: 'Carta de apresentação', curto: 'Carta', tipo: 'gerado', ficheiro: 'Carta_de_Apresentacao', descricao: 'Carta de motivação escrita para esta vaga.' },
  { id: 'cv', label: 'Currículo (CV)', curto: 'CV', tipo: 'gerado', ficheiro: 'Curriculo', descricao: 'Currículo com os dados da vaga, num modelo à tua escolha.' },
  { id: 'bi', label: 'Bilhete de Identidade', curto: 'BI', tipo: 'scan', ficheiro: 'BI', descricao: 'Fotografa o BI (frente e verso) e recebe um PDF limpo.',
    scan: { faces: ['Frente', 'Verso'], dica: 'Pousa o BI numa superfície plana, com boa luz e sem reflexos.', max: 2, layoutPadrao: 'duas' } },
  { id: 'nuit', label: 'NUIT', curto: 'NUIT', tipo: 'scan', ficheiro: 'NUIT', descricao: 'Imagem do cartão/documento do NUIT em PDF.',
    scan: { dica: 'Fotografa o cartão ou o documento onde aparece o número do NUIT.', max: 2, layoutPadrao: 'pagina', multi: true } },
  { id: 'certificado', label: 'Certificado de habilitações', curto: 'Certificado', tipo: 'scan', ficheiro: 'Certificado_de_Habilitacoes', descricao: 'Certificado ou diploma (uma ou mais páginas).',
    scan: { dica: 'Uma fotografia por página. Mantém o documento inteiro dentro do enquadramento.', max: 6, layoutPadrao: 'pagina', multi: true } },
  { id: 'registo', label: 'Registo criminal', curto: 'Reg. criminal', tipo: 'scan', ficheiro: 'Registo_Criminal', descricao: 'Certificado de registo criminal digitalizado.',
    scan: { dica: 'Uma fotografia por página.', max: 3, layoutPadrao: 'pagina', multi: true } },
  { id: 'atestado', label: 'Atestado médico / aptidão física', curto: 'Atestado', tipo: 'scan', ficheiro: 'Atestado_Medico', descricao: 'Atestado médico digitalizado.',
    scan: { dica: 'Uma fotografia por página.', max: 3, layoutPadrao: 'pagina', multi: true } },
  { id: 'carta_conducao', label: 'Carta de condução', curto: 'Carta cond.', tipo: 'scan', ficheiro: 'Carta_de_Conducao', descricao: 'Carta de condução (frente e verso).',
    scan: { faces: ['Frente', 'Verso'], dica: 'Fotografa as duas faces da carta.', max: 2, layoutPadrao: 'duas' } },
  { id: 'militar', label: 'Documento militar', curto: 'Militar', tipo: 'scan', ficheiro: 'Documento_Militar', descricao: 'Cartão, cédula ou comprovativo de dispensa do serviço militar.',
    scan: { dica: 'Fotografa o documento militar (todas as páginas que tenham dados).', max: 3, layoutPadrao: 'pagina', multi: true } },
  { id: 'outro', label: 'Outro documento', curto: 'Outro', tipo: 'scan', ficheiro: 'Documento', descricao: 'Qualquer outro documento pedido na vaga.',
    scan: { dica: 'Uma fotografia por página.', max: 8, layoutPadrao: 'pagina', multi: true } },
];

export const DOC_MAP: Record<DocId, DocDef> = Object.fromEntries(DOC_LIST.map(d => [d.id, d])) as Record<DocId, DocDef>;

export const BIT_ORDER: DocId[] = ['requerimento', 'honra', 'carta', 'cv', 'bi', 'nuit', 'certificado', 'registo', 'atestado', 'carta_conducao', 'outro', 'militar', 'requerimento_assinado'];
export function docBit(id: DocId) { return BIT_ORDER.indexOf(id); }
export function maskFromDocs(ids: DocId[]) { return ids.reduce((m, id) => m | (1 << docBit(id)), 0); }
export function docsFromMask(mask: number): DocId[] { return BIT_ORDER.filter((_, i) => mask & (1 << i)); }

// Que campos pessoais cada documento precisa (para só pedir o necessário)
export type CampoPessoal = keyof Pessoal;
const NEEDS: Record<string, CampoPessoal[]> = {
  requerimento: ['nome', 'sexo', 'nascDia', 'nascMes', 'nascAno', 'nacionalidade', 'biNumero', 'biDia', 'biMes', 'biAno', 'biLocal', 'residencia', 'telefone', 'cidade'],
  honra: ['nome', 'sexo', 'nacionalidade', 'biNumero', 'biDia', 'biMes', 'biAno', 'residencia', 'cidade'],
  carta: ['nome', 'sexo', 'residencia', 'telefone', 'email', 'cidade'],
  cv: ['nome', 'sexo', 'nascDia', 'nascMes', 'nascAno', 'nacionalidade', 'naturalidade', 'residencia', 'telefone', 'email', 'linkedin', 'cidade'],
};
export function camposPessoaisNecessarios(docs: DocId[]): Set<CampoPessoal> {
  const s = new Set<CampoPessoal>(['nome']);
  docs.forEach(d => (NEEDS[d] || []).forEach(c => s.add(c)));
  return s;
}
export const temGerados = (docs: DocId[]) => docs.some(d => DOC_MAP[d].tipo === 'gerado');
