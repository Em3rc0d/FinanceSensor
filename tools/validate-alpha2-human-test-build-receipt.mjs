import fs from 'node:fs';

const graphPath = 'graph/alpha2-human-test-build.json';
const evidencePath = 'mk0/10-evidence/EV-ALPHA2-HUMAN-TEST-BUILD-2026-09-05.md';
const handoffPath = 'mk0/12-release/ALPHA2-STATIC-BUILD-HANDOFF.md';
const candidatePath = 'mk0/12-release/HUMAN-TEST-CANDIDATE.md';
const readinessPath = 'graph/build-readiness.json';
const ledgerPath = 'graph/closure-ledger.json';
const workflowPath = '.github/workflows/mobile-human-test-alpha.yml';

const failures = [];
const fail = message => failures.push(message);
const assert = (condition, message) => { if (!condition) fail(message); };
const readText = path => fs.readFileSync(path, 'utf8');
const readJson = path => JSON.parse(readText(path));

for (const path of [graphPath, evidencePath, handoffPath, candidatePath, readinessPath, ledgerPath, workflowPath]) {
  if (!fs.existsSync(path)) fail(`missing ${path}`);
}

if (!failures.length) {
  const graph = readJson(graphPath);
  const evidence = readText(evidencePath);
  const handoff = readText(handoffPath);
  const candidate = readText(candidatePath);
  const readiness = readJson(readinessPath);
  const ledger = readJson(ledgerPath);
  const workflow = readText(workflowPath);

  assert(graph.schemaVersion === 1, 'receipt schemaVersion');
  assert(graph.project === 'FinanceSensor', 'receipt project');
  assert(graph.candidate === '0.1.0-alpha.1+1001', 'candidate version');
  assert(graph.surface === 'ANDROID_HUMAN_TEST_ALPHA', 'surface');
  assert(graph.status === 'CI_BUILD_PASS_TRUSTED_EDGE_SIGNING_REQUIRED', 'receipt status');

  assert(graph.source?.branch === 'jett/mk0-foundation', 'source branch');
  assert(graph.source?.commit === '9d990fc579429cc0bc8e5c02306d8ebe4622e145', 'source commit');
  assert(graph.source?.workflow === 'FinanceSensor Android Human Test Alpha', 'workflow identity');
  assert(graph.source?.runId === 33999717749, 'run id');
  assert(graph.source?.runNumber === 4, 'run number');
  assert(graph.source?.jobId === 101396281087, 'job id');
  assert(graph.source?.conclusion === 'success', 'run conclusion');

  assert(graph.artifact?.id === 9979184888, 'artifact id');
  assert(graph.artifact?.name === 'financesensor-android-human-test-alpha-0.1.0', 'artifact name');
  assert(graph.artifact?.archiveBytes === 81786483, 'artifact archive bytes');
  assert(graph.artifact?.archiveSha256 === 'dac3afc3f816321fee3a9a0655bd70a34a037860897a5d1c684695ba3ae9966c', 'artifact archive sha256');
  assert(graph.artifact?.apkBytes === 172884802, 'apk bytes');
  assert(graph.artifact?.apkSha256 === 'c0a4a5a9a908ed0ea04cbb5ddef10f1343ed84cfa1db5fbe1b2ac00e0a768d1d', 'apk sha256');
  assert(graph.artifact?.publicCiSigner === 'COMPILE_ONLY_EPHEMERAL', 'public signer boundary');
  assert(graph.artifact?.trustedEdgeResignRequired === true, 'trusted-edge re-sign requirement');

  assert(graph.contract?.staticAlpha2SlicesCertified === '7/7', 'A-G static closure');
  assert(graph.contract?.prePhysicalBuildEntry === 'PASS', 'pre-physical build entry');
  assert(graph.contract?.humanTestReady === true, 'human-test ready');
  assert(graph.contract?.alpha2MobileIntegration === 'OPEN', 'mobile integration must remain open');
  assert(graph.contract?.alpha2PhysicalProductPass === false, 'physical product pass must remain false');
  assert(graph.contract?.buildReady === false, 'receipt BUILD_READY must remain false');
  assert(graph.contract?.releaseReady === false, 'receipt RELEASE_READY must remain false');
  assert(graph.contract?.realOauthExecutedByCi === false, 'real OAuth in CI forbidden');
  assert(graph.contract?.realGmailExecutedByCi === false, 'real Gmail in CI forbidden');
  assert(graph.contract?.exactGmailScope === 'gmail.readonly', 'exact Gmail scope');
  assert(graph.contract?.androidOauthPackage === 'com.financesensor.lab.gmailconnection.r2', 'Android OAuth package');

  assert(graph.nextGate?.id === 'TRUSTED_EDGE_STABLE_LAB_SIGNING', 'next gate id');
  assert(graph.nextGate?.requiredSigner === 'FINANCESENSOR_R2_LAB', 'next signer');
  assert(graph.nextGate?.physicalOwnedDeviceExecutionRequired === true, 'owned-device physical execution required');
  assert(graph.nextGate?.publicCiMayHoldPrivateKey === false, 'private key forbidden in public CI');

  for (const marker of [
    'SOURCE_SHA   9d990fc579429cc0bc8e5c02306d8ebe4622e145',
    'RUN_ID       33999717749',
    'RUN_NUMBER   4',
    'JOB_ID       101396281087',
    'ARTIFACT_ID          9979184888',
    'ARTIFACT_ZIP_SHA256  dac3afc3f816321fee3a9a0655bd70a34a037860897a5d1c684695ba3ae9966c',
    'APK_BYTES            172884802',
    'APK_SHA256           c0a4a5a9a908ed0ea04cbb5ddef10f1343ed84cfa1db5fbe1b2ac00e0a768d1d',
    'TRUSTED_EDGE_RESIGN_REQUIRED        YES',
    'BUILD_READY                         NO',
    'RELEASE_READY                       NO'
  ]) assert(evidence.includes(marker), `evidence marker ${marker}`);

  for (const marker of [
    'ALPHA.2 STATIC SLICES                 7 / 7 EXACT-SHA CI PASS',
    'CONTROLLED_ANDROID_HUMAN_TEST_BUILD   AUTHORIZED',
    'ALPHA.2 MOBILE PRODUCT INTEGRATION    OPEN',
    'GLOBAL BUILD_READY                    NO'
  ]) assert(handoff.includes(marker), `handoff marker ${marker}`);

  for (const marker of [
    'STATIC_A_G_CERTIFIED=YES',
    'ALPHA2_MOBILE_INTEGRATION=OPEN',
    'HUMAN_TEST_READY=YES',
    'TRUSTED_EDGE_RESIGN_REQUIRED=YES',
    'BUILD_READY=NO',
    'RELEASE_READY=NO'
  ]) assert(candidate.includes(marker), `candidate marker ${marker}`);

  assert(readiness.implementationBaseline === 'FROZEN', 'implementation baseline frozen');
  assert(readiness.buildReady === false, 'global build-readiness manifest must remain false');
  assert(Array.isArray(readiness.prePhysicalClosureTargets) && readiness.prePhysicalClosureTargets.length === 0, 'pre-physical blockers must remain zero');
  assert(ledger.buildReady === false, 'closure ledger buildReady must remain false');
  for (const id of ['Q-003', 'Q-004', 'Q-005']) {
    const node = ledger.nodes?.find(item => item.id === id);
    assert(node?.status === 'ACTIVE', `${id} must remain ACTIVE`);
  }

  for (const marker of [
    'node tools/validate-build-readiness.mjs',
    'node tools/validate-alpha2-static-build-handoff.mjs',
    'node tools/validate-human-test-alpha.mjs',
    'flutter build apk --debug --target lib/main_human_test.dart',
    'PUBLIC_CI_SIGNER=COMPILE_ONLY_EPHEMERAL',
    'TRUSTED_EDGE_RESIGN_REQUIRED=YES',
    'BUILD_READY=NO',
    'RELEASE_READY=NO'
  ]) assert(workflow.includes(marker), `workflow marker ${marker}`);
}

if (failures.length) {
  console.error('FINANCESENSOR_ALPHA2_HUMAN_TEST_BUILD_RECEIPT=FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('FINANCESENSOR_ALPHA2_HUMAN_TEST_BUILD_RECEIPT=PASS');
console.log('SOURCE_SHA=9d990fc579429cc0bc8e5c02306d8ebe4622e145');
console.log('RUN_ID=33999717749');
console.log('RUN_NUMBER=4');
console.log('ARTIFACT_ID=9979184888');
console.log('APK_SHA256=c0a4a5a9a908ed0ea04cbb5ddef10f1343ed84cfa1db5fbe1b2ac00e0a768d1d');
console.log('TRUSTED_EDGE_RESIGN_REQUIRED=YES');
console.log('ALPHA2_MOBILE_INTEGRATION=OPEN');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
