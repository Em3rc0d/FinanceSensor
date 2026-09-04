import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyStatementDocument,
  classifyStatementPage,
  selectTransactionLedgerPages,
  StatementPageRole
} from '../src/statement-page-classifier.js';
import { StatementProviderProfile } from '../src/statement-source-adapters.js';

const BCP_SAVINGS = 'Estado de Cuenta de Ahorros Cuenta Digital BCP FECHA PROC. FECHA VALOR DESCRIPCION CARGOS / DEBE ABONOS / HABER';
const BCP_CARD_LEDGER = 'Estado de Cuenta Tarjeta VISA Fecha de proceso Fecha de consumo Descripción Tipo de Operación Soles Dólares 27Jul 26Jul COMERCIO DEMO CONSUMO 10.00';
const BCP_CARD_SUMMARY = 'Estado de Cuenta Tarjeta VISA Fecha de proceso Fecha de consumo Descripción Tipo de Operación Soles Dólares MONTO TOTAL FACTURADO ¿COMO ESTA COMPUESTA SU DEUDA?';
const BCP_CARD_EDU = 'Conoce el estado de cuenta de tu Tarjeta de Crédito (Montos referenciales)';
const RIPLEY_LEDGER = 'EECC Tarjeta de Crédito Ripley Tus movimientos del mes Fecha de operación Fecha de proceso Nº Ticket Descripción T/A Monto TEA / TNA 03/AGO/2026 03/AGO/2026 123456 COMERCIO DEMO T 10.00';
const RIPLEY_INFO = 'Partes claves de tu Estado de Cuenta Operaciones por canal';
const INTERBANK_LEDGER = 'ESTADO DE CUENTA CUENTA SIMPLE SOLES DETALLE DE MOVIMIENTOS Fecha Concepto Ingresos Gastos Saldo Contable';
const INTERBANK_INFO = 'Recuerda Realiza GRATIS tus consultas. En Interbank nos preocupamos por tu seguridad.';
const INTERBANK_EDU = 'Te ayudamos a conocer tu Estado de Cuenta: Este es el ciclo de consumo Este es tu saldo contable';

test('BCP savings continuation pages remain ledger pages', () => {
  assert.equal(classifyStatementPage({ text: BCP_SAVINGS, providerProfile: StatementProviderProfile.BCP_SAVINGS_REQUESTED }), StatementPageRole.TRANSACTION_LEDGER);
});

test('BCP credit separates transaction evidence from repeated-header debt summary and educational reference', () => {
  assert.equal(classifyStatementPage({ text: BCP_CARD_LEDGER, providerProfile: StatementProviderProfile.BCP_CREDIT }), StatementPageRole.TRANSACTION_LEDGER);
  assert.equal(classifyStatementPage({ text: BCP_CARD_SUMMARY, providerProfile: StatementProviderProfile.BCP_CREDIT }), StatementPageRole.SUMMARY);
  assert.equal(classifyStatementPage({ text: BCP_CARD_EDU, providerProfile: StatementProviderProfile.BCP_CREDIT }), StatementPageRole.EDUCATIONAL_REFERENCE);
});

test('Ripley separates transaction page from informational page', () => {
  assert.equal(classifyStatementPage({ text: RIPLEY_LEDGER, providerProfile: StatementProviderProfile.RIPLEY_CREDIT }), StatementPageRole.TRANSACTION_LEDGER);
  assert.equal(classifyStatementPage({ text: RIPLEY_INFO, providerProfile: StatementProviderProfile.RIPLEY_CREDIT }), StatementPageRole.INFORMATIONAL);
});

test('Interbank detects real ledger and rejects embedded educational sample page', () => {
  const result = classifyStatementDocument({ pages: [INTERBANK_LEDGER, INTERBANK_INFO, INTERBANK_EDU] });
  assert.equal(result.providerProfile, StatementProviderProfile.INTERBANK_SAVINGS_REQUESTED);
  assert.deepEqual(result.pageRoles.map(item => item.role), [
    StatementPageRole.TRANSACTION_LEDGER,
    StatementPageRole.INFORMATIONAL,
    StatementPageRole.EDUCATIONAL_REFERENCE
  ]);
});

test('only transaction-ledger pages are eligible for row parsing', () => {
  const selected = selectTransactionLedgerPages({
    pages: [BCP_CARD_LEDGER, BCP_CARD_SUMMARY, BCP_CARD_EDU],
    classification: { providerProfile: StatementProviderProfile.BCP_CREDIT }
  });
  assert.equal(selected.ledgers.length, 1);
  assert.equal(selected.ledgers[0].pageNumber, 1);
});
