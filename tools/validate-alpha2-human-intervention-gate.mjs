import fs from 'node:fs';

const gatePath = 'graph/alpha2-human-intervention-gate.json';
const policyPath = 'mk0/11-decisions/POLICY-ALPHA2-HUMAN-INTERVENTION-CERTIFICATION-ONLY.md';
const gate = JSON.parse(fs.readFileSync(gatePath, 'utf8'));
const policy = fs.readFileSync(policyPath, 'utf8');
const fail = message => { throw new Error(`ALPHA2_HUMAN_INTERVENTION_GATE_FAILED:${message}`); };
const assert = (condition, message) => { if (!condition) fail(message); };

assert(gate.schemaVersion === 'A2_HUMAN_INTERVENTION_GATE_V1', 'SCHEMA_MISMATCH');
assert(gate.policyId === 'POLICY-ALPHA2-HUMAN-INTERVENTION-CERTIFICATION-ONLY', 'POLICY_ID_REQUIRED');
assert(gate.mode === 'EXCEPTION_ONLY_CERTIFICATION', 'MODE_MUST_BE_EXCEPTION_ONLY_CERTIFICATION');
assert(gate.currentCandidate === '0.2.0-alpha.2+2009', 'CURRENT_CANDIDATE_MUST_BE_2009');
assert(gate.candidateSourceCommit === '9391f8cfbafcf89d5e3fbd7c0bfc995247df9c6f', 'CURRENT_SOURCE_COMMIT_MISMATCH');
assert(gate.humanDiscoveryTestingForbidden === true, 'HUMAN_DISCOVERY_TESTING_MUST_BE_FORBIDDEN');
assert(gate.candidateGenerationNoiseEscalatesToHuman === false, 'CANDIDATE_NOISE_MUST_NOT_ESCALATE');
assert(gate.candidateMutationResetsEligibility === true, 'MUTATION_RESET_LAW_REQUIRED');
assert(gate.priorCandidatePhysicalEvidenceInheritable === false, 'PRIOR_PHYSICAL_EVIDENCE_INHERITANCE_FORBIDDEN');
assert(gate.sameCandidateRerunPolicy === 'AMBIGUOUS_OR_ENVIRONMENTAL_ONLY', 'SAME_CANDIDATE_RERUN_POLICY_MISMATCH');

for (const marker of [
  'human intervention is exception-only and certification-only',
  'The owner MUST NOT be asked to install or test each candidate merely because an APK exists.',
  'TRUSTED_EDGE_SIGNING',
  'CONSOLIDATED_OWNED_DEVICE_UAT',
  'SIGNING_REQUEST_ALLOWED=NO',
  'OWNED_DEVICE_UAT_REQUEST_ALLOWED=NO',
  'HUMAN_UAT_ELIGIBLE=NO',
  'ambiguous or failed for a demonstrably environmental reason'
]) assert(policy.includes(marker), `POLICY_MARKER_MISSING:${marker}`);

const pre = gate.preSigning ?? {};
const uat = gate.ownedDeviceUat ?? {};
const claims = gate.claims ?? {};

const preSigningRequirements = [
  'canonicalSourceIdentityFrozen',
  'canonicalApkIdentityFrozen',
  'requiredCiConsensusComplete',
  'requiredCiConsensusGreen',
  'staticAnalysisPass',
  'unitIntegrationPass',
  'exactPhysicalFailureRegressionPass',
  'syntheticEndToEndDashboardProjectionPass',
  'statementFailureIsolationPass',
  'encryptedPersistenceAutomatedContractPass',
  'replayIdempotencyAutomatedContractPass',
  'noNewerProductSourceMutation'
];

if (pre.requestAllowed === true || claims.signingRequestAllowed === true) {
  for (const key of preSigningRequirements) assert(pre[key] === true, `SIGNING_ALLOWED_WITHOUT_${key.toUpperCase()}`);
  assert(pre.knownCandidateBlockingDefects === 0, 'SIGNING_ALLOWED_WITH_KNOWN_BLOCKING_DEFECTS');
  assert(pre.requestAllowed === true && claims.signingRequestAllowed === true, 'SIGNING_ALLOW_CLAIM_DRIFT');
}

