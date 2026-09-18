import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyStatementMessage,
  selectStatementPdfAttachment,
  StatementSourceClass,
  StatementProviderProfile
} from '../src/statement-source-adapters.js';

const pdf = (filename, mimeType = 'application/pdf') => ({ filename, mimeType, attachmentId: 'synthetic' });

test('classifies BCP credit statement only with strict sender subject and expected attachment', () => {
  const message = {
    from: 'Estados de Cuenta <estadodecuenta@notificacionesbcp.com.pe>',
    subject: 'Estado de Cuenta de tu Tarjeta VISA',
    attachments: [pdf('EECC_VISA.PDF', 'application/octet-stream')]
  };
  const result = classifyStatementMessage(message);
  assert.equal(result.sourceClass, StatementSourceClass.CREDIT_STATEMENT_AUTO);
  assert.equal(result.providerProfile, StatementProviderProfile.BCP_CREDIT);
  assert.equal(result.canProvideInflows, false);
  assert.equal(selectStatementPdfAttachment(message).filename, 'EECC_VISA.PDF');
});

test('classifies Banco Ripley credit statement and rejects unrelated PDFs from same domain', () => {
  const statement = {
    from: 'Banco Ripley <BRSimple@bancoripley.com.pe>',
    subject: 'Estado de Cuenta Banco Ripley',
    attachments: [pdf('synthetic-statement.pdf')]
  };
  const insurance = {
    from: 'Banco Ripley <segurosripley@bancoripley.com.pe>',
    subject: 'Anulación Póliza',
    attachments: [pdf('carta.pdf')]
  };
  assert.equal(classifyStatementMessage(statement).providerProfile, StatementProviderProfile.RIPLEY_CREDIT);
  assert.equal(classifyStatementMessage(insurance).sourceClass, StatementSourceClass.NOT_STATEMENT);
});

test('classifies manually requested BCP savings statement as debit/savings lane', () => {
  const message = {
    from: 'BCP Notificaciones <notificaciones@notificacionesbcp.com.pe>',
    subject: 'Constancia de envío de Estado de Cuenta - Servicio de Notificaciones BCP',
    snippet: 'Solicitaste el Estado de Cuenta de tu Cuenta Ahorro Soles.',
    attachments: [pdf('EECC_SYNTHETIC.PDF')]
  };
  const result = classifyStatementMessage(message);
  assert.equal(result.sourceClass, StatementSourceClass.DEBIT_STATEMENT_MANUAL_REQUEST);
  assert.equal(result.providerProfile, StatementProviderProfile.BCP_SAVINGS_REQUESTED);
  assert.equal(result.canProvideInflows, true);
});

test('does not treat bank marketing or contracts as statements', () => {
  const cases = [
    {
      from: 'Banco <news@descubre.interbank.pe>',
      subject: 'Tu Cuenta Sueldo viene con regalo',
      attachments: []
    },
    {
      from: 'Banco <comunicaciones@productos.interbank.pe>',
      subject: 'Ya está lista tu Cuenta Simple',
      attachments: [pdf('ContratoDeposito.pdf')]
    },
    {
      from: 'BCP <notificaciones@notificacionesbcp.com.pe>',
      subject: 'Tu solicitud de Tarjeta de Crédito ha sido procesada',
      attachments: [pdf('Contrato.pdf')]
    }
  ];
  for (const value of cases) {
    assert.equal(classifyStatementMessage(value).sourceClass, StatementSourceClass.NOT_STATEMENT);
  }
});
