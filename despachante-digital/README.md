# Despachante Digital

Ferramenta de produtividade para candidaturas em Moçambique (não é um portal de recrutamento):
o candidato escolhe a vaga, responde passo a passo e recebe os documentos em PDF já preenchidos.

## O que faz
- **Concursos públicos** e **vagas privadas** (+ "criar candidatura" para qualquer outra vaga).
- Documentos: Requerimento e Declaração sob compromisso de honra (formato dos formulários da AT), Carta de apresentação, CV (10 000 modelos), BI, NUIT, certificados, etc. digitalizados.
- Os **passos são gerados a partir dos documentos escolhidos**; só pede os dados necessários.
- Progresso guardado no browser (localStorage + IndexedDB): o utilizador retoma onde parou. **Sem login.**
- Digitalizar: câmara/galeria → recorte + filtro "documento" → PDF A4 (BI frente e verso na mesma página). OCR opcional (tesseract.js) para sugerir nº do BI/NUIT.
- Editar antes de exportar (texto da carta, do requerimento, da declaração; reordenar/recortar páginas; trocar modelo do CV).
- Exportar: ZIP único, PDF individual, imprimir tudo (PDF único), partilhar (WhatsApp/Gmail nativo) e envio por **Evolution API**.
- Nome dos ficheiros: `01_Requerimento_Nome_Apelido_AT.pdf` · ZIP: `Candidatura_AT_Nome_Apelido.zip`.
- Preços (em `src/lib/pricing.ts`): **65 MZN tudo** · **35 MZN por documento**. Pagamento **M-Pesa / e-Mola / mKesh** via Debito Pay.

## Arquitectura
**Frontend (este projecto)** — Next 14, tudo no telemóvel: PDFs (pdf-lib), ZIP (fflate), pré-visualização (pdf.js), OCR (tesseract.js).
Não guarda segredos nem tem rotas de servidor. Fala com a **API** (`../despachante-api`) só para: lista/detalhe de vagas, pagamento e WhatsApp.

**Vagas sem deploy:** vivem em Turso. O scraper (2.ª ronda) envia o texto do aviso → a API faz a **análise única** (que documentos, original ou
fotocópia autenticada, assinatura reconhecida, atestados, prazo, canal) → o site mostra a vaga com o dossier certo. O frontend guarda a lista em
cache local (10 min) e leva uma cópia offline da AT. Ver `despachante-api/docs/SCRAPER_CONTRACT.md`.

**Pagamento:** API + Turso + webhook da Debito Pay. O servidor calcula o valor e devolve um **recibo assinado (ECDSA)** que o telemóvel verifica sozinho
(chave pública). O código `DD-…` recupera a compra noutro aparelho.

## Pôr a funcionar
```bash
cp .env.example .env.local      # NEXT_PUBLIC_API_URL + NEXT_PUBLIC_TOKEN_PUBKEY (vem de `npm run keys` na API)
npm install && npm run dev
```

## Notas honestas
- A lista de documentos da AT é a **habitual** nos concursos; o texto de Requerimento e Declaração segue os PDFs que enviaste. Confirmar sempre no Aviso.
- O paywall dos downloads é verificado no cliente (recibo assinado) — adequado ao produto, mas contornável por quem saiba programar. O WhatsApp exige recibo válido no servidor.
- A análise por regras cobre os formatos habituais dos avisos moçambicanos; avisos fora do padrão ficam como **rascunho** para revisão (e a IA opcional ajuda).
- Não há correcção de perspectiva automática nos scans (recorte manual + auto-contraste). OCR precisa de internet na 1.ª vez.
- Next 14.2.35 (corrigido). Considera migrar para Next 15 quando quiseres.
