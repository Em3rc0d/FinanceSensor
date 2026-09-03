import fs from 'node:fs';

const ledgerPath = 'graph/closure-ledger.json';
const indexPath = 'graph/q003-evidence.json';
const quarryPath = 'mk0/02-quarries/Q-003-GMAIL-POLICY.md';
const campaignPath = 'graph/physical-closure-campaign.json';
const failures = [];

function fail(message) {
  failures.push(message);
}

function requireFile(path) {
  if (!fs.existsSync(path)) fail(`missing file: ${path}`);
}

for (const path of [ledgerPath, indexPath, quarryPath, campaignPath]) requireFile(path);

if (!failures.length) {
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const quarry = fs.readFileSync(quarryPath, 'utf8');
  const campaign = JSON.parse(fs.readFileSync(campaignPath, 'utf8'));
  const q003 = (ledger.nodes ?? []).find(node => node.id === 'Q-003');
  const p0 = (campaign.phases ?? []).find(phase => phase.id === 'P0');
  const p2 = (campaign.phases ?? []).find(phase => phase.id === 'P2');

  if (!q003) fail('closure ledger has no Q-003 node');
  if (index.nodeId !== 'Q-003') fail(`evidence index nodeId must be Q-003, got ${index.nodeId}`);
  if (index.nodeStateRequired !== 'ACTIVE') fail('Q-003 evidence index must require ACTIVE state');
  if (ledger.buildReady !== false) fail('Q-003 evidence boundary requires buildReady=false');
  if (q003?.status !== index.nodeStateRequired) fail(`Q-003 state mismatch: ledger=${q003?.status}, required=${index.nodeStateRequired}`);
  if (q003?.closureReceipt !== null) fail('Q-003 must not have a closure receipt while production/provider gates are open');
  if (p0?.status !== 'PASS') fail('Q-003 shared harness boundary requires campaign P0 PASS');
  if (p2?.status !== 'PHYSICAL_EVIDENCE_REQUIRED') fail('Q-003 must keep P2 open until iOS/cross-platform custody evidence closes');
  if (!(p2?.passedClaims ?? []).includes('ANDROID_PROTECTED_OAUTH_CUSTODY')) fail('Q-003 expected Android P2 custody physical PASS');
  if (!(p2?.passedClaims ?? []).includes('RESTORE_BEHAVIOR_DOCUMENTED')) fail('Q-003 expected restore behavior contract PASS');

  for (const entry of [...(index.artifacts ?? []), ...(index.evidence ?? [])]) {
    if (!entry?.path) {
      fail('Q-003 evidence entry without path');
      continue;
    }
    requireFile(entry.path);
  }

  for (const entry of index.evidence ?? []) {
    if (entry.closesQ003 !== false) fail(`${entry.path}: current evidence must not claim Q-003 closure`);
  }

  const requiredProofBoundary = {
    physicalHarnessIntegrity: 'PHYSICAL_P0_PASS_BOUND_RECEIPT',
    mobileCredentialCustodyAndroid: 'P2_PHYSICAL_PASS_BOUND_RECEIPT',
    mobileCredentialCustodyIos: 'P2_STATIC_READY_PHYSICAL_OPEN',
    levelCv7: 'PHYSICAL_PASS',
    levelCv8: 'HARNESS_READY_PHYSICAL_OPEN',
    productionVerification: 'OPEN',
    securityAssessmentProviderDetermination: 'OPEN'
  };
  for (const [key, expected] of Object.entries(requiredProofBoundary)) {
    if (index.proofBoundary?.[key] !== expected) {
      fail(`proofBoundary.${key} must be ${expected}`);
    }
  }

  for (const receipt of [
    'mk0/10-evidence/EV-PHYSICAL-CAMPAIGN-P0-HARNESS-SANITIZATION-2026-09-03.md',
    'mk0/10-evidence/EV-P2-ANDROID-CREDENTIAL-CUSTODY-PHYSICAL-2026-09-03.md'
  ]) {
    if (!(index.evidence ?? []).some(entry => entry.path === receipt)) fail(`Q-003 evidence index missing receipt ${receipt}`);
  }

  const requiredOpenPhysical = new Set([
    'SUCCESSFUL_PRE_REVOKE_REFRESH',
    'REFRESHED_BEARER_GMAIL_USE',
    'REQUEST_RESPONSE_BODY_BYTE_EVIDENCE',
    'PER_ENDPOINT_CLASS_LATENCY_EVIDENCE',
    'PRODUCTION_PLATFORM_PROTECTED_CREDENTIAL_HANDLING',
    'PRODUCTION_DISCONNECT_DELETION_EVIDENCE'
  ]);
  for (const gate of requiredOpenPhysical) {
    if (!(index.openPhysicalGates ?? []).includes(gate)) fail(`missing open physical gate: ${gate}`);
  }

  const requiredOpenProvider = new Set([
    'GOOGLE_RESTRICTED_SCOPE_VERIFICATION',
    'GOOGLE_SECURITY_ASSESSMENT_APPLICABILITY_DETERMINATION',
    'CASA_OR_APPROVED_ASSESSMENT_IF_REQUIRED'
  ]);
  for (const gate of requiredOpenProvider) {
    if (!(index.openProviderGates ?? []).includes(gate)) fail(`missing open provider gate: ${gate}`);
  }

  for (const promotion of [
    'P0_PASS=>Q003_CLOSED',
    'ANDROID_P2_CUSTODY_PASS=>P2_PASS',
    'IOS_STATIC_READY=>IOS_P2_PHYSICAL_PASS',
    'LEVEL_C_V7_PHYSICAL_PASS=>Q003_CLOSED',
    'LEVEL_C_V8_HARNESS_READY=>LEVEL_C_V8_PHYSICAL_PASS',
    'PACKAGE_DRAFTED=>GOOGLE_APPROVED',
    'OPAQUE_E2EE_RELAY=>SECURITY_ASSESSMENT_EXEMPT'
  ]) {
    if (!(index.forbiddenPromotions ?? []).includes(promotion)) fail(`missing forbidden promotion: ${promotion}`);
  }

  for (const phrase of [
    '**Status:** ACTIVE',
    '**Last policy review:** 2026-09-02',
    'LEVEL C v7 — FINANCESENSOR-OWNED DEV OAUTH IDENTITY  PHYSICAL PASS',
    'LEVEL C v8 — REFRESH + NETWORK EVIDENCE HARNESS      READY / NOT PHYSICALLY EXECUTED',
    'HARNESS_READY != PHYSICAL_PASS',
    'PACKAGE_DRAFTED != GOOGLE_APPROVED',
    'PROVIDER DETERMINATION > SELF-DECLARED EXEMPTION'
  ]) {
    if (!quarry.includes(phrase)) fail(`Q-003 quarry missing boundary phrase: ${phrase}`);
  }

  if (quarry.includes('GMAIL_FEASIBILITY                    CLOSED')) fail('Q-003 quarry falsely claims Gmail feasibility CLOSED');
  if (quarry.includes('LEVEL_C_v8                                 PHYSICAL PASS')) fail('Q-003 quarry falsely claims v8 physical PASS');
}

if (failures.length) {
  console.error('FINANCESENSOR_Q003_EVIDENCE_BOUNDARY=FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('FINANCESENSOR_Q003_EVIDENCE_BOUNDARY=PASS');
console.log('Q003_STATE=ACTIVE');
console.log('P0=PHYSICAL_PASS_BOUND_RECEIPT');
console.log('P2_ANDROID_CUSTODY=PHYSICAL_PASS_BOUND_RECEIPT');
console.log('P2_IOS_CUSTODY=STATIC_READY_PHYSICAL_OPEN');
console.log('LEVEL_C_V7=PHYSICAL_PASS');
console.log('LEVEL_C_V8=HARNESS_READY_PHYSICAL_OPEN');
console.log('PRODUCTION_VERIFICATION=OPEN');
console.log('SECURITY_ASSESSMENT_PROVIDER_DETERMINATION=OPEN');
console.log('BUILD_READY=false');
