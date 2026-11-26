// Carrega o concurso de ingresso da AT (Nov/2026) pelo MESMO caminho que o scraper vai usar:
// texto do aviso → análise única → dossier gravado em Turso. Idempotente (só reanalisa se o texto mudar).
import { ingerir } from '../node-functions/api/lib/vagas-repo.js';

const texto = `AUTORIDADE TRIBUTÁRIA DE MOÇAMBIQUE — AVISO DE ABERTURA DE CONCURSO PÚBLICO DE INGRESSO.
Autorizado por despacho do presidente da instituição de 29 de Outubro de 2026, o concurso destina-se ao preenchimento de 650 vagas: 350 Técnicos Tributários de 2.ª Classe, que exigem a 12.ª classe ou equivalente, e 300 Auxiliares Tributários de 1.ª Classe (Guardas), com exigência da 10.ª classe ou equivalente e preferência para quem cumpriu o serviço militar.
As candidaturas devem ser submetidas exclusivamente por via electrónica através do endereço recrutamento@at.gov.mz, gerando um comprovativo automático de submissão. O prazo de apresentação decorre por 30 dias de calendário a contar a partir de 16 de Novembro.
Os concorrentes devem apresentar documentos como requerimento com assinatura reconhecida por notário, Curriculum Vitae, documento de identificação e certificado de habilitações autenticados, documento militar, atestado de aptidão física, NUIT e declaração de compromisso de honra de não se encontrar aposentado.
O concurso é composto por etapas sucessivas de caráter eliminatório, nomeadamente a candidatura e selecção, prova de conhecimento, avaliação curricular, entrevista profissional, formação básica, técnica e paramilitar, e por fim a integração.`;

const r = await ingerir({
    id: 'at-ingresso-2026', tipo: 'concurso', entidade: 'Autoridade Tributária de Moçambique', sigla: 'AT',
    titulo: 'Concurso Público de Ingresso na Autoridade Tributária de Moçambique',
    destinatario: ['EXMO. SENHOR PRESIDENTE DA AUTORIDADE', 'TRIBUTÁRIA DE MOÇAMBIQUE'],
    saudacao: 'Exmo. Senhor Presidente da Autoridade Tributária de Moçambique',
    provincia: 'Nacional', fonte_url: 'https://www.at.gov.mz/informacoes/concursos',
    categorias: [
        { id: 'tt2', nome: 'Técnico Tributário de 2.ª Classe', habilitacao: '12.ª classe ou equivalente', vagas: 350 },
        { id: 'at1', nome: 'Auxiliar Tributário de 1.ª Classe (Guarda)', habilitacao: '10.ª classe ou equivalente; preferência para quem cumpriu o serviço militar', vagas: 300 },
    ],
    locais: ['Cidade de Maputo', 'Maputo Província', 'Sofala', 'Manica', 'Cabo Delgado', 'Nampula', 'Niassa', 'Tete', 'Zambézia', 'Gaza', 'Inhambane', 'Serviços Centrais'],
    notas: 'Lista de documentos baseada na imprensa (Diário Económico, MZNews, Emprego Moz); o PDF do aviso deve ser conferido. Os modelos de Requerimento e Declaração seguem os formulários do concurso. Vagas por local: Maputo Província 90, Cidade de Maputo 82, Sofala/Manica/Cabo Delgado 60 cada.',
    texto, dataRef: '2026-11-25',
});
console.log(r);
