import fs from 'node:fs';
import './validate-ci-runner-policy.mjs';

const read = path => fs.readFileSync(path, 'utf8');
const fail = message => { throw new Error(`ALPHA2_2014_CANDIDATE_CUT_FAILED:${message}`); };

const workflow = read('.github/workflows/alpha2-integrated-runtime.yml');
const pipeline = read('spikes/mobile-shell/lib/alpha2/alpha2_pipeline.dart');
const projection = read('spikes/mobile-shell/lib/alpha2/alpha2_projection.dart');
const dashboard = read('spikes/mobile-shell/lib/alpha2/alpha2_dashboard_sections.dart');
const regression = read('spikes/mobile-shell/test/alpha2_statement_review_diagnostics_test.dart');
const observation = read('mk0/10-evidence/ALPHA2-2013-STRICT-EECC-REVIEW-PHYSICAL-OBSERVATION-2026-09-17.md');
const authority = JSON.parse(read('graph/alpha2-strict-review-diagnostics-candidate.json'));
const canonical2013 = JSON.parse(read('graph/alpha2-canonical-candidate.json'));

const productSource = '7b7f18ce9cf58564270dc4cfcb0c0a3dd72ea74b';
const predecessorCanonicalSource = 'fd6b2ba75a63e650626f2fcece6c13f0bea4f541';
const predecessorUnsigned = 'bcb6db29b9fb567dcffc99d875674a6834938c837fd2fe7f1aa83cc29c3b0da1';
const predecessorSigned = '4d6b9c8588d9178244e8449826e241177d0910246637c69aba54e542f0d93387';

for (const marker of [
  '--build-number 2014',
  "versionCode='2014'",
  'CANDIDATE_ID=0.2.0-alpha.2+2014',
  'PREDECESSOR_CANONICAL=0.2.0-alpha.2+2013',
  'PREDECESSOR_PHYSICAL_RESULT=OBSERVED_STRICT_EECC_REVIEW_0_IMPORTED_11_REVIEWED',
  'STRICT_REVIEW_DIAGNOSTICS=A2_STRICT_REVIEW_DIAGNOSTICS_V1',
  'STRICT_REVIEW_PRIMARY_CAUSE_PER_STATEMENT=YES',
  'STRICT_REVIEW_PROFILE_ALLOWLIST=YES',
  'STRICT_REVIEW_CODE_ALLOWLIST=YES',
  'STRICT_REVIEW_UNKNOWN_COLLAPSE=STATEMENT_STRICT_REVIEW_OTHER',
  'STRICT_REVIEW_ARBITRARY_DETAIL_EXPOSURE=NO',
  'financesensor-alpha2-2014-candidate-${{ github.run_id }}',
  'CANONICAL_PROMOTION_PENDING=YES',
  'R1_TRUSTED_EDGE_RESIGN_REQUIRED=YES',
  'PREDECESSOR_PHYSICAL_EVIDENCE_INHERITANCE=NO',
]) if (!workflow.includes(marker)) fail(`WORKFLOW_MARKER_MISSING:${marker}`);

if (workflow.includes('--build-number 2013')) fail('OLD_BUILD_NUMBER_STILL_ACTIVE');
if (workflow.includes("versionCode='2013'")) fail('OLD_VERSION_CODE_STILL_ACTIVE');

for (const marker of [
  "alpha2ReviewDiagnosticCountPrefix = 'REVIEW_DIAGNOSTIC:'",
  'STATEMENT_STRICT_REVIEW_OTHER',
  "'BCP_SAVINGS'",
  "'BCP_CREDIT'",
  "'RIPLEY_CREDIT'",
  'onePrimary',
]) {
  // "onePrimary" is represented by governance rather than executable code.
  if (marker === 'onePrimary') continue;
  if (!pipeline.includes(marker)) fail(`PIPELINE_MARKER_MISSING:${marker}`);
}
if (!pipeline.includes('_safeStatementReviewCode') ||
    !pipeline.includes('_safeStatementReviewProfile')) {
  fail('SAFE_REVIEW_CLASSIFICATION_MISSING');
}
if (!projection.includes('_reviewDiagnosticPrefix') ||
    !projection.includes('STATEMENT_REVIEW_') ||
    !projection.includes('genericReviewCount')) {
  fail('PROJECTION_REVIEW_CLASSIFICATION_MISSING');
}
if (!dashboard.includes('_statementReviewGapLabel') ||
    !dashboard.includes('BCP ahorro') ||
    !dashboard.includes('Ripley tarjeta')) {
  fail('SAFE_DASHBOARD_LABELS_MISSING');
}

for (const marker of [
  'PRIVATE_PROVIDER_DETAIL_SHOULD_NOT_ESCAPE',
  'STATEMENT_STRICT_REVIEW_OTHER',
  'findsNothing',
  'strict review diagnostics are profile-scoped',
]) if (!regression.includes(marker)) fail(`REGRESSION_MARKER_MISSING:${marker}`);

if (authority.schemaVersion !== 'A2_STRICT_REVIEW_DIAGNOSTIC_CANDIDATE_V1') fail('AUTHORITY_SCHEMA');
if (authority.candidate !== '0.2.0-alpha.2+2014') fail('AUTHORITY_CANDIDATE');
if (authority.status !== 'CANDIDATE_CUT_PENDING_CANONICAL_BUILD') fail('AUTHORITY_STATUS');
if (authority.productSourceCommit !== productSource || authority.productSourcePr !== 151) fail('PRODUCT_SOURCE_AUTHORITY');

