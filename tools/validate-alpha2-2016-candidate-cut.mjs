import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import './validate-ci-runner-policy.mjs';

const read = path => fs.readFileSync(path, 'utf8');
const fail = message => { throw new Error(`ALPHA2_2016_PARSER_REMEDIATION_FAILED:${message}`); };

const candidate = JSON.parse(read('graph/alpha2-2016-parser-remediation-candidate.json'));
const physical = JSON.parse(read('graph/physical-receipts/ALPHA2-2015-SAFE-REVIEW-DIAGNOSTICS-2026-09-30.json'));
const workflow = read('.github/workflows/alpha2-integrated-runtime.yml');
const bcp = read('spikes/mobile-shell/lib/alpha2/alpha2_statement_strict_adapter.dart');
const ripley = read('spikes/mobile-shell/lib/alpha2/alpha2_credit_statement_adapters.dart');
const bcpTest = read('spikes/mobile-shell/test/alpha2_statement_strict_adapter_test.dart');
const ripleyTest = read('spikes/mobile-shell/test/alpha2_credit_statement_adapters_test.dart');

if (candidate.schemaVersion !== 'A2_2016_PARSER_REMEDIATION_V1') fail('SCHEMA');
if (candidate.candidate !== '0.2.0-alpha.2+2016') fail('CANDIDATE');
if (candidate.remediationSourceCommit !== '7c9c719d629da3c0cbfcd48ec6af494dda7d0f01') fail('REMEDIATION_SOURCE');
if (candidate.predecessor?.candidate !== '0.2.0-alpha.2+2015') fail('PREDECESSOR');
if (candidate.predecessor?.stableSignedApkSha256 !== '076aa4328165e2e327d11e4cd4dc2d8a4b3ae1aff6b2b871e112910aeadd159e') fail('PREDECESSOR_SIGNED_IDENTITY');
if (candidate.predecessor?.physicalEvidenceInheritanceAllowed !== false) fail('PHYSICAL_INHERITANCE');

if (physical.candidate !== '0.2.0-alpha.2+2015' || physical.statementsReviewRequired !== 10) fail('PHYSICAL_DIAGNOSTICS');
const bcpPhysical = physical.reviewDiagnostics?.find(x => x.profile === 'BCP_SAVINGS');
const ripleyPhysical = physical.reviewDiagnostics?.find(x => x.profile === 'RIPLEY_CREDIT');
if (bcpPhysical?.code !== 'STATEMENT_MONETARY_ROW_UNEXPLAINED' || bcpPhysical?.count !== 7) fail('BCP_PHYSICAL_DIAGNOSTIC');
if (ripleyPhysical?.code !== 'RIPLEY_CREDIT_PERIOD_AMBIGUOUS' || ripleyPhysical?.count !== 3) fail('RIPLEY_PHYSICAL_DIAGNOSTIC');

if (candidate.productDelta?.parserBehaviorChanged !== true) fail('PARSER_DELTA');
if (candidate.productDelta?.bcpSavingsCompletenessVersion !== 'A2_BCP_SAVINGS_COMPLETENESS_V3') fail('BCP_VERSION');
if (candidate.productDelta?.bcpDetachedCertifiedControlBinding !== 'BOUNDED_UNIQUE_Y10') fail('BCP_CONTROL_BINDING');
if (candidate.productDelta?.bcpUnknownUndatedMonetaryRowStillFailsClosed !== true) fail('BCP_FAIL_CLOSED');
if (candidate.productDelta?.ripleyCreditAdapterVersion !== 'A2_RIPLEY_CREDIT_STRICT_V2') fail('RIPLEY_VERSION');
if (candidate.productDelta?.ripleyPeriodAuthority !== 'GEOMETRY_ANCHORED_UNIQUE_PERIOD') fail('RIPLEY_PERIOD_AUTHORITY');
if (candidate.productDelta?.ripleyConflictingAnchoredPeriodsFailClosed !== true) fail('RIPLEY_FAIL_CLOSED');

for (const [path, expected] of Object.entries(candidate.functionalBlobShas ?? {})) {
  const observed = execFileSync('git', ['hash-object', path], { encoding: 'utf8' }).trim();
  if (observed !== expected) fail(`FUNCTIONAL_BLOB_CHANGED:${path}:${observed}`);
}

for (const marker of [
  'A2_BCP_SAVINGS_COMPLETENESS_V3',
  '_isDetachedCertifiedBcpSummaryAmountLine',
  'const yTolerance = 10.0',
  '_isCertifiedBcpSummaryLabel'
]) if (!bcp.includes(marker)) fail(`BCP_MARKER:${marker}`);

for (const marker of [
  'A2_RIPLEY_CREDIT_STRICT_V2',
  "PERIODO DE FACTURACION",
  'final periods = <String, _CreditPeriod>{}',
  'return periods.length == 1 ? periods.values.single : null'
]) if (!ripley.includes(marker)) fail(`RIPLEY_MARKER:${marker}`);

for (const marker of [
  'certified BCP control values may be vertically detached from their labels',
  'unknown undated monetary row still fails closed'
]) if (!bcpTest.includes(marker)) fail(`BCP_TEST:${marker}`);

for (const marker of [
  'Ripley period stays anchored when unrelated dates are nearby',
  'Ripley conflicting anchored periods remain fail-closed'
]) if (!ripleyTest.includes(marker)) fail(`RIPLEY_TEST:${marker}`);

if (candidate.build?.versionCode !== 2016 || candidate.build?.trustedEdgeResignRequired !== true || candidate.build?.canonicalPromotionPending !== true) fail('BUILD_BOUNDARY');

for (const marker of [
  '--build-number 2016',
  "versionCode='2016'",
  'CANDIDATE_ID=0.2.0-alpha.2+2016',
  'PREDECESSOR_CANONICAL=0.2.0-alpha.2+2015',
  'FUNCTIONAL_BASELINE_CANDIDATE=0.2.0-alpha.2+2015',
  'FUNCTIONAL_DELTA=YES',
  'STRICT_PARSER_BEHAVIOR_CHANGED=YES',
  'BCP_SAVINGS_COMPLETENESS_VERSION=A2_BCP_SAVINGS_COMPLETENESS_V3',
  'RIPLEY_CREDIT_STRICT_ADAPTER=A2_RIPLEY_CREDIT_STRICT_V2',
  'PREDECESSOR_PHYSICAL_EVIDENCE_INHERITANCE=NO',
  'financesensor-alpha2-2016-candidate-${{ github.run_id }}'
]) if (!workflow.includes(marker)) fail(`WORKFLOW_MARKER:${marker}`);

if (workflow.includes('--build-number 2015') || workflow.includes("versionCode='2015'")) fail('OLD_BUILD_NUMBER_ACTIVE');
if (candidate.boundaries?.physicalAlpha2Pass !== false || candidate.boundaries?.buildReady !== false || candidate.boundaries?.releaseReady !== false) fail('PREMATURE_READINESS');

console.log('ALPHA2_2016_PARSER_REMEDIATION=PASS');
console.log('CANDIDATE=0.2.0-alpha.2+2016');
console.log('BCP_REMEDIATION=DETACHED_CERTIFIED_CONTROL_BINDING');
console.log('RIPLEY_REMEDIATION=GEOMETRY_ANCHORED_PERIOD');
console.log('TRUSTED_EDGE_RESIGN_REQUIRED=YES');
console.log('PREDECESSOR_PHYSICAL_EVIDENCE_INHERITANCE=NO');
console.log('PHYSICAL_ALPHA2_PASS=NO');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
