import assert from 'node:assert/strict';
import test from 'node:test';

import {
  generateDeviceIdentity,
  generateTenantRootKey,
  publicDeviceRecord
} from '../src/protocol.js';
import {
  alpha2ProjectionRevision,
  createAlpha2ProjectionEnvelope,
  decryptAlpha2ProjectionEnvelope,
  validateAlpha2PublicProjection
} from '../src/alpha2-projection-adapter.js';

const projection = Object.freeze({
  schema: 'ALPHA2_PUBLIC_DASHBOARD_V1',
  transactions: [
    {
      id: 'evt_demo',
      occurredAt: '2026-08-01T12:00:00.000Z',
      amount: 42.5,
      currency: 'PEN',
      semanticType: 'EXPENSE',
      truthState: 'OBSERVED',
      flowDirection: 'OUTFLOW',
      merchant: 'demo merchant',
      category: 'Compras'
    }
  ],
  cashflow: [
    {
      currency: 'PEN',
      income: 100,
      expense: 42.5,
      net: 57.5,
      truthState: 'PARTIAL'
    }
  ],
  recurringCandidates: [],
  knowledgeGaps: [],
  monthlyState: {
    status: 'RECONCILING',
    includedSources: 1,
    reconciledIncludedSources: 0,
    pendingStatements: 0,
    unresolvedItems: 1,
    blockingConflicts: 0,
    userExcludedSources: 0,
    notAvailableSources: 0
  }
});

test('Alpha.2 public projection round-trips through the existing E2EE envelope', () => {
  const tenantId = 'tenant-alpha2';
  const device = generateDeviceIdentity('android-alpha2');
  const record = publicDeviceRecord(device, { tenantId });
  const records = new Map([[device.deviceId, record]]);
  const tenantRootKey = generateTenantRootKey();

  const envelope = createAlpha2ProjectionEnvelope({
    tenantId,
    keyEpoch: 1,
    tenantRootKey,
    originDevice: device,
    originDeviceSequence: 1,
    projection,
    eventId: 'alpha2-projection-event-1',
    createdAt: '2026-09-07T02:00:00.000Z'
  });

  const wire = JSON.stringify(envelope);
  assert.equal(wire.includes('demo merchant'), false);
  assert.equal(wire.includes('42.5'), false);
  assert.equal(wire.includes('ALPHA2_PUBLIC_DASHBOARD_V1'), false);

  const decoded = decryptAlpha2ProjectionEnvelope({
    envelope,
    tenantRootKey,
    authorizedDeviceRecords: records
  });
  assert.deepEqual(decoded.projection, projection);
  assert.equal(decoded.projectionRevision, alpha2ProjectionRevision(projection));
});

test('forbidden raw/confidence fields fail closed before encryption', () => {
  assert.throws(
    () => validateAlpha2PublicProjection({
      ...projection,
      transactions: [{ ...projection.transactions[0], confidence: 0.96 }]
    }),
    /alpha2-projection-forbidden-key/
  );
  assert.throws(
    () => validateAlpha2PublicProjection({
      ...projection,
      rawPdf: 'never'
    }),
    /alpha2-projection-forbidden-key/
  );
});

test('projection revision is deterministic and order-sensitive only to semantics', () => {
  const first = alpha2ProjectionRevision(projection);
  const second = alpha2ProjectionRevision({
    cashflow: projection.cashflow,
    knowledgeGaps: projection.knowledgeGaps,
    monthlyState: projection.monthlyState,
    recurringCandidates: projection.recurringCandidates,
    schema: projection.schema,
    transactions: projection.transactions
  });
  assert.equal(first, second);
});
