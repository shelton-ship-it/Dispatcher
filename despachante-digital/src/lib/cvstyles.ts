export type Density = "Compacto" | "Equilibrado" | "Espaçoso";
export type AtsCompatibility = "Alta" | "Média" | "Baixa";
export type PageRecommendation = "1 página" | "1–2 páginas" | "2 páginas" | "Académico longo";
export type Composition = "single" | "sidebar-left" | "sidebar-right" | "split" | "editorial" | "modular" | "timeline" | "framed" | "offset" | "rail";
export type SectionKey = "profile" | "experience" | "education" | "skills" | "projects" | "languages" | "contact";

export type StyleRecipe = {
  archetype: string;
  composition: Composition;
  headerTreatment: string;
  experienceTreatment: string;
  skillsTreatment: string;
  photoTreatment: string;
  sectionOrder: SectionKey[];
  sideContent: SectionKey[];
  ornament: "rule" | "dot" | "block" | "frame" | "axis" | "grid" | "corner" | "none";
  structuralVariant?: number;
  typographyVariant?: number;
};

export type Palette = {
  label: string;
  ink: string;
  paper: string;
  accent: string;
  muted: string;
  rule: string;
};

export type CvStyle = {
  id: string;
  index: number;
  name: string;
  family: string;
  visualDirection: string;
  layout: string;
  grid: string;
  typography: string;
  colorSystem: string;
  density: Density;
  audience: string;
  ats: AtsCompatibility;
  pageRecommendation: PageRecommendation;
  palette: Palette;
  fingerprint: string;
  recipe: StyleRecipe;
};

const palettes: Palette[] = [
  { label: "Grafite", ink: "#202326", paper: "#ffffff", accent: "#202326", muted: "#6f7377", rule: "#d9dcde" },
  { label: "Azul-marinho", ink: "#0f2138", paper: "#fbfcff", accent: "#1e5185", muted: "#64748b", rule: "#cbd8e7" },
  { label: "Verde profundo", ink: "#16362c", paper: "#fcfffb", accent: "#2f7359", muted: "#6c8277", rule: "#d5e1da" },
  { label: "Bordô", ink: "#34191e", paper: "#fffafb", accent: "#7b3342", muted: "#886c70", rule: "#ead9dc" },
  { label: "Terracota", ink: "#43251a", paper: "#fffdf9", accent: "#bd5c3c", muted: "#8e756b", rule: "#eadbd2" },
  { label: "Violeta", ink: "#2a203b", paper: "#fcfbff", accent: "#6e52a5", muted: "#786f8b", rule: "#dfd9eb" },
  { label: "Petróleo", ink: "#11353a", paper: "#f9fdfd", accent: "#18717c", muted: "#658288", rule: "#cde0e1" },
  { label: "Areia", ink: "#3b3125", paper: "#fffdf8", accent: "#927041", muted: "#827565", rule: "#e6dece" },
  { label: "Rubi", ink: "#381719", paper: "#fffafb", accent: "#ad3340", muted: "#916b6f", rule: "#efd8db" },
  { label: "Azul-cobalto", ink: "#13264a", paper: "#fbfcff", accent: "#315ec6", muted: "#6f7ea0", rule: "#d5dcf2" },
  { label: "Oliva", ink: "#303626", paper: "#fdfdf9", accent: "#717e42", muted: "#7e846b", rule: "#dde0d0" },
  { label: "Preto e branco", ink: "#121212", paper: "#ffffff", accent: "#121212", muted: "#686868", rule: "#d8d8d8" },
  { label: "Ameixa", ink: "#341d32", paper: "#fffaff", accent: "#88487f", muted: "#8e748a", rule: "#ead9e7" },
  { label: "Ardósia", ink: "#27313a", paper: "#fbfcfd", accent: "#526f86", muted: "#75818c", rule: "#d9e0e5" },
  { label: "Laranja queimado", ink: "#432517", paper: "#fffaf6", accent: "#c76631", muted: "#947363", rule: "#efdbcf" },
  { label: "Rosa antigo", ink: "#42262e", paper: "#fffafb", accent: "#a95770", muted: "#92717a", rule: "#ead7dd" },
  { label: "Ciano técnico", ink: "#12343f", paper: "#f9feff", accent: "#19869d", muted: "#66818a", rule: "#cce5ea" },
  { label: "Índigo", ink: "#1f2447", paper: "#fbfbff", accent: "#5052aa", muted: "#777a98", rule: "#dcdded" },
  { label: "Cacau", ink: "#382a23", paper: "#fefcfb", accent: "#855d49", muted: "#826d61", rule: "#e6ddd7" },
  { label: "Cinza frio", ink: "#242a30", paper: "#fcfcfd", accent: "#5b6875", muted: "#77808a", rule: "#dde1e5" },
];

