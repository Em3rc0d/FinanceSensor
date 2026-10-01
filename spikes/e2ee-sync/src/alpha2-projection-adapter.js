import { createHash } from 'node:crypto';
import { createEncryptedEnvelope, decryptEnvelope, stableJson } from './protocol.js';

export const ALPHA2_PUBLIC_PROJECTION_SCHEMA = 'ALPHA2_PUBLIC_DASHBOARD_V1';
export const ALPHA2_SYNC_ACTION = 'ALPHA2_PUBLIC_PROJECTION_UPDATED';

const FORBIDDEN_KEYS = new Set([
  'confidence',
  'matchScore',
  'evidencePercent',
  'evidencePercentage',
  'messageId',
  'attachmentId',
  'gmailMessageId',
  'rawGmailBody',
  'rawMime',
  'rawPdf',
  'pdfPassword',
  'externalReference',
  'accessToken',
  'refreshToken',
  'rawDek'
]);

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function assertPlainProjection(value, path = '$') {
  if (value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertPlainProjection(item, `${path}[${index}]`));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) throw new Error(`alpha2-projection-forbidden-key:${path}.${key}`);
    assertPlainProjection(child, `${path}.${key}`);
  }
}

export function validateAlpha2PublicProjection(projection) {
  if (!projection || typeof projection !== 'object' || Array.isArray(projection)) {
    throw new Error('alpha2-projection-object-required');
  }
  if (projection.schema !== ALPHA2_PUBLIC_PROJECTION_SCHEMA) {
    throw new Error('alpha2-projection-schema-mismatch');
  }
  if (!Array.isArray(projection.transactions) || !Array.isArray(projection.cashflow)) {
    throw new Error('alpha2-projection-core-arrays-required');
  }
  assertPlainProjection(projection);
  return true;
}

export function alpha2ProjectionRevision(projection) {
  validateAlpha2PublicProjection(projection);
  return `a2proj_${hash(stableJson(projection)).slice(0, 48)}`;
}

export function createAlpha2ProjectionEnvelope({
  tenantId,
  keyEpoch,
  tenantRootKey,
  originDevice,
  originDeviceSequence,
  projection,
  eventId,
  createdAt
}) {
  validateAlpha2PublicProjection(projection);
  const projectionRevision = alpha2ProjectionRevision(projection);
  return createEncryptedEnvelope({
    tenantId,
    keyEpoch,
    tenantRootKey,
    originDevice,
    originDeviceSequence,
    schemaVersion: 1,
    eventId,
    createdAt,
    action: {
      type: ALPHA2_SYNC_ACTION,
      projectionSchema: ALPHA2_PUBLIC_PROJECTION_SCHEMA,
      projectionRevision,
      projection
    }
  });
}

export function decryptAlpha2ProjectionEnvelope({
  envelope,
  tenantRootKey,
  authorizedDeviceRecords
}) {
  const decoded = decryptEnvelope({ envelope, tenantRootKey, authorizedDeviceRecords });
  if (decoded.action?.type !== ALPHA2_SYNC_ACTION) {
    throw new Error('alpha2-projection-action-mismatch');
  }
  if (decoded.action.projectionSchema !== ALPHA2_PUBLIC_PROJECTION_SCHEMA) {
    throw new Error('alpha2-projection-action-schema-mismatch');
  }
  validateAlpha2PublicProjection(decoded.action.projection);
  const expectedRevision = alpha2ProjectionRevision(decoded.action.projection);
  if (decoded.action.projectionRevision !== expectedRevision) {
    throw new Error('alpha2-projection-revision-mismatch');
  }
  return {
    header: decoded.header,
    projectionRevision: expectedRevision,
    projection: decoded.action.projection
  };
}

export const alpha2ProjectionForbiddenKeys = Object.freeze([...FORBIDDEN_KEYS].sort());