const predecessor = authority.predecessor ?? {};
if (predecessor.candidate !== '0.2.0-alpha.2+2013') fail('PREDECESSOR_CANDIDATE');
if (predecessor.canonicalSourceCommit !== predecessorCanonicalSource ||
    predecessor.canonicalUnsignedApkSha256 !== predecessorUnsigned ||
    predecessor.stableSignedApkSha256 !== predecessorSigned ||
    predecessor.stableSignedApkBytes !== 182563366) {
  fail('PREDECESSOR_IDENTITY');
}
if (predecessor.physicalObservation !== 'GMAIL_RUNTIME_MATERIALIZED_EECC_IMPORTED_0_REVIEW_11' ||
    predecessor.formalPhysicalAlpha2Pass !== false ||
    predecessor.physicalEvidenceInheritanceAllowed !== false) {
  fail('PREDECESSOR_PHYSICAL_BOUNDARY');
}

const remediation = authority.remediation ?? {};
if (remediation.diagnosticVersion !== 'A2_STRICT_REVIEW_DIAGNOSTICS_V1' ||
    remediation.diagnosticPrefix !== 'REVIEW_DIAGNOSTIC:' ||
    remediation.onePrimaryCausePerReviewedStatement !== true ||
    remediation.profileAllowlist !== true ||
    remediation.reviewCodeAllowlist !== true ||
    remediation.unknownCodeCollapsesTo !== 'STATEMENT_STRICT_REVIEW_OTHER' ||
    remediation.gapCountDuplicationForbidden !== true ||
    remediation.humanReadableSafeLabels !== true ||
    remediation.arbitraryParserDetailExposure !== false ||
    remediation.profilePasswordSessionReuse !== true ||
    remediation.profilePasswordDiskPersistence !== false) {
  fail('REMEDIATION_CONTRACT');
}
if (remediation.regression !== 'spikes/mobile-shell/test/alpha2_statement_review_diagnostics_test.dart') {
  fail('REMEDIATION_REGRESSION_LINK');
}

const next = authority.authority ?? {};
if (next.canonicalPromotionPending !== true ||
    next.currentCanonicalCandidate !== '0.2.0-alpha.2+2013' ||
    next.currentCanonicalSourceCommit !== predecessorCanonicalSource ||
    next.nextCanonicalSourceCommit !== null ||
    next.nextCanonicalBuildRunId !== null ||
    next.nextCanonicalArtifactId !== null ||
    next.nextCanonicalUnsignedApkSha256 !== null ||
    next.trustedEdgeResignRequired !== true ||
    next.trustedEdgeSigningPass !== false ||
    next.stableSignedApkSha256 !== null ||
    next.physicalCampaignResetRequired !== true) {
  fail('PREMATURE_CANONICAL_OR_SIGNING_PROMOTION');
}
if (authority.boundaries?.predecessorPhysicalEvidenceInherited !== false ||
    authority.boundaries?.physicalAlpha2Pass !== false ||
    authority.boundaries?.buildReady !== false ||
    authority.boundaries?.releaseReady !== false) {
  fail('PREMATURE_PRODUCT_PROMOTION');
}

if (canonical2013.candidate !== '0.2.0-alpha.2+2013' ||
    canonical2013.sourceCommit !== predecessorCanonicalSource ||
    canonical2013.authority?.apkSha256 !== predecessorUnsigned ||
    canonical2013.signing?.trustedEdgeSigningPass !== true ||
    canonical2013.signing?.signedApkSha256 !== predecessorSigned) {
  fail('PREDECESSOR_CANONICAL_DRIFT');
}
if (canonical2013.boundaries?.physicalAlpha2Pass !== false ||
    canonical2013.boundaries?.buildReady !== false ||
    canonical2013.boundaries?.releaseReady !== false) {
  fail('PREDECESSOR_PREMATURE_PROMOTION');
}

for (const marker of [
  'Gmail observations: **4**',
  'EECC imported: **0**',
  'EECC requiring strict review: **11**',
  'Physical evidence inheritable by successor: **NO**',
  'No screenshot, PDF bytes',
  'profile-scoped',
]) if (!observation.includes(marker)) fail(`OBSERVATION_MARKER_MISSING:${marker}`);

for (const forbidden of [
  'PHYSICAL_ALPHA2_PASS=YES',
  'BUILD_READY=YES',
  'RELEASE_READY=YES',
  'PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=1',
]) if (workflow.includes(forbidden)) fail(`WORKFLOW_PREMATURE_PROMOTION:${forbidden}`);

console.log('ALPHA2_2014_CANDIDATE_CUT=PASS');
console.log('CANDIDATE_ID=0.2.0-alpha.2+2014');
console.log(`PRODUCT_SOURCE_COMMIT=${productSource}`);
console.log('PREDECESSOR_CANONICAL=0.2.0-alpha.2+2013');
console.log(`PREDECESSOR_SIGNED_APK_SHA256=${predecessorSigned}`);
console.log('PREDECESSOR_PHYSICAL_RESULT=OBSERVED_STRICT_EECC_REVIEW_0_IMPORTED_11_REVIEWED');
console.log('STRICT_REVIEW_DIAGNOSTICS=A2_STRICT_REVIEW_DIAGNOSTICS_V1');
console.log('CANONICAL_PROMOTION_PENDING=YES');
console.log('R1_TRUSTED_EDGE_RESIGN_REQUIRED=YES');
console.log('PREDECESSOR_PHYSICAL_EVIDENCE_INHERITANCE=NO');
console.log('PHYSICAL_ALPHA2_PASS=NO');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
