import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EvidenceClass,
  classifyTransactionMetadata,
  extractAdaptedFinancialEvidence,
  evidenceAuthorityRank
} from '../src/transaction-evidence-adapters.js';

const msg = ({ from, subject, body, date = 'Thu, 03 Sep 2026 12:00:00 -0500' }) => ({
  id: 'synthetic-message-id',
  headers: { From: from, Subject: subject, Date: date },
  body
});

test('known-bank marketing is rejected even with money words', () => {
  const result = classifyTransactionMetadata({
    From: 'Banco Demo <news@email.bcp.com.pe>',
    Subject: 'Prestamo preaprobado: compra hoy y participa por S/ 10000'
  });
  assert.equal(result.candidate, false);
});

test('BCP-like card notification extracts authoritative purchase evidence', () => {
  const message = msg({
    from: 'Banco Demo <alerts@notificacionesbcp.com.pe>',
    subject: 'Realizaste un consumo con tu Tarjeta de Debito BCP - Servicio de Notificaciones BCP',
    body: 'Realizaste un consumo de S/ 42.35 con tu Tarjeta de Debito BCP en DEMO MARKET. Monto Total del consumo S/ 42.35. Numero de operacion: DEMO-1020'
  });
  const decision = classifyTransactionMetadata(message.headers);
  const evidence = extractAdaptedFinancialEvidence(message, decision);
  assert.equal(decision.adapterId, 'BCP_CARD_PURCHASE');
  assert.equal(evidence.evidenceClass, EvidenceClass.BANK_NOTIFICATION);
  assert.equal(evidence.amount, 42.35);
  assert.equal(evidence.currency, 'PEN');
  assert.equal(evidence.rawMerchant, 'DEMO MARKET');
  assert.equal(evidence.direction, 'OUT');
  assert.equal(evidence.semanticType, 'EXPENSE');
  assert.equal(evidence.references.providerTransactionId, 'DEMO-1020');
});

test('BCP-like own-account transfer is neutral transfer semantics', () => {
  const message = msg({
    from: 'Banco Demo <alerts@notificacionesbcp.com.pe>',
    subject: 'Constancia de Transferencia Entre mis Cuentas - Servicio de Notificaciones BCP',
    body: 'Monto transferido $ 25.00. Numero de operacion: OWN-1001'
  });
  const evidence = extractAdaptedFinancialEvidence(message);
  assert.equal(evidence.currency, 'USD');
  assert.equal(evidence.amount, 25);
  assert.equal(evidence.semanticType, 'INTERNAL_TRANSFER');
});

test('BCP-like card payment is CARD_PAYMENT not expense', () => {
  const message = msg({
    from: 'Banco Demo <alerts@notificacionesbcp.com.pe>',
    subject: 'Constancia de Pago de Tarjeta de Credito Propia - Servicio de Notificaciones BCP',
    body: 'Monto pagado S/ 315.44. Numero de operacion: CARD-2002'
  });
  const evidence = extractAdaptedFinancialEvidence(message);
  assert.equal(evidence.semanticType, 'CARD_PAYMENT');
  assert.equal(evidence.amount, 315.44);
});

test('BCP-like ATM withdrawal preserves movement kind instead of inventing expense truth', () => {
  const message = msg({
    from: 'Banco Demo <alerts@notificacionesbcp.com.pe>',
    subject: 'Realizaste un retiro en un cajero automatico BCP - Servicio de Notificaciones BCP',
    body: 'Total retirado S/ 80.00 Comision por retiro S/ 0.00'
  });
  const evidence = extractAdaptedFinancialEvidence(message);
  assert.equal(evidence.amount, 80);
  assert.equal(evidence.semanticType, 'UNKNOWN');
  assert.equal(evidence.references.movementKind, 'CASH_WITHDRAWAL');
});

test('Interbank-like card notification extracts merchant and amount', () => {
  const message = msg({
    from: 'Banco Demo <servicioalcliente@netinterbank.com.pe>',
    subject: 'Eduardo, realizaste un consumo con tu Tarjeta Interbank Visa Debito Clasica',
    body: 'Tarjeta: ****0000 Comercio: DEMO BOOKS Monto: S/. 19.90 Fecha: 03/09/2026 Hora: 10:30 AM'
  });
  const evidence = extractAdaptedFinancialEvidence(message);
  assert.equal(evidence.evidenceClass, EvidenceClass.BANK_NOTIFICATION);
  assert.equal(evidence.rawMerchant, 'DEMO BOOKS');
  assert.equal(evidence.amount, 19.9);
  assert.equal(evidence.semanticType, 'EXPENSE');
});

test('Interbank-like Plin is external transfer evidence, not automatically expense', () => {
  const message = msg({
    from: 'Banco Demo <servicioalcliente@netinterbank.com.pe>',
    subject: 'Constancia de Pago Plin',
    body: 'Codigo de operacion 55443322 Fecha y hora 03 Sep 2026 10:00 AM Monto S/ 27.50'
  });
  const evidence = extractAdaptedFinancialEvidence(message);
  assert.equal(evidence.evidenceClass, EvidenceClass.PAYMENT_NOTIFICATION);
  assert.equal(evidence.semanticType, 'EXTERNAL_TRANSFER');
  assert.equal(evidence.references.movementKind, 'P2P_PAYMENT');
});

test('known bank non-transaction account event is rejected', () => {
  const decision = classifyTransactionMetadata({
    From: 'Banco Demo <alerts@notificacionesbcp.com.pe>',
    Subject: 'Confirmacion de activacion de tu tarjeta de credito'
  });
  assert.equal(decision.candidate, false);
  assert.equal(decision.reason, 'KNOWN_BANK_NON_TRANSACTION');
});

test('security notification is not transaction evidence', () => {
  const decision = classifyTransactionMetadata({
    From: 'Payments <no-reply@example.test>',
    Subject: 'Alerta de seguridad: hubo un inicio de sesion desde un nuevo navegador'
  });
  assert.equal(decision.candidate, false);
});

test('generic merchant payment confirmation is lower-authority candidate', () => {
  const message = msg({
    from: 'Merchant <payments@merchant.example>',
    subject: 'Confirmacion de pago con tarjeta',
    body: 'Comercio: DEMO ACADEMY; Monto: S/ 55.00; Numero de operacion: MER-3003'
  });
  const decision = classifyTransactionMetadata(message.headers);
  const evidence = extractAdaptedFinancialEvidence(message, decision);
  assert.equal(decision.candidate, true);
  assert.equal(evidence.evidenceClass, EvidenceClass.MERCHANT_RECEIPT);
  assert.ok(evidenceAuthorityRank({ evidenceClass: EvidenceClass.BANK_NOTIFICATION }) > evidenceAuthorityRank(evidence));
});
