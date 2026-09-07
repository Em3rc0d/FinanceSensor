import fs from 'node:fs';

const graph = JSON.parse(fs.readFileSync('graph/alpha2-r1-signing-handoff.json', 'utf8'));
const evidence = fs.readFileSync('mk0/10-evidence/EV-ALPHA2-R1-CI-ROUTING-2026-09-07.md', 'utf8');
const workflow = fs.readFileSync('.github/workflows/alpha2-r1-trusted-edge-signing.yml', 'utf8');

const expected = {
  prNumber: 92,
  certifiedHead: '75d286fc90f22c93c47b0ac55e5d5e294c3f097b',
  prRunId: 34135491080,
  prJobId: 101785339450,
  mergeSha: '32f9493773fb61fcae0785e0f55894ca6fc29aa7',
  postMergeRunId: 34135590675,
  postMergeJobId: 101785658752
};

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

const receipt = graph.ciGate?.receipt;
assert(receipt, 'R1 CI routing receipt missing');
assert(receipt.prNumber === expected.prNumber, 'R1 CI receipt PR number drifted');
assert(receipt.certifiedHead === expected.certifiedHead, 'R1 CI receipt certified head drifted');
assert(receipt.prRunId === expected.prRunId, 'R1 CI receipt PR run drifted');
assert(receipt.prJobId === expected.prJobId, 'R1 CI receipt PR job drifted');
assert(receipt.prConclusion === 'SUCCESS', 'R1 CI receipt PR conclusion must be SUCCESS');
assert(receipt.mergeSha === expected.mergeSha, 'R1 CI receipt merge SHA drifted');
assert(receipt.postMergeRunId === expected.postMergeRunId, 'R1 CI receipt post-merge run drifted');
assert(receipt.postMergeJobId === expected.postMergeJobId, 'R1 CI receipt post-merge job drifted');
assert(receipt.postMergeConclusion === 'SUCCESS', 'R1 CI receipt post-merge conclusion must be SUCCESS');

for (const marker of [
  `PR_NUMBER=${expected.prNumber}`,
  `CERTIFIED_HEAD=${expected.certifiedHead}`,
  `PR_RUN_ID=${expected.prRunId}`,
  `PR_JOB_ID=${expected.prJobId}`,
  'PR_CONCLUSION=SUCCESS',
  `MERGE_SHA=${expected.mergeSha}`,
  `POST_MERGE_RUN_ID=${expected.postMergeRunId}`,
  `POST_MERGE_JOB_ID=${expected.postMergeJobId}`,
  'POST_MERGE_CONCLUSION=SUCCESS',
  'R1_CI_ROUTING=CLOSED',
  'R1_TRUSTED_EDGE_SIGNING=OPEN',
  'BUILD_READY=NO',
  'RELEASE_READY=NO'
]) {
  assert(evidence.includes(marker), `R1 CI routing evidence missing marker: ${marker}`);
}

assert(workflow.includes("'tools/validate-alpha2-r1-ci-routing-receipt.mjs'"), 'R1 CI receipt validator must be routed in PR/push paths');
assert(workflow.includes("'mk0/10-evidence/EV-ALPHA2-R1-CI-ROUTING-2026-09-07.md'"), 'R1 CI receipt evidence must be routed in PR/push paths');
assert(workflow.includes('node tools/validate-alpha2-r1-ci-routing-receipt.mjs'), 'R1 CI receipt validator must execute');
assert(workflow.includes('contents: read'), 'R1 CI workflow must remain read-only');
assert(!workflow.includes('secrets.'), 'R1 CI workflow must not consume GitHub secrets');

assert(graph.status === 'HANDOFF_READY_PHYSICAL_OPEN', 'R1 physical status must remain OPEN');
assert(graph.trustedEdgeSigningPass === false, 'R1 physical signing cannot be pre-certified');
assert(graph.signedApkSha256 === null, 'signed APK digest must remain null before physical signing');
assert(graph.buildReady === false, 'BUILD_READY must remain false');
assert(graph.releaseReady === false, 'RELEASE_READY must remain false');

console.log('ALPHA2_R1_CI_ROUTING_RECEIPT=PASS');
console.log('R1_CI_ROUTING=CLOSED');
console.log('R1_TRUSTED_EDGE_SIGNING=OPEN');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
