import fs from 'node:fs';

const graph = JSON.parse(fs.readFileSync('graph/alpha2-r1-signing-handoff.json', 'utf8'));
const workflow = fs.readFileSync('.github/workflows/alpha2-r1-trusted-edge-signing.yml', 'utf8');

function assert(cond, message) { if (!cond) throw new Error(message); }
const bundleSha = 'c0932d29235f5e213dd2e830c7641796fa9179795744bc71e4dc9dbc4e3dcb80';
const bundleBytes = 86232702;
const receiptPath = 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2006-2026-09-08.json';
const receiptSourcePath = 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2006-2026-09-08.txt';
const signedSha = '36fa2f4960b9986f14037faf415906d57bac72080bbf28cec60299f85fcba7c0';
const signedBytes = 182125094;

for (const marker of [
  'pull_request:', 'push:', '- jett/mk0-foundation',
  'node tools/validate-alpha2-canonical-candidate.mjs',
  'node tools/validate-alpha2-r1-signing-handoff.mjs',
  'node tools/validate-alpha2-r1-ci-routing-receipt.mjs',
  'node tools/validate-alpha2-r1-physical-signing-receipt.mjs',
  "ref: ${{ github.event_name == 'pull_request' && github.event.pull_request.head.sha || github.sha }}",
  'Download exact canonical +2006 artifact',
  'Reproduce deterministic public-safe v8 handoff bundle',
  bundleSha, String(bundleBytes),
  'R1_V8_FROZEN_BYTES=PASS',
  'Upload reproduced v8 bundle',
  'PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=0',
  'PHYSICAL_ALPHA2_PASS=NO', 'BUILD_READY=NO', 'RELEASE_READY=NO'
]) assert(workflow.includes(marker), `R1 workflow routing missing marker: ${marker}`);

for (const path of [receiptSourcePath, receiptPath, 'tools/validate-alpha2-r1-physical-signing-receipt.mjs']) {
  assert(workflow.includes(path), `R1 workflow must route current +2006 receipt change: ${path}`);
}

assert(workflow.includes('contents: read') && workflow.includes('actions: read'), 'R1 workflow least privilege drifted');
assert(!workflow.includes('secrets.'), 'R1 public workflow must not consume repository/environment secrets');
assert(!/PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=1|BUILD_READY=YES|RELEASE_READY=YES|REAL_OAUTH_EXECUTED_BY_CI=YES|REAL_GMAIL_EXECUTED_BY_CI=YES/.test(workflow), 'public workflow contains forbidden promotion marker');

assert(graph.ciGate?.workflow === 'Alpha.2 R1 Trusted-Edge Signing', 'R1 workflow authority drifted');
assert(graph.ciGate?.workflowPath === '.github/workflows/alpha2-r1-trusted-edge-signing.yml', 'R1 workflow path drifted');
assert(graph.ciGate?.physicalReceiptValidator === 'tools/validate-alpha2-r1-physical-signing-receipt.mjs', 'R1 physical receipt validator authority drifted');
assert(graph.ciGate?.bundleGenerationInPublicCi === true && graph.ciGate?.physicalSigningInPublicCi === false && graph.ciGate?.privateSigningMaterialAllowed === false, 'R1 trust boundary drifted');
assert(graph.ciGate?.exactBranchHeadCheckoutRequired === true, 'exact branch-head checkout law missing');
assert(graph.handoffBundle?.name === 'FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v8.zip', 'v8 bundle name drifted');
assert(graph.handoffBundle?.status === 'READY_FROZEN', 'v8 must remain frozen');
assert(graph.handoffBundle?.sha256 === bundleSha && graph.handoffBundle?.bytes === bundleBytes, 'v8 frozen bytes drifted');

const signed = graph.physicalReceipt !== null;
if (!signed) {
  assert(graph.trustedEdgeSigningPass === false && graph.signedApkSha256 === null && graph.signedApkBytes === null, 'open R1 cannot bind stable signing');
  assert(graph.status === 'READY_FOR_TRUSTED_EDGE_SIGNING', 'open R1 status drifted');
} else {
  assert(graph.status === 'TRUSTED_EDGE_SIGNING_PASS' && graph.trustedEdgeSigningPass === true, 'receipt-bound R1 must be PASS');
  assert(graph.physicalReceipt?.path === receiptPath && graph.physicalReceipt?.sourcePath === receiptSourcePath, 'R1 receipt routing drifted');
  assert(graph.signedApkSha256 === signedSha && graph.signedApkBytes === signedBytes, 'stable +2006 APK routing drifted');
  assert(graph.physicalReceipt?.sanitizationPass === true && graph.physicalReceipt?.rawPrivateMaterialCommitted === false, 'receipt sanitization boundary drifted');
}
assert(graph.buildReady === false && graph.releaseReady === false, 'readiness boundary drifted');

console.log('ALPHA2_R1_CI_ROUTING_CONTRACT=PASS');
console.log('R1_EXACT_BRANCH_HEAD_CHECKOUT=REQUIRED_AND_ENFORCED');
console.log('R1_PHYSICAL_RECEIPT_STATE_VALIDATOR=ROUTED');
console.log('R1_V8_BUNDLE_STATE=READY_FROZEN');
console.log(`R1_V8_BUNDLE_SHA256=${bundleSha}`);
console.log(`R1_V8_BUNDLE_BYTES=${bundleBytes}`);
console.log(`R1_TRUSTED_EDGE_SIGNING=${signed ? 'PASS' : 'OPEN'}`);
console.log('PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=0');
console.log(`R2_PHYSICAL_CAMPAIGN=${signed ? 'READY' : 'BLOCKED_BY_R1'}`);
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
