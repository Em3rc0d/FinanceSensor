import fs from 'node:fs';
import './validate-ci-runner-policy.mjs';

const read = p => fs.readFileSync(p, 'utf8');
const fail = m => { throw new Error(`ALPHA2_2016_CANDIDATE_CUT_FAILED:${m}`); };

const c = JSON.parse(read('graph/alpha2-2016-parser-remediation-candidate.json'));
const workflow = read('.github/workflows/alpha2-integrated-runtime.yml');
const bcp = read('spikes/mobile-shell/lib/alpha2/alpha2_statement_strict_adapter.dart');
const ripley = read('spikes/mobile-shell/lib/alpha2/alpha2_credit_statement_adapters.dart');
const bcpTests = read('spikes/mobile-shell/test/alpha2_statement_strict_adapter_test.dart');
const ripleyTests = read('spikes/mobile-shell/test/alpha2_credit_statement_adapters_test.dart');

if (c.schemaVersion !== 'A2_2016_PARSER_REMEDIATION_CANDIDATE_V1') fail('SCHEMA');
if (c.candidate !== '0.2.0-alpha.2+2016') fail('CANDIDATE');
if (c.predecessor?.candidate !== '0.2.0-alpha.2+2015') fail('PREDECESSOR');
if (c.predecessor?.stableSignedApkSha256 !== '076aa4328165e2e327d11e4cd4dc2d8a4b3ae1aff6b2b871e112910aeadd159e') fail('PREDECESSOR_SIGNED_IDENTITY');
if (c.predecessor?.physicalEvidenceInheritanceAllowed !== false) fail('PHYSICAL_INHERITANCE');
if (c.productDelta?.parserBehaviorChanged !== true) fail('PARSER_DELTA');
if (c.productDelta?.bcpSavingsCompletenessVersion !== 'A2_BCP_SAVINGS_COMPLETENESS_V3') fail('BCP_VERSION');
if (c.productDelta?.ripleyCreditStrictAdapter !== 'A2_RIPLEY_CREDIT_STRICT_V2') fail('RIPLEY_VERSION');
if (c.build?.versionCode !== 2016 || c.build?.trustedEdgeResignRequired !== true || c.build?.canonicalPromotionPending !== true) fail('BUILD_BOUNDARY');
if (c.boundaries?.predecessorPhysicalEvidenceInherited !== false) fail('EVIDENCE_RESET');
if (c.boundaries?.physicalAlpha2Pass !== false || c.boundaries?.buildReady !== false || c.boundaries?.releaseReady !== false) fail('READINESS');

for (const marker of [
  'A2_BCP_SAVINGS_COMPLETENESS_V3',
  ' CONTABLE',
  ' DISPONIBLE',
  'CARGO(?:S)?',
  'ABONO(?:S)?'
]) if (!bcp.includes(marker)) fail(`BCP_MARKER:${marker}`);
for (const marker of ['SALDO CONTABLE','SALDO DISPONIBLE','TOTAL CARGOS','TOTAL ABONOS']) {
  if (!bcpTests.includes(marker)) fail(`BCP_TEST_DATA:${marker}`);
}

for (const marker of [
  'A2_RIPLEY_CREDIT_STRICT_V2',
  '_creditDateTokens',
  '_creditPeriodFromTokens',
  'candidates.length == 1',
  "PERIODO DE FACTURACION"
]) if (!ripley.includes(marker)) fail(`RIPLEY_MARKER:${marker}`);

for (const marker of [
  'certified BCP balance and aggregate labels stay outside the ledger',
  'unknown undated monetary row still fails closed'
]) if (!bcpTests.includes(marker)) fail(`BCP_TEST:${marker}`);

for (const marker of [
  'Ripley billing period ignores unrelated nearby dates',
  'Ripley conflicting anchored billing periods still fail closed'
]) if (!ripleyTests.includes(marker)) fail(`RIPLEY_TEST:${marker}`);

for (const marker of [
  '--build-number 2016',
  "versionCode='2016'",
  'CANDIDATE_ID=0.2.0-alpha.2+2016',
  'PREDECESSOR_CANONICAL=0.2.0-alpha.2+2015',
  'FUNCTIONAL_DELTA=YES',
  'STRICT_PARSER_BEHAVIOR_CHANGED=YES',
  'BCP_SAVINGS_COMPLETENESS_VERSION=A2_BCP_SAVINGS_COMPLETENESS_V3',
  'RIPLEY_CREDIT_STRICT_ADAPTER=A2_RIPLEY_CREDIT_STRICT_V2',
  'PREDECESSOR_PHYSICAL_EVIDENCE_INHERITANCE=NO',
  'financesensor-alpha2-2016-candidate-${{ github.run_id }}'
]) if (!workflow.includes(marker)) fail(`WORKFLOW_MARKER:${marker}`);

if (workflow.includes('--build-number 2015') || workflow.includes("versionCode='2015'")) fail('OLD_BUILD_NUMBER_ACTIVE');

console.log('ALPHA2_2016_CANDIDATE_CUT=PASS');
console.log('CANDIDATE=0.2.0-alpha.2+2016');
console.log('PARSER_BEHAVIOR_CHANGED=YES');
console.log('BCP_SAVINGS_COMPLETENESS_VERSION=A2_BCP_SAVINGS_COMPLETENESS_V3');
console.log('RIPLEY_CREDIT_STRICT_ADAPTER=A2_RIPLEY_CREDIT_STRICT_V2');
console.log('PREDECESSOR_PHYSICAL_EVIDENCE_INHERITANCE=NO');
console.log('TRUSTED_EDGE_RESIGN_REQUIRED=YES');
console.log('PHYSICAL_ALPHA2_PASS=NO');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
