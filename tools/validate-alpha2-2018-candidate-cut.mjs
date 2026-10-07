import fs from 'node:fs';
import './validate-ci-runner-policy.mjs';
import './validate-alpha2-edge-v1-runtime.mjs';

const read = p => fs.readFileSync(p, 'utf8');
const json = p => JSON.parse(read(p));
const fail = m => { throw new Error(`ALPHA2_2018_CANDIDATE_CUT_FAILED:${m}`); };

const golden = json('graph/alpha2-2017-parser-repair-candidate.json');
const workflow = read('.github/workflows/alpha2-integrated-runtime.yml');
const transactionScanner = read('spikes/mobile-shell/native/android/Alpha2TransactionScanner.kt');
const mainActivity = read('spikes/mobile-shell/native/android/Alpha2MainActivity.kt');
const materializer = read('tools/materialize-alpha2-android.py');
const adr = read('mk0/11-decisions/ADR-040-PROVIDER-NEUTRAL-EDGE-V1-SHADOW.md');

if (golden.schemaVersion !== 'A2_2017_PARSER_REPAIR_CANDIDATE_V1') fail('GOLDEN_SCHEMA');
if (golden.candidate !== '0.2.0-alpha.2+2017') fail('GOLDEN_CANDIDATE');
if (golden.productDelta?.bcpSavingsCompletenessVersion !== 'A2_BCP_SAVINGS_COMPLETENESS_V4') fail('GOLDEN_BCP');
if (golden.productDelta?.ripleyCreditStrictAdapter !== 'A2_RIPLEY_CREDIT_STRICT_V3') fail('GOLDEN_RIPLEY');
if (golden.boundaries?.physicalAlpha2Pass !== false) fail('GOLDEN_PHYSICAL_BOUNDARY');

for (const marker of [
  '--build-number 2018',
  "versionCode='2018'",
  'CANDIDATE_ID=0.2.0-alpha.2+2018',
  'PREDECESSOR_INTERNAL_CANDIDATE=0.2.0-alpha.2+2017',
  'PREDECESSOR_CANONICAL=0.2.0-alpha.2+2016',
  'FUNCTIONAL_BASELINE_CANDIDATE=0.2.0-alpha.2+2017',
  'STRICT_PARSER_BEHAVIOR_CHANGED=NO',
  'EDGE_V1_RUNTIME=OBSERVE_ONLY',
  'EDGE_PROVIDER_IDENTITY_FEATURES=NO',
  'EDGE_RUNTIME_PROVIDER_SWITCH=NO',
  'EDGE_DURABLE_FINANCIAL_AUTHORITY=NO',
  'EDGE_PERSISTED_EVENTS=0',
  'GOLDEN_2017_AUTHORITY=PRESERVED',
  'PREDECESSOR_PHYSICAL_EVIDENCE_INHERITANCE=NO',
  'PHYSICAL_ALPHA2_PASS=NO',
  'BUILD_READY=NO',
  'RELEASE_READY=NO',
  'financesensor-alpha2-2018-candidate-${{ github.run_id }}',
]) if (!workflow.includes(marker)) fail(`WORKFLOW_MARKER:${marker}`);

if (workflow.includes('--build-number 2017') || workflow.includes("versionCode='2017'")) {
  fail('OLD_BUILD_NUMBER_ACTIVE');
}

for (const marker of [
  '"edgeShadowMode" to "OBSERVE_ONLY"',
  '"edgePersistedEvents" to 0',
  'edgeMailModel?.predict(subject)',
  'edgeStatementMailModel?.probability(subject)',
]) if (!transactionScanner.includes(marker)) fail(`TRANSACTION_EDGE_MARKER:${marker}`);

for (const marker of [
  'Alpha2EdgeModelBundle.load(this)',
  'edgeMailModel = edgeModels?.mail',
  'edgeStatementMailModel = edgeModels?.statementMail',
  '"gmailEvidence" to (transaction["events"]',
]) if (!mainActivity.includes(marker)) fail(`MAIN_EDGE_MARKER:${marker}`);

for (const marker of [
  "('Alpha2EdgeTextModel.kt', 'Alpha2EdgeTextModel.kt')",
  "'edge_mail_model_v1.json'",
  "'edge_statement_mail_model_v1.json'",
]) if (!materializer.includes(marker)) fail(`PACKAGING_MARKER:${marker}`);

for (const marker of [
  'EDGE MODE                         OBSERVE_ONLY',
  'DURABLE FINANCIAL AUTHORITY       FORBIDDEN',
  'EDGE PERSISTED EVENTS             0',
  '+2017 ADAPTER AUTHORITY           PRESERVED AS GOLDEN ORACLE',
]) if (!adr.includes(marker)) fail(`ADR_MARKER:${marker}`);

console.log('ALPHA2_2018_CANDIDATE_CUT=PASS');
console.log('CANDIDATE=0.2.0-alpha.2+2018');
console.log('PREDECESSOR=0.2.0-alpha.2+2017');
console.log('EDGE_MODE=OBSERVE_ONLY');
console.log('EDGE_DURABLE_FINANCIAL_AUTHORITY=NO');
console.log('EDGE_PERSISTED_EVENTS=0');
console.log('GOLDEN_2017_AUTHORITY=PRESERVED');
console.log('PREDECESSOR_PHYSICAL_EVIDENCE_INHERITANCE=NO');
console.log('TRUSTED_EDGE_RESIGN_REQUIRED=YES');
console.log('PHYSICAL_ALPHA2_PASS=NO');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
