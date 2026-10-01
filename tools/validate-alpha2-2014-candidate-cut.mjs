import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import './validate-ci-runner-policy.mjs';

const read = path => fs.readFileSync(path, 'utf8');
const fail = message => { throw new Error(`ALPHA2_2014_CANDIDATE_CUT_FAILED:${message}`); };

const authority = JSON.parse(read('graph/alpha2-safe-review-diagnostics-candidate.json'));
const workflow = read('.github/workflows/alpha2-integrated-runtime.yml');
const pipeline = read('spikes/mobile-shell/lib/alpha2/alpha2_pipeline.dart');
const projection = read('spikes/mobile-shell/lib/alpha2/alpha2_projection.dart');
const dashboard = read('spikes/mobile-shell/lib/alpha2/alpha2_dashboard_sections.dart');
const diagnosticsTest = read('spikes/mobile-shell/test/alpha2_statement_review_diagnostics_test.dart');

if (authority.schemaVersion !== 'A2_SAFE_REVIEW_DIAGNOSTICS_CANDIDATE_V1') fail('SCHEMA');
if (authority.candidate !== '0.2.0-alpha.2+2014') fail('CANDIDATE');
if (authority.productSourceCommit !== '7b7f18ce9cf58564270dc4cfcb0c0a3dd72ea74b') fail('PRODUCT_SOURCE');
if (authority.predecessor?.candidate !== '0.2.0-alpha.2+2013') fail('PREDECESSOR');
if (authority.predecessor?.stableSignedApkSha256 !== '4d6b9c8588d9178244e8449826e241177d0910246637c69aba54e542f0d93387') fail('PREDECESSOR_SIGNED_IDENTITY');
if (authority.predecessor?.physicalEvidenceInheritanceAllowed !== false) fail('PHYSICAL_EVIDENCE_MUST_RESET');
if (authority.productDelta?.parserBehaviorChanged !== false) fail('PARSER_BEHAVIOR_MUTATION_FORBIDDEN');
if (authority.build?.versionCode !== 2014 || authority.build?.canonicalPromotionPending !== true || authority.build?.trustedEdgeResignRequired !== true) fail('BUILD_BOUNDARY');

const expectedBlobShas = authority.productDelta?.unchangedParserBlobShas ?? {};
for (const [path, expected] of Object.entries(expectedBlobShas)) {
  const observed = execFileSync('git', ['hash-object', path], { encoding: 'utf8' }).trim();
  if (observed !== expected) fail(`PARSER_BLOB_CHANGED:${path}:${observed}`);
}

for (const marker of [
  'alpha2ReviewDiagnosticCountPrefix',
  '_safeStatementReviewProfile',
  '_safeStatementReviewCode',
  'STATEMENT_STRICT_REVIEW_OTHER'
]) if (!pipeline.includes(marker)) fail(`PIPELINE_DIAGNOSTIC_MARKER:${marker}`);

for (const marker of [
  'REVIEW_DIAGNOSTIC:',
  'STATEMENT_REVIEW_'
]) if (!projection.includes(marker)) fail(`PROJECTION_DIAGNOSTIC_MARKER:${marker}`);

for (const marker of [
  'BCP ahorro',
  'BCP tarjeta',
  'Ripley tarjeta',
  'el parser falló cerrado con una causa no publicable'
]) if (!dashboard.includes(marker)) fail(`DASHBOARD_DIAGNOSTIC_MARKER:${marker}`);

for (const marker of [
  'strict review diagnostics are profile-scoped, one-per-statement and allow-listed',
  'PRIVATE_PROVIDER_DETAIL_SHOULD_NOT_ESCAPE',
  'RAW_BANK_TEXT_12345'
]) if (!diagnosticsTest.includes(marker)) fail(`DIAGNOSTIC_TEST_MARKER:${marker}`);

for (const marker of [
  '--build-number 2014',
  "versionCode='2014'",
  'CANDIDATE_ID=0.2.0-alpha.2+2014',
  'PREDECESSOR_CANONICAL=0.2.0-alpha.2+2013',
  'PREDECESSOR_PHYSICAL_EVIDENCE_INHERITANCE=NO',
  'SAFE_REVIEW_DIAGNOSTICS=A2_SAFE_REVIEW_DIAGNOSTICS_V1',
  'CANONICAL_PROMOTION_PENDING=YES',
  'R1_TRUSTED_EDGE_RESIGN_REQUIRED=YES',
  'financesensor-alpha2-2014-candidate-${{ github.run_id }}'
]) if (!workflow.includes(marker)) fail(`WORKFLOW_MARKER:${marker}`);

if (workflow.includes('--build-number 2013') || workflow.includes("versionCode='2013'")) fail('OLD_BUILD_NUMBER_ACTIVE');

console.log('ALPHA2_2014_CANDIDATE_CUT=PASS');
console.log('CANDIDATE=0.2.0-alpha.2+2014');
console.log('PRODUCT_SOURCE_COMMIT=7b7f18ce9cf58564270dc4cfcb0c0a3dd72ea74b');
console.log('PARSER_BEHAVIOR_CHANGED=NO');
console.log('SAFE_REVIEW_DIAGNOSTICS=A2_SAFE_REVIEW_DIAGNOSTICS_V1');
console.log('PREDECESSOR_PHYSICAL_EVIDENCE_INHERITANCE=NO');
console.log('PHYSICAL_ALPHA2_PASS=NO');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
