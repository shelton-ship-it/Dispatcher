import test from 'node:test';
import assert from 'node:assert/strict';
import { analisarRegras, extrairPrazo, extrairEmail } from '../node-functions/api/lib/analise.js';

// Texto do aviso da AT (resumo publicado pela imprensa — fonte: mznews/empmoz, Nov/2026)
const AT = `As candidaturas devem ser submetidas exclusivamente por via electrónica através do endereço recrutamento@at.gov.mz, gerando um comprovativo automático de submissão. O prazo de apresentação decorre por 30 dias de calendário a contar a partir de 16 de novembro. Os concorrentes devem apresentar documentos como requerimento com assinatura reconhecida por notário, Curriculum Vitae, documento de identificação e certificado de habilitações autenticados, documento militar, atestado de aptidão física, NUIT e declaração de compromisso de honra de não se encontrar aposentado. O concurso é composto por etapas sucessivas de caráter eliminatório, nomeadamente a candidatura e selecção, prova de conhecimento, avaliação curricular, entrevista profissional, formação básica, técnica e paramilitar, e por fim a integração.`;

const TA = `O pedido de admissão ao concurso deve ser apresentado mediante requerimento, com assinatura reconhecida, dirigido a Sua Excelência a Presidente do Tribunal Administrativo, instruído com os seguintes documentos:
a) Certidão Narrativa Completa do Registo de Nascimento ou fotocópia autenticada do Bilhete de Identidade;
c) Declaração, sob compromisso de honra, de não ter sido expulso do Aparelho do Estado, com assinatura reconhecida;
d) Declaração do candidato, sob compromisso de honra, de que reúne os requisitos legais para o provimento da vaga;
e) Fotocópia autenticada do cartão de NUIT ou declaração comprovativa do Número Único de Identificação Tributária;
f) Atestado médico comprovativo de sanidade mental e capacidade física compatíveis com o exercício das funções;
O requerimento de candidatura e os respectivos documentos deverão ser entregues na Secretaria do Tribunal Administrativo, em envelope lacrado, de segunda a sexta-feira, das 7.30 às 15.00 horas.`;

const por = (a, id) => a.docs.find(d => d.id === id);

test('AT: documentos, flags e canal', () => {
    const a = analisarRegras(AT, { tipo: 'concurso', dataRef: new Date('2026-11-25') });
    for (const id of ['requerimento', 'requerimento_assinado', 'cv', 'bi', 'certificado', 'militar', 'atestado', 'nuit', 'honra']) assert.ok(por(a, id), `falta ${id}`);
    assert.equal(por(a, 'requerimento').reconhecida, true);
    assert.equal(por(a, 'bi').autenticado, true);
    assert.equal(por(a, 'certificado').autenticado, true);
    assert.equal(por(a, 'nuit').autenticado, false);
    assert.equal(por(a, 'atestado').autenticado, false);
    assert.equal(a.email, 'recrutamento@at.gov.mz');
    assert.equal(a.canal, 'email');
    assert.equal(a.prazoIso, '2026-12-15');
    assert.ok(a.declaracoes.some(d => /aposentad/.test(d)));
    assert.ok(a.etapas.length >= 4);
    assert.ok(a.confianca >= 0.8, `confiança ${a.confianca}`);
});

test('Tribunal Administrativo: lista alínea a alínea, entrega presencial', () => {
    const a = analisarRegras(TA, { tipo: 'concurso' });
    assert.equal(por(a, 'requerimento').reconhecida, true);
    assert.equal(por(a, 'bi').autenticado, true);
    assert.equal(por(a, 'nuit').autenticado, true);
    assert.equal(por(a, 'honra').reconhecida, true);
    assert.ok(por(a, 'atestado'));
    assert.equal(a.canal, 'presencial');
    assert.ok(a.declaracoes.some(d => /expuls/.test(d)) && a.declaracoes.some(d => /requisitos legais/.test(d)));
});

test('texto sem documentos → rever manualmente', () => {
    const a = analisarRegras('Procuramos um motorista. Contacte-nos.', { tipo: 'privada' });
    assert.ok(a.confianca <= 0.2);
    assert.ok(a.avisos.some(x => /rever/i.test(x)));
});

test('prazo: data limite explícita e duração', () => {
    assert.equal(extrairPrazo('Candidaturas até 20 de Dezembro de 2026.').iso, '2026-12-20');
    assert.equal(extrairPrazo('pelo prazo de 30 (trinta) dias, a contar de 1 de Julho de 2026').iso, '2026-07-30');
    assert.equal(extrairEmail('Enviar para info@x.co.mz ou rh@empresa.co.mz'), 'rh@empresa.co.mz');
});

import crypto from 'node:crypto';
import { verificarAssinaturaWebhook } from '../node-functions/api/lib/debitopay.js';
test('webhook Debito Pay: aceita HMAC válido (ambos formatos) e rejeita adulterado/expirado', () => {
    const body = '{"event":"payment.completed"}'; const secret = 's3'; const now = Date.now(); const t = Math.floor(now / 1000);
    const v1 = crypto.createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');
    assert.ok(verificarAssinaturaWebhook(body, `t=${t},v1=${v1}`, secret, { nowMs: now }));
    assert.ok(verificarAssinaturaWebhook(body, crypto.createHmac('sha256', secret).update(body).digest('hex'), secret));
    assert.ok(!verificarAssinaturaWebhook(body + ' ', `t=${t},v1=${v1}`, secret, { nowMs: now }));
    assert.ok(!verificarAssinaturaWebhook(body, `t=${t},v1=${v1}`, secret, { nowMs: now + 3600e3 }));
});

import { interpretarEstado as estadoDP, lerEvento, mensagemErro as erroDP, idDoPagamento } from '../node-functions/api/lib/debitopay.js';
test('Debito Pay: estados (process, check-status, erro) e leitura do webhook', () => {
    assert.equal(estadoDP({ success: true, payment_id: 'p1', status: 'success' }), 'paid');
    assert.equal(estadoDP({ success: true, status: 'pending', awaiting_confirmation: true }), 'pending');
    assert.equal(estadoDP({ success: true, payment: { id: 'p1', status: 'expired' } }), 'failed');
    assert.equal(estadoDP({ success: true, payment: { id: 'p1', status: 'success' } }), 'paid');
    assert.equal(estadoDP({ success: false, error: 'INVALID_API_KEY' }), 'failed');
    assert.match(erroDP({ success: false, error: 'Invalid amount' }), /mínimo/);
    assert.equal(idDoPagamento({ payment_id: 'p9', status: 'pending' }), 'p9');
    const ev = lerEvento({ event: 'payment.completed', data: { payment_id: 'p1', reference: 'EH1', amount: 150 } });
    assert.deepEqual([ev.evento, ev.id, ev.referencia], ['payment.completed', 'p1', null]);
});
