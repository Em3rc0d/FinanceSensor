import fs from 'node:fs';

const graph = JSON.parse(fs.readFileSync('graph/alpha2-r1-signing-handoff.json', 'utf8'));
const workflow = fs.readFileSync('.github/workflows/alpha2-r1-trusted-edge-signing.yml', 'utf8');
const assert = (cond, message) => { if (!cond) throw new Error(message); };
const bundleSha = 'ce8442047a9f5c6df0caf5bc9d0e9337e17ec57d9d600d647b8b4123323751c8';
const bundleBytes = 86238732;

for (const marker of [
  'pull_request:', 'push:', '- jett/mk0-foundation',
  'node tools/validate-alpha2-canonical-candidate.mjs',
  'node tools/validate-alpha2-r1-signing-handoff.mjs',
  'node tools/validate-alpha2-r1-ci-routing-receipt.mjs',
  "ref: ${{ github.event_name == 'pull_request' && github.event.pull_request.head.sha || github.sha }}",
  'Download exact canonical +2007 artifact',
  'Reproduce deterministic public-safe v9 handoff bundle',
  bundleSha, String(bundleBytes),
  'R1_V9_FROZEN_BYTES=PASS',
  'Upload reproduced v9 bundle',
  'R1_TRUSTED_EDGE_SIGNING=OPEN',
  'R2_OWNED_DEVICE_CAMPAIGN=BLOCKED_BY_R1',
  'PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=0',
  'PHYSICAL_ALPHA2_PASS=NO', 'BUILD_READY=NO', 'RELEASE_READY=NO'
]) assert(workflow.includes(marker), `R1 workflow routing missing marker: ${marker}`);

assert(!workflow.includes('node tools/validate-alpha2-r1-physical-signing-receipt.mjs'), 'current +2007 R1 workflow must not derive PASS from historical +2006 receipt');
assert(workflow.includes('contents: read') && workflow.includes('actions: read'), 'R1 workflow least privilege drifted');
assert(!workflow.includes('secrets.'), 'R1 public workflow must not consume repository/environment secrets');
assert(!/PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=1|BUILD_READY=YES|RELEASE_READY=YES|REAL_OAUTH_EXECUTED_BY_CI=YES|REAL_GMAIL_EXECUTED_BY_CI=YES/.test(workflow), 'public workflow contains forbidden promotion marker');

assert(graph.ciGate?.workflow === 'Alpha.2 R1 Trusted-Edge Signing' && graph.ciGate?.workflowPath === '.github/workflows/alpha2-r1-trusted-edge-signing.yml', 'R1 workflow authority drifted');
assert(graph.ciGate?.historicalPhysicalReceiptValidator === 'tools/validate-alpha2-r1-physical-signing-receipt.mjs', 'historical receipt validator authority drifted');
assert(graph.ciGate?.bundleGenerationInPublicCi === true && graph.ciGate?.physicalSigningInPublicCi === false && graph.ciGate?.privateSigningMaterialAllowed === false && graph.ciGate?.exactBranchHeadCheckoutRequired === true, 'R1 trust boundary drifted');
assert(graph.handoffBundle?.name === 'FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v9.zip' && graph.handoffBundle?.status === 'READY_FROZEN', 'v9 bundle state drifted');
assert(graph.handoffBundle?.sha256 === bundleSha && graph.handoffBundle?.bytes === bundleBytes, 'v9 frozen bytes drifted');
assert(graph.physicalReceipt === null && graph.status === 'READY_FOR_TRUSTED_EDGE_SIGNING', 'R1 must remain open before trusted-edge receipt');
assert(graph.trustedEdgeSigningPass === false && graph.signedApkSha256 === null && graph.signedApkBytes === null, 'open R1 cannot bind stable signing');
assert(graph.buildReady === false && graph.releaseReady === false, 'readiness boundary drifted');

console.log('ALPHA2_R1_CI_ROUTING_CONTRACT=PASS');
console.log('R1_EXACT_BRANCH_HEAD_CHECKOUT=REQUIRED_AND_ENFORCED');
console.log('R1_HISTORICAL_PHYSICAL_RECEIPT_NOT_CURRENT=YES');
console.log('R1_V9_BUNDLE_STATE=READY_FROZEN');
console.log(`R1_V9_BUNDLE_SHA256=${bundleSha}`);
console.log(`R1_V9_BUNDLE_BYTES=${bundleBytes}`);
console.log('R1_TRUSTED_EDGE_SIGNING=OPEN');
console.log('PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=0');
console.log('R2_PHYSICAL_CAMPAIGN=BLOCKED_BY_R1');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
