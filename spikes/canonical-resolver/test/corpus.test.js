import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { evidenceToCandidate, economicContribution } from '../src/resolver.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const cases = JSON.parse(fs.readFileSync(path.join(here, '..', 'fixtures', 'classification-cases.json'), 'utf8'));

assert.ok(cases.length >= 50, 'Q-001 corpus must contain at least 50 synthetic cases');

for (const fixture of cases) {
  test(`${fixture.id} resolves ${fixture.expectedType}`, () => {
    const candidate = evidenceToCandidate({
      tenantId: 'tenant-corpus',
      currency: 'PEN',
      accountId: 'account-corpus',
      instrumentId: 'instrument-corpus',
      occurredAt: '2026-09-01T08:00:00-05:00',
      sourceType: 'SYNTHETIC',
      sourceMessageId: fixture.id,
      ...fixture
    });

    assert.equal(candidate.semanticType, fixture.expectedType);
    assert.deepEqual(economicContribution(candidate), {
      income: fixture.expectedIncome,
      expense: fixture.expectedExpense
    });
  });
}