const directions = [
  ["Corporate", "Executivos e consultoria"], ["Executive", "Liderança sénior"], ["Minimal", "Profissionais generalistas"],
  ["Editorial", "Comunicação e cultura"], ["Swiss", "Design e produto"], ["Scandinavian", "Tecnologia e produto"],
  ["Luxury", "Hospitalidade premium"], ["Tech", "Tecnologia"], ["Developer", "Engenharia de software"],
  ["Engineering", "Engenharia e indústria"], ["Academic", "Docência e investigação"], ["Research", "Ciência e I&D"],
  ["Creative", "Indústrias criativas"], ["Portfolio", "Design e direção de arte"], ["Magazine", "Media e escrita"],
  ["Geometric", "Produto digital"], ["Futuristic", "Inovação e dados"], ["Classic", "Jurídico e administração"],
  ["Government", "Setor público"], ["Finance", "Finanças e banca"], ["Medical", "Saúde"], ["Architecture", "Arquitetura"],
  ["Industrial", "Operações"], ["Heritage", "Instituições e património"], ["Contemporary", "Startups"],
] as const;

const typographySystems = [
  "Neo-grotesk + serif editorial", "Humanist sans", "Serif contemporânea + sans", "Grotesk compacta", "Sans geométrica",
  "Serif clássica", "Sans + monoespaçada", "Serif de investigação", "Neo-grotesk internacional", "Sans editorial",
] as const;

const gridSystems = [
  "12 colunas assimétricas", "8 colunas editoriais", "6 colunas modulares", "4 colunas estruturadas", "Grelha de base",
  "Grelha dividida", "Grelha aninhada", "Grelha de deslocamento", "Grelha em banda", "Grelha assimétrica livre",
] as const;

