import fs from 'node:fs';
import './validate-ci-runner-policy.mjs';

const read = p => fs.readFileSync(p, 'utf8');
const fail = m => { throw new Error(`ALPHA2_2017_CANDIDATE_CUT_FAILED:${m}`); };

const c = JSON.parse(read('graph/alpha2-2017-parser-parity-candidate.json'));
const receipt = JSON.parse(read('graph/physical-receipts/ALPHA2-2016-PHYSICAL-PARSER-REGRESSION-2026-09-30.json'));
const workflow = read('.github/workflows/alpha2-integrated-runtime.yml');
const geometry = read('spikes/mobile-shell/lib/alpha2/alpha2_statement_geometry.dart');
const bcp = read('spikes/mobile-shell/lib/alpha2/alpha2_statement_strict_adapter.dart');
const ripley = read('spikes/mobile-shell/lib/alpha2/alpha2_credit_statement_adapters.dart');
const bcpTests = read('spikes/mobile-shell/test/alpha2_statement_strict_adapter_test.dart');
const ripleyTests = read('spikes/mobile-shell/test/alpha2_credit_statement_adapters_test.dart');

if (c.schemaVersion !== 'A2_2017_PARSER_PARITY_CANDIDATE_V1') fail('SCHEMA');
if (c.candidate !== '0.2.0-alpha.2+2017') fail('CANDIDATE');
if (c.predecessor?.candidate !== '0.2.0-alpha.2+2016') fail('PREDECESSOR');
if (c.predecessor?.stableSignedApkSha256 !== '95ef5592b7f344c069a1c37378861ef577870567dd02f51acdbf31a996964c11') fail('PREDECESSOR_SIGNED_IDENTITY');
if (c.predecessor?.physicalEvidenceInheritanceAllowed !== false) fail('PHYSICAL_INHERITANCE');
if (receipt.strictReviewDiagnostics?.bcpSavings?.count !== 7 || receipt.strictReviewDiagnostics?.bcpSavings?.code !== 'STATEMENT_MONETARY_ROW_UNEXPLAINED') fail('BCP_PHYSICAL_DIAGNOSTIC');
if (receipt.strictReviewDiagnostics?.ripleyCredit?.count !== 3 || receipt.strictReviewDiagnostics?.ripleyCredit?.code !== 'RIPLEY_CREDIT_LEDGER_GEOMETRY_UNKNOWN') fail('RIPLEY_PHYSICAL_DIAGNOSTIC');
if (c.productDelta?.parserBehaviorChanged !== true) fail('PARSER_DELTA');
if (c.productDelta?.bcpSavingsCompletenessVersion !== 'A2_BCP_SAVINGS_COMPLETENESS_V4') fail('BCP_VERSION');
if (c.productDelta?.ripleyCreditStrictAdapter !== 'A2_RIPLEY_CREDIT_STRICT_V3') fail('RIPLEY_VERSION');
if (c.build?.versionCode !== 2017 || c.build?.trustedEdgeResignRequired !== true || c.build?.canonicalPromotionPending !== true) fail('BUILD_BOUNDARY');
if (c.boundaries?.predecessorPhysicalEvidenceInherited !== false) fail('EVIDENCE_RESET');
if (c.boundaries?.physicalAlpha2Pass !== false || c.boundaries?.buildReady !== false || c.boundaries?.releaseReady !== false) fail('READINESS');

for (const marker of [
  '_monetaryColumnText',
  'touchTolerance = 4.0',
  '_looksLikeCompleteMoney'
]) if (!geometry.includes(marker)) fail(`GEOMETRY_MARKER:${marker}`);

for (const marker of [
  'A2_BCP_SAVINGS_COMPLETENESS_V4',
  '_strictMonetaryColumnText',
  '_strictNumericMoneyFragment',
  'touchTolerance = 4.0'
]) if (!bcp.includes(marker)) fail(`BCP_MARKER:${marker}`);

for (const marker of [
  'A2_RIPLEY_CREDIT_STRICT_V3',
  'FECHA DE OPERACION',
  'FECHA DE CONSUMO',
  'TEA / TNA',
  'final totalLeft = interest ?? rate ?? amount'
]) if (!ripley.includes(marker)) fail(`RIPLEY_MARKER:${marker}`);

for (const marker of [
  'BCP money cells use the physically reconciled rightmost fragment cluster',
  'unknown undated monetary row still fails closed'
]) if (!bcpTests.includes(marker)) fail(`BCP_TEST:${marker}`);

for (const marker of [
  'Ripley accepts the physically observed operation and TEA/TNA header family',
  'Ripley conflicting anchored billing periods still fail closed'
]) if (!ripleyTests.includes(marker)) fail(`RIPLEY_TEST:${marker}`);

for (const marker of [
  '--build-number 2017',
  "versionCode='2017'",
  'CANDIDATE_ID=0.2.0-alpha.2+2017',
  'PREDECESSOR_CANONICAL=0.2.0-alpha.2+2016',
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
