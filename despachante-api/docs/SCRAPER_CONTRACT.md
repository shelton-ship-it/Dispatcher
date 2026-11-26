# Contrato para o scraper (2.ª ronda)

O scraper só tem de **entregar o texto do aviso**. A API analisa-o **uma única vez** e guarda o *dossier*
(documentos exigidos e como devem ser). Não há deploy por vaga: as vagas vivem em Turso e o frontend lê-as por API.

## Fluxo
```
scraper ──POST /api/admin/vagas/bulk──▶ API ──▶ análise única (regras [+ IA]) ──▶ dossier em Turso
                                                     │ confiança ≥ 0.6 → "publicada"  (aparece no site)
                                                     └ confiança < 0.6 → "rascunho"   (revisão manual)
frontend ──GET /api/vagas (cache 5 min na CDN, 10 min no telemóvel)──▶ lista; GET /api/vagas/:id ──▶ dossier
```
- Reenviar o **mesmo texto** não reanalisa (comparação por hash) — o scraper pode correr todos os dias sem custo.
- Texto **alterado** → reanalisa (a menos que a vaga já tenha sido revista à mão, caso em que o dossier é preservado).
- Vagas com `prazoIso` ultrapassado deixam de aparecer na lista.

## Autenticação
`Authorization: Bearer $ADMIN_TOKEN` em todas as rotas `/api/admin/*`.

## Enviar vagas — `POST /api/admin/vagas/bulk` (até 50 por chamada)
```json
{ "items": [{
  "tipo": "concurso",                       // "concurso" | "privada"
  "entidade": "Tribunal Administrativo",    // obrigatório
  "titulo": "Concurso de ingresso — 5 vagas", // obrigatório (nome do concurso OU cargo)
  "fonte_url": "https://…",                 // recomendado: identifica a vaga (evita duplicados)
  "texto": "…texto integral do aviso…",     // O QUE É ANALISADO. Quanto mais completo, melhor.
  "provincia": "Maputo",                    // opcional
  "prazoIso": "2026-12-15",                 // opcional (se o scraper já o sabe; senão a análise tenta extrair)
  "email": "rh@empresa.co.mz",              // opcional
  "whatsapp": "841234567", "morada": "…",   // opcionais
  "destinatario": ["EXMO. SENHOR PRESIDENTE DO …"], // opcional (cabeçalho do requerimento)
  "saudacao": "Exmo. Senhor Presidente do …",       // opcional (carta)
  "categorias": [{ "id": "tt2", "nome": "Técnico Tributário de 2.ª Classe", "vagas": 350 }], // opcional
  "locais": ["Maputo", "Sofala"],           // opcional → vira lista de escolha no passo "Local de afectação"
  "publicar": true                          // opcional: forçar publicada (true) ou rascunho (false)
}]}
```
Resposta: `{ total, criadas, rascunhos, resultados:[{ id, status, confianca, reanalisado, avisos[], criada }] }`

## Rever / corrigir (humano)
- `GET  /api/admin/vagas?status=rascunho` — fila de revisão
- `GET  /api/admin/vagas/:id` — dossier + análise bruta
- `PATCH /api/admin/vagas/:id` `{ "status":"publicada", "dossier": { "docs":[…], "entrega":[…], … } }` — marca como revista
- `POST /api/admin/analisar` `{ "texto":"…", "tipo":"concurso" }` — pré-visualiza a análise sem gravar
- CLI: `npm run analisar -- aviso.txt` · `npm run seed:at`

## O que a análise extrai (dossier)
| Campo | Exemplo |
|---|---|
| `docs[]` | `{ id:"bi", obrigatorio:true, autenticado:true, como:"Tem de ser fotocópia AUTENTICADA…", fonte:"<excerto do aviso>" }` |
| flags | `autenticado` (fotocópia autenticada), `reconhecida` (assinatura reconhecida por notário), `confirmar` (aviso ambíguo), `sugerido` |
| `requerimento_assinado` | acrescentado automaticamente quando o requerimento exige assinatura reconhecida |
| `canal`, `contacto.email` | `email` / `presencial` / `portal` |
| `prazoIso` | de "até 15 de Dezembro" ou "30 dias a contar de 16 de Novembro" |
| `declaracoes[]` | cláusulas da declaração de honra (aposentado, expulso do Aparelho do Estado, requisitos legais) |
| `requisitos[]`, `etapas[]` | para mostrar ao candidato |
| `entrega[]` | checklist "Antes de entregar" (notário, autenticação, email, prazo) |
| `revisao` | `{ confianca, avisos[], origem:"regras"|"regras+ia" }` |

Documentos reconhecidos: requerimento, declaração de honra, CV, BI/identificação, NUIT, certificado de habilitações,
registo criminal, atestado médico/aptidão física, documento militar, carta de condução, carta de motivação.
Para acrescentar um tipo novo: `lib/catalog.js` (**só no fim** da lista — a posição é o bit nos recibos),
regra em `lib/analise.js`, e o documento em `src/lib/docs.ts` do frontend.

## IA opcional
Com `ANTHROPIC_API_KEY`, a IA complementa as regras (extrai categorias, locais, cláusulas). **Cada documento da IA tem de
trazer um excerto literal do aviso** — se o excerto não existir no texto, é descartado (sem alucinações). Sem chave, só regras.
