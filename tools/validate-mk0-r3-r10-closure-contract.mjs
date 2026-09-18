import fs from 'node:fs';

const paths = {
  contract: 'graph/mk0-r3-r10-closure-contract.json',
  schema: 'graph/mk0-r3-r10-closure-receipt-schema.json',
  design: 'graph/prebuild-remainder-design.json',
  ledger: 'graph/closure-ledger.json',
  readiness: 'graph/build-readiness.json',
  r2: 'graph/alpha2-r2-owned-device-campaign.json',
  template: 'graph/CLOSURE-RECEIPT-TEMPLATE.md'
};

const failures = [];
const fail = message => failures.push(message);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
for (const path of Object.values(paths)) if (!fs.existsSync(path)) fail(`missing ${path}`);

if (!failures.length) {
  const contract = JSON.parse(fs.readFileSync(paths.contract, 'utf8'));
  const schema = JSON.parse(fs.readFileSync(paths.schema, 'utf8'));
  const design = JSON.parse(fs.readFileSync(paths.design, 'utf8'));
  const ledger = JSON.parse(fs.readFileSync(paths.ledger, 'utf8'));
  const readiness = JSON.parse(fs.readFileSync(paths.readiness, 'utf8'));
  const r2 = JSON.parse(fs.readFileSync(paths.r2, 'utf8'));
  const template = fs.readFileSync(paths.template, 'utf8');

  if (contract.schemaVersion !== 'MK0_R3_R10_CLOSURE_CONTRACT_V1') fail('closure contract schemaVersion mismatch');
  if (contract.project !== 'FinanceSensor' || contract.mk !== 'MK0') fail('closure contract identity mismatch');
  if (contract.status !== 'DESIGN_FROZEN_EXECUTION_OPEN') fail('closure contract must remain design-frozen/execution-open');
  if (contract.frozenFromRepoSha !== '3146b957cb316b9643862a37d4756ad7ae27c83c') fail('closure contract base SHA drifted');

  const expectedAuthority = {
    design: paths.design,
    closureLedger: paths.ledger,
    buildReadiness: paths.readiness,
    receiptTemplate: paths.template
  };
  for (const [key, value] of Object.entries(expectedAuthority)) {
    if (contract.authority?.[key] !== value) fail(`authority ${key} drifted`);
  }

  const laws = contract.globalLaws ?? {};
  for (const key of [
    'exactRepoShaRequired', 'parentReceiptsRequired', 'evidenceRequired',
    'residualRisksRequired', 'noneKnownRequiresRationale', 'reopenTriggersRequired',
    'contradictionAuditRequired', 'buildReadyRequiresGMk0Closed', 'upstreamContradictionReopensOwner'
  ]) if (laws[key] !== true) fail(`global law ${key} must be true`);
  for (const key of [
    'publicCiCanClaimPhysicalPass', 'publicCiCanPromoteBuildReady',
    'publicCiCanPromoteReleaseReady', 'releaseReadyImpliedByBuildReady'
  ]) if (laws[key] !== false) fail(`global law ${key} must be false`);
  if (laws.residualRisksMinItems !== 1) fail('residual risks must contain at least one explicit entry');
  if (laws.reopenTriggersMinItems !== 1) fail('reopen triggers must contain at least one explicit entry');

  if (contract.receiptContract?.schema !== paths.schema) fail('receipt schema path drifted');
  if (contract.receiptContract?.repoShaPattern !== '^[0-9a-f]{40}$') fail('exact repo SHA pattern drifted');
  if (contract.receiptContract?.statusForValidClosure !== 'CLOSED') fail('valid closure status must be CLOSED');
  if (contract.receiptContract?.physicalEvidenceInheritance !== 'EXPLICIT_IMMUTABLE_REFERENCE_ONLY') fail('physical evidence inheritance must be explicit');
  if (contract.receiptContract?.rawPrivateEvidenceAllowedInGitHub !== false) fail('raw private evidence must remain forbidden in GitHub');

  const requiredReceiptFields = new Set(schema.required ?? []);
  for (const field of [
    'schemaVersion', 'project', 'mk', 'nodeId', 'repoSha', 'status', 'parentReceipts',
    'evidence', 'nonClaims', 'contradictionAudit', 'residualRisks', 'reopenTriggers',
    'sanitizationPass', 'buildReady', 'releaseReady'
  ]) if (!requiredReceiptFields.has(field)) fail(`receipt schema must require ${field}`);
  if (schema.additionalProperties !== false) fail('receipt schema must reject unknown top-level fields');
  if (schema.properties?.repoSha?.pattern !== '^[0-9a-f]{40}$') fail('receipt repoSha must be exact 40-hex SHA');
  if (schema.properties?.status?.const !== 'CLOSED') fail('receipt status must be CLOSED');
  if (schema.properties?.residualRisks?.minItems !== 1) fail('receipt must contain explicit residual risk entry');
  if (schema.properties?.reopenTriggers?.minItems !== 1) fail('receipt must contain explicit reopen trigger');
  if (schema.properties?.parentReceipts?.minItems !== 1) fail('receipt must reference at least one parent receipt');
  if (schema.properties?.evidence?.minItems !== 1) fail('receipt must reference evidence');
  if (schema.properties?.sanitizationPass?.const !== true) fail('receipt sanitizationPass must be true');
  for (const forbidden of ['password', 'token', 'privateKey', 'keystore', 'rawGmailBody', 'rawMime', 'rawStatementPdf']) {
    if (Object.prototype.hasOwnProperty.call(schema.properties ?? {}, forbidden)) fail(`receipt schema exposes forbidden field ${forbidden}`);
  }

  const expectedIds = ['R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10'];
  const nodes = Array.isArray(contract.nodes) ? contract.nodes : [];
  const byId = new Map(nodes.map(node => [node.id, node]));
  if (byId.size !== nodes.length) fail('duplicate R3-R10 closure contract node id');
  if (!same(nodes.map(node => node.id), expectedIds)) fail('R3-R10 node order or membership drifted');

  const designById = new Map((design.nodes ?? []).map(node => [node.id, node]));
  const expectedDeps = new Map([
    ['R3', ['R2']], ['R4', ['R2']], ['R5', ['R2']],
    ['R6', ['R3', 'R4', 'R5']], ['R7', ['R6']], ['R8', ['R7']],
    ['R9', ['R8']], ['R10', ['R9']]
  ]);
  for (const id of expectedIds) {
    const node = byId.get(id);
    const designNode = designById.get(id);
    if (!designNode) {
      fail(`${id} missing from prebuild remainder design`);
      continue;
    }
    if (!same(node.dependsOn, expectedDeps.get(id))) fail(`${id} dependency contract drifted`);
    if (!same(node.dependsOn, designNode.dependsOn)) fail(`${id} dependencies disagree with prebuild design`);
    if (!same(node.closes ?? [], designNode.closes ?? [])) fail(`${id} closure targets disagree with prebuild design`);
    if (node.executionClass !== designNode.executionClass) fail(`${id} execution class disagrees with prebuild design`);
    if (!Array.isArray(node.requiredEvidenceClaims) || node.requiredEvidenceClaims.length === 0) fail(`${id} must define required evidence claims`);
    if (new Set(node.requiredEvidenceClaims ?? []).size !== (node.requiredEvidenceClaims ?? []).length) fail(`${id} has duplicate evidence claims`);
    for (const target of node.closes ?? []) {
      if (!ledger.nodes?.some(ledgerNode => ledgerNode.id === target)) fail(`${id} closes unknown ledger node ${target}`);
    }
  }

  const exactEvidence = new Map([
    ['R3', [
      'R2_SANITIZED_OWNED_ANDROID_RECEIPT', 'REFRESH_BEFORE_REVOKE_PASS',
      'REFRESHED_BEARER_ACCEPTED_BY_GMAIL', 'REQUEST_RESPONSE_BYTES_BY_ENDPOINT',
      'ENDPOINT_LATENCY_BY_ENDPOINT', 'MOBILE_CREDENTIAL_CUSTODY_INSPECTED',
      'PROVIDER_REVOKE_RESULT_RECORDED', 'GOOGLE_RESTRICTED_SCOPE_VERIFICATION_STATUS_RECORDED',
      'GOOGLE_SECURITY_ASSESSMENT_APPLICABILITY_RECORDED', 'CONSENT_DISCLOSURE_MATCHES_OBSERVED_DATA_PATH'
    ]],
    ['R4', [
      'R2_SANITIZED_OWNED_ANDROID_RECEIPT', 'NETWORK_STORAGE_CACHE_TEMP_INSPECTED',
      'ANDROID_CREDENTIAL_CUSTODY_INSPECTED', 'IOS_CREDENTIAL_CUSTODY_INSPECTED',
      'TELEMETRY_REDACTION_INSPECTED', 'CRASH_REPORT_REDACTION_INSPECTED',
      'CLOUD_DELETION_OBSERVED', 'WITNESS_DELETION_OBSERVED',
      'BACKUP_RETENTION_AT_OR_BELOW_35_DAYS', 'PRE_DELETE_BACKUP_CANNOT_RESURRECT_TENANT_AUTHORITY'
    ]],
    ['R5', [
      'ANDROID_WRAP_IOS_UNWRAP_PASS', 'IOS_WRAP_ANDROID_UNWRAP_PASS',
      'ANDROID_SIGN_IOS_VERIFY_PASS', 'IOS_SIGN_ANDROID_VERIFY_PASS',
      'NEGATIVE_CRYPTO_MATRIX_FAILS_CLOSED', 'THREE_WITNESSES_PRESENT',
      'TWO_OF_THREE_QUORUM_PASS', 'AT_LEAST_TWO_FAILURE_DOMAINS',
      'CRASH_RESTART_PASS', 'PARTITION_REJOIN_PASS', 'LONG_OFFLINE_REJOIN_PASS',
      'ALL_DEVICES_LOST_RECOVERY_PASS', 'TRK_ROTATION_PASS', 'RECOVERY_KEY_ROTATION_PASS',
      'NEW_RECOVERY_KIT_ISSUED', 'OLD_DEVICE_DENIED_FUTURE_EPOCH',
      'OLD_RECOVERY_KIT_DENIED_FUTURE_EPOCH'
    ]]
  ]);
  for (const [id, claims] of exactEvidence) {
    if (!same(byId.get(id)?.requiredEvidenceClaims, claims)) fail(`${id} physical/provider evidence matrix drifted`);
    if (!Array.isArray(byId.get(id)?.forbiddenShortcuts) || byId.get(id).forbiddenShortcuts.length < 3) fail(`${id} must retain explicit forbidden shortcuts`);
  }

  const expectedLedgerStates = new Map([
    ['Q-003', 'ACTIVE'], ['Q-004', 'ACTIVE'], ['Q-005', 'ACTIVE'],
    ['A-001', 'DRAFTED'], ['SEC-001', 'DRAFTED'], ['DM-001', 'DRAFTED'],
    ['WF-001', 'DRAFTED'], ['OPS-001', 'OPEN']
  ]);
  for (const [id, status] of expectedLedgerStates) {
    const node = ledger.nodes?.find(item => item.id === id);
    if (!node) fail(`closure ledger missing ${id}`);
    else if (node.status !== status) fail(`${id} must remain ${status}; got ${node.status}`);
  }

  const gmk0 = ledger.nodes?.find(item => item.id === 'G-MK0');
  if (!gmk0) fail('closure ledger missing G-MK0');
  else if (gmk0.status === 'CLOSED') fail('G-MK0 cannot be CLOSED while R3-R10 execution is open');
  if (ledger.buildReady !== false) fail('closure ledger buildReady must remain false');
  if (readiness.buildReady !== false) fail('build-readiness manifest must remain false');
  if (readiness.law !== 'BUILD_READY_TRUE_REQUIRES_G_MK0_CLOSED') fail('build-readiness law drifted');
  if (r2.laws?.r2DoesNotCloseQ003Q004Q005 !== true) fail('R2 must not close Q-003/Q-004/Q-005');
  if (r2.laws?.physicalPassCannotBeDerivedFromPublicCi !== true) fail('R2 physical pass must not derive from public CI');
  if (r2.laws?.buildReadyPromotionAllowed !== false) fail('R2 must not promote BUILD_READY');
  if (r2.laws?.releaseReadyPromotionAllowed !== false) fail('R2 must not promote RELEASE_READY');

  for (const marker of ['## Evidence', '## Contradiction audit', '## Residual risks', '## Revalidation triggers', 'Closed on ref/commit:']) {
    if (!template.includes(marker)) fail(`closure receipt template missing marker: ${marker}`);
  }

  const expectedState = {
    R3: 'PHYSICAL_OR_PROVIDER_OPEN', R4: 'PHYSICAL_OR_PROVIDER_OPEN', R5: 'PHYSICAL_OR_PROVIDER_OPEN',
    R6: 'BLOCKED_BY_PRIOR_NODE', R7: 'AUDIT_OPEN', R8: 'AUDIT_OPEN',
    R9: 'BLOCKED_BY_PRIOR_NODE', R10: 'BLOCKED_BY_PRIOR_NODE',
    q003: 'ACTIVE', q004: 'ACTIVE', q005: 'ACTIVE', gMk0: 'OPEN',
    buildReady: false, releaseReady: false
  };
  for (const [key, value] of Object.entries(expectedState)) {
    if (contract.currentState?.[key] !== value) fail(`currentState ${key} drifted; expected ${value}, got ${contract.currentState?.[key]}`);
  }
}

if (failures.length) {
  console.error('MK0_R3_R10_CLOSURE_CONTRACT=FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('MK0_R3_R10_CLOSURE_CONTRACT=PASS');
console.log('CLOSURE_NODES=8');
console.log('R3_Q003=PHYSICAL_OR_PROVIDER_OPEN');
console.log('R4_Q004=PHYSICAL_OR_PROVIDER_OPEN');
console.log('R5_Q005=CROSS_DEVICE_PHYSICAL_OPEN');
console.log('R6_QUARRY_CONSENSUS=BLOCKED');
console.log('R7_ARCH_SECURITY=AUDIT_OPEN');
console.log('R8_DM_WF_OPS=AUDIT_OPEN');
console.log('R9_G_MK0=BLOCKED');
console.log('R10_BUILD_READY=BLOCKED');
console.log('EXACT_REPO_SHA_REQUIRED=YES');
console.log('RESIDUAL_RISKS_REQUIRED=YES');
console.log('REOPEN_TRIGGERS_REQUIRED=YES');
console.log('PUBLIC_CI_PHYSICAL_PROMOTION=0');
console.log('PUBLIC_CI_BUILD_READY_PROMOTION=0');
console.log('PUBLIC_CI_RELEASE_PROMOTION=0');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
