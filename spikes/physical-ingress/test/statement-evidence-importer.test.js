import test from 'node:test';
import assert from 'node:assert/strict';
import { StatementEvidenceImporter } from '../src/statement-evidence-importer.js';

function memoryVault(initial) {
  let state = structuredClone(initial);
  return {
    read: () => structuredClone(state),
    write: value => { state = structuredClone(value); },
    snapshot: () => structuredClone(state)
  };
}

test('adding statement evidence preserves existing Gmail transfer semantic type', () => {
  const vault = memoryVault({
    evidence: [{
      tenantId: 'tenant-synthetic',
      sourceType: 'GMAIL',
      sourceMessageId: 'gmail-transfer-1',
      evidenceClass: 'BANK_NOTIFICATION',
      amount: 500,
      currency: 'PEN',
      direction: 'OUT',
      occurredAt: '2026-09-01T12:00:00Z',
      rawMerchant: null,
      semanticType: 'EXTERNAL_TRANSFER',
      confidence: 0.96,
      references: {}
    }]
  });
  const importer = new StatementEvidenceImporter({ vault, now: () => '2026-09-03T00:00:00Z' });
  importer.importEvidence({ evidence: [], sourceClass: 'DEBIT_STATEMENT_MANUAL_REQUEST' });
  assert.equal(vault.snapshot().canonical[0].semanticType, 'EXTERNAL_TRANSFER');
});

test('debit statement can add income when Gmail has no corresponding incoming notification', () => {
  const vault = memoryVault({ evidence: [] });
  const importer = new StatementEvidenceImporter({ vault, now: () => '2026-09-03T00:00:00Z' });
  const result = importer.importEvidence({
    sourceClass: 'DEBIT_STATEMENT_MANUAL_REQUEST',
    evidence: [{
      tenantId: 'tenant-synthetic',
      sourceType: 'BANK_STATEMENT',
      sourceArtifactId: 'statement-1:0',
      evidenceClass: 'BANK_STATEMENT',
      amount: 1250,
      currency: 'PEN',
      direction: 'IN',
      occurredAt: '2026-09-01T12:00:00Z',
      rawMerchant: 'Abono de prueba',
      semanticType: 'INCOME',
      confidence: 0.9,
      references: {}
    }]
  });
  assert.equal(result.addedEvidence, 1);
  assert.equal(result.statementCoverage.inflowEvidenceCreated, 1);
  assert.equal(vault.snapshot().canonical[0].semanticType, 'INCOME');
});

test('statement replay is idempotent by immutable source artifact', () => {
  const evidence = [{
    tenantId: 'tenant-synthetic',
    sourceType: 'BANK_STATEMENT',
    sourceArtifactId: 'statement-1:0',
    evidenceClass: 'BANK_STATEMENT',
    amount: 10,
    currency: 'PEN',
    direction: 'OUT',
    occurredAt: '2026-09-01T12:00:00Z',
    rawMerchant: 'Compra sintética',
    semanticType: 'EXPENSE',
    confidence: 0.9,
    references: {}
  }];
  const vault = memoryVault({ evidence: [] });
  const importer = new StatementEvidenceImporter({ vault });
  assert.equal(importer.importEvidence({ evidence, sourceClass: 'CREDIT_STATEMENT_AUTO' }).addedEvidence, 1);
  assert.equal(importer.importEvidence({ evidence, sourceClass: 'CREDIT_STATEMENT_AUTO' }).addedEvidence, 0);
  assert.equal(vault.snapshot().evidence.length, 1);
});

test('independent statement and Gmail evidence do not silently auto-merge without strong reference', () => {
  const vault = memoryVault({
    evidence: [{
      tenantId: 'tenant-synthetic',
      sourceType: 'GMAIL',
      sourceMessageId: 'gmail-purchase-1',
      evidenceClass: 'BANK_NOTIFICATION',
      amount: 25,
      currency: 'PEN',
      direction: 'OUT',
      occurredAt: '2026-09-01T12:00:00Z',
      rawMerchant: 'Comercio Sintetico',
      semanticType: 'EXPENSE',
      confidence: 0.96,
      references: {}
    }]
  });
  const importer = new StatementEvidenceImporter({ vault });
  const result = importer.importEvidence({
    sourceClass: 'CREDIT_STATEMENT_AUTO',
    evidence: [{
      tenantId: 'tenant-synthetic',
      sourceType: 'BANK_STATEMENT',
      sourceArtifactId: 'statement-purchase-1',
      evidenceClass: 'BANK_STATEMENT',
      amount: 25,
      currency: 'PEN',
      direction: 'OUT',
      occurredAt: '2026-09-01T12:05:00Z',
      rawMerchant: 'Comercio Sintetico',
      semanticType: 'EXPENSE',
      confidence: 0.9,
      references: {}
    }]
  });
  assert.equal(result.reviewCount, 1);
  assert.equal(vault.snapshot().canonical.length, 1);
});
