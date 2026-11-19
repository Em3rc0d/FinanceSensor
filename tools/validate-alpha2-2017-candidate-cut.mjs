import fs from 'node:fs';
import './validate-ci-runner-policy.mjs';

const read = p => fs.readFileSync(p, 'utf8');
const json = p => JSON.parse(read(p));
const fail = m => { throw new Error(`ALPHA2_2017_CANDIDATE_CUT_FAILED:${m}`); };

const c = json('graph/alpha2-2017-parser-repair-candidate.json');
const signing = json('graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2016-2026-09-30.json');
const physical = json('graph/physical-receipts/ALPHA2-2016-PHYSICAL-PARSER-REGRESSION-2026-09-30.json');
const workflow = read('.github/workflows/alpha2-integrated-runtime.yml');
const bcp = read('spikes/mobile-shell/lib/alpha2/alpha2_statement_strict_adapter.dart');
const ripley = read('spikes/mobile-shell/lib/alpha2/alpha2_credit_statement_adapters.dart');
const bcpTests = read('spikes/mobile-shell/test/alpha2_statement_strict_adapter_test.dart');
const ripleyTests = read('spikes/mobile-shell/test/alpha2_credit_statement_adapters_test.dart');

if (c.schemaVersion !== 'A2_2017_PARSER_REPAIR_CANDIDATE_V1') fail('SCHEMA');
if (c.candidate !== '0.2.0-alpha.2+2017') fail('CANDIDATE');
if (c.predecessor?.candidate !== '0.2.0-alpha.2+2016') fail('PREDECESSOR');
if (c.predecessor?.stableSignedApkSha256 !== '95ef5592b7f344c069a1c37378861ef577870567dd02f51acdbf31a996964c11') fail('PREDECESSOR_SIGNED');
if (c.predecessor?.physicalEvidenceInheritanceAllowed !== false) fail('PHYSICAL_INHERITANCE');
if (c.productDelta?.parserBehaviorChanged !== true) fail('PARSER_DELTA');
if (c.productDelta?.bcpSavingsCompletenessVersion !== 'A2_BCP_SAVINGS_COMPLETENESS_V4') fail('BCP_VERSION');
if (c.productDelta?.ripleyCreditStrictAdapter !== 'A2_RIPLEY_CREDIT_STRICT_V3') fail('RIPLEY_VERSION');
if (c.build?.versionCode !== 2017 || c.build?.trustedEdgeResignRequired !== true || c.build?.canonicalPromotionPending !== true) fail('BUILD_BOUNDARY');
if (c.boundaries?.predecessorPhysicalEvidenceInherited !== false) fail('EVIDENCE_RESET');
if (c.boundaries?.physicalAlpha2Pass !== false || c.boundaries?.buildReady !== false || c.boundaries?.releaseReady !== false) fail('READINESS');

if (signing.trustedEdgeSigningPass !== true) fail('PREDECESSOR_SIGNING_NOT_PASS');
if (signing.inputApkSha256 !== 'f93d3d5411fab884698fce88a24db30a0004f4969503634d845bc1d3cc53ed97') fail('PREDECESSOR_INPUT');
if (signing.signedApkSha256 !== c.predecessor.stableSignedApkSha256) fail('PREDECESSOR_SIGNING_CHAIN');
if (signing.signerSha1 !== '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0') fail('SIGNER');

if (physical.stableSignedApkSha256 !== signing.signedApkSha256) fail('PHYSICAL_SIGNED_IDENTITY');
if (physical.statementsImported !== 0 || physical.statementsReviewRequired !== 10) fail('PHYSICAL_STATEMENT_COUNTS');
const diag = new Map(physical.reviewDiagnostics.map(x => [x.profile, x]));
if (diag.get('BCP_SAVINGS')?.code !== 'STATEMENT_MONETARY_ROW_UNEXPLAINED' || diag.get('BCP_SAVINGS')?.count !== 7) fail('BCP_PHYSICAL_DIAGNOSTIC');
if (diag.get('RIPLEY_CREDIT')?.code !== 'RIPLEY_CREDIT_LEDGER_GEOMETRY_UNKNOWN' || diag.get('RIPLEY_CREDIT')?.count !== 3) fail('RIPLEY_PHYSICAL_DIAGNOSTIC');
if (physical.claims?.physicalAlpha2Pass !== false || physical.claims?.buildReady !== false || physical.claims?.releaseReady !== false) fail('PHYSICAL_CLAIMS');

for (const marker of [
  'A2_BCP_SAVINGS_COMPLETENESS_V4',
  'const yTolerance = 36.0',
  '_hasNoInterveningBcpNarrativeLine',
  'UNKNOWN_UNDATED_MONETARY'
]) {
  if (!bcp.includes(marker) && !JSON.stringify(c).includes(marker)) fail(`BCP_MARKER:${marker}`);
}
for (const marker of [
  'certified BCP detached controls tolerate one PDF baseline gap',
  'unknown undated monetary row still fails closed'
]) if (!bcpTests.includes(marker)) fail(`BCP_TEST:${marker}`);

for (const marker of [
  'A2_RIPLEY_CREDIT_STRICT_V3',
  'FECHA DE OPERACION',
  'TEA / TNA',
  '_ripleyTotalLeftAnchor',
  '_isCertifiedRipleyControlRow',
  'SALDO INICIAL'
]) if (!ripley.includes(marker)) fail(`RIPLEY_MARKER:${marker}`);
for (const marker of [
  'Ripley physical header variant accepts operation date and TEA/TNA',
  'Ripley strict adapter imports ledger totals and excludes summary/formulas',
  'Ripley conflicting anchored billing periods still fail closed'
]) if (!ripleyTests.includes(marker)) fail(`RIPLEY_TEST:${marker}`);

for (const marker of [
  '--build-number 2017',
  "versionCode='2017'",
  'CANDIDATE_ID=0.2.0-alpha.2+2017',
  'PREDECESSOR_CANONICAL=0.2.0-alpha.2+2016',
  'FUNCTIONAL_BASELINE_CANDIDATE=0.2.0-alpha.2+2016',
  'FUNCTIONAL_DELTA=YES',
  'STRICT_PARSER_BEHAVIOR_CHANGED=YES',
  'BCP_SAVINGS_COMPLETENESS_VERSION=A2_BCP_SAVINGS_COMPLETENESS_V4',
  'RIPLEY_CREDIT_STRICT_ADAPTER=A2_RIPLEY_CREDIT_STRICT_V3',
  'PREDECESSOR_PHYSICAL_EVIDENCE_INHERITANCE=NO',
  'financesensor-alpha2-2017-candidate-${{ github.run_id }}'
]) if (!workflow.includes(marker)) fail(`WORKFLOW_MARKER:${marker}`);

if (workflow.includes('--build-number 2016') || workflow.includes("versionCode='2016'")) fail('OLD_BUILD_NUMBER_ACTIVE');

console.log('ALPHA2_2017_CANDIDATE_CUT=PASS');
console.log('CANDIDATE=0.2.0-alpha.2+2017');
console.log('PARSER_BEHAVIOR_CHANGED=YES');
console.log('BCP_SAVINGS_COMPLETENESS_VERSION=A2_BCP_SAVINGS_COMPLETENESS_V4');
console.log('RIPLEY_CREDIT_STRICT_ADAPTER=A2_RIPLEY_CREDIT_STRICT_V3');
console.log('PREDECESSOR_PHYSICAL_EVIDENCE_INHERITANCE=NO');
console.log('TRUSTED_EDGE_RESIGN_REQUIRED=YES');
console.log('PHYSICAL_ALPHA2_PASS=NO');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
