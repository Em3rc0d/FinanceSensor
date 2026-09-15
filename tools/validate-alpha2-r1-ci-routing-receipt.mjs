import fs from 'node:fs';

const graph = JSON.parse(fs.readFileSync('graph/alpha2-r1-signing-handoff.json','utf8'));
const canonical = JSON.parse(fs.readFileSync('graph/alpha2-canonical-candidate.json','utf8'));
const gate = JSON.parse(fs.readFileSync('graph/alpha2-human-intervention-gate.json','utf8'));
const workflow = fs.readFileSync('.github/workflows/alpha2-r1-trusted-edge-signing.yml','utf8');
const assert = (cond,message) => { if (!cond) throw new Error(`ALPHA2_R1_CI_ROUTING_FAILED:${message}`); };
const bundleSha = 'd2bc450d0ecac4ac8aff9e462ba0c9ccaf323d622e997180328aa38d877d545d';
const bundleBytes = 86635677;
const signedSha = '7da560b9382dce0e7ee9100e923a68dc54209934c02554cf70b4c07985f0458a';
const receiptPath = 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2009-2026-09-15.json';

for (const marker of [
  'pull_request:', 'push:', '- jett/mk0-foundation',
  'node tools/validate-alpha2-human-intervention-gate.mjs',
  'node tools/validate-alpha2-canonical-candidate.mjs',
  'node tools/validate-alpha2-r1-signing-handoff.mjs',
  'node tools/validate-alpha2-r1-ci-routing-receipt.mjs',
  "ref: ${{ github.event_name == 'pull_request' && github.event.pull_request.head.sha || github.sha }}",
  'Download exact canonical +2009 artifact', 'Generate deterministic public-safe v11 handoff bundle',
  'FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v11.zip', bundleSha, String(bundleBytes),
  'R1_V11_GENERATION=PASS', 'R1_V11_FROZEN_BYTES=PASS', 'Upload v11 trusted-edge handoff bundle',
  'R1_TRUSTED_EDGE_SIGNING=PASS_FROM_SANITIZED_RECEIPT', `STABLE_SIGNED_APK_SHA256=${signedSha}`,
  'OWNED_DEVICE_UAT_REQUEST_ALLOWED=YES', 'R2_PHYSICAL_CAMPAIGN=READY_FOR_CONSOLIDATED_UAT',
  'PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=0', 'PHYSICAL_ALPHA2_PASS=NO', 'BUILD_READY=NO', 'RELEASE_READY=NO'
]) assert(workflow.includes(marker), `workflow marker missing: ${marker}`);
assert(workflow.includes('contents: read') && workflow.includes('actions: read'), 'least privilege drifted');
assert(!workflow.includes('secrets.'), 'public R1 workflow must not consume repository/environment secrets');
assert(!/PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=1|BUILD_READY=YES|RELEASE_READY=YES|REAL_OAUTH_EXECUTED_BY_CI=YES|REAL_GMAIL_EXECUTED_BY_CI=YES/.test(workflow), 'public workflow contains forbidden promotion marker');

assert(graph.ciGate?.workflow === 'Alpha.2 R1 Trusted-Edge Signing' && graph.ciGate?.workflowPath === '.github/workflows/alpha2-r1-trusted-edge-signing.yml', 'workflow authority drifted');
assert(graph.ciGate?.bundleGenerationInPublicCi === true && graph.ciGate?.physicalSigningInPublicCi === false && graph.ciGate?.privateSigningMaterialAllowed === false && graph.ciGate?.exactCanonicalArtifactRequired === true, 'trust boundary drifted');
assert(graph.handoffBundle?.name === 'FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v11.zip' && graph.handoffBundle?.status === 'READY_FROZEN', 'v11 bundle state drifted');
assert(graph.handoffBundle?.sha256 === bundleSha && graph.handoffBundle?.bytes === bundleBytes, 'v11 bundle identity drifted');
assert(graph.handoffBundle?.generationReceipt?.status === 'POST_MERGE_CI_PASS' && graph.handoffBundle?.generationReceipt?.runId === 34921437444 && graph.handoffBundle?.generationReceipt?.artifactId === 10378575848, 'post-merge generation receipt drifted');
assert(graph.handoffBundle?.certificationReceipt === receiptPath && graph.physicalReceipt === receiptPath, 'trusted-edge receipt binding drifted');
assert(graph.status === 'TRUSTED_EDGE_SIGNING_PASS' && graph.trustedEdgeSigningPass === true && graph.signedApkSha256 === signedSha, 'R1 PASS drifted');
assert(canonical.candidate === '0.2.0-alpha.2+2009' && canonical.signing?.trustedEdgeSigningPass === true && canonical.signing?.signedApkSha256 === signedSha, 'canonical signing boundary drifted');
assert(gate.ownedDeviceUat?.requestAllowed === true && gate.ownedDeviceUat?.humanUatEligible === true, 'human gate routing drifted');
assert(graph.buildReady === false && graph.releaseReady === false, 'readiness boundary drifted');

console.log('ALPHA2_R1_CI_ROUTING_CONTRACT=PASS');
console.log('R1_EXACT_BRANCH_HEAD_CHECKOUT=REQUIRED_AND_ENFORCED');
console.log('R1_V11_BUNDLE_STATE=READY_FROZEN');
console.log(`R1_V11_BUNDLE_SHA256=${bundleSha}`);
console.log(`R1_V11_BUNDLE_BYTES=${bundleBytes}`);
console.log('R1_TRUSTED_EDGE_SIGNING=PASS_FROM_SANITIZED_RECEIPT');
console.log(`STABLE_SIGNED_APK_SHA256=${signedSha}`);
console.log('OWNED_DEVICE_UAT_REQUEST_ALLOWED=YES');
console.log('PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=0');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
