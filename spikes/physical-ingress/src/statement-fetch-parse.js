import { fetchGmailStatementAttachment } from './gmail-statement-attachment.js';
import {
  importStatementLayoutSession,
  statementSessionPublicSummary
} from './statement-import-session.js';
import { extractPasswordProtectedPdfLayout } from './pdfjs-statement-parser.js';
import { parseStatementProfileLayout } from './statement-profile-row-adapters.js';
import {
  StatementProviderProfile,
  StatementSourceClass
} from './statement-source-adapters.js';
import { StatementCandidateState } from './statement-discovery.js';

const MAX_ATTACHMENT_BYTES = 20_971_520;
const PDF_HEADER = Buffer.from('%PDF-', 'ascii');

const freezeBinding = binding => Object.freeze({
  ...binding,
  identityMarkers: Object.freeze([...(binding.identityMarkers ?? [])]),
  ledgerMarkers: Object.freeze([...(binding.ledgerMarkers ?? [])])
});

export const ALPHA2_B_PROFILE_BINDINGS_V1 = Object.freeze({
  'PE-BCP-SAVINGS-REQUESTED-DISCOVERY-V1': freezeBinding({
    discoveryProfileId: 'PE-BCP-SAVINGS-REQUESTED-DISCOVERY-V1',
    runtimeProfile: StatementProviderProfile.BCP_SAVINGS_REQUESTED,
    profileVersion: '1.0.0-static',
    institution: 'BCP',
    sourceClass: StatementSourceClass.DEBIT_STATEMENT_MANUAL_REQUEST,
    adapterLifecycle: 'STATIC_READY',
    parseEnabled: true,
    identityMarkers: ['Estado de Cuenta de Ahorros Cuenta Digital BCP'],
    ledgerMarkers: ['FECHA PROC.', 'FECHA VALOR', 'DESCRIPCION', 'CARGOS / DEBE', 'ABONOS / HABER']
  }),
  'PE-BCP-CREDIT-MONTHLY-DISCOVERY-V1': freezeBinding({
    discoveryProfileId: 'PE-BCP-CREDIT-MONTHLY-DISCOVERY-V1',
    runtimeProfile: StatementProviderProfile.BCP_CREDIT,
    profileVersion: '1.0.0-spec',
    institution: 'BCP',
    sourceClass: StatementSourceClass.CREDIT_STATEMENT_AUTO,
    adapterLifecycle: 'FORMAT_OBSERVED',
    parseEnabled: false
  }),
  'PE-RIPLEY-CREDIT-MONTHLY-DISCOVERY-V1': freezeBinding({
    discoveryProfileId: 'PE-RIPLEY-CREDIT-MONTHLY-DISCOVERY-V1',
    runtimeProfile: StatementProviderProfile.RIPLEY_CREDIT,
    profileVersion: '1.0.0-spec',
    institution: 'BANCO_RIPLEY',
    sourceClass: StatementSourceClass.CREDIT_STATEMENT_AUTO,
    adapterLifecycle: 'FORMAT_OBSERVED',
    parseEnabled: false
  })
});

export class Alpha2BError extends Error {
  constructor(code, { diagnosticCode = null } = {}) {
    super(code);
    this.name = 'Alpha2BError';
    this.code = code;
    if (diagnosticCode) this.diagnosticCode = diagnosticCode;
  }
}

const fail = (code, options) => { throw new Alpha2BError(code, options); };

const expectedSourceKey = candidate =>
  `STATEMENT_DISCOVERY_V1:${encodeURIComponent(String(candidate.messageId))}:${encodeURIComponent(String(candidate.attachmentId))}`;

function assertNotAborted(signal) {
  if (signal?.aborted) fail('ALPHA2_B_SESSION_ABORTED');
}