const recipes: StyleRecipe[] = [
  { archetype: "axis", composition: "sidebar-left", headerTreatment: "nome vertical", experienceTreatment: "linha de tempo", skillsTreatment: "matriz", photoTreatment: "círculo técnico", sectionOrder: ["profile", "experience", "education", "projects"], sideContent: ["contact", "skills", "languages"], ornament: "axis", structuralVariant: 0, typographyVariant: 0 },
  { archetype: "folio", composition: "editorial", headerTreatment: "masthead tipográfico", experienceTreatment: "blocos de resultados", skillsTreatment: "tipografia", photoTreatment: "sem fotografia", sectionOrder: ["profile", "experience", "projects", "education", "skills"], sideContent: ["contact", "languages"], ornament: "rule" },
  { archetype: "ledger", composition: "split", headerTreatment: "faixa superior", experienceTreatment: "tabela suave", skillsTreatment: "categorias", photoTreatment: "retrato quadrado", sectionOrder: ["experience", "education", "projects"], sideContent: ["profile", "contact", "skills", "languages"], ornament: "block" },
  { archetype: "arc", composition: "single", headerTreatment: "nome centrado", experienceTreatment: "marcos horizontais", skillsTreatment: "chips", photoTreatment: "medalhão", sectionOrder: ["profile", "experience", "skills", "education", "projects", "languages"], sideContent: ["contact"], ornament: "dot" },
  { archetype: "monument", composition: "framed", headerTreatment: "monograma e nome", experienceTreatment: "narrativa cronológica", skillsTreatment: "níveis textuais", photoTreatment: "moldura alta", sectionOrder: ["profile", "experience", "education", "skills", "projects"], sideContent: ["contact", "languages"], ornament: "frame" },
  { archetype: "signal", composition: "sidebar-right", headerTreatment: "nome alinhado à esquerda", experienceTreatment: "cartões compactos", skillsTreatment: "badges", photoTreatment: "sem fotografia", sectionOrder: ["profile", "experience", "projects", "education"], sideContent: ["contact", "skills", "languages"], ornament: "corner" },
  { archetype: "quadrant", composition: "modular", headerTreatment: "bloco de nome", experienceTreatment: "módulos", skillsTreatment: "grupos", photoTreatment: "retrato em grelha", sectionOrder: ["profile", "skills", "experience", "projects", "education"], sideContent: ["contact", "languages"], ornament: "grid" },
  { archetype: "ribbon", composition: "rail", headerTreatment: "faixa lateral", experienceTreatment: "linha vertical", skillsTreatment: "indicadores", photoTreatment: "sem fotografia", sectionOrder: ["experience", "projects", "education", "skills"], sideContent: ["profile", "contact", "languages"], ornament: "axis" },
  { archetype: "atlas", composition: "offset", headerTreatment: "nome em escala", experienceTreatment: "empresa em destaque", skillsTreatment: "lista editorial", photoTreatment: "retrato offset", sectionOrder: ["experience", "profile", "education", "projects", "skills"], sideContent: ["contact", "languages"], ornament: "block" },
  { archetype: "columnist", composition: "single", headerTreatment: "cabeçalho compacto", experienceTreatment: "colunas de datas", skillsTreatment: "separadores", photoTreatment: "sem fotografia", sectionOrder: ["experience", "profile", "education", "skills", "projects", "languages"], sideContent: ["contact"], ornament: "rule" },
  { archetype: "aperture", composition: "sidebar-left", headerTreatment: "nome dentro de bloco", experienceTreatment: "cartões em pilha", skillsTreatment: "círculos discretos", photoTreatment: "retrato recortado", sectionOrder: ["experience", "projects", "education"], sideContent: ["profile", "contact", "skills", "languages"], ornament: "corner" },
  { archetype: "thesis", composition: "editorial", headerTreatment: "cabeçalho académico", experienceTreatment: "referências cronológicas", skillsTreatment: "classificação", photoTreatment: "sem fotografia", sectionOrder: ["profile", "education", "experience", "projects", "skills", "languages"], sideContent: ["contact"], ornament: "rule" },
  { archetype: "delta", composition: "split", headerTreatment: "nome alinhado à direita", experienceTreatment: "faixa de impacto", skillsTreatment: "tagline", photoTreatment: "retrato em arco", sectionOrder: ["experience", "projects", "education"], sideContent: ["profile", "contact", "skills", "languages"], ornament: "block" },
  { archetype: "lucid", composition: "single", headerTreatment: "nome minimalista", experienceTreatment: "linhas discretas", skillsTreatment: "lista simples", photoTreatment: "sem fotografia", sectionOrder: ["profile", "experience", "education", "projects", "skills", "languages"], sideContent: ["contact"], ornament: "none" },
  { archetype: "parallax", composition: "offset", headerTreatment: "nome integrado à forma", experienceTreatment: "datas sobre eixo", skillsTreatment: "matriz de competências", photoTreatment: "retrato vertical", sectionOrder: ["profile", "experience", "skills", "projects", "education"], sideContent: ["contact", "languages"], ornament: "axis" },
  { archetype: "foundry", composition: "timeline", headerTreatment: "cabeçalho industrial", experienceTreatment: "milestones", skillsTreatment: "sistema técnico", photoTreatment: "sem fotografia", sectionOrder: ["experience", "projects", "skills", "education"], sideContent: ["profile", "contact", "languages"], ornament: "grid" },
  { archetype: "chamber", composition: "framed", headerTreatment: "nome editorial", experienceTreatment: "narrativa expandida", skillsTreatment: "categorias serenas", photoTreatment: "medalhão lateral", sectionOrder: ["profile", "experience", "education", "projects", "skills"], sideContent: ["contact", "languages"], ornament: "frame" },
  { archetype: "kernel", composition: "modular", headerTreatment: "nome em bloco modular", experienceTreatment: "cards por empresa", skillsTreatment: "chips técnicos", photoTreatment: "sem fotografia", sectionOrder: ["skills", "experience", "projects", "education"], sideContent: ["profile", "contact", "languages"], ornament: "grid" },
  { archetype: "marrow", composition: "sidebar-right", headerTreatment: "nome dentro de faixa", experienceTreatment: "cronologia limpa", skillsTreatment: "pontos de proficiência", photoTreatment: "retrato contido", sectionOrder: ["profile", "experience", "education", "projects"], sideContent: ["contact", "skills", "languages"], ornament: "rule" },
  { archetype: "spectrum", composition: "rail", headerTreatment: "nome vertical compacto", experienceTreatment: "blocos escalonados", skillsTreatment: "famílias de prática", photoTreatment: "sem fotografia", sectionOrder: ["experience", "skills", "projects", "education"], sideContent: ["profile", "contact", "languages"], ornament: "axis" },
];

