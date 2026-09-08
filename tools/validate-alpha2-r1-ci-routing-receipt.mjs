import fs from 'node:fs';

const graph = JSON.parse(fs.readFileSync('graph/alpha2-r1-signing-handoff.json', 'utf8'));
const workflow = fs.readFileSync('.github/workflows/alpha2-r1-trusted-edge-signing.yml', 'utf8');

function assert(cond, message) { if (!cond) throw new Error(message); }

for (const marker of [
  'pull_request:',
  'push:',
  '- jett/mk0-foundation',
  "'tools/validate-alpha2-r1-physical-signing-receipt.mjs'",
  'node tools/validate-alpha2-r1-physical-signing-receipt.mjs',
  'ref: ${{ github.event.pull_request.head.sha || github.sha }}',
  "EXPECTED_SHA='${{ github.event.pull_request.head.sha || github.sha }}'",
  'test "$(git rev-parse HEAD)" = "$EXPECTED_SHA"',
  'Download exact canonical +2003 artifact',
  'Reproduce deterministic public-safe v5 handoff bundle',
  "test \"$BUNDLE_SHA256\" = '7f3dbb0570db5e403bb83334cc46590dcc51c1e6d2c12e78f295959ba7f83f33'",
  "test \"$BUNDLE_BYTES\" = '86226530'",
  'Upload reproduced v5 bundle',
  'R1_TRUSTED_EDGE_SIGNING=PASS_FROM_SANITIZED_RECEIPT',
  'PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=0',
  'R2_OWNED_DEVICE_CAMPAIGN=READY',
  'PHYSICAL_ALPHA2_PASS=NO',
  'BUILD_READY=NO',
  'RELEASE_READY=NO'
]) assert(workflow.includes(marker), `R1 workflow routing missing marker: ${marker}`);

assert(workflow.includes('contents: read'), 'R1 workflow must retain contents: read');
assert(workflow.includes('actions: read'), 'R1 workflow must retain actions: read');
assert(!workflow.includes('secrets.'), 'R1 public workflow must not consume repository/environment secrets');
assert(!/BUILD_READY=YES/.test(workflow), 'public workflow cannot promote BUILD_READY');
assert(!/RELEASE_READY=YES/.test(workflow), 'public workflow cannot promote RELEASE_READY');

assert(graph.ciGate?.workflow === 'Alpha.2 R1 Trusted-Edge Signing', 'R1 workflow authority drifted');
assert(graph.ciGate?.workflowPath === '.github/workflows/alpha2-r1-trusted-edge-signing.yml', 'R1 workflow path drifted');
assert(graph.ciGate?.bundleGenerationInPublicCi === true, 'public-safe bundle generation must remain enabled');
assert(graph.ciGate?.physicalSigningInPublicCi === false, 'physical signing must remain outside CI');
assert(graph.ciGate?.privateSigningMaterialAllowed === false, 'private signing material must remain forbidden in CI');
assert(graph.ciGate?.exactBranchHeadCheckoutRequired === true, 'exact branch-head checkout law missing');
assert(graph.ciGate?.physicalReceiptValidator === 'tools/validate-alpha2-r1-physical-signing-receipt.mjs', 'physical receipt validator routing missing');
assert(graph.handoffBundle?.status === 'READY', 'v5 bundle must remain frozen');
assert(graph.handoffBundle?.sha256 === '7f3dbb0570db5e403bb83334cc46590dcc51c1e6d2c12e78f295959ba7f83f33', 'frozen v5 digest drifted');
assert(graph.handoffBundle?.bytes === 86226530, 'frozen v5 byte size drifted');
assert(graph.status === 'TRUSTED_EDGE_SIGNING_PASS' && graph.trustedEdgeSigningPass === true, 'R1 must reflect accepted physical receipt');
assert(graph.signedApkSha256 === '7b30ff7d88d92b82729d1eac72c654884eafa4bcd0f9cbaef13a98d6fb18bbc6', 'stable signed APK digest drifted');
assert(graph.buildReady === false && graph.releaseReady === false, 'readiness boundary drifted');

console.log('ALPHA2_R1_CI_ROUTING_CONTRACT=PASS');
console.log('R1_EXACT_BRANCH_HEAD_CHECKOUT=REQUIRED_AND_ENFORCED');
console.log('R1_V5_FROZEN_BYTES=PASS');
console.log('R1_TRUSTED_EDGE_SIGNING=PASS_FROM_SANITIZED_RECEIPT');
console.log('PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=0');
console.log('R2_PHYSICAL_CAMPAIGN=READY');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