function normalizeText(value = '') {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function layoutPlainText(layout) {
  return (layout?.pages ?? [])
    .flatMap(page => (page?.items ?? []).map(item => String(item?.text ?? '')))
    .join(' ');
}

function resolveCandidateBinding(candidate) {
  if (!candidate || typeof candidate !== 'object') fail('ALPHA2_B_CANDIDATE_REQUIRED');
  if (candidate.decision !== StatementCandidateState.STRONG || candidate.downloadEligible !== true) {
    fail('ALPHA2_B_STRONG_GATE_REQUIRED');
  }
  if (!candidate.messageId || !candidate.attachmentId || !candidate.sourceKey || !candidate.profileId) {
    fail('ALPHA2_B_CANDIDATE_IDENTITY_REQUIRED');
  }
  if (candidate.sourceKey !== expectedSourceKey(candidate)) fail('ALPHA2_B_SOURCE_IDENTITY_MISMATCH');
  const reasons = new Set(candidate.reasonCodes ?? []);
  if (!reasons.has('PROFILE_MATCH_UNIQUE') || !reasons.has('DOWNLOAD_ELIGIBLE')) {
    fail('ALPHA2_B_DISCOVERY_RECEIPT_INVALID');
  }
  if (candidate.requiresLocalPassword !== true) fail('ALPHA2_B_PASSWORD_CONTRACT_INVALID');

  const binding = ALPHA2_B_PROFILE_BINDINGS_V1[candidate.profileId];
  if (!binding) fail('ALPHA2_B_PROFILE_UNKNOWN');
  if (!binding.parseEnabled) fail('ALPHA2_B_PROFILE_QUARANTINED');
  return binding;
}

function assertPdfBytes(bytes, maximumAttachmentBytes = MAX_ATTACHMENT_BYTES) {
  const maximum = Number(maximumAttachmentBytes);
  if (!Number.isInteger(maximum) || maximum <= 0 || maximum > MAX_ATTACHMENT_BYTES) {
    fail('ALPHA2_B_ATTACHMENT_LIMIT_INVALID');
  }
  if (!(Buffer.isBuffer(bytes) || bytes instanceof Uint8Array)) fail('ALPHA2_B_ATTACHMENT_BYTES_INVALID');
  if (bytes.byteLength === 0) fail('ALPHA2_B_ATTACHMENT_EMPTY');
  if (bytes.byteLength > maximum) fail('ALPHA2_B_ATTACHMENT_TOO_LARGE');
  if (bytes.byteLength < PDF_HEADER.length) fail('ALPHA2_B_PDF_SIGNATURE_INVALID');
  for (let index = 0; index < PDF_HEADER.length; index += 1) {
    if (bytes[index] !== PDF_HEADER[index]) fail('ALPHA2_B_PDF_SIGNATURE_INVALID');
  }
}

function assertLayoutIdentity(layout, binding) {
  if (!layout || !Array.isArray(layout.pages) || layout.pages.length === 0) {
    fail('ALPHA2_B_LAYOUT_EMPTY');
  }
  const text = normalizeText(layoutPlainText(layout));
  const hasIdentity = binding.identityMarkers.length > 0 &&
    binding.identityMarkers.some(marker => text.includes(normalizeText(marker)));
  const hasLedgerShape = binding.ledgerMarkers.length > 0 &&
    binding.ledgerMarkers.every(marker => text.includes(normalizeText(marker)));
  if (!hasIdentity || !hasLedgerShape) fail('ALPHA2_B_PROFILE_DRIFT_QUARANTINED');
}

function sanitizedFailure(error) {
  if (error instanceof Alpha2BError) return error;
  const code = String(error?.code ?? error?.message ?? '');
  if (code === 'PDF_PASSWORD_REJECTED') return new Alpha2BError('ALPHA2_B_PASSWORD_REJECTED');
  if (code === 'PDF_PARSE_FAILED') return new Alpha2BError('ALPHA2_B_PDF_PARSE_FAILED');
  if (String(error?.message ?? '') === 'STATEMENT_LAYOUT_REVIEW_REQUIRED' && /^STMT_[A-Z0-9_]+$/.test(code)) {
    return new Alpha2BError('ALPHA2_B_REVIEW_REQUIRED', { diagnosticCode: code });
  }
  if (code === 'STMT_NO_MOVEMENTS' || String(error?.message ?? '') === 'STATEMENT_LAYOUT_NO_MOVEMENTS') {
    return new Alpha2BError('ALPHA2_B_NO_MOVEMENTS');
  }
  return new Alpha2BError('ALPHA2_B_PARSE_FAILED');
}

export function planStatementUnlockGroups(candidates = []) {
  if (!Array.isArray(candidates)) fail('ALPHA2_B_CANDIDATE_GROUP_INVALID');
  const groups = new Map();
  for (const candidate of candidates) {
    let binding;
    try {
      binding = resolveCandidateBinding(candidate);
    } catch (error) {
      if (error instanceof Alpha2BError && ['ALPHA2_B_PROFILE_QUARANTINED', 'ALPHA2_B_PROFILE_UNKNOWN'].includes(error.code)) continue;
      throw error;
    }
    const key = `${binding.institution}:${binding.runtimeProfile}:${binding.profileVersion}`;
    const current = groups.get(key) ?? {
      groupId: key,
      institution: binding.institution,
      providerProfile: binding.runtimeProfile,
      profileVersion: binding.profileVersion,
      candidateCount: 0,
      requiresExplicitReuseConsent: true,
      crossInstitutionReuse: false,
      durablePasswordStorage: false
    };
    current.candidateCount += 1;
    groups.set(key, current);
  }
  return Object.freeze([...groups.values()].map(group => Object.freeze({ ...group })));
}

export async function fetchAndParseStrongStatement({
  provider,
  candidate,
  password,
  tenantId,
  accountId = null,
  signal = null,
  maximumAttachmentBytes = MAX_ATTACHMENT_BYTES,
  runtime = {}
} = {}) {
  const binding = resolveCandidateBinding(candidate);
  if (!provider || typeof provider._request !== 'function') fail('ALPHA2_B_GMAIL_PROVIDER_REQUIRED');
  if (typeof password !== 'string' || password.length === 0) fail('ALPHA2_B_PASSWORD_REQUIRED');
  if (!tenantId) fail('ALPHA2_B_TENANT_REQUIRED');

  const extractLayout = runtime.extractLayout ?? extractPasswordProtectedPdfLayout;
  const parseLayout = runtime.parseLayout ?? parseStatementProfileLayout;
  if (typeof extractLayout !== 'function' || typeof parseLayout !== 'function') fail('ALPHA2_B_RUNTIME_INVALID');

  let attachmentBytes = null;
  try {
    assertNotAborted(signal);
    attachmentBytes = await fetchGmailStatementAttachment({
      provider,
      messageId: candidate.messageId,
      attachmentId: candidate.attachmentId
    });
    assertNotAborted(signal);
    assertPdfBytes(attachmentBytes, maximumAttachmentBytes);

    const classification = Object.freeze({
      sourceClass: binding.sourceClass,
      providerProfile: binding.runtimeProfile
    });

    const result = await importStatementLayoutSession({
      encryptedPdfBytes: attachmentBytes,
      password,
      sourceMessageId: candidate.messageId,
      attachmentIdentity: candidate.attachmentId,
      statementClassification: classification,
      decryptAndExtractLayout: async options => {
        assertNotAborted(signal);
        const layout = await extractLayout({ ...options, pdfjs: runtime.pdfjs ?? null });
        assertNotAborted(signal);
        assertLayoutIdentity(layout, binding);
        return layout;
      },
      parseStatementLayout: async ({ pages }) => {
        assertNotAborted(signal);
        return parseLayout({
          providerProfile: binding.runtimeProfile,
          pages,
          tenantId,
          accountId
        });
      }
    });

    assertNotAborted(signal);
    return Object.freeze({
      evidence: Object.freeze([...result.evidence]),
      summary: Object.freeze({
        ...statementSessionPublicSummary({
          classification,
          evidence: result.evidence,
          pageCount: result.pageCount
        }),
        profileVersion: binding.profileVersion,
        adapterLifecycle: binding.adapterLifecycle,
        sourceIdentityPersisted: false,
        physicalProfilePassClaimed: false
      })
    });
  } catch (error) {
    throw sanitizedFailure(error);
  } finally {
    if (Buffer.isBuffer(attachmentBytes) || attachmentBytes instanceof Uint8Array) {
      try { attachmentBytes.fill(0); } catch {}
    }
    attachmentBytes = null;
  }
}

export async function fetchAndParseStrongStatementGroup({
  provider,
  candidates,
  password,
  tenantId,
  accountId = null,
  explicitReuseConsent = false,
  signal = null,
  maximumAttachmentBytes = MAX_ATTACHMENT_BYTES,
  runtime = {}
} = {}) {
  if (!Array.isArray(candidates) || candidates.length === 0) fail('ALPHA2_B_CANDIDATE_GROUP_EMPTY');
  const bindings = candidates.map(resolveCandidateBinding);
  const scopeKeys = new Set(bindings.map(binding => `${binding.institution}:${binding.runtimeProfile}:${binding.profileVersion}`));
  if (scopeKeys.size !== 1) fail('ALPHA2_B_CROSS_SCOPE_PASSWORD_REUSE_FORBIDDEN');
  if (candidates.length > 1 && explicitReuseConsent !== true) fail('ALPHA2_B_PASSWORD_REUSE_CONSENT_REQUIRED');
  if (typeof password !== 'string' || password.length === 0) fail('ALPHA2_B_PASSWORD_REQUIRED');

  const results = [];
  for (const candidate of candidates) {
    assertNotAborted(signal);
    results.push(await fetchAndParseStrongStatement({
      provider,
      candidate,
      password,
      tenantId,
      accountId,
      signal,
      maximumAttachmentBytes,
      runtime
    }));
  }

  return Object.freeze({
    parsedCount: results.length,
    evidenceCount: results.reduce((sum, item) => sum + item.evidence.length, 0),
    results: Object.freeze(results),
    passwordPersisted: false,
    passwordReuseWasExplicit: candidates.length <= 1 ? false : true,
    crossInstitutionReuse: false
  });
}