const densityOrder: Density[] = ["Compacto", "Equilibrado", "Espaçoso"];
const pageOptions: PageRecommendation[] = ["1 página", "1–2 páginas", "2 páginas", "Académico longo"];
const headerTreatments = ["nome vertical", "masthead tipográfico", "faixa superior", "nome centrado", "monograma e nome", "nome dentro de bloco", "cabeçalho académico", "nome em escala", "cabeçalho compacto", "nome editorial"];
const experienceTreatments = ["linha de tempo", "blocos de resultados", "tabela suave", "marcos horizontais", "narrativa cronológica", "cartões compactos", "módulos", "linha vertical", "empresa em destaque", "cronologia limpa"];
const sectionPatterns: SectionKey[][] = [
  ["profile", "experience", "education", "projects", "skills", "languages"],
  ["experience", "profile", "projects", "education", "skills", "languages"],
  ["skills", "profile", "experience", "education", "projects", "languages"],
  ["profile", "skills", "experience", "projects", "education", "languages"],
  ["education", "experience", "profile", "projects", "skills", "languages"],
  ["experience", "projects", "skills", "profile", "education", "languages"],
  ["projects", "profile", "experience", "skills", "education", "languages"],
  ["profile", "education", "experience", "skills", "projects", "languages"],
];

function pad(value: number) {
  return String(value).padStart(4, "0");
}

function reorderSections(baseOrder: SectionKey[], structuralVariant: number) {
  const preferred = sectionPatterns[structuralVariant % sectionPatterns.length];
  const ordered = preferred.filter(section => baseOrder.includes(section));
  return [...ordered, ...baseOrder.filter(section => !ordered.includes(section))];
}