assert(uat.packageFrozen === 'com.financesensor.lab.gmailconnection.r2', 'PACKAGE_DRIFT');
assert(uat.exactOauthScopeFrozen === 'gmail.readonly', 'OAUTH_SCOPE_DRIFT');
assert(uat.consolidatedCampaignPreferred === true, 'CONSOLIDATED_UAT_REQUIRED');
assert(uat.purposeWhenEligible === 'CERTIFICATION_ONLY', 'UAT_PURPOSE_MUST_BE_CERTIFICATION_ONLY');

if (uat.requestAllowed === true || uat.humanUatEligible === true || claims.ownedDeviceUatRequestAllowed === true || claims.humanUatEligible === true) {
  assert(pre.requestAllowed === true && claims.signingRequestAllowed === true, 'UAT_REQUIRES_PRE_SIGNING_ELIGIBILITY');
  assert(uat.trustedEdgeSigningPass === true, 'UAT_REQUIRES_TRUSTED_EDGE_SIGNING_PASS');
  assert(uat.stableSignedArtifactIdentityFrozen === true, 'UAT_REQUIRES_FROZEN_SIGNED_ARTIFACT');
  assert(uat.finiteCampaignContractFrozen === true, 'UAT_REQUIRES_FINITE_CAMPAIGN_CONTRACT');
  assert(uat.requestAllowed === true, 'UAT_REQUEST_ALLOWED_CLAIM_DRIFT');
  assert(uat.humanUatEligible === true, 'HUMAN_UAT_ELIGIBLE_CLAIM_DRIFT');
  assert(claims.ownedDeviceUatRequestAllowed === true, 'OWNED_DEVICE_UAT_CLAIM_DRIFT');
  assert(claims.humanUatEligible === true, 'HUMAN_UAT_CLAIM_DRIFT');
}

if (uat.sameCandidateRepeatRequested === true) {
  assert(uat.requestAllowed === true, 'REPEAT_UAT_REQUIRES_ELIGIBLE_CANDIDATE');
  assert(gate.sameCandidateRerunReason === 'AMBIGUOUS_EVIDENCE' || gate.sameCandidateRerunReason === 'ENVIRONMENTAL_FAILURE', 'REPEAT_UAT_REASON_FORBIDDEN');
}

assert(claims.physicalAlpha2Pass === false, 'PHYSICAL_ALPHA2_PASS_PREMATURE');
assert(claims.buildReady === false, 'BUILD_READY_PREMATURE');
assert(claims.releaseReady === false, 'RELEASE_READY_PREMATURE');

if (gate.candidateState === 'AUTOMATION_IN_PROGRESS') {
  assert(pre.requestAllowed === false, 'SIGNING_REQUEST_FORBIDDEN_WHILE_AUTOMATION_IN_PROGRESS');
  assert(uat.requestAllowed === false, 'UAT_REQUEST_FORBIDDEN_WHILE_AUTOMATION_IN_PROGRESS');
  assert(uat.humanUatEligible === false, 'UAT_ELIGIBILITY_FORBIDDEN_WHILE_AUTOMATION_IN_PROGRESS');
  assert(claims.signingRequestAllowed === false, 'SIGNING_CLAIM_FORBIDDEN_WHILE_AUTOMATION_IN_PROGRESS');
  assert(claims.ownedDeviceUatRequestAllowed === false, 'UAT_CLAIM_FORBIDDEN_WHILE_AUTOMATION_IN_PROGRESS');
  assert(claims.humanUatEligible === false, 'HUMAN_UAT_CLAIM_FORBIDDEN_WHILE_AUTOMATION_IN_PROGRESS');
}

console.log('ALPHA2_HUMAN_INTERVENTION_GATE=PASS');
console.log(`CURRENT_CANDIDATE=${gate.currentCandidate}`);
console.log(`CANDIDATE_STATE=${gate.candidateState}`);
console.log(`SIGNING_REQUEST_ALLOWED=${pre.requestAllowed ? 'YES' : 'NO'}`);
console.log(`OWNED_DEVICE_UAT_REQUEST_ALLOWED=${uat.requestAllowed ? 'YES' : 'NO'}`);
console.log(`HUMAN_UAT_ELIGIBLE=${uat.humanUatEligible ? 'YES' : 'NO'}`);
console.log('HUMAN_DISCOVERY_TESTING=FORBIDDEN');
console.log('CANDIDATE_MUTATION_RESETS_ELIGIBILITY=YES');
console.log('PRIOR_CANDIDATE_PHYSICAL_EVIDENCE_INHERITANCE=NO');
console.log('SAME_CANDIDATE_RERUN=AMBIGUOUS_OR_ENVIRONMENTAL_ONLY');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
