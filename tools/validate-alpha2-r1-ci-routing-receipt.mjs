import fs from 'node:fs';

const graph = JSON.parse(fs.readFileSync('graph/alpha2-r1-signing-handoff.json', 'utf8'));
const workflow = fs.readFileSync('.github/workflows/alpha2-r1-trusted-edge-signing.yml', 'utf8');

function assert(cond, message) { if (!cond) throw new Error(message); }

for (const marker of [
  'pull_request:',
  'push:',
  '- jett/mk0-foundation',
  'node tools/validate-alpha2-canonical-candidate.mjs',
  'node tools/validate-alpha2-r1-signing-handoff.mjs',
  'node tools/validate-alpha2-r1-ci-routing-receipt.mjs',
  "ref: ${{ github.event_name == 'pull_request' && github.event.pull_request.head.sha || github.sha }}",
  'Download exact canonical +2004 artifact',
  'Reproduce deterministic public-safe v6 handoff bundle',
  'Upload reproduced v6 bundle',
  'R1_TRUSTED_EDGE_SIGNING=OPEN',
  'PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=0',
  'R2_OWNED_DEVICE_CAMPAIGN=BLOCKED_BY_R1',
  'PHYSICAL_ALPHA2_PASS=NO',
  'BUILD_READY=NO',
  'RELEASE_READY=NO'
]) assert(workflow.includes(marker), `R1 workflow routing missing marker: ${marker}`);

assert(!workflow.includes('node tools/validate-alpha2-r1-physical-signing-receipt.mjs\n'), 'staging workflow must not require a current physical receipt');
assert(workflow.includes('contents: read'), 'R1 workflow must retain contents: read');
assert(workflow.includes('actions: read'), 'R1 workflow must retain actions: read');
assert(!workflow.includes('secrets.'), 'R1 public workflow must not consume repository/environment secrets');
assert(!/PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=1|BUILD_READY=YES|RELEASE_READY=YES|REAL_OAUTH_EXECUTED_BY_CI=YES|REAL_GMAIL_EXECUTED_BY_CI=YES/.test(workflow), 'public workflow contains forbidden promotion marker');

assert(graph.ciGate?.workflow === 'Alpha.2 R1 Trusted-Edge Signing', 'R1 workflow authority drifted');
assert(graph.ciGate?.workflowPath === '.github/workflows/alpha2-r1-trusted-edge-signing.yml', 'R1 workflow path drifted');
assert(graph.ciGate?.bundleGenerationInPublicCi === true, 'public-safe bundle generation must remain enabled');
assert(graph.ciGate?.physicalSigningInPublicCi === false, 'physical signing must remain outside CI');
assert(graph.ciGate?.privateSigningMaterialAllowed === false, 'private signing material must remain forbidden in CI');
assert(graph.ciGate?.exactBranchHeadCheckoutRequired === true, 'exact branch-head checkout law missing');
assert(graph.handoffBundle?.name === 'FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v6.zip', 'v6 bundle name drifted');
assert(['STAGING_UNFROZEN','READY_FROZEN'].includes(graph.handoffBundle?.status), 'unexpected v6 state');
assert(graph.trustedEdgeSigningPass === false && graph.physicalReceipt === null, 'R1 must remain physically open before trusted-edge receipt');
assert(graph.signedApkSha256 === null && graph.signedApkBytes === null, 'stable APK cannot exist before trusted-edge signing');
assert(graph.buildReady === false && graph.releaseReady === false, 'readiness boundary drifted');

console.log('ALPHA2_R1_CI_ROUTING_CONTRACT=PASS');
console.log('R1_EXACT_BRANCH_HEAD_CHECKOUT=REQUIRED_AND_ENFORCED');
console.log(`R1_V6_BUNDLE_STATE=${graph.handoffBundle.status}`);
console.log('R1_TRUSTED_EDGE_SIGNING=OPEN');
console.log('PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=0');
console.log('R2_PHYSICAL_CAMPAIGN=BLOCKED_BY_R1');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
