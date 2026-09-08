import fs from 'node:fs';

const graph = JSON.parse(fs.readFileSync('graph/alpha2-r1-signing-handoff.json', 'utf8'));
const workflow = fs.readFileSync('.github/workflows/alpha2-r1-trusted-edge-signing.yml', 'utf8');
const receiptPath = 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2005-2026-09-08.json';
const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));

function assert(cond, message) { if (!cond) throw new Error(message); }
const bundleSha = '201cc603e2ce144b0848fbaaa793eaa669119bfeea8ffb027c8eec2fd24ef6b1';
const bundleBytes = 86227523;
const signedSha = '530ef3fa17c22f94ef0a94aaf625df2ef33022c84d16fad2604a3e0dfc5e0b85';
const signedBytes = 182116902;

for (const marker of [
  'pull_request:', 'push:', '- jett/mk0-foundation',
  'node tools/validate-alpha2-canonical-candidate.mjs',
  'node tools/validate-alpha2-r1-signing-handoff.mjs',
  'node tools/validate-alpha2-r1-ci-routing-receipt.mjs',
  'node tools/validate-alpha2-r1-physical-signing-receipt.mjs',
  "ref: ${{ github.event_name == 'pull_request' && github.event.pull_request.head.sha || github.sha }}",
  'Download exact canonical +2005 artifact',
  'Reproduce deterministic public-safe v7 handoff bundle',
  bundleSha, String(bundleBytes),
  'R1_V7_FROZEN_BYTES=PASS',
  'Upload reproduced v7 bundle',
  'PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=0',
  'PHYSICAL_ALPHA2_PASS=NO', 'BUILD_READY=NO', 'RELEASE_READY=NO'
]) assert(workflow.includes(marker), `R1 workflow routing missing marker: ${marker}`);

assert(workflow.includes('contents: read') && workflow.includes('actions: read'), 'R1 workflow least privilege drifted');
assert(!workflow.includes('secrets.'), 'R1 public workflow must not consume repository/environment secrets');
assert(!/PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=1|BUILD_READY=YES|RELEASE_READY=YES|REAL_OAUTH_EXECUTED_BY_CI=YES|REAL_GMAIL_EXECUTED_BY_CI=YES/.test(workflow), 'public workflow contains forbidden promotion marker');

assert(graph.ciGate?.workflow === 'Alpha.2 R1 Trusted-Edge Signing', 'R1 workflow authority drifted');
assert(graph.ciGate?.workflowPath === '.github/workflows/alpha2-r1-trusted-edge-signing.yml', 'R1 workflow path drifted');
assert(graph.ciGate?.bundleGenerationInPublicCi === true && graph.ciGate?.physicalSigningInPublicCi === false && graph.ciGate?.privateSigningMaterialAllowed === false, 'R1 trust boundary drifted');
assert(graph.ciGate?.exactBranchHeadCheckoutRequired === true, 'exact branch-head checkout law missing');
assert(graph.handoffBundle?.name === 'FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v7.zip', 'v7 bundle name drifted');
assert(graph.handoffBundle?.status === 'READY_FROZEN' && graph.handoffBundle?.sha256 === bundleSha && graph.handoffBundle?.bytes === bundleBytes, 'v7 frozen bytes drifted');

assert(receipt.trustedEdgeSigningPass === true && receipt.sanitizationPass === true && receipt.rawPrivateMaterialCommitted === false, 'current receipt trust boundary drifted');
assert(receipt.signedApkSha256 === signedSha && receipt.signedApkBytes === signedBytes, 'receipt stable APK identity drifted');
assert(graph.trustedEdgeSigningPass === true && graph.physicalReceipt?.path === receiptPath, 'R1 must bind current +2005 sanitized receipt');
assert(graph.signedApkSha256 === signedSha && graph.signedApkBytes === signedBytes, 'R1 stable APK identity drifted');
assert(graph.status === 'TRUSTED_EDGE_SIGNING_PASS', 'R1 status must be trusted-edge signing PASS');
assert(graph.physicalAlpha2Pass === false && graph.buildReady === false && graph.releaseReady === false, 'readiness boundary drifted');

console.log('ALPHA2_R1_CI_ROUTING_CONTRACT=PASS');
console.log('R1_EXACT_BRANCH_HEAD_CHECKOUT=REQUIRED_AND_ENFORCED');
console.log('R1_V7_BUNDLE_STATE=READY_FROZEN');
console.log(`R1_V7_BUNDLE_SHA256=${bundleSha}`);
console.log(`R1_V7_BUNDLE_BYTES=${bundleBytes}`);
console.log('R1_TRUSTED_EDGE_SIGNING=PASS_FROM_SANITIZED_RECEIPT');
console.log('PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=0');
console.log('R2_PHYSICAL_CAMPAIGN=READY');
console.log('PHYSICAL_ALPHA2_PASS=NO');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
