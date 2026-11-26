# Despachante API

Backend do Despachante Digital: **vagas dinâmicas**, **análise única do aviso**, **pagamentos M-Pesa/e-Mola/mKesh (Debito Pay) com Turso**, **WhatsApp (Evolution)**.
Estrutura igual à do teu `api-core` (Express, `node-functions/api/[[default]].js`, Turso por HTTP) — podes juntá-la ao api-core ou publicá-la como projecto separado.

## Correr localmente (sem Turso, com SQLite embutido do Node 22)
```bash
npm install
npm run keys > .env.local          # depois acrescenta as linhas de .env.example (TURSO_DATABASE_URL=file:./dev.db, PAYMENT_MODE=demo…)
npm run seed:at                    # carrega o concurso da AT pelo mesmo caminho do scraper
npm run dev                        # http://localhost:8788   ·   npm test
```
## Produção (EdgeOne Pages ou qualquer Node)
- Variáveis em `.env.example`. `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` reais, `PAYMENT_MODE=live`, `ALLOWED_ORIGINS` = domínio do frontend.
- **Webhook Debito Pay:** no painel (Settings → Webhooks) apontar para `https://<api>/api/webhooks/debitopay` e definir `DEBITOPAY_WEBHOOK_SECRET`. M-Pesa confirma logo na resposta; e-Mola confirma por webhook. O pagamento também é reconciliado por `check-status` (pelo `payment_id` guardado em `dd_pagamentos.provider_id`) (`GET /api/pay/status/:ref`), por isso funciona mesmo sem webhook.
- As tabelas (`dd_vagas`, `dd_pagamentos`, `dd_eventos`) criam-se sozinhas na primeira chamada.

## Endpoints
| | |
|---|---|
| `GET /api/vagas`, `GET /api/vagas/:id` | públicos, cacheáveis (CDN 5 min). Lista + preços reais |
| `POST /api/pay/charge` | inicia débito; o **servidor** calcula o valor |
| `GET /api/pay/status/:ref` | acompanha e **recupera** recibos (BD → Debito Pay) |
| `POST /api/webhooks/debitopay` | confirmação assíncrona (HMAC) |
| `POST /api/whatsapp/send` | 1 PDF por pedido, só com recibo que cubra o documento |
| `/api/admin/*` | ingestão/revisão (Bearer `ADMIN_TOKEN`) — ver `docs/SCRAPER_CONTRACT.md` |

## Segurança (o que fica só aqui)
Chave de assinatura dos recibos, `ADMIN_TOKEN`, chaves Debito Pay/Evolution, tabela de pagamentos (telefone guardado **mascarado**: `84•••••67`), limites de pedidos por IP.
O frontend só conhece a chave **pública** (verifica recibos sem pedidos ao servidor).
