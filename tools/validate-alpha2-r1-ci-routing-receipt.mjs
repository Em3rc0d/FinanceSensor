import fs from 'node:fs';

const graph = JSON.parse(fs.readFileSync('graph/alpha2-r1-signing-handoff.json','utf8'));
const canonical = JSON.parse(fs.readFileSync('graph/alpha2-canonical-candidate.json','utf8'));
const gate = JSON.parse(fs.readFileSync('graph/alpha2-human-intervention-gate.json','utf8'));
const workflow = fs.readFileSync('.github/workflows/alpha2-r1-trusted-edge-signing.yml','utf8');
const assert = (cond,message) => { if (!cond) throw new Error(`ALPHA2_R1_CI_ROUTING_FAILED:${message}`); };
const bundleSha = 'd2bc450d0ecac4ac8aff9e462ba0c9ccaf323d622e997180328aa38d877d545d';
const bundleBytes = 86635677;

for (const marker of [
  'pull_request:', 'push:', '- jett/mk0-foundation',
  'node tools/validate-alpha2-human-intervention-gate.mjs',
  'node tools/validate-alpha2-canonical-candidate.mjs',
  'node tools/validate-alpha2-r1-signing-handoff.mjs',
  'node tools/validate-alpha2-r1-ci-routing-receipt.mjs',
  "ref: ${{ github.event_name == 'pull_request' && github.event.pull_request.head.sha || github.sha }}",
  'Download exact canonical +2009 artifact',
  'Generate deterministic public-safe v11 handoff bundle',
  'FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v11.zip', bundleSha, String(bundleBytes),
  'R1_V11_GENERATION=PASS', 'R1_V11_FROZEN_BYTES=PASS',
  'Upload v11 trusted-edge handoff bundle',
  'SIGNING_REQUEST_ALLOWED=YES',
  'R1_TRUSTED_EDGE_SIGNING=PENDING_USER_TRUSTED_EDGE',
  'OWNED_DEVICE_UAT_REQUEST_ALLOWED=NO',
  'R2_PHYSICAL_CAMPAIGN=BLOCKED_BY_R1_SIGNING',
  'PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=0', 'PHYSICAL_ALPHA2_PASS=NO', 'BUILD_READY=NO', 'RELEASE_READY=NO'
]) assert(workflow.includes(marker), `workflow marker missing: ${marker}`);
assert(workflow.includes('contents: read') && workflow.includes('actions: read'), 'least privilege drifted');
assert(!workflow.includes('secrets.'), 'public R1 workflow must not consume repository/environment secrets');
assert(!/PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=1|BUILD_READY=YES|RELEASE_READY=YES|REAL_OAUTH_EXECUTED_BY_CI=YES|REAL_GMAIL_EXECUTED_BY_CI=YES/.test(workflow), 'public workflow contains forbidden promotion marker');

assert(graph.ciGate?.workflow === 'Alpha.2 R1 Trusted-Edge Signing' && graph.ciGate?.workflowPath === '.github/workflows/alpha2-r1-trusted-edge-signing.yml', 'workflow authority drifted');
assert(graph.ciGate?.bundleGenerationInPublicCi === true && graph.ciGate?.physicalSigningInPublicCi === false && graph.ciGate?.privateSigningMaterialAllowed === false && graph.ciGate?.exactCanonicalArtifactRequired === true, 'trust boundary drifted');
assert(graph.handoffBundle?.name === 'FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v11.zip' && graph.handoffBundle?.status === 'READY_FROZEN', 'v11 bundle state drifted');
assert(graph.handoffBundle?.sha256 === bundleSha && graph.handoffBundle?.bytes === bundleBytes, 'v11 bundle identity drifted');
assert(graph.handoffBundle?.generationReceipt?.status === 'PENDING_POST_MERGE_CI_RECEIPT', 'post-merge generation receipt must remain pending in source graph');
assert(graph.handoffBundle?.certificationReceipt === null && graph.physicalReceipt === null, 'trusted-edge receipt cannot exist before user signing');
assert(graph.status === 'TRUSTED_EDGE_SIGNING_REQUIRED' && graph.trustedEdgeSigningPass === false, 'R1 must remain pending user trusted-edge');
assert(graph.signedApkSha256 === null && graph.signedApkBytes === null, 'signed artifact identity synthesized prematurely');
assert(canonical.candidate === '0.2.0-alpha.2+2009' && canonical.signing?.trustedEdgeSigningPass === false, 'canonical signing boundary drifted');
assert(gate.preSigning?.requestAllowed === true && gate.ownedDeviceUat?.requestAllowed === false, 'human gate routing drifted');
assert(graph.buildReady === false && graph.releaseReady === false, 'readiness boundary drifted');

console.log('ALPHA2_R1_CI_ROUTING_CONTRACT=PASS');
console.log('R1_EXACT_BRANCH_HEAD_CHECKOUT=REQUIRED_AND_ENFORCED');
console.log('R1_V11_BUNDLE_STATE=READY_FROZEN');
console.log(`R1_V11_BUNDLE_SHA256=${bundleSha}`);
console.log(`R1_V11_BUNDLE_BYTES=${bundleBytes}`);
console.log('SIGNING_REQUEST_ALLOWED=YES');
console.log('R1_TRUSTED_EDGE_SIGNING=PENDING_USER_TRUSTED_EDGE');
console.log('OWNED_DEVICE_UAT_REQUEST_ALLOWED=NO');
console.log('PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=0');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