export function createCvStyle(index: number): CvStyle {
  const zero = index - 1;
  const orbit = Math.floor(zero / recipes.length);
  const baseRecipe = recipes[zero % recipes.length];
  const recipe: StyleRecipe = {
    ...baseRecipe,
    structuralVariant: orbit % 50,
    typographyVariant: (orbit * 3 + zero) % 10,
    sectionOrder: reorderSections(baseRecipe.sectionOrder, orbit),
    sideContent: [...baseRecipe.sideContent].sort((left, right) => (left.length * (orbit + 3)) % 11 - (right.length * (orbit + 3)) % 11),
    headerTreatment: headerTreatments[(zero + orbit) % headerTreatments.length],
    experienceTreatment: experienceTreatments[(zero * 3 + orbit) % experienceTreatments.length],
  };
  const direction = directions[(zero * 7 + orbit) % directions.length];
  const palette = palettes[(zero * 11 + orbit * 3) % palettes.length];
  const typography = typographySystems[(zero * 3 + orbit) % typographySystems.length];
  const grid = gridSystems[(zero * 7 + orbit * 2) % gridSystems.length];
  const density = densityOrder[(zero + orbit) % densityOrder.length];
  const ats: AtsCompatibility = ["lucid", "columnist", "thesis", "ledger", "axis"].includes(recipe.archetype)
    ? (orbit % 4 === 0 ? "Média" : "Alta")
    : (orbit % 5 === 0 ? "Baixa" : "Média");
  const pageRecommendation = pageOptions[(zero + recipe.sectionOrder.length + orbit) % pageOptions.length];
  const name = `${recipe.archetype[0].toUpperCase()}${recipe.archetype.slice(1)} ${["Axis", "Edition", "Form", "Cadence", "Field", "Matter", "Studio", "System", "Index", "Frame"][orbit % 10]} ${pad(index)}`;
  const fingerprint = [recipe.archetype, recipe.composition, grid, recipe.headerTreatment, recipe.experienceTreatment, recipe.skillsTreatment, palette.label, density, orbit].join(" · ");

  return {
    id: `CV-${pad(index)}`,
    index,
    name,
    family: recipe.archetype[0].toUpperCase() + recipe.archetype.slice(1),
    visualDirection: direction[0],
    layout: recipe.composition.replace("-", " "),
    grid,
    typography,
    colorSystem: palette.label,
    density,
    audience: direction[1],
    ats,
    pageRecommendation,
    palette,
    fingerprint,
    recipe,
  };
}

export const TOTAL_ESTILOS = 10_000;
let _all: CvStyle[] | null = null;
/** Os 10 000 modelos são gerados à primeira utilização (poucos ms) e ficam em memória. */
export function todosEstilos(): CvStyle[] {
  if (!_all) _all = Array.from({ length: TOTAL_ESTILOS }, (_, i) => createCvStyle(i + 1));
  return _all;
}
export function estiloPorId(id: string): CvStyle {
  const n = Number(String(id).replace(/\D/g, '')) || 1;
  return createCvStyle(Math.min(TOTAL_ESTILOS, Math.max(1, n)));
}

let _opts: ReturnType<typeof buildOptions> | null = null;
function buildOptions() {
  const styles = todosEstilos();
  return {
    directions: Array.from(new Set(styles.map(s => s.visualDirection))),
    layouts: Array.from(new Set(styles.map(s => s.layout))),
    densities: densityOrder,
    colors: palettes.map(p => p.label),
    pages: pageOptions,
    ats: ["Alta", "Média", "Baixa"] as AtsCompatibility[],
  };
}
export function filterOptions() { return (_opts ??= buildOptions()); }

export function filterCvStyles(styles: CvStyle[], filters: { query?: string; direction?: string; layout?: string; density?: string; color?: string; ats?: string }) {
  const query = filters.query?.trim().toLocaleLowerCase("pt-PT") ?? "";
  return styles.filter(style => {
    const searchable = [style.id, style.name, style.family, style.visualDirection, style.audience].join(" ").toLocaleLowerCase("pt-PT");
    return (!query || searchable.includes(query))
      && (!filters.direction || style.visualDirection === filters.direction)
      && (!filters.layout || style.layout === filters.layout)
      && (!filters.density || style.density === filters.density)
      && (!filters.color || style.colorSystem === filters.color)
      && (!filters.ats || style.ats === filters.ats);
  });
}
