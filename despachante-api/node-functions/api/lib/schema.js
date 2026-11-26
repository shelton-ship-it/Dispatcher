import { execute } from './turso.js';

let pronto = null;
/** Cria as tabelas na primeira chamada de cada instância (idempotente). */
export function garantirSchema() {
    if (!pronto) pronto = (async () => {
        const stmts = [
            `CREATE TABLE IF NOT EXISTS dd_vagas (
                id TEXT PRIMARY KEY, tipo TEXT NOT NULL, entidade TEXT NOT NULL, titulo TEXT NOT NULL,
                provincia TEXT, fonte_url TEXT, texto TEXT, texto_hash TEXT, analise_json TEXT, dossier_json TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'rascunho', prazo TEXT, confianca REAL DEFAULT 0, revisado INTEGER DEFAULT 0,
                criado_em TEXT DEFAULT CURRENT_TIMESTAMP, atualizado_em TEXT DEFAULT CURRENT_TIMESTAMP)`,
            `CREATE INDEX IF NOT EXISTS idx_dd_vagas_lista ON dd_vagas(status, tipo, prazo)`,
            `CREATE UNIQUE INDEX IF NOT EXISTS idx_dd_vagas_fonte ON dd_vagas(fonte_url) WHERE fonte_url IS NOT NULL`,
            `CREATE TABLE IF NOT EXISTS dd_pagamentos (
                reference TEXT PRIMARY KEY, vaga_code TEXT NOT NULL, scope TEXT NOT NULL, mask INTEGER NOT NULL, valor INTEGER NOT NULL,
                metodo TEXT, msisdn_mask TEXT, status TEXT NOT NULL DEFAULT 'pending', provider_id TEXT,
                criado_em TEXT DEFAULT CURRENT_TIMESTAMP, pago_em TEXT)`,
            `CREATE INDEX IF NOT EXISTS idx_dd_pag_recente ON dd_pagamentos(vaga_code, msisdn_mask, status)`,
            `CREATE TABLE IF NOT EXISTS dd_eventos (id TEXT PRIMARY KEY, criado_em TEXT DEFAULT CURRENT_TIMESTAMP)`,
        ];
        for (const s of stmts) await execute(s);
        // BDs criadas antes desta coluna: acrescenta provider_id. Falha = a coluna já existe.
        try { await execute(`ALTER TABLE dd_pagamentos ADD COLUMN provider_id TEXT`); } catch { /* já existe */ }
    })().catch(e => { pronto = null; throw e; });
    return pronto;
}
