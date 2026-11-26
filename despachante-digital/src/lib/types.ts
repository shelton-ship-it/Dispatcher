export type DocId =
  | 'requerimento' | 'honra' | 'carta' | 'cv'
  | 'bi' | 'nuit' | 'certificado' | 'registo' | 'atestado' | 'carta_conducao' | 'outro' | 'militar' | 'requerimento_assinado';

export type Sexo = 'M' | 'F' | '';

export type Pessoal = {
  nome: string;
  sexo: Sexo;
  nascDia: string; nascMes: string; nascAno: string;
  nacionalidade: string;
  naturalidade: string;
  biNumero: string;
  biDia: string; biMes: string; biAno: string;
  biLocal: string;         // Arquivo de Identificação Civil de ...
  nuit: string;
  residencia: string;
  cidade: string;
  telefone: string;
  email: string;
  linkedin: string;
};

export type Edu = { id: string; curso: string; instituicao: string; inicio: string; fim: string; nota: string };
export type Exp = { id: string; cargo: string; empresa: string; inicio: string; fim: string; descricao: string };
export type Idioma = { nome: string; nivel: string };

export type CvData = {
  resumo: string;
  educacao: Edu[];
  experiencia: Exp[];
  competencias: string[];
  idiomas: Idioma[];
  fotoVer?: number;
};

export type CampoVaga = { id: string; label: string; placeholder?: string; opcoes?: string[] };

export type DocReq = {
  id: DocId; obrigatorio: boolean; nota?: string;
  como?: string;            // como este documento deve ser (resultado da análise do aviso)
  autenticado?: boolean;    // exige fotocópia autenticada
  reconhecida?: boolean;    // exige assinatura reconhecida por notário
  confirmar?: boolean;      // o aviso é ambíguo: confirmar
  sugerido?: boolean;       // não pedido no aviso, mas útil
  fonte?: string;           // excerto do aviso que originou esta exigência
};
export type Categoria = { id: string; nome: string; habilitacao?: string; vagas?: number | null };

export type Canal = 'email' | 'presencial' | 'whatsapp' | 'portal';

export type Vaga = {
  id: string;
  tipo: 'concurso' | 'privada';
  entidade: string;
  sigla: string;
  titulo: string;                 // nome do concurso ou do cargo
  nomeConcurso?: string;          // texto usado nos documentos (concursos)
  destinatario: string[];         // linhas (maiúsculas) do requerimento
  saudacao?: string;              // carta: "Exmo. Senhor Director de Recursos Humanos"
  campos: CampoVaga[];
  declaracoes: string[];          // cláusulas da declaração sob compromisso de honra
  docs: DocReq[];
  canal: Canal;
  contacto?: { email?: string; whatsapp?: string; morada?: string };
  prazo?: string;
  provincia?: string;
  notas?: string;
  fonte?: string;
  custom?: boolean;
  categorias?: Categoria[];
  prazoIso?: string | null;
  requisitos?: string[];
  etapas?: string[];
  entrega?: string[];       // checklist "antes de entregar", gerado na análise
  revisao?: { confianca: number; avisos: string[]; origem?: string };
};
export type VagaResumo = { id: string; tipo: 'concurso' | 'privada'; entidade: string; sigla: string; titulo: string; provincia?: string; prazoIso: string | null; nDocs: number; canal: Canal; categorias: string[]; custom?: boolean };

export type ScanOpts = { filtro: 'doc' | 'cinza' | 'original'; rot: 0 | 90 | 180 | 270; crop: { x: number; y: number; w: number; h: number } | null };
export type ScanPage = { id: string; rotulo: string; w: number; h: number; opts: ScanOpts };

export type Candidatura = {
  vagaId: string;
  docs: DocId[];
  campos: Record<string, string>;
  localAss: string;
  dataAss: { d: string; m: string; a: string };
  carta: { motivo: string; pontos: string[]; texto: string; editado: boolean };
  textos: Partial<Record<DocId, string>>;
  modelo: string;           // CV-0001 ...
  cvPaginas: 1 | 2;
  scanLayout: Partial<Record<DocId, 'pagina' | 'duas'>>;
  scans: Partial<Record<DocId, ScanPage[]>>;
  passo: number;
  criado: number;
  atualizado: number;
  recibo?: string;
};
